# Performance budget sign-off (M7, 2026-10-26)

Measured on the box (Chromium, Playwright, production build) with `pnpm bench` and `pnpm size`, after M4–M7 landed.

| Budget | Target | Measured | Status |
| --- | --- | --- | --- |
| Typing latency, ~3-page resume, unthrottled | p98 < 50 ms | frame p50 4.8 ms, p98 7.4 ms, max 10.3 ms | pass |
| Typing latency, 4× CPU throttle | p98 < 50 ms | frame p50 21.1 ms, p98 36.6 ms, max 41.8 ms; 559 input events, none over 50 ms (max 32 ms) | pass |
| App entry JS (gzip, `pnpm size`) | ≤ 150 kB | 126.6 kB with M7 (122.3 kB after M6) | pass |
| Editor shell initial CSS (gzip) | ≤ 15 kB | 5.2 kB | pass |
| Logo lookup | never on a keystroke | once per company, cached (30 d logo, 1 d miss) | pass |

Notes:

- The benchmark types 200 keystrokes into a Highlights field on the classic theme. Multi-column themes run two pagination loops, one per column. Each loop measures only the block that changed, so typing there costs about the same. There is no separate benchmark for them yet.
- On the 2026-10-22 baseline the unthrottled p98 was 16.8 ms. It is lower now because that run's frames were vsync-bound.
- Re-run with `pnpm bench`; results land in `e2e/.artifacts/bench.json`.
