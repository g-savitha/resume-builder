#!/usr/bin/env bash
# Stop the server this skill started (its process group only) and drop scratch state. Evidence is kept.
set -euo pipefail
source "$(dirname "$0")/env.sh"
if [[ -f "$PID_FILE" ]]; then
  pid="$(cat "$PID_FILE")"
  if kill -0 "$pid" 2>/dev/null; then
    kill -TERM -- "-$pid" 2>/dev/null || true
    for _ in $(seq 10); do kill -0 "$pid" 2>/dev/null || break; sleep 0.5; done
    kill -0 "$pid" 2>/dev/null && kill -KILL -- "-$pid" 2>/dev/null || true
  fi
fi
rm -rf "$VERIFY_RUN_DIR"
echo "Stopped. Evidence kept in $REPO_ROOT/e2e/.artifacts/verify/."
