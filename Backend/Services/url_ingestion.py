"""
URL / documentation ingestion service.

Mirrors the structure of github_ingestion.py:
  ingest_url_source()  ← background-task entry point
  discover_pages()     ← BFS link crawler
  scrape_and_process_page() ← fetch + clean + chunk + embed + store
  chunk_documentation_page() ← heading-aware chunker
"""

import asyncio
import logging
import re
from datetime import datetime, timezone
from urllib.parse import urljoin, urlparse, urlunparse

import httpx
from bs4 import BeautifulSoup
from bson import ObjectId

from Database.database import get_db
from Services.embedding_service import get_embeddings_batch

logger = logging.getLogger(__name__)

# File extensions to skip during link discovery
SKIP_EXTENSIONS = {
    ".pdf", ".zip", ".tar", ".gz", ".exe", ".bin",
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp",
    ".mp4", ".mp3", ".woff", ".woff2", ".ttf", ".eot",
    ".css", ".js", ".ts", ".jsx", ".tsx",
}

# CSS selectors tried in order to extract main content
CONTENT_SELECTORS = [
    "main",
    "article",
    '[role="main"]',
    ".content",
    ".documentation",
    ".doc-content",
    "#content",
    ".markdown-body",
    ".prose",
]

# Tags stripped from <body> fallback
NOISE_TAGS = ["nav", "header", "footer", "aside", "script", "style"]
NOISE_CLASSES = ["sidebar", "navigation", "navbar", "cookie-banner", "toc", "breadcrumb"]

# Heading detection patterns for chunking
_NUMBERED_HEADING = re.compile(r"^\d+(\.\d+)*\s+\w")
_MARKDOWN_HEADING = re.compile(r"^#{1,6}\s+")


# ── Normalisation ─────────────────────────────────────────────────────────────

def _normalize_url(url: str) -> str:
    """Remove fragment and query string from a URL."""
    parsed = urlparse(url)
    return urlunparse(parsed._replace(fragment="", query=""))


def _base_domain(url: str) -> str:
    """Return scheme + netloc so same-domain check is robust."""
    parsed = urlparse(url)
    return f"{parsed.scheme}://{parsed.netloc}"


def _is_skippable_url(url: str) -> bool:
    path = urlparse(url).path.lower()
    return any(path.endswith(ext) for ext in SKIP_EXTENSIONS)


# ── Page discovery ────────────────────────────────────────────────────────────

async def discover_pages(start_url: str, base_domain: str, max_pages: int = 20) -> list[str]:
    """
    BFS crawler: starts at start_url, follows same-domain links,
    returns up to max_pages discovered URLs.
    """
    visited: set[str] = {start_url}
    queue: list[str] = [start_url]
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (compatible; OnboardiqBot/1.0; "
            "+https://onboardiq.dev/bot)"
        )
    }

    async with httpx.AsyncClient(
        headers=headers,
        follow_redirects=True,
        timeout=15.0,
        verify=False,  # some docs sites have self-signed certs
    ) as client:
        while queue and len(visited) < max_pages:
            url = queue.pop(0)
            try:
                response = await client.get(url)
                soup = BeautifulSoup(response.text, "lxml")

                for tag in soup.find_all("a", href=True):
                    href = tag["href"].strip()
                    if not href or href.startswith(("mailto:", "tel:", "javascript:")):
                        continue

                    abs_url = _normalize_url(urljoin(url, href))

                    if (
                        abs_url not in visited
                        and abs_url.startswith(base_domain)
                        and not _is_skippable_url(abs_url)
                        and len(visited) < max_pages
                    ):
                        visited.add(abs_url)
                        queue.append(abs_url)

            except Exception as exc:
                logger.warning("[url-ingest] Discovery error for %s: %s", url, exc)

            await asyncio.sleep(0.5)

    return list(visited)


# ── Content extraction helpers ────────────────────────────────────────────────

def _extract_main_content(soup: BeautifulSoup) -> str:
    """Return clean text of the main content area."""
    for selector in CONTENT_SELECTORS:
        el = soup.select_one(selector)
        if el:
            text = el.get_text(separator="\n", strip=True)
            if len(text) > 200:
                return text

    # Fallback: strip noisy tags from body
    body = soup.find("body") or soup
    for tag_name in NOISE_TAGS:
        for tag in body.find_all(tag_name):
            tag.decompose()
    for cls in NOISE_CLASSES:
        for tag in body.find_all(class_=cls):
            tag.decompose()

    return body.get_text(separator="\n", strip=True)


def _extract_title(soup: BeautifulSoup, url: str) -> str:
    if soup.title and soup.title.string:
        return soup.title.string.strip()
    h1 = soup.find("h1")
    if h1:
        return h1.get_text(strip=True)
    return urlparse(url).netloc


