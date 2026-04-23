/**
 * EngineeringPanel
 * "Engineering" — system telemetry and fleet health.
 *
 * Tabs:
 *   Network   — Tailscale fleet topology (moved from The Bridge)
 *   Telemetry — Agent token/cost usage (Data live, Worf via relay when available)
 *
 * Worf telemetry: populated by the relay service on Lennox (see WORF-TELEMETRY-RELAY-SPEC.md).
 * Until the relay is live, Worf shows a clearly-marked stub.
 */

import { useState, useEffect } from 'react';

// ── Network View ─────────────────────────────────────────────────────────────

function NetworkNode({ node }) {
  return (
    <div className="network-node">
      <div className={`network-node__dot ${node.online ? '' : 'offline'}`} />
      <span className="network-node__hostname">
        {node.hostname || node.id}
        {node.isSelf && (
          <span
            style={{
              fontFamily: 'var(--font-lcars)',
              fontSize: 'var(--text-meta)',
              marginLeft: 6,
              color: 'var(--lcars-gray)',
              letterSpacing: '0.1em',
            }}
          >
            (THIS NODE)
          </span>
        )}
      </span>
      {node.os && (
        <span
          style={{
            fontFamily: 'var(--font-lcars)',
            fontSize: 'var(--text-meta)',
            color: 'var(--lcars-gray)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {node.os}
        </span>
      )}
      <span className="network-node__ip">{node.ip}</span>
      <span
        style={{
          fontFamily: 'var(--font-lcars)',
          fontSize: 'var(--text-meta)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: node.online ? 'var(--lcars-green-bright)' : 'var(--lcars-gray)',
          marginLeft: 8,
        }}
      >
        {node.online ? 'ONLINE' : 'OFFLINE'}
      </span>
    </div>
  );
}

// ── Telemetry Row ─────────────────────────────────────────────────────────────

function TelemetryRow({ label, value, sub, accent }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 0',
        borderBottom: '1px solid var(--lcars-panel-border)',
        gap: 12,
      }}
    >
      <div
        style={{
          width: 3,
          height: 32,
          borderRadius: 2,
          background: accent || 'var(--lcars-gold)',
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: 'var(--font-lcars)',
            fontSize: 'var(--text-meta)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--lcars-gray)',
          }}
        >
          {label}
        </div>
        {sub && (
          <div
            style={{
              fontSize: 'var(--text-meta)',
              color: 'var(--lcars-gray)',
              marginTop: 2,
            }}
          >
            {sub}
          </div>
        )}
      </div>
      <div
        style={{
          fontFamily: 'Share Tech Mono, monospace',
          fontSize: 'var(--text-secondary)',
          color: 'var(--lcars-space-white)',
          textAlign: 'right',
        }}
      >
        {value}
      </div>
    </div>
  );
}

