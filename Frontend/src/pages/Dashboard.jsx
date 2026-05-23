import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Database,
  ExternalLink,
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
  getUserProfile,
  getWorkspace,
  reindexSource,
  getStalenessSummary,
  getStalenessAlerts,
  getRecentQuestions,
} from "../api/backend";
import { useWorkspace } from "../context/WorkspaceContext";
import { formatRelativeTime, scoreColor } from "../utils/formatters";

function HealthScoreCard({ score, loading = false }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, score));
  const offset = circumference - (progress / 100) * circumference;

  if (loading) {
    return (
      <div
        style={{
          borderRadius: "8px",
          background: "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015))",
          padding: "14px 16px",
          border: "1px solid rgba(255,255,255,0.05)",
          boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset, 0 8px 16px rgba(0,0,0,0.3)",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="oi-skeleton h-2.5 w-20 rounded mb-2.5" />
            <div className="oi-skeleton h-8 w-16 rounded" />
          </div>
          <div className="oi-skeleton h-[52px] w-[52px] rounded-full shrink-0" />
        </div>
      </div>
    );
  }

  const gradientId =
    progress > 70
      ? "healthGradLow" // good (low staleness)
      : progress >= 40
        ? "healthGradMedium"
        : "healthGradHigh";

  const glowColor =
    progress > 70
      ? "rgba(200, 169, 107, 0.1)"
      : progress >= 40
        ? "rgba(245, 158, 11, 0.06)"
        : "rgba(239, 68, 68, 0.06)";

  return (
    <div
      style={{
        borderRadius: "8px",
        background: "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015))",
        padding: "14px 16px",
        border: "1px solid rgba(255,255,255,0.05)",
        boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset, 0 8px 16px rgba(0,0,0,0.3)",
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p
            style={{
              fontSize: "11px",
              fontWeight: "500",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--text-tertiary)",
              marginBottom: "4px",
            }}
          >
            Health Score
          </p>
          <p
            style={{
              fontSize: "42px",
              fontWeight: "650",
              letterSpacing: "-0.04em",
              color: "var(--text-primary)",
              margin: 0,
              lineHeight: "1.1",
            }}
          >
            {progress}%
          </p>
        </div>
        <div className="relative flex items-center justify-center">
          <svg className="h-[52px] w-[52px] -rotate-90" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="healthGradLow" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#C8A96B" />
                <stop offset="100%" stopColor="#F5E6CC" />
              </linearGradient>
              <linearGradient id="healthGradMedium" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#FCD34D" />
              </linearGradient>
              <linearGradient id="healthGradHigh" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#EF4444" />
                <stop offset="100%" stopColor="#FCA5A5" />
              </linearGradient>
            </defs>
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke="rgba(255, 255, 255, 0.03)"
              strokeWidth="2.2"
              fill="none"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke={`url(#${gradientId})`}
              strokeWidth="2.2"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{
                filter: `drop-shadow(0 0 2px ${glowColor})`,
                transition: "stroke-dashoffset 1000ms ease-out",
              }}
            />
          </svg>
          <span
            style={{
              position: "absolute",
              fontSize: "10px",
              fontWeight: "600",
              color: "var(--text-primary)",
              fontFamily: "var(--font-mono, monospace)",
            }}
          >
            {progress}
          </span>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  valueColor = "var(--text-primary)",
  isAlert = false,
  loading = false,
}) {
  if (loading) {
    return (
      <div
        style={{
          position: "relative",
          borderRadius: "8px",
          background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
          padding: "14px 16px",
          border: "1px solid rgba(255,255,255,0.04)",
          boxShadow: "0 1px 0 rgba(255,255,255,0.015) inset, 0 4px 12px rgba(0,0,0,0.25)",
        }}
      >
        <div className="flex items-start justify-between">
          <div className="w-full">
            <div className="oi-skeleton h-2.5 w-24 rounded mb-2.5" />
            <div className="oi-skeleton h-8 w-12 rounded" />
          </div>
          <Icon
            style={{
              width: "14px",
              height: "14px",
              opacity: 0.3,
              color: "var(--text-tertiary)",
              marginTop: "2px",
            }}
            strokeWidth={1.5}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        borderRadius: "8px",
        background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
        padding: "14px 16px",
        border: "1px solid rgba(255,255,255,0.04)",
        boxShadow: "0 1px 0 rgba(255,255,255,0.015) inset, 0 4px 12px rgba(0,0,0,0.25)",
        transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      className="hover:border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.02)] hover:translate-y-[-0.5px]"
    >
      <div className="flex items-start justify-between">
        <div>
          <p
            style={{
              fontSize: "11px",
              fontWeight: "500",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--text-tertiary)",
              marginBottom: "4px",
            }}
          >
            {title}
          </p>
          <p
            style={{
              fontSize: "42px",
              fontWeight: "650",
              letterSpacing: "-0.04em",
              color: valueColor,
              margin: 0,
              lineHeight: "1.1",
            }}
          >
            {value}
          </p>
        </div>
        <Icon
          style={{
            width: "14px",
            height: "14px",
            opacity: 0.5,
            color: "var(--text-tertiary)",
            marginTop: "2px",
          }}
          strokeWidth={1.5}
        />
      </div>
    </div>
  );
}

function ConnectSourceModal({ open, onClose, workspaceId, onConnected }) {
  const [tab, setTab] = useState("github");
  const [repoUrl, setRepoUrl] = useState("");
  const [docsUrl, setDocsUrl] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSavedGithubPat, setHasSavedGithubPat] = useState(null);

  useEffect(() => {
    if (!open) {
      setError("");
      setLoading(false);
      return;
    }

    let cancelled = false;
    getUserProfile()
      .then((profile) => {
        if (!cancelled) {
          setHasSavedGithubPat(Boolean(profile?.secrets?.github_pat));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHasSavedGithubPat(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, workspaceId]);

  const handleGithubSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const job = await connectGithubRepo(workspaceId, repoUrl.trim());
      await onConnected({ type: "github", job });
      onClose();
      setRepoUrl("");
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
      const job = await connectUrl(
        workspaceId,
        docsUrl.trim(),
        displayName.trim() || undefined,
      );
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
            <h3 className="text-2xl font-semibold text-[var(--text-primary)]">
              Connect New Source
            </h3>
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
              <span className="text-sm font-medium text-[var(--text-primary)]">
                Repository URL
              </span>
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
                Authentication
              </span>
              <div className="mt-2 rounded-lg border border-[var(--accent-muted)] bg-[var(--accent-muted)]/10 px-4 py-3 text-sm leading-7 text-[var(--accent-primary)]">
                {hasSavedGithubPat === true
                  ? "GitHub PAT saved in your Profile. It will be used automatically when connecting repositories."
                  : hasSavedGithubPat === false
                    ? "No GitHub PAT saved in your Profile yet. Save one in Profile to connect private repositories and avoid low GitHub rate limits."
                    : "Checking whether you have a saved GitHub PAT in your Profile..."}
              </div>
            </label>

            <div className="rounded-lg border border-[var(--accent-muted)] bg-[var(--accent-muted)]/10 px-4 py-3 text-sm leading-7 text-[var(--accent-primary)]">
              {hasSavedGithubPat === false
                ? "Without a saved PAT, GitHub falls back to anonymous access with much lower rate limits."
                : "If you remove the saved PAT later, GitHub will fall back to anonymous access with much lower rate limits."}
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
              <span className="text-sm font-medium text-[var(--text-primary)]">
                Documentation URL
              </span>
              <input
                type="url"
                value={docsUrl}
                onChange={(event) => setDocsUrl(event.target.value)}
                className="oi-input mt-2 w-full"
                placeholder="https://docs.yourproject.com"
                required
              />
              <p className="mt-1.5 text-xs text-[var(--text-tertiary)]">
                Onboardiq will automatically discover and index linked pages on
                the same domain up to 20 pages.
              </p>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-[var(--text-primary)]">
                Display Name
                <span className="ml-1 text-xs font-normal text-[var(--text-tertiary)]">
                  (optional)
                </span>
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
              ⚠️ Some sites may block automated scraping. If indexing fails, try
              a different documentation format.
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
  const { workspace, refreshWorkspace, loading: workspaceLoading } = useWorkspace();
  const [modalOpen, setModalOpen] = useState(false);
  const [jobMap, setJobMap] = useState({});
  const [stalenessAlerts, setStalenessAlerts] = useState([]);
  const [error, setError] = useState("");
  const [recentQuestions, setRecentQuestions] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

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
    setDataLoading(true);

    const fetchDashboardData = async () => {
      try {
        const [summaryData, alertsData, questionsData] = await Promise.all([
          getStalenessSummary(workspace.id),
          getStalenessAlerts(workspace.id, { resolved: false, limit: 2 }),
          getRecentQuestions(workspace.id),
        ]);
        if (!mounted) return;
        setStalenessSummary(summaryData);
        setStalenessAlerts(alertsData);
        setRecentQuestions(questionsData);
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setDataLoading(false);
      }
    };

    fetchDashboardData();

    return () => {
      mounted = false;
    };
  }, [workspace?.id]);

  const stats = useMemo(() => {
    const sources = workspace?.sources || [];
    const files = sources.reduce(
      (sum, source) => sum + (source.file_count || 0),
      0,
    );
    return {
      sourcesConnected: sources.length,
      filesIndexed: files,
      alerts: stalenessSummary?.total_alerts || 0,
      healthScore:
        stalenessSummary?.health_score ?? (workspace?.health_score || 100),
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

  const isLoading = workspaceLoading || (workspace?.id ? dataLoading : false);

  return (
    <AppShell>
      {/* Top border glow */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: "256px",
          right: 0,
          height: "1px",
          background:
            "linear-gradient(90deg, transparent 0%, var(--accent-glow) 40%, var(--accent-muted) 70%, transparent 100%)",
          zIndex: 100,
          pointerEvents: "none",
        }}
      />

      <div className="space-y-8">
        {/* Breadcrumb and Header */}
        <div>
          <p
            style={{
              fontSize: "11px",
              color: "var(--text-tertiary)",
              marginBottom: "6px",
              fontWeight: "500",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
            }}
          >
            {workspace?.name || "Workspace"} › Overview
          </p>
          <h1
            style={{
              fontSize: "42px",
              fontWeight: "620",
              letterSpacing: "-0.04em",
              color: "var(--text-primary)",
              lineHeight: "1.1",
            }}
          >
            Knowledge Overview
          </h1>
        </div>

        {error ? (
          <div className="rounded-md border border-[var(--status-high)]/30 bg-[var(--status-high)]/10 px-4 py-3 text-xs text-[var(--status-high)]">
            {error}
          </div>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Sources Connected"
            value={stats.sourcesConnected}
            icon={Database}
            loading={isLoading}
          />
          <StatCard
            title="Files Indexed"
            value={stats.filesIndexed}
            icon={FileCode}
            loading={isLoading}
          />
          <StatCard
            title="Staleness Alerts"
            value={stats.alerts}
            icon={AlertTriangle}
            valueColor={
              stats.alerts > 0 ? "var(--status-high)" : "var(--text-primary)"
            }
            isAlert={true}
            loading={isLoading}
          />
          <HealthScoreCard score={stats.healthScore} loading={isLoading} />
        </section>

        {(isLoading || stalenessAlerts.length > 0) && (
          <section
            style={{
              borderRadius: "8px",
              background: "linear-gradient(180deg, rgba(200, 169, 107, 0.03), rgba(255, 255, 255, 0.005))",
              padding: "20px",
              border: "1px solid rgba(200, 169, 107, 0.15)",
              boxShadow: "0 1px 0 rgba(200, 169, 107, 0.08) inset, 0 12px 32px rgba(0,0,0,0.4), 0 0 40px rgba(200, 169, 107, 0.03)",
            }}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h3
                  style={{
                    fontSize: "26px",
                    fontWeight: "620",
                    letterSpacing: "-0.03em",
                    color: "var(--text-primary)",
                  }}
                >
                  Staleness Preview
                </h3>
                {isLoading ? (
                  <div className="oi-skeleton h-4 w-12 rounded" />
                ) : (
                  <span
                    style={{
                      padding: "2px 6px",
                      borderRadius: "4px",
                      background: "rgba(239, 68, 68, 0.1)",
                      border: "1px solid rgba(239, 68, 68, 0.2)",
                      fontSize: "10px",
                      fontWeight: "600",
                      color: "var(--status-high)",
                    }}
                  >
                    {stalenessAlerts.length} Active
                  </span>
                )}
              </div>
              {!isLoading && (
                <button
                  onClick={() => navigate("/staleness")}
                  style={{
                    fontSize: "12px",
                    fontWeight: "500",
                    color: "var(--accent-primary)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) =>
                    (e.target.style.color = "var(--accent-primary-hover)")
                  }
                  onMouseLeave={(e) =>
                    (e.target.style.color = "var(--accent-primary)")
                  }
                >
                  View All Alerts →
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {[...Array(2)].map((_, i) => (
                  <div
                    key={i}
                    style={{
                      borderRadius: "6px",
                      background: "rgba(255, 255, 255, 0.015)",
                      border: "1px solid rgba(255, 255, 255, 0.03)",
                      borderLeft: "3px solid rgba(255, 255, 255, 0.05)",
                      padding: "12px 14px",
                    }}
                  >
                    <div className="flex flex-col gap-2" style={{ minWidth: 0 }}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="oi-skeleton h-3 w-40 rounded" />
                        <div className="oi-skeleton h-2.5 w-8 rounded shrink-0" />
                      </div>
                      <div className="oi-skeleton h-2.5 w-24 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {stalenessAlerts.map((alert) => {
                  const colors =
                    alert.severity === "high"
                      ? "var(--status-high)"
                      : alert.severity === "medium"
                        ? "var(--status-medium)"
                        : "var(--accent-primary)";

                  return (
                    <div
                      key={alert.id}
                      style={{
                        borderRadius: "6px",
                        background: "rgba(255, 255, 255, 0.015)",
                        border: "1px solid rgba(255, 255, 255, 0.03)",
                        borderLeft: `3px solid ${colors}`,
                        padding: "12px 14px",
                        transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                      }}
                      className="hover:bg-[rgba(255,255,255,0.03)] hover:translate-y-[-0.5px]"
                    >
                      <div className="flex flex-col gap-1" style={{ minWidth: 0 }}>
                        <div className="flex items-center justify-between gap-3">
                          <p
                            style={{
                              fontSize: "13px",
                              fontWeight: "500",
                              color: "var(--text-primary)",
                              margin: 0,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {alert.description}
                          </p>
                          <span
                            style={{
                              fontSize: "9px",
                              fontWeight: "600",
                              color: colors,
                              textTransform: "uppercase",
                              letterSpacing: "0.08em",
                              flexShrink: 0,
                            }}
                          >
                            {alert.severity}
                          </span>
                        </div>
                        <p
                          style={{
                            fontSize: "10px",
                            color: "var(--text-tertiary)",
                            fontFamily: "var(--font-mono, monospace)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            margin: 0,
                          }}
                        >
                          {alert.alert_type === "readme_stale"
                            ? "README"
                            : alert.file_path}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2
                style={{
                  fontSize: "26px",
                  fontWeight: "620",
                  letterSpacing: "-0.03em",
                  color: "var(--text-primary)",
                }}
              >
                Connected Sources
              </h2>
              <p className="mt-1.5 text-xs text-[var(--text-tertiary)]">
                Monitor indexing status and keep your knowledge graph up to
                date.
              </p>
            </div>
            {!isLoading && (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="oi-button oi-button-primary"
                style={{ minHeight: "36px", padding: "0 14px", borderRadius: "6px", fontSize: "12px" }}
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                Connect New Source
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <SourceCard key={i} loading={true} />
              ))}
            </div>
          ) : workspace?.sources?.length ? (
            <div className="space-y-3">
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

        <section
          style={{
            borderRadius: "8px",
            background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.015))",
            padding: "20px",
            border: "1px solid rgba(255,255,255,0.04)",
            boxShadow: "0 1px 0 rgba(255,255,255,0.015) inset, 0 8px 24px rgba(0,0,0,0.25)",
          }}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2
                style={{
                  fontSize: "26px",
                  fontWeight: "620",
                  letterSpacing: "-0.03em",
                  color: "var(--text-primary)",
                }}
              >
                Recent Questions
              </h2>
              <p className="mt-1.5 text-xs text-[var(--text-tertiary)]">
                The latest developer questions asked against this workspace.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="mt-4 divide-y divide-[var(--border-default)]">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-4 py-3 px-3.5"
                >
                  <div className="space-y-2 w-full">
                    <div className="oi-skeleton h-3.5 w-3/4 rounded" />
                    <div className="oi-skeleton h-2.5 w-24 rounded" />
                  </div>
                  <div className="oi-skeleton h-3 w-16 rounded shrink-0" />
                </div>
              ))}
            </div>
          ) : recentQuestions.length ? (
            <div className="mt-4 divide-y divide-[var(--border-default)]">
              {recentQuestions.slice(0, 5).map((question) => (
                <div
                  key={question.id}
                  onClick={() =>
                    navigate(
                      question.session_id
                        ? `/ask?session_id=${question.session_id}&q=${encodeURIComponent(question.question_text)}`
                        : "/ask"
                    )
                  }
                  className="flex items-center justify-between gap-4 py-3 cursor-pointer hover:bg-[var(--bg-hover)]/30 px-3.5 rounded-lg transition-all duration-150"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {question.question_text}
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
                      {question.asked_by_name}
                    </p>
                  </div>
                  <p className="shrink-0 text-xs text-[var(--text-tertiary)]">
                    {formatRelativeTime(question.created_at)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4">
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
