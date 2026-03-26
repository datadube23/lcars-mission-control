/**
 * ProjectCard
 * LCARS-styled panel card for a single project.
 * Shows: key, name, status badge, priority, owner, last updated.
 */

function getStatusClass(status) {
  if (!status) return 'lcars-status--offline';
  const s = status.toLowerCase().replace(/\s+/g, '-');
  if (s.includes('active') || s.includes('in-process')) return 'lcars-status--active';
  if (s.includes('block')) return 'lcars-status--blocked';
  if (s.includes('wait') || s.includes('review') || s.includes('scop')) return 'lcars-status--waiting';
  if (s.includes('pause') || s.includes('not-start')) return 'lcars-status--paused';
  if (s.includes('done') || s.includes('complete')) return 'lcars-status--done';
  return 'lcars-status--offline';
}

function getPriorityClass(priority) {
  if (!priority) return 'lcars-priority--p3';
  const p = priority.toUpperCase();
  if (p === 'P0') return 'lcars-priority--p0';
  if (p === 'P1') return 'lcars-priority--p1';
  if (p === 'P2') return 'lcars-priority--p2';
  return 'lcars-priority--p3';
}

export default function ProjectCard({ project, accentColor, onClick }) {
  const { key, name, status, priority, owner, lastUpdated } = project;

  return (
    <div
      className="project-card"
      style={{ '--accent-color': accentColor }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      {/* Color accent bar at top */}
      <div className="project-card__accent-bar" />

      <div className="project-card__body">
        <div className="project-card__header">
          <div>
            <div className="project-card__key">{key}</div>
            <div className="project-card__name">{name}</div>
          </div>
          <div
            className={`lcars-priority ${getPriorityClass(priority)}`}
            title={`Priority: ${priority}`}
          >
            {priority || 'P?'}
          </div>
        </div>

        <div className="project-card__meta">
          <span className={`lcars-status ${getStatusClass(status)}`}>
            {status || 'Unknown'}
          </span>

          {owner && (
            <span className="project-card__owner">{owner}</span>
          )}

          {lastUpdated && (
            <span className="project-card__updated">{lastUpdated}</span>
          )}
        </div>
      </div>
    </div>
  );
}