function AgentTelemetryCard({ agent, telemetry, loading, accent }) {
  const isStub = telemetry?.stub === true;
  const isUnavailable = telemetry?.unavailable === true;

  return (
    <div
      className="lcars-panel"
      style={{
        '--accent-color': accent,
        marginBottom: 16,
      }}
    >
      <div className="lcars-panel__header">
        <div className="lcars-panel__header-bar" />
        <span className="lcars-panel__title">{agent.name}</span>
        {isStub && (
          <span
            style={{
              marginLeft: 'auto',
              fontFamily: 'var(--font-lcars)',
              fontSize: 'var(--text-meta)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--lcars-gray)',
              background: 'var(--lcars-panel-raised)',
              padding: '2px 8px',
              borderRadius: 3,
              border: '1px solid var(--lcars-panel-border)',
            }}
          >
            RELAY PENDING
          </span>
        )}
        {isUnavailable && (
          <span
            style={{
              marginLeft: 'auto',
              fontFamily: 'var(--font-lcars)',
              fontSize: 'var(--text-meta)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--lcars-tomato)',
              background: 'rgba(204,68,68,0.1)',
              padding: '2px 8px',
              borderRadius: 3,
              border: '1px solid rgba(204,68,68,0.3)',
            }}
          >
            UNREACHABLE
          </span>
        )}
      </div>
      <div className="lcars-panel__body">
        {loading ? (
          <div className="lcars-loading">
            <div className="lcars-loading__bar"><div className="lcars-loading__progress" /></div>
          </div>
        ) : isStub ? (
          <div
            style={{
              padding: '12px 0',
              color: 'var(--lcars-gray)',
              fontSize: 'var(--text-meta)',
              lineHeight: 1.5,
            }}
          >
            Worf telemetry relay not yet active. Relay service runs on Lennox — accessible
            over Tailscale once configured.{' '}
            <span style={{ fontFamily: 'var(--font-lcars)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              See WORF-TELEMETRY-RELAY-SPEC.md
            </span>
          </div>
        ) : (
          <>
            <TelemetryRow
              label="Tokens (30d)"
              value={telemetry?.totalTokens?.toLocaleString() ?? '—'}
              accent={accent}
            />
            <TelemetryRow
              label="Cost (30d)"
              value={telemetry?.totalCost != null ? `$${telemetry.totalCost.toFixed(4)}` : '—'}
              sub={telemetry?.cloudCost === 0 ? 'compute unmodeled (local)' : null}
              accent={accent}
            />
            <TelemetryRow
              label="Local %"
              value={telemetry?.localPct != null ? `${telemetry.localPct}%` : '—'}
              accent={accent}
            />
            <TelemetryRow
              label="Messages (30d)"
              value={telemetry?.messageCount?.toLocaleString() ?? '—'}
              accent={accent}
            />
            <TelemetryRow
              label="Top Model"
              value={telemetry?.topModel ?? '—'}
              accent={accent}
            />
            <TelemetryRow
              label="Last Active"
              value={
                telemetry?.lastActive
                  ? new Date(telemetry.lastActive).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—'
              }
              accent={accent}
            />
            {telemetry?.failures && (
              <TelemetryRow
                label="Errors (30d)"
                value={
                  Object.values(telemetry.failures).reduce((a, b) => a + b, 0) === 0
                    ? 'None'
                    : `${telemetry.failures.recentErrorCount} recent`
                }
                accent={accent}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Main EngineeringPanel ─────────────────────────────────────────────────────

export default function EngineeringPanel({ agents = [], tailscale }) {
  const [tab, setTab] = useState('network'); // 'network' | 'telemetry'
  const [telemetry, setTelemetry] = useState({});
  const [telemetryLoading, setTelemetryLoading] = useState(false);
  const [window_, setWindow_] = useState('30d');

  const nodes = tailscale?.nodes || [];

  useEffect(() => {
    if (tab !== 'telemetry') return;
    setTelemetryLoading(true);
    fetch(`/api/telemetry?window=${window_}`)
      .then((r) => r.json())
      .then((d) => {
        setTelemetry(d);
        setTelemetryLoading(false);
      })
      .catch(() => {
        setTelemetryLoading(false);
      });
  }, [tab, window_]);

  return (
    <div className="bridge-panel">
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div className="lcars-section-heading">Engineering</div>
        <div
          style={{
            fontFamily: 'var(--font-lcars)',
            fontSize: 'var(--text-meta)',
            color: 'var(--lcars-gray)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: 12,
          }}
        >
          Fleet Health — System Telemetry
        </div>

        <div className="project-detail__tabs">
          <button
            className={`project-detail__tab ${tab === 'network' ? 'active' : ''}`}
            onClick={() => setTab('network')}
          >
            Network View
          </button>
          <button
            className={`project-detail__tab ${tab === 'telemetry' ? 'active' : ''}`}
            onClick={() => setTab('telemetry')}
            style={tab === 'telemetry' ? { color: 'var(--lcars-african-violet)', borderBottomColor: 'var(--lcars-african-violet)' } : {}}
          >
            Telemetry
          </button>
        </div>
      </div>

      {/* Network View */}
      {tab === 'network' && (
        <div className="bridge-panel__network">
          {tailscale?.error ? (
            <div
              style={{
                padding: '12px 16px',
                background: 'var(--lcars-panel)',
                border: '1px solid rgba(204,68,68,0.3)',
                borderRadius: 4,
                color: 'var(--lcars-tomato)',
                fontFamily: 'var(--font-lcars)',
                fontSize: 'var(--text-meta)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              Tailscale unavailable: {tailscale.error}
            </div>
          ) : nodes.length === 0 ? (
            <div className="lcars-empty">No Tailscale nodes found</div>
          ) : (
            <>
              <div className="lcars-section-heading">Fleet Network</div>
              {nodes.map((node) => (
                <NetworkNode key={node.id} node={node} />
              ))}
            </>
          )}
        </div>
      )}

      {/* Telemetry */}
      {tab === 'telemetry' && (
        <div>
          {/* Window selector */}
          <div
            style={{
              display: 'flex',
              gap: 6,
              marginBottom: 16,
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-lcars)',
                fontSize: 'var(--text-meta)',
                color: 'var(--lcars-gray)',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                marginRight: 4,
              }}
            >
              Window:
            </span>
            {['today', '7d', '30d'].map((w) => (
              <button
                key={w}
                onClick={() => setWindow_(w)}
                style={{
                  fontFamily: 'var(--font-lcars)',
                  fontSize: 'var(--text-meta)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  padding: '4px 12px',
                  minHeight: 32,
                  border: '1px solid',
                  borderRadius: 3,
                  cursor: 'pointer',
                  borderColor: window_ === w ? 'var(--lcars-african-violet)' : 'var(--lcars-panel-border)',
                  background: window_ === w ? 'rgba(153,119,204,0.15)' : 'transparent',
                  color: window_ === w ? 'var(--lcars-african-violet)' : 'var(--lcars-gray)',
                  transition: 'all 150ms ease',
                }}
              >
                {w}
              </button>
            ))}
          </div>

          {agents.map((agent) => {
            const key = agent.name?.toLowerCase(); // 'data' | 'worf'
            return (
              <AgentTelemetryCard
                key={agent.name}
                agent={agent}
                telemetry={telemetry[key]}
                loading={telemetryLoading}
                accent={agent.color || 'var(--lcars-gold)'}
              />
            );
          })}

          {agents.length === 0 && (
            <div className="lcars-empty">No agents registered</div>
          )}
        </div>
      )}
    </div>
  );
}
