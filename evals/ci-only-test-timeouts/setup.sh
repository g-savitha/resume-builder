#!/usr/bin/env bash
# Create a trial worktree at the incident commit. Pass --with-skill to give the agent the repo skill.
#   evals/ci-only-test-timeouts/setup.sh /tmp/eval-ci-1 [--with-skill]
set -eu
dir=$1
repo=$(git rev-parse --show-toplevel)
git -C "$repo" worktree add --detach "$dir" e254267
if [ "${2:-}" = --with-skill ]; then
  mkdir -p "$dir/.cursor/skills"
  cp -r "$repo/.cursor/skills/ci-only-test-timeouts" "$dir/.cursor/skills/"
fi
(cd "$dir" && pnpm install --frozen-lockfile --silent)
echo "Trial ready in $dir. Give the agent evals/ci-only-test-timeouts/scenario.md (below the rule) with cwd $dir."
