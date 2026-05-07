"""
staleness_service.py — Phase 4 Staleness Detection Engine
Two modes:
  Mode 1 (readme)        — compare README against current indexed codebase
  Mode 2 (documentation) — compare changed code files against documentation chunks
"""

import asyncio
import json
import logging
import os
import re
from datetime import datetime, timezone, timedelta
from typing import Optional

from bson import ObjectId
from groq import Groq

from Database.database import get_db
from Services.retrieval_service import vector_search

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Groq client (reuse singleton)
# ---------------------------------------------------------------------------

try:
    _groq = Groq(api_key=os.environ.get("GROQ_API_KEY"))
except Exception:
    _groq = None

GROQ_MODEL = "llama-3.3-70b-versatile"


async def _groq_call(prompt: str, max_tokens: int = 2048) -> str:
    """Simple single-turn Groq call without session history."""
    if not _groq:
        raise RuntimeError("Groq client not initialised — check GROQ_API_KEY")

    messages = [{"role": "user", "content": prompt}]

    for attempt in range(3):
        try:
            response = await asyncio.to_thread(
                _groq.chat.completions.create,
                model=GROQ_MODEL,
                messages=messages,
                temperature=0.1,
                max_tokens=max_tokens,
            )
            return response.choices[0].message.content
        except Exception as exc:
            err = str(exc).lower()
            is_rate = "429" in err or "rate" in err or "limit" in err
            if is_rate and attempt < 2:
                wait = 10 * (attempt + 1)
                logger.warning("[staleness] Groq rate limit — waiting %ds", wait)
                await asyncio.sleep(wait)
                continue
            raise
    raise RuntimeError("Groq exhausted all retries")


def _strip_fences(text: str) -> str:
    """Remove markdown code fences from LLM output."""
    text = text.strip()
    text = re.sub(r"^```(?:json)?", "", text).strip()
    text = re.sub(r"```$", "", text).strip()
    return text


# ---------------------------------------------------------------------------
# Mode detection
# ---------------------------------------------------------------------------

async def detect_mode(workspace_id: str) -> str:
    """Return 'documentation' if a completed url_doc source exists, else 'readme'."""
    db = await get_db()
    workspace = await db.workspaces.find_one({"_id": ObjectId(workspace_id)})
    if not workspace:
        return "readme"

    for source in workspace.get("sources", []):
        if (
            source.get("source_type") == "url_doc"
            and source.get("indexing_status") == "completed"
        ):
            return "documentation"
    return "readme"


# ---------------------------------------------------------------------------
# Chunk helpers
# ---------------------------------------------------------------------------

async def get_readme_chunks(workspace_id: str, source_id: str) -> list[dict]:
    """Return all github_readme chunks for this source."""
    db = await get_db()
    cursor = db.chunks.find({
        "workspace_id": ObjectId(workspace_id),
        "source_id": ObjectId(source_id),
        "source_type": "github_readme",
    })
    return await cursor.to_list(length=None)


async def get_latest_code_chunks(workspace_id: str, source_id: str) -> list[dict]:
    """Return all github_code chunks, sorted by last_modified desc."""
    db = await get_db()
    cursor = db.chunks.find(
        {
            "workspace_id": ObjectId(workspace_id),
            "source_id": ObjectId(source_id),
            "source_type": "github_code",
        }
    ).sort("last_modified", -1)
    return await cursor.to_list(length=None)


# ---------------------------------------------------------------------------
# GitHub commit helper
# ---------------------------------------------------------------------------

async def get_recent_commits(
    repo_full_name: str,
    github_token: Optional[str],
    since_hours: int = 24,
) -> list[dict]:
    """Return commits from the last since_hours hours via PyGithub."""
    from github import Github, GithubException

    if not github_token:
        logger.warning("[staleness] No GitHub token — using anonymous access (rate-limited)")

    def _fetch():
        g = Github(github_token) if github_token else Github()
        repo = g.get_repo(repo_full_name)
        since_dt = datetime.now(timezone.utc) - timedelta(hours=since_hours)
        commits_page = repo.get_commits(since=since_dt)
        results = []
        for commit in commits_page:
            try:
                changed_files = [f.filename for f in commit.files]
            except Exception:
                changed_files = []
            results.append({
                "sha": commit.sha,
                "message": commit.commit.message.split("\n")[0],
                "author": commit.commit.author.name if commit.commit.author else "unknown",
                "timestamp": commit.commit.author.date.isoformat() if commit.commit.author else None,
                "changed_files": changed_files,
            })
        return results

    for attempt in range(3):
        try:
            return await asyncio.to_thread(_fetch)
        except Exception as exc:
            err = str(exc).lower()
            is_rate = "403" in err or "rate" in err or "limit" in err
            if is_rate and attempt < 2:
                wait = 15 * (attempt + 1)
                logger.warning("[staleness] GitHub rate limit — waiting %ds", wait)
                await asyncio.sleep(wait)
                continue
            logger.error("[staleness] get_recent_commits failed: %s", exc)
            return []
    return []


