import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { WCAG_TAGS } from './helpers';
import type { CanvasElement } from '../client/src/types/canvas';

/**
 * The code generator is exercised directly rather than through the UI: driving
 * the toolbar to insert one of every element type is slow and brittle, and the
 * thing under test is the generator, not the toolbar.
 */

import { CodeGenerator, minifyCSS, type ExportOptions } from '../client/src/utils/codeGenerator';
import { createDefaultElement } from '../client/src/utils/canvas';
import { STARTER_TEMPLATES, buildTemplate } from '../client/src/utils/starterTemplates';

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

/**
 * The landing template as the app builds it: the same root element the canvas
 * starts from, the same breakpoints, and one responsive override so the media
 * query path is exercised.
 */
function buildLandingProject() {
  const template = STARTER_TEMPLATES.find((t) => t.id === 'landing')!;
  const { elements: templateElements, rootChildIds } = buildTemplate(template);

  const elements: Record<string, CanvasElement> = {
    root: {
      id: 'root', type: 'container', width: 375, height: 600,
      styles: {
        display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff',
        minHeight: '600px', padding: '20px', gap: '16px',
      },
      isContainer: true, children: rootChildIds, classes: [],
    },
    ...templateElements,
  };

  // The hero is the template's first block; give it something to override.
  const hero = elements[rootChildIds[0]];
  hero.responsiveStyles = { tablet: { paddingTop: '48px' } };

  const project = {
    id: 'test', name: 'Landing Test', elements,
    activeTabId: 't', tabs: { t: { id: 't', name: 'Home', elements } },
    breakpoints: {
      mobile: { name: 'mobile', width: 375 },
      tablet: { name: 'tablet', width: 768 },
      desktop: { name: 'desktop', width: 1024 },
    },
    currentBreakpoint: 'mobile',
  };

  return { project, elements, hero };
}

/** Export the landing project, optionally with non-default settings. */
function exportLanding(options: Partial<ExportOptions> = {}) {
  const { project, elements, hero } = buildLandingProject();
  const { html, css } = new CodeGenerator(project, {}, elements, options).exportProject();
  return { html, css, hero, elements };
}

/** Class names appearing in `class="…"` attributes. */
function classesInMarkup(html: string): Set<string> {
  const found = new Set<string>();
  for (const [, value] of html.matchAll(/class="([^"]*)"/g)) {
    for (const name of value.split(/\s+/).filter(Boolean)) found.add(name);
  }
  return found;
}

