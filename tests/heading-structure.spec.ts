import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openApp, applyTemplate, generatedHTML, WCAG_TAGS } from './helpers';

/**
 * Heading level is page structure, so these tests assert the structure, not
 * the control: what tag the export carries, and what the panel says about it.
 */

const headings = (page: Page) => page.locator('.canvas-element[data-element-type="heading"]');

/** Insert a heading by point-and-click at a spot on the canvas. */
async function insertHeading(page: Page, at: { x: number; y: number }) {
  const before = await headings(page).count();
  await page.getByTestId('button-tool-heading').click();
  const board = page.locator('.cursor-crosshair');
  const box = (await board.boundingBox())!;
  await page.mouse.click(box.x + at.x, box.y + at.y);
  // Back to the pointer, or the next click inserts another heading.
  await page.getByTestId('button-tool-pointer').click();
  await expect(headings(page)).toHaveCount(before + 1);
}

test('the first heading on a page is h1, the ones after it are peers', async ({ page }) => {
  await openApp(page);

  await insertHeading(page, { x: 60, y: 60 });
  await expect(headings(page).first().locator('h1')).toHaveCount(1);
  await expect(page.getByTestId('heading-reason')).toContainText('page title');

  // A second heading at the top level is a section, not a second title. Two
  // h1s is the mistake this feature exists to prevent.
  await insertHeading(page, { x: 60, y: 220 });
  await expect(headings(page).nth(1).locator('h2')).toHaveCount(1);
  await expect(page.getByTestId('heading-reason')).toContainText('already has its H1 title');

  // A third one is a peer of the second, not a subsection of it.
  await insertHeading(page, { x: 60, y: 320 });
  await expect(headings(page).nth(2).locator('h2')).toHaveCount(1);
  await expect(page.getByTestId('heading-reason')).toContainText('same level');

  // The export is the promise, so check the tags there too.
  const html = await generatedHTML(page);
  expect(html.match(/<h1[\s>]/g) ?? []).toHaveLength(1);
  expect(html.match(/<h2[\s>]/g) ?? []).toHaveLength(2);
});

test('a heading dropped one container deeper becomes a subsection', async ({ page }) => {
  await openApp(page);
  await insertHeading(page, { x: 60, y: 60 });

  // Draw a section, then put a heading inside it: inward by one container is
  // inward by one level.
  await page.getByTestId('button-tool-section').click();
  const board = page.locator('.cursor-crosshair');
  const box = (await board.boundingBox())!;
  await page.mouse.move(box.x + 40, box.y + 220);
  await page.mouse.down();
  await page.mouse.move(box.x + 400, box.y + 420, { steps: 8 });
  await page.mouse.up();
  const section = page.locator('.canvas-element[data-element-type="section"]');
  await expect(section).toHaveCount(1);

  const inside = (await section.boundingBox())!;
  await page.getByTestId('button-tool-heading').click();
  await page.mouse.click(inside.x + inside.width / 2, inside.y + inside.height / 2);
  await page.getByTestId('button-tool-pointer').click();
  await expect(headings(page)).toHaveCount(2);
  await expect(section.locator('h2')).toHaveCount(1);

  // Inserting inside a container leaves the container selected, so ask the
  // heading itself what the panel says about it.
  await headings(page).nth(1).click();
  await expect(page.getByTestId('heading-reason')).toContainText('subsection');
});

test('a skipped level is named in plain language and fixed in one click, as one undo', async ({ page }) => {
  await openApp(page);
  await insertHeading(page, { x: 60, y: 60 });
  await insertHeading(page, { x: 60, y: 220 });

  const second = headings(page).nth(1);
  await second.click();
  await expect(page.getByTestId('heading-problem')).toBeHidden();

  // H4 after an H1 is the mistake. The warning has to arrive at the moment it
  // is made, not in a report afterwards.
  await page.getByTestId('heading-level-4').click();
  await expect(second.locator('h4')).toHaveCount(1);
  const problem = page.getByTestId('heading-problem');
  await expect(problem).toContainText('jumps from H1 to H4');
  await expect(problem).toContainText('missing level');
  await expect(page.getByTestId('heading-outline')).toContainText('Page outline · 2 headings');

  await page.getByTestId('heading-fix').click();
  await expect(second.locator('h2')).toHaveCount(1);
  await expect(page.getByTestId('heading-problem')).toBeHidden();

  // One click, one undo step — back to the h4 it was, not two steps back.
  await page.getByTestId('button-undo').click();
  await expect(second.locator('h4')).toHaveCount(1);
  await page.getByTestId('button-redo').click();
  await expect(second.locator('h2')).toHaveCount(1);
});