# ---------------------------------------------------------------------------
# Alert persistence
# ---------------------------------------------------------------------------

async def _create_alert(doc: dict) -> dict:
    """Insert a staleness alert into MongoDB and return it with string _id."""
    db = await get_db()
    result = await db.staleness_alerts.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc


def _serialize_alert(alert: dict) -> dict:
    """Convert ObjectId fields to strings for API responses."""
    out = dict(alert)
    for key in ("_id", "workspace_id", "source_id", "doc_chunk_id"):
        if key in out and isinstance(out[key], ObjectId):
            out[key] = str(out[key])
    return out


# ---------------------------------------------------------------------------
# Mode 1: README staleness
# ---------------------------------------------------------------------------

async def analyze_readme_staleness(workspace_id: str, source_id: str) -> list[dict]:
    """Compare README content against current codebase and return staleness alerts."""
    readme_chunks = await get_readme_chunks(workspace_id, source_id)
    code_chunks = await get_latest_code_chunks(workspace_id, source_id)

    if not readme_chunks:
        logger.info("[staleness] No README chunks found for source %s — skipping", source_id)
        return []

    # Build full README text
    readme_text = "\n\n".join(
        c.get("content", "") for c in readme_chunks if c.get("content")
    )

    # Build codebase summary (grouped by file for density)
    file_map = {}
    for chunk in code_chunks:
        fp = chunk.get("file_path", "unknown")
        if fp not in file_map:
            file_map[fp] = []
        name = chunk.get("chunk_name")
        ctype = chunk.get("chunk_type")
        if name:
            file_map[fp].append(f"{name} ({ctype or 'code'})")

    summary_lines = []
    for fp, items in file_map.items():
        if items:
            summary_lines.append(f"FILE: {fp} | CONTAINS: {', '.join(items[:15])}")
        else:
            summary_lines.append(f"FILE: {fp}")

    codebase_summary = "\n".join(summary_lines) if summary_lines else "(no code chunks indexed)"

    # Truncate to stay within context limits
    # Llama-3.3-70b has a large context window, so we can afford a much bigger summary
    # to avoid false positives on larger repos.
    readme_truncated = readme_text[:10000]
    summary_truncated = codebase_summary[:30000]

    prompt = f"""You are analyzing whether a project README is up to date with its codebase.

README CONTENT:
{readme_truncated}

CURRENT CODEBASE SUMMARY (functions, classes, files that exist):
{summary_truncated}

Analyze the README and identify specific staleness issues. Look for:
1. Technologies, frameworks, or tools mentioned in README that are NOT in the codebase
2. Setup instructions that reference files or commands that likely no longer exist
3. Features described in README that have no corresponding code
4. API endpoints or functions mentioned in README that do not appear in the codebase summary

Return ONLY a JSON array. Each item must have these exact fields:
- issue_type: one of "missing_code", "outdated_reference", "missing_feature", "outdated_setup"
- description: one sentence describing the specific issue
- readme_excerpt: the exact phrase from the README that is problematic, maximum 100 characters
- severity: one of "high", "medium", "low"
- suggestion: one sentence on how to fix this

If the README appears up to date return an empty array [].
Return ONLY the JSON array, no other text."""

    try:
        raw = await _groq_call(prompt, max_tokens=1500)
        cleaned = _strip_fences(raw)
        issues = json.loads(cleaned)
    except Exception as exc:
        logger.error("[staleness] README analysis JSON parse failed: %s", exc)
        return []

    if not isinstance(issues, list):
        logger.warning("[staleness] Unexpected response format from Groq for README analysis")
        return []

    # Clear old unresolved README alerts for this source before adding new ones
    # This prevents duplication when README is re-analyzed
    db = await get_db()
    await db.staleness_alerts.delete_many({
        "source_id": ObjectId(source_id),
        "alert_type": "readme_stale",
        "resolved": False
    })

    now = datetime.now(timezone.utc)
    alerts = []
    for issue in issues:
        doc = {
            "workspace_id": ObjectId(workspace_id),
            "source_id": ObjectId(source_id),
            "alert_type": "readme_stale",
            "mode": "readme",
            "issue_type": issue.get("issue_type", "outdated_reference"),
            "description": issue.get("description", ""),
            "readme_excerpt": issue.get("readme_excerpt"),
            "file_path": None,
            "doc_chunk_id": None,
            "severity": issue.get("severity", "medium"),
            "suggestion": issue.get("suggestion", ""),
            "commit_hash": None,
            "commit_message": None,
            "resolved": False,
            "resolved_at": None,
            "resolved_by_uid": None,
            "created_at": now,
        }
        alert = await _create_alert(doc)
        alerts.append(alert)

    logger.info("[staleness] README analysis created %d alerts for source %s", len(alerts), source_id)
    return alerts


