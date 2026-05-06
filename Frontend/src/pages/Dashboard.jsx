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
  getStalenessAlerts,
  getWorkspace,
  reindexSource,
} from "../api/backend";
import { useWorkspace } from "../context/WorkspaceContext";
import { formatRelativeTime, scoreColor } from "../utils/formatters";

function HealthScoreCard({ score }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, score));
  const offset = circumference - (progress / 100) * circumference;
  const color = scoreColor(progress);

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--color-muted)]">Documentation Health</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--color-text)]">{progress}%</p>
        </div>
        <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} stroke="var(--color-border)" strokeWidth="8" fill="none" />
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
          />
          <text
            x="50"
            y="55"
            textAnchor="middle"
            transform="rotate(90 50 50)"
            className="fill-[var(--color-text)] text-[18px] font-semibold"
          >
            {progress}
          </text>
        </svg>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, valueColor = "#F1F5F9" }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--color-muted)]">{title}</p>
          <p className="mt-3 text-4xl font-semibold" style={{ color: valueColor }}>
            {value}
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-code-bg)]">
          <Icon
            className="h-6 w-6"
            style={{ color: valueColor === "#F1F5F9" ? "var(--color-primary)" : valueColor }}
          />
        </div>
      </div>
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
    }
  }, [open]);

  const handleGithubSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const job = await connectGithubRepo(workspaceId, repoUrl.trim(), token.trim());
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
            <h3 className="text-2xl font-semibold text-[var(--color-text)]">Connect New Source</h3>
            <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
              Add a repository or documentation source to your workspace.
            </p>
          </div>
        </div>

        <div className="mt-6 flex rounded-lg border border-[var(--color-border)] bg-[var(--color-code-bg)] p-1">
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
                  ? "bg-[var(--color-surface)] text-[var(--color-text)]"
                  : "text-[var(--color-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "github" ? (
          <form onSubmit={handleGithubSubmit} className="mt-6 space-y-5">
            <label className="block">
              <span className="text-sm font-medium text-[var(--color-text)]">Repository URL</span>
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
              <span className="text-sm font-medium text-[var(--color-text)]">
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-2 text-xs text-[var(--color-muted)]">
                Optional for public repos. Required for private repos. Needs
                `repo:read` scope.
              </p>
            </label>

            <div className="rounded-lg border border-[rgba(59,130,246,0.3)] bg-[rgba(59,130,246,0.12)] px-4 py-3 text-sm leading-7 text-[var(--color-primary)]">
              Without a token, GitHub rate limits drop to 60 requests per hour, which
              can cause larger repositories to fail before indexing completes.
            </div>

            {error ? (
              <div className="rounded-lg border border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.12)] px-4 py-3 text-sm text-[var(--color-red)]">
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
              <span className="text-sm font-medium text-[var(--color-text)]">Documentation URL</span>
              <input
                type="url"
                value={docsUrl}
                onChange={(event) => setDocsUrl(event.target.value)}
                className="oi-input mt-2 w-full"
                placeholder="https://docs.yourproject.com"
                required
              />
              <p className="mt-1.5 text-xs text-[var(--color-muted)]">
                Onboardiq will automatically discover and index linked pages on the same domain up to 20 pages.
              </p>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-[var(--color-text)]">
                Display Name
                <span className="ml-1 text-xs font-normal text-[var(--color-muted)]">(optional)</span>
              </span>
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="oi-input mt-2 w-full"
                placeholder="e.g. API Documentation, User Guide"
              />
            </label>

            <div className="rounded-lg border border-[rgba(234,179,8,0.35)] bg-[rgba(234,179,8,0.08)] px-4 py-3 text-sm leading-6 text-yellow-400">
              ⚠️ Some sites may block automated scraping. If indexing fails, try a different documentation format.
            </div>

            {error ? (
              <div className="rounded-lg border border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.12)] px-4 py-3 text-sm text-[var(--color-red)]">
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

  useEffect(() => {
    if (!workspace?.id) return;

    let mounted = true;
    getStalenessAlerts(workspace.id)
      .then((data) => {
        if (!mounted) return;
        setStalenessAlerts(Array.isArray(data) ? data : data?.items || []);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message);
      });

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
      alerts: stalenessAlerts.length,
      healthScore: Math.round(workspace?.health_score || 0),
    };
  }, [stalenessAlerts.length, workspace]);

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
      <div className="space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-text)]">
              Workspace Dashboard
            </h1>
            <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
              Track source indexing, workspace health, and onboarding coverage in one place.
            </p>
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.12)] px-4 py-3 text-sm text-[var(--color-red)]">
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
            valueColor={stats.alerts > 0 ? "#EF4444" : "#F1F5F9"}
          />
          <HealthScoreCard score={stats.healthScore} />
        </section>

        <section className="space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-[var(--color-text)]">Connected Sources</h2>
              <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
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

        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-[var(--color-text)]">Recent Questions</h2>
              <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
                The latest developer questions asked against this workspace.
              </p>
            </div>
          </div>

          {recentQuestions.length ? (
            <div className="mt-5 divide-y divide-[var(--color-border)]">
              {recentQuestions.slice(0, 5).map((question) => (
                <div
                  key={question.id}
                  className="flex items-center justify-between gap-4 py-4"
                >
                  <div>
                    <p className="font-medium text-[var(--color-text)]">{question.question_text}</p>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">{question.asked_by_name}</p>
                  </div>
                  <p className="shrink-0 text-sm text-[var(--color-muted)]">
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
