---
name: ci-only-test-timeouts
description: Use when a test passes locally but times out (or nearly does) on GitHub CI, or when adding a property test with thousands of runs. Reproduces CI speed locally and fixes the cost, not the timeout.
---

# Tests that pass locally but time out on CI

Origin: the first CI run on `main` (e254267) failed. Two property tests hit vitest's 5 s default on the runner while taking about 4.3 s on a dev box. Fixed in `fix/property-test-timeouts`.

## Facts

- The GitHub runner is about 1.3–2x slower than the dev box, per test, in the CI log. A test that needs over about 2.5 s locally is at risk at the 5 s default.
- Local green proves nothing about CI time. Measure under slowdown.

## Steps

1. **Reproduce.** From the repo root: `SLOWDOWN=1 .cursor/skills/ci-only-test-timeouts/scripts/slow-vitest.sh <test files>`. SLOWDOWN=1 is about 2x, a typical CI runner. SLOWDOWN=2 is about 3x, a bad day. Confirm it fails the way CI did before changing anything.
2. **Find the cost.** Time one call of the code under test (a `performance.now()` loop in a scratch script or test). Count how often the hot inner function runs per call. Look for work repeated per iteration that could be hoisted: trig per sample, a luminance recomputed for a fixed background, a hex round-trip.
3. **Fix the cost, keep the coverage.** Do not drop `numRuns`, narrow the arbitraries, or change expected values to get under the limit. Exact-value fixture tests must pass unchanged, which proves the outputs did not move.
4. **Fix the test's own waste.** For example, a property that discards most generated cases should generate valid cases directly, and per-sample `expect` calls can become one comparison of a list of failures.
5. **Timeouts last, and scoped.** A per-test timeout is fine when the case count is the point of the test. Give it its own named constant and a comment with the measured local and slowed time. Never raise `testTimeout` globally.
6. **Prove it.** Run the same command as step 1 and report each test's time before and after. Then run `pnpm check`. Push and confirm the CI `check` job is green (`gh pr checks <n>`).
