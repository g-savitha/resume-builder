# Checks

Every rule a reviewer would otherwise have to remember, what enforces it, and what to do when it fires. CI (`.github/workflows/ci.yml`) runs all of them on every PR. Locally, `pnpm check` runs everything except the browser checks (`pnpm e2e`, `pnpm bench`).

If a review comment could have been a check, add the check here instead: a rule, the error message naming the fix, and one line on why. Keep a rule only if it has caught or would catch a real mistake.

## Architecture

| Rule | Enforced by | Fix when it fires |
| --- | --- | --- |
| A `src/` module is imported only as `@/<module>` (its `index.ts`). No deep or escaping relative imports. | `boundaries/module-imports` (`scripts/eslint/module-boundaries.js`) | Import `@/<module>`; export what you need from its `index.ts`. |
| Modules import only along the arrows in `docs/design/module-map.md`. | same rule, map in `scripts/eslint/architecture.js` | Move the code, or change the map and the doc together. |
| Third-party packages owned by one module (`OWNED_PACKAGES`) are imported only there. | same rule | Go through the owning module's API. |
| `@/testing` only in `*.test.ts(x)`. | same rule | Move the helper into the test or `src/testing`. |
| The rest of `themes/` imports `themes/color` only through its index. | `no-restricted-imports` | Import `./color`. |

## Types

| Rule | Enforced by | Why |
| --- | --- | --- |
| No casts to `ContrastSafe`, `Surface`, `AccessiblePalette` outside their minting files. | `no-restricted-syntax` | A cast is the only way to forge a contrast-checked color (contract G1). |
| No `any`, no unsafe use of `any`-typed values. | typescript-eslint `strictTypeChecked` (`no-explicit-any`, `no-unsafe-*`) | `any` switches off every other type check. |
| No `@ts-ignore`. `@ts-expect-error` needs a description. | `@typescript-eslint/ban-ts-comment` | The suppression must say what it expects. |
| No `!` non-null assertions outside tests. | `@typescript-eslint/no-non-null-assertion` | Handle the `undefined` that `noUncheckedIndexedAccess` surfaces. |
| `switch` over a union handles every member. | `@typescript-eslint/switch-exhaustiveness-check` | A new command or section kind fails here, not at runtime. |
| `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noUnused*` | `tsconfig.json` and, as of this change, `tsconfig.node.json` (e2e, scripts, configs) | Test and tooling code gets the same guarantees as app code. |
| **New:** `noImplicitReturns`, `allowUnreachableCode: false`, `allowUnusedLabels: false` | both tsconfigs | A branch that falls off the end, or dead code after `return`, is a bug or leftover. tsc names the line. |
| **New:** `noUncheckedSideEffectImports` | both tsconfigs | `import './x'` with a typo silently imports nothing. |

## Escape hatches

| Rule | Enforced by | Fix when it fires |
| --- | --- | --- |
| **New:** every `eslint-disable` directive has an inline reason: `// eslint-disable-next-line <rule> -- <why>`. | `disable-reason/require-reason` (`scripts/eslint/disable-reason.js`) | Add the reason, or fix the code. A disable added only to get lint green is easy to spot in review. |
| Unused `eslint-disable` directives fail. | ESLint 9 default (warn) + `--max-warnings 0` | Delete the directive. |

A bare `/* eslint-disable */` turns off every rule, this one included, and ESLint cannot see past it. Reject it in review.

## Code hygiene

| Rule | Enforced by |
| --- | --- |
| No `console` in app code. | `no-console` (allowed in e2e, scripts, configs) |
| Hooks rules; WCAG-strict JSX. | `react-hooks`, `jsx-a11y` strict |

## Product budgets (browser and build)

| Rule | Enforced by |
| --- | --- |
| Editor shell ≤ 150 kB gzip JS, ≤ 15 kB CSS. | `pnpm size` (`.size-limit.js`) |
| No axe WCAG 2.2 A/AA violations in the editor. | `pnpm e2e` (`e2e/editor.spec.ts`) |
| Typing p98 frame < 50 ms on a 3-page resume (unthrottled; the 4× CPU run is recorded, not asserted). | `pnpm bench` (`e2e/typing.bench.ts`) |
| Property tests finish inside vitest's 5 s default on CI. Never raise `testTimeout` globally. | CI `pnpm test`. See the `ci-only-test-timeouts` skill. |

## Considered, not added

- `noPropertyAccessFromIndexSignature`: 13 errors, all syntax-only (`a.b` → `a['b']`). `noUncheckedIndexedAccess` already makes those reads `T | undefined`.
- A separate deep-import ban: `boundaries/module-imports` already reports `deep` and `escape`.
- A general comment-style policy: it can't be checked mechanically without false positives. Only the escape-hatch reason above is enforced.