# ---------------------------------------------------------------------------
# Mode 2: Documentation staleness
# ---------------------------------------------------------------------------

async def analyze_documentation_staleness(
    workspace_id: str,
    github_source_id: str,
    url_source_id: str,
    changed_files: list[str],
    commit_sha: Optional[str] = None,
    commit_message: Optional[str] = None,
) -> list[dict]:
    """For each changed file, check if related documentation is now stale."""
    db = await get_db()
    alerts = []
    now = datetime.now(timezone.utc)

    for file_path in changed_files:
        # Step 1: Get chunks for this changed file
        file_chunks = await db.chunks.find(
            {
                "workspace_id": ObjectId(workspace_id),
                "source_id": ObjectId(github_source_id),
                "file_path": file_path,
                "source_type": "github_code",
            }
        ).to_list(length=5)

        if not file_chunks:
            logger.debug("[staleness] No chunks for changed file %s — skipping", file_path)
            continue

        # Use the embedding from the first chunk for vector search
        primary_chunk = file_chunks[0]
        embedding = primary_chunk.get("embedding")
        if not embedding:
            logger.debug("[staleness] Chunk for %s has no embedding — skipping", file_path)
            continue

        # Step 2: Vector search against url_doc chunks
        try:
            doc_chunks = await vector_search(
                query_embedding=embedding,
                workspace_id=workspace_id,
                source_types=["url_doc"],
                k=3,
                source_ids=[url_source_id],
            )
        except Exception as exc:
            logger.warning("[staleness] Vector search failed for %s: %s", file_path, exc)
            continue

        # Filter by similarity threshold
        doc_chunks = [c for c in doc_chunks if c.get("score", 0) >= 0.6]

        if not doc_chunks:
            logger.debug("[staleness] No related doc chunks (score≥0.6) for %s — skipping", file_path)
            continue

        # Step 3: Build content strings
        code_content = "\n\n".join(
            c.get("content", "") for c in file_chunks
        )[:3000]

        doc_content = "\n\n---\n\n".join(
            f"[{c.get('chunk_name', 'section')}]\n{c.get('content', '')}"
            for c in doc_chunks
        )[:3000]

        prompt = f"""You are checking if documentation is still accurate after a code change.

CHANGED FILE: {file_path}
LAST COMMIT MESSAGE: {commit_message or 'not available'}

CURRENT CODE CONTENT:
{code_content}

RELATED DOCUMENTATION:
{doc_content}

Determine if the documentation is now inaccurate or incomplete based on the code change.

Return ONLY a JSON object with these exact fields:
- is_stale: true or false
- reason: one sentence explaining why it is stale or why it is fine
- severity: one of "high", "medium", "low" (only relevant if is_stale is true)
- suggestion: one sentence on what to update in the documentation

Return ONLY the JSON object, no other text."""

        try:
            raw = await _groq_call(prompt, max_tokens=500)
            result = json.loads(_strip_fences(raw))
        except Exception as exc:
            logger.error("[staleness] Doc staleness JSON parse failed for %s: %s", file_path, exc)
            continue

        if not result.get("is_stale"):
            logger.debug("[staleness] Doc is current for %s", file_path)
            continue

        doc_chunk_id = doc_chunks[0].get("_id")
        
        # Check if an identical unresolved alert already exists
        existing = await db.staleness_alerts.find_one({
            "workspace_id": ObjectId(workspace_id),
            "file_path": file_path,
            "doc_chunk_id": ObjectId(doc_chunk_id) if doc_chunk_id else None,
            "resolved": False
        })
        
        if existing:
            logger.info("[staleness] Alert already exists for %s, skipping duplication", file_path)
            continue

        doc = {
            "workspace_id": ObjectId(workspace_id),
            "source_id": ObjectId(github_source_id),
            "alert_type": "documentation_stale",
            "mode": "documentation",
            "issue_type": "outdated_reference",
            "description": result.get("reason", ""),
            "readme_excerpt": None,
            "file_path": file_path,
            "doc_chunk_id": ObjectId(doc_chunk_id) if doc_chunk_id else None,
            "severity": result.get("severity", "medium"),
            "suggestion": result.get("suggestion", ""),
            "commit_hash": commit_sha,
            "commit_message": commit_message,
            "resolved": False,
            "resolved_at": None,
            "resolved_by_uid": None,
            "created_at": now,
        }
        alert = await _create_alert(doc)
        alerts.append(alert)

    logger.info("[staleness] Doc analysis created %d alerts for %d files", len(alerts), len(changed_files))
    return alerts


# ---------------------------------------------------------------------------
# Health score
# ---------------------------------------------------------------------------

