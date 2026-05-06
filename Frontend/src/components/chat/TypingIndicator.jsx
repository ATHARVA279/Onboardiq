export default function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0' }}>
      <div
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #00ff9c 0%, #2E75B6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontSize: '10px',
          fontWeight: '700',
          color: '#080c10',
          letterSpacing: '-0.03em',
        }}
      >
        AI
      </div>
      <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: '#4b5563',
              animation: 'oiq-bounce 1.2s infinite ease-in-out',
              animationDelay: `${i * 0.18}s`,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes oiq-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-7px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