/** Class names appearing in rule selectors, ignoring at-rule wrappers. */
function classesInStylesheet(css: string): Set<string> {
  const found = new Set<string>();
  for (const [, name] of css.matchAll(/\.([a-zA-Z_][\w-]*)\s*\{/g)) found.add(name);
  return found;
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

/**
 * The stylesheet has to describe the markup it ships with. It used to describe
 * something else entirely — the HTML carried classes invented by the CSS
 * optimiser while the CSS selected `[data-element-id="…"]`, an attribute the
 * generator never wrote — so every exported page arrived unstyled.
 */
test.describe('the stylesheet matches the markup', () => {
  test('every rule selects something the page actually has', async () => {
    const { html, css } = exportLanding();

    const inMarkup = classesInMarkup(html);
    const orphans = [...classesInStylesheet(css)].filter((name) => !inMarkup.has(name));

    expect(orphans, 'CSS rules selecting classes that appear in no element').toEqual([]);
  });

  test('every styled element is selected by a rule', async () => {
    const { css, elements } = exportLanding();

    const styled = Object.values(elements).filter(
      (element) => Object.keys(element.styles || {}).length > 0
    );
    expect(styled.length, 'the landing template should style its elements').toBeGreaterThan(5);

    const inStylesheet = classesInStylesheet(css);
    // Template elements carry their own class; the root has none, so the
    // generator makes one for it.
    const missing = styled
      .filter((element) => {
        const name = element.classes?.[0] ?? `el-${element.id}`;
        return !inStylesheet.has(name);
      })
      .map((element) => element.id);

    expect(missing, 'elements whose styles reached no CSS rule').toEqual([]);
  });

  test('no selector relies on an attribute the generator never writes', async () => {
    const { html, css } = exportLanding();

    expect(css).not.toContain('[data-element-id=');
    expect(html).not.toContain('data-element-id=');
  });

  test('property names are CSS, not JavaScript', async () => {
    const { css } = exportLanding();

    const camelCased = [...css.matchAll(/^\s*([a-z]+[A-Z][a-zA-Z]*)\s*:/gm)].map((m) => m[1]);

    expect(camelCased, 'camelCase property names — a browser drops the rest of the rule').toEqual([]);
  });

  test('a nested style record never leaks into a rule', async () => {
    const { css } = exportLanding();

    expect(css).not.toContain('responsive-styles');
    expect(css).not.toContain('[object Object]');
  });

  test('the exported page renders with the colours it was designed in', async ({ page }) => {
    const { html, css, hero } = exportLanding();
    const heroClass = hero.classes![0];

    await page.setContent(html.replace(/<link rel="stylesheet"[^>]*>/, `<style>${css}</style>`), {
      waitUntil: 'domcontentloaded',
    });

    const computed = await page.evaluate((selector) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const style = getComputedStyle(el);
      return { background: style.backgroundColor, display: style.display, radius: style.borderRadius };
    }, `.${heroClass}`);

    // #eff6ff, flex and 12px are what the landing template designs the hero as.
    expect(computed, `no element matched .${heroClass}`).not.toBeNull();
    expect(computed!.background).toBe('rgb(239, 246, 255)');
    expect(computed!.display).toBe('flex');
    expect(computed!.radius).toBe('12px');
  });
});

test.describe('export settings', () => {
  test('responsive breakpoints are included, and can be left out', async () => {
    const withMedia = exportLanding({ includeResponsive: true }).css;
    const withoutMedia = exportLanding({ includeResponsive: false }).css;

    expect(withMedia).toContain('@media (min-width: 768px)');
    expect(withMedia).toContain('padding-top: 48px');
    expect(withoutMedia).not.toContain('@media (min-width:');
    // Only the breakpoint overrides go; the base rules stay.
    expect(withoutMedia).toContain('background-color: #eff6ff');
  });

  test('minifying visibly changes the CSS', async () => {
    const readable = exportLanding({ minifyCSS: false }).css;
    const minified = exportLanding({ minifyCSS: true }).css;

    expect(readable).toContain('\n');
    expect(minified).not.toContain('\n');
    expect(minified.length).toBeLessThan(readable.length);
  });

  test('minifying changes nothing a browser can see', async ({ page }) => {
    const { html, hero } = exportLanding();
    const heroClass = hero.classes![0];

    const render = async (css: string) => {
      await page.setContent(html.replace(/<link rel="stylesheet"[^>]*>/, `<style>${css}</style>`), {
        waitUntil: 'domcontentloaded',
      });
      return page.evaluate((selector) => {
        const el = document.querySelector(selector)!;
        const style = getComputedStyle(el);
        return [style.backgroundColor, style.padding, style.borderRadius, style.gap].join(' | ');
      }, `.${heroClass}`);
    };

    const readable = await render(exportLanding({ minifyCSS: false }).css);
    const minified = await render(exportLanding({ minifyCSS: true }).css);

    expect(minified).toBe(readable);
  });

  test('comments are off by default and label the sections when on', async () => {
    const plain = exportLanding({ includeComments: false }).css;
    const commented = exportLanding({ includeComments: true }).css;

    expect(plain).not.toContain('/*');
    expect(commented).toContain('/* Landing Test — exported from Framly */');
    expect(commented).toContain('/* Reset */');
    expect(commented).toContain('/* Styles */');
    expect(commented).toContain('/* Responsive overrides */');
  });

  test('minifying wins over comments, because minified CSS has none', async () => {
    const css = exportLanding({ minifyCSS: true, includeComments: true }).css;

    expect(css).not.toContain('/*');
  });

  test('the default export is the readable one', async () => {
    const css = exportLanding().css;

    expect(css, 'minifying should be a choice, not the default').toContain('\n');
    expect(css).toContain('@media (min-width: 768px)');
    expect(css).not.toContain('/*');
  });
});

test.describe('the minifier', () => {
  test('keeps what is inside a string', async () => {
    expect(minifyCSS('.a { content: "x; y }"; }')).toBe('.a{content:"x; y }"}');
    expect(minifyCSS(".a { font-family: 'Segoe UI', sans-serif; }"))
      .toBe(".a{font-family:'Segoe UI',sans-serif}");
  });

  test('removes comments', async () => {
    expect(minifyCSS('/* gone */\n.a { color: red; }')).toBe('.a{color:red}');
  });

  test('keeps a descendant combinator', async () => {
    expect(minifyCSS('.a .b { color: red; }')).toBe('.a .b{color:red}');
    expect(minifyCSS('@media (min-width: 768px) { .a { color: red; } }'))
      .toBe('@media (min-width:768px){.a{color:red}}');
  });
});
