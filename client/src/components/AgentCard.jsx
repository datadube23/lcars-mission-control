/**
 * AgentCard
 * Displays a single agent — name, status dot, model, machine.
 * compact=true: inline row for sidebar use
 * compact=false: full card for The Bridge
 *
 * Agent color accents:
 * - Data: #ffaa00 (gold)
 * - Worf: #cc4444 (red)
 */

function getStatusDotClass(status) {
  if (!status) return 'offline';
  const s = status.toLowerCase();
  if (s === 'online') return 'online';
  if (s === 'busy') return 'busy';
  return 'offline';
}

export default function AgentCard({ agent, compact = false }) {
  const { name, status, model, machine, lastSeen, color = '#ffaa00', personality } = agent;
  const dotClass = getStatusDotClass(status);
  const agentColor = color || '#ffaa00';

  if (compact) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 0',
          borderBottom: '1px solid var(--lcars-panel-border)',
        }}
      >
        <div
          className={`agent-card__dot ${dotClass}`}
          style={{ background: agentColor }}
        />
        <span
          style={{
            fontFamily: 'var(--font-lcars)',
            fontSize: 12,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: agentColor,
          }}
        >
          {name}
        </span>
        <span
          style={{
            marginLeft: 'auto',
            fontFamily: 'var(--font-lcars)',
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: dotClass === 'online' ? 'var(--lcars-green-bright)' : 'var(--lcars-gray)',
          }}
        >
          {status || 'offline'}
        </span>
      </div>
    );
  }

  // Full card (used on The Bridge)
  return (
    <div
      className="agent-card"
      style={{ '--agent-color': agentColor }}
    >
      <div className="agent-card__header">
        <div className={`agent-card__dot ${dotClass}`} style={{ background: agentColor }} />
        <span className="agent-card__name">{name}</span>
        <span
          className={`lcars-status ${dotClass === 'online' ? 'lcars-status--online' : 'lcars-status--offline'}`}
          style={{ marginLeft: 'auto', fontSize: 10 }}
        >
          {status || 'offline'}
        </span>
      </div>

      <div className="agent-card__body">
        <div className="agent-card__row">
          <span className="agent-card__key">Model</span>
          <span className="agent-card__val">{model || '—'}</span>
        </div>
        <div className="agent-card__row">
          <span className="agent-card__key">Machine</span>
          <span className="agent-card__val">{machine || '—'}</span>
        </div>
        {lastSeen && (
          <div className="agent-card__row">
            <span className="agent-card__key">Last Seen</span>
            <span className="agent-card__val" style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11 }}>
              {lastSeen}
            </span>
          </div>
        )}
        {personality && (
          <div
            style={{
              marginTop: 8,
              paddingTop: 8,
              borderTop: '1px solid var(--lcars-panel-border)',
              fontSize: 11,
              color: 'var(--lcars-gray)',
              fontStyle: 'italic',
            }}
          >
            {personality}
          </div>
        )}
      </div>
    </div>
  );
}
