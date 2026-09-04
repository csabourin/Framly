import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openApp, applyTemplate, generatedHTML, WCAG_TAGS } from './helpers';
import baseline from './axe-baseline.json' with { type: 'json' };

type Counts = Record<string, number>;

const countByRule = (violations: { id: string; nodes: unknown[] }[]): Counts =>
  Object.fromEntries(violations.map((v) => [v.id, v.nodes.length]));

test.describe('Framly itself', () => {
  /**
   * A ratchet, not a clean-sheet gate. Framly has known AA violations
   * (tests/axe-baseline.json) that M3 burns down. This fails on anything new or
   * anything that got worse, and tells you when a number can come down.
   */
  test('has no new accessibility violations', async ({ page }, testInfo) => {
    await openApp(page);

    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    const found = countByRule(results.violations);
    const known: Counts = baseline;

    const regressions: string[] = [];
    const improvements: string[] = [];

    for (const [rule, count] of Object.entries(found)) {
      if (!(rule in known)) {
        const where = results.violations
          .find((v) => v.id === rule)!
          .nodes.slice(0, 3)
          .map((n) => n.html.slice(0, 90))
          .join('\n      ');
        regressions.push(`NEW  ${rule} (${count} nodes)\n      ${where}`);
      } else if (count > known[rule]) {
        regressions.push(`WORSE ${rule}: ${known[rule]} -> ${count} nodes`);
      }
    }

    for (const [rule, count] of Object.entries(known)) {
      const now = found[rule] ?? 0;
      if (now < count) improvements.push(`${rule}: ${count} -> ${now}`);
    }

    if (improvements.length) {
      testInfo.annotations.push({
        type: 'notice',
        description:
          'Accessibility improved — lower these in tests/axe-baseline.json to lock it in:\n' +
          improvements.join('\n'),
      });
    }

    expect(regressions.join('\n'), 'new or worsened accessibility violations').toEqual('');
  });

  /**
   * WCAG 1.4.4. `maximum-scale=1` used to sit in the viewport meta, which stops
   * a phone from pinch-zooming. Stated here in its own right rather than only
   * as an absent baseline entry, so the requirement survives axe renaming a rule.
   */
  test('configures the viewport to allow pinch-zooming on a phone', async ({ page }) => {
    await openApp(page);

    const viewport = await page
      .locator('meta[name="viewport"]')
      .getAttribute('content');

    expect(viewport, 'viewport meta').not.toBeNull();
    expect(viewport ?? '', 'viewport meta').not.toMatch(/user-scalable\s*=\s*(no|0)/i);
    const maxScale = (viewport ?? '').match(/maximum-scale\s*=\s*([\d.]+)/i)?.[1];
    expect(
      maxScale === undefined || Number(maxScale) >= 2,
      `maximum-scale must be absent or >= 2, got ${maxScale}`
    ).toBe(true);
  });

  /**
   * The parts added since the baseline was taken are held to zero, so the
   * baseline can only ever shrink.
   */
  test('the empty state has no violations', async ({ page }) => {
    await openApp(page);

    const results = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .include('[data-testid="empty-canvas-state"]')
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('the template gallery has no violations', async ({ page }) => {
    await openApp(page);
    await page.getByTestId('button-browse-templates').click();
    await expect(page.getByTestId('template-list')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .include('[data-testid="template-gallery-modal"]')
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('the export dialog has no violations', async ({ page }) => {
    await openApp(page);
    await applyTemplate(page, 'landing');
    await page.getByTestId('button-export').click();
    await expect(page.getByTestId('export-options')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .include('[data-testid="export-options"]')
      .include('[data-testid="export-settings"]')
      .analyze();

    expect(results.violations).toEqual([]);
  });

  /**
   * The settings are the only controls in the dialog that change the file you
   * get, so they have to be operable without a mouse and have to say what they
   * are.
   */
  test('the export settings are operable from the keyboard', async ({ page }) => {
    await openApp(page);
    await applyTemplate(page, 'landing');
    await page.getByTestId('button-export').click();
    await expect(page.getByTestId('export-settings')).toBeVisible();

    const responsive = page.getByTestId('checkbox-responsive');
    await expect(responsive).toHaveAttribute('aria-checked', 'true');

    await responsive.focus();
    await expect(responsive).toBeFocused();
    await page.keyboard.press('Space');
    await expect(responsive).toHaveAttribute('aria-checked', 'false');
    await page.keyboard.press('Space');
    await expect(responsive).toHaveAttribute('aria-checked', 'true');

    for (const id of ['checkbox-responsive', 'checkbox-minify', 'checkbox-comments']) {
      await expect(page.getByTestId(id), `${id} has an accessible name`)
        .not.toHaveAccessibleName('');
    }
  });

  /**
   * Minifying strips the comments back out. Saying so is promise #3 — a
   * guardrail in plain language, at the moment of the mistake — and it has to
   * reach a screen reader, not only a sighted user.
   */
  test('the comments setting explains when minifying will undo it', async ({ page }) => {
    await openApp(page);
    await applyTemplate(page, 'landing');
    await page.getByTestId('button-export').click();
    await expect(page.getByTestId('export-settings')).toBeVisible();

    const comments = page.getByTestId('checkbox-comments');
    const note = page.getByTestId('note-comments-minified');

    await expect(note).toBeHidden();

    await comments.click();
    await expect(note).toBeHidden(); // minifying is off by default

    await page.getByTestId('checkbox-minify').click();
    await expect(note).toBeVisible();
    await expect(comments).toHaveAccessibleDescription(await note.innerText());
  });
});

test.describe('pages Framly produces', () => {
  /**
   * The product promise: a page built in Framly is accessible. Held to zero
   * with no baseline — if this ever fails, Framly is shipping broken output.
   *
   * The exported CSS is inlined so contrast is checked against the real
   * colours rather than browser defaults.
   */
  for (const template of ['landing', 'article', 'features'] as const) {
    test(`the ${template} template exports a clean page`, async ({ page, context }) => {
      await openApp(page);
      await applyTemplate(page, template);

      const html = await generatedHTML(page);

      await page.getByTestId('tab-css').click();
      const cssPre = page.getByTestId('code-content-css').locator('pre');
      await expect(cssPre).toBeVisible();
      const css = (await cssPre.textContent()) ?? '';

      const standalone = html.replace(
        /<link rel="stylesheet"[^>]*>/,
        `<style>${css}</style>`
      );

      const exported = await context.newPage();
      await exported.setContent(standalone, { waitUntil: 'domcontentloaded' });

      const results = await new AxeBuilder({ page: exported }).withTags(WCAG_TAGS).analyze();

      expect(
        results.violations.map((v) => `${v.id} (${v.nodes.length})`),
        `${template} exported page`
      ).toEqual([]);

      await exported.close();
    });
  }
});
