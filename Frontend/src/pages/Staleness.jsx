import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import EmptyState from "../components/common/EmptyState";
import { getStalenessAlerts, resolveStaleChunk } from "../api/backend";
import { useWorkspace } from "../context/WorkspaceContext";
import { formatRelativeTime } from "../utils/formatters";

function inferSeverity(item) {
  const reason = (item?.stale_reason || "").toLowerCase();
  if (reason.includes("critical") || reason.includes("security")) return "high";
  if (reason.includes("warning") || reason.includes("drift")) return "medium";
  return "low";
}

export default function Staleness() {
  const navigate = useNavigate();
  const { workspace } = useWorkspace();
  const [alerts, setAlerts] = useState([]);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [error, setError] = useState("");
  const [resolvingId, setResolvingId] = useState("");

  useEffect(() => {
    if (!workspace?.id) return;

    let mounted = true;
    getStalenessAlerts(workspace.id)
      .then((data) => {
        if (!mounted) return;
        setAlerts(Array.isArray(data) ? data : data?.items || []);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message);
      });

    return () => {
      mounted = false;
    };
  }, [workspace?.id]);

  const sourceOptions = useMemo(() => {
    const grouped = new Set(alerts.map((item) => item.source_name || item.file_path || "Unknown"));
    return ["all", ...grouped];
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((item) => {
      const severity = inferSeverity(item);
      const sourceName = item.source_name || item.file_path || "Unknown";
      if (sourceFilter !== "all" && sourceFilter !== sourceName) return false;
      if (severityFilter !== "all" && severityFilter !== severity) return false;
      return true;
    });
  }, [alerts, severityFilter, sourceFilter]);

  const groupedAlerts = useMemo(() => {
    return filteredAlerts.reduce((accumulator, item) => {
      const key = item.source_name || item.file_path || "Unknown Source";
      accumulator[key] = accumulator[key] || [];
      accumulator[key].push(item);
      return accumulator;
    }, {});
  }, [filteredAlerts]);

  const handleResolve = async (chunkId) => {
    setResolvingId(chunkId);
    setError("");
    try {
      await resolveStaleChunk(chunkId);
      setAlerts((current) => current.filter((item) => item._id !== chunkId && item.id !== chunkId));
    } catch (err) {
      setError(err.message);
    } finally {
      setResolvingId("");
    }
  };

  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#1E293B]">
            Staleness Alerts
          </h1>
          <p className="mt-2 text-sm leading-7 text-[#64748B]">
            Review chunks that appear out of sync with the latest code and documentation state.
          </p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center">
          <div className="flex items-center gap-2 text-sm font-medium text-[#1E293B]">
            <Filter className="h-4 w-4 text-[#2E75B6]" />
            Filters
          </div>
          <select
            value={sourceFilter}
            onChange={(event) => setSourceFilter(event.target.value)}
            className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-[#2E75B6] focus:ring-4 focus:ring-[#2E75B6]/10"
          >
            {sourceOptions.map((source) => (
              <option key={source} value={source}>
                {source === "all" ? "All sources" : source}
              </option>
            ))}
          </select>
          <select
            value={severityFilter}
            onChange={(event) => setSeverityFilter(event.target.value)}
            className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-[#2E75B6] focus:ring-4 focus:ring-[#2E75B6]/10"
          >
            <option value="all">All severities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {Object.keys(groupedAlerts).length ? (
          <div className="space-y-6">
            {Object.entries(groupedAlerts).map(([sourceName, items]) => (
              <section
                key={sourceName}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h2 className="text-xl font-semibold text-[#1E293B]">{sourceName}</h2>
                <div className="mt-5 space-y-4">
                  {items.map((item) => {
                    const severity = inferSeverity(item);
                    return (
                      <div
                        key={item._id || item.id || item.file_path}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-mono text-sm text-[#1A3A5C]">
                                {item.file_path || "Unknown file"}
                              </p>
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                  severity === "high"
                                    ? "bg-red-50 text-red-700"
                                    : severity === "medium"
                                      ? "bg-yellow-50 text-yellow-700"
                                      : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {severity}
                              </span>
                            </div>
                            <p className="mt-3 text-sm leading-7 text-[#1E293B]">
                              {item.stale_reason || "No stale reason provided yet."}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-4 text-xs text-[#64748B]">
                              <span>Commit: {item.stale_since_commit || "Unknown"}</span>
                              <span>
                                Detected {formatRelativeTime(item.stale_detected_at)}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={resolvingId === (item._id || item.id)}
                            onClick={() => handleResolve(item._id || item.id)}
                            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#2E75B6] px-4 text-sm font-medium text-white transition hover:bg-[#255f93] disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {resolvingId === (item._id || item.id) ? "Resolving..." : "Mark as Resolved"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={AlertTriangle}
            title="No staleness alerts"
            description="When documentation or code drift is detected, the affected chunks will appear here with commit context and a reason."
            actionLabel="Review Sources"
            onAction={() => navigate("/sources")}
          />
        )}
      </div>
    </AppShell>
  );
}
