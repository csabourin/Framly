import { test, expect, type Page } from '@playwright/test';
import { applyTemplate, openApp } from './helpers';

const BREAKPOINTS = [
  { label: /Mobile/i, width: 375 },
  { label: /Tablet/i, width: 768 },
  { label: /^Desktop/i, width: 1024 },
  { label: /Large Desktop/i, width: 1440 },
];

/** Change the workbench and wait until the artboard has the requested width. */
async function switchTo(page: Page, label: RegExp, width: number) {
  const trigger = page.getByTestId('status-breakpoint');
  await expect(async () => {
    if ((await trigger.getAttribute('aria-expanded')) !== 'true') await trigger.click();
    await page.getByRole('menuitem', { name: label }).click({ timeout: 2000 });
    await expect(trigger).toContainText(`${width}px`, { timeout: 2000 });
  }).toPass({ timeout: 15_000 });
}

/** Read the current export and close the preview again. */
async function exportedPage(page: Page): Promise<{ html: string; css: string }> {
  await page.getByTestId('button-preview').click();
  const html = (await page.getByTestId('code-content-html').locator('pre').textContent()) ?? '';
  await page.getByTestId('tab-css').click();
  const css = (await page.getByTestId('code-content-css').locator('pre').textContent()) ?? '';
  await page.keyboard.press('Escape');
  return { html, css };
}

/** Every property the generated rule for one structural class can affect. */
function propertiesFor(css: string, className: string): string[] {
  const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const properties = new Set<string>();
  for (const match of css.matchAll(new RegExp(`\\.${escaped}\\s*\\{([^}]*)\\}`, 'g'))) {
    for (const declaration of match[1].matchAll(/^\s*([a-z-]+)\s*:/gm)) {
      // The editor intentionally replaces exported interaction cursors with
      // grab/grabbing affordances so every canvas element remains draggable.
      if (declaration[1] !== 'cursor') properties.add(declaration[1]);
    }
  }
  return [...properties];
}

async function computed(locator: ReturnType<Page['locator']>, properties: string[]) {
  return locator.evaluate((element, names) => {
    const style = getComputedStyle(element);
    return Object.fromEntries(names.map((name) => [name, style.getPropertyValue(name).trim()]));
  }, properties);
}

test('the Landing template round-trips at all four breakpoints', async ({ page, context }) => {
  await openApp(page);
  await applyTemplate(page, 'landing');

  // Give the export three real overrides so each media-query boundary is part
  // of the comparison, not merely a different viewport around identical CSS.
  const heading = page.locator('.canvas-element[data-element-type="heading"]').filter({ hasText: 'Build something people want' });
  await heading.click();
  await page.getByTestId('property-search').fill('Text Size');
  await page.getByTestId('group-header-text').click();
  const fontSize = page.getByTestId('property-fontSize').getByTestId('input-fontSize');

  for (const [index, breakpoint] of BREAKPOINTS.entries()) {
    if (index === 0) continue;
    await switchTo(page, breakpoint.label, breakpoint.width);
    await fontSize.fill(String(30 + index * 4));
    await fontSize.press('Enter');
  }

  const { html, css } = await exportedPage(page);
  const exported = await context.newPage();
  await exported.setContent(html.replace(/<link rel="stylesheet"[^>]*>/, `<style>${css}</style>`));

  const structuralClasses = await exported.locator('body > .page, body > .page [class]').evaluateAll((elements) =>
    elements.map((element) => element.classList[0])
  );
  const canvasElements = page.locator("[data-testid='canvas-root'], .canvas-element");
  expect(await canvasElements.count(), 'the canvas and export contain the same designed elements')
    .toBe(structuralClasses.length);

  for (const breakpoint of BREAKPOINTS) {
    await switchTo(page, breakpoint.label, breakpoint.width);
    await exported.setViewportSize({ width: breakpoint.width, height: 900 });

    for (const [index, className] of structuralClasses.entries()) {
      const properties = propertiesFor(css, className);
      const onCanvas = await computed(canvasElements.nth(index), properties);
      const inExport = await computed(exported.locator(`.${className}`).first(), properties);
      expect(inExport, `${className} at ${breakpoint.width}px`).toEqual(onCanvas);
    }
  }

  await exported.close();
});
