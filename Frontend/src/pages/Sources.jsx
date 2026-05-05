import { useMemo, useState } from "react";
import { Database, FileSearch, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import EmptyState from "../components/common/EmptyState";
import SourceCard from "../components/sources/SourceCard";
import { useWorkspace } from "../context/WorkspaceContext";

export default function Sources() {
  const navigate = useNavigate();
  const { workspace } = useWorkspace();
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

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

  const handleDelete = (source) => {
    setError(`Delete source is not wired yet for ${source.display_name || source.url}.`);
  };

  const handleReindex = (source) => {
    setError(`Re-index endpoint is not wired yet for ${source.display_name || source.url}.`);
  };

  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#1E293B]">
            Sources
          </h1>
          <p className="mt-2 text-sm leading-7 text-[#64748B]">
            Review connected repositories and documentation sources, then inspect the indexed footprint for each one.
          </p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search sources by name or URL"
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 outline-none transition focus:border-[#2E75B6] focus:ring-4 focus:ring-[#2E75B6]/10"
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
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <FileSearch className="h-5 w-5 text-[#2E75B6]" />
                    <div>
                      <h2 className="text-lg font-semibold text-[#1E293B]">Indexed Files</h2>
                      <p className="text-sm leading-7 text-[#64748B]">
                        Searchable file inventory will appear here as soon as the file list API is exposed.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-[#64748B]">
                    This source currently reports {source.file_count || 0} indexed files and{" "}
                    {source.chunk_count || 0} chunks. Detailed file listings are not yet returned by the backend.
                  </div>
                </div>
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
    </AppShell>
  );
}
