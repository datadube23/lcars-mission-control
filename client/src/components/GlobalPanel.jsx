/**
 * GlobalPanel
 * Right sidebar — always-on command panels.
 * Shows: Waiting on David, Blockers, What Changed Today, Calendar, Agent Status.
 */

import CalendarStrip from './CalendarStrip.jsx';
import AgentCard from './AgentCard.jsx';

function SidebarSection({ title, accentColor, badge, children }) {
  return (
    <div
      className="lcars-panel sidebar-section"
      style={{ '--accent-color': accentColor }}
    >
      <div className="lcars-panel__header">
        <div className="lcars-panel__header-bar" />
        <span className="lcars-panel__title">{title}</span>
        {badge !== undefined && badge !== null && (
          <span className="lcars-panel__badge">{badge}</span>
        )}
      </div>
      <div className="lcars-panel__body">{children}</div>
    </div>
  );
}

function ItemList({ items, accentColor, emptyText }) {
  if (!items || items.length === 0) {
    return <div className="lcars-empty">{emptyText}</div>;
  }

  return (
    <div>
      {items.map((item, i) => (
        <div key={i} className="sidebar-item" style={{ '--accent-color': accentColor }}>
          <div className="sidebar-item__bullet" />
          <div>
            <div className="sidebar-item__text">{item.text}</div>
            {item.project && (
              <div className="sidebar-item__project">{item.project}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function GlobalPanel({ globalData, calendar, agents, loading }) {
  const waitingOnDavid = globalData?.waitingOnDavid || [];
  const blockers = globalData?.blockers || [];
  const whatChanged = globalData?.whatChangedToday || [];

  return (
    <>
      {/* Waiting on David */}
      <SidebarSection
        title="Waiting on David"
        accentColor="var(--lcars-gold)"
        badge={waitingOnDavid.length || null}
      >
        {loading ? (
          <div className="lcars-loading" style={{ fontSize: 10 }}>
            <div className="lcars-loading__bar"><div className="lcars-loading__progress" /></div>
          </div>
        ) : (
          <ItemList
            items={waitingOnDavid}
            accentColor="var(--lcars-gold)"
            emptyText="No items waiting"
          />
        )}
      </SidebarSection>

      {/* Blockers */}
      <SidebarSection
        title="Blockers"
        accentColor="var(--lcars-tomato)"
        badge={blockers.length || null}
      >
        {loading ? (
          <div className="lcars-loading" style={{ fontSize: 10 }}>
            <div className="lcars-loading__bar"><div className="lcars-loading__progress" /></div>
          </div>
        ) : (
          <ItemList
            items={blockers}
            accentColor="var(--lcars-tomato)"
            emptyText="No blockers — all systems nominal"
          />
        )}
      </SidebarSection>

      {/* What Changed Today */}
      <SidebarSection
        title="What Changed Today"
        accentColor="var(--lcars-ice)"
        badge={whatChanged.length || null}
      >
        {loading ? (
          <div className="lcars-loading" style={{ fontSize: 10 }}>
            <div className="lcars-loading__bar"><div className="lcars-loading__progress" /></div>
          </div>
        ) : (
          <ItemList
            items={whatChanged}
            accentColor="var(--lcars-ice)"
            emptyText="No changes detected today"
          />
        )}
      </SidebarSection>

      {/* Calendar */}
      <SidebarSection
        title="Upcoming"
        accentColor="var(--lcars-african-violet)"
      >
        <CalendarStrip events={calendar} loading={loading} />
      </SidebarSection>

      {/* Agent Status (compact) */}
      {agents && agents.length > 0 && (
        <SidebarSection
          title="Crew Status"
          accentColor="var(--lcars-moonlit-violet)"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {agents.map((agent) => (
              <AgentCard key={agent.name} agent={agent} compact />
            ))}
          </div>
        </SidebarSection>
      )}
    </>
  );
}
