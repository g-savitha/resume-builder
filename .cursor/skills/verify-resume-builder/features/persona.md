# Company persona (M4b)

When a variant's company is found, the app also asks `/api/persona` for that company's persona: a few choices from fixed lists (industry, tone, a heading-word set, and a centerpiece). On Vercel, a model picks them through Vercel AI Gateway from the company's homepage text. Without a gateway credential (locally, or with `PERSONA_AI=off`), keyword rules pick them. The persona renames the resume's default section headings ("Experience" → "What I’ve built" for a tech company) and can add a **score dial** beside the name, showing the candidate's own strongest percentage metric. AI never writes text, CSS, colors or layout; colors still come only from the logo.

## Sub-features

- `persona-apply`: after a logo is found (create, first run, or "Which company?"), the variant gets a persona. The preview's default headings change; sections the user renamed keep their titles.
- `persona-dial`: with the `score-dial` centerpiece, the identity block shows `[data-centerpiece="score-dial"]`: a ring and "<n>%" with the bullet it came from. No % metric in the entries, no dial.
- `persona-card`: Design → "Company persona" (`data-testid="persona-card"`, `data-persona` = `ai`, `rules` or `none`) lists the choices, says who chose them, and has "Turn off persona" / "Apply persona".
- `persona-cache`: one request per company domain; answers are cached in localStorage (30 days for AI, 1 day for rules).

## How to get to it (user POV)

- Create a variant for a known company (Variants tab), or open the seeded Microsoft variant. Design tab → "Company persona".

## Driving it with Playwright

Preconditions:

- Doctor passes. The dev server mounts the real `api/persona.ts`; it fetches the company's homepage, so the journey needs internet. Locally there is no gateway credential, so the persona is `rules`.

- **Seed.** Wait for the Microsoft row's `data-brand-state="logo"`. The persona card reads `data-persona="rules"` (or `ai` on Vercel) and the preview has a level-2 heading "What I’ve built".
- **Dial.** Type a bullet with a percentage (" Cut page load time by 42%.") into the first Highlights field: `[data-centerpiece="score-dial"]` contains "42%".
- **Off.** "Turn off persona": the heading is "Experience" again, and the dial is gone.
- **Run it.** `node .cursor/skills/verify-resume-builder/scripts/drive.mjs persona` saves `persona-on.png` and `persona-off.png`.

## Gotchas

- e2e stubs `/api/persona` (`stubPersonaApi` in `e2e/helpers.ts`); `openEditor` installs a stub that gives no persona, so other tests keep the standard headings.
- The model's answer is validated twice, by `parseChoice` on the server and `parsePersona` in the browser. Anything off-list falls back to the rules (server) or to no persona (browser).
- Headings change only for sections with no user title. The editor's section list keeps the default labels.
