import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, ChevronDown, Code2, Database, Loader2, Pencil, Sparkles, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import MarkdownRenderer from "../components/chat/MarkdownRenderer";
import TypingIndicator from "../components/chat/TypingIndicator";
import ConnectSourceModal from "../components/sources/ConnectSourceModal";
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
  if (score > 80) return { label: "High", bg: "var(--accent-muted)", text: "var(--status-success)" };
  if (score >= 60) return { label: "Medium", bg: "var(--accent-muted)", text: "var(--status-medium)" };
  return { label: "Low", bg: "var(--accent-muted)", text: "var(--status-high)" };
}

function sessionKey(workspaceId) {
  return `onboardiq_active_session_${workspaceId}`;
}

// ── Citations accordion ───────────────────────────────────────────────────────

function CitationChips({ citations }) {
  const [showAll, setShowAll] = useState(false);
  const displayedCitations = showAll ? citations : citations.slice(0, 4);

  return (
    <div className="mt-3 pt-3 border-t border-[var(--bg-hover)]">
      <div className="flex items-center gap-2 mb-2 px-1">
        <Database className="w-3 h-3 text-[var(--accent-primary)]" />
        <span className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] font-bold">Sources</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {displayedCitations.map((src, i) => (
          <div
            key={`${src.chunk_id}-${i}`}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--bg-hover)] hover:border-[var(--accent-primary)]/40 transition-all cursor-pointer group max-w-[200px]"
            title={src.file_path}
          >
            <Code2 className="w-3.5 h-3.5 text-[var(--text-tertiary)] group-hover:text-[var(--accent-primary)] transition-colors" />
            <span className="text-[12px] font-medium text-[var(--text-secondary)] truncate group-hover:text-[var(--text-primary)]">
              {src.file_path?.split('/').pop() || "source"}
            </span>
          </div>
        ))}
        {!showAll && citations.length > 4 && (
          <button
            onClick={() => setShowAll(true)}
            className="flex items-center px-2 text-[11px] text-[var(--accent-primary)] font-bold hover:underline"
          >
            +{citations.length - 4} more
          </button>
        )}
        {showAll && citations.length > 4 && (
          <button
            onClick={() => setShowAll(false)}
            className="flex items-center px-2 text-[11px] text-[var(--text-tertiary)] font-bold hover:underline"
          >
            Show less
          </button>
        )}
      </div>
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
            backgroundColor: "var(--accent-muted)",
            border: "1px solid var(--accent-primary-hover)",
            color: "var(--text-primary)",
            borderRadius: "18px 18px 4px 18px",
            padding: "14px 20px",
            fontSize: "15px",
            lineHeight: "1.6",
            wordBreak: "break-word",
          }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: "12px", marginBottom: "32px", maxWidth: "90%" }}>
      <div
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "8px",
          background: "linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: "2px",
          fontSize: "11px",
          fontWeight: "700",
          color: "var(--bg-base)",
        }}
      >
        IQ
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <MarkdownRenderer content={message.content || ""} />

        <div
          style={{
            marginTop: "12px",
          }}
        >
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
        width: "100%",
        textAlign: "left",
        background: isActive ? "var(--bg-hover)" : hovered ? "var(--bg-base)" : "transparent",
        borderLeft: isActive ? "2px solid var(--accent-primary)" : "2px solid transparent",
        border: "none",
        padding: "10px 14px",
        borderRadius: "0 8px 8px 0",
        cursor: "pointer",
        position: "relative",
        transition: "all 0.2s",
      }}
    >
      <p
        style={{
          fontSize: "14px",
          fontWeight: "500",
          color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          paddingRight: hovered ? "24px" : "0",
          margin: 0,
        }}
      >
        {session.preview || "New Chat"}
      </p>
      <p style={{ fontSize: "11px", color: "var(--text-tertiary)", margin: "4px 0 0 0" }}>
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
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--status-high)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-tertiary)")}
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
  const { workspace, refreshWorkspace } = useWorkspace();
  const workspaceId = workspace?.id || workspace?._id;
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const [connectModalOpen, setConnectModalOpen] = useState(false);

  const completedSources = useMemo(
    () => (workspace?.sources || []).filter((s) => s.indexing_status === "completed"),
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
  }, [workspaceId, loadSessions, loadSessionMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sendLoading]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [question]);

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
    if (!completedSources.length) {
      setConnectModalOpen(true);
      return;
    }
    if (!question.trim() || sendLoading || retryCountdown !== null) return;
    const q = question.trim();
    setMessages((cur) => [
      ...cur,
      { id: crypto.randomUUID(), role: "user", content: q, created_at: new Date().toISOString() },
    ]);
    setQuestion("");
    if (retryTimerRef.current) { clearInterval(retryTimerRef.current); setRetryCountdown(null); }
    await doAsk(q, activeSessionId);
  };

  return (
    <AppShell>
      <div
        style={{
          display: "flex",
          height: "calc(100vh - 6rem)",
          overflow: "hidden",
          borderRadius: "20px",
          border: "1px solid var(--bg-hover)",
          backgroundColor: "var(--bg-surface)",
        }}
      >
        <div
          style={{
            width: "280px",
            minWidth: "280px",
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid var(--bg-hover)",
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
                padding: "16px 20px",
                borderBottom: "1px solid var(--bg-hover)",
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: "700",
                  letterSpacing: "0.15em",
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
                  borderRadius: "6px",
                  display: "flex",
                  transition: "all 0.2s",
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
                <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Loader2 className="h-4 w-4 animate-spin text-var(--accent-primary)" />
                  <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>Loading chats…</span>
                </div>
              ) : sessions.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 20px" }}>
                  <p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginBottom: "12px" }}>
                    No search history
                  </p>
                  <button
                    type="button"
                    onClick={handleNewChat}
                    className="oi-button oi-button-secondary"
                    style={{ minHeight: "36px", padding: "0 12px", fontSize: "12px" }}
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
                padding: "16px 20px",
                borderBottom: "1px solid var(--bg-hover)",
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: "700",
                  letterSpacing: "0.15em",
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
                    padding: "8px 20px",
                    cursor: "pointer",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <input
                    type="checkbox"
                    checked={selectedSourceIds.includes(source.source_id)}
                    onChange={() => toggleSource(source.source_id)}
                    style={{ accentColor: "var(--accent-primary)", flexShrink: 0 }}
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
              padding: "40px 60px",
            }}
          >
            {messages.length === 0 && !messagesLoading && !sendLoading &&
              (completedSources.length ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    textAlign: "center",
                    paddingBottom: "100px",
                  }}
                >
                  <div
                    style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: "16px",
                      background: "var(--accent-muted)",
                      border: "1px solid var(--accent-primary-hover)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "24px",
                      boxShadow: "0 0 40px var(--accent-glow)",
                    }}
                  >
                    <Sparkles size={32} color="var(--accent-primary)" />
                  </div>
                  <h2 style={{ fontSize: "28px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "16px" }}>
                    What can I help you find?
                  </h2>
                  <p style={{ fontSize: "17px", color: "var(--text-tertiary)", maxWidth: "520px", lineHeight: "1.7" }}>
                    Search across your repositories and documentation with precision. IQ provides answers with full source citations.
                  </p>
                  
                  <div style={{ marginTop: "40px", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "12px" }}>
                    {[
                      "How does authentication work?",
                      "Explain the deployment flow",
                      "Find database migrations"
                    ].map(suggestion => (
                      <button
                        key={suggestion}
                        onClick={() => setQuestion(suggestion)}
                        style={{
                          padding: "12px 24px",
                          backgroundColor: "var(--bg-base)",
                          border: "1px solid var(--bg-hover)",
                          borderRadius: "12px",
                          color: "var(--text-secondary)",
                          fontSize: "15px",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "var(--accent-primary)";
                          e.currentTarget.style.color = "var(--text-primary)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "var(--bg-hover)";
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
                  <p style={{ color: "var(--text-secondary)" }}>Connect a source to start searching.</p>
                </div>
              ))}

            {messages.map((m) => (
              <Message key={m.id} message={m} />
            ))}
            
            {sendLoading && (
              <div style={{ display: "flex", gap: "12px", marginBottom: "32px" }}>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    background: "var(--bg-hover)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Loader2 className="h-4 w-4 animate-spin text-var(--accent-primary)" />
                </div>
                <div style={{ flex: 1 }}>
                  <TypingIndicator />
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          <div
            style={{
              padding: "24px 60px 40px",
              borderTop: "1px solid var(--bg-hover)",
              backgroundColor: "var(--bg-surface)",
            }}
          >
            {error && (
              <div
                style={{
                  marginBottom: "16px",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  backgroundColor: retryCountdown !== null ? "rgba(212,168,67,0.1)" : "rgba(239,68,68,0.1)",
                  border: `1px solid ${retryCountdown !== null ? "var(--accent-primary-hover)" : "var(--status-high)"}`,
                  color: retryCountdown !== null ? "var(--accent-primary)" : "var(--status-high)",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                {retryCountdown !== null && <Loader2 className="h-4 w-4 animate-spin" />}
                {error}
              </div>
            )}

            <div
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                backgroundColor: "var(--bg-base)",
                borderRadius: "16px",
                border: "1px solid var(--bg-hover)",
                transition: "border-color 0.2s, box-shadow 0.2s",
                boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
              }}
              onFocusCapture={(e) => {
                e.currentTarget.style.borderColor = "var(--accent-primary)";
                e.currentTarget.style.boxShadow = "0 8px 32px var(--accent-glow)";
              }}
              onBlurCapture={(e) => {
                e.currentTarget.style.borderColor = "var(--bg-hover)";
                e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.2)";
              }}
            >
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
                disabled={!completedSources.length || sendLoading || retryCountdown !== null}
                style={{
                  width: "100%",
                  padding: "16px 60px 16px 20px",
                  background: "none",
                  border: "none",
                  outline: "none",
                  resize: "none",
                  color: "var(--text-primary)",
                  fontSize: "15px",
                  lineHeight: "1.6",
                  maxHeight: "120px",
                  fontFamily: "inherit",
                }}
              />
              
              <button
                type="button"
                onClick={handleAsk}
                disabled={!question.trim() || sendLoading || retryCountdown !== null}
                className="ask-send-button"
                style={{
                  position: "absolute",
                  right: "12px",
                  bottom: "12px",
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  backgroundColor: "var(--bg-hover)",
                  color: "var(--text-tertiary)",
                }}
              >
                {sendLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUp size={18} />
                )}
              </button>
            </div>
            
            <p style={{ marginTop: "16px", fontSize: "11px", color: "var(--text-tertiary)", textAlign: "center" }}>
              Press Enter to send. Use Shift+Enter for new lines.
            </p>
          </div>
        </div>
      </div>

      <ConnectSourceModal
        isOpen={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        onSuccess={handleConnectSuccess}
      />
    </AppShell>
  );
}
