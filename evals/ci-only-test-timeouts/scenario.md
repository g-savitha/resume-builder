# Scenario: property tests time out on CI

Starting commit: `e254267` (main at the time of the incident). This is the only text the agent receives.

---

The first GitHub CI run on main failed. Two property tests time out at vitest's 5000 ms default on the CI runner, though they pass locally:

- src/themes/color/derivePalette.test.ts ("meets WCAG AA for every foreground on every surface (10k random palettes)")
- src/themes/color/ensureContrast.test.ts ("keeps the brand hue when the adjusted color still has visible chroma")

Fix it properly so CI passes. Commit your fix.
