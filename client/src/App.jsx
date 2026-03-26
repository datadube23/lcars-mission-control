/**
 * LCARS Mission Control — Root App Component
 *
 * Handles:
 * - Passphrase gate (persisted to sessionStorage)
 * - View routing (projects, bridge)
 * - SSE connection for live updates
 * - Data fetching for all panels
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import SimplePassphraseGate from './components/SimplePassphraseGate.jsx';
import LCARSTopBar from './components/LCARSTopBar.jsx';
import LCARSBottomBar from './components/LCARSBottomBar.jsx';
import ProjectList from './components/ProjectList.jsx';
import ProjectDetail from './components/ProjectDetail.jsx';
import GlobalPanel from './components/GlobalPanel.jsx';
import BridgePanel from './components/BridgePanel.jsx';

// API helpers
const API = {
  async get(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${path}`);
    return res.json();
  },
  async post(path, body) {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  },
};

export default function App() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('lcars-authed') === '1');
  const [view, setView] = useState('projects'); // 'projects' | 'bridge'
  const [selectedProject, setSelectedProject] = useState(null);
  const [sseConnected, setSseConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Data state
  const [projects, setProjects] = useState([]);
  const [globalData, setGlobalData] = useState(null);
  const [calendar, setCalendar] = useState([]);
  const [agents, setAgents] = useState([]);
  const [tailscale, setTailscale] = useState(null);
  const [loading, setLoading] = useState(true);

  const sseRef = useRef(null);

  // ── Data Fetchers ────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [projData, globData, calData, agentData, tsData] = await Promise.allSettled([
        API.get('/api/projects'),
        API.get('/api/global'),
        API.get('/api/calendar'),
        API.get('/api/agents'),
        API.get('/api/tailscale'),
      ]);

      if (projData.status === 'fulfilled') setProjects(projData.value.projects || []);
      if (globData.status === 'fulfilled') setGlobalData(globData.value);
      if (calData.status === 'fulfilled') setCalendar(calData.value.events || []);
      if (agentData.status === 'fulfilled') setAgents(agentData.value.agents || []);
      if (tsData.status === 'fulfilled') setTailscale(tsData.value);
    } catch (err) {
      console.error('[app] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── SSE Connection ───────────────────────────────────────────────────────
  const connectSSE = useCallback(() => {
    if (sseRef.current) sseRef.current.close();

    const es = new EventSource('/events');
    sseRef.current = es;

    es.addEventListener('connected', () => setSseConnected(true));
    es.addEventListener('heartbeat', () => setSseConnected(true));
    es.addEventListener('workspace-change', (e) => {
      const data = JSON.parse(e.data);
      setLastUpdate(data.ts);
      // Re-fetch all data when workspace changes
      fetchAll();
    });

    es.onerror = () => {
      setSseConnected(false);
      // Retry in 5s
      setTimeout(connectSSE, 5000);
    };

    return es;
  }, [fetchAll]);

  // ── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authed) return;
    fetchAll();
    connectSSE();
    return () => {
      sseRef.current?.close();
    };
  }, [authed, fetchAll, connectSSE]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleAuth = (ok) => {
    if (ok) {
      sessionStorage.setItem('lcars-authed', '1');
      setAuthed(true);
    }
  };

  const handleProjectSelect = (project) => {
    setSelectedProject(project);
    setView('project-detail');
  };

  const handleBack = () => {
    setSelectedProject(null);
    setView('projects');
  };

  const handleNav = (newView) => {
    setSelectedProject(null);
    setView(newView);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (!authed) {
    return <SimplePassphraseGate onAuth={handleAuth} />;
  }

  const renderMain = () => {
    if (view === 'project-detail' && selectedProject) {
      return <ProjectDetail project={selectedProject} onBack={handleBack} />;
    }
    if (view === 'bridge') {
      return <BridgePanel agents={agents} tailscale={tailscale} />;
    }
    return <ProjectList projects={projects} loading={loading} onSelect={handleProjectSelect} />;
  };

  const statusText = loading
    ? 'SCANNING WORKSPACE...'
    : `${projects.length} PROJECTS • ${agents.filter((a) => a.status === 'online').length} AGENTS ONLINE`;

  return (
    <div className="lcars-app">
      <LCARSTopBar
        view={view}
        onNav={handleNav}
        sseConnected={sseConnected}
        lastUpdate={lastUpdate}
      />

      {/* Left elbow spacer */}
      <div className="lcars-left-elbow" />

      {/* Main content */}
      <main className="lcars-main">
        {renderMain()}
      </main>

      {/* Right sidebar — global command panels */}
      <aside className="lcars-sidebar">
        <GlobalPanel
          globalData={globalData}
          calendar={calendar}
          agents={agents}
          loading={loading}
        />
      </aside>

      <LCARSBottomBar
        statusText={statusText}
        lastUpdate={lastUpdate}
        projects={projects}
      />
    </div>
  );
}
