/**
 * AgentCard
 * Bridge card for a single agent.
 *
 * Shows: name, status, current task, active project, last completed.
 * Tap → opens Crew Comms pre-seeded with this agent's context.
 *
 * compact=true: inline row for the sidebar GlobalPanel.
 * compact=false: full card for The Bridge.
 *
 * State file (agent-state/<name>.md) is fetched live.
 * If absent or stale, card degrades gracefully — never errors.
 */

import { useState, useEffect } from 'react';

function getStatusDotClass(status) {
  if (!status) return 'offline';
  const s = status.toLowerCase();
  if (s === 'online' || s === 'active') return 'online';
  if (s === 'busy') return 'busy';
  return 'offline';
}

function useAgentState(agentId) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agentId) return;
    setLoading(true);
    fetch(`/api/agent/${agentId.toLowerCase()}/state`)
      .then((r) => r.json())
      .then((d) => { setState(d); setLoading(false); })
      .catch(() => { setState({ found: false }); setLoading(false); });
  }, [agentId]);

  return { state, loading };
}

// ── Compact row (sidebar) ─────────────────────────────────────────────────

export function AgentCardCompact({ agent }) {
  const { name, status, color = '#ffaa00' } = agent;
  const dotClass = getStatusDotClass(status);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--lcars-panel-border)' }}>
      <div className={`agent-card__dot ${dotClass}`} style={{ background: color }} />
      <span style={{ fontFamily: 'var(--font-lcars)', fontSize: 'var(--text-meta)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color }}>
        {name}
      </span>
      <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-lcars)', fontSize: 'var(--text-meta)', textTransform: 'uppercase', letterSpacing: '0.1em', color: dotClass === 'online' ? 'var(--lcars-green-bright)' : 'var(--lcars-gray)' }}>
        {status || 'offline'}
      </span>
    </div>
  );
}

// ── Full card (Bridge) ────────────────────────────────────────────────────

export default function AgentCard({ agent, onOpenComms }) {
  const { name, status, color = '#ffaa00', personality } = agent;
  const dotClass = getStatusDotClass(status);
  const agentColor = color || '#ffaa00';
  const { state, loading: stateLoading } = useAgentState(name);

  // Derive display values from state file + agent prop
  const currentTask = state?.currentTask || null;
  const activeProject = state?.activeProject || null;
  const lastCompleted = state?.lastCompleted || null;
  const stale = state?.stale;
  const staleMinutes = state?.staleMinutes;

  const statusLabel = state?.status || status || 'offline';
  const dotStatus = getStatusDotClass(state?.status || status);

  // Stale label
  const staleLabel = stale && staleMinutes != null
    ? staleMinutes < 60
      ? `${staleMinutes}m ago`
      : staleMinutes < 1440
        ? `${Math.round(staleMinutes / 60)}h ago`
        : `${Math.round(staleMinutes / 1440)}d ago`
    : null;

  const handleTap = () => {
    if (onOpenComms) onOpenComms(agent, state);
  };

  return (
    <div
      className="agent-card"
      style={{ '--agent-color': agentColor, cursor: onOpenComms ? 'pointer' : 'default' }}
      onClick={handleTap}
      role={onOpenComms ? 'button' : undefined}
      tabIndex={onOpenComms ? 0 : undefined}
      onKeyDown={(e) => e.key === 'Enter' && handleTap()}
    >
      {/* Header */}
      <div className="agent-card__header">
        <div className={`agent-card__dot ${dotStatus}`} style={{ background: agentColor }} />
        <span className="agent-card__name">{name}</span>
        <span className={`lcars-status lcars-status--${dotStatus === 'online' ? 'online' : 'offline'}`} style={{ marginLeft: 'auto', fontSize: 'var(--text-meta)' }}>
          {statusLabel}
        </span>
      </div>

      {/* Body */}
      <div className="agent-card__body">

        {/* Current Task — primary field */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontFamily: 'var(--font-lcars)', fontSize: 'var(--text-meta)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--lcars-gray)', marginBottom: 4 }}>
            Current Task
          </div>
          {stateLoading ? (
            <div className="lcars-loading" style={{ padding: 0 }}>
              <div className="lcars-loading__bar"><div className="lcars-loading__progress" /></div>
            </div>
          ) : currentTask ? (
            <div style={{ fontSize: 'var(--text-secondary)', color: 'var(--lcars-space-white)', lineHeight: 1.4 }}>
              {currentTask}
              {stale && staleLabel && (
                <span style={{ fontFamily: 'var(--font-lcars)', fontSize: 'var(--text-meta)', color: 'var(--lcars-gray)', marginLeft: 8, letterSpacing: '0.1em' }}>
                  · {staleLabel}
                </span>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 'var(--text-meta)', color: 'var(--lcars-gray)', fontStyle: 'italic' }}>
              {state?.found === false ? 'State unavailable' : 'No active task'}
            </div>
          )}
        </div>

        {/* Active Project */}
        {activeProject && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontFamily: 'var(--font-lcars)', fontSize: 'var(--text-meta)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--lcars-gray)', width: 72, flexShrink: 0 }}>
              Project
            </span>
            <span style={{ fontSize: 'var(--text-meta)', color: agentColor, fontFamily: 'var(--font-lcars)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {activeProject}
            </span>
          </div>
        )}

        {/* Last Completed */}
        {lastCompleted && (
          <div style={{ paddingTop: 8, borderTop: '1px solid var(--lcars-panel-border)' }}>
            <div style={{ fontFamily: 'var(--font-lcars)', fontSize: 'var(--text-meta)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--lcars-gray)', marginBottom: 3 }}>
              Last Completed
            </div>
            <div style={{ fontSize: 'var(--text-meta)', color: 'var(--lcars-gray-light)', lineHeight: 1.4 }}>
              {lastCompleted}
            </div>
          </div>
        )}

        {/* Personality — subtle footer */}
        {personality && !currentTask && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--lcars-panel-border)', fontSize: 'var(--text-meta)', color: 'var(--lcars-gray)', fontStyle: 'italic' }}>
            {personality}
          </div>
        )}

        {/* Tap affordance */}
        {onOpenComms && (
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--lcars-panel-border)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: 'var(--font-lcars)', fontSize: 'var(--text-meta)', letterSpacing: '0.15em', textTransform: 'uppercase', color: agentColor }}>
              ▶ Open Comms
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
