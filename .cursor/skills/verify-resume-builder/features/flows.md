# Flows

Flows cross several features. Verify them after changes to shared state: the store, storage or variants.

## Tailor a resume for a company

1. In the Variants tab, create a variant for `Experian` ([variants](./variants.md)).
2. In the Content tab, hide Projects in Experian ([hide-show](./hide-show.md)).
3. Wait for the save status to reach `saved`, then reload ([autosave](./autosave.md)).
4. Expected: Experian is still active, Projects is hidden in Experian, and switching to General shows Projects.

No journey ships for this flow yet. Compose it from the feature journeys in a `/tmp` journey and run it by path.
