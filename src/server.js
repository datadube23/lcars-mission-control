/**
 * LCARS Mission Control — Fastify Backend
 *
 * Data layer: reads OpenClaw workspace markdown files.
 * No database — markdown IS the database.
 *
 * Routes:
 *   GET /api/projects         — project list from INDEX.md + PROJECT-REGISTRY.md
 *   GET /api/project/:id      — per-project detail (ACTIVE-CONTEXT, TASKS, DECISIONS)
 *   GET /api/global           — aggregated Waiting-on-David, Blockers, What-Changed-Today
 *   GET /api/calendar         — icalBuddy events (today + 2 days)
 *   GET /api/agents           — agent roster from AGENT-ROSTER.md
 *   GET /api/tailscale        — tailscale status --json
 *   GET /events               — SSE stream (file watcher push)
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import staticFiles from '@fastify/static';
import { readFile, readdir, access } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import chokidar from 'chokidar';

const execAsync = promisify(exec);
const __dirname = fileURLToPath(new URL('.', import.meta.url));

// ─── Config ────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3001', 10);
const WORKSPACE = process.env.WORKSPACE_PATH || '/Users/data/.openclaw/workspace';
const PASSPHRASE = process.env.PASSPHRASE || 'enterprise';
const DIST_DIR = resolve(__dirname, '../dist');
const PROJECTS_DIR = join(WORKSPACE, 'projects');

// ─── SSE Clients ───────────────────────────────────────────────────────────
const sseClients = new Set();

function broadcastSSE(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.raw.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

// ─── File Watcher ──────────────────────────────────────────────────────────
function startFileWatcher() {
  const watcher = chokidar.watch(PROJECTS_DIR, {
    ignored: /node_modules|\.git/,
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
  });

  watcher.on('change', (filePath) => {
    console.log(`[watcher] changed: ${filePath}`);
    broadcastSSE('workspace-change', { path: filePath, ts: Date.now() });
  });

  watcher.on('add', (filePath) => {
    broadcastSSE('workspace-change', { path: filePath, ts: Date.now() });
  });

  watcher.on('unlink', (filePath) => {
    broadcastSSE('workspace-change', { path: filePath, ts: Date.now() });
  });

  console.log(`[watcher] watching ${PROJECTS_DIR}`);
  return watcher;
}

// ─── Markdown Helpers ──────────────────────────────────────────────────────

async function readMarkdownFile(filePath) {
  try {
    return await readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse PROJECT-REGISTRY.md markdown table into an array of project objects.
 * Table format: | Key | Project | Status | Owner | Priority | Workspace Path |
 */
function parseProjectRegistry(markdown) {
  if (!markdown) return [];
  const lines = markdown.split('\n');
  const projects = [];

  for (const line of lines) {
    // Skip header rows, separator rows, empty lines
    if (!line.startsWith('|') || line.includes('---') || line.includes('Key |')) continue;

    const cells = line.split('|').map((c) => c.trim()).filter(Boolean);
    if (cells.length < 5) continue;

    const [key, name, status, owner, priority, workspacePath] = cells;
    if (!key || !name || key === 'Key') continue;

    projects.push({
      id: key.toLowerCase(),
      key,
      name,
      status,
      owner,
      priority,
      workspacePath: workspacePath || `projects/${key.toLowerCase()}/`,
    });
  }

  return projects;
}

/**
 * Parse a TASKS.md for Waiting-on-David and Blocker items.
 *
 * Sections are identified by headings like "## Waiting on David" or "## Blockers".
 * Items in those sections (checkbox list items) are collected.
 * Also picks up inline markers like [WAITING], [BLOCKED], ⏳, 🚫.
 */
function parseTasksForFlags(markdown, projectKey) {
  if (!markdown) return { waitingOnDavid: [], blockers: [] };

  const lines = markdown.split('\n');
  const waitingOnDavid = [];
  const blockers = [];

  let inWaitingSection = false;
  let inBlockerSection = false;

  for (const line of lines) {
    const lower = line.toLowerCase();
    const trimmed = line.trim();

    // Detect section headings
    if (/^#{1,3}\s/.test(trimmed)) {
      inWaitingSection = lower.includes('waiting on david') || lower.includes('waiting on');
      inBlockerSection = lower.includes('blocker') || lower.includes('blocked');
      continue;
    }

    // Extract task text from checkbox or bullet
    const isTask = /^[-*]\s*\[.\]\s*/.test(trimmed) || /^[-*]\s+/.test(trimmed);
    if (!isTask) continue;

    const clean = trimmed
      .replace(/^[-*]\s*\[.\]\s*/, '')
      .replace(/^[-*]\s+/, '')
      .trim();

    if (!clean || clean.length < 3) continue;

    if (
      inWaitingSection ||
      lower.includes('waiting on david') ||
      lower.includes('[waiting]') ||
      lower.includes('⏳')
    ) {
      waitingOnDavid.push({ text: clean, project: projectKey });
    } else if (
      inBlockerSection ||
      lower.includes('[blocked]') ||
      lower.includes('🚫')
    ) {
      blockers.push({ text: clean, project: projectKey });
    }
  }

  return { waitingOnDavid, blockers };
}