test('a second h1 is fixed to a peer of the heading above it, not a subsection of it', async ({ page }) => {
  await openApp(page);
  await insertHeading(page, { x: 60, y: 60 });
  await insertHeading(page, { x: 60, y: 220 });
  await insertHeading(page, { x: 60, y: 320 });

  // Make the third heading a second title. The heading above it is an H2, so
  // stepping one below that would offer H3 — valid, but wrong: this is another
  // top-level section, not a subsection of the one before it.
  const third = headings(page).nth(2);
  await third.click();
  await page.getByTestId('heading-level-1').click();
  await expect(page.getByTestId('heading-problem')).toContainText('already has an H1');
  await expect(page.getByTestId('heading-fix')).toHaveText('Use H2');

  await page.getByTestId('heading-fix').click();
  await expect(third.locator('h2')).toHaveCount(1);
  await expect(page.getByTestId('heading-problem')).toBeHidden();

  const html = await generatedHTML(page);
  expect(html.match(/<h1[\s>]/g) ?? []).toHaveLength(1);
  expect(html).not.toContain('<h3');
});

test('a page that would start at h3 says so, and the fix reaches the export', async ({ page }) => {
  await openApp(page);
  await insertHeading(page, { x: 60, y: 60 });

  await headings(page).first().click();
  await page.getByTestId('heading-level-3').click();
  await expect(page.getByTestId('heading-problem')).toContainText('This page starts at H3');
  expect(await generatedHTML(page)).toContain('<h3');
  await page.keyboard.press('Escape');

  await page.getByTestId('heading-fix').click();
  await expect(headings(page).first().locator('h1')).toHaveCount(1);
  const html = await generatedHTML(page);
  expect(html).toContain('<h1');
  expect(html).not.toContain('<h3');
});

test('a broken outline is reported away from the element, and reaches it in one click', async ({ page }) => {
  await openApp(page);
  await applyTemplate(page, 'landing');

  // Nothing is claimed while the page is sound — alt text, contrast and
  // labels are not checked yet, so "no problems" would be a promise Framly
  // cannot keep.
  await expect(page.getByTestId('checks-headings')).toBeHidden();

  const second = headings(page).nth(1);
  await second.click();
  await page.getByTestId('heading-level-5').click();

  // Select something else entirely: the warning has to survive losing focus
  // on the heading, or it is only a label on the thing you are already
  // looking at.
  await page.locator('.canvas-element[data-element-type="text"]').first().click();
  await expect(page.getByTestId('heading-structure')).toBeHidden();
  const checks = page.getByTestId('checks-headings');
  await expect(checks).toContainText('1 heading to check');

  await checks.click();
  await expect(second).toHaveAttribute('data-state', 'selected');
  await expect(page.getByTestId('heading-problem')).toContainText('jumps from H1 to H5');

  // The warning states are the ones worth checking for contrast and naming,
  // and they are the ones a sound page never renders.
  const flagged = await new AxeBuilder({ page }).withTags(WCAG_TAGS)
    .include('[data-testid="heading-structure"]').include('[data-testid="checks-headings"]').analyze();
  expect(flagged.violations).toEqual([]);

  await page.getByTestId('heading-fix').click();
  await expect(page.getByTestId('checks-headings')).toBeHidden();
});

test('the outline is keyboard reachable, selects the heading it names, and is accessible', async ({ page }) => {
  await openApp(page);
  await applyTemplate(page, 'landing');

  await headings(page).first().click();
  const structure = page.getByTestId('heading-structure');
  await expect(structure).toBeVisible();

  // The current level is pressed; the suggested one is named as such, so a
  // screen reader hears the recommendation the dashed outline shows.
  await expect(page.getByTestId('heading-level-1')).toHaveAttribute('aria-pressed', 'true');
  await expect(structure.getByRole('button', { name: /suggested here/ })).toHaveCount(1);

  // A sound page keeps the outline folded away; open it and jump by keyboard.
  const outline = page.getByTestId('heading-outline');
  await outline.locator('summary').click();
  const entries = outline.locator('li button');
  await expect(entries).toHaveCount(await headings(page).count());
  await entries.nth(1).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('heading-level-2')).toHaveAttribute('aria-pressed', 'true');
  await expect(headings(page).nth(1)).toHaveAttribute('data-state', 'selected');

  const result = await new AxeBuilder({ page }).withTags(WCAG_TAGS)
    .include('[data-testid="heading-structure"]').analyze();
  expect(result.violations).toEqual([]);
});

for (const template of ['landing', 'article', 'features'] as const) {
  test(`the ${template} template's own heading structure is sound`, async ({ page }) => {
    await openApp(page);
    await applyTemplate(page, template);
    await headings(page).first().click();
    await page.getByTestId('heading-outline').locator('summary').click();
    // The warning icon is the only svg in the outline list, so none means none.
    await expect(page.getByTestId('heading-outline').locator('li svg')).toHaveCount(0);
    await expect(page.getByTestId('heading-problem')).toBeHidden();
  });
}
