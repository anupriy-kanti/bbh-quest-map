export default function Sidebar({ spotCount = 0 }) {
  return (
    <aside
      style={{
        width: 280,
        minWidth: 280,
        height: '100%',
        backgroundColor: '#420424',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 16px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <h2
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#f5d2c1',
          }}
        >
          Spots
        </h2>
        {spotCount > 0 && (
          <span style={{ fontSize: 12, color: 'rgba(245,210,193,0.45)' }}>
            {spotCount}
          </span>
        )}
      </div>
    </aside>
  );
}
