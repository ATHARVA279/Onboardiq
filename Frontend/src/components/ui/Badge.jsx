export default function Badge({ children, variant = 'default' }) {
  const variants = {
    default: { bg: 'rgba(255,255,255,0.08)', color: '#888', border: 'rgba(255,255,255,0.1)' },
    accent: { bg: 'rgba(229,25,94,0.15)', color: '#e5195e', border: 'rgba(229,25,94,0.3)' },
    success: { bg: 'rgba(34,197,94,0.1)', color: '#22c55e', border: 'rgba(34,197,94,0.2)' },
    warning: { bg: 'rgba(234,179,8,0.1)', color: '#eab308', border: 'rgba(234,179,8,0.2)' },
    error: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'rgba(239,68,68,0.2)' },
    danger: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'rgba(239,68,68,0.2)' },
    primary: { bg: 'rgba(229,25,94,0.15)', color: '#e5195e', border: 'rgba(229,25,94,0.3)' },
    green: { bg: 'rgba(34,197,94,0.1)', color: '#22c55e', border: 'rgba(34,197,94,0.2)' },
  }
  const v = variants[variant] || variants.default
  return (
    <span style={{
      background: v.bg,
      color: v.color,
      border: `1px solid ${v.border}`,
      padding: '2px 8px',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: '500',
      letterSpacing: '0.02em',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
      display: 'inline-block',
    }}>
      {children}
    </span>
  )
}
