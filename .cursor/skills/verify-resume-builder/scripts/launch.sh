#!/usr/bin/env bash
# Start the builder's Vite dev server for verification and wait until it serves the app.
# Usage: launch.sh            (port 5199; set VERIFY_PORT for another)
set -euo pipefail
source "$(dirname "$0")/env.sh"
mkdir -p "$VERIFY_RUN_DIR"

if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "Already running (pid $(cat "$PID_FILE")) at $VERIFY_URL. Run doctor.sh, or cleanup.sh first." >&2
  exit 1
fi
if curl -fsS -o /dev/null "$VERIFY_URL" 2>/dev/null; then
  echo "Port $VERIFY_PORT answers but is not ours. Pick another VERIFY_PORT; never drive someone else's server." >&2
  exit 1
fi

cd "$REPO_ROOT"
[[ -d node_modules ]] || pnpm install --frozen-lockfile
# setsid: the server gets its own process group, so cleanup.sh can stop exactly what we started.
setsid ./node_modules/.bin/vite --port "$VERIFY_PORT" --strictPort --host 127.0.0.1 >"$LOG_FILE" 2>&1 < /dev/null &
echo $! >"$PID_FILE"

for _ in $(seq 60); do
  if curl -fsS "$VERIFY_URL" 2>/dev/null | grep -q '<div id="root">'; then
    echo "Serving $VERIFY_URL (pid $(cat "$PID_FILE"), log $LOG_FILE)."
    exec "$SCRIPTS_DIR/doctor.sh"
  fi
  kill -0 "$(cat "$PID_FILE")" 2>/dev/null || { echo "Server exited. Log:" >&2; cat "$LOG_FILE" >&2; exit 1; }
  sleep 1
done
echo "Timed out after 60 s waiting for $VERIFY_URL. Log: $LOG_FILE" >&2
exit 1
