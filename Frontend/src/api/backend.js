import axios from "axios";
import { auth } from "./firebaseConfig";

const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: BASE_URL,
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
  return { Authorization: `Bearer ${token}` };
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

export async function authedFetch(path, options = {}) {
  const headers = await getAuthHeader();
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...headers,
    },
  });
  return response;
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
  };
}

const ACTIVE_KEY = "onboardiq_active_workspace";

export function getStoredActiveWorkspaceId() {
  return localStorage.getItem(ACTIVE_KEY) || null;
}

export function setStoredActiveWorkspaceId(id) {
  if (id) localStorage.setItem(ACTIVE_KEY, id);
  else localStorage.removeItem(ACTIVE_KEY);
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

export async function getUserWorkspaces() {
  try {
    const { data } = await authedRequest({ method: "get", url: "/api/workspaces" });
    return Array.isArray(data) ? data.map(normalizeWorkspace) : [];
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function getUserWorkspace() {
  const all = await getUserWorkspaces();
  return all.length > 0 ? all[0] : null;
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
      data: { workspace_id: workspaceId, url, display_name: displayName || undefined },
    });
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function getSourcePages(workspaceId, sourceId) {
  try {
    const { data } = await authedRequest({
      method: "get",
      url: `/api/workspace/${workspaceId}/source/${sourceId}/pages`,
    });
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function deleteSource(workspaceId, sourceId) {
  try {
    await authedRequest({
      method: "delete",
      url: `/api/workspace/${workspaceId}/source/${sourceId}`,
    });
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function reindexSource(workspaceId, sourceId, githubToken) {
  try {
    const { data } = await authedRequest({
      method: "post",
      url: `/api/workspace/${workspaceId}/source/${sourceId}/reindex`,
      data: githubToken ? { github_token: githubToken } : {},
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

export async function streamAskQuestion(
  workspaceId,
  sessionId,
  question,
  sourceIds,
  handlers = {},
) {
  const response = await authedFetch(`/api/workspace/${workspaceId}/ask/stream`, {
    method: "POST",
    body: JSON.stringify({
      workspace_id: workspaceId,
      session_id: sessionId || undefined,
      question,
      source_ids: sourceIds,
    }),
  });

  if (!response.ok) {
    let detail = "Request failed";
    try {
      const data = await response.json();
      detail = data.detail || data.message || detail;
    } catch {
      detail = response.statusText || detail;
    }
    throw new Error(detail);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (reader) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIndex = buffer.indexOf("\n");
    while (newlineIndex !== -1) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (line) {
        const event = JSON.parse(line);
        if (event.type === "start") handlers.onStart?.(event);
        if (event.type === "token") handlers.onToken?.(event.content, event);
        if (event.type === "complete") handlers.onComplete?.(event);
        if (event.type === "error") handlers.onError?.(event);
      }
      newlineIndex = buffer.indexOf("\n");
    }
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

export async function getChatSessions(workspaceId) {
  try {
    const { data } = await authedRequest({
      method: "get",
      url: `/api/chat/sessions/${workspaceId}`,
    });
    return data.sessions || [];
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function createNewSession(workspaceId) {
  try {
    const { data } = await authedRequest({
      method: "post",
      url: `/api/chat/session/${workspaceId}/new`,
    });
    return data.session_id;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function deleteSession(workspaceId, sessionId) {
  try {
    await authedRequest({
      method: "delete",
      url: `/api/workspace/${workspaceId}/sessions/${sessionId}`,
    });
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function triggerStalenessCheck(workspaceId) {
  try {
    const { data } = await authedRequest({
      method: "post",
      url: `/api/workspace/${workspaceId}/staleness/check`,
    });
    return normalizeJob(data);
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function getStalenessAlerts(workspaceId, params = {}) {
  try {
    const { data } = await authedRequest({
      method: "get",
      url: `/api/workspace/${workspaceId}/staleness/alerts`,
      params,
    });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function resolveAlert(workspaceId, alertId) {
  try {
    const { data } = await authedRequest({
      method: "patch",
      url: `/api/workspace/${workspaceId}/staleness/alerts/${alertId}/resolve`,
    });
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function dismissAlert(workspaceId, alertId) {
  try {
    await authedRequest({
      method: "delete",
      url: `/api/workspace/${workspaceId}/staleness/alerts/${alertId}`,
    });
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function getStalenessSummary(workspaceId) {
  try {
    const { data } = await authedRequest({
      method: "get",
      url: `/api/workspace/${workspaceId}/staleness/summary`,
    });
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function getUserProfile() {
  try {
    const { data } = await authedRequest({ method: "get", url: "/api/user/profile" });
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function updateUserProfile(payload) {
  try {
    const { data } = await authedRequest({
      method: "put",
      url: "/api/user/profile",
      data: payload,
    });
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function saveUserSecret(keyName, value) {
  try {
    await authedRequest({
      method: "post",
      url: `/api/user/secrets/${keyName}`,
      data: { value },
    });
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function deleteUserSecret(keyName) {
  try {
    await authedRequest({
      method: "delete",
      url: `/api/user/secrets/${keyName}`,
    });
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export default api;
