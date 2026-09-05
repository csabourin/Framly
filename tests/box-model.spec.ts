import { test, expect } from '@playwright/test';
import { applyTemplate, openApp, selectContainer } from './helpers';

test('selection draws and labels the element box model on the canvas', async ({ page }) => {
  await openApp(page);
  await applyTemplate(page, 'landing');

  const hero = page
    .locator('.canvas-element[data-element-type="container"]')
    .filter({ hasText: 'Build something people want' })
    .first();
  await selectContainer(hero);

  const overlay = page.getByTestId('box-model-overlay');
  await expect(overlay).toBeVisible();
  await expect(overlay).toHaveAttribute('aria-label', /Box model: margin .*border .*padding .*content/);

  for (const part of ['margin', 'border', 'padding', 'content']) {
    await expect(page.getByTestId(`box-model-${part}`), `${part} box`).toBeVisible();
    await expect(page.getByTestId(`box-model-label-${part}`), `${part} label`).toBeVisible();
  }

  await expect(page.getByTestId('box-model-label-margin')).toContainText('margin 0');
  await expect(page.getByTestId('box-model-label-border')).toContainText('border 0');
  await expect(page.getByTestId('box-model-label-padding')).toContainText('padding 28 20');
  await expect(page.getByTestId('box-model-label-content')).toContainText(/content \d+(?:\.\d)?×\d+(?:\.\d)?/);

  const interaction = await overlay.evaluate((element) => ({
    overlay: getComputedStyle(element).pointerEvents,
    layers: [...element.querySelectorAll('[data-testid^="box-model-"]')]
      .map((layer) => getComputedStyle(layer).pointerEvents),
  }));
  expect(interaction.overlay).toBe('none');
  expect(interaction.layers.every((value) => value === 'none')).toBe(true);

  const layerColours = await Promise.all(
    ['margin', 'border', 'padding', 'content'].map((part) =>
      page.getByTestId(`box-model-${part}`).evaluate((element) => getComputedStyle(element).outlineColor)
    )
  );
  expect(new Set(layerColours).size, 'each box layer has its own reserved hue').toBe(4);
});

test('the overlay follows a selected element when its box changes', async ({ page }) => {
  await openApp(page);
  await applyTemplate(page, 'landing');

  const hero = page
    .locator('.canvas-element[data-element-type="container"]')
    .filter({ hasText: 'Build something people want' })
    .first();
  await selectContainer(hero);
  await expect(page.getByTestId('box-model-label-padding')).toContainText('padding 28 20');

  await hero.evaluate((element) => {
    element.style.padding = '12px 24px';
  });
  await expect(page.getByTestId('box-model-label-padding')).toContainText('padding 12 24');

  await page.getByTestId('status-breakpoint').click();
  await page.getByRole('menuitem', { name: /Tablet/i }).click();
  await expect(page.getByTestId('box-model-overlay')).toBeVisible();
});

test('measurement labels and spacing help stay outside the editable canvas at every zoom', async ({ page }) => {
  await openApp(page);
  await applyTemplate(page, 'landing');
  const hero = page.locator('.canvas-element[data-element-type="container"]').filter({ hasText: 'Build something people want' }).first();
  await selectContainer(hero);
  for (const zoomOut of [false, true]) {
    if (zoomOut) {
      await page.getByTestId('status-breakpoint').click();
      await page.getByRole('menuitem', { name: /Tablet/i }).click();
      await page.getByTestId('zoom-control').click();
      await page.getByTestId('menu-zoom-out').click();
    }
    const handle = page.getByTestId('spacing-margin-right');
    await handle.focus();
    await expect(handle).not.toHaveAttribute('title');
    const help = page.locator('#spacing-help');
    await expect(help).toBeVisible();
    const canvas = (await page.getByTestId('canvas-scroll-container').boundingBox())!;
    const info = (await help.boundingBox())!;
    const labels = (await page.locator('.box-model-labels').boundingBox())!;
    expect(info.y).toBeGreaterThanOrEqual(canvas.y + canvas.height);
    expect(labels.y).toBeGreaterThanOrEqual(canvas.y + canvas.height);
    await handle.press('ArrowUp');
    await expect(help).toContainText('1px');
  }
  await page.locator('.canvas-element[data-element-type="text"]').first().click();
  await expect(page.locator('#spacing-help')).toBeHidden();
});

test('an element that renders nothing keeps a clickable floor, selected or not', async ({ page }) => {
  await openApp(page);

  // A section inserted by point-and-click has no children and no content, so
  // it is exactly the case the floor exists for.
  await page.getByTestId('button-tool-section').click();
  const board = page.locator('.cursor-crosshair');
  const box = (await board.boundingBox())!;
  await page.mouse.click(box.x + 60, box.y + 60);

  const empty = page.locator('.canvas-element[data-renders-nothing="true"]');
  await expect(empty).toHaveCount(1);

  // Back to the pointer, or the next click inserts a second section.
  await page.getByTestId('button-tool-pointer').click();

  // Selecting it adds a .selection-handle child. The floor is keyed off an
  // attribute rather than :empty precisely so that child cannot cancel it —
  // an earlier :empty version matched nothing in any state.
  for (const stage of ['before selection', 'after selection']) {
    if (stage === 'after selection') {
      await empty.click({ position: { x: 2, y: 2 } });
      await expect(page.getByTestId('selection-handle')).toBeVisible();
    }

    // Assert the rule *matches*, not merely that the box is big enough — a
    // section is over 32px on its own, so measuring the box would pass even
    // with the floor switched off. Matching is the part that broke: the rule
    // began as `:empty`, which never matched, because the wrapper always
    // holds the variable-carrier div and selection adds a handle beside it.
    // min-width, not min-height: a section declares its own min-height and an
    // element's own style rightly wins, so only min-width isolates the floor.
    const floor = await empty.evaluate((node) => getComputedStyle(node).minWidth);
    expect(floor, `the clickable floor applies ${stage}`).toBe('32px');
  }
});
