import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Database,
  ExternalLink,
  Eye,
  EyeOff,
  FileCode,
  Github,
  Globe,
  Loader2,
  Plus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import Modal from "../components/common/Modal";
import EmptyState from "../components/common/EmptyState";
import SourceCard from "../components/sources/SourceCard";
import {
  connectGithubRepo,
  connectUrl,
  getJobStatus,
  getGithubToken,
  getWorkspace,
  reindexSource,
  saveGithubToken,
  getStalenessSummary,
  getStalenessAlerts,
} from "../api/backend";
import { useWorkspace } from "../context/WorkspaceContext";
import { formatRelativeTime, scoreColor } from "../utils/formatters";

function HealthScoreCard({ score }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, score));
  const offset = circumference - (progress / 100) * circumference;
  
  const color = progress > 70 ? 'var(--accent-primary)' : progress >= 40 ? 'var(--status-medium)' : 'var(--status-high)';

  return (
    <div className="rounded-xl border border-[var(--bg-hover)] bg-[var(--bg-surface)] p-6 shadow-2xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--text-tertiary)]">Documentation Health</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{progress}%</p>
        </div>
        <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} stroke="var(--bg-hover)" strokeWidth="8" fill="none" />
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke={color}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
          <text
            x="50"
            y="55"
            textAnchor="middle"
            transform="rotate(90 50 50)"
            className="fill-[var(--text-primary)] text-[18px] font-semibold"
          >
            {progress}
          </text>
        </svg>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, valueColor = "var(--text-primary)", isAlert = false }) {
  return (
    <div style={{
      position: 'relative',
      borderRadius: '12px',
      background: 'var(--bg-surface)',
      padding: '24px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.4), 0 0 0 1px var(--bg-hover)',
      transition: 'all 0.2s ease'
    }}>
      <div>
        <p style={{
          fontSize: '11px',
          fontWeight: '600',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-tertiary)',
          marginBottom: '12px'
        }}>
          {title}
        </p>
        <p style={{
          fontSize: '36px',
          fontWeight: '700',
          letterSpacing: '-0.03em',
          color: valueColor,
          textShadow: isAlert && value > 0 ? '0 0 20px var(--status-high)' : 'none'
        }}>
          {value}
        </p>
      </div>
      <Icon style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        width: '32px',
        height: '32px',
        opacity: 0.1,
        color: valueColor
      }} />
    </div>
  );
}

