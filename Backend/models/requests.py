from typing import Optional, List
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator


def _validate_object_id_string(value: str, field_name: str) -> str:
    candidate = value.strip()
    if len(candidate) != 24:
        raise ValueError(f"{field_name} must be a 24-character MongoDB ObjectId string")
    try:
        int(candidate, 16)
    except ValueError as exc:
        raise ValueError(f"{field_name} must be a valid MongoDB ObjectId string") from exc
    return candidate


class RequestModel(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)


class ConnectGithubRequest(RequestModel):
    workspace_id: str = Field(..., description="Workspace ObjectId")
    repo_url: str = Field(..., min_length=1, max_length=500)
    github_token: Optional[str] = Field(default=None, min_length=1, max_length=5000)

    @field_validator("workspace_id")
    @classmethod
    def validate_workspace_id(cls, value: str) -> str:
        return _validate_object_id_string(value, "workspace_id")

    @field_validator("repo_url")
    @classmethod
    def validate_github_url(cls, value: str) -> str:
        parsed = urlparse(value)
        if parsed.scheme != "https" or parsed.netloc.lower() != "github.com":
            raise ValueError("repo_url must be a valid GitHub URL")

        path_parts = [part for part in parsed.path.strip("/").split("/") if part]
        if len(path_parts) < 2:
            raise ValueError("repo_url must include both owner and repository name")

        return value


class ConnectUrlRequest(RequestModel):
    workspace_id: str = Field(..., description="Workspace ObjectId")
    url: HttpUrl
    display_name: Optional[str] = Field(default=None, min_length=1, max_length=200)

    @field_validator("workspace_id")
    @classmethod
    def validate_workspace_id(cls, value: str) -> str:
        return _validate_object_id_string(value, "workspace_id")


class ChatRequest(RequestModel):
    workspace_id: str = Field(..., description="Workspace ObjectId")
    session_id: Optional[str] = Field(default=None, min_length=1, max_length=200)
    question: str = Field(..., min_length=3, max_length=1000)
    source_ids: List[str] = Field(default_factory=list)

    @field_validator("workspace_id")
    @classmethod
    def validate_workspace_id(cls, value: str) -> str:
        return _validate_object_id_string(value, "workspace_id")


class CreateWorkspaceRequest(RequestModel):
    name: str = Field(..., min_length=1, max_length=100)


class InviteMemberRequest(RequestModel):
    workspace_id: str = Field(..., description="Workspace ObjectId")
    email: str = Field(..., min_length=3, max_length=320)

    @field_validator("workspace_id")
    @classmethod
    def validate_workspace_id(cls, value: str) -> str:
        return _validate_object_id_string(value, "workspace_id")

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        candidate = value.strip()
        if "@" not in candidate or candidate.startswith("@") or candidate.endswith("@"):
            raise ValueError("email must be a valid email address")
        return candidate
