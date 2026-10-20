# Evals

Each eval replays one real incident to check that the matching repo skill actually helps an agent avoid it.

```
evals/<skill-name>/
  scenario.md   the task the agent gets, and the commit it starts from. The agent sees only this.
  setup.sh      makes a trial worktree at that commit; --with-skill copies the skill in
  check.mjs     the hidden expected check. Exit 0 = pass. Never shown to the agent.
```

`check.mjs` checks outcomes, not the steps taken. It also rejects the shortcuts the skill warns against: lost coverage, changed expected values, timeouts raised instead of a real fix. Before trusting a check, run it against the incident commit (must fail), the real fix (must pass) and at least one known shortcut (must fail).

## Running a trial

```bash
evals/ci-only-test-timeouts/setup.sh /tmp/eval-1 --with-skill    # omit --with-skill for the baseline
# give a fresh agent the scenario text, with /tmp/eval-1 as its workspace; let it finish
node evals/ci-only-test-timeouts/check.mjs /tmp/eval-1
git worktree remove --force /tmp/eval-1
```

Run 5 trials with the skill and 5 without. **Target: at least 4/5 with the skill, and better than without it.** If the target is missed, read the failing trials and fix the skill (or turn it into a check). Don't loosen `check.mjs`.

| Eval | Validated against | With skill | Without |
| --- | --- | --- | --- |
| ci-only-test-timeouts | e254267 fails; 38d5c3f passes; global `testTimeout`, 10k→2k runs and a changed expected hex all fail | not run yet | not run yet |
