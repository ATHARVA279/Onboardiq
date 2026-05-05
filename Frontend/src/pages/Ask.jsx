import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronDown, Code2, Database } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import AppShell from "../components/layout/AppShell";
import EmptyState from "../components/common/EmptyState";
import { useWorkspace } from "../context/WorkspaceContext";
import { askQuestion } from "../api/backend";
import { formatRelativeTime } from "../utils/formatters";

function confidenceMeta(score) {
  if (score > 80) return { label: "High confidence", color: "bg-green-500" };
  if (score >= 60) return { label: "Medium confidence", color: "bg-yellow-500" };
  return { label: "Low confidence", color: "bg-red-500" };
}

function CitationList({ citations }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3 rounded-2xl border border-[#1e2d1e] bg-[#161b22]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-[#1A3A5C]"
      >
        <span>View {citations.length} sources</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <div className="space-y-3 border-t border-[#1e2d1e] px-4 py-4">
          {citations.map((source, index) => (
            <div
              key={`${source.chunk_id || source.file_path}-${index}`}
              className="rounded-2xl border border-[#1e2d1e] bg-[#0d1117] p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    source.source_type?.includes("github") || source.source_type === "code"
                      ? "bg-blue-900/30 text-[#00ff9c]"
                      : "bg-green-900/30 text-green-400"
                  }`}
                >
                  {source.source_type || "source"}
                </span>
                <span className="font-mono text-xs text-white">
                  {source.file_path || "Unknown path"}
                </span>
                {source.start_line ? (
                  <span className="text-xs text-slate-400">
                    L{source.start_line}
                    {source.end_line ? `-${source.end_line}` : ""}
                  </span>
                ) : null}
                <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-400">
                  {Math.round((source.similarity_score || 0) * 100)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function Ask() {
  const navigate = useNavigate();
  const { workspace } = useWorkspace();
  const completedSources = useMemo(
    () =>
      (workspace?.sources || []).filter((source) => source.indexing_status === "completed"),
    [workspace],
  );
  const [selectedSourceIds, setSelectedSourceIds] = useState(
    completedSources.map((source) => source.source_id),
  );
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    setSelectedSourceIds(completedSources.map((source) => source.source_id));
  }, [completedSources]);

  const toggleSource = (sourceId) => {
    setSelectedSourceIds((current) =>
      current.includes(sourceId)
        ? current.filter((item) => item !== sourceId)
        : [...current, sourceId],
    );
  };

  const handleAsk = async () => {
    if (!question.trim() || loading) return;

    const nextQuestion = question.trim();
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: nextQuestion,
        created_at: new Date().toISOString(),
      },
    ]);
    setQuestion("");
    setLoading(true);
    setError("");

    try {
      const response = await askQuestion(
        workspace.id,
        sessionId || undefined,
        nextQuestion,
        selectedSourceIds,
      );
      if (response.session_id) {
        setSessionId(response.session_id);
      }

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.answer,
          sources: response.sources_cited || [],
          confidence_score: response.confidence_score || 0,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      {!completedSources.length ? (
          <EmptyState
            icon={Database}
            title="No completed sources available"
            description="Connect and finish indexing at least one source before asking onboarding questions."
            actionLabel="Go to Sources"
            onAction={() => navigate("/sources")}
          />
      ) : (
        <div className="flex h-[calc(100vh-3rem)] flex-col overflow-hidden rounded-3xl border border-[#1e2d1e] bg-[#0d1117] shadow-sm lg:flex-row">
          <section className="w-full border-b border-[#1e2d1e] p-6 lg:w-[35%] lg:border-b-0 lg:border-r">
            <h1 className="text-2xl font-semibold text-white">Search Sources</h1>
            <p className="mt-2 text-sm leading-7 text-slate-400">
              Choose which indexed sources the assistant should search.
            </p>
            <div className="mt-6 space-y-3">
              {completedSources.map((source) => (
                <label
                  key={source.source_id}
                  className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#1e2d1e] px-4 py-3"
                >
                  <input
                    type="checkbox"
                    checked={selectedSourceIds.includes(source.source_id)}
                    onChange={() => toggleSource(source.source_id)}
                    className="h-4 w-4 rounded border-slate-600 text-[#00ff9c] focus:ring-[#2E75B6]"
                  />
                  <span className="text-sm font-medium text-white">
                    {source.display_name}
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-4 text-sm text-slate-400">
              {selectedSourceIds.length} source
              {selectedSourceIds.length === 1 ? "" : "s"} selected
            </p>
          </section>

          <section className="flex w-full flex-col lg:w-[65%]">
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="space-y-5">
                {messages.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-[#1e2d1e] bg-[#161b22] px-6 py-12 text-center">
                    <Code2 className="mx-auto h-10 w-10 text-[#00ff9c]" />
                    <h2 className="mt-4 text-xl font-semibold text-white">
                      Ask your first onboarding question
                    </h2>
                    <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-slate-400">
                      Ask about auth flows, deployment steps, conventions, or architecture decisions across your selected sources.
                    </p>
                    <button
                      type="button"
                      onClick={() => setQuestion("How does our authentication flow work?")}
                      className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#00ff9c] px-5 text-sm font-medium text-[#080c10] transition hover:bg-[#00cc7a]"
                    >
                      Try a sample question
                    </button>
                  </div>
                ) : null}

                {messages.map((message) => {
                  const confidence = confidenceMeta(message.confidence_score || 0);
                  return (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div className="max-w-[85%]">
                        <div
                          className={`rounded-3xl px-5 py-4 text-sm leading-7 shadow-sm ${
                            message.role === "user"
                              ? "bg-[#00ff9c] text-[#080c10]"
                              : "border border-[#1e2d1e] bg-[#0d1117] text-white"
                          }`}
                        >
                          {message.role === "user" ? (
                            message.content
                          ) : (
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                p: ({ children }) => (
                                  <p className="mb-3 last:mb-0 leading-7">{children}</p>
                                ),
                                ul: ({ children }) => (
                                  <ul className="mb-3 list-disc space-y-1 pl-5">{children}</ul>
                                ),
                                ol: ({ children }) => (
                                  <ol className="mb-3 list-decimal space-y-1 pl-5">{children}</ol>
                                ),
                                li: ({ children }) => (
                                  <li className="leading-7">{children}</li>
                                ),
                                strong: ({ children }) => (
                                  <strong className="font-semibold text-[#00ff9c]">{children}</strong>
                                ),
                                em: ({ children }) => (
                                  <em className="italic text-slate-300">{children}</em>
                                ),
                                code: ({ inline, children }) =>
                                  inline ? (
                                    <code className="rounded bg-[#161b22] px-1.5 py-0.5 font-mono text-xs text-[#00ff9c]">
                                      {children}
                                    </code>
                                  ) : (
                                    <code className="block w-full overflow-x-auto rounded-xl bg-[#161b22] p-4 font-mono text-xs text-slate-300">
                                      {children}
                                    </code>
                                  ),
                                pre: ({ children }) => (
                                  <pre className="mb-3 overflow-x-auto rounded-xl bg-[#161b22] p-4">
                                    {children}
                                  </pre>
                                ),
                                h1: ({ children }) => (
                                  <h1 className="mb-2 mt-4 text-base font-bold text-white">{children}</h1>
                                ),
                                h2: ({ children }) => (
                                  <h2 className="mb-2 mt-4 text-base font-semibold text-white">{children}</h2>
                                ),
                                h3: ({ children }) => (
                                  <h3 className="mb-1 mt-3 text-sm font-semibold text-white">{children}</h3>
                                ),
                                blockquote: ({ children }) => (
                                  <blockquote className="mb-3 border-l-2 border-[#00ff9c] pl-4 text-slate-400">
                                    {children}
                                  </blockquote>
                                ),
                                a: ({ href, children }) => (
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#00ff9c] underline underline-offset-2 hover:text-[#00cc7a]"
                                  >
                                    {children}
                                  </a>
                                ),
                                // Render footnote references [^1] as superscript badges
                                sup: ({ children }) => (
                                  <sup className="ml-0.5 text-[10px] text-[#00ff9c]">{children}</sup>
                                ),
                              }}
                            >
                              {/* Strip footnote definitions at the bottom since we show sources separately */}
                              {(message.content || "").replace(/\[\^[^\]]+\]:[^\n]*/g, "").trim()}
                            </ReactMarkdown>
                          )}
                        </div>
                        <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                          <span>{formatRelativeTime(message.created_at)}</span>
                          {message.role === "assistant" ? (
                            <span className="inline-flex items-center gap-2">
                              <span className={`h-2.5 w-2.5 rounded-full ${confidence.color}`} />
                              {confidence.label}
                            </span>
                          ) : null}
                        </div>
                        {message.role === "assistant" && message.sources?.length ? (
                          <CitationList citations={message.sources} />
                        ) : null}
                      </div>
                    </div>
                  );
                })}

                {loading ? (
                  <div className="flex justify-start">
                    <div className="rounded-3xl border border-[#1e2d1e] bg-[#0d1117] px-5 py-4 text-sm text-slate-400 shadow-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[#00ff9c]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[#00ff9c] [animation-delay:150ms]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[#00ff9c] [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="border-t border-[#1e2d1e] px-6 py-5">
              {error ? (
                <div className="mb-4 rounded-2xl border border-red-900 bg-red-900/30 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              ) : null}
              <div className="flex gap-3">
                <input
                  type="text"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleAsk();
                    }
                  }}
                  className="h-12 flex-1 bg-transparent text-white rounded-2xl border border-[#1e2d1e] px-4 outline-none transition focus:border-[#00ff9c] focus:ring-4 focus:ring-[#00ff9c]/10"
                  placeholder="Ask anything about your codebase..."
                />
                <button
                  type="button"
                  onClick={handleAsk}
                  disabled={loading || !question.trim()}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-[#00ff9c] px-5 text-sm font-medium text-[#080c10] transition hover:bg-[#00cc7a] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <ArrowRight className="h-4 w-4" />
                  Send
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
