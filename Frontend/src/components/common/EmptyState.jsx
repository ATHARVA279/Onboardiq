export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}) {
  return (
    <div className="rounded-xl border border-[var(--bg-hover)] bg-[var(--bg-surface)] px-8 py-12 text-center shadow-lg">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl border border-[var(--bg-hover)] bg-[var(--bg-elevated)] text-[var(--accent-primary)]">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="mt-6 text-xl font-semibold text-[var(--text-primary)]">{title}</h3>
      <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[var(--text-tertiary)]">
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
