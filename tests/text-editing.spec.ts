import { test, expect } from '@playwright/test';
import { openApp, applyTemplate, generatedHTML } from './helpers';

test('Enter and Shift+Enter keep editing; multiline text saves before blur and exports as one paragraph', async ({ page }) => {
  await openApp(page);
  await applyTemplate(page, 'landing');
  const text = page.locator('.canvas-element[data-element-type="text"]').first();
  const original = await text.innerText();
  await text.click();
  const editor = page.getByRole('textbox', { name: 'Text block', exact: true });
  await expect(editor).toHaveAttribute('aria-multiline', 'true');
  await editor.fill('First line');
  await editor.press('End');
  await editor.press('Enter');
  await page.keyboard.insertText('Second line');
  await editor.press('Shift+Enter');
  await page.keyboard.insertText('Third line');
  await expect(editor).toBeFocused();
  expect(await editor.innerText()).toBe('First line\nSecond line\nThird line');
  await expect(page.getByTestId('button-persistence-status')).toHaveAttribute('data-save-state', 'saved');
  await page.reload();
  await expect(text).toContainText('Third line');
  expect(await text.locator('.text-element').innerText()).toBe('First line\nSecond line\nThird line');

  const html = await generatedHTML(page);
  const exported = await page.context().newPage();
  await exported.setContent(html);
  const paragraph = exported.locator('p').filter({ hasText: 'First line' });
  await expect(paragraph).toHaveCount(1);
  expect(await paragraph.innerText()).toBe('First line\nSecond line\nThird line');
  await expect(exported.locator('p')).toHaveCount(2);
  await exported.close();
  await page.keyboard.press('Escape');
  await page.getByTestId('button-undo').click();
  await expect(text).toHaveText(original);
});

test('Escape restores the text from before editing, while Ctrl+Enter finishes a multiline edit', async ({ page }) => {
  await openApp(page);
  await applyTemplate(page, 'landing');
  const text = page.locator('.canvas-element[data-element-type="text"]').first();
  const original = await text.innerText();
  await text.click();
  const editor = page.getByRole('textbox', { name: 'Text block', exact: true });
  await editor.fill('Temporary edit');
  await editor.press('Escape');
  await expect(editor).toHaveCount(0);
  await expect(text).toHaveText(original);
  await text.click();
  await editor.fill('Keep this');
  await editor.press('Enter');
  await page.keyboard.insertText('and this');
  await editor.press('Control+Enter');
  await expect(editor).toHaveCount(0);
  expect(await text.innerText()).toBe('Keep this\nand this');
  await expect(page.getByTestId('button-persistence-status')).toHaveAttribute('data-save-state', 'saved');
  await page.reload();
  expect(await text.innerText()).toBe('Keep this\nand this');
});
