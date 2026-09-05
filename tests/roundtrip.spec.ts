import { test, expect, type Page } from '@playwright/test';
import { applyTemplate, openApp } from './helpers';
/**
 * Divergences that remain, each with the reason it is still here.
 *
 * Every one of these has the same root cause: `CanvasElement` renders a
 * wrapper `<div class="canvas-element">` around the real semantic tag and
 * puts the element's styles on the wrapper, so the canvas DOM has a layer the
 * exported document does not. Removing that wrapper is the fix, and it is a
 * real refactor — drag-and-drop, inline editing and the overlays all target
 * it. Until then this file names exactly what is still wrong.
 *
 * It may only shrink. A new divergence fails the gate; one that has been
 * fixed is reported so the entry can be deleted.
 */
import baseline from './canvas-box-baseline.json' with { type: 'json' };

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

/**
 * The properties compared for every element, whether or not the export
 * mentions them.
 *
 * `propertiesFor` below reads the property list off the *exported* rule, so it
 * can only catch a declaration the export gets wrong — it is structurally blind
 * to anything the canvas applies and the export omits. That is how an editor
 * stylesheet came to give every element a 2px border, a 32px minimum and its
 * own inherited type scale without any gate noticing: none of those properties
 * appear in an exported rule, so none of them were ever compared.
 *
 * This list is the other direction. It is fixed, so a property cannot drop out
 * of the comparison by disappearing from the stylesheet.
 */
const LAYOUT_CRITICAL = [
  'display', 'box-sizing',
  'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'flex-direction', 'flex-wrap', 'gap', 'flex-grow', 'flex-shrink', 'flex-basis',
  'overflow-x', 'overflow-y',
  'font-family', 'font-size', 'font-weight', 'line-height', 'text-align',
  'color', 'background-color',
];

/**
 * Editor-only computed differences that are deliberate and cannot affect the
 * box the user is measuring.
 *
 * `position: relative` is the containing block for the `::after` overlay that
 * draws every hover, focus and selection affordance. Without offsets it moves
 * nothing, so a relatively positioned element occupies exactly the box a static
 * one does. `cursor` is the drag affordance the original comparison already
 * excluded. Nothing else belongs here: an exclusion is a hole in the gate, and
 * each one has to earn its place by being provably unable to move a box.
 */
const EDITOR_ONLY = new Set(['position', 'cursor']);

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

test('the canvas box is the exported box, including what the export never declares', async ({ page, context }) => {
  await openApp(page);
  await applyTemplate(page, 'landing');

  const { html, css } = await exportedPage(page);
  const exported = await context.newPage();
  await exported.setContent(html.replace(/<link rel="stylesheet"[^>]*>/, `<style>${css}</style>`));

  const structuralClasses = await exported.locator('body > .page, body > .page [class]').evaluateAll((elements) =>
    elements.map((element) => element.classList[0])
  );
  const canvasElements = page.locator("[data-testid='canvas-root'], .canvas-element");
  expect(await canvasElements.count(), 'the canvas and export contain the same designed elements')
    .toBe(structuralClasses.length);

  const compared = LAYOUT_CRITICAL.filter((property) => !EDITOR_ONLY.has(property));
  const diverged = new Map<string, string>();

  for (const breakpoint of BREAKPOINTS) {
    await switchTo(page, breakpoint.label, breakpoint.width);
    await exported.setViewportSize({ width: breakpoint.width, height: 900 });

    for (const [index, className] of structuralClasses.entries()) {
      const onCanvas: Record<string, string> = await computed(canvasElements.nth(index), compared);
      const inExport: Record<string, string> = await computed(exported.locator(`.${className}`).first(), compared);
      for (const property of compared) {
        if (onCanvas[property] === inExport[property]) continue;
        diverged.set(
          `.${className} { ${property} }`,
          `at ${breakpoint.width}px the canvas says ${onCanvas[property]}, the export says ${inExport[property]}`,
        );
      }
    }
  }

  await exported.close();

  const known = new Set<string>(Object.keys(baseline));
  const introduced = [...diverged].filter(([key]) => !known.has(key));
  const fixed = [...known].filter((key) => !diverged.has(key));

  // A baseline that is allowed to grow is not a gate. New divergence fails;
  // divergence that has been fixed is reported so the entry can be deleted,
  // which is the only direction this file is allowed to move.
  expect(
    introduced.map(([key, detail]) => `${key} — ${detail}`),
    'the canvas must not start disagreeing with the export about a new property',
  ).toEqual([]);

  if (fixed.length > 0) {
    console.log(
      `\ntests/canvas-box-baseline.json can lose ${fixed.length} entr${fixed.length === 1 ? 'y' : 'ies'}:\n` +
      fixed.map((key) => `  ${key}`).join('\n') + '\n',
    );
  }
});
