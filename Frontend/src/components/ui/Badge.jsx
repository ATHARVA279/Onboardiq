export default function Badge({ children, variant = 'default' }) {
  const variants = {
    default: 'bg-[var(--bg-hover)] text-[var(--text-secondary)] border-[var(--bg-hover)]',
    accent: 'bg-[var(--accent-muted)] text-[var(--accent-primary)] border-[var(--accent-primary)]/30',
    success: 'bg-[var(--status-success)]/10 text-[var(--status-success)] border-[var(--status-success)]/20',
    warning: 'bg-[var(--status-medium)]/10 text-[var(--status-medium)] border-[var(--status-medium)]/20',
    error: 'bg-[var(--status-high)]/10 text-[var(--status-high)] border-[var(--status-high)]/20',
    danger: 'bg-[var(--status-high)]/10 text-[var(--status-high)] border-[var(--status-high)]/20',
    primary: 'bg-[var(--accent-muted)] text-[var(--accent-primary)] border-[var(--accent-primary)]/30',
    green: 'bg-[var(--status-success)]/10 text-[var(--status-success)] border-[var(--status-success)]/20',
  }
  
  const variantClass = variants[variant] || variants.default

  return (
    <span className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider whitespace-nowrap ${variantClass}`}>
      {children}
    </span>
  )
}
