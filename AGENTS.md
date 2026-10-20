# AGENTS.md

How to change this repo and prove the change works. Read `README.md` for setup and `docs/design/` for the design.

## Before you say "done"

1. `pnpm check` passes (typecheck, lint, unit + axe tests, build, size budget). For UI or editor changes, `pnpm e2e` passes too. For anything on the typing path, `pnpm bench` passes.
2. For any user-visible change, drive it the way a user would with the verify skill: `.cursor/skills/verify-resume-builder/SKILL.md`. Launch, Doctor, drive the journey for the feature you touched, keep the evidence, then Cleanup.
3. Report what you ran and what you saw: the commands, their result lines (`VERIFIED …`, test counts, sizes) and the evidence paths or screenshots. "Should work" or "looks right" is not a result. If you could not verify something, say so and say why.
4. GitHub CI (`check`) must be green on the PR: `gh pr checks <n>`. Local green is not enough.

## Where things are

- **Verify skill and feature map:** `.cursor/skills/verify-resume-builder/`. `features/` describes each editor feature, how a user reaches it and how to drive it. `features/README.md` lists the data hooks (`data-app-state`, `save-status`, `data-drag-state`, `data-row-label`). Wait on those, never on a fixed sleep or a CSS class. When the app and the map disagree, fix the map in the same PR.
- **Repo skills:** `.cursor/skills/`. When you hit a mistake the repo could have prevented, follow the failure-to-skill steps in `.cursor/skills/README.md`.
- **Evals for those skills:** `evals/`. The format, how to run a trial, and the pass-rate target are in `evals/README.md`.
- **Checks:** `docs/checks.md` lists every lint, type and CI rule with its fix. When a check fires, fix the code. Don't disable the rule. If you really must disable one, add a `-- reason`.
- **Architecture:** a module imports another only as `@/<module>`, along the arrows in `docs/design/module-map.md`. Lint enforces this.

## How to work

- **Keep PRs small: one change per PR**, with a title that names that one thing. Split unrelated changes. Stack a PR on another only for a real dependency, and say so in the PR body.
- **Start local, then go to the cloud.** Get the verify skill passing locally first, and watch a few runs end to end. Fix each place where you get stuck, in the skill or the feature map. Only then hand the same skill to cloud agents or automations.
- Never commit changes you didn't make (for example, someone's uncommitted local edits). Never merge your own PR.
