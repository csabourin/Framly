import { test, expect } from '@playwright/test';
import { applyTemplate, openApp } from './helpers';

test('selection draws and labels the element box model on the canvas', async ({ page }) => {
  await openApp(page);
  await applyTemplate(page, 'landing');

  const hero = page
    .locator('.canvas-element[data-element-type="container"]')
    .filter({ hasText: 'Build something people want' })
    .first();
  await hero.click();

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
  await hero.click();
  await expect(page.getByTestId('box-model-label-padding')).toContainText('padding 28 20');

  await hero.evaluate((element) => {
    element.style.padding = '12px 24px';
  });
  await expect(page.getByTestId('box-model-label-padding')).toContainText('padding 12 24');

  await page.getByTestId('status-breakpoint').click();
  await page.getByRole('menuitem', { name: /Tablet/i }).click();
  await expect(page.getByTestId('box-model-overlay')).toBeVisible();
});
