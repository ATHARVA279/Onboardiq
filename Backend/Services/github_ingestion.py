import logging
import os
import re
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

from bson import ObjectId
from github import Github
from github.GithubException import UnknownObjectException

from config import Config
from Database.database import get_db
from Services.chunking_service import chunk_file, detect_language
from Services.embedding_service import get_embeddings_batch
from Services.health_service import recalculate_workspace_health_score

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 500 * 1024
SKIP_PATH_CONTAINS = (
    "node_modules/",
    ".git/",
    "dist/",
    "build/",
    "pycache/",
    ".pytest_cache/",
    "venv/",
    ".venv/",
)
SKIP_EXTENSIONS = (
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".svg",
    ".ico",
    ".pdf",
    ".zip",
    ".tar",
    ".gz",
    ".exe",
    ".bin",
    ".pyc",
    ".class",
    ".jar",
    ".war",
)
SKIP_FILENAMES = {
    "package-lock.json",
    "yarn.lock",
    "poetry.lock",
    "Pipfile.lock",
    ".DS_Store",
}
KEEP_NAMES = {"Dockerfile"}
KEEP_EXTENSIONS = {
    ".py",
    ".js",
    ".ts",
    ".jsx",
    ".tsx",
    ".java",
    ".go",
    ".rs",
    ".cpp",
    ".c",
    ".h",
    ".cs",
    ".rb",
    ".php",
    ".swift",
    ".kt",
    ".md",
    ".yaml",
    ".yml",
    ".json",
    ".toml",
    ".env.example",
    ".sh",
    ".dockerfile",
}


def parse_repo_url(repo_url: str) -> Tuple[str, str]:
    repo_url = repo_url.strip()
    patterns = [
        r"^https://github\.com/(?P<owner>[^/]+)/(?P<repo>[^/]+?)(?:\.git)?/?$",
        r"^git@github\.com:(?P<owner>[^/]+)/(?P<repo>[^/]+?)(?:\.git)?$",
    ]

    for pattern in patterns:
        match = re.match(pattern, repo_url)
        if match:
            return match.group("owner"), match.group("repo")

    raise ValueError(
        "Unsupported GitHub repository URL. Use https://github.com/owner/repo, "
        "https://github.com/owner/repo.git, or git@github.com:owner/repo.git"
    )


def get_github_client(github_token: Optional[str]) -> Github:
    token = github_token or Config.GITHUB_DEFAULT_TOKEN
    if token:
        return Github(token)

    logger.warning(
        "GitHub ingestion using anonymous access; rate limits will be very low at 60 requests per hour."
    )
    return Github()


def get_all_files(repo) -> List[Dict]:
    tree = repo.get_git_tree(repo.default_branch, recursive=True)
    files = []

    for item in tree.tree:
        if item.type != "blob":
            continue
        if item.size is None or item.size > MAX_FILE_SIZE_BYTES:
            continue

        path = item.path
        lower_path = path.lower()
        filename = os.path.basename(path)
        lower_filename = filename.lower()

        if any(marker in lower_path for marker in SKIP_PATH_CONTAINS):
            continue
        if any(lower_path.endswith(extension) for extension in SKIP_EXTENSIONS):
            continue
        if filename in SKIP_FILENAMES or lower_filename in {name.lower() for name in SKIP_FILENAMES}:
            continue

        _, extension = os.path.splitext(path)
        if filename not in KEEP_NAMES and extension.lower() not in KEEP_EXTENSIONS:
            continue

        files.append({"path": path, "sha": item.sha, "size": item.size})

    return files


