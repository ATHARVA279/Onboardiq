import Sidebar from "./Sidebar";

export default function AppShell({ children }) {
  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <div className="oi-grid-bg fixed inset-0 opacity-40" />
      <div className="relative z-10 flex min-h-screen">
        <Sidebar />
        <main className="flex-1 md:pl-64">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
