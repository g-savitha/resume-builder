import { expect, test } from '@playwright/test';
import { openEditor, shot, solidPng, stubBrandApi, stubPersonaApi } from './helpers';

// M4b: a found company gets a persona (stubbed /api/persona): heading words from a fixed set and the score dial,
// personalized with the candidate's strongest % metric. Turning it off restores the standard headings.
const PERSONA = { industry: 'technology', tone: 'bold', vocab: 'builder', centerpiece: 'score-dial', source: 'ai' };

test('a persona renames default headings, adds the score dial, and can be turned off', async ({ page }) => {
  await stubBrandApi(page, (url) => ({ v: 1, status: 'found', name: url.searchParams.get('name') ?? 'X', domain: 'microsoft.com', logo: { type: 'image/png', base64: solidPng('#0a66c2') } }));
  const calls = await stubPersonaApi(page, PERSONA);
  await openEditor(page);
  const preview = page.getByTestId('resume-preview');
  await expect(preview.getByRole('heading', { level: 2, name: 'What I’ve built', exact: true })).toBeVisible();
  expect(calls[0]?.searchParams.get('domain')).toBe('microsoft.com');

  // Give the candidate a metric so the dial has something to show.
  const bullets = page.locator('#section-editor').getByLabel(/^Highlights/).first();
  await bullets.click();
  await page.keyboard.press('End');
  await page.keyboard.type(' Cut page load time by 42%.');
  await expect(preview.locator('[data-centerpiece="score-dial"]')).toContainText('42%');
  await page.screenshot({ path: shot('persona-dial.png') });

  await page.getByRole('tab', { name: 'Design' }).click();
  const card = page.getByTestId('persona-card');
  await expect(card).toHaveAttribute('data-persona', 'ai');
  await card.getByRole('button', { name: 'Turn off persona' }).click();
  await expect(preview.getByRole('heading', { level: 2, name: 'Experience', exact: true })).toBeVisible();
  await expect(preview.locator('[data-centerpiece]')).toHaveCount(0);
  await card.getByRole('button', { name: 'Apply persona' }).click();
  await expect(preview.getByRole('heading', { level: 2, name: 'What I’ve built', exact: true })).toBeVisible();
});