/**
 * Detect "what changed today" from a TASKS.md or ACTIVE-CONTEXT.md.
 * Looks for today's date or "today" mentions.
 */
function parseWhatChangedToday(markdown, projectKey) {
  if (!markdown) return [];

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const lines = markdown.split('\n');
  const changed = [];

  for (const line of lines) {
    if (line.includes(today) || line.toLowerCase().includes('today') || line.toLowerCase().includes('just completed')) {
      const clean = line.replace(/^[-*#]+\s*/, '').trim();
      if (clean && clean.length > 5) {
        changed.push({ text: clean, project: projectKey });
      }
    }
  }

  return changed;
}

/**
 * Parse AGENT-ROSTER.md into agent objects.
 * Expected format: ## Agent Name sections with key: value pairs.
 */
function parseAgentRoster(markdown) {
  if (!markdown) return [];

  const agents = [];
  const sections = markdown.split(/^## /m).filter(Boolean);

  for (const section of sections) {
    const lines = section.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;

    const name = lines[0].replace(/^#+\s*/, '').trim();
    if (!name || name === 'Agent Roster') continue;

    const agent = { name, lastSeen: null, status: 'offline', model: 'unknown', machine: 'unknown', color: '#ffaa00' };

    for (const line of lines.slice(1)) {
      const [key, ...rest] = line.split(':');
      const val = rest.join(':').trim();
      const k = key.trim().toLowerCase().replace(/[^a-z]/g, '');

      if (k === 'model') agent.model = val;
      if (k === 'machine') agent.machine = val;
      if (k === 'status') agent.status = val.toLowerCase();
      if (k === 'color') agent.color = val;
      if (k === 'lastseen') agent.lastSeen = val;
      if (k === 'personality') agent.personality = val;
    }

    agents.push(agent);
  }

  return agents;
}

/**
 * Parse icalBuddy output into calendar event objects.
 *
 * icalBuddy output format:
 *   today:
 *   ------------------------
 *   • Event Title
 *       location: Some Place
 *       6:00 PM - 7:00 PM
 *   tomorrow:
 *   • Another Event
 *       10:00 AM - 11:00 AM
 */
function parseIcalBuddyOutput(output) {
  if (!output) return [];

  const events = [];
  const lines = output.split('\n');
  let currentEvent = null;
  let currentDay = 'today';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.match(/^-+$/)) continue;

    // Day header lines: "today:", "tomorrow:", "day after tomorrow:", etc.
    if (/^(today|tomorrow|day after tomorrow|\w+day):?$/i.test(trimmed)) {
      currentDay = trimmed.replace(/:$/, '').toLowerCase();
      continue;
    }

    // Event title — starts with bullet "• "
    if (trimmed.startsWith('•')) {
      if (currentEvent) events.push(currentEvent);
      currentEvent = {
        title: trimmed.replace(/^•\s*/, '').trim(),
        time: null,
        location: null,
        calendar: null,
        day: currentDay,
      };
      continue;
    }

    // Sub-lines (indented) — time, location, calendar
    if (currentEvent && line.startsWith('    ')) {
      // Time pattern: "6:00 PM - 7:00 PM" or "10:00 AM - 12:00 PM"
      if (/\d{1,2}:\d{2}\s*(AM|PM)/i.test(trimmed) && !trimmed.startsWith('location:')) {
        currentEvent.time = trimmed;
      }
      // Location
      if (trimmed.toLowerCase().startsWith('location:')) {
        currentEvent.location = trimmed.replace(/^location:\s*/i, '');
      }
      // Calendar
      if (trimmed.toLowerCase().startsWith('calendar:')) {
        currentEvent.calendar = trimmed.replace(/^calendar:\s*/i, '');
      }
    }
  }

  if (currentEvent) events.push(currentEvent);

  return events;
}

// ─── Fastify App ──────────────────────────────────────────────────────────

const app = Fastify({ logger: { level: 'warn' } });

await app.register(cors, { origin: true });

// Serve production build if dist/ exists
try {
  await access(DIST_DIR);
  await app.register(staticFiles, {
    root: DIST_DIR,
    prefix: '/',
    decorateReply: false,
  });
  console.log(`[static] serving from ${DIST_DIR}`);
} catch {
  console.log('[static] no dist/ found — running in dev mode (use npm run dev)');
}

// ─── Passphrase Verification ──────────────────────────────────────────────
app.post('/api/auth', async (req, reply) => {
  const { passphrase } = req.body || {};
  if (passphrase === PASSPHRASE) {
    return reply.send({ ok: true });
  }
  return reply.code(401).send({ ok: false, error: 'Invalid passphrase' });
});

// ─── Projects ─────────────────────────────────────────────────────────────
app.get('/api/projects', async (req, reply) => {
  const registryPath = join(PROJECTS_DIR, '_ops', 'PROJECT-REGISTRY.md');
  const indexPath = join(PROJECTS_DIR, 'INDEX.md');

  const [registryMd, indexMd] = await Promise.all([
    readMarkdownFile(registryPath),
    readMarkdownFile(indexPath),
  ]);

  const projects = parseProjectRegistry(registryMd);

  // Enrich each project with its STATUS.md
  const enriched = await Promise.all(
    projects.map(async (proj) => {
      const projectDir = join(WORKSPACE, proj.workspacePath);
      const statusMd = await readMarkdownFile(join(projectDir, 'STATUS.md'));

      // Parse last updated from STATUS.md
      let lastUpdated = null;
      if (statusMd) {
        const dateMatch = statusMd.match(/\d{4}-\d{2}-\d{2}/);
        if (dateMatch) lastUpdated = dateMatch[0];
      }

      return { ...proj, lastUpdated, hasStatus: !!statusMd };
    })
  );

  return reply.send({ projects: enriched, source: { registry: !!registryMd, index: !!indexMd } });
});

// ─── Project Detail ────────────────────────────────────────────────────────
app.get('/api/project/:id', async (req, reply) => {
  const { id } = req.params;

  // Find project in registry
  const registryPath = join(PROJECTS_DIR, '_ops', 'PROJECT-REGISTRY.md');
  const registryMd = await readMarkdownFile(registryPath);
  const projects = parseProjectRegistry(registryMd);
  const project = projects.find((p) => p.id === id || p.key.toLowerCase() === id);

  if (!project) {
    return reply.code(404).send({ error: `Project '${id}' not found` });
  }

  const projectDir = join(WORKSPACE, project.workspacePath);

  const [activeContext, tasks, decisions, status, overview] = await Promise.all([
    readMarkdownFile(join(projectDir, 'ACTIVE-CONTEXT.md')),
    readMarkdownFile(join(projectDir, 'TASKS.md')),
    readMarkdownFile(join(projectDir, 'DECISIONS.md')),
    readMarkdownFile(join(projectDir, 'STATUS.md')),
    readMarkdownFile(join(projectDir, 'OVERVIEW.md')),
  ]);

  return reply.send({
    project,
    files: {
      activeContext,
      tasks,
      decisions,
      status,
      overview,
    },
  });
});

// ─── Global Command Panel ──────────────────────────────────────────────────
app.get('/api/global', async (req, reply) => {
  // Get all project directories
  let projectDirs = [];
  try {
    const entries = await readdir(PROJECTS_DIR, { withFileTypes: true });
    projectDirs = entries
      .filter((e) => e.isDirectory() && !e.name.startsWith('_') && !e.name.startsWith('.'))
      .map((e) => ({ name: e.name, path: join(PROJECTS_DIR, e.name) }));
  } catch {
    // workspace projects dir not accessible
  }

  const waitingOnDavid = [];
  const blockers = [];
  const whatChangedToday = [];

  for (const { name, path: dir } of projectDirs) {
    const [tasksMd, contextMd] = await Promise.all([
      readMarkdownFile(join(dir, 'TASKS.md')),
      readMarkdownFile(join(dir, 'ACTIVE-CONTEXT.md')),
    ]);

    const flags = parseTasksForFlags(tasksMd, name);
    waitingOnDavid.push(...flags.waitingOnDavid);
    blockers.push(...flags.blockers);

    const changed = parseWhatChangedToday(contextMd || tasksMd, name);
    whatChangedToday.push(...changed);
  }

  return reply.send({ waitingOnDavid, blockers, whatChangedToday });
});

// ─── Calendar ──────────────────────────────────────────────────────────────
app.get('/api/calendar', async (req, reply) => {
  try {
    const { stdout } = await execAsync(
      '/opt/homebrew/bin/icalBuddy -n -nc -b "• " -sd -iep "title,datetime,location" eventsToday+2',
      { timeout: 10000 }
    );
    const events = parseIcalBuddyOutput(stdout);
    return reply.send({ events, raw: stdout });
  } catch (err) {
    // icalBuddy not available or failed
    return reply.send({ events: [], error: err.message, raw: '' });
  }
});

// ─── Agents ────────────────────────────────────────────────────────────────
app.get('/api/agents', async (req, reply) => {
  const rosterPath = join(PROJECTS_DIR, 'mission-control-dashboard', 'AGENT-ROSTER.md');

  // Create AGENT-ROSTER.md if it doesn't exist
  const exists = await fileExists(rosterPath);
  if (!exists) {
    const defaultRoster = getDefaultAgentRoster();
    try {
      const { writeFile } = await import('fs/promises');
      await writeFile(rosterPath, defaultRoster, 'utf8');
      console.log('[agents] created default AGENT-ROSTER.md');
    } catch (e) {
      console.error('[agents] failed to create roster:', e.message);
    }
  }

  const rosterMd = await readMarkdownFile(rosterPath);
  const agents = parseAgentRoster(rosterMd);

  return reply.send({ agents, raw: rosterMd });
});

function getDefaultAgentRoster() {
  return `# Agent Roster

The active crew of the MR_DATA fleet.

---

## Data

- Status: online
- Model: claude-sonnet-4-6
- Machine: datas-macbook-air (M4, Nashville)
- Color: #ffaa00
- Personality: Precise, analytical, formal. Logical to a fault. Named after the android from Star Trek TNG.
- Skills: discord, himalaya, github, gh-issues, obsidian, weather, coding-agent, skill-creator
- Last Seen: ${new Date().toISOString().split('T')[0]}

---

## Worf

- Status: offline
- Model: claude-sonnet-4-6
- Machine: worf-linux (Lennox, pending setup)
- Color: #cc4444
- Personality: Terse, direct, tactical. Security-minded. Not one for small talk.
- Skills: pending-install
- Last Seen: never

---

*Updated by MR_DATA | ${new Date().toISOString().split('T')[0]}*
`;
}

// ─── Tailscale ─────────────────────────────────────────────────────────────
app.get('/api/tailscale', async (req, reply) => {
  try {
    // Try Tailscale in common macOS/Linux locations
    const tsCandidates = [
      '/Applications/Tailscale.app/Contents/MacOS/Tailscale',
      '/usr/local/bin/tailscale',
      '/usr/bin/tailscale',
      'tailscale',
    ].join(' || ');
    const { stdout } = await execAsync(
      `( /Applications/Tailscale.app/Contents/MacOS/Tailscale status --json 2>/dev/null ) || tailscale status --json`,
      { timeout: 8000 }
    );
    const data = JSON.parse(stdout);

    // Normalize the peer list into a flat array
    const self = data.Self
      ? [{
          id: 'self',
          hostname: data.Self.HostName || data.Self.DNSName,
          ip: data.Self.TailscaleIPs?.[0] || 'unknown',
          online: true,
          os: data.Self.OS,
          isSelf: true,
        }]
      : [];

    const peers = Object.entries(data.Peer || {}).map(([key, peer]) => ({
      id: key,
      hostname: peer.HostName || peer.DNSName || key,
      ip: peer.TailscaleIPs?.[0] || 'unknown',
      online: peer.Online || false,
      os: peer.OS,
      lastSeen: peer.LastSeen,
      isSelf: false,
    }));

    return reply.send({ nodes: [...self, ...peers], raw: data });
  } catch (err) {
    return reply.send({ nodes: [], error: err.message });
  }
});

// ─── SSE Endpoint ──────────────────────────────────────────────────────────
app.get('/events', async (req, reply) => {
  const res = reply.raw;
  const req_ = req.raw;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  // Send initial connected event
  res.write('event: connected\ndata: {"ts":' + Date.now() + '}\n\n');

  sseClients.add(reply);

  // Heartbeat every 30s to keep connection alive
  const heartbeat = setInterval(() => {
    try {
      res.write('event: heartbeat\ndata: {"ts":' + Date.now() + '}\n\n');
    } catch {
      clearInterval(heartbeat);
      sseClients.delete(reply);
    }
  }, 30000);

  req_.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(reply);
  });

  // Keep the handler alive (don't return)
  await new Promise(() => {});
});

// Fallback — serve index.html for SPA routes (only if dist exists)
app.setNotFoundHandler(async (req, reply) => {
  const indexPath = join(DIST_DIR, 'index.html');
  if (req.url.startsWith('/api') || req.url === '/events') {
    return reply.code(404).send({ error: 'Not found' });
  }
  try {
    const html = await readFile(indexPath, 'utf8');
    return reply.type('text/html').send(html);
  } catch {
    return reply.code(404).send({ error: 'Not found — run npm run build first' });
  }
});

// ─── Start ─────────────────────────────────────────────────────────────────
startFileWatcher();

try {
  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`\n🖖 LCARS Mission Control — Backend Online`);
  console.log(`   Port:      ${PORT}`);
  console.log(`   Workspace: ${WORKSPACE}`);
  console.log(`   SSE:       http://localhost:${PORT}/events`);
  console.log(`   API:       http://localhost:${PORT}/api/projects\n`);
} catch (err) {
  console.error('Failed to start server:', err);
  process.exit(1);
}
