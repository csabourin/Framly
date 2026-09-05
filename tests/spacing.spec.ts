import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openApp, applyTemplate, WCAG_TAGS } from './helpers';

async function selectHero(page: Page) {
  await openApp(page);
  await applyTemplate(page, 'landing');
  const hero = page.locator('.canvas-element[data-element-type="container"]').filter({ hasText: 'Build something people want' }).first();
  await hero.click();
  await expect(page.getByTestId('spacing-padding-top')).toHaveAttribute('aria-valuenow', '28');
  return hero;
}
async function exportedPage(page: Page) {
  await page.getByTestId('button-preview').click();
  await page.getByTestId('tab-html').click();
  const html = await page.getByTestId('code-content-html').locator('pre').textContent() ?? '';
  await page.getByTestId('tab-css').click();
  const css = await page.getByTestId('code-content-css').locator('pre').textContent() ?? '';
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('code-content-css')).toBeHidden();
  return { html, css };
}
async function dragStart(page: Page, kind: string, side: string) {
  const handle = page.getByTestId(`spacing-${kind}-${side}`);
  await handle.scrollIntoViewIfNeeded();
  await handle.hover();
  const box = (await handle.boundingBox())!;
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  return point;
}

test('a slow padding drag previews live and commits as one undoable action', async ({ page }) => {
  const hero = await selectHero(page);
  const scrollBefore = await page.locator('#canvas-scroll-container').evaluate((node) => node.scrollTop);
  const start = await dragStart(page, 'padding', 'top');
  expect(await page.locator('#canvas-scroll-container').evaluate((node) => node.scrollTop)).toBe(scrollBefore);
  await page.mouse.move(start.x, start.y + 12, { steps: 5 });
  await expect(hero).toHaveCSS('padding-top', '40px');
  await expect(page.getByTestId('box-model-label-padding')).toContainText('40 20 28');
  // Longer than the existing history debounce: pauses must not split a gesture.
  await page.waitForTimeout(1100);
  await page.mouse.move(start.x, start.y + 20, { steps: 5 });
  await expect(hero).toHaveCSS('padding-top', '48px');
  await page.mouse.up();
  await expect(hero).toHaveCSS('padding-top', '48px');
  await expect(hero).toHaveCSS('padding-right', '20px');
  const { css } = await exportedPage(page);
  expect(css).toContain('padding-top: 48px');
  await page.getByTestId('button-undo').click();
  await expect(hero).toHaveCSS('padding-top', '28px');
  await page.getByTestId('button-redo').click();
  await expect(hero).toHaveCSS('padding-top', '48px');
});

test('Escape cancels a margin drag without changing the export or adding undo', async ({ page }) => {
  const hero = await selectHero(page);
  const before = await exportedPage(page);
  const start = await dragStart(page, 'margin', 'left');
  await page.mouse.move(start.x - 15, start.y, { steps: 4 });
  await expect(hero).toHaveCSS('margin-left', '15px');
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(hero).toHaveCSS('margin-left', '0px');
  expect(await exportedPage(page)).toEqual(before);
  await page.getByTestId('button-undo').click();
  await expect(page.locator('.canvas-element')).toHaveCount(0);
});

test('keyboard spacing controls are labelled, allow negative margins, and pass axe', async ({ page }) => {
  const hero = await selectHero(page);
  const padding = page.getByTestId('spacing-padding-right');
  await padding.focus();
  await padding.press('Shift+ArrowUp');
  await expect(hero).toHaveCSS('padding-right', '30px');
  await padding.press('Home');
  await expect(hero).toHaveCSS('padding-right', '0px');
  await padding.press('ArrowDown');
  await expect(hero).toHaveCSS('padding-right', '0px');
  const margin = page.getByTestId('spacing-margin-bottom');
  await margin.focus();
  await margin.press('ArrowDown');
  await expect(hero).toHaveCSS('margin-bottom', '-1px');
  await margin.press('Control+z');
  await expect(hero).toHaveCSS('margin-bottom', '0px');
  await expect(margin).toHaveAccessibleName('Space outside · margin · bottom');
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).include('.spacing-controls').analyze();
  expect(results.violations).toEqual([]);
});

test('a zoomed horizontal drag edits CSS pixels and preserves other sides', async ({ page }) => {
  const hero = await selectHero(page);
  await page.getByTestId('zoom-control').click();
  await page.getByTestId('menu-zoom-out').click();
  const zoom = Number((await page.getByTestId('zoom-control').innerText()).replace('%', '')) / 100;
  const start = await dragStart(page, 'padding', 'left');
  await page.mouse.move(start.x + 20 * zoom, start.y, { steps: 4 });
  await page.mouse.up();
  await expect(hero).toHaveCSS('padding-left', '40px');
  await expect(hero).toHaveCSS('padding-right', '20px');
  await page.getByTestId('button-undo').click();
  await expect(hero).toHaveCSS('padding-left', '20px');
});

