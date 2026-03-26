# 🖖 LCARS Mission Control

> *"All systems nominal, Commander."*

A Star Trek TNG-themed command center dashboard for David. One screen to rule the whole operation — projects, tasks, agents, blockers, and calendar — styled as the Library Computer Access/Retrieval System from *Star Trek: The Next Generation*.

![LCARS Mission Control](docs/screenshot.png)

---

## What It Is

LCARS Mission Control is a personal dashboard for the MR_DATA agent fleet. It reads from your OpenClaw workspace markdown files (no separate database) and presents everything in a beautiful, authentic LCARS UI.

**Phase 1 (this build):**
- Project registry from workspace markdown files
- Global command panels: Waiting on David, Blockers, What Changed Today
- Calendar strip via icalBuddy
- Agent roster (Data + Worf)
- Tailscale network status
- Live updates via SSE (file watcher → push)
- Passphrase auth gate
- PWA — add to iPad home screen

**Future phases:** Agent controls, daily standup engine, full task management, knowledge surface.

---

## Setup

### Prerequisites

- Node.js 18+
- macOS (for icalBuddy integration — optional on other platforms)
- Tailscale installed (optional, for network view)

### Install

```bash
git clone https://github.com/datadube23/lcars-mission-control.git
cd lcars-mission-control
npm install
```

### Configure

Copy the example env file:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Path to your OpenClaw workspace
WORKSPACE_PATH=/Users/data/.openclaw/workspace

# Server port
PORT=3001

# Dashboard passphrase (change this!)
PASSPHRASE=enterprise
```

### Run (Development)

```bash
npm run dev
```

This starts both the Fastify backend (port 3001) and the Vite dev server (port 5173) concurrently.

Open: http://localhost:5173

### Build (Production)

```bash
npm run build
npm start
```

The production build serves the frontend from Fastify at http://localhost:3001.

---

## Deploying via Tailscale Funnel

LCARS Mission Control is designed to run on your always-on M4 and be accessible anywhere — including your iPad — via Tailscale Funnel.

### 1. Build for production

```bash
npm run build
```

### 2. Start the server

```bash
npm start
```

### 3. Enable Tailscale Funnel

```bash
tailscale funnel 3001
```

Your dashboard is now accessible at:
```
https://datas-macbook-air.tail79a141.ts.net/
```

### 4. Add to iPad home screen

1. Open Safari on your iPad
2. Navigate to your Tailscale Funnel URL
3. Tap Share → Add to Home Screen
4. Name it "LCARS Mission Control"
5. It will open full-screen in landscape mode like a native app

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `WORKSPACE_PATH` | `/Users/data/.openclaw/workspace` | Path to your OpenClaw workspace |
| `PORT` | `3001` | Backend server port |
| `PASSPHRASE` | `enterprise` | Dashboard access passphrase |

---

## Architecture

```
lcars-mission-control/
├── src/
│   └── server.js          # Fastify backend
├── client/
│   ├── src/
│   │   ├── main.jsx       # React entry
│   │   ├── App.jsx        # Root component + passphrase gate
│   │   ├── lcars.css      # LCARS design system
│   │   └── components/    # All UI components
│   ├── index.html
│   └── public/
│       ├── manifest.json  # PWA manifest
│       └── sw.js          # Service worker
└── package.json
```

**Data flow:**
1. Fastify reads workspace markdown files on request
2. chokidar watches workspace for changes
3. Changes trigger SSE push to connected clients
4. React frontend subscribes to SSE and refreshes data

**No database.** Workspace markdown files are the source of truth.

---

## Project Structure (Workspace)

The dashboard reads from:
- `$WORKSPACE_PATH/projects/INDEX.md` — project list
- `$WORKSPACE_PATH/projects/_ops/PROJECT-REGISTRY.md` — project registry with keys/status
- `$WORKSPACE_PATH/projects/<name>/STATUS.md` — per-project status
- `$WORKSPACE_PATH/projects/<name>/ACTIVE-CONTEXT.md` — current context
- `$WORKSPACE_PATH/projects/<name>/TASKS.md` — tasks
- `$WORKSPACE_PATH/projects/<name>/DECISIONS.md` — decision log
- `$WORKSPACE_PATH/projects/mission-control-dashboard/AGENT-ROSTER.md` — agent definitions

---

*LCARS Mission Control — Phase 1 MVP*  
*Built by MR_DATA for David Dube*  
*"The bridge crew and the network they run on are the same operational picture."*
