import { useState, useMemo } from "react";
import { Database, FileSearch, Globe, Search, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import EmptyState from "../components/common/EmptyState";
import SourceCard from "../components/sources/SourceCard";
import Modal from "../components/common/Modal";
import { useWorkspace } from "../context/WorkspaceContext";
import { deleteSource, getSourcePages, reindexSource } from "../api/backend";

// ── Pages modal for URL sources ───────────────────────────────────────────────

function SourcePagesModal({ open, source, workspaceId, onClose }) {
  const [pages, setPages] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load pages when modal opens
  useState(() => {
    if (!open || !source || !workspaceId) return;
    setLoading(true);
    setError("");
    getSourcePages(workspaceId, source.source_id)
      .then((data) => setPages(data.pages || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  });

  // Reset when closed
  const handleClose = () => {
    setPages(null);
    setError("");
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-semibold text-[var(--text-primary)]">
              Scraped Pages
            </h3>
            <p className="mt-1 text-sm text-[var(--text-tertiary)]">
              {source?.display_name || source?.url}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6">
          {loading && (
            <p className="text-sm text-[var(--text-tertiary)]">Loading pages…</p>
          )}
          {error && (
            <div className="rounded-lg border border-[var(--status-high)]/30 bg-[var(--status-high)]/10 px-4 py-3 text-sm text-[var(--status-high)]">
              {error}
            </div>
          )}
          {pages && pages.length === 0 && (
            <p className="text-sm text-[var(--text-tertiary)]">No pages indexed yet.</p>
          )}
          {pages && pages.length > 0 && (
            <div className="max-h-96 overflow-y-auto space-y-2">
              {pages.map((page) => (
                <div
                  key={page.url}
                  className="flex items-center justify-between gap-4 rounded-xl border border-[var(--bg-hover)] bg-[var(--bg-elevated)] px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                      {page.page_title || page.url}
                    </p>
                    <p className="truncate text-xs text-[var(--text-tertiary)]">{page.url}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[var(--accent-muted)] px-2 py-0.5 text-xs font-medium text-[var(--accent-primary)]">
                    {page.chunk_count} chunks
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ── Main Sources page ─────────────────────────────────────────────────────────

export default function Sources() {
  const navigate = useNavigate();
  const { workspace, refreshWorkspace } = useWorkspace();
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [pagesModal, setPagesModal] = useState({ open: false, source: null });

  const filteredSources = useMemo(() => {
    const sources = workspace?.sources || [];
    if (!query.trim()) return sources;
    const search = query.toLowerCase();
    return sources.filter(
      (source) =>
        source.display_name?.toLowerCase().includes(search) ||
        source.url?.toLowerCase().includes(search),
    );
  }, [query, workspace?.sources]);

  const handleDelete = async (source) => {
    if (!window.confirm(`Delete source "${source.display_name || source.url}"? All indexed chunks will be removed.`)) {
      return;
    }
    try {
      await deleteSource(workspace.id, source.source_id);
      await refreshWorkspace();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReindex = async (source) => {
    try {
      await reindexSource(workspace.id, source.source_id);
      await refreshWorkspace();
      // Optionally redirect to dashboard to see progress, or just show a success message
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleViewPages = (source) => {
    setPagesModal({ open: true, source });
  };

  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
            Sources
          </h1>
          <p className="mt-2 text-sm leading-7 text-[var(--text-tertiary)]">
            Review connected repositories and documentation sources, then inspect the indexed footprint for each one.
          </p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-[var(--status-high)]/30 bg-[var(--status-high)]/10 px-4 py-3 text-sm text-[var(--status-high)]">
            {error}
          </div>
        ) : null}

        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search sources by name or URL"
            className="oi-input h-12 w-full pl-11"
          />
        </div>

        {filteredSources.length ? (
          <div className="space-y-5">
            {filteredSources.map((source) => (
              <div key={source.source_id} className="space-y-4">
                <SourceCard
                  source={source}
                  detailed
                  onDelete={handleDelete}
                  onReindex={handleReindex}
                />

                {/* URL source: show pages panel */}
                {source.source_type === "url" && (
                  <div className="rounded-3xl border border-[var(--bg-hover)] bg-[var(--bg-surface)] p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Globe className="h-5 w-5 text-[var(--accent-primary)]" />
                        <div>
                          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                            Scraped Pages
                          </h2>
                          <p className="text-sm text-[var(--text-tertiary)]">
                            {source.file_count || 0} pages · {source.chunk_count || 0} chunks
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleViewPages(source)}
                        className="oi-button oi-button-secondary flex items-center gap-2 text-sm"
                      >
                        <FileSearch className="h-4 w-4" />
                        View Pages
                      </button>
                    </div>
                  </div>
                )}

                {/* GitHub source: existing placeholder */}
                {source.source_type !== "url" && (
                  <div className="rounded-3xl border border-[var(--bg-hover)] bg-[var(--bg-surface)] p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                      <FileSearch className="h-5 w-5 text-[var(--accent-primary)]" />
                      <div>
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Indexed Files</h2>
                        <p className="text-sm text-[var(--text-tertiary)]">
                          {source.file_count || 0} files · {source.chunk_count || 0} chunks
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Database}
            title="No sources found"
            description="Try a different search, or connect a new repository or documentation source to expand your workspace."
            actionLabel="Go to Dashboard"
            onAction={() => navigate("/dashboard")}
          />
        )}
      </div>

      <SourcePagesModal
        open={pagesModal.open}
        source={pagesModal.source}
        workspaceId={workspace?.id}
        onClose={() => setPagesModal({ open: false, source: null })}
      />
    </AppShell>
  );
}
