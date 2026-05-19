import { useEffect, useState } from "react";
import { Github, Globe, Loader2 } from "lucide-react";
import Modal from "../common/Modal";
import {
  connectGithubRepo,
  connectUrl,
  getUserProfile,
} from "../../api/backend";

export default function ConnectSourceModal({
  open,
  onClose,
  workspaceId,
  onConnected,
}) {
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
                  ? "GitHub PAT saved in your Profile. It will be used automatically for private repositories and higher rate limits."
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
