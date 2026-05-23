import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  ChevronDown,
  Code2,
  Database,
  Loader2,
  Pencil,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import MarkdownRenderer from "../components/chat/MarkdownRenderer";
import ConnectSourceModal from "../components/sources/ConnectSourceModal";
import { useWorkspace } from "../context/WorkspaceContext";
import {
  getChatSessions,
  getChatHistory,
  createNewSession,
  deleteSession,
  streamAskQuestion,
} from "../api/backend";
import { formatRelativeTime } from "../utils/formatters";

// ── helpers ──────────────────────────────────────────────────────────────────

function confidenceMeta(score) {
  if (score > 80)
    return {
      label: "High",
      bg: "var(--accent-muted)",
      text: "var(--status-success)",
    };
  if (score >= 60)
    return {
      label: "Medium",
      bg: "var(--accent-muted)",
      text: "var(--status-medium)",
    };
  return {
    label: "Low",
    bg: "var(--accent-muted)",
    text: "var(--status-high)",
  };
}

function sessionKey(workspaceId) {
  return `onboardiq_active_session_${workspaceId}`;
}

// ── Citations accordion ───────────────────────────────────────────────────────

function CitationChips({ citations }) {
  const [showAll, setShowAll] = useState(false);
  const displayedCitations = showAll ? citations : citations.slice(0, 4);

  return (
    <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
      <div className="flex items-center gap-1.5 mb-2.5 px-0.5">
        <Database className="w-3 h-3 text-[var(--accent-primary)] opacity-80" strokeWidth={1.5} />
        <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-tertiary)] font-medium">
          Sources Cited
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {displayedCitations.map((src, i) => (
          <div
            key={`${src.chunk_id}-${i}`}
            className="flex items-center gap-2 px-2.5 py-1 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[rgba(200,169,107,0.25)] hover:bg-[var(--bg-hover)] transition-all duration-150 cursor-pointer group max-w-[200px]"
            title={src.file_path}
          >
            <Code2 className="w-3 h-3 text-[var(--text-tertiary)] group-hover:text-[var(--accent-primary)] transition-colors" strokeWidth={1.5} />
            <span className="text-[11px] font-medium text-[var(--text-secondary)] truncate group-hover:text-[var(--text-primary)]">
              {src.file_path?.split("/").pop() || "source"}
            </span>
          </div>
        ))}
        {!showAll && citations.length > 4 && (
          <button
            onClick={() => setShowAll(true)}
            className="flex items-center px-1.5 text-[10px] text-[var(--accent-primary)] font-medium hover:text-[var(--accent-primary-hover)] transition-colors"
          >
            +{citations.length - 4} more
          </button>
        )}
        {showAll && citations.length > 4 && (
          <button
            onClick={() => setShowAll(false)}
            className="flex items-center px-1.5 text-[10px] text-[var(--text-tertiary)] font-medium hover:text-[var(--text-secondary)] transition-colors"
          >
            Show less
          </button>
        )}
      </div>
    </div>
  );
}

// ── MessagesSkeleton ─────────────────────────────────────────────────────────

function MessagesSkeleton() {
  return (
    <div className="space-y-8 w-full max-w-3xl mx-auto animate-pulse">
      {/* User message skeleton */}
      <div className="flex justify-end mb-6">
        <div
          className="oi-skeleton h-12 w-2/3 rounded-xl opacity-60"
          style={{
            backgroundColor: "rgba(200, 169, 107, 0.02)",
            border: "1px solid rgba(200, 169, 107, 0.08)",
          }}
        />
      </div>
      {/* Assistant message skeleton */}
      <div className="flex gap-4 mb-8 w-full">
        <div className="oi-skeleton h-8 w-8 rounded-md shrink-0" style={{ backgroundColor: "rgba(255,255,255,0.04)" }} />
        <div className="flex-1 space-y-3 pt-2">
          <div className="oi-skeleton h-3.5 w-5/6 rounded" />
          <div className="oi-skeleton h-3.5 w-2/3 rounded" />
          <div className="oi-skeleton h-3.5 w-3/4 rounded" />
        </div>
      </div>
      {/* Another User message skeleton */}
      <div className="flex justify-end mb-6">
        <div
          className="oi-skeleton h-10 w-1/2 rounded-xl opacity-60"
          style={{
            backgroundColor: "rgba(200, 169, 107, 0.02)",
            border: "1px solid rgba(200, 169, 107, 0.08)",
          }}
        />
      </div>
      {/* Another Assistant message skeleton */}
      <div className="flex gap-4 mb-8 w-full">
        <div className="oi-skeleton h-8 w-8 rounded-md shrink-0" style={{ backgroundColor: "rgba(255,255,255,0.04)" }} />
        <div className="flex-1 space-y-3 pt-2">
          <div className="oi-skeleton h-3.5 w-11/12 rounded" />
          <div className="oi-skeleton h-3.5 w-4/5 rounded" />
        </div>
      </div>
    </div>
  );
}

