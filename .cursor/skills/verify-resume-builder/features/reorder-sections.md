# Reorder sections

Sections, and entries within a section, can be reordered by keyboard drag and drop on a drag handle or with Move up / Move down buttons. Each move is announced in the polite live region and reflected in the preview echo.

## Sub-features

- `reorder-keyboard` picks up with Space on "Reorder <name>", moves with the arrow keys, and drops with Space (Escape cancels).
- `reorder-buttons` uses "Move <name> up" / "Move <name> down", and focus stays on the moved row's button.
- `reorder-announce` sends messages to `live-region`: "Picked up …", "… is over position N of M.", "Moved … to position N of M."
- `reorder-entries` works the same way for entries inside a section's entry list.

## How to get to it (user POV)

- Content tab, "Sections, in resume order" list: the grip button at the start of each row, and the chevron buttons.
- In the section editor, the entry list (for example "Experience entries") has the same controls per entry.

## Driving it with Playwright

Preconditions:

- Doctor passes. Fresh profile: Experience is 3rd and Projects 4th of 8.

- **Pick up.** Focus "Reorder Projects" and press Space. `live-region` reads "Picked up Projects, position 4 of 8."
- **Move.** Press ArrowUp. `live-region` reads "Projects is over position 3 of 8."
- **Drop.** Press Space. `live-region` reads "Moved Projects to position 3 of 8." The list order starts Profile, Summary, Projects, Experience.
- **Buttons.** Choose "Move Experience down". `live-region` reads "Moved Experience to position 5 of 8." and "Move Experience down" has focus.
- **Read back.** The echo's level 3 headings put Projects before Experience.
- **Run it.** `node .cursor/skills/verify-resume-builder/scripts/drive.mjs reorder-sections` saves `reorder-sections.png` and `section-list.aria.yml`.

## Gotchas

- dnd-kit binds its arrow-key listener on the tick after pick-up. An ArrowUp sent right after the "Picked up" message can be lost. The journey waits 150 ms there, the only fixed wait in the map, because no visible state marks "listening" yet.
- A move announces with the list's new positions. Assert the message, then the order. The order alone does not prove the keyboard path ran.
- The first row's "Move up" and the last row's "Move down" are disabled.
