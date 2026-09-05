import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openApp, applyTemplate, WCAG_TAGS, selectContainer } from './helpers';

async function setup(page: import('@playwright/test').Page) {
  await openApp(page);
  await applyTemplate(page, 'landing');
  const hero = page.locator('.canvas-element[data-element-type="container"]').filter({ hasText: 'Build something people want' }).first();
  await selectContainer(hero);
  await page.getByTestId('property-search').fill('Inner Spacing');
  return hero;
}

test('spacing presets are the default, keyboard accessible, and one undo restores mixed sides', async ({ page }) => {
  const hero = await setup(page);
  const scale = page.getByTestId('spacing-scale-padding');
  for (const value of [0, 4, 8, 12, 16, 24, 32, 48]) await expect(page.getByTestId(`spacing-preset-padding-${value}`)).toBeVisible();
  await expect(page.getByTestId('input-padding')).toHaveCount(0);
  await expect(page.getByTestId('spacing-custom-padding')).toContainText('28px');
  const choice = page.getByTestId('spacing-preset-padding-16');
  await choice.focus();
  await choice.press('Enter');
  await expect(hero).toHaveCSS('padding', '16px');
  await expect(choice).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('button-undo').click();
  await expect(hero).toHaveCSS('padding', '28px 20px');
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).include('[data-testid="spacing-scale-padding"]').analyze();
  expect(results.violations).toEqual([]);
});

test('Custom is explicit, does not change values on open, and preserves arbitrary values after reload', async ({ page }) => {
  const hero = await setup(page);
  await page.getByTestId('spacing-custom-padding').click();
  await expect(hero).toHaveCSS('padding', '28px 20px');
  const input = page.getByTestId('input-padding');
  await input.fill('19');
  await input.press('Enter');
  await expect(hero).toHaveCSS('padding', '19px');
  await expect(page.getByTestId('button-persistence-status')).toHaveAttribute('data-save-state', 'saved');
  await page.reload();
  await expect(hero).toHaveCSS('padding', '19px');
});

test('side presets respect breakpoints and the all-sides preset can replace a side override', async ({ page, context }) => {
  const hero = await setup(page);
  await page.getByTestId('status-breakpoint').click();
  await page.getByRole('menuitem', { name: /Tablet/i }).click();
  await page.getByRole('button', { name: 'Individual sides', exact: true }).click();
  await page.getByTestId('spacing-preset-paddingLeft-32').click();
  await expect(hero).toHaveCSS('padding-left', '32px');
  await expect(hero).toHaveCSS('padding-right', '20px');
  await page.getByTestId('spacing-preset-padding-16').click();
  await expect(hero).toHaveCSS('padding', '16px');
  await page.getByTestId('button-preview').click();
  const html = await page.getByTestId('code-content-html').locator('pre').textContent() ?? '';
  await page.getByTestId('tab-css').click();
  const css = await page.getByTestId('code-content-css').locator('pre').textContent() ?? '';
  const exported = await context.newPage();
  await exported.setContent(html.replace(/<link rel="stylesheet"[^>]*>/, `<style>${css}</style>`));
  await exported.setViewportSize({ width: 768, height: 900 });
  await expect(exported.locator('.hero')).toHaveCSS('padding', '16px');
  await exported.setViewportSize({ width: 375, height: 900 });
  await expect(exported.locator('.hero')).toHaveCSS('padding', '28px 20px');
  await exported.close();
});

test('the gap scale edits the parent gap without adding child margins', async ({ page }) => {
  const hero = await setup(page);
  await page.getByTestId('property-search').fill('Child Spacing');
  const children = hero.locator(':scope > .canvas-element');
  const before = await children.evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).margin));
  await page.getByTestId('spacing-preset-gap-24').click();
  await expect(hero).toHaveCSS('gap', '24px');
  expect(await children.evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).margin))).toEqual(before);
});