test('tablet spacing leaves mobile untouched and matches an independently rendered export', async ({ page, context }) => {
  const hero = await selectHero(page);
  await page.getByTestId('status-breakpoint').click();
  await page.getByRole('menuitem', { name: /Tablet/i }).click();
  await expect(page.getByTestId('status-breakpoint')).toContainText('768');
  const handle = page.getByTestId('spacing-padding-bottom');
  await handle.focus();
  await handle.press('Shift+ArrowUp');
  await expect(hero).toHaveCSS('padding-bottom', '38px');
  const { html, css } = await exportedPage(page);
  expect(css.split('@media')[0]).not.toContain('padding-bottom: 38px');
  expect(css).toMatch(/@media \(min-width: 768px\)[\s\S]*padding-bottom: 38px/);
  const exported = await context.newPage();
  await exported.setContent(html.replace(/<link rel="stylesheet"[^>]*>/, `<style>${css}</style>`));
  for (const [width, value] of [[375, '28px'], [768, '38px'], [900, '38px'], [1024, '38px']] as const) {
    await exported.setViewportSize({ width, height: 900 });
    await expect(exported.locator('.hero')).toHaveCSS('padding-bottom', value);
  }
  await page.getByTestId('status-breakpoint').click();
  await page.getByRole('menuitem', { name: /Mobile/i }).click();
  await expect(hero).toHaveCSS('padding-bottom', '28px');
  await exported.close();
});

test('class-owned spacing previews every affected instance and undoes together', async ({ page }) => {
  const hero = await selectHero(page);
  await page.getByTestId('property-search').fill('Inner Spacing');
  await page.getByTestId('spacing-custom-padding').click();
  const input = page.getByTestId('property-padding').getByTestId('input-padding');
  await input.fill('16');
  await input.press('Enter');
  await expect(hero).toHaveCSS('padding', '16px');
  await page.locator('#canvas-scroll-container').focus();
  await page.keyboard.press('Control+d');
  const heroes = page.locator('.canvas-element[data-element-type="container"]').filter({ hasText: 'Build something people want' });
  await expect(heroes).toHaveCount(2);
  await heroes.first().click();
  const handle = page.getByTestId('spacing-padding-top');
  await handle.focus();
  await expect(handle).toHaveAccessibleDescription(/Shared style .* · 2 elements/);
  const start = await dragStart(page, 'padding', 'top');
  await page.mouse.move(start.x, start.y + 8, { steps: 4 });
  for (const item of await heroes.all()) await expect(item).toHaveCSS('padding-top', '24px');
  await page.mouse.up();
  for (const item of await heroes.all()) await expect(item).toHaveCSS('padding-top', '24px');
  await page.getByTestId('button-undo').click();
  for (const item of await heroes.all()) await expect(item).toHaveCSS('padding-top', '16px');
});

test('a cancelled pointer and a click without movement leave no spacing changes', async ({ page }) => {
  const hero = await selectHero(page);
  await page.getByTestId('spacing-padding-top').click();
  const start = await dragStart(page, 'padding', 'bottom');
  await page.mouse.move(start.x, start.y - 10, { steps: 4 });
  await expect(hero).toHaveCSS('padding-bottom', '38px');
  await page.getByTestId('spacing-padding-bottom').dispatchEvent('pointercancel');
  await page.mouse.up();
  await expect(hero).toHaveCSS('padding-bottom', '28px');
  await page.getByTestId('button-undo').click();
  await expect(page.locator('.canvas-element')).toHaveCount(0);
});

test('a later spacing shorthand overrides an earlier side edit on canvas and export', async ({ page, context }) => {
  const hero = await selectHero(page);
  await page.getByTestId('spacing-padding-top').press('Home');
  await expect(hero).toHaveCSS('padding-top', '0px');
  await page.getByTestId('status-breakpoint').click();
  await page.getByRole('menuitem', { name: /Tablet/i }).click();
  await page.getByTestId('property-search').fill('Inner Spacing');
  await page.getByTestId('spacing-custom-padding').click();
  const input = page.getByTestId('property-padding').getByTestId('input-padding');
  await input.fill('40');
  await input.press('Enter');
  await expect(hero).toHaveCSS('padding-top', '40px');
  await page.getByTestId('spacing-padding-top').press('Home');
  await expect(hero).toHaveCSS('padding-top', '0px');
  await expect(hero).toHaveCSS('padding-right', '40px');
  const { html, css } = await exportedPage(page);
  const exported = await context.newPage();
  await exported.setContent(html.replace(/<link rel="stylesheet"[^>]*>/, `<style>${css}</style>`));
  for (const [width, value] of [[375, '0px'], [768, '0px']] as const) {
    await exported.setViewportSize({ width, height: 900 });
    await expect(exported.locator('.hero')).toHaveCSS('padding-top', value);
  }
  await exported.close();
});
