from datetime import datetime
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


WorkspaceSourceType = Literal["github_repo", "confluence", "notion", "url", "slack"]
WorkspaceIndexingStatus = Literal["pending", "indexing", "completed", "failed"]
ChunkSourceType = Literal[
    "github_code",
    "github_readme",
    "github_config",
    "url_doc",
    "confluence",
    "notion",
    "slack",
]
ChunkType = Literal["function", "class", "method", "section", "paragraph", "config"]
JobType = Literal["github_ingest", "url_ingest", "staleness_check", "re_index"]
JobStatus = Literal["queued", "running", "completed", "failed"]


class ResponseModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class WorkspaceSourceResponse(ResponseModel):
    source_id: str
    source_type: WorkspaceSourceType
    url: str
    display_name: str
    last_indexed_at: Optional[datetime] = None
    last_commit_hash: Optional[str] = None
    indexing_status: WorkspaceIndexingStatus
    file_count: int = 0
    chunk_count: int = 0


class ChunkResponse(ResponseModel):
    id: str = Field(alias="_id")
    workspace_id: str
    source_id: str
    source_type: ChunkSourceType
    content: str
    file_path: Optional[str] = None
    language: Optional[str] = None
    chunk_type: ChunkType
    chunk_name: Optional[str] = None
    start_line: Optional[int] = None
    end_line: Optional[int] = None
    author: Optional[str] = None
    last_commit_hash: Optional[str] = None
    last_commit_message: Optional[str] = None
    last_modified: datetime
    is_stale: bool = False
    stale_reason: Optional[str] = None
    stale_since_commit: Optional[str] = None
    stale_detected_at: Optional[datetime] = None
    created_at: datetime


class WorkspaceResponse(ResponseModel):
    id: str = Field(alias="_id")
    name: str
    owner_uid: str
    members: List[str]
    sources: List[WorkspaceSourceResponse]
    created_at: datetime
    updated_at: datetime
    health_score: float = 100.0


class SourceCitationResponse(ResponseModel):
    chunk_id: str
    file_path: Optional[str] = None
    chunk_name: Optional[str] = None
    source_type: str
    start_line: Optional[int] = None
    end_line: Optional[int] = None
    similarity_score: float
    relevance: Literal['cited', 'retrieved']


class ChatResponse(ResponseModel):
    answer_text_clean: str = Field(alias="answer", default="")
    sources_cited: List[SourceCitationResponse]
    all_retrieved: List[SourceCitationResponse] = Field(alias="all_retrieved_chunks", default_factory=list)
    confidence_score: float = Field(..., ge=0, le=100)
    session_id: str


class JobResponse(ResponseModel):
    id: str = Field(alias="_id")
    workspace_id: str
    source_id: str
    job_type: JobType
    status: JobStatus
    progress_current: int = 0
    progress_total: int = 0
    progress_message: str = ""
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime


class HealthScoreResponse(ResponseModel):
    workspace_id: str
    overall_score: float
    breakdown: Dict[str, float]
    stale_count: int
    undocumented_file_count: int
