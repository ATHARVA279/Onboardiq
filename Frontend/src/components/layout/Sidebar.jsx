import { useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Database,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Pencil,
  Plus,
  Users,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "../../api/firebaseConfig";
import { useWorkspace } from "../../context/WorkspaceContext";
import { createWorkspace } from "../../api/backend";

function initialsFromName(name) {
  if (!name) return "U";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function WorkspaceSwitcher() {
  const { workspaces, activeWorkspace, switchWorkspace, addWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [createError, setCreateError] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const inputRef = useRef(null);

  const handleSwitchClick = (wsId) => {
    switchWorkspace(wsId);
    setOpen(false);
  };

  const openCreateForm = (e) => {
    e.stopPropagation();
    setCreating(true);
    setNewName("");
    setCreateError("");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleCreate = async () => {
    if (!newName.trim() || createLoading) return;
    setCreateLoading(true);
    setCreateError("");
    try {
      const ws = await createWorkspace(newName.trim());
      addWorkspace(ws);
      setCreating(false);
      setNewName("");
      setOpen(false);
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const sourceCount = (ws) => {
    const n = ws?.sources?.length || 0;
    return `${n} source${n === 1 ? "" : "s"}`;
  };

  return (
    <div className="relative mt-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-code-bg)] px-4 py-3 text-left transition hover:border-[var(--color-primary)]/40"
      >
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-primary)]">Workspace</p>
          <p className="mt-1 truncate text-sm font-medium text-[var(--color-text)]">
            {activeWorkspace?.name || "No workspace"}
          </p>
        </div>
        <ChevronDown
          className={`ml-2 h-4 w-4 shrink-0 text-[var(--color-muted)] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl">
          <div className="max-h-56 overflow-y-auto p-1">
            {workspaces.map((ws) => {
              const isActive =
                activeWorkspace?.id === ws.id || activeWorkspace?._id === ws._id;
              return (
                <button
                  key={ws.id || ws._id}
                  type="button"
                  onClick={() => handleSwitchClick(ws.id || ws._id)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition ${
                    isActive
                      ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                      : "text-[var(--color-text)] hover:bg-[var(--color-code-bg)]"
                  }`}
                >
                  <span className="truncate font-medium">{ws.name}</span>
                  <span className="ml-2 shrink-0 text-xs text-[var(--color-muted)]">
                    {isActive ? (
                      <Check className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                    ) : (
                      sourceCount(ws)
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="border-t border-[var(--color-border)] p-1">
            {creating ? (
              <div className="space-y-2 px-2 py-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                    if (e.key === "Escape") setCreating(false);
                  }}
                  placeholder="Workspace name…"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-code-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                />
                {createError && (
                  <p className="text-xs text-red-400">{createError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={!newName.trim() || createLoading}
                    className="flex-1 rounded-lg bg-[var(--color-primary)] py-1.5 text-xs font-semibold text-[#080c10] transition hover:bg-[#00cc7a] disabled:opacity-60"
                  >
                    {createLoading ? "Creating…" : "Create"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreating(false)}
                    className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-muted)] transition hover:bg-[var(--color-code-bg)]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={openCreateForm}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-[var(--color-muted)] transition hover:bg-[var(--color-code-bg)] hover:text-[var(--color-text)]"
              >
                <Plus className="h-3.5 w-3.5" />
                New Workspace
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const navigate = useNavigate();
  const user = auth.currentUser;

  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/ask", label: "Ask a Question", icon: MessageSquare },
    { to: "/sources", label: "Sources", icon: Database },
    { to: "/staleness", label: "Staleness Alerts", icon: AlertTriangle },
    { to: "/team", label: "Team", icon: Users },
  ];

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const displayName = user?.displayName || user?.email?.split("@")[0] || "User";

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-6 md:flex">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-code-bg)] text-lg font-bold text-[var(--color-primary)]">
            O
          </div>
          <div>
            <p className="text-lg font-bold text-[var(--color-text)]">Onboardiq</p>
            <p className="text-xs text-[var(--color-muted)]">Developer onboarding intelligence</p>
          </div>
        </div>
        <WorkspaceSwitcher />
      </div>

      <nav className="mt-8 flex-1 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[var(--color-primary)] text-white"
                    : "text-[var(--color-muted)] hover:bg-[var(--color-code-bg)] hover:text-[var(--color-text)]"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-code-bg)] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-primary)] font-semibold text-white">
            {initialsFromName(displayName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--color-text)]">{displayName}</p>
            <p className="truncate text-xs text-[var(--color-muted)]">{user?.email || "No email"}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg p-2 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