function ConnectSourceModal({ open, onClose, workspaceId, onConnected }) {
  const [tab, setTab] = useState("github");
  const [repoUrl, setRepoUrl] = useState("");
  const [token, setToken] = useState("");
  const [docsUrl, setDocsUrl] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setError("");
      setLoading(false);
    } else {
      const stored = getGithubToken(workspaceId);
      if (stored) setToken(stored);
    }
  }, [open, workspaceId]);

  const handleGithubSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const trimmedToken = token.trim();
      const job = await connectGithubRepo(workspaceId, repoUrl.trim(), trimmedToken);
      if (trimmedToken) saveGithubToken(workspaceId, trimmedToken);
      await onConnected({ type: "github", job });
      onClose();
      setRepoUrl("");
      setToken("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDocsSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const job = await connectUrl(workspaceId, docsUrl.trim(), displayName.trim() || undefined);
      await onConnected({ type: "url", job });
      onClose();
      setDocsUrl("");
      setDisplayName("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-semibold text-[var(--text-primary)]">Connect New Source</h3>
            <p className="mt-2 text-sm leading-7 text-[var(--text-tertiary)]">
              Add a repository or documentation source to your workspace.
            </p>
          </div>
        </div>

        <div className="mt-6 flex rounded-lg border border-[var(--bg-hover)] bg-[var(--bg-base)] p-1">
          {[
            { id: "github", label: "GitHub Repository" },
            { id: "url", label: "Documentation URL" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`flex-1 rounded-xl px-4 py-3 text-sm font-medium transition ${
                tab === item.id
                  ? "bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "github" ? (
          <form onSubmit={handleGithubSubmit} className="mt-6 space-y-5">
            <label className="block">
              <span className="text-sm font-medium text-[var(--text-primary)]">Repository URL</span>
              <input
                type="url"
                value={repoUrl}
                onChange={(event) => setRepoUrl(event.target.value)}
                className="oi-input mt-2 w-full"
                placeholder="https://github.com/owner/repo"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-[var(--text-primary)]">
                Personal Access Token
              </span>
              <div className="relative mt-2">
                <input
                  type={showToken ? "text" : "password"}
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  className="oi-input w-full pr-12"
                  placeholder="ghp_xxxxxxxxxxxx"
                />
                <button
                  type="button"
                  onClick={() => setShowToken((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-2 text-xs text-[var(--text-tertiary)]">
                Optional for public repos. Required for private repos. Needs
                `repo:read` scope.
              </p>
            </label>

            <div className="rounded-lg border border-[var(--accent-muted)] bg-[var(--accent-muted)]/10 px-4 py-3 text-sm leading-7 text-[var(--accent-primary)]">
              Without a token, GitHub rate limits drop to 60 requests per hour, which
              can cause larger repositories to fail before indexing completes.
            </div>

            {error ? (
              <div className="rounded-lg border border-[var(--status-high)]/30 bg-[var(--status-high)]/10 px-4 py-3 text-sm text-[var(--status-high)]">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading || !repoUrl.trim()}
              className="oi-button oi-button-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting Repository
                </>
              ) : (
                <>
                  <Github className="h-4 w-4" />
                  Connect Repository
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleDocsSubmit} className="mt-6 space-y-5">
            <label className="block">
              <span className="text-sm font-medium text-[var(--text-primary)]">Documentation URL</span>
              <input
                type="url"
                value={docsUrl}
                onChange={(event) => setDocsUrl(event.target.value)}
                className="oi-input mt-2 w-full"
                placeholder="https://docs.yourproject.com"
                required
              />
              <p className="mt-1.5 text-xs text-[var(--text-tertiary)]">
                Onboardiq will automatically discover and index linked pages on the same domain up to 20 pages.
              </p>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-[var(--text-primary)]">
                Display Name
                <span className="ml-1 text-xs font-normal text-[var(--text-tertiary)]">(optional)</span>
              </span>
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="oi-input mt-2 w-full"
                placeholder="e.g. API Documentation, User Guide"
              />
            </label>

            <div className="rounded-lg border border-[var(--status-medium)]/30 bg-[var(--status-medium)]/10 px-4 py-3 text-sm leading-6 text-[var(--status-medium)]">
              ⚠️ Some sites may block automated scraping. If indexing fails, try a different documentation format.
            </div>

            {error ? (
              <div className="rounded-lg border border-[var(--status-high)]/30 bg-[var(--status-high)]/10 px-4 py-3 text-sm text-[var(--status-high)]">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading || !docsUrl.trim()}
              className="oi-button oi-button-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting URL
                </>
              ) : (
                <>
                  <Globe className="h-4 w-4" />
                  Connect URL
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { workspace, refreshWorkspace } = useWorkspace();
  const [modalOpen, setModalOpen] = useState(false);
  const [jobMap, setJobMap] = useState({});
  const [stalenessAlerts, setStalenessAlerts] = useState([]);
  const [error, setError] = useState("");
  const [recentQuestions] = useState([]);

  useEffect(() => {
    if (!workspace?.id) return undefined;

    const indexingEntries = Object.entries(jobMap).filter(([, job]) =>
      ["queued", "running", "indexing"].includes(job.status),
    );

    if (!indexingEntries.length) return undefined;

    const interval = window.setInterval(async () => {
      for (const [sourceId, job] of indexingEntries) {
        try {
          const nextJob = await getJobStatus(workspace.id, job.id);
          setJobMap((current) => ({ ...current, [sourceId]: nextJob }));

          if (["completed", "failed"].includes(nextJob.status)) {
            await refreshWorkspace();
          }
        } catch (err) {
          setError(err.message);
        }
      }
    }, 3000);

    return () => window.clearInterval(interval);
  }, [jobMap, refreshWorkspace, workspace?.id]);

  const [stalenessSummary, setStalenessSummary] = useState(null);

  useEffect(() => {
    if (!workspace?.id) return;

    let mounted = true;
    
    const fetchStaleness = async () => {
      try {
        const [summaryData, alertsData] = await Promise.all([
          getStalenessSummary(workspace.id),
          getStalenessAlerts(workspace.id, { resolved: false, limit: 2 })
        ]);
        if (!mounted) return;
        setStalenessSummary(summaryData);
        setStalenessAlerts(alertsData);
      } catch (err) {
        if (mounted) setError(err.message);
      }
    };

    fetchStaleness();

    return () => {
      mounted = false;
    };
  }, [workspace?.id]);

  const stats = useMemo(() => {
    const sources = workspace?.sources || [];
    const files = sources.reduce((sum, source) => sum + (source.file_count || 0), 0);
    return {
      sourcesConnected: sources.length,
      filesIndexed: files,
      alerts: stalenessSummary?.total_alerts || 0,
      healthScore: stalenessSummary?.health_score ?? (workspace?.health_score || 100),
    };
  }, [stalenessSummary, workspace]);

  const handleConnectSuccess = async ({ type, job }) => {
    await refreshWorkspace();
    if (job?.source_id) {
      setJobMap((current) => ({
        ...current,
        [job.source_id]: { ...job, id: job.id || job._id },
      }));
    }
  };

  const handleReindex = async (source) => {
    try {
      const job = await reindexSource(workspace.id, source.source_id);
      await refreshWorkspace();
      if (job?.source_id) {
        setJobMap((current) => ({
          ...current,
          [job.source_id]: { ...job, id: job.id || job._id },
        }));
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <AppShell>
      {/* Top border glow */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: '256px',
        right: 0,
        height: '1px',
        background: 'linear-gradient(90deg, transparent 0%, var(--accent-glow) 40%, var(--accent-muted) 70%, transparent 100%)',
        zIndex: 100,
        pointerEvents: 'none'
      }} />
      
      <div className="space-y-8">
        {/* Breadcrumb and Header */}
        <div>
          <p style={{
            fontSize: '12px',
            color: 'var(--text-tertiary)',
            marginBottom: '8px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            {workspace?.name || 'Workspace'} › Dashboard
          </p>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '700',
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
          }}>
            Workspace Dashboard
          </h1>
        </div>

        {error ? (
          <div className="rounded-lg border border-[var(--status-high)]/30 bg-[var(--status-high)]/10 px-4 py-3 text-sm text-[var(--status-high)]">
            {error}
          </div>
        ) : null}

        <section className="grid gap-5 xl:grid-cols-[1fr_1fr_1fr_320px]">
          <StatCard title="Sources Connected" value={stats.sourcesConnected} icon={Database} />
          <StatCard title="Files Indexed" value={stats.filesIndexed} icon={FileCode} />
          <StatCard
            title="Staleness Alerts"
            value={stats.alerts}
            icon={AlertTriangle}
            valueColor={stats.alerts > 0 ? "var(--status-high)" : "var(--text-primary)"}
            isAlert={true}
          />
          <HealthScoreCard score={stats.healthScore} />
        </section>

        {stalenessAlerts.length > 0 && (
          <section style={{
            borderRadius: '12px',
            background: 'var(--bg-surface)',
            padding: '24px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4), 0 0 0 1px var(--bg-hover)'
          }}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  color: 'var(--text-primary)',
                }}>
                  Staleness Preview
                </h3>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: 'var(--status-high-rgb, rgba(239, 68, 68, 0.15))',
                  border: '1px solid var(--status-high)',
                  fontSize: '11px',
                  fontWeight: '700',
                  color: 'var(--status-high)'
                }}>
                  {stalenessAlerts.length} Active
                </span>
              </div>
              <button
                onClick={() => navigate("/staleness")}
                style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: 'var(--accent-primary)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => e.target.style.color = 'var(--accent-primary-hover)'}
                onMouseLeave={e => e.target.style.color = 'var(--accent-primary)'}
              >
                View All Alerts →
              </button>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {stalenessAlerts.map((alert) => {
                const colors = alert.severity === 'high' ? 'var(--status-high)' : alert.severity === 'medium' ? 'var(--status-medium)' : 'var(--accent-primary)';
                
                return (
                  <div
                    key={alert.id}
                    style={{
                      borderRadius: '8px',
                      background: 'var(--bg-base)',
                      border: '1px solid var(--bg-hover)',
                      padding: '16px',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '3px',
                        background: `${colors}15`,
                        border: `1px solid ${colors}40`,
                        fontSize: '10px',
                        fontWeight: '700',
                        color: colors,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        flexShrink: 0
                      }}>
                        {alert.severity}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          color: 'var(--text-primary)',
                          marginBottom: '4px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {alert.description}
                        </p>
                        <p style={{
                          fontSize: '11px',
                          color: 'var(--text-tertiary)',
                          fontFamily: 'monospace',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {alert.alert_type === "readme_stale" ? "README" : alert.file_path}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">Connected Sources</h2>
              <p className="mt-2 text-sm leading-7 text-[var(--text-tertiary)]">
                Monitor indexing status and keep your knowledge graph up to date.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="oi-button oi-button-primary"
            >
              <Plus className="h-4 w-4" />
              Connect New Source
            </button>
          </div>

          {workspace?.sources?.length ? (
            <div className="space-y-4">
              {workspace.sources.map((source) => (
                <SourceCard
                  key={source.source_id}
                  source={source}
                  job={jobMap[source.source_id]}
                  onReindex={handleReindex}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Database}
              title="No sources connected yet"
              description="Connect your first GitHub repository or documentation source to start building onboarding answers with citations."
              actionLabel="Connect First Source"
              onAction={() => setModalOpen(true)}
            />
          )}
        </section>

        <section className="rounded-xl border border-[var(--bg-hover)] bg-[var(--bg-surface)] p-6 shadow-2xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">Recent Questions</h2>
              <p className="mt-2 text-sm leading-7 text-[var(--text-tertiary)]">
                The latest developer questions asked against this workspace.
              </p>
            </div>
          </div>

          {recentQuestions.length ? (
            <div className="mt-5 divide-y divide-[var(--bg-hover)]">
              {recentQuestions.slice(0, 5).map((question) => (
                <div
                  key={question.id}
                  className="flex items-center justify-between gap-4 py-4"
                >
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">{question.question_text}</p>
                    <p className="mt-1 text-sm text-[var(--text-tertiary)]">{question.asked_by_name}</p>
                  </div>
                  <p className="shrink-0 text-sm text-[var(--text-tertiary)]">
                    {formatRelativeTime(question.created_at)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState
                icon={ExternalLink}
                title="No questions yet"
                description="Once your team starts asking questions, the most recent ones will appear here for quick review."
                actionLabel="Ask a Question"
                onAction={() => navigate("/ask")}
              />
            </div>
          )}
        </section>
      </div>

      <ConnectSourceModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        workspaceId={workspace?.id}
        onConnected={handleConnectSuccess}
      />
    </AppShell>
  );
}
