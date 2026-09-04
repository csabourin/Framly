import { test, expect } from '@playwright/test';
import { openApp, canvasElements, applyTemplate, generatedHTML, focusCanvas } from './helpers';

test.describe('first run', () => {
  test('opens on an empty canvas with guidance, not a blank artboard', async ({ page }) => {
    await openApp(page);

    await expect(page.getByTestId('empty-canvas-state')).toBeVisible();
    await expect(page.getByTestId('button-browse-templates')).toBeVisible();
    await expect(canvasElements(page)).toHaveCount(0);
  });

  test('the empty state does not block drawing through it', async ({ page }) => {
    await openApp(page);

    // The overlay is pointer-events-none; a rectangle drawn across it must land.
    await page.getByTestId('button-tool-rectangle').click();
    const board = page.locator('.cursor-crosshair');
    const box = await board.boundingBox();
    expect(box).not.toBeNull();

    await page.mouse.move(box!.x + 30, box!.y + 40);
    await page.mouse.down();
    await page.mouse.move(box!.x + 220, box!.y + 150, { steps: 10 });
    await page.mouse.up();

    await expect(canvasElements(page)).toHaveCount(1);
    await expect(page.getByTestId('empty-canvas-state')).toBeHidden();
  });
});

test.describe('starter templates', () => {
  const cases = [
    { id: 'landing', elements: 8 },
    { id: 'article', elements: 6 },
    { id: 'features', elements: 10 },
  ] as const;

  for (const { id, elements } of cases) {
    test(`the ${id} template applies and renders`, async ({ page }) => {
      await openApp(page);
      await applyTemplate(page, id);

      await expect(canvasElements(page)).toHaveCount(elements);
      await expect(page.getByTestId('empty-canvas-state')).toBeHidden();
    });
  }

  test('applying a template announces it and moves focus to the canvas', async ({ page }) => {
    await openApp(page);
    await applyTemplate(page, 'landing');

    await expect(page.getByTestId('template-announcer')).toContainText('8 elements');
    await expect(page.locator('#canvas-scroll-container')).toBeFocused();
  });

  test('dismissing the gallery returns focus to the button that opened it', async ({ page }) => {
    await openApp(page);

    await page.getByTestId('button-browse-templates').focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('template-gallery-modal')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('template-gallery-modal')).toBeHidden();
    await expect(page.getByTestId('button-browse-templates')).toBeFocused();
  });
});

test.describe('undo and redo', () => {
  test('one undo removes a whole template, redo brings it back', async ({ page }) => {
    await openApp(page);

    // Nothing to undo before the first action.
    await expect(page.getByTestId('button-undo')).toBeDisabled();

    await applyTemplate(page, 'landing');
    await expect(canvasElements(page)).toHaveCount(8);
    await expect(page.getByTestId('button-undo')).toBeEnabled();

    await page.getByTestId('button-undo').click();
    await expect(canvasElements(page)).toHaveCount(0);
    await expect(page.getByTestId('empty-canvas-state')).toBeVisible();

    await page.getByTestId('button-redo').click();
    await expect(canvasElements(page)).toHaveCount(8);
  });

  test('one Ctrl+Z per drawn shape — no dead undo steps', async ({ page }) => {
    await openApp(page);
    await page.getByTestId('button-tool-rectangle').click();

    const box = await page.locator('.cursor-crosshair').boundingBox();
    for (const dy of [0, 110, 220]) {
      await page.mouse.move(box!.x + 30, box!.y + 30 + dy);
      await page.mouse.down();
      await page.mouse.move(box!.x + 200, box!.y + 110 + dy, { steps: 8 });
      await page.mouse.up();
      // Let the drawing gesture's debounced follow-up settle into one entry.
      await expect(canvasElements(page)).toHaveCount(dy / 110 + 1);
      await page.waitForTimeout(1200);
    }

    await focusCanvas(page);
    for (const remaining of [2, 1, 0]) {
      await page.keyboard.press('Control+z');
      await expect(canvasElements(page)).toHaveCount(remaining);
    }
  });

  test('a new action after undo clears the redo branch', async ({ page }) => {
    await openApp(page);
    await applyTemplate(page, 'article');
    await expect(canvasElements(page)).toHaveCount(6);

    await page.getByTestId('button-undo').click();
    await expect(canvasElements(page)).toHaveCount(0);
    await expect(page.getByTestId('button-redo')).toBeEnabled();

    await applyTemplate(page, 'features');
    await expect(canvasElements(page)).toHaveCount(10);
    await expect(page.getByTestId('button-redo')).toBeDisabled();
  });
});

test.describe('export', () => {
  test('generates semantic HTML with headings in order', async ({ page }) => {
    await openApp(page);
    await applyTemplate(page, 'landing');

    const html = await generatedHTML(page);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<h1');
    expect(html).toContain('<h2');
    expect(html).toContain('<button');
    expect(html).toContain('<ul');
    expect(html).toContain('<li>');
    // Headings must appear in order, never h1 -> h3
    const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
    expect(levels).toEqual([1, 2]);
  });

  test('unavailable export formats cannot be chosen', async ({ page }) => {
    await openApp(page);
    await applyTemplate(page, 'landing');

    await page.getByTestId('button-export').click();
    await expect(page.getByTestId('export-options')).toBeVisible();

    await expect(page.getByTestId('export-radio-html')).toBeChecked();
    await expect(page.getByTestId('export-radio-png')).toBeDisabled();
    await expect(page.getByTestId('export-radio-pdf')).toBeDisabled();

    // Clicking a disabled format must not select it or close the dialog
    await page.getByTestId('export-option-png').click({ force: true });
    await expect(page.getByTestId('export-radio-html')).toBeChecked();
    await expect(page.getByTestId('export-options')).toBeVisible();
  });
});

test.describe('no shipped debug artifacts', () => {
  test('canvas elements carry no debug tooltip', async ({ page }) => {
    await openApp(page);
    await applyTemplate(page, 'landing');

    const titles = await canvasElements(page).evaluateAll((els) =>
      els.map((el) => el.getAttribute('title'))
    );
    expect(titles.every((t) => t === null)).toBe(true);
    expect(await page.content()).not.toContain('DRAG TEST');
  });
});
