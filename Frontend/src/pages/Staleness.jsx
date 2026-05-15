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
          <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-primary)]" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Summary Bar */}
        <div className="grid gap-6 md:grid-cols-4">
          <div className="rounded-2xl border border-[var(--bg-hover)] bg-[var(--bg-surface)] p-6 shadow-sm">
            <p className="text-sm font-medium text-[var(--text-tertiary)]">Health Score</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className="text-4xl font-bold"
                style={{ color: scoreColor(summary?.health_score || 100) }}
              >
                {summary?.health_score || 100}
              </span>
              <span className="text-sm text-[var(--text-tertiary)]">/ 100</span>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--bg-hover)] bg-[var(--bg-surface)] p-6 shadow-sm md:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--text-tertiary)]">Active Issues</p>
                <div className="mt-2 flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-[var(--status-high)] shadow-[0_0_8px_var(--status-high)]" />
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {summary?.high_severity || 0} High
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-[var(--status-medium)] shadow-[0_0_8px_var(--status-medium)]" />
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {summary?.medium_severity || 0} Medium
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-[var(--accent-primary)] shadow-[0_0_8px_var(--accent-primary)]" />
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {summary?.low_severity || 0} Low
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="mb-1 flex items-center justify-end gap-1.5">
                  <span className="inline-flex items-center rounded-full bg-[var(--bg-hover)] px-2.5 py-0.5 text-xs font-medium text-[var(--accent-primary)]">
                    {summary?.mode === "readme" ? "README Mode" : "Documentation Mode"}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-tertiary)]">
                  Last checked {formatRelativeTime(summary?.last_checked_at)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center rounded-2xl border border-[var(--bg-hover)] bg-[var(--bg-surface)] p-6 shadow-sm">
            <button
              onClick={handleCheckNow}
              disabled={checking}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 py-3 font-semibold text-[var(--bg-base)] transition hover:bg-[var(--accent-primary-hover)] disabled:opacity-50"
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
          <div className="rounded-xl border border-[var(--status-high)]/20 bg-[var(--status-high)]/10 p-4 text-sm text-[var(--status-high)]">
            {error}
          </div>
        )}

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--bg-hover)] pb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[var(--text-tertiary)]" />
            <div className="flex gap-1">
              {["all", "high", "medium", "low"].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    severityFilter === sev
                      ? "bg-[var(--accent-primary)] text-[var(--bg-base)]"
                      : "text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]"
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
                className="group relative overflow-hidden rounded-2xl border border-[var(--bg-hover)] bg-[var(--bg-surface)] p-6 shadow-sm transition hover:border-[var(--accent-primary)]/20"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                          alert.severity === "high"
                            ? "bg-[var(--status-high)]/10 text-[var(--status-high)]"
                            : alert.severity === "medium"
                            ? "bg-[var(--status-medium)]/10 text-[var(--status-medium)]"
                            : "bg-[var(--accent-muted)] text-[var(--accent-primary)]"
                        }`}
                      >
                        {alert.severity}
                      </span>
                      <span className="rounded-full bg-[var(--bg-hover)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-tertiary)]">
                        {alert.alert_type === "readme_stale" ? "README" : "Documentation"}
                      </span>
                      {alert.file_path && (
                        <code className="rounded bg-[var(--bg-hover)] px-1.5 py-0.5 text-xs text-[var(--accent-primary)]">
                          {alert.file_path}
                        </code>
                      )}
                    </div>

                    <h3 className="text-lg font-medium text-[var(--text-primary)]">
                      {alert.description}
                    </h3>

                    {alert.readme_excerpt && (
                      <div className="rounded-lg bg-[var(--bg-base)] p-3 border border-[var(--bg-hover)]">
                        <p className="font-mono text-sm italic text-[var(--text-tertiary)]">
                          "{alert.readme_excerpt}"
                        </p>
                      </div>
                    )}

                    <div className="flex items-start gap-2 text-sm text-[var(--accent-primary)]">
                      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
                      <p>{alert.suggestion}</p>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-[var(--text-tertiary)]">
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
                      className="flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-[var(--bg-base)] transition hover:bg-[var(--accent-primary-hover)]"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Resolve
                    </button>
                    <button
                      onClick={() => handleDismiss(alert.id)}
                      className="flex items-center justify-center gap-2 rounded-xl bg-[var(--bg-hover)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--status-high)]/30 border border-transparent"
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
              className="flex w-full items-center justify-between rounded-xl border border-[var(--bg-hover)] bg-[var(--bg-surface)] p-4 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-hover)]"
            >
              <span>Resolved Alerts ({resolvedAlerts.length})</span>
              {showResolvedList ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showResolvedList && (
              <div className="space-y-4 opacity-70">
                {resolvedAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="rounded-2xl border border-[var(--bg-hover)] bg-[var(--bg-surface)] p-6 shadow-sm"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-[var(--status-success)]" />
                        <h4 className="text-sm font-medium line-through decoration-[var(--text-tertiary)] text-[var(--text-secondary)]">
                          {alert.description}
                        </h4>
                      </div>
                      <p className="text-xs text-[var(--text-tertiary)]">
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
