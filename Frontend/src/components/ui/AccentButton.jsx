export default function AccentButton({ children, onClick, loading, disabled, variant = 'primary', size = 'md' }) {
  const sizes = {
    sm: { padding: '6px 14px', fontSize: '13px' },
    md: { padding: '10px 20px', fontSize: '14px' },
    lg: { padding: '14px 28px', fontSize: '15px' },
  }
  
  const variants = {
    primary: {
      background: loading || disabled ? '#333' : '#e5195e',
      color: loading || disabled ? '#666' : '#fff',
      border: 'none',
    },
    ghost: {
      background: 'transparent',
      color: '#888',
      border: '1px solid #2a2a2a',
    },
    outline: {
      background: 'transparent',
      color: '#e5195e',
      border: '1px solid #e5195e',
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
        fontWeight: '500',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.15s ease',
        letterSpacing: '-0.01em',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => {
        if (!disabled && !loading && variant === 'primary') {
          e.currentTarget.style.background = '#ff2070'
          e.currentTarget.style.transform = 'translateY(-1px)'
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(229, 25, 94, 0.3)'
        }
      }}
      onMouseLeave={e => {
        if (!disabled && !loading && variant === 'primary') {
          e.currentTarget.style.background = '#e5195e'
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = 'none'
        }
      }}
    >
      {loading ? (
        <>
          <span style={{
            width: '14px', height: '14px',
            border: '2px solid #555',
            borderTopColor: '#888',
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