// ── Message ───────────────────────────────────────────────────────────────────

function Message({ message, sendLoading }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div
        id={`msg-${message.id}`}
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "24px",
        }}
      >
        <div
          className="message-content-bubble"
          style={{
            maxWidth: "85%",
            backgroundColor: "rgba(200, 169, 107, 0.03)",
            border: "1px solid rgba(200, 169, 107, 0.15)",
            color: "var(--text-primary)",
            borderRadius: "12px",
            padding: "14px 18px",
            fontSize: "15.5px",
            lineHeight: "1.75",
            wordBreak: "break-word",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  // Pre-token streaming skeleton
  if (!message.content && sendLoading) {
    return (
      <div className="flex gap-4 mb-8 w-full max-w-3xl mx-auto animate-pulse">
        <div className="oi-skeleton h-8 w-8 rounded-full shrink-0" />
        <div className="flex-1 space-y-3 pt-2">
          <div className="oi-skeleton h-3 w-3/4 rounded" />
          <div className="oi-skeleton h-3 w-1/2 rounded" />
          <div className="oi-skeleton h-3 w-2/3 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div
      id={`msg-${message.id}`}
      style={{
        display: "flex",
        gap: "16px",
        marginBottom: "36px",
        width: "100%",
      }}
    >
      <div
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "6px",
          background:
            "linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: "4px",
          fontSize: "11px",
          fontWeight: "700",
          color: "#0C0C0E",
        }}
      >
        IQ
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <MarkdownRenderer content={message.content || ""} />

        {message.sources?.length > 0 && (
          <CitationChips citations={message.sources} />
        )}
        <div className="mt-3 flex items-center justify-between">
          <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
            {formatRelativeTime(message.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

function SessionItem({ session, isActive, onSelect, onDelete }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={() => onSelect(session.session_id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "block",
        width: "calc(100% - 16px)",
        margin: "2px 8px",
        textAlign: "left",
        background: isActive
          ? "rgba(200, 169, 107, 0.08)"
          : hovered
            ? "var(--bg-hover)"
            : "transparent",
        border: "none",
        padding: "8px 12px",
        borderRadius: "6px",
        cursor: "pointer",
        position: "relative",
        transition: "all 0.15s ease",
      }}
    >
      <p
        style={{
          fontSize: "13px",
          fontWeight: "500",
          color: isActive ? "var(--accent-primary)" : "var(--text-secondary)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          paddingRight: hovered ? "20px" : "0",
          margin: 0,
        }}
      >
        {session.preview || "New Chat"}
      </p>
      <p
        style={{
          fontSize: "10px",
          color: "var(--text-tertiary)",
          margin: "2px 0 0 0",
        }}
      >
        {formatRelativeTime(session.updated_at)}
      </p>

      {hovered && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(session.session_id);
          }}
          style={{
            position: "absolute",
            right: "8px",
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-tertiary)",
            padding: "4px",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = "var(--status-high)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "var(--text-tertiary)")
          }
          aria-label="Delete session"
        >
          <Trash2 size={13} />
        </button>
      )}
    </button>
  );
}

