import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, ChevronDown, Code2, Database, Pencil, Sparkles, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import EmptyState from "../components/common/EmptyState";
import MarkdownRenderer from "../components/chat/MarkdownRenderer";
import TypingIndicator from "../components/chat/TypingIndicator";
import { useWorkspace } from "../context/WorkspaceContext";
import {
  askQuestion,
  getChatSessions,
  getChatHistory,
  createNewSession,
  deleteSession,
} from "../api/backend";
import { formatRelativeTime } from "../utils/formatters";

// ── helpers ──────────────────────────────────────────────────────────────────

function confidenceMeta(score) {
  if (score > 80) return { label: "High", bg: "#15803d", text: "#bbf7d0" };
  if (score >= 60) return { label: "Medium", bg: "#854d0e", text: "#fef08a" };
  return { label: "Low", bg: "#7f1d1d", text: "#fca5a5" };
}

function sessionKey(workspaceId) {
  return `onboardiq_active_session_${workspaceId}`;
}

// ── Citations accordion ───────────────────────────────────────────────────────

function CitationAccordion({ citations }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#00ff9c",
          fontSize: "12px",
          padding: 0,
          fontWeight: "500",
        }}
      >
        {citations.length} source{citations.length === 1 ? "" : "s"}
        <ChevronDown
          size={12}
          style={{
            transition: "transform 0.2s",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {open && (
        <div
          style={{
            marginTop: "8px",
            borderLeft: "2px solid rgba(0,255,156,0.2)",
            paddingLeft: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          {citations.map((src, i) => (
            <div
              key={`${src.chunk_id}-${i}`}
              style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: src.source_type?.includes("github") ? "#3b82f6" : "#10b981",
                  flexShrink: 0,
                }}
              />
              <code
                style={{
                  fontSize: "11px",
                  color: "#94a3b8",
                  fontFamily: "monospace",
                  wordBreak: "break-all",
                }}
              >
                {src.file_path || "unknown"}
              </code>
              {src.start_line && (
                <span style={{ fontSize: "11px", color: "#64748b" }}>
                  L{src.start_line}{src.end_line ? `-${src.end_line}` : ""}
                </span>
              )}
              <span
                style={{
                  fontSize: "11px",
                  color: "#64748b",
                  marginLeft: "auto",
                }}
              >
                {Math.round((src.similarity_score || 0) * 100)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Message ───────────────────────────────────────────────────────────────────

function Message({ message }) {
  const isUser = message.role === "user";
  const conf = confidenceMeta(message.confidence_score || 0);

  if (isUser) {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
        <div
          style={{
            maxWidth: "70%",
            backgroundColor: "#1A3A5C",
            color: "#f1f5f9",
            borderRadius: "18px 18px 4px 18px",
            padding: "12px 16px",
            fontSize: "14px",
            lineHeight: "1.6",
            wordBreak: "break-word",
          }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  // Assistant message — document style, no bubble
  return (
    <div style={{ display: "flex", gap: "10px", marginBottom: "24px", maxWidth: "85%" }}>
      {/* Avatar */}
      <div
        style={{
          width: "28px",
          height: "28px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #00ff9c 0%, #2E75B6 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: "2px",
          fontSize: "10px",
          fontWeight: "700",
          color: "#080c10",
        }}
      >
        AI
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Answer content */}
        <MarkdownRenderer content={message.content || ""} />

        {/* Meta bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "8px",
            paddingTop: "8px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                backgroundColor: conf.bg,
                color: conf.text,
                fontSize: "11px",
                fontWeight: "600",
                padding: "2px 8px",
                borderRadius: "999px",
              }}
            >
              {conf.label}
            </span>
            <span style={{ fontSize: "11px", color: "#4b5563" }}>
              {formatRelativeTime(message.created_at)}
            </span>
          </div>

          {message.sources?.length > 0 && (
            <CitationAccordion citations={message.sources} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Session item ──────────────────────────────────────────────────────────────

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
        width: "100%",
        textAlign: "left",
        background: isActive ? "rgba(0,255,156,0.06)" : hovered ? "rgba(255,255,255,0.04)" : "transparent",
        borderLeft: isActive ? "2px solid #00ff9c" : "2px solid transparent",
        border: "none",
        borderLeft: isActive ? "2px solid #00ff9c" : "2px solid transparent",
        padding: "8px 10px",
        borderRadius: "0 8px 8px 0",
        cursor: "pointer",
        position: "relative",
        transition: "all 0.15s",
      }}
    >
      <p
        style={{
          fontSize: "13px",
          fontWeight: "500",
          color: isActive ? "#f1f5f9" : "#94a3b8",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          paddingRight: hovered ? "24px" : "0",
          margin: 0,
        }}
      >
        {session.preview || "New Chat"}
      </p>
      <p style={{ fontSize: "11px", color: "#4b5563", margin: "2px 0 0 0" }}>
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
            color: "#6b7280",
            padding: "4px",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#6b7280")}
          aria-label="Delete session"
        >
          <Trash2 size={13} />
        </button>
      )}
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Ask() {
  const navigate = useNavigate();
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id || workspace?._id;
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const completedSources = useMemo(
    () => (workspace?.sources || []).filter((s) => s.indexing_status === "completed"),
    [workspace],
  );

  // ── Source selection ──────────────────────────────────────────────────────
  const [selectedSourceIds, setSelectedSourceIds] = useState(() =>
    completedSources.map((s) => s.source_id),
  );

  useEffect(() => {
    setSelectedSourceIds(completedSources.map((s) => s.source_id));
  }, [completedSources]);

  const toggleSource = (id) =>
    setSelectedSourceIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );

  // ── Sessions ──────────────────────────────────────────────────────────────
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

  // ── Messages ──────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [question, setQuestion] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryCountdown, setRetryCountdown] = useState(null); // seconds remaining
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

  useEffect(() => {
    if (!workspaceId) return;
    setMessages([]);
    setActiveSessionId(null);

    (async () => {
      const list = await loadSessions();
      if (!list || list.length === 0) return;
      const stored = localStorage.getItem(sessionKey(workspaceId));
      const match = list.find((s) => s.session_id === stored);
      const target = match || list[0];
      setActiveSessionId(target.session_id);
      await loadSessionMessages(target.session_id);
    })();
  }, [workspaceId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sendLoading]);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [question]);

  // ── Session actions ───────────────────────────────────────────────────────

  const handleSelectSession = async (sid) => {
    setActiveSessionId(sid);
    localStorage.setItem(sessionKey(workspaceId), sid);
    setMessages([]);
    setError("");
    await loadSessionMessages(sid);
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
      setActiveSessionId(sid);
      localStorage.setItem(sessionKey(workspaceId), sid);
      setMessages([]);
      setError("");
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
          await handleSelectSession(next[0].session_id);
        } else {
          setActiveSessionId(null);
          setMessages([]);
          localStorage.removeItem(sessionKey(workspaceId));
        }
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // ── Send ──────────────────────────────────────────────────────────────────

  const startRetryCountdown = (seconds, pendingQuestion, pendingSessionId) => {
    setRetryCountdown(seconds);
    let remaining = seconds;
    retryTimerRef.current = setInterval(() => {
      remaining -= 1;
      setRetryCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(retryTimerRef.current);
        setRetryCountdown(null);
        // Auto-retry: restore question and re-send
        setQuestion(pendingQuestion);
        // Small timeout to let state settle before re-triggering
        setTimeout(() => {
          setMessages((cur) => [
            ...cur,
            { id: crypto.randomUUID(), role: "user", content: pendingQuestion, created_at: new Date().toISOString() },
          ]);
          doAsk(pendingQuestion, pendingSessionId);
        }, 100);
      }
    }, 1000);
  };

  const doAsk = async (q, sessionId) => {
    setSendLoading(true);
    setError("");
    try {
      const res = await askQuestion(workspaceId, sessionId || undefined, q, selectedSourceIds);

      // Detect structured ai_unavailable error returned as 200 from axios interceptor
      // (axios throws on non-2xx but the backend returns 503 JSON, so it will throw)
      if (res.session_id && res.session_id !== activeSessionId) {
        setActiveSessionId(res.session_id);
        localStorage.setItem(sessionKey(workspaceId), res.session_id);
      }
      setMessages((cur) => [
        ...cur,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: res.answer,
          sources: res.sources_cited || [],
          confidence_score: res.confidence_score || 0,
          created_at: new Date().toISOString(),
        },
      ]);
      await loadSessions();
    } catch (err) {
      // Check if this is the structured ai_unavailable error
      const data = err?.response?.data || err?.data;
      if (data?.error === "ai_unavailable" || (typeof data === "string" && data.includes("ai_unavailable"))) {
        const waitSecs = data?.retry_after_seconds || 30;
        setError(`Rate limited. Retrying automatically in ${waitSecs} seconds…`);
        startRetryCountdown(waitSecs, q, sessionId);
      } else {
        setError(err.message || String(err));
      }
    } finally {
      setSendLoading(false);
    }
  };

  const handleAsk = async () => {
    if (!question.trim() || sendLoading || retryCountdown !== null) return;
    const q = question.trim();
    setMessages((cur) => [
      ...cur,
      { id: crypto.randomUUID(), role: "user", content: q, created_at: new Date().toISOString() },
    ]);
    setQuestion("");
    // Clear any existing countdown
    if (retryTimerRef.current) { clearInterval(retryTimerRef.current); setRetryCountdown(null); }
    await doAsk(q, activeSessionId);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (!completedSources.length) {
    return (
      <AppShell>
        <EmptyState
          icon={Database}
          title="No completed sources available"
          description="Connect and finish indexing at least one source before asking questions."
          actionLabel="Go to Sources"
          onAction={() => navigate("/sources")}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div
        style={{
          display: "flex",
          height: "calc(100vh - 3rem)",
          overflow: "hidden",
          borderRadius: "20px",
          border: "1px solid #1e2d1e",
          backgroundColor: "#0d1117",
        }}
      >
        {/* ── LEFT PANEL: fixed 280px ── */}
        <div
          style={{
            width: "280px",
            minWidth: "280px",
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid #1e2d1e",
            overflow: "hidden",
          }}
        >
          {/* Chat history — top 60% */}
          <div
            style={{
              flex: "0 0 60%",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              borderBottom: "1px solid #1e2d1e",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: "700",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#4b5563",
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
                  color: "#4b5563",
                  padding: "4px",
                  borderRadius: "6px",
                  display: "flex",
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#00ff9c")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#4b5563")}
                aria-label="New chat"
              >
                <Pencil size={13} />
              </button>
            </div>

            {/* Session list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
              {sessionsLoading ? (
                <p style={{ fontSize: "12px", color: "#4b5563", padding: "12px 14px" }}>
                  Loading…
                </p>
              ) : sessions.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 14px" }}>
                  <p style={{ fontSize: "12px", color: "#4b5563", marginBottom: "8px" }}>
                    No chats yet
                  </p>
                  <button
                    type="button"
                    onClick={handleNewChat}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#00ff9c",
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                  >
                    Start one →
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

          {/* Sources — bottom 40% */}
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
                padding: "12px 14px",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: "700",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#4b5563",
                }}
              >
                Sources
              </span>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
              {completedSources.map((source) => (
                <label
                  key={source.source_id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "7px 14px",
                    cursor: "pointer",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                >
                  <input
                    type="checkbox"
                    checked={selectedSourceIds.includes(source.source_id)}
                    onChange={() => toggleSource(source.source_id)}
                    style={{ accentColor: "#00ff9c", flexShrink: 0 }}
                  />
                  <span
                    style={{
                      width: "7px",
                      height: "7px",
                      borderRadius: "50%",
                      backgroundColor: "#10b981",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#94a3b8",
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

        {/* ── RIGHT PANEL: chat ── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          {/* Message list */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "24px 32px",
            }}
          >
            {messages.length === 0 && !messagesLoading && !sendLoading && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  textAlign: "center",
                  opacity: 0.8,
                  paddingBottom: "80px",
                }}
              >
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, rgba(0,255,156,0.15) 0%, rgba(46,117,182,0.15) 100%)",
                    border: "1px solid rgba(0,255,156,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "16px",
                  }}
                >
                  <Sparkles size={24} color="#00ff9c" />
                </div>
                <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#f1f5f9", marginBottom: "8px" }}>
                  Ask your codebase anything
                </h2>
                <p style={{ fontSize: "14px", color: "#4b5563", maxWidth: "400px", lineHeight: "1.7" }}>
                  Ask about auth flows, deployment steps, architecture decisions, or any part of your indexed codebase.
                </p>
                <button
                  type="button"
                  onClick={() => setQuestion("How does our authentication flow work?")}
                  style={{
                    marginTop: "20px",
                    padding: "10px 20px",
                    backgroundColor: "rgba(0,255,156,0.1)",
                    border: "1px solid rgba(0,255,156,0.25)",
                    borderRadius: "10px",
                    color: "#00ff9c",
                    fontSize: "13px",
                    fontWeight: "500",
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                >
                  Try a sample question →
                </button>
              </div>
            )}

            {messagesLoading && (
              <p style={{ textAlign: "center", fontSize: "13px", color: "#4b5563", paddingTop: "40px" }}>
                Loading messages…
              </p>
            )}

            {messages.map((m) => (
              <Message key={m.id} message={m} />
            ))}

            {sendLoading && <TypingIndicator />}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            style={{
              borderTop: "1px solid #1e2d1e",
              padding: "16px 24px",
              backgroundColor: "#0d1117",
            }}
          >
            {error && (
              <div
                style={{
                  marginBottom: "12px",
                  padding: "10px 14px",
                  backgroundColor: retryCountdown !== null
                    ? "rgba(120,80,10,0.4)"
                    : "rgba(127,29,29,0.4)",
                  border: `1px solid ${retryCountdown !== null ? "rgba(234,179,8,0.35)" : "rgba(239,68,68,0.3)"}`,
                  borderRadius: "10px",
                  fontSize: "13px",
                  color: retryCountdown !== null ? "#fde68a" : "#fca5a5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <span>{error}</span>
                {retryCountdown !== null && (
                  <span
                    style={{
                      flexShrink: 0,
                      fontVariantNumeric: "tabular-nums",
                      fontWeight: "600",
                      fontSize: "14px",
                    }}
                  >
                    {retryCountdown}s
                  </span>
                )}
              </div>
            )}
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: "10px",
                backgroundColor: "#161b22",
                border: "1px solid #1e2d1e",
                borderRadius: "14px",
                padding: "10px 12px",
                transition: "border-color 0.15s",
              }}
              onFocusCapture={(e) =>
                (e.currentTarget.style.borderColor = "rgba(0,255,156,0.4)")
              }
              onBlurCapture={(e) =>
                (e.currentTarget.style.borderColor = "#1e2d1e")
              }
            >
              <textarea
                ref={textareaRef}
                value={question}
                rows={1}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAsk();
                  }
                }}
                placeholder="Ask anything about your codebase… (Enter to send, Shift+Enter for newline)"
                style={{
                  flex: 1,
                  background: "none",
                  border: "none",
                  outline: "none",
                  resize: "none",
                  color: "#f1f5f9",
                  fontSize: "14px",
                  lineHeight: "1.6",
                  maxHeight: "120px",
                  overflowY: "auto",
                  fontFamily: "inherit",
                }}
              />
              <button
                type="button"
                onClick={handleAsk}
                disabled={sendLoading || !question.trim()}
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "8px",
                  backgroundColor: question.trim() && !sendLoading ? "#00ff9c" : "#1e2d1e",
                  border: "none",
                  cursor: question.trim() && !sendLoading ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "background-color 0.15s",
                }}
                aria-label="Send"
              >
                <ArrowUp
                  size={16}
                  color={question.trim() && !sendLoading ? "#080c10" : "#4b5563"}
                />
              </button>
            </div>
            <p style={{ fontSize: "11px", color: "#374151", marginTop: "6px", textAlign: "center" }}>
              Shift+Enter for newline · answers grounded in your indexed sources
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
