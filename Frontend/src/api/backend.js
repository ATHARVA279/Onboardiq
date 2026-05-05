import axios from "axios";
import { auth } from "./firebaseConfig";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000",
});

async function getAuthHeader() {
  let user = auth.currentUser;

  if (!user) {
    await new Promise((resolve) => {
      const unsubscribe = auth.onAuthStateChanged((nextUser) => {
        user = nextUser;
        unsubscribe();
        resolve();
      });
    });
  }

  if (!user) {
    return {};
  }

  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
  };
}

async function authedRequest(config) {
  const headers = await getAuthHeader();
  return api({
    ...config,
    headers: {
      ...(config.headers || {}),
      ...headers,
    },
  });
}

function extractError(error) {
  return (
    error?.response?.data?.detail ||
    error?.response?.data?.message ||
    error?.message ||
    "Request failed"
  );
}

function normalizeWorkspace(workspace) {
  if (!workspace) return null;
  return {
    ...workspace,
    id: workspace.id || workspace._id,
    sources: (workspace.sources || []).map((source) => ({
      ...source,
      source_id: source.source_id || source.id,
    })),
  };
}

function normalizeJob(job) {
  if (!job) return null;
  return {
    ...job,
    id: job.id || job._id,
    workspace_id: job.workspace_id,
    source_id: job.source_id,
  };
}

export async function createWorkspace(name) {
  try {
    const { data } = await authedRequest({
      method: "post",
      url: "/api/workspace/create",
      data: { name },
    });
    return normalizeWorkspace(data);
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function getUserWorkspace() {
  try {
    const { data } = await authedRequest({
      method: "get",
      url: "/api/workspaces",
    });
    return Array.isArray(data) && data.length > 0 ? normalizeWorkspace(data[0]) : null;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function connectGithubRepo(workspaceId, repoUrl, githubToken) {
  try {
    const { data } = await authedRequest({
      method: "post",
      url: `/api/workspace/${workspaceId}/connect/github`,
      data: {
        workspace_id: workspaceId,
        repo_url: repoUrl,
        github_token: githubToken || undefined,
      },
    });
    return normalizeJob(data);
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function connectUrl(workspaceId, url, displayName) {
  try {
    const { data } = await authedRequest({
      method: "post",
      url: `/api/workspace/${workspaceId}/connect/url`,
      data: {
        workspace_id: workspaceId,
        url,
        display_name: displayName || undefined,
      },
    });
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function getJobStatus(workspaceId, jobId) {
  try {
    const { data } = await authedRequest({
      method: "get",
      url: `/api/workspace/${workspaceId}/job/${jobId}`,
    });
    return normalizeJob(data);
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function getWorkspace(workspaceId) {
  try {
    const { data } = await authedRequest({
      method: "get",
      url: `/api/workspace/${workspaceId}`,
    });
    return normalizeWorkspace(data);
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function askQuestion(workspaceId, sessionId, question, sourceIds) {
  try {
    const { data } = await authedRequest({
      method: "post",
      url: `/api/workspace/${workspaceId}/ask`,
      data: {
        workspace_id: workspaceId,
        session_id: sessionId || undefined,
        question,
        source_ids: sourceIds,
      },
    });
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function getChatHistory(workspaceId, sessionId) {
  try {
    const { data } = await authedRequest({
      method: "get",
      url: `/api/workspace/${workspaceId}/sessions/${sessionId}`,
    });
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function getStalenessAlerts(workspaceId) {
  try {
    const { data } = await authedRequest({
      method: "get",
      url: `/api/workspace/${workspaceId}/staleness`,
    });
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function resolveStaleChunk(chunkId) {
  try {
    const { data } = await authedRequest({
      method: "post",
      url: `/api/staleness/${chunkId}/resolve`,
    });
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function getUserProfile() {
  try {
    const { data } = await authedRequest({
      method: "get",
      url: "/auth/me",
    });
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export default api;