def _looks_like_js_required(text: str) -> bool:
    signals = [
        "enable javascript",
        "please wait",
        "loading...",
        "you need to enable javascript",
        "javascript is required",
    ]
    lower = text.lower()
    return len(text) < 500 or any(s in lower for s in signals)


# ── Per-page scraper ──────────────────────────────────────────────────────────

async def scrape_and_process_page(url: str, workspace_id: str, source_id: str) -> int:
    """
    Fetch, parse, chunk, embed, and store one documentation page.
    Returns the number of chunks created.
    """
    html: str | None = None

    # ── Attempt 1: plain httpx ────────────────────────────────────────────────
    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=20.0,
            verify=False,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                )
            },
        ) as client:
            resp = await client.get(url)
            raw_text = resp.text
            if not _looks_like_js_required(raw_text):
                html = raw_text
    except Exception as exc:
        logger.info("[url-ingest] httpx failed for %s: %s — trying Playwright", url, exc)

    # ── Attempt 2: Playwright headless browser ────────────────────────────────
    if html is None:
        try:
            from playwright.async_api import async_playwright  # lazy import

            async with async_playwright() as pw:
                browser = await pw.chromium.launch(headless=True)
                page = await browser.new_page()
                await page.set_extra_http_headers({
                    "User-Agent": (
                        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/120.0.0.0 Safari/537.36"
                    )
                })
                await page.goto(url, wait_until="networkidle", timeout=30_000)
                await page.wait_for_timeout(1000)
                html = await page.content()
                await browser.close()
        except Exception as exc:
            logger.error("[url-ingest] Playwright also failed for %s: %s", url, exc)
            return 0

    if not html:
        return 0

    # ── Parse & chunk ─────────────────────────────────────────────────────────
    soup = BeautifulSoup(html, "lxml")
    title = _extract_title(soup, url)
    text = _extract_main_content(soup)

    if not text or len(text.split()) < 30:
        logger.info("[url-ingest] Page %s yielded too little text — skipping", url)
        return 0

    chunks = chunk_documentation_page(text, url, title)
    if not chunks:
        return 0

    # ── Embed in batches ──────────────────────────────────────────────────────
    BATCH = 100
    all_embeddings = []
    for i in range(0, len(chunks), BATCH):
        batch = chunks[i : i + BATCH]
        embeds = await get_embeddings_batch(
            [
                {
                    "text": c["augmented_content"],
                    "chunk_type": c["chunk_type"],
                    "language": None,
                    "chunk_name": c["chunk_name"],
                    "mode": "passage",
                }
                for c in batch
            ]
        )
        all_embeddings.extend(embeds)

    # ── Persist ───────────────────────────────────────────────────────────────
    db = await get_db()
    now = datetime.now(timezone.utc)
    workspace_oid = ObjectId(workspace_id)
    source_oid = ObjectId(source_id)

    docs = []
    for chunk, embedding in zip(chunks, all_embeddings):
        docs.append({
            "workspace_id": workspace_oid,
            "source_id": source_oid,
            "source_type": "url_doc",
            "content": chunk["content"],
            "embedding": embedding,
            "file_path": None,
            "language": None,
            "chunk_type": chunk["chunk_type"],
            "chunk_name": chunk["chunk_name"],
            "start_line": None,
            "end_line": None,
            "source_url": chunk["source_url"],
            "page_title": chunk["page_title"],
            "is_stale": False,
            "stale_reason": None,
            "stale_since_commit": None,
            "stale_detected_at": None,
            "created_at": now,
        })

    if docs:
        await db.chunks.insert_many(docs)

    logger.info("[url-ingest] %s → %d chunks stored", url, len(docs))
    return len(docs)


# ── Heading-aware chunker ─────────────────────────────────────────────────────

def _is_heading(line: str) -> bool:
    stripped = line.strip()
    if not stripped:
        return False
    if _MARKDOWN_HEADING.match(stripped):
        return True
    if stripped.isupper() and len(stripped) < 80:
        return True
    if _NUMBERED_HEADING.match(stripped):
        return True
    return False


def _split_long_section(words: list[str], max_words: int = 400, overlap: int = 50) -> list[str]:
    chunks = []
    start = 0
    while start < len(words):
        end = min(start + max_words, len(words))
        chunks.append(" ".join(words[start:end]))
        if end == len(words):
            break
        start = end - overlap
    return chunks


