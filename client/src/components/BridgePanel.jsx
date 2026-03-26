/**
 * BridgePanel
 * "The Bridge" — agent command center.
 * Shows: Agent Roster + Tailscale Network View + Crew Comms Chat.
 * Toggle between views via tab.
 */

import { useState } from 'react';
import AgentCard from './AgentCard.jsx';
import BridgeChatPanel from './BridgeChatPanel.jsx';

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
              fontSize: 9,
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
            fontSize: 9,
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
          fontSize: 10,
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

export default function BridgePanel({ agents = [], tailscale, currentView = 'bridge', currentProject = null }) {
  const [tab, setTab] = useState('agents'); // 'agents' | 'network'

  const nodes = tailscale?.nodes || [];

  return (
    <div className="bridge-panel">
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div className="lcars-section-heading">
          The Bridge
        </div>
        <div
          style={{
            fontFamily: 'var(--font-lcars)',
            fontSize: 11,
            color: 'var(--lcars-gray)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: 12,
          }}
        >
          Agent Command Center — MR_DATA Fleet
        </div>

        {/* Tab toggle */}
        <div className="project-detail__tabs">
          <button
            className={`project-detail__tab ${tab === 'agents' ? 'active' : ''}`}
            onClick={() => setTab('agents')}
          >
            Agent Roster
          </button>
          <button
            className={`project-detail__tab ${tab === 'network' ? 'active' : ''}`}
            onClick={() => setTab('network')}
          >
            Network View
          </button>
          <button
            className={`project-detail__tab ${tab === 'comms' ? 'active' : ''}`}
            onClick={() => setTab('comms')}
            style={tab === 'comms' ? { color: 'var(--lcars-gold)', borderBottomColor: 'var(--lcars-gold)' } : {}}
          >
            Crew Comms
          </button>
        </div>
      </div>

      {/* Agent Roster */}
      {tab === 'agents' && (
        <div>
          {agents.length === 0 ? (
            <div className="lcars-empty">No agents registered in AGENT-ROSTER.md</div>
          ) : (
            <div className="bridge-panel__agents">
              {agents.map((agent) => (
                <AgentCard key={agent.name} agent={agent} compact={false} />
              ))}
            </div>
          )}

          {/* Crew Comms teaser — click to switch to comms tab */}
          <div
            style={{
              marginTop: 24,
              padding: '12px 16px',
              background: 'var(--lcars-panel)',
              border: '1px solid rgba(204,136,0,0.25)',
              borderRadius: 4,
              cursor: 'pointer',
            }}
            onClick={() => setTab('comms')}
          >
            <div
              className="lcars-label"
              style={{ color: 'var(--lcars-gold)', marginBottom: 6 }}
            >
              ▶ Crew Comms — Active
            </div>
            <div style={{ fontSize: 12, color: 'var(--lcars-gray)', lineHeight: 1.5 }}>
              Direct comms channel with Data and Worf. Tap to open the Crew Comms console.
            </div>
          </div>
        </div>
      )}

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
                fontSize: 11,
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
              <div className="lcars-section-heading" style={{ fontSize: 11 }}>
                Fleet Network
              </div>
              {nodes.map((node) => (
                <NetworkNode key={node.id} node={node} />
              ))}
            </>
          )}
        </div>
      )}

      {/* Crew Comms */}
      {tab === 'comms' && (
        <BridgeChatPanel
          currentView={currentView}
          currentProject={currentProject}
          agents={agents}
        />
      )}
    </div>
  );
}
