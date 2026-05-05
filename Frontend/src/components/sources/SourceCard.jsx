import { AlertTriangle, Loader2, RefreshCcw } from "lucide-react";
import { formatRelativeTime } from "../../utils/formatters";

function StatusBadge({ status }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center rounded-md border border-[rgba(16,185,129,0.35)] bg-[rgba(16,185,129,0.12)] px-3 py-1 text-xs font-medium text-[var(--color-green)]">
        Completed
      </span>
    );
  }

  if (status === "failed") {
    return (
      <span className="inline-flex items-center rounded-md border border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.12)] px-3 py-1 text-xs font-medium text-[var(--color-red)]">
        Failed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-md border border-[rgba(59,130,246,0.3)] bg-[rgba(59,130,246,0.12)] px-3 py-1 text-xs font-medium text-[var(--color-primary)]">
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
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="truncate text-lg font-semibold text-[var(--color-text)]">
              {source.display_name || source.url}
            </h3>
            <StatusBadge status={source.indexing_status} />
          </div>
          <p className="mt-2 break-all text-sm text-[var(--color-muted)]">{source.url}</p>
          <div className="mt-4 flex flex-wrap gap-5 text-sm text-[var(--color-muted)]">
            <span>
              <strong className="text-[var(--color-text)]">{source.file_count || 0}</strong> files
            </span>
            <span>
              <strong className="text-[var(--color-text)]">{source.chunk_count || 0}</strong> chunks
            </span>
            <span>Last indexed {formatRelativeTime(source.last_indexed_at)}</span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onReindex?.(source)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-[var(--color-border)] bg-transparent px-4 text-sm font-medium text-[var(--color-text)] transition-all duration-200 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          >
            <RefreshCcw className="h-4 w-4" />
            Re-index
          </button>
          {detailed && onDelete ? (
            <button
              type="button"
              onClick={() => onDelete(source)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-[rgba(239,68,68,0.35)] px-4 text-sm font-medium text-[var(--color-red)] transition-all duration-200 hover:bg-[rgba(239,68,68,0.12)]"
            >
              <AlertTriangle className="h-4 w-4" />
              Delete
            </button>
          ) : null}
        </div>
      </div>

      {source.indexing_status === "indexing" && job ? (
        <div className="mt-5">
          <div className="h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
            <div
              className="h-full rounded-full bg-[var(--color-primary)] transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-muted)]">
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