async def calculate_health_score(workspace_id: str) -> float:
    """Calculate 0-100 health score and persist it to the workspace document."""
    db = await get_db()
    unresolved = await db.staleness_alerts.find(
        {"workspace_id": ObjectId(workspace_id), "resolved": False}
    ).to_list(length=None)

    high = sum(1 for a in unresolved if a.get("severity") == "high")
    medium = sum(1 for a in unresolved if a.get("severity") == "medium")
    low = sum(1 for a in unresolved if a.get("severity") == "low")

    deduction = 0.0
    deduction += min(high * 15, 45)
    deduction += min(medium * 8, 32)
    deduction += min(low * 3, 15)

    score = round(max(0.0, min(100.0, 100.0 - deduction)), 1)

    await db.workspaces.update_one(
        {"_id": ObjectId(workspace_id)},
        {"$set": {"health_score": score}},
    )
    logger.info("[staleness] health_score=%s for workspace %s", score, workspace_id)
    return score


# ---------------------------------------------------------------------------
# Main orchestrator
# ---------------------------------------------------------------------------

async def run_staleness_check(workspace_id: str, job_id: Optional[str] = None) -> dict:
    """
    Main entry point called by background tasks and the scheduler.
    Returns summary dict with total_alerts_created and mode.
    """
    db = await get_db()

    # Step 1: Load workspace
    workspace = await db.workspaces.find_one({"_id": ObjectId(workspace_id)})
    if not workspace:
        logger.error("[staleness] Workspace %s not found", workspace_id)
        return {"total_alerts_created": 0, "mode": "readme"}

    # Step 2: Detect mode
    mode = await detect_mode(workspace_id)
    logger.info("[staleness] Running in mode=%s for workspace %s", mode, workspace_id)

    # Step 3: Update job to running
    now = datetime.now(timezone.utc)
    if job_id:
        await db.jobs.update_one(
            {"_id": ObjectId(job_id)},
            {"$set": {"status": "running", "started_at": now}},
        )

    # Get completed GitHub sources
    github_sources = [
        s for s in workspace.get("sources", [])
        if s.get("source_type") == "github_repo"
        and s.get("indexing_status") == "completed"
    ]

    # Get url_doc source for documentation mode
    url_source = next(
        (s for s in workspace.get("sources", [])
         if s.get("source_type") == "url_doc"
         and s.get("indexing_status") == "completed"),
        None,
    )

    total_alerts: list[dict] = []

    # Step 4: Per-source analysis
    for source in github_sources:
        source_id = str(source["source_id"])

        if mode == "readme":
            alerts = await analyze_readme_staleness(workspace_id, source_id)
            total_alerts.extend(alerts)
            logger.info("[staleness] Mode=readme: %d issues for source %s", len(alerts), source_id)

        elif mode == "documentation" and url_source:
            url_source_id = str(url_source["source_id"])

            # Extract repo name from URL  (e.g. https://github.com/owner/repo)
            repo_url = source.get("url", "")
            parts = [p for p in repo_url.replace("https://github.com/", "").split("/") if p]
            if len(parts) < 2:
                logger.warning("[staleness] Cannot parse repo name from URL: %s", repo_url)
                continue

            repo_full_name = f"{parts[0]}/{parts[1]}"

            # Look up stored token from workspace metadata (if saved during connect)
            github_token = source.get("github_token") or os.environ.get("GITHUB_TOKEN")

            commits = await get_recent_commits(repo_full_name, github_token, since_hours=24)
            if not commits:
                logger.info("[staleness] No commits in last 24h for %s", repo_full_name)
                continue

            # Collect all unique changed files across commits
            changed_files: list[str] = []
            seen: set = set()
            latest_commit = commits[0]
            for commit in commits:
                for fp in commit.get("changed_files", []):
                    if fp not in seen:
                        seen.add(fp)
                        changed_files.append(fp)

            alerts = await analyze_documentation_staleness(
                workspace_id=workspace_id,
                github_source_id=source_id,
                url_source_id=url_source_id,
                changed_files=changed_files,
                commit_sha=latest_commit.get("sha"),
                commit_message=latest_commit.get("message"),
            )
            total_alerts.extend(alerts)
            logger.info("[staleness] Mode=documentation: %d issues for source %s", len(alerts), source_id)

    # Step 5: Recalculate health score
    health_score = await calculate_health_score(workspace_id)

    # Step 6: Complete job
    completed_at = datetime.now(timezone.utc)
    if job_id:
        await db.jobs.update_one(
            {"_id": ObjectId(job_id)},
            {"$set": {"status": "completed", "completed_at": completed_at}},
        )

    summary = {
        "total_alerts_created": len(total_alerts),
        "mode": mode,
        "health_score": health_score,
    }
    logger.info("[staleness] Check complete for workspace %s: %s", workspace_id, summary)
    return summary
