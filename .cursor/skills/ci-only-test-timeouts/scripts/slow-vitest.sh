#!/usr/bin/env bash
# Run vitest the way a slow CI runner does: pinned to one CPU core that SLOWDOWN busy loops also use,
# so every test takes about (SLOWDOWN + 1) times as long. Linux only (needs taskset).
#   SLOWDOWN=1 .cursor/skills/ci-only-test-timeouts/scripts/slow-vitest.sh src/themes/color
set -u
n=${SLOWDOWN:-1}
pids=()
for _ in $(seq "$n"); do taskset -c 0 sh -c 'while :; do :; done' & pids+=($!); done
taskset -c 0 ./node_modules/.bin/vitest run "$@"
rc=$?
kill "${pids[@]}" 2>/dev/null
exit $rc
