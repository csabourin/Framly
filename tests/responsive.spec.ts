import { test, expect, type Page } from '@playwright/test';
import { openApp, applyTemplate } from './helpers';

/**
 * M1.3 — mobile-first media queries.
 *
 * Editing at a breakpoint has to write an override, not a second base. The
 * roadmap states it as: setting a value at base applies everywhere; changing
 * it at a larger breakpoint produces exactly one media query and no duplicate
 * base rule. That sentence is these tests.
 */

/** The stylesheet the export would write for what is on the canvas. */
async function exportedCSS(page: Page): Promise<string> {
  await page.getByTestId('button-preview').click();
  await page.getByTestId('tab-css').click();
  const pre = page.getByTestId('code-content-css').locator('pre');
  await expect(pre).toBeVisible();
  const css = (await pre.textContent()) ?? '';
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('code-content-css')).toBeHidden();
  return css;
}

/** Select the landing template's h1 and open its Text Size control. */
async function selectHeadingFontSize(page: Page) {
  const heading = page
    .locator('.canvas-element')
    .filter({ hasText: 'Build something people want' })
    .first();
  await heading.click();
  await expect(page.getByTestId('properties-panel')).toBeVisible();

  await page.getByTestId('property-search').fill('Text Size');
  await page.getByTestId('group-header-text').click();

  const input = page.getByTestId('property-fontSize').getByTestId('input-fontSize');
  await expect(input).toBeVisible();
  return input;
}

async function switchTo(page: Page, label: RegExp) {
  await page.getByTestId('status-breakpoint').click();
  await page.getByRole('menuitem', { name: label }).click();
}

/** Every `font-size` declared outside a media query. */
function baseFontSizes(css: string): string[] {
  const beforeMedia = css.split('@media')[0];
  return [...beforeMedia.matchAll(/font-size:\s*([^;]+);/g)].map((m) => m[1].trim());
}

/** The bodies of every `@media (min-width: …)` block. */
function mediaBlocks(css: string): { query: string; body: string }[] {
  return [...css.matchAll(/@media \(min-width: (\d+px)\) \{([\s\S]*?)\n\}/g)].map((m) => ({
    query: m[1],
    body: m[2],
  }));
}

test.describe('editing at a breakpoint', () => {
  test('writes one media query and leaves the base rule alone', async ({ page }) => {
    await openApp(page);
    await applyTemplate(page, 'landing');

    const input = await selectHeadingFontSize(page);
    const before = await exportedCSS(page);
    expect(before, 'a fresh template has nothing to override yet').not.toContain('@media');
    expect(baseFontSizes(before)).toContain('30px');

    await switchTo(page, /Tablet/i);
    await expect(page.getByTestId('status-breakpoint')).toContainText('768');

    await input.fill('48');
    await input.press('Enter');

    const after = await exportedCSS(page);

    // Exactly one media query, holding exactly the override.
    const blocks = mediaBlocks(after);
    expect(blocks.map((b) => b.query), 'one media query, at the tablet width').toEqual(['768px']);
    expect(blocks[0].body).toContain('font-size: 48px');

    // And the base is untouched — this is the half that used to be wrong.
    expect(
      baseFontSizes(after),
      'the tablet value must not appear in any base rule'
    ).not.toContain('48px');
    expect(baseFontSizes(after)).toContain('30px');
  });

  test('the same value set at base appears once, and in no media query', async ({ page }) => {
    await openApp(page);
    await applyTemplate(page, 'landing');

    const input = await selectHeadingFontSize(page);
    await input.fill('64');
    await input.press('Enter');

    const css = await exportedCSS(page);

    expect(baseFontSizes(css), 'a base edit belongs in the base rule').toContain('64px');
    expect(css, 'a base edit is not an override of anything').not.toContain('@media');

    // One declaration, not one per place the app happens to store it.
    const occurrences = (css.match(/font-size:\s*64px/g) ?? []).length;
    expect(occurrences, 'the base value should be declared once').toBe(1);
  });

  test('an override can be cleared, and the breakpoint inherits again', async ({ page }) => {
    await openApp(page);
    await applyTemplate(page, 'landing');

    const input = await selectHeadingFontSize(page);
    await switchTo(page, /Tablet/i);
    await input.fill('48');
    await input.press('Enter');
    expect(await exportedCSS(page)).toContain('@media');

    await page.getByTestId('button-responsive-toggle-fontSize').click();
    await page.getByTestId('button-clear-tablet-fontSize').click();

    const css = await exportedCSS(page);
    expect(css, 'clearing the only override leaves no media query behind').not.toContain('@media');
    expect(baseFontSizes(css)).toContain('30px');
  });
});

/** The HTML the export would write, with its stylesheet inlined. */
async function exportedPage(page: Page): Promise<string> {
  await page.getByTestId('button-preview').click();
  const htmlPre = page.getByTestId('code-content-html').locator('pre');
  await expect(htmlPre).toBeVisible();
  const html = (await htmlPre.textContent()) ?? '';

  await page.getByTestId('tab-css').click();
  const cssPre = page.getByTestId('code-content-css').locator('pre');
  await expect(cssPre).toBeVisible();
  const css = (await cssPre.textContent()) ?? '';

  await page.keyboard.press('Escape');
  return html.replace(/<link rel="stylesheet"[^>]*>/, `<style>${css}</style>`);
}

test.describe('the canvas and the export agree', () => {
  /**
   * Every selector the generator writes is a single class, so specificity is
   * equal everywhere and the *order* of the rules decides the winner. The
   * canvas lets a named class override an element's own styles; if the file is
   * written the other way round, the page you export is not the page you drew.
   */
  test('a value edited in the panel wins in the exported page too', async ({ page, context }) => {
    await openApp(page);
    await applyTemplate(page, 'landing');

    const input = await selectHeadingFontSize(page);
    await input.fill('64');
    await input.press('Enter');

    const onCanvas = await page
      .locator('.canvas-element')
      .filter({ hasText: 'Build something people want' })
      .first()
      .locator('h1')
      .evaluate((el) => getComputedStyle(el).fontSize);
    expect(onCanvas, 'the canvas shows the edit').toBe('64px');

    const exported = await context.newPage();
    await exported.setContent(await exportedPage(page), { waitUntil: 'domcontentloaded' });
    const inExport = await exported
      .locator('h1')
      .first()
      .evaluate((el) => getComputedStyle(el).fontSize);
    await exported.close();

    expect(inExport, 'the exported page must compute to what the canvas showed').toBe(onCanvas);
  });

  test('what a breakpoint shows is what its media query says', async ({ page }) => {
    await openApp(page);
    await applyTemplate(page, 'landing');

    const input = await selectHeadingFontSize(page);
    await switchTo(page, /Tablet/i);
    await input.fill('48');
    await input.press('Enter');

    const onCanvas = await page
      .locator('.canvas-element')
      .filter({ hasText: 'Build something people want' })
      .first()
      .locator('h1')
      .evaluate((el) => getComputedStyle(el).fontSize);

    expect(onCanvas, 'the canvas at tablet shows the override').toBe('48px');

    const css = await exportedCSS(page);
    expect(mediaBlocks(css)[0].body).toContain('font-size: 48px');
  });
});
