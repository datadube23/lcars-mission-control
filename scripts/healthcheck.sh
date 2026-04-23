#!/bin/bash
# LCARS health monitor — called by cron every 5 minutes
# Restarts via launchctl if the HTTP endpoint is unresponsive

LOG="/Users/data/lcars-mission-control/logs/healthcheck.log"
ENDPOINT="http://localhost:3001/api/projects"
LABEL="com.lcars.missioncontrol"

timestamp() { date '+%Y-%m-%d %H:%M:%S'; }

# Try the endpoint (5s timeout)
if curl -sf --max-time 5 "$ENDPOINT" > /dev/null 2>&1; then
    # Healthy — no action
    exit 0
fi

echo "[$(timestamp)] LCARS DOWN — restarting via launchctl" >> "$LOG"

# Kill any zombie node process on port 3001 first
ZOMBIE=$(lsof -ti:3001 2>/dev/null)
if [ -n "$ZOMBIE" ]; then
    echo "[$(timestamp)] killing zombie PID $ZOMBIE on port 3001" >> "$LOG"
    kill -9 $ZOMBIE 2>/dev/null
    sleep 2
fi

# Let launchctl handle the restart (KeepAlive will fire)
launchctl kickstart -k "gui/$(id -u)/$LABEL" >> "$LOG" 2>&1
sleep 5

# Verify recovery
if curl -sf --max-time 10 "$ENDPOINT" > /dev/null 2>&1; then
    echo "[$(timestamp)] LCARS recovered ✅" >> "$LOG"
else
    echo "[$(timestamp)] LCARS still down after restart attempt ⚠️" >> "$LOG"
fi
