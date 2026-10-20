# Repo skills

Agent skills for this repo live here, one folder per skill: `.cursor/skills/<name>/SKILL.md`, plus any helper `scripts/`. Cursor loads them by the `description` in the frontmatter, so the description should say when the skill applies.

## Turning a failure into a skill

Do this when an agent (or a person) makes a mistake that the repo could have prevented.

1. **Record what happened, from evidence.** Link the failing CI run, commit or PR. Only real incidents; no hypotheticals.
2. **Find the cause, not the symptom.** "The test was slow because the solver recomputed trig per sample" is a cause. "The timeout was too low" is a symptom.
3. **Pick the cheapest structure that prevents a repeat**, in this order:
   - a check (lint rule, type, test, CI step), if the mistake can be detected mechanically. A check enforces itself; a skill only advises.
   - a skill here, if it takes judgment: how to reproduce, what to look for, what not to do.
   - a line in `AGENTS.md`, if it is a one-line rule.
4. **Write an eval** in `evals/<skill-name>/` that replays the incident and checks the outcome (see `evals/README.md`). A skill without an eval is a guess about what helps.
5. **Name the origin** in the skill (commit or PR), so the next reader can judge whether it still applies.

## Skills

| Skill | Origin | Eval |
| --- | --- | --- |
| [ci-only-test-timeouts](ci-only-test-timeouts/SKILL.md) | CI on e254267: property tests timed out on the runner | [evals/ci-only-test-timeouts](../../evals/ci-only-test-timeouts/) |
