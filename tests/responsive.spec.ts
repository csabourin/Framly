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
    .locator('.canvas-element[data-element-type="heading"]')
    .filter({ hasText: 'Build something people want' });
  await heading.click();
  await expect(page.getByTestId('properties-panel')).toBeVisible();

  await page.getByTestId('property-search').fill('Text Size');
  await page.getByTestId('group-header-text').click();

  const input = page.getByTestId('property-fontSize').getByTestId('input-fontSize');
  await expect(input).toBeVisible();
  return input;
}

/**
 * Switch breakpoint from the status bar.
 *
 * The click is retried because of a real defect, recorded in `TODO.md`: a menu
 * item can be replaced under the pointer when the panel re-renders, so a
 * breakpoint switch attempted straight after typing a value is sometimes lost
 * and has to be repeated. Retrying here keeps that from masquerading as a
 * failure of the thing each test is actually about; the defect itself has its
 * own entry and is not fixed by this.
 */
async function switchTo(page: Page, label: RegExp, width: string) {
  const trigger = page.getByTestId('status-breakpoint');

  await expect(async () => {
    if ((await trigger.getAttribute('aria-expanded')) !== 'true') {
      await trigger.click();
    }
    await page.getByRole('menuitem', { name: label }).click({ timeout: 2000 });
    await expect(trigger).toContainText(width, { timeout: 2000 });
  }).toPass({ timeout: 15000 });
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

    await switchTo(page, /Tablet/i, '768');

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
    await switchTo(page, /Tablet/i, '768');
    await input.fill('48');
    await input.press('Enter');
    expect(await exportedCSS(page)).toContain('@media');

    await page.getByTestId('button-clear-override-fontSize').click();

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
      .locator('.canvas-element[data-element-type="heading"]')
      .filter({ hasText: 'Build something people want' })
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
    await switchTo(page, /Tablet/i, '768');
    await input.fill('48');
    await input.press('Enter');

    const onCanvas = await page
      .locator('.canvas-element[data-element-type="heading"]')
      .filter({ hasText: 'Build something people want' })
      .locator('h1')
      .evaluate((el) => getComputedStyle(el).fontSize);

    expect(onCanvas, 'the canvas at tablet shows the override').toBe('48px');

    const css = await exportedCSS(page);
    expect(mediaBlocks(css)[0].body).toContain('font-size: 48px');
  });
});

/**
 * M1.3 — the controls half.
 *
 * A value has to say where it comes from without being clicked on. The only
 * hint used to be a dimmed input, plus a label behind a "Show breakpoints"
 * toggle — and the label was a key that had never been added to either locale
 * file, so it rendered as `breakpoints.inherited`.
 */
test.describe('a control says where its value comes from', () => {
  test('base, inherited, then set here — following the edit', async ({ page }) => {
    await openApp(page);
    await applyTemplate(page, 'landing');

    const input = await selectHeadingFontSize(page);
    const origin = page.getByTestId('origin-fontSize');

    await expect(origin, 'mobile is the base').toHaveText('base · applies at every width');

    await switchTo(page, /Tablet/i, '768');
    await expect(origin, 'no override yet, so it comes from the base')
      .toHaveText('inherited from Mobile');

    await input.fill('48');
    await input.press('Enter');
    await expect(origin, 'now it is written here').toHaveText('set here');

    await page.getByTestId('button-clear-override-fontSize').click();
    await expect(origin, 'and clearing it goes back to inheriting')
      .toHaveText('inherited from Mobile');
  });

  test('names the breakpoint it inherits from, not just "inherited"', async ({ page }) => {
    await openApp(page);
    await applyTemplate(page, 'landing');

    const input = await selectHeadingFontSize(page);

    await switchTo(page, /Tablet/i, '768');
    await input.fill('48');
    await input.press('Enter');
    await expect(page.getByTestId('origin-fontSize')).toHaveText('set here');

    // Desktop has no override of its own, so it inherits tablet's — not the base.
    await switchTo(page, /^Desktop/i, '1024');
    await expect(page.getByTestId('origin-fontSize')).toHaveText('inherited from Tablet');
  });

  test('the annotation reaches the control it describes', async ({ page }) => {
    await openApp(page);
    await applyTemplate(page, 'landing');

    const input = await selectHeadingFontSize(page);
    await switchTo(page, /Tablet/i, '768');

    // Not a colour and not a dimmed border: a screen reader gets this too.
    await expect(input).toHaveAccessibleDescription('inherited from Mobile');
  });
});

test.describe('clearing an override', () => {
  test('is offered only when there is something to clear', async ({ page }) => {
    await openApp(page);
    await applyTemplate(page, 'landing');

    const input = await selectHeadingFontSize(page);
    const clear = page.getByTestId('button-clear-override-fontSize');

    await expect(clear, 'nothing to clear at the base').toBeHidden();

    await switchTo(page, /Tablet/i, '768');
    await expect(clear, 'nothing to clear while inheriting').toBeHidden();

    await input.fill('48');
    await input.press('Enter');
    await expect(clear).toBeVisible();
  });

  test('is named, keyboard-operable and big enough to hit', async ({ page }) => {
    await openApp(page);
    await applyTemplate(page, 'landing');

    const input = await selectHeadingFontSize(page);
    await switchTo(page, /Tablet/i, '768');
    await input.fill('48');
    await input.press('Enter');

    const clear = page.getByTestId('button-clear-override-fontSize');

    // Says which breakpoint it clears, rather than being a bare ×.
    await expect(clear).toHaveAccessibleName('Clear Tablet');

    // WCAG 2.2 target size (2.5.8) is 24×24 CSS pixels.
    const box = (await clear.boundingBox())!;
    expect(box.width, 'target width').toBeGreaterThanOrEqual(24);
    expect(box.height, 'target height').toBeGreaterThanOrEqual(24);

    await clear.focus();
    await expect(clear).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('origin-fontSize')).toHaveText('inherited from Mobile');
  });
});
