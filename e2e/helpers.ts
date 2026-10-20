import { expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

export const SHOTS_DIR = process.env.SHOTS_DIR ?? path.resolve('e2e/.artifacts/shots');
fs.mkdirSync(SHOTS_DIR, { recursive: true });
export const shot = (name: string) => path.join(SHOTS_DIR, name);

/** The autosave status in the top bar; `data-state` is idle | saving | saved | error. */
export const saveStatus = (page: Page) => page.locator('[data-component="save-status"]');

/** Opens the builder with a fresh profile and waits until the saved (or seeded) resume has loaded. */
export async function openEditor(page: Page) {
  await page.goto('/');
  await expect(page.locator('[data-app-state="ready"]')).toBeVisible();
  await expect(saveStatus(page)).toHaveAttribute('data-state', /^(idle|saved)$/);
}

export const sectionList = (page: Page) => page.getByRole('list', { name: 'Sections, in resume order' });

export async function sectionOrder(page: Page): Promise<string[]> {
  return sectionList(page)
    .locator('[data-row-label]')
    .evaluateAll((rows) => rows.map((row) => row.getAttribute('data-row-label') ?? ''));
}
