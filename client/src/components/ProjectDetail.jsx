/**
 * ProjectDetail
 * Per-project drill-down view.
 * Shows: Active Context, Tasks, Decisions tabs.
 * Renders markdown as formatted content.
 */

import { useState, useEffect } from 'react';

const TABS = ['active-context', 'tasks', 'decisions', 'status'];
const TAB_LABELS = {
  'active-context': 'Active Context',
  tasks: 'Tasks',
  decisions: 'Decisions',
  status: 'Status',
};

/**
 * Simple markdown → HTML renderer.
 * Handles headings, bold, code, lists, tables, links.
 * Not a full parser — good enough for workspace markdown.
 */
function renderMarkdown(md) {
  if (!md) return '<p class="lcars-empty">No content found.</p>';

  let html = md
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headings
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold / italic
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    // Checkboxes
    .replace(/^- \[x\] (.+)$/gm, '<li style="color:var(--lcars-green-bright)">✓ $1</li>')
    .replace(/^- \[ \] (.+)$/gm, '<li>☐ $1</li>')
    // Unordered lists
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Horizontal rule
    .replace(/^---+$/gm, '<hr style="border-color:var(--lcars-panel-border);margin:12px 0">')
    // Paragraphs (double newline)
    .replace(/\n\n/g, '</p><p>')
    // Single newlines
    .replace(/\n/g, '<br>');

  // Wrap list items in ul
  html = html.replace(/(<li>.*?<\/li>)(\s*<br>)*/gs, (m) => `<ul>${m.replace(/<br>/g, '')}</ul>`);

  return `<p>${html}</p>`;
}

export default function ProjectDetail({ project, onBack }) {
  const [activeTab, setActiveTab] = useState('active-context');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!project) return;
    setLoading(true);
    fetch(`/api/project/${project.id}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [project?.id]);

  const getContent = (tab) => {
    if (!data?.files) return null;
    switch (tab) {
      case 'active-context': return data.files.activeContext;
      case 'tasks': return data.files.tasks;
      case 'decisions': return data.files.decisions;
      case 'status': return data.files.status;
      default: return null;
    }
  };

  return (
    <div>
      {/* Back button */}
      <button className="project-detail__back" onClick={onBack}>
        ← Projects
      </button>

      {/* Project header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span
            style={{
              fontFamily: 'var(--font-lcars)',
              fontSize: 'var(--text-meta)',
              letterSpacing: '0.2em',
              color: 'var(--lcars-gray)',
              textTransform: 'uppercase',
            }}
          >
            {project.key}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-lcars)',
              fontSize: 'var(--text-body)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--lcars-space-white)',
            }}
          >
            {project.name}
          </span>
          <span className={`lcars-status lcars-status--${project.status?.toLowerCase().replace(/\s+/g, '-') || 'offline'}`}>
            {project.status}
          </span>
          <span className={`lcars-priority lcars-priority--${project.priority?.toLowerCase() || 'p3'}`}>
            {project.priority}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="project-detail__tabs">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`project-detail__tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Content */}
      <div
        className="lcars-panel"
        style={{ padding: '16px 20px', minHeight: 200 }}
      >
        {loading ? (
          <div className="lcars-loading">
            <div className="lcars-loading__bar">
              <div className="lcars-loading__progress" />
            </div>
            Loading...
          </div>
        ) : (
          <div
            className="markdown-content"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(getContent(activeTab)) }}
          />
        )}
      </div>
    </div>
  );
}
