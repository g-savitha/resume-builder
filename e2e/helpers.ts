import { expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

export const SHOTS_DIR = process.env.SHOTS_DIR ?? path.resolve('e2e/.artifacts/shots');
fs.mkdirSync(SHOTS_DIR, { recursive: true });
export const shot = (name: string) => path.join(SHOTS_DIR, name);

/** Opens the builder with a fresh profile and waits until the saved (or seeded) resume has loaded. */
export async function openEditor(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Sections' })).toBeVisible();
  await expect(page.locator('.saved')).toBeVisible();
}

export const sectionList = (page: Page) => page.getByRole('list', { name: 'Sections, in resume order' });

export async function sectionOrder(page: Page): Promise<string[]> {
  return sectionList(page).locator('.srow-name .name').allTextContents();
}
