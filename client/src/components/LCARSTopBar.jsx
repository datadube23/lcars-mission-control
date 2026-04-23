/**
 * LCARSTopBar
 * Navigation bar at the top of the dashboard.
 * Features the LCARS gold bar with MISSION CONTROL title and nav buttons.
 */

export default function LCARSTopBar({ view, onNav, sseConnected, lastUpdate }) {
  const navItems = [
    { id: 'projects', label: 'Projects' },
    { id: 'bridge', label: 'The Bridge' },
    { id: 'engineering', label: 'Engineering' },
  ];

  return (
    <header className="lcars-topbar">
      {/* Left elbow cap */}
      <div className="lcars-topbar__elbow" />

      {/* Main gold bar */}
      <div className="lcars-topbar__bar">
        <div>
          <div className="lcars-topbar__title">Mission Control</div>
          <div className="lcars-topbar__subtitle">MR_DATA Fleet Command</div>
        </div>

        {/* Nav buttons */}
        <nav className="lcars-topbar__nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`lcars-topbar__nav-btn ${view === item.id || (view === 'project-detail' && item.id === 'projects') ? 'active' : ''}`}
              onClick={() => onNav(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* SSE connection indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className={`lcars-live-dot ${sseConnected ? '' : 'offline'}`} />
          <span
            style={{
              fontFamily: 'var(--font-lcars)',
              fontSize: 'var(--text-meta)',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: 'rgba(10,10,18,0.6)',
            }}
          >
            {sseConnected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* Right sidebar cap */}
      <div className="lcars-topbar__sidebar-cap">
        <span className="lcars-topbar__sidebar-label">Command</span>
      </div>
    </header>
  );
}