export default function Ask() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { workspace, refreshWorkspace } = useWorkspace();
  const workspaceId = workspace?.id || workspace?._id;
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const [connectModalOpen, setConnectModalOpen] = useState(false);

  const completedSources = useMemo(
    () =>
      (workspace?.sources || []).filter(
        (s) => s.indexing_status === "completed",
      ),
    [workspace],
  );

  const [selectedSourceIds, setSelectedSourceIds] = useState([]);

  useEffect(() => {
    if (completedSources.length > 0 && selectedSourceIds.length === 0) {
      setSelectedSourceIds(completedSources.map((s) => s.source_id));
    }
  }, [completedSources, selectedSourceIds.length]);

  const toggleSource = (id) =>
    setSelectedSourceIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );

  const handleConnectSuccess = useCallback(async () => {
    await refreshWorkspace();
  }, [refreshWorkspace]);

  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState(null);

  const loadSessions = useCallback(async () => {
    if (!workspaceId) return [];
    setSessionsLoading(true);
    try {
      const list = await getChatSessions(workspaceId);
      setSessions(list);
      return list;
    } catch {
      setSessions([]);
      return [];
    } finally {
      setSessionsLoading(false);
    }
  }, [workspaceId]);

  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [question, setQuestion] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryCountdown, setRetryCountdown] = useState(null);
  const retryTimerRef = useRef(null);

  const loadSessionMessages = useCallback(
    async (sid) => {
      if (!workspaceId || !sid) return;
      setMessagesLoading(true);
      try {
        const data = await getChatHistory(workspaceId, sid);
        const msgs = (data.messages || []).map((m, i) => ({
          id: `${sid}-${i}`,
          role: m.role === "model" ? "assistant" : m.role,
          content: m.content,
          sources: m.sources || [],
          confidence_score: m.confidence_score || 0,
          created_at: m.created_at,
        }));
        setMessages(msgs);
      } catch {
        setMessages([]);
      } finally {
        setMessagesLoading(false);
      }
    },
    [workspaceId],
  );

  const querySessionId = searchParams.get("session_id");
  const queryQuestionText = searchParams.get("q");

  useEffect(() => {
    if (!workspaceId) return;
    setMessages([]);
    setActiveSessionId(null);

    (async () => {
      // Load user's sessions for the sidebar list
      const list = await loadSessions();
      
      // Determine what session to target:
      // 1. URL parameter (highest priority, allows loading shared/direct sessions)
      // 2. localStorage saved active session
      // 3. Fallback to the first session in the sidebar list
      const targetSessionId = querySessionId || localStorage.getItem(sessionKey(workspaceId)) || (list && list[0]?.session_id);
      
      if (!targetSessionId) {
        return;
      }

      if (querySessionId !== targetSessionId) {
        navigate(`/ask?session_id=${targetSessionId}`, { replace: true });
      } else {
        setActiveSessionId(targetSessionId);
        localStorage.setItem(sessionKey(workspaceId), targetSessionId);
        await loadSessionMessages(targetSessionId);
      }
    })();
  }, [workspaceId, loadSessions, loadSessionMessages, querySessionId, navigate]);

  useEffect(() => {
    if (messages.length > 0 && queryQuestionText) {
      const match = messages.find(
        (m) =>
          m.role === "user" &&
          m.content.trim().toLowerCase() === queryQuestionText.trim().toLowerCase()
      );
      if (match) {
        const timer = setTimeout(() => {
          const el = document.getElementById(`msg-${match.id}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            const bubble = el.querySelector(".message-content-bubble") || el;
            bubble.style.transition = "all 0.5s ease";
            const originalBorder = bubble.style.borderColor;
            const originalShadow = bubble.style.boxShadow;

            bubble.style.borderColor = "var(--accent-primary)";
            bubble.style.boxShadow = "0 0 25px var(--accent-glow)";

            setTimeout(() => {
              bubble.style.borderColor = originalBorder;
              bubble.style.boxShadow = originalShadow;
            }, 2500);
          }
        }, 100);
        return () => clearTimeout(timer);
      }
    }

    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, queryQuestionText]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [question]);

  const handleSelectSession = async (sid) => {
    navigate(`/ask?session_id=${sid}`, { replace: true });
  };

  const handleNewChat = async () => {
    try {
      const sid = await createNewSession(workspaceId);
      const stub = {
        session_id: sid,
        preview: "New Chat",
        message_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setSessions((prev) => [stub, ...prev]);
      navigate(`/ask?session_id=${sid}`, { replace: true });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteSession = async (sid) => {
    if (!window.confirm("Delete this chat? This cannot be undone.")) return;
    try {
      await deleteSession(workspaceId, sid);
      const next = sessions.filter((s) => s.session_id !== sid);
      setSessions(next);
      if (activeSessionId === sid) {
        if (next.length > 0) {
          navigate(`/ask?session_id=${next[0].session_id}`, { replace: true });
        } else {
          setActiveSessionId(null);
          setMessages([]);
          localStorage.removeItem(sessionKey(workspaceId));
          navigate("/ask", { replace: true });
        }
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const startRetryCountdown = (seconds, pendingQuestion, pendingSessionId) => {
    setRetryCountdown(seconds);
    let remaining = seconds;
    retryTimerRef.current = setInterval(() => {
      remaining -= 1;
      setRetryCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(retryTimerRef.current);
        setRetryCountdown(null);
        setQuestion(pendingQuestion);
        setTimeout(() => {
          setMessages((cur) => [
            ...cur,
            {
              id: crypto.randomUUID(),
              role: "user",
              content: pendingQuestion,
              created_at: new Date().toISOString(),
            },
          ]);
          doAsk(pendingQuestion, pendingSessionId);
        }, 100);
      }
    }, 1000);
  };

  const doAsk = async (q, sessionId) => {
    setSendLoading(true);
    setError("");
    const assistantId = crypto.randomUUID();
    setMessages((cur) => [
      ...cur,
      {
        id: assistantId,
        role: "assistant",
        content: "",
        sources: [],
        confidence_score: 0,
        created_at: new Date().toISOString(),
      },
    ]);

    const updateAssistant = (updater) => {
      setMessages((cur) =>
        cur.map((message) =>
          message.id === assistantId ? { ...message, ...updater(message) } : message,
        ),
      );
    };

    try {
      await streamAskQuestion(
        workspaceId,
        sessionId || undefined,
        q,
        selectedSourceIds,
        {
          onStart: (event) => {
            if (event.session_id && event.session_id !== activeSessionId) {
              setActiveSessionId(event.session_id);
              localStorage.setItem(sessionKey(workspaceId), event.session_id);
            }
          },
          onToken: (token) => {
            updateAssistant((message) => ({
              content: `${message.content || ""}${token}`,
            }));
          },
          onComplete: async (event) => {
            if (event.session_id && event.session_id !== activeSessionId) {
              setActiveSessionId(event.session_id);
              localStorage.setItem(sessionKey(workspaceId), event.session_id);
            }
            updateAssistant(() => ({
              content: event.answer || "",
              sources: event.sources_cited || [],
              confidence_score: event.confidence_score || 0,
            }));
            await loadSessions();
          },
          onError: (event) => {
            throw Object.assign(new Error(event.message), { data: event });
          },
        },
      );
    } catch (err) {
      setMessages((cur) => cur.filter((message) => message.id !== assistantId));
      const data = err?.response?.data || err?.data;
      if (
        data?.error === "ai_unavailable" ||
        (typeof data === "string" && data.includes("ai_unavailable"))
      ) {
        const waitSecs = data?.retry_after_seconds || 30;
        setError(
          `Rate limited. Retrying automatically in ${waitSecs} seconds…`,
        );
        startRetryCountdown(waitSecs, q, sessionId);
      } else {
        setError(err.message || String(err));
      }
    } finally {
      setSendLoading(false);
    }
  };

  const handleAsk = async () => {
    if (!completedSources.length) {
      setConnectModalOpen(true);
      return;
    }
    if (!question.trim() || sendLoading || retryCountdown !== null) return;
    const q = question.trim();
    setMessages((cur) => [
      ...cur,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: q,
        created_at: new Date().toISOString(),
      },
    ]);
    setQuestion("");
    if (retryTimerRef.current) {
      clearInterval(retryTimerRef.current);
      setRetryCountdown(null);
    }
    await doAsk(q, activeSessionId);
  };

  return (
    <AppShell>
      <div
        style={{
          display: "flex",
          height: "calc(100vh - 6.5rem)",
          overflow: "hidden",
          borderRadius: "12px",
          border: "1px solid var(--border-default)",
          backgroundColor: "var(--bg-surface)",
        }}
      >
        <div
          style={{
            width: "280px",
            minWidth: "280px",
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid var(--border-default)",
            backgroundColor: "var(--bg-base)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              flex: "0 0 60%",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              borderBottom: "1px solid var(--bg-hover)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 18px",
                borderBottom: "1px solid var(--border-default)",
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: "500",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--text-tertiary)",
                }}
              >
                Chats
              </span>
              <button
                type="button"
                onClick={handleNewChat}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-tertiary)",
                  padding: "4px",
                  borderRadius: "4px",
                  display: "flex",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--accent-primary)";
                  e.currentTarget.style.backgroundColor = "var(--bg-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--text-tertiary)";
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
                aria-label="New chat"
              >
                <Pencil size={14} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
              {sessionsLoading ? (
                <div className="space-y-3.5 px-4 py-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="space-y-2 py-1">
                      <div className="oi-skeleton h-3 w-3/4 rounded" />
                      <div className="oi-skeleton h-2.5 w-12 rounded" />
                    </div>
                  ))}
                </div>
              ) : sessions.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 20px" }}>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--text-tertiary)",
                      marginBottom: "12px",
                    }}
                  >
                    No search history
                  </p>
                  <button
                    type="button"
                    onClick={handleNewChat}
                    className="oi-button oi-button-secondary"
                    style={{
                      minHeight: "36px",
                      padding: "0 12px",
                      fontSize: "12px",
                    }}
                  >
                    Start your first chat
                  </button>
                </div>
              ) : (
                sessions.map((s) => (
                  <SessionItem
                    key={s.session_id}
                    session={s}
                    isActive={s.session_id === activeSessionId}
                    onSelect={handleSelectSession}
                    onDelete={handleDeleteSession}
                  />
                ))
              )}
            </div>
          </div>

          <div
            style={{
              flex: "0 0 40%",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "14px 18px",
                borderBottom: "1px solid var(--border-default)",
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: "500",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--text-tertiary)",
                }}
              >
                Sources
              </span>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
              {completedSources.map((source) => (
                <label
                  key={source.source_id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    width: "calc(100% - 16px)",
                    margin: "2px 8px",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "var(--bg-hover)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                >
                  <input
                    type="checkbox"
                    checked={selectedSourceIds.includes(source.source_id)}
                    onChange={() => toggleSource(source.source_id)}
                    style={{
                      accentColor: "var(--accent-primary)",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: "13px",
                      color: "var(--text-secondary)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      flex: 1,
                    }}
                    title={source.display_name}
                  >
                    {source.display_name}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minWidth: 0,
            backgroundColor: "var(--bg-surface)",
          }}
        >
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "40px 0",
            }}
          >
            <div className="max-w-3xl mx-auto px-6 w-full h-full flex flex-col justify-between">
              <div>
                {messagesLoading && <MessagesSkeleton />}

                {messages.length === 0 &&
                  !messagesLoading &&
                  !sendLoading &&
                  (completedSources.length ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "100%",
                        textAlign: "center",
                        paddingTop: "60px",
                        paddingBottom: "60px",
                      }}
                    >
                      <div
                        style={{
                          width: "56px",
                          height: "56px",
                          borderRadius: "12px",
                          background: "var(--accent-muted)",
                          border: "1px solid rgba(200, 169, 107, 0.25)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginBottom: "24px",
                          boxShadow: "0 8px 24px rgba(0,0,0,0.2), 0 0 20px rgba(200, 169, 107, 0.05)",
                        }}
                      >
                        <Sparkles size={26} color="var(--accent-primary)" />
                      </div>
                      <h2
                        style={{
                          fontSize: "30px",
                          fontWeight: "620",
                          letterSpacing: "-0.03em",
                          color: "var(--text-primary)",
                          marginBottom: "12px",
                        }}
                      >
                        What can I help you find?
                      </h2>
                      <p
                        style={{
                          fontSize: "15.5px",
                          color: "var(--text-secondary)",
                          opacity: 0.8,
                          maxWidth: "480px",
                          lineHeight: "1.7",
                          margin: "0 auto",
                        }}
                      >
                        Search across your repositories and documentation with
                        precision. IQ provides answers with full source citations.
                      </p>

                      <div
                        style={{
                          marginTop: "36px",
                          display: "flex",
                          flexWrap: "wrap",
                          justifyContent: "center",
                          gap: "12px",
                        }}
                      >
                        {[
                          "How does authentication work?",
                          "Explain the deployment flow",
                          "Find database migrations",
                        ].map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => setQuestion(suggestion)}
                            style={{
                              padding: "10px 18px",
                              backgroundColor: "var(--bg-elevated)",
                              border: "1px solid var(--border-default)",
                              borderRadius: "8px",
                              color: "var(--text-secondary)",
                              fontSize: "14px",
                              fontWeight: "500",
                              cursor: "pointer",
                              transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = "rgba(200, 169, 107, 0.35)";
                              e.currentTarget.style.backgroundColor = "var(--bg-hover)";
                              e.currentTarget.style.color = "var(--text-primary)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = "var(--border-default)";
                              e.currentTarget.style.backgroundColor = "var(--bg-elevated)";
                              e.currentTarget.style.color = "var(--text-secondary)";
                            }}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", paddingTop: "100px" }}>
                      <p style={{ color: "var(--text-secondary)" }}>
                        Connect a source to start searching.
                      </p>
                    </div>
                  ))}

                {!messagesLoading &&
                  messages.map((m) => (
                    <Message key={m.id} message={m} sendLoading={sendLoading} />
                  ))}
              </div>

              <div ref={messagesEndRef} />
            </div>
          </div>

          <div
            style={{
              padding: "16px 0 32px 0",
              backgroundColor: "var(--bg-surface)",
              borderTop: "none",
            }}
          >
            <div className="max-w-3xl mx-auto px-6 w-full">
              {error && (
                <div
                  style={{
                    marginBottom: "16px",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    backgroundColor:
                      retryCountdown !== null
                        ? "rgba(200, 169, 107, 0.08)"
                        : "rgba(239,68,68,0.08)",
                    border: `1px solid ${retryCountdown !== null ? "rgba(200, 169, 107, 0.15)" : "rgba(239, 68, 68, 0.15)"}`,
                    color:
                      retryCountdown !== null
                        ? "var(--accent-primary)"
                        : "var(--status-high)",
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  {retryCountdown !== null && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {error}
                </div>
              )}

              <div className="oi-chat-input-container">
                <textarea
                  ref={textareaRef}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleAsk();
                    }
                  }}
                  placeholder={
                    completedSources.length
                      ? "Ask a question about your sources…"
                      : "Connect a source to start searching…"
                  }
                  disabled={
                    !completedSources.length ||
                    sendLoading ||
                    retryCountdown !== null
                  }
                  style={{
                    width: "100%",
                    padding: "16px 54px 16px 18px",
                    background: "none",
                    border: "none",
                    outline: "none",
                    resize: "none",
                    color: "var(--text-primary)",
                    fontSize: "15px",
                    lineHeight: "1.6",
                    maxHeight: "140px",
                    fontFamily: "inherit",
                  }}
                />

                <button
                  type="button"
                  onClick={handleAsk}
                  disabled={
                    !question.trim() || sendLoading || retryCountdown !== null
                  }
                  className="ask-send-button"
                  style={{
                    position: "absolute",
                    right: "10px",
                    bottom: "10px",
                    width: "32px",
                    height: "32px",
                    borderRadius: "6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {sendLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUp size={16} strokeWidth={2.5} />
                  )}
                </button>
              </div>

              <p
                style={{
                  marginTop: "12px",
                  fontSize: "11px",
                  color: "var(--text-tertiary)",
                  textAlign: "center",
                  letterSpacing: "0.02em",
                }}
              >
                Press Enter to send. Use Shift+Enter for new lines.
              </p>
            </div>
          </div>
        </div>
      </div>

      <ConnectSourceModal
        open={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        workspaceId={workspaceId}
        onConnected={handleConnectSuccess}
      />
    </AppShell>
  );
}
