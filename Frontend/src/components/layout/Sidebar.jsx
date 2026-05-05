import { useMemo } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Database,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Users,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "../../api/firebaseConfig";
import { useWorkspace } from "../../context/WorkspaceContext";

function initialsFromName(name) {
  if (!name) return "U";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function Sidebar() {
  const navigate = useNavigate();
  const { workspace } = useWorkspace();
  const user = auth.currentUser;

  const navItems = useMemo(
    () => [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/ask", label: "Ask a Question", icon: MessageSquare },
      { to: "/sources", label: "Sources", icon: Database },
      { to: "/staleness", label: "Staleness Alerts", icon: AlertTriangle },
      { to: "/team", label: "Team", icon: Users },
    ],
    [],
  );

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
        <div className="mt-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-code-bg)] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-primary)]">Workspace</p>
          <p className="mt-2 text-sm font-medium text-[var(--color-text)]">
            {workspace?.name || "No workspace selected"}
          </p>
        </div>
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
