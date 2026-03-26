/**
 * ProjectList
 * Grid of ProjectCard components. The main view.
 */

import ProjectCard from './ProjectCard.jsx';

export default function ProjectList({ projects, loading, onSelect }) {
  if (loading && projects.length === 0) {
    return (
      <div style={{ padding: '24px 0' }}>
        <div className="lcars-section-heading">Project Registry</div>
        <div className="lcars-loading">
          <div className="lcars-loading__bar">
            <div className="lcars-loading__progress" />
          </div>
          Scanning workspace...
        </div>
      </div>
    );
  }

  if (!loading && projects.length === 0) {
    return (
      <div style={{ padding: '24px 0' }}>
        <div className="lcars-section-heading">Project Registry</div>
        <div className="lcars-empty">No projects found in workspace registry</div>
      </div>
    );
  }

  // Color accent cycling for variety
  const accentColors = [
    'var(--lcars-gold)',
    'var(--lcars-african-violet)',
    'var(--lcars-ice)',
    'var(--lcars-butterscotch)',
    'var(--lcars-moonlit-violet)',
    'var(--lcars-green-bright)',
  ];

  // Sort: P0 → P1 → P2 → P3, then by name
  const sorted = [...projects].sort((a, b) => {
    const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
    const pa = priorityOrder[a.priority] ?? 9;
    const pb = priorityOrder[b.priority] ?? 9;
    if (pa !== pb) return pa - pb;
    return a.name.localeCompare(b.name);
  });

  return (
    <div>
      <div className="lcars-section-heading">
        Project Registry
        <span
          style={{
            fontFamily: 'var(--font-lcars)',
            fontSize: 11,
            fontWeight: 700,
            padding: '2px 10px',
            background: 'var(--lcars-gold)',
            color: 'var(--lcars-bg)',
            borderRadius: 10,
            marginLeft: 8,
          }}
        >
          {projects.length}
        </span>
      </div>

      <div className="project-grid">
        {sorted.map((project, idx) => (
          <ProjectCard
            key={project.id}
            project={project}
            accentColor={accentColors[idx % accentColors.length]}
            onClick={() => onSelect(project)}
          />
        ))}
      </div>
    </div>
  );
}
