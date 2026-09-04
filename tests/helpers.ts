import { expect, type Page } from '@playwright/test';

/** WCAG levels Framly holds itself and its output to. */
export const WCAG_TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
];

/**
 * Open the app and wait for it to be genuinely ready.
 *
 * Startup races IndexedDB init against a 3s timeout before React renders, so
 * waiting on the header alone is not enough — the canvas has to have settled
 * too, or the first interaction lands on a component that is about to re-render.
 */
export async function openApp(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('header-main')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('#canvas-scroll-container')).toBeVisible();
}

/** Elements currently on the canvas, excluding the root container. */
export function canvasElements(page: Page) {
  return page.locator('.canvas-element');
}

/** Apply a starter template from the empty-state gallery. */
export async function applyTemplate(page: Page, id: 'landing' | 'article' | 'features') {
  await page.getByTestId('button-browse-templates').click();
  const card = page.getByTestId(`template-card-${id}`);
  await expect(card).toBeVisible();
  await card.click();
  await expect(page.getByTestId('template-gallery-modal')).toBeHidden();
}

/** The HTML the code generator produces for what is currently on the canvas. */
export async function generatedHTML(page: Page): Promise<string> {
  await page.getByTestId('button-preview').click();
  const pre = page.getByTestId('code-content-html').locator('pre');
  await expect(pre).toBeVisible();
  const html = await pre.textContent();
  return html ?? '';
}

/** Move focus to the canvas so keyboard shortcuts are not swallowed by an input. */
export async function focusCanvas(page: Page) {
  await page.locator('#canvas-scroll-container').focus();
}
