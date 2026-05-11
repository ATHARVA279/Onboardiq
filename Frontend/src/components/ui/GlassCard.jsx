export default function GlassCard({ children, style, className, hover = false, onClick }) {
  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        background: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: '12px',
        transition: 'all 0.2s ease',
        cursor: onClick ? 'pointer' : 'default',
        ...style
      }}
      onMouseEnter={e => {
        if (hover) {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)'
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'
        }
      }}
      onMouseLeave={e => {
        if (hover) {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
        }
      }}
    >
      {children}
    </div>
  )
}