async def connect_and_ingest_repo(
    repo_url: str,
    github_token: Optional[str],
    workspace_id: str,
    source_id: str,
    job_id: str,
):
    db = await get_db()
    workspace_object_id = ObjectId(workspace_id)
    source_object_id = ObjectId(source_id)
    job_object_id = ObjectId(job_id)

    total_chunks_created = 0

    try:
        owner, repo_name = parse_repo_url(repo_url)
        github_client = get_github_client(github_token)

        try:
            repo = github_client.get_repo(f"{owner}/{repo_name}")
        except UnknownObjectException as exc:
            raise ValueError("GitHub repository not found or is private") from exc

        await db.jobs.update_one(
            {"_id": job_object_id},
            {
                "$set": {
                    "status": "running",
                    "started_at": datetime.now(timezone.utc),
                    "progress_message": "Fetching repository file tree",
                }
            },
        )
        await db.workspaces.update_one(
            {"_id": workspace_object_id, "sources.source_id": source_object_id},
            {"$set": {"sources.$.indexing_status": "indexing", "updated_at": datetime.now(timezone.utc)}},
        )

        files = get_all_files(repo)
        progress_total = len(files)

        await db.jobs.update_one(
            {"_id": job_object_id},
            {"$set": {"progress_total": progress_total, "progress_message": "Processing repository files"}},
        )
        await db.workspaces.update_one(
            {"_id": workspace_object_id, "sources.source_id": source_object_id},
            {
                "$set": {
                    "sources.$.file_count": progress_total,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )

        for index, file_object in enumerate(files, start=1):
            try:
                created = await process_single_file(
                    github_file_object=file_object,
                    repo=repo,
                    workspace_id=workspace_id,
                    source_id=source_id,
                    source_type="github_repo",
                )
                total_chunks_created += created
            except Exception as exc:
                logger.exception("Failed to process file %s: %s", file_object["path"], exc)
            finally:
                await db.jobs.update_one(
                    {"_id": job_object_id},
                    {
                        "$set": {
                            "progress_current": index,
                            "progress_message": f"Processed {index}/{progress_total}: {file_object['path']}",
                        }
                    },
                )

        now = datetime.now(timezone.utc)
        await db.jobs.update_one(
            {"_id": job_object_id},
            {
                "$set": {
                    "status": "completed",
                    "completed_at": now,
                    "progress_current": progress_total,
                    "progress_message": "Repository ingestion completed",
                }
            },
        )
        await db.workspaces.update_one(
            {"_id": workspace_object_id, "sources.source_id": source_object_id},
            {
                "$set": {
                    "sources.$.indexing_status": "completed",
                    "sources.$.last_indexed_at": now,
                    "sources.$.last_commit_hash": getattr(repo, "pushed_at", None) and repo.get_branch(repo.default_branch).commit.sha,
                    "sources.$.chunk_count": total_chunks_created,
                    "updated_at": now,
                }
            },
        )

        await recalculate_workspace_health_score(workspace_id)
    except Exception as exc:
        now = datetime.now(timezone.utc)
        await db.jobs.update_one(
            {"_id": job_object_id},
            {
                "$set": {
                    "status": "failed",
                    "completed_at": now,
                    "error_message": str(exc),
                    "progress_message": "Repository ingestion failed",
                }
            },
        )
        await db.workspaces.update_one(
            {"_id": workspace_object_id, "sources.source_id": source_object_id},
            {
                "$set": {
                    "sources.$.indexing_status": "failed",
                    "updated_at": now,
                }
            },
        )
        raise


async def process_single_file(
    github_file_object: Dict,
    repo,
    workspace_id: str,
    source_id: str,
    source_type: str,
) -> int:
    db = await get_db()
    file_content = repo.get_contents(github_file_object["path"])

    try:
        raw_content = file_content.decoded_content.decode("utf-8")
    except UnicodeDecodeError:
        logger.warning("Skipping non-UTF8 file %s", github_file_object["path"])
        return 0

    commit_sha = None
    commit_message = None
    author_name = None
    commit_datetime = datetime.now(timezone.utc)

    try:
        commit = next(iter(repo.get_commits(path=github_file_object["path"])[:1]), None)
        if commit:
            commit_sha = commit.sha
            commit_message = commit.commit.message
            author_name = (
                commit.commit.author.name
                if getattr(commit, "commit", None) and getattr(commit.commit, "author", None)
                else None
            )
            commit_datetime = commit.commit.author.date or commit_datetime
    except Exception as exc:
        logger.warning("Could not fetch commit info for %s: %s", github_file_object["path"], exc)

    path_lower = github_file_object["path"].lower()
    _, extension = os.path.splitext(github_file_object["path"])
    extension = extension.lower()

    if path_lower in {"readme.md", "./readme.md"} or os.path.basename(path_lower) == "readme.md":
        chunk_source_type = "github_readme"
    elif extension in {".yaml", ".yml", ".json", ".toml", ".sh"} and any(
        token in path_lower for token in ("docker", "k8s", "kubernetes", ".github")
    ):
        chunk_source_type = "github_config"
    elif os.path.basename(github_file_object["path"]) == "Dockerfile":
        chunk_source_type = "github_config"
    else:
        chunk_source_type = "github_code"

    language = detect_language(github_file_object["path"], None)
    chunks = chunk_file(raw_content, github_file_object["path"], language)
    if not chunks:
        return 0

    embeddings = await get_embeddings_batch(
        [
            {
                "text": chunk["content"],
                "chunk_type": chunk.get("chunk_type"),
                "language": chunk.get("language"),
                "chunk_name": chunk.get("chunk_name"),
                "mode": "passage",
            }
            for chunk in chunks
        ]
    )

    documents = []
    now = datetime.now(timezone.utc)
    workspace_object_id = ObjectId(workspace_id)
    source_object_id = ObjectId(source_id)

    for chunk, embedding in zip(chunks, embeddings):
        documents.append(
            {
                "workspace_id": workspace_object_id,
                "source_id": source_object_id,
                "source_type": chunk_source_type,
                "content": chunk["content"],
                "embedding": embedding,
                "file_path": github_file_object["path"],
                "language": chunk.get("language"),
                "chunk_type": chunk.get("chunk_type"),
                "chunk_name": chunk.get("chunk_name"),
                "start_line": chunk.get("start_line"),
                "end_line": chunk.get("end_line"),
                "author": author_name,
                "last_commit_hash": commit_sha,
                "last_commit_message": commit_message,
                "last_modified": commit_datetime,
                "is_stale": False,
                "stale_reason": None,
                "stale_since_commit": None,
                "stale_detected_at": None,
                "created_at": now,
            }
        )

    if documents:
        await db.chunks.insert_many(documents)

    return len(documents)
