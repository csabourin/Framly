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

/**
 * Colour-mode wrappers. `combineColorModeCSS` emits `.dark { … }` and
 * `.high-contrast { … }` around copies of the ordinary rules, for a class the
 * page's own author puts on `<html>`. They are not selectors for elements the
 * generator writes, so they are not orphans.
 */
const COLOR_MODE_WRAPPERS = new Set(['dark', 'high-contrast']);

/** Class names appearing in rule selectors, ignoring at-rule wrappers. */
function classesInStylesheet(css: string): Set<string> {
  const found = new Set<string>();
  for (const [, name] of css.matchAll(/\.([a-zA-Z_][\w-]*)\s*\{/g)) {
    if (!COLOR_MODE_WRAPPERS.has(name)) found.add(name);
  }
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

/**
 * A class registered in `customClasses` is shared: several elements may carry
 * it, and one element's ad-hoc styles must not be written onto it. The
 * templates never produce this shape — they give every element a class of its
 * own — so it needs stating directly.
 */
test.describe('a shared class is not written to', () => {
  /** Two elements on one named class, each with styles of its own. */
  function buildSharedClassProject() {
    const elements: Record<string, CanvasElement> = {
      root: {
        id: 'root', type: 'container', width: 375, height: 600,
        styles: {}, isContainer: true, children: ['a', 'b'], classes: [],
      },
      a: {
        id: 'a', type: 'text', width: 100, height: 20, parent: 'root',
        content: 'First', classes: ['card'], styles: { color: '#111111' },
      },
      b: {
        id: 'b', type: 'text', width: 100, height: 20, parent: 'root',
        content: 'Second', classes: ['card'], styles: { color: '#222222' },
      },
    };

    const customClasses = {
      card: { name: 'card', styles: { padding: '16px', borderRadius: '8px' } },
    };

    const project = {
      id: 'test', name: 'Shared Class Test', elements,
      activeTabId: 't', tabs: { t: { id: 't', name: 'Home', elements } },
      breakpoints: { mobile: { name: 'mobile', width: 375 }, tablet: { name: 'tablet', width: 768 } },
      currentBreakpoint: 'mobile',
    };

    return new CodeGenerator(project, customClasses, elements).exportProject();
  }

  test('the shared rule carries only what the class defines', async () => {
    const { css } = buildSharedClassProject();

    const cardRule = css.match(/\.card \{([\s\S]*?)\}/)![1];

    expect(cardRule).toContain('padding: 16px');
    expect(cardRule).toContain('border-radius: 8px');
    expect(cardRule, "one element's own colour must not land on the shared class")
      .not.toContain('#111111');
    expect(cardRule).not.toContain('#222222');
  });

  test('each element gets its own class for its own styles', async () => {
    const { html, css } = buildSharedClassProject();

    // Both elements still carry the shared class in the markup…
    expect((html.match(/class="[^"]*\bcard\b/g) ?? []).length).toBe(2);

    // …and each has a generated class of its own holding its colour.
    expect(css).toMatch(/\.el-a \{[^}]*color: #111111/);
    expect(css).toMatch(/\.el-b \{[^}]*color: #222222/);
    expect(html).toContain('class="card el-a"');
    expect(html).toContain('class="card el-b"');
  });

  test('every rule still selects something the page has', async () => {
    const { html, css } = buildSharedClassProject();

    const inMarkup = classesInMarkup(html);
    const orphans = [...classesInStylesheet(css)].filter((name) => !inMarkup.has(name));

    expect(orphans).toEqual([]);
  });
});

/**
 * A colour-mode value is an object, not a string. The base rules hand it to
 * `generateColorModeCSS`, which splits it across `prefers-color-scheme` blocks;
 * nothing does that inside a media query, so a breakpoint override has to
 * resolve it to one value or the declaration is written as `[object Object]`
 * and lost.
 */
test.describe('colour-mode values inside a breakpoint', () => {
  function buildColorModeOverride() {
    const elements: Record<string, CanvasElement> = {
      root: {
        id: 'root', type: 'container', width: 375, height: 600,
        styles: {}, isContainer: true, children: ['a'], classes: [],
      },
      a: {
        id: 'a', type: 'text', width: 100, height: 20, parent: 'root',
        content: 'Themed', classes: ['themed'], styles: { color: '#000000' },
        responsiveStyles: {
          tablet: { backgroundColor: { light: '#ffffff', dark: '#111111' } as any },
        },
      },
    };

    const project = {
      id: 'test', name: 'Colour Mode Test', elements,
      activeTabId: 't', tabs: { t: { id: 't', name: 'Home', elements } },
      breakpoints: { mobile: { name: 'mobile', width: 375 }, tablet: { name: 'tablet', width: 768 } },
      currentBreakpoint: 'mobile',
    };

    return new CodeGenerator(project, {}, elements).exportProject();
  }

  test('resolve to a real value, not [object Object]', async () => {
    const { css } = buildColorModeOverride();

    expect(css).not.toContain('[object Object]');
    expect(css).toMatch(/@media \(min-width: 768px\)[\s\S]*background-color: #ffffff;/);
  });

  test('and the browser keeps the declaration', async ({ page }) => {
    const { html, css } = buildColorModeOverride();

    await page.setViewportSize({ width: 900, height: 600 });
    await page.setContent(html.replace(/<link rel="stylesheet"[^>]*>/, `<style>${css}</style>`), {
      waitUntil: 'domcontentloaded',
    });

    const background = await page
      .locator('.themed')
      .evaluate((el) => getComputedStyle(el).backgroundColor);

    expect(background, 'the override applies above 768px').toBe('rgb(255, 255, 255)');
  });
});
