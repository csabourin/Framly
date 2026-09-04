import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { WCAG_TAGS } from './helpers';
import type { CanvasElement } from '../client/src/types/canvas';

/**
 * The code generator is exercised directly rather than through the UI: driving
 * the toolbar to insert one of every element type is slow and brittle, and the
 * thing under test is the generator, not the toolbar.
 */

import { CodeGenerator } from '../client/src/utils/codeGenerator';
import { createDefaultElement } from '../client/src/utils/canvas';

// createDefaultElement reads localStorage for saved button styles, but only when
// it is called — so defining it here, after the imports and before any test
// runs, is early enough.
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  key: () => null,
  length: 0,
} as Storage;

const ALL_TYPES = [
  'heading', 'text', 'button', 'list', 'image', 'container', 'rectangle',
  'section', 'nav', 'header', 'footer', 'article',
  'input', 'textarea', 'checkbox', 'radio', 'dropdown',
  'link', 'code', 'divider', 'video', 'audio',
] as const;

/** A document holding one element of every type, as a real project would. */
function buildEveryType() {
  const elements: Record<string, CanvasElement> = {
    root: {
      id: 'root', type: 'container', width: 375, height: 600,
      styles: {}, isContainer: true, children: [], classes: [],
    },
  };

  for (const type of ALL_TYPES) {
    const el = createDefaultElement(type as CanvasElement['type']);
    el.parent = 'root';
    el.classes = [`${type}-demo`];
    if (type === 'image') el.imageAlt = 'A described image';
    elements[el.id] = el;
    elements.root.children!.push(el.id);
  }

  const project = {
    id: 'test', name: 'Export Test', elements,
    activeTabId: 't', tabs: {}, breakpoints: {}, currentBreakpoint: 'mobile',
  };

  return new CodeGenerator(project, {}, elements).generateHTML();
}

test.describe('semantic tags', () => {
  test('every element type exports as its own HTML tag, not a div', async () => {
    const html = buildEveryType();

    const expected: Record<string, RegExp> = {
      heading:   /<h1[\s>]/,
      text:      /<p[\s>]/,
      button:    /<button[\s>]/,
      list:      /<ul[\s>]/,
      image:     /<img[^>]*alt="A described image"/,
      section:   /<section[\s>]/,
      nav:       /<nav[\s>]/,
      header:    /<header[\s>]/,
      footer:    /<footer[\s>]/,
      article:   /<article[\s>]/,
      input:     /<input[^>]*type="text"/,
      textarea:  /<textarea[\s>]/,
      checkbox:  /<input type="checkbox"/,
      radio:     /<input type="radio"/,
      dropdown:  /<select[\s>]/,
      link:      /<a[^>]*href=/,
      code:      /<pre[^>]*><code>/,
      divider:   /<hr[\s/>]/,
      video:     /<video[^>]*controls/,
      audio:     /<audio[^>]*controls/,
    };

    const missing = Object.entries(expected)
      .filter(([, pattern]) => !pattern.test(html))
      .map(([type]) => type);

    expect(missing, 'element types not exported with their own tag').toEqual([]);
  });

  test('void elements are not given closing tags', async () => {
    const html = buildEveryType();

    expect(html).not.toContain('</input>');
    expect(html).not.toContain('</img>');
    expect(html).not.toContain('</hr>');
  });

  test('form controls carry an accessible name', async () => {
    const html = buildEveryType();

    expect(html).toMatch(/<input[^>]*aria-label="[^"]+"/);
    expect(html).toMatch(/<textarea[^>]*aria-label="[^"]+"/);
    expect(html).toMatch(/<select[^>]*aria-label="[^"]+"/);
    // checkbox and radio are labels wrapping their own input instead
    expect(html).toMatch(/<label[^>]*>\s*<input type="checkbox"/);
  });
});

test.describe('generated markup is valid and accessible', () => {
  test('a document of every element type has no accessibility violations', async ({ page }) => {
    await page.setContent(buildEveryType(), { waitUntil: 'domcontentloaded' });

    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

    expect(
      results.violations.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 80)}`),
      'generated markup must be accessible — this is the product promise'
    ).toEqual([]);
  });

  test('the browser parses it to exactly the tags we wrote', async ({ page }) => {
    await page.setContent(buildEveryType(), { waitUntil: 'domcontentloaded' });

    const tags = await page.evaluate(() =>
      [...document.body.querySelectorAll('*')].map((el) => el.tagName.toLowerCase())
    );

    // No stray divs from the parser recovering after malformed markup
    for (const tag of ['section', 'nav', 'header', 'footer', 'article', 'select', 'textarea', 'hr']) {
      expect(tags, `${tag} survived parsing`).toContain(tag);
    }
  });
});
