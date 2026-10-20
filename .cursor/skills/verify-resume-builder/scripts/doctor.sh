#!/usr/bin/env bash
# Read-only health check: is this instance ours, serving this checkout, and usable in a browser?
set -euo pipefail
source "$(dirname "$0")/env.sh"
fail() { echo "DOCTOR FAIL: $*" >&2; exit 1; }

[[ -f "$PID_FILE" ]] || fail "no $PID_FILE. Run launch.sh."
pid="$(cat "$PID_FILE")"
kill -0 "$pid" 2>/dev/null || fail "server pid $pid is not running. Run cleanup.sh, then launch.sh."
listener="$(ss -ltnpH "sport = :$VERIFY_PORT" 2>/dev/null | grep -o 'pid=[0-9]*' | head -1 | cut -d= -f2 || true)"
[[ -n "$listener" ]] || fail "nothing listens on :$VERIFY_PORT."
[[ "$(ps -o pgid= -p "$listener" | tr -d ' ')" == "$pid" ]] || fail "port $VERIFY_PORT is held by pid $listener, not by our server group $pid."
[[ "$(readlink "/proc/$listener/cwd")" == "$REPO_ROOT" ]] || fail "server runs from $(readlink "/proc/$listener/cwd"), not this checkout ($REPO_ROOT)."

echo "url=$VERIFY_URL pid=$pid rev=$(git -C "$REPO_ROOT" rev-parse --short HEAD)$(git -C "$REPO_ROOT" diff --quiet || echo '+dirty')"
# Usable, not just answering: the editor renders and the saved (or seeded) resume has loaded.
node "$SCRIPTS_DIR/drive.mjs" ready --out "$VERIFY_RUN_DIR/doctor"
