/**
 * BridgePanel
 * "The Bridge" — see active work, enter context, talk to crew.
 *
 * Tabs:
 *   Agent Roster — who's doing what, tap to open comms in context
 *   Crew Comms   — direct chat with Data or Worf, context-aware
 *
 * Telemetry and Network View live in Engineering (EngineeringPanel.jsx).
 */

import { useState } from 'react';
import AgentCard from './AgentCard.jsx';
import BridgeChatPanel from './BridgeChatPanel.jsx';

export default function BridgePanel({ agents = [], currentView = 'bridge', currentProject = null }) {
  const [tab, setTab] = useState('agents'); // 'agents' | 'comms'
  // Context injected when tapping an agent card
  const [commsContext, setCommsContext] = useState(null); // { agent, state }

  const handleOpenComms = (agent, state) => {
    setCommsContext({ agent, state });
    setTab('comms');
  };

  const handleTabChange = (newTab) => {
    if (newTab !== 'comms') setCommsContext(null);
    setTab(newTab);
  };

  return (
    <div className="bridge-panel">
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div className="lcars-section-heading">The Bridge</div>
        <div style={{ fontFamily: 'var(--font-lcars)', fontSize: 'var(--text-meta)', color: 'var(--lcars-gray)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
          Agent Command Center — MR_DATA Fleet
        </div>

        <div className="project-detail__tabs">
          <button
            className={`project-detail__tab ${tab === 'agents' ? 'active' : ''}`}
            onClick={() => handleTabChange('agents')}
          >
            Agent Roster
          </button>
          <button
            className={`project-detail__tab ${tab === 'comms' ? 'active' : ''}`}
            onClick={() => handleTabChange('comms')}
            style={tab === 'comms' ? { color: 'var(--lcars-gold)', borderBottomColor: 'var(--lcars-gold)' } : {}}
          >
            Crew Comms
            {commsContext && (
              <span style={{ marginLeft: 6, fontFamily: 'var(--font-lcars)', fontSize: 'var(--text-meta)', letterSpacing: '0.1em', color: commsContext.agent?.color || 'var(--lcars-gold)', textTransform: 'uppercase' }}>
                · {commsContext.agent?.name}
              </span>
            )}
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
                <AgentCard
                  key={agent.name}
                  agent={agent}
                  onOpenComms={handleOpenComms}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Crew Comms */}
      {tab === 'comms' && (
        <BridgeChatPanel
          currentView={currentView}
          currentProject={currentProject}
          agents={agents}
          initialAgent={commsContext?.agent}
          initialContext={commsContext?.state}
        />
      )}
    </div>
  );
}
