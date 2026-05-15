import { AlertTriangle, Loader2, RefreshCcw } from "lucide-react";
import { formatRelativeTime } from "../../utils/formatters";

function StatusBadge({ status }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center rounded-md border border-[var(--status-success)]/20 bg-[var(--status-success)]/10 px-3 py-1 text-xs font-medium text-[var(--status-success)]">
        Completed
      </span>
    );
  }

  if (status === "failed") {
    return (
      <span className="inline-flex items-center rounded-md border border-[var(--status-high)]/20 bg-[var(--status-high)]/10 px-3 py-1 text-xs font-medium text-[var(--status-high)]">
        Failed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-md border border-[var(--accent-muted)] bg-[var(--accent-muted)] px-3 py-1 text-xs font-medium text-[var(--accent-primary)]">
      <Loader2 className="h-3 w-3 animate-spin" />
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
}) {
  const progressPercent =
    job?.progress_total > 0
      ? Math.min(100, Math.round((job.progress_current / job.progress_total) * 100))
      : 0;

  return (
    <div className="rounded-xl border border-[var(--bg-hover)] bg-[var(--bg-surface)] p-5 shadow-lg">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="truncate text-lg font-semibold text-[var(--text-primary)]">
              {source.display_name || source.url}
            </h3>
            <StatusBadge status={source.indexing_status} />
          </div>
          <p className="mt-2 break-all text-sm text-[var(--text-tertiary)]">{source.url}</p>
          <div className="mt-4 flex flex-wrap gap-5 text-sm text-[var(--text-tertiary)]">
            <span>
              <strong className="text-[var(--text-primary)]">{source.file_count || 0}</strong> files
            </span>
            <span>
              <strong className="text-[var(--text-primary)]">{source.chunk_count || 0}</strong> chunks
            </span>
            <span>Last indexed {formatRelativeTime(source.last_indexed_at)}</span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onReindex?.(source)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-[var(--bg-hover)] bg-transparent px-4 text-sm font-medium text-[var(--text-primary)] transition-all duration-200 hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
          >
            <RefreshCcw className="h-4 w-4" />
            Re-index
          </button>
          {detailed && onDelete ? (
            <button
              type="button"
              onClick={() => onDelete(source)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-[var(--status-high)]/20 px-4 text-sm font-medium text-[var(--status-high)] transition-all duration-200 hover:bg-[var(--status-high)]/10"
            >
              <AlertTriangle className="h-4 w-4" />
              Delete
            </button>
          ) : null}
        </div>
      </div>

      {source.indexing_status === "indexing" && job ? (
        <div className="mt-5">
          <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-hover)]">
            <div
              className="h-full rounded-full bg-[var(--accent-primary)] transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-tertiary)]">
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
