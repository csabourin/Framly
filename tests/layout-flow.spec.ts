import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openApp, applyTemplate, WCAG_TAGS } from './helpers';

async function setup(page: Page) {
  await openApp(page);
  await applyTemplate(page, 'landing');
  const hero = page.locator('.canvas-element[data-element-type="container"]').first();
  const heading = page.locator('.canvas-element[data-element-type="heading"]').first();
  await heading.click();
  await expect(page.getByTestId('flow-position')).toContainText('In normal flow');
  return { hero, heading };
}

test('flow explains the computed parent and reaches its real layout control by keyboard', async ({ page }) => {
  const { hero, heading } = await setup(page);
  const parent = page.getByTestId('flow-parent');
  await expect(parent).toContainText('column');
  await expect(parent).toContainText('Top to bottom');
  await expect(page.getByTestId('layout-flow-info')).not.toContainText('Relative offsets');
  await expect(page.getByTestId('layout-flow-info')).not.toContainText('A transform changes');
  await parent.focus();
  await parent.press('Enter');
  await expect(hero).toHaveAttribute('data-state', 'selected');
  await expect(page.getByTestId('select-flexDirection')).toBeFocused();
  await page.getByTestId('select-flexDirection').click();
  await page.getByRole('option', { name: 'Horizontal →', exact: true }).click();
  await expect(hero).toHaveCSS('flex-direction', 'row');
  await heading.click();
  await expect(parent).toContainText('row');
  await expect(parent).toContainText('Left to right');
  await page.getByTestId('button-undo').click();
  await expect(parent).toContainText('column');
  const result = await new AxeBuilder({ page }).withTags(WCAG_TAGS).include('[data-testid="layout-flow-info"]').analyze();
  expect(result.violations).toEqual([]);
});

test('an absolute breakpoint edit changes canvas flow and independently rendered export, then undoes', async ({ page, context }) => {
  const { heading } = await setup(page);
  await page.getByTestId('status-breakpoint').click();
  await page.getByRole('menuitem', { name: /Tablet/i }).click();
  await page.getByTestId('flow-position').click();
  await expect(page.getByTestId('select-position')).toBeFocused();
  await page.getByTestId('select-position').click();
  await page.getByRole('option', { name: 'Absolute', exact: true }).click();
  await expect(heading).toHaveCSS('position', 'absolute');
  await expect(page.getByTestId('flow-position')).toContainText('Outside normal flow');
  await page.getByTestId('button-preview').click();
  const html = await page.getByTestId('code-content-html').locator('pre').innerText();
  await page.getByTestId('tab-css').click();
  const css = await page.getByTestId('code-content-css').locator('pre').innerText();
  const exported = await context.newPage();
  await exported.setContent(html.replace(/<link rel="stylesheet"[^>]*>/, `<style>${css}</style>`));
  await exported.setViewportSize({ width: 768, height: 900 });
  await expect(exported.locator('h1')).toHaveCSS('position', 'absolute');
  await exported.setViewportSize({ width: 375, height: 900 });
  await expect(exported.locator('h1')).not.toHaveCSS('position', 'absolute');
  await exported.close();
  await page.keyboard.press('Escape');
  await page.getByTestId('button-undo').click();
  await expect(heading).not.toHaveCSS('position', 'absolute');
  await expect(page.getByTestId('flow-position')).toContainText('In normal flow');
});

test('browser evidence accounts for shared CSS, reversed axes, writing modes, wrapping and order', async ({ page }) => {
  const { hero, heading } = await setup(page);
  await hero.evaluate((node) => {
    node.classList.add('flow-test-parent');
    const style = document.createElement('style');
    style.textContent = '.flow-test-parent { flex-direction: row-reverse !important; direction: rtl !important; flex-wrap: wrap !important; }';
    document.head.append(style);
  });
  await expect(page.getByTestId('flow-parent')).toContainText('Left to right');
  await expect(page.getByTestId('layout-flow-info')).toContainText('additional lines');
  await hero.evaluate((node) => { node.style.writingMode = 'vertical-rl'; });
  await expect(page.getByTestId('flow-parent')).toContainText('Top to bottom');
  await heading.evaluate((node) => { node.style.order = '2'; });
  await expect(page.getByTestId('layout-flow-info')).toContainText('order: 2');
});

test('grid, hidden ancestors, contents and ignored flex floats are explained without inventing a stack', async ({ page }) => {
  const { hero, heading } = await setup(page);
  await heading.evaluate((node) => { node.style.cssFloat = 'left'; });
  await expect(page.getByTestId('flow-position')).toContainText('In normal flow');
  await hero.evaluate((node) => { node.style.display = 'grid'; node.style.gridAutoFlow = 'column'; });
  await expect(page.getByTestId('flow-parent')).toContainText('Automatic placement fills columns');
  await hero.evaluate((node) => { node.style.display = 'none'; });
  await expect(page.getByTestId('flow-position')).toContainText('Not displayed');
  await page.getByTestId('flow-position').click();
  await expect(page.getByTestId('select-display')).toBeFocused();
  await hero.evaluate((node) => { node.style.display = 'contents'; });
  await expect(page.getByTestId('flow-position')).toContainText('No box of its own');
  // Selecting a displayed child must skip this boxless ancestor.
  await heading.evaluate((node) => { node.style.cssFloat = 'none'; });
  await heading.click();
  await page.getByTestId('flow-parent').click();
  await expect(page.getByTestId('flow-position')).toContainText('Page root');
});

test('fixed and sticky positions are distinct, and ordinary block flow is described as such', async ({ page }) => {
  const { hero, heading } = await setup(page);
  await heading.evaluate((node) => { node.style.position = 'fixed'; });
  await expect(page.getByTestId('flow-position')).toContainText('Fixed positioning');
  await heading.evaluate((node) => { node.style.position = 'sticky'; node.style.top = '0px'; });
  await expect(page.getByTestId('flow-position')).toContainText('In normal flow');
  await expect(page.getByTestId('layout-flow-info')).toContainText('Sticky positioning');
  await hero.evaluate((node) => { node.style.display = 'block'; });
  await expect(page.getByTestId('flow-parent')).toContainText('block boxes stack and inline content wraps');
  await heading.evaluate((node) => { node.style.position = 'relative'; node.style.cssFloat = 'left'; });
  await expect(page.getByTestId('flow-position')).toContainText('Floated outside normal flow');
  await page.getByTestId('flow-position').click();
  await expect(page.getByTestId('select-float')).toBeFocused();
});
