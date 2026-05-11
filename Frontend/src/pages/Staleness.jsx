import { useEffect, useState, useCallback } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Filter,
  History,
  Lightbulb,
  Loader2,
  RefreshCcw,
  ShieldAlert,
} from "lucide-react";
import AppShell from "../components/layout/AppShell";
import EmptyState from "../components/common/EmptyState";
import {
  getStalenessAlerts,
  triggerStalenessCheck,
  resolveAlert,
  dismissAlert,
  getStalenessSummary,
  getJobStatus,
} from "../api/backend";
import { useWorkspace } from "../context/WorkspaceContext";
import { formatRelativeTime, scoreColor } from "../utils/formatters";

export default function Staleness() {
  const { workspace } = useWorkspace();
  const [alerts, setAlerts] = useState([]);
  const [resolvedAlerts, setResolvedAlerts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [showResolved, setShowResolved] = useState(false);
  const [showResolvedList, setShowResolvedList] = useState(false);

  const fetchData = useCallback(async () => {
    if (!workspace?.id) return;
    try {
      const [alertsData, summaryData, resolvedData] = await Promise.all([
        getStalenessAlerts(workspace.id, { resolved: false }),
        getStalenessSummary(workspace.id),
        getStalenessAlerts(workspace.id, { resolved: true }),
      ]);
      setAlerts(alertsData);
      setSummary(summaryData);
      setResolvedAlerts(resolvedData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [workspace?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const pollJob = async (jobId) => {
    const interval = setInterval(async () => {
      try {
        const job = await getJobStatus(workspace.id, jobId);
        if (job.status === "completed") {
          clearInterval(interval);
          setChecking(false);
          fetchData();
        } else if (job.status === "failed") {
          clearInterval(interval);
          setChecking(false);
          setError("Staleness check failed: " + job.error_message);
        }
      } catch (err) {
        clearInterval(interval);
        setChecking(false);
        setError(err.message);
      }
    }, 3000);
  };

  const handleCheckNow = async () => {
    setChecking(true);
    setError("");
    try {
      const job = await triggerStalenessCheck(workspace.id);
      pollJob(job.id);
    } catch (err) {
      setError(err.message);
      setChecking(false);
    }
  };

  const handleResolve = async (alertId) => {
    try {
      await resolveAlert(workspace.id, alertId);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDismiss = async (alertId) => {
    if (!window.confirm("Are you sure you want to dismiss this alert?")) return;
    try {
      await dismissAlert(workspace.id, alertId);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (severityFilter !== "all" && alert.severity !== severityFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Summary Bar */}
        <div className="grid gap-6 md:grid-cols-4">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
            <p className="text-sm font-medium text-[var(--color-muted)]">Health Score</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className="text-4xl font-bold"
                style={{ color: scoreColor(summary?.health_score || 100) }}
              >
                {summary?.health_score || 100}
              </span>
              <span className="text-sm text-[var(--color-muted)]">/ 100</span>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm md:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--color-muted)]">Active Issues</p>
                <div className="mt-2 flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    <span className="text-sm font-medium text-[var(--color-text)]">
                      {summary?.high_severity || 0} High
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-yellow-500" />
                    <span className="text-sm font-medium text-[var(--color-text)]">
                      {summary?.medium_severity || 0} Medium
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <span className="text-sm font-medium text-[var(--color-text)]">
                      {summary?.low_severity || 0} Low
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="mb-1 flex items-center justify-end gap-1.5">
                  <span className="inline-flex items-center rounded-full bg-[var(--color-code-bg)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-primary)]">
                    {summary?.mode === "readme" ? "README Mode" : "Documentation Mode"}
                  </span>
                </div>
                <p className="text-xs text-[var(--color-muted)]">
                  Last checked {formatRelativeTime(summary?.last_checked_at)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
            <button
              onClick={handleCheckNow}
              disabled={checking}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {checking ? (
                <>
                  <RefreshCcw className="h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <ShieldAlert className="h-4 w-4" />
                  Check Now
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-border)] pb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[var(--color-muted)]" />
            <div className="flex gap-1">
              {["all", "high", "medium", "low"].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    severityFilter === sev
                      ? "bg-[var(--color-primary)] text-white"
                      : "text-[var(--color-muted)] hover:bg-[var(--color-code-bg)]"
                  }`}
                >
                  {sev.charAt(0).toUpperCase() + sev.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-4">
          {filteredAlerts.length > 0 ? (
            filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className="group relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                          alert.severity === "high"
                            ? "bg-red-100 text-red-700"
                            : alert.severity === "medium"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {alert.severity}
                      </span>
                      <span className="rounded-full bg-[var(--color-code-bg)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-muted)]">
                        {alert.alert_type === "readme_stale" ? "README" : "Documentation"}
                      </span>
                      {alert.file_path && (
                        <code className="rounded bg-[var(--color-code-bg)] px-1.5 py-0.5 text-xs text-[var(--color-primary)]">
                          {alert.file_path}
                        </code>
                      )}
                    </div>

                    <h3 className="text-lg font-medium text-[var(--color-text)]">
                      {alert.description}
                    </h3>

                    {alert.readme_excerpt && (
                      <div className="rounded-lg bg-[var(--color-code-bg)] p-3">
                        <p className="font-mono text-sm italic text-[var(--color-muted)]">
                          "{alert.readme_excerpt}"
                        </p>
                      </div>
                    )}

                    <div className="flex items-start gap-2 text-sm text-[var(--color-primary)]">
                      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
                      <p>{alert.suggestion}</p>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-[var(--color-muted)]">
                      <div className="flex items-center gap-1">
                        <History className="h-3 w-3" />
                        {formatRelativeTime(alert.created_at)}
                      </div>
                      {alert.commit_hash && (
                        <div className="flex items-center gap-1">
                          <code className="text-xs">{alert.commit_hash.slice(0, 7)}</code>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2 md:flex-col lg:flex-row">
                    <button
                      onClick={() => handleResolve(alert.id)}
                      className="flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition"
                      style={{
                        backgroundColor: '#e5195e'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#c91450'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#e5195e'}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Resolve
                    </button>
                    <button
                      onClick={() => handleDismiss(alert.id)}
                      className="flex items-center justify-center gap-2 rounded-xl bg-[var(--color-code-bg)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-border)]"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              icon={CheckCircle2}
              title="All good!"
              description={
                summary?.mode === "readme"
                  ? "Your README appears to be up to date with your codebase."
                  : "Your documentation appears to be in sync with your code."
              }
              actionLabel="Check Again"
              onAction={handleCheckNow}
            />
          )}
        </div>

        {/* Resolved Alerts Section */}
        {resolvedAlerts.length > 0 && (
          <div className="mt-12 space-y-4">
            <button
              onClick={() => setShowResolvedList(!showResolvedList)}
              className="flex w-full items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm font-medium text-[var(--color-text)] transition hover:bg-[var(--color-code-bg)]"
            >
              <span>Resolved Alerts ({resolvedAlerts.length})</span>
              {showResolvedList ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showResolvedList && (
              <div className="space-y-4 opacity-70">
                {resolvedAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" style={{ color: '#22c55e' }} />
                        <h4 className="text-sm font-medium line-through decoration-[var(--color-muted)]">
                          {alert.description}
                        </h4>
                      </div>
                      <p className="text-xs text-[var(--color-muted)]">
                        Resolved by {alert.resolved_by_uid || "System"} {formatRelativeTime(alert.resolved_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