def chunk_documentation_page(text: str, url: str, title: str) -> list[dict]:
    """
    Split a documentation page into heading-bounded sections.
    Long sections are sub-chunked with overlap.
    """
    lines = text.splitlines()

    # Group lines into sections separated by headings
    sections: list[tuple[str, list[str]]] = []  # (heading, body_lines)
    current_heading = title
    current_lines: list[str] = []

    for line in lines:
        if _is_heading(line):
            if current_lines:
                sections.append((current_heading, current_lines))
            # Strip markdown # prefix for heading text
            current_heading = _MARKDOWN_HEADING.sub("", line).strip() or line.strip()
            current_lines = []
        else:
            current_lines.append(line)

    if current_lines:
        sections.append((current_heading, current_lines))

    chunks = []
    for heading, body_lines in sections:
        body_text = "\n".join(body_lines).strip()
        words = body_text.split()

        if len(words) < 50:
            continue  # Too short to be useful

        sub_texts = _split_long_section(words) if len(words) > 600 else [body_text]

        for sub_text in sub_texts:
            augmented = (
                f'passage: documentation section titled "{heading}" '
                f'from {title}: {sub_text}'
            )
            chunks.append({
                "content": sub_text,
                "augmented_content": augmented,
                "chunk_type": "section",
                "chunk_name": heading,
                "source_url": url,
                "page_title": title,
            })

    return chunks


# ── Main orchestrator ─────────────────────────────────────────────────────────

async def ingest_url_source(
    url: str,
    workspace_id: str,
    source_id: str,
    job_id: str,
    max_pages: int = 20,
):
    """
    Background-task entry point for URL ingestion.
    Mirrors connect_and_ingest_repo() in github_ingestion.py.
    """
    db = await get_db()
    workspace_oid = ObjectId(workspace_id)
    source_oid = ObjectId(source_id)
    job_oid = ObjectId(job_id)

    total_chunks = 0

    try:
        # ── Step 1: validate & extract base domain ────────────────────────────
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            raise ValueError(f"URL must start with http:// or https://, got: {url}")
        base_domain = _base_domain(url)

        # ── Step 2: mark job running ──────────────────────────────────────────
        now = datetime.now(timezone.utc)
        await db.jobs.update_one(
            {"_id": job_oid},
            {
                "$set": {
                    "status": "running",
                    "started_at": now,
                    "progress_message": "Discovering pages…",
                }
            },
        )
        await db.workspaces.update_one(
            {"_id": workspace_oid, "sources.source_id": source_oid},
            {"$set": {"sources.$.indexing_status": "indexing", "updated_at": now}},
        )

        # ── Step 3: crawl for pages ───────────────────────────────────────────
        pages = await discover_pages(url, base_domain, max_pages)
        logger.info("[url-ingest] Discovered %d pages from %s", len(pages), url)

        await db.jobs.update_one(
            {"_id": job_oid},
            {
                "$set": {
                    "progress_total": len(pages),
                    "progress_message": f"Found {len(pages)} pages — indexing…",
                }
            },
        )

        # ── Step 4: scrape each page ──────────────────────────────────────────
        for idx, page_url in enumerate(pages, start=1):
            try:
                created = await scrape_and_process_page(page_url, workspace_id, source_id)
                total_chunks += created
            except Exception as exc:
                logger.exception("[url-ingest] Failed page %s: %s", page_url, exc)
            finally:
                await db.jobs.update_one(
                    {"_id": job_oid},
                    {
                        "$set": {
                            "progress_current": idx,
                            "progress_message": f"Processed {idx}/{len(pages)}: {page_url}",
                        }
                    },
                )

        # ── Step 5: mark completed ────────────────────────────────────────────
        now = datetime.now(timezone.utc)
        await db.jobs.update_one(
            {"_id": job_oid},
            {
                "$set": {
                    "status": "completed",
                    "completed_at": now,
                    "progress_current": len(pages),
                    "progress_message": f"Completed — {total_chunks} chunks from {len(pages)} pages",
                }
            },
        )
        await db.workspaces.update_one(
            {"_id": workspace_oid, "sources.source_id": source_oid},
            {
                "$set": {
                    "sources.$.indexing_status": "completed",
                    "sources.$.last_indexed_at": now,
                    "sources.$.chunk_count": total_chunks,
                    "sources.$.file_count": len(pages),
                    "updated_at": now,
                }
            },
        )
        logger.info(
            "[url-ingest] Finished workspace=%s source=%s chunks=%d pages=%d",
            workspace_id,
            source_id,
            total_chunks,
            len(pages),
        )

    except Exception as exc:
        now = datetime.now(timezone.utc)
        logger.exception("[url-ingest] Fatal error: %s", exc)
        await db.jobs.update_one(
            {"_id": job_oid},
            {
                "$set": {
                    "status": "failed",
                    "completed_at": now,
                    "error_message": str(exc),
                    "progress_message": "URL ingestion failed",
                }
            },
        )
        await db.workspaces.update_one(
            {"_id": workspace_oid, "sources.source_id": source_oid},
            {"$set": {"sources.$.indexing_status": "failed", "updated_at": now}},
        )
        raise
