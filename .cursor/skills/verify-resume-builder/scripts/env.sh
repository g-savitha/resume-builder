# Shared settings for the verify-resume-builder helpers. Source it; do not run it.
# One instance per VERIFY_RUN_DIR + VERIFY_PORT pair. Give each concurrent run its own pair.
SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPTS_DIR/../../../.." && pwd)"
VERIFY_PORT="${VERIFY_PORT:-5199}"
VERIFY_RUN_DIR="${VERIFY_RUN_DIR:-/tmp/verify-resume-builder-$VERIFY_PORT}"
VERIFY_URL="http://127.0.0.1:$VERIFY_PORT"
PID_FILE="$VERIFY_RUN_DIR/server.pid"
LOG_FILE="$VERIFY_RUN_DIR/server.log"
export REPO_ROOT VERIFY_PORT VERIFY_RUN_DIR VERIFY_URL
