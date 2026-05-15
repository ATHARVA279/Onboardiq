export default function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0' }}>
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontSize: '11px',
          fontWeight: '700',
          color: 'var(--bg-base)',
        }}
      >
        IQ
      </div>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: 'var(--text-tertiary)',
              animation: 'oiq-bounce 1.4s infinite ease-in-out',
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes oiq-bounce {
          0%, 60%, 100% { transform: translateY(0) scale(1); opacity: 0.4; }
          30% { transform: translateY(-5px) scale(1.1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
