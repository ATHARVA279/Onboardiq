import { useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
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
  Settings2,
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
  const { workspaces, activeWorkspace, switchWorkspace, addWorkspace, loading } =
    useWorkspace();
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

  if (loading) {
    return (
      <div className="relative mt-6">
        <div className="flex w-full items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-transparent px-3 py-2 text-left">
          <div className="min-w-0 w-full space-y-1.5">
            <div className="oi-skeleton h-2.5 w-12 rounded" />
            <div className="oi-skeleton h-3.5 w-28 rounded" />
          </div>
          <div className="oi-skeleton h-3.5 w-3.5 rounded shrink-0" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative mt-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-transparent px-3 py-2 text-left transition-all duration-200 hover:bg-[rgba(255,255,255,0.03)] hover:border-[var(--border-default)]"
      >
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.14em] font-medium text-[var(--text-tertiary)]">
            Workspace
          </p>
          <p className="mt-0.5 truncate text-[13px] font-semibold tracking-tight text-[var(--text-primary)]">
            {activeWorkspace?.name || "No workspace"}
          </p>
        </div>
        <ChevronDown
          className={`ml-2 h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          strokeWidth={1.5}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-1.5 shadow-2xl backdrop-blur-md">
          <div className="max-h-56 overflow-y-auto p-1">
            {workspaces.map((ws) => {
              const isActive =
                activeWorkspace?.id === ws.id ||
                activeWorkspace?._id === ws._id;
              return (
                <button
                  key={ws.id || ws._id}
                  type="button"
                  onClick={() => handleSwitchClick(ws.id || ws._id)}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[13px] transition-all duration-150 ${
                    isActive
                      ? "bg-[rgba(200,169,107,0.08)] text-[var(--accent-primary)] font-medium"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <span className="truncate">{ws.name}</span>
                  <span className="ml-2 shrink-0 text-[10px] text-[var(--text-tertiary)]">
                    {isActive ? (
                      <Check className="h-3 w-3 text-[var(--accent-primary)]" strokeWidth={2} />
                    ) : (
                      sourceCount(ws)
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="border-t border-[var(--border-default)] p-1">
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
                  className="w-full rounded border border-[var(--border-default)] bg-[#0C0C0E] px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                />
                {createError && (
                  <p className="text-[10px] text-red-400">{createError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={!newName.trim() || createLoading}
                    className="flex-1 rounded bg-[var(--accent-primary)] py-1 text-[11px] font-semibold text-[#0C0C0E] transition hover:opacity-90 disabled:opacity-60"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setCreating(false)}
                    className="rounded border border-[var(--border-default)] px-2 py-1 text-[11px] text-[var(--text-tertiary)] transition hover:bg-[#0C0C0E]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={openCreateForm}
                className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-xs text-[var(--text-tertiary)] transition hover:bg-[#0C0C0E] hover:text-[var(--text-primary)]"
              >
                <Plus className="h-3 w-3" strokeWidth={1.5} />
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
  const { loading } = useWorkspace();

  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/ask", label: "Ask a Question", icon: MessageSquare },
    { to: "/profile", label: "Profile", icon: Settings2 },
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
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-[var(--border-default)] bg-[#0C0C0E] px-5 py-6 md:flex">
      <div className="flex items-center gap-3 px-1 mt-1">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-default)] bg-gradient-to-br from-[var(--bg-surface)] to-[var(--bg-elevated)] text-sm font-semibold text-[var(--accent-primary)] shadow-sm">
            O
          </div>
          <div>
            <p className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">
              Onboardiq
            </p>
            <p className="text-[10px] tracking-[0.14em] uppercase font-medium text-[var(--text-tertiary)]">
              Intelligence
            </p>
          </div>
        </Link>
      </div>
      <WorkspaceSwitcher />

      {loading ? (
        <nav className="mt-10 flex-1 space-y-2.5">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3.5 rounded-md px-3.5 py-2.5"
            >
              <div className="oi-skeleton h-4 w-4 rounded shrink-0" />
              <div className="oi-skeleton h-3.5 w-24 rounded" />
            </div>
          ))}
        </nav>
      ) : (
        <nav className="mt-10 flex-1 space-y-2.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 rounded-md px-3.5 py-2.5 text-[13px] font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-[rgba(200,169,107,0.08)] text-[var(--accent-primary)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                  }`
                }
              >
                <Icon className="h-4 w-4 opacity-80" strokeWidth={1.5} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      )}

      {loading ? (
        <div className="mt-auto border-t border-[var(--border-subtle)] pt-5">
          <div className="flex items-center gap-3 px-1">
            <div className="oi-skeleton h-8 w-8 rounded-full shrink-0" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="oi-skeleton h-3 w-20 rounded" />
              <div className="oi-skeleton h-2.5 w-28 rounded" />
            </div>
            <div className="oi-skeleton h-3.5 w-3.5 rounded shrink-0" />
          </div>
        </div>
      ) : (
        <div className="mt-auto border-t border-[var(--border-subtle)] pt-5">
          <div className="flex items-center gap-3 px-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-muted)] border border-[rgba(200,169,107,0.15)] font-semibold text-[var(--accent-primary)] text-xs">
              {displayName.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-[var(--text-primary)]">
                {displayName}
              </p>
              <p className="truncate text-[10px] text-[var(--text-tertiary)]">
                {user?.email || "No email"}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg p-1.5 text-[var(--text-tertiary)] transition-colors hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--text-primary)]"
              aria-label="Logout"
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
