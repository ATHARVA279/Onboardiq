import { Loader2 } from "lucide-react";

export default function Loader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)]">
      <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 text-sm font-medium text-[var(--color-text)] shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
        <Loader2 className="h-4 w-4 animate-spin text-[var(--color-primary)]" />
        Loading workspace
      </div>
    </div>
  );
}
