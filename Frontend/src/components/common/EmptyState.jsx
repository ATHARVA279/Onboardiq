export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-8 py-12 text-center shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-code-bg)] text-[var(--color-primary)]">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="mt-6 text-xl font-semibold text-[var(--color-text)]">{title}</h3>
      <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[var(--color-muted)]">
        {description}
      </p>
      {actionLabel ? (
        <button
          type="button"
          onClick={onAction}
          className="oi-button oi-button-primary mt-6"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
