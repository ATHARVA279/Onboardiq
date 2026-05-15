export default function AccentButton({ children, onClick, loading, disabled, variant = 'primary', size = 'md' }) {
  const sizes = {
    sm: { padding: '6px 14px', fontSize: '13px' },
    md: { padding: '10px 20px', fontSize: '14px' },
    lg: { padding: '14px 28px', fontSize: '15px' },
  }
  
  const variants = {
    primary: {
      background: loading || disabled ? 'var(--bg-hover)' : 'var(--accent-primary)',
      color: loading || disabled ? 'var(--text-tertiary)' : '#000',
      border: 'none',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-secondary)',
      border: '1px solid var(--border-subtle)',
    },
    outline: {
      background: 'transparent',
      color: 'var(--accent-primary)',
      border: '1px solid var(--accent-primary)',
    }
  }
  
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        ...sizes[size],
        ...variants[variant],
        borderRadius: '8px',
        fontFamily: 'Inter, sans-serif',
        fontWeight: '600',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        transition: 'all 0.15s ease',
        letterSpacing: '-0.01em',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => {
        if (!disabled && !loading) {
          if (variant === 'primary') {
            e.currentTarget.style.background = 'var(--accent-primary-hover)'
            e.currentTarget.style.boxShadow = '0 8px 24px var(--accent-glow)'
          } else {
            e.currentTarget.style.background = 'var(--bg-hover)'
          }
          e.currentTarget.style.transform = 'translateY(-1px)'
        }
      }}
      onMouseLeave={e => {
        if (!disabled && !loading) {
          e.currentTarget.style.background = variants[variant].background
          e.currentTarget.style.boxShadow = 'none'
          e.currentTarget.style.transform = 'translateY(0)'
        }
      }}
    >
      {loading ? (
        <>
          <span style={{
            width: '14px', height: '14px',
            border: '2px solid var(--text-tertiary)',
            borderTopColor: 'var(--text-primary)',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite',
            display: 'inline-block'
          }} />
          Loading...
        </>
      ) : children}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </button>
  )
}
