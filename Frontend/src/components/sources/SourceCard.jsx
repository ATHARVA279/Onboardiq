import { AlertTriangle, Loader2, RefreshCcw } from "lucide-react";
import { formatRelativeTime } from "../../utils/formatters";

function StatusBadge({ status }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center rounded bg-[var(--accent-muted)] border border-[rgba(200,169,107,0.2)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent-primary)]">
        Completed
      </span>
    );
  }

  if (status === "failed") {
    return (
      <span className="inline-flex items-center rounded border border-[var(--status-high)]/20 bg-[var(--status-high)]/10 px-2 py-0.5 text-[11px] font-medium text-[var(--status-high)]">
        Failed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded border border-[rgba(200,169,107,0.2)] bg-[var(--accent-muted)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent-primary)]">
      <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
      Indexing
    </span>
  );
}

export default function SourceCard({
  source,
  job,
  onReindex,
  onDelete,
  detailed = false,
  loading = false,
}) {
  const progressPercent =
    job?.progress_total > 0
      ? Math.min(
          100,
          Math.round((job.progress_current / job.progress_total) * 100),
        )
      : 0;

  if (loading) {
    return (
      <div
        style={{
          borderRadius: "8px",
          background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
          padding: "20px",
          border: "1px solid rgba(255,255,255,0.04)",
          boxShadow: "0 1px 0 rgba(255,255,255,0.015) inset, 0 8px 16px rgba(0,0,0,0.25)",
        }}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="oi-skeleton h-4 w-48 rounded" />
              <div className="oi-skeleton h-4.5 w-16 rounded" />
            </div>
            <div className="oi-skeleton h-3.5 w-64 rounded" />
            <div className="mt-4 flex flex-wrap gap-4">
              <div className="oi-skeleton h-3 w-12 rounded" />
              <div className="oi-skeleton h-3 w-12 rounded" />
              <div className="oi-skeleton h-3 w-28 rounded" />
            </div>
          </div>
          <div className="flex shrink-0 gap-2.5">
            <div className="oi-skeleton h-9 w-20 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        borderRadius: "8px",
        background: "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015))",
        padding: "20px",
        border: "1px solid rgba(255,255,255,0.05)",
        boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset, 0 12px 24px rgba(0,0,0,0.3)",
        transition: "all 0.2s ease",
      }}
      className="hover:border-[rgba(255,255,255,0.08)]"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="truncate text-base font-semibold tracking-tight text-[var(--text-primary)]">
              {source.display_name || source.url}
            </h3>
            <StatusBadge status={source.indexing_status} />
          </div>
          <p className="mt-1 break-all text-xs text-[var(--text-tertiary)] font-mono">
            {source.url}
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-[var(--text-secondary)]">
            <span>
              <strong className="text-[var(--text-primary)] font-medium">
                {source.file_count || 0}
              </strong>{" "}
              files
            </span>
            <span>
              <strong className="text-[var(--text-primary)] font-medium">
                {source.chunk_count || 0}
              </strong>{" "}
              chunks
            </span>
            <span className="text-[var(--text-tertiary)]">
              Last indexed {formatRelativeTime(source.last_indexed_at)}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => onReindex?.(source)}
            className="inline-flex min-h-[36px] items-center gap-2 rounded-md border border-[var(--border-default)] bg-transparent px-3 text-xs font-medium text-[var(--text-primary)] transition-all duration-200 hover:bg-[var(--bg-hover)] hover:border-[var(--text-secondary)]"
          >
            <RefreshCcw className="h-3.5 w-3.5 opacity-80" strokeWidth={1.5} />
            Re-index
          </button>
          {detailed && onDelete ? (
            <button
              type="button"
              onClick={() => onDelete(source)}
              className="inline-flex min-h-[36px] items-center gap-2 rounded-md border border-[var(--status-high)]/20 px-3 text-xs font-medium text-[var(--status-high)] transition-all duration-200 hover:bg-[var(--status-high)]/10"
            >
              <AlertTriangle className="h-3.5 w-3.5 opacity-80" strokeWidth={1.5} />
              Delete
            </button>
          ) : null}
        </div>
      </div>

      {source.indexing_status === "indexing" && job ? (
        <div className="mt-4">
          <div className="h-1.5 overflow-hidden rounded-full bg-black/40">
            <div
              className="h-full rounded-full bg-[var(--accent-primary)] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-[var(--text-tertiary)]">
            <span>{job.progress_message || "Indexing in progress"}</span>
            <span>
              {job.progress_current || 0}/{job.progress_total || 0}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
