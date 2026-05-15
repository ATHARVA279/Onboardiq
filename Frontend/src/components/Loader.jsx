import { Loader2 } from "lucide-react";

export default function Loader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-base)]">
      <div className="flex items-center gap-3 rounded-xl border border-[var(--bg-hover)] bg-[var(--bg-surface)] px-5 py-4 text-sm font-medium text-[var(--text-primary)] shadow-2xl">
        <Loader2 className="h-4 w-4 animate-spin text-[var(--accent-primary)]" />
        Loading workspace
      </div>
    </div>
  );
}
