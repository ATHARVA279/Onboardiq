import { useEffect, useState } from "react";
import { Check, Eye, EyeOff, KeyRound, Save, Trash2, UserCircle2 } from "lucide-react";
import AppShell from "../components/layout/AppShell";
import {
  deleteUserSecret,
  getUserProfile,
  saveUserSecret,
  updateUserProfile,
} from "../api/backend";

const SECRET_FIELDS = [
  { key: "github_pat", label: "GitHub PAT", placeholder: "ghp_xxxxxxxxxxxx" },
  { key: "voyage_api_key", label: "Voyage API Key", placeholder: "voyage_..." },
  { key: "groq_api_key", label: "Groq API Key", placeholder: "gsk_..." },
  { key: "gemini_api_key", label: "Gemini API Key", placeholder: "AIza..." },
  { key: "nomic_api_key", label: "Nomic API Key", placeholder: "nomic_..." },
];

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    full_name: "",
    avatar_url: "",
    llm_provider: "groq",
    chunk_size: 400,
  });
  const [secretInputs, setSecretInputs] = useState({});
  const [showSecret, setShowSecret] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSecret, setSavingSecret] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadProfile = async () => {
    try {
      const data = await getUserProfile();
      setProfile(data);
      setForm({
        full_name: data.full_name || "",
        avatar_url: data.avatar_url || "",
        llm_provider: data.preferences?.llm_provider || "groq",
        chunk_size: data.preferences?.chunk_size || 400,
      });
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleProfileSave = async () => {
    setSavingProfile(true);
    setMessage("");
    setError("");
    try {
      const data = await updateUserProfile(form);
      setProfile(data);
      setMessage("Profile updated.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSecretSave = async (key) => {
    const value = (secretInputs[key] || "").trim();
    if (!value) return;
    setSavingSecret((prev) => ({ ...prev, [key]: true }));
    setMessage("");
    setError("");
    try {
      await saveUserSecret(key, value);
      setSecretInputs((prev) => ({ ...prev, [key]: "" }));
      await loadProfile();
      setMessage("Secret saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingSecret((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleSecretDelete = async (key) => {
    setSavingSecret((prev) => ({ ...prev, [key]: true }));
    setMessage("");
    setError("");
    try {
      await deleteUserSecret(key);
      await loadProfile();
      setMessage("Secret removed.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingSecret((prev) => ({ ...prev, [key]: false }));
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-8">
        <section className="rounded-3xl border border-[var(--bg-hover)] bg-[var(--bg-surface)] p-8 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-muted)] text-[var(--accent-primary)]">
              <UserCircle2 className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-[var(--text-primary)]">
                Profile & Secrets
              </h1>
              <p className="mt-2 text-sm text-[var(--text-tertiary)]">
                Manage your personal provider keys and chat preferences.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-[var(--bg-hover)] bg-[var(--bg-surface)] p-8 shadow-2xl">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              User Profile
            </h2>
            <div className="mt-6 space-y-5">
              <label className="block">
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  Full name
                </span>
                <input
                  className="oi-input mt-2 w-full"
                  value={form.full_name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, full_name: event.target.value }))
                  }
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  Avatar URL
                </span>
                <input
                  className="oi-input mt-2 w-full"
                  value={form.avatar_url}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, avatar_url: event.target.value }))
                  }
                />
              </label>

              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Preferred LLM
                </p>
                <div className="mt-3 flex rounded-2xl border border-[var(--bg-hover)] bg-[var(--bg-base)] p-1">
                  {["groq", "gemini"].map((provider) => (
                    <button
                      key={provider}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({ ...prev, llm_provider: provider }))
                      }
                      className={`flex-1 rounded-xl px-4 py-3 text-sm font-medium transition ${
                        form.llm_provider === provider
                          ? "bg-[var(--accent-primary)] text-[var(--bg-base)]"
                          : "text-[var(--text-tertiary)]"
                      }`}
                    >
                      {provider === "groq" ? "Groq first" : "Gemini first"}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    Chunk size
                  </span>
                  <span className="text-sm text-[var(--accent-primary)]">
                    {form.chunk_size} tokens
                  </span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="800"
                  step="50"
                  value={form.chunk_size}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      chunk_size: Number(event.target.value),
                    }))
                  }
                  className="mt-4 w-full accent-[var(--accent-primary)]"
                />
              </label>

              <button
                type="button"
                onClick={handleProfileSave}
                disabled={savingProfile}
                className="oi-button oi-button-primary"
              >
                <Save className="h-4 w-4" />
                {savingProfile ? "Saving..." : "Save profile"}
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--bg-hover)] bg-[var(--bg-surface)] p-8 shadow-2xl">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-[var(--text-primary)]">
              <KeyRound className="h-5 w-5 text-[var(--accent-primary)]" />
              Encrypted Secrets
            </h2>
            <div className="mt-6 space-y-5">
              {SECRET_FIELDS.map((field) => {
                const saved = !!profile?.secrets?.[field.key];
                const busy = !!savingSecret[field.key];
                const visible = !!showSecret[field.key];
                return (
                  <div key={field.key} className="rounded-2xl border border-[var(--bg-hover)] bg-[var(--bg-base)] p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {field.label}
                      </p>
                      {saved ? (
                        <span className="inline-flex items-center gap-1 text-xs text-[var(--status-success)]">
                          <Check className="h-3 w-3" />
                          Saved
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--text-tertiary)]">
                          Not saved
                        </span>
                      )}
                    </div>
                    <div className="relative mt-3">
                      <input
                        type={visible ? "text" : "password"}
                        value={secretInputs[field.key] || ""}
                        onChange={(event) =>
                          setSecretInputs((prev) => ({
                            ...prev,
                            [field.key]: event.target.value,
                          }))
                        }
                        placeholder={saved ? "Enter new value to replace" : field.placeholder}
                        className="oi-input w-full pr-12"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowSecret((prev) => ({
                            ...prev,
                            [field.key]: !prev[field.key],
                          }))
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
                      >
                        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="mt-3 flex gap-3">
                      <button
                        type="button"
                        onClick={() => handleSecretSave(field.key)}
                        disabled={busy || !(secretInputs[field.key] || "").trim()}
                        className="oi-button oi-button-primary"
                      >
                        {busy ? "Saving..." : saved ? "Replace" : "Save"}
                      </button>
                      {saved && (
                        <button
                          type="button"
                          onClick={() => handleSecretDelete(field.key)}
                          disabled={busy}
                          className="oi-button oi-button-secondary"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {(message || error || profile) && (
          <section className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-[var(--bg-hover)] bg-[var(--bg-surface)] p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                Plan
              </p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                {profile?.plan || "free"}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--bg-hover)] bg-[var(--bg-surface)] p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                Credits
              </p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                {profile?.credits ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--bg-hover)] bg-[var(--bg-surface)] p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                Reset
              </p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                {profile?.days_until_reset ?? 0}d
              </p>
            </div>
          </section>
        )}

        {(message || error) && (
          <div
            className={`rounded-2xl border px-5 py-4 text-sm ${
              error
                ? "border-[var(--status-high)]/30 bg-[var(--status-high)]/10 text-[var(--status-high)]"
                : "border-[var(--status-success)]/30 bg-[var(--status-success)]/10 text-[var(--status-success)]"
            }`}
          >
            {error || message}
          </div>
        )}
      </div>
    </AppShell>
  );
}
