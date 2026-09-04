import { CanvasElement, Project } from '../types/canvas';
import { generateColorModeCSS, combineColorModeCSS, isColorModeValues, ColorModeCSS } from './colorModeHelper';

interface CustomClass {
  name: string;
  styles: Record<string, any>;
  description?: string;
  category?: string;
}

/** The three choices offered in the export dialog. */
export interface ExportOptions {
  /** Emit the `@media (min-width: …)` blocks for the non-mobile breakpoints. */
  includeResponsive: boolean;
  /** Strip whitespace and comments from the stylesheet. */
  minifyCSS: boolean;
  /** Label each section of the stylesheet. */
  includeComments: boolean;
}

/**
 * Minifying is off by default: promise #1 is code a programmer would sign off,
 * and that is the readable version. Minifying is a deliberate choice, not the
 * thing that happens to you.
 */
export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  includeResponsive: true,
  minifyCSS: false,
  includeComments: false,
};

/** HTML elements that take no children and must not get a closing tag. */
const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

/**
 * Tag for each element type that does not carry its own `htmlTag`.
 * Types created by `createDefaultElement` already set `htmlTag` (section, nav,
 * header, footer, article, a, pre, hr, video, audio, input, textarea, select,
 * label); this covers the rest.
 */
const TYPE_TAGS: Partial<Record<CanvasElement['type'], string>> = {
  text: 'p',
  button: 'button',
  image: 'img',
  container: 'div',
  rectangle: 'div',
  component: 'div',
  element: 'div',
  section: 'section',
  nav: 'nav',
  header: 'header',
  footer: 'footer',
  article: 'article',
  link: 'a',
  code: 'pre',
  divider: 'hr',
  video: 'video',
  audio: 'audio',
  input: 'input',
  textarea: 'textarea',
  dropdown: 'select',
  checkbox: 'label',
  radio: 'label',
};

/** Accessible name used when a form control carries no content of its own. */
const CONTROL_FALLBACK_NAMES: Partial<Record<CanvasElement['type'], string>> = {
  input: 'Text input',
  textarea: 'Text area',
  dropdown: 'Select an option',
};

/** Only tag names we are prepared to emit - anything else falls back to div. */
const SAFE_TAG = /^[a-z][a-z0-9-]*$/;

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const escapeAttr = (value: string): string =>
  escapeHtml(value).replace(/"/g, '&quot;');

/**
 * Text of a string that may contain markup.
 *
 * Prefers DOMParser, which handles nesting and entities correctly. Falls back
 * to stripping so the generator keeps working with no DOM - it is otherwise a
 * pure transformation, and tying it to the browser would rule out running an
 * export anywhere else.
 */
const extractText = (value: string): string => {
  if (typeof DOMParser !== 'undefined') {
    return new DOMParser().parseFromString(value, 'text/html').body.textContent?.trim() ?? '';
  }

  return value
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
};

/**
 * The base every exported page starts from. Indented two spaces to match the
 * rules generated below it, so the stylesheet reads as one file.
 */
const RESET_CSS = `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
}`;

const camelToKebab = (property: string): string =>
  property.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();

/**
 * A style record turned into real CSS declarations.
 *
 * Style keys are camelCase because that is what React needs on the canvas;
 * a stylesheet needs `background-color`, not `backgroundColor`, and a browser
 * silently drops the rest of a rule after a property it cannot parse. Values
 * that are neither a primitive nor a colour-mode object are dropped — that is
 * how nested records such as `responsiveStyles` stay out of the base rule.
 */
const toCssDeclarations = (styles: Record<string, any> | undefined): Record<string, any> => {
  const declarations: Record<string, any> = {};
  if (!styles || typeof styles !== 'object') return declarations;

  for (const [property, value] of Object.entries(styles)) {
    if (value === undefined || value === null || value === '') continue;
    if (typeof value === 'object' && !isColorModeValues(value)) continue;
    declarations[camelToKebab(property)] = value;
  }

  return declarations;
};

/** Punctuation that may lose the whitespace in front of it. */
const TIGHT_BEFORE = new Set(['{', '}', ';', ',']);
/** Punctuation that may lose the whitespace after it. A space before `:` is
 *  kept, because in a selector it is a descendant combinator. */
const TIGHT_AFTER = new Set(['{', '}', ';', ',', ':']);

/**
 * Minify a stylesheet.
 *
 * A whitespace remover, not a rewriter: it drops comments, collapses runs of
 * whitespace and tightens up around punctuation, and does nothing else. Quoted
 * strings are copied through character for character, so a value containing a
 * brace or a semicolon survives intact.
 */
export function minifyCSS(css: string): string {
  let out = '';
  let pendingSpace = false;

  for (let i = 0; i < css.length; i++) {
    const char = css[i];

    if (char === '"' || char === "'") {
      if (pendingSpace && out && !TIGHT_AFTER.has(out[out.length - 1])) out += ' ';
      pendingSpace = false;
      out += char;
      for (i++; i < css.length; i++) {
        out += css[i];
        if (css[i] === '\\' && i + 1 < css.length) {
          out += css[++i];
          continue;
        }
        if (css[i] === char) break;
      }
      continue;
    }

    if (char === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      i = end === -1 ? css.length : end + 1;
      continue;
    }

    if (/\s/.test(char)) {
      pendingSpace = true;
      continue;
    }

    if (TIGHT_BEFORE.has(char)) {
      pendingSpace = false;
      // The last declaration in a rule does not need its semicolon.
      if (char === '}') while (out.endsWith(';')) out = out.slice(0, -1);
    } else if (pendingSpace) {
      if (out && !TIGHT_AFTER.has(out[out.length - 1])) out += ' ';
      pendingSpace = false;
    }

    out += char;
  }

  return out.trim();
}

export class CodeGenerator {
  private project: any; // Use any for now to handle dynamic project structure
  private customClasses: Record<string, CustomClass>;
  private expandedElements?: Record<string, CanvasElement>; // CRITICAL: Support expanded elements
  private options: ExportOptions;
  private styleClasses?: Map<string, string>;

  constructor(
    project: any,
    customClasses: Record<string, CustomClass> = {},
    expandedElements?: Record<string, CanvasElement>,
    options: Partial<ExportOptions> = {}
  ) {
    this.project = project;
    this.customClasses = customClasses;
    this.expandedElements = expandedElements; // Use expanded elements if provided
    this.options = { ...DEFAULT_EXPORT_OPTIONS, ...options };
  }

  /** Every element in the document being exported, keyed by id. */
  private getElements(): Record<string, CanvasElement> {
    return this.expandedElements || this.project.elements || {};
  }

  generateHTML(): string {
    // CRITICAL: Use expanded elements when available to include component instance children
    const elements = this.getElements();
    const rootElement = elements.root;
    if (!rootElement) return '';
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.project.name}</title>
    <link rel="stylesheet" href="${this.project.name.replace(/\s+/g, '-').toLowerCase()}.css">
</head>
<body>
${this.generateElementHTML(rootElement, 1)}
</body>
</html>`;
    
    return html;
  }
  
  private generateElementHTML(element: CanvasElement, depth: number): string {
    const indent = '    '.repeat(depth);
    
    const classes = this.getElementClasses(element).join(' ');
    const tag = this.getHTMLTag(element);
    
    const classAttr = classes ? ` class="${escapeAttr(classes)}"` : '';

    // Form controls have no visible label on the canvas, so carry their
    // accessible name across as aria-label rather than exporting a nameless
    // control. checkbox/radio are labels wrapping their own input instead.
    if (element.type === 'input') {
      return `${indent}<input${classAttr} type="text" aria-label="${escapeAttr(this.getControlName(element))}" />`;
    }

    if (element.type === 'textarea') {
      return `${indent}<textarea${classAttr} aria-label="${escapeAttr(this.getControlName(element))}"></textarea>`;
    }

    if (element.type === 'dropdown') {
      const options = element.content?.trim() || '<option>Option</option>';
      return `${indent}<select${classAttr} aria-label="${escapeAttr(this.getControlName(element))}">
${indent}    ${options}
${indent}</select>`;
    }

    if (element.type === 'checkbox' || element.type === 'radio') {
      // Radios in the same container form one group.
      const groupAttr = element.type === 'radio'
        ? ` name="${escapeAttr(element.parent || 'radio-group')}"`
        : '';
      return `${indent}<label${classAttr}>
${indent}    <input type="${element.type}"${groupAttr} />
${indent}    ${escapeHtml(this.getControlName(element))}
${indent}</label>`;
    }

    if (element.type === 'image') {
      const src = element.imageUrl || element.imageBase64 || 'placeholder.jpg';
      // An empty alt marks the image decorative, which is the honest default
      // when the designer has not described it.
      return `${indent}<img${classAttr} src="${escapeAttr(src)}" alt="${escapeAttr(element.imageAlt || '')}" />`;
    }

    if (element.type === 'code') {
      return `${indent}<pre${classAttr}><code>${escapeHtml(element.content || '')}</code></pre>`;
    }

    if (element.type === 'link') {
      return `${indent}<a${classAttr} href="#">${element.content || 'Link'}</a>`;
    }

    // controls keeps media keyboard-operable; without it there is no way to play it.
    if (element.type === 'video' || element.type === 'audio') {
      return `${indent}<${tag}${classAttr} controls></${tag}>`;
    }

    if (VOID_ELEMENTS.has(tag)) {
      return `${indent}<${tag}${classAttr} />`;
    }

    let content = '';

    if (element.type === 'text' && element.content) {
      content = element.content;
    } else if (element.type === 'heading' && element.content) {
      content = element.content;
    } else if (element.type === 'button' && element.buttonText) {
      content = element.buttonText;
    } else if (element.type === 'list' && element.listItems) {
      const listItems = element.listItems.map(item => `${indent}    <li>${item}</li>`).join('\n');
      content = '\n' + listItems + '\n' + indent;
    } else if (element.children && element.children.length > 0) {
      // CRITICAL: Use expanded elements when available for child lookup
      const elements = this.getElements();
      content = element.children
        .map(childId => {
          const child = elements[childId];
          return child ? this.generateElementHTML(child, depth + 1) : '';
        })
        .join('\n');
    }
    
    if (content) {
      return `${indent}<${tag}${classAttr}>
${content}
${indent}</${tag}>`;
    } else {
      return `${indent}<${tag}${classAttr}></${tag}>`;
    }
  }

  private getHTMLTag(element: CanvasElement): string {
    // Heading level and list type are properties of the element, so they win
    // over any stored htmlTag.
    if (element.type === 'heading') {
      const level = Math.min(Math.max(element.headingLevel || 1, 1), 6);
      return `h${level}`;
    }

    if (element.type === 'list') {
      return (element.listType || 'unordered') === 'ordered' ? 'ol' : 'ul';
    }

    // Imported elements and the semantic toolbar types carry their own tag.
    const stored = element.htmlTag?.toLowerCase().trim();
    if (stored && SAFE_TAG.test(stored)) {
      return stored;
    }

    return TYPE_TAGS[element.type] || 'div';
  }

  /** Accessible name for a form control that has no visible label of its own. */
  private getControlName(element: CanvasElement): string {
    const content = extractText(element.content || '');
    return content || CONTROL_FALLBACK_NAMES[element.type] || 'Form control';
  }
  
  generateCSS(): string {
    const cssObjects: ColorModeCSS[] = [];

    // Named classes the user has defined, which several elements may share.
    Object.values(this.customClasses).forEach((customClass) => {
      const declarations = toCssDeclarations(customClass.styles);
      if (Object.keys(declarations).length > 0) {
        cssObjects.push(generateColorModeCSS(`.${customClass.name}`, declarations));
      }
    });

    // Each element's own styles, on the class the markup actually carries.
    const styleClasses = this.resolveStyleClasses();
    Object.values(this.getElements()).forEach((element) => {
      const styleClass = styleClasses.get(element.id);
      if (!styleClass) return;

      const declarations = toCssDeclarations(element.styles);
      if (Object.keys(declarations).length === 0) return;

      cssObjects.push(generateColorModeCSS(`.${styleClass}`, declarations));
    });

    const header = this.options.includeComments
      ? `/* ${this.project.name} — exported from Framly */`
      : '';

    const css = [
      header,
      this.section('Reset', RESET_CSS),
      this.section('Styles', combineColorModeCSS(cssObjects)),
      this.section('Responsive overrides', this.generateResponsiveCSS()),
    ]
      .filter(Boolean)
      .join('\n\n');

    return this.options.minifyCSS ? minifyCSS(css) : css;
  }

  /**
   * A labelled block of the stylesheet. The label is what "include comments"
   * turns on; an empty body drops the section entirely, so an export never
   * carries a heading over nothing.
   */
  private section(title: string, body: string): string {
    if (!body.trim()) return '';
    return this.options.includeComments ? `/* ${title} */\n${body}` : body;
  }

  private generateResponsiveCSS(): string {
    if (!this.options.includeResponsive) return '';

    const breakpoints = Object.entries(this.project.breakpoints || {});
    const responsiveRules: string[] = [];
    const styleClasses = this.resolveStyleClasses();

    const rule = (selector: string, styles: Record<string, any>): string | null => {
      const declarations = Object.entries(toCssDeclarations(styles))
        .map(([property, value]) => `    ${property}: ${value};`)
        .join('\n');
      return declarations ? `  ${selector} {\n${declarations}\n  }` : null;
    };

    // Mobile is the base; every other breakpoint is a min-width override.
    breakpoints.forEach(([breakpointName, config]) => {
      if (breakpointName === 'mobile') return;

      const breakpointConfig = config as any;
      if (!breakpointConfig.width) return;

      const breakpointStyles: string[] = [];

      Object.values(this.customClasses).forEach((customClass) => {
        const styles = (customClass.styles?.responsiveStyles as any)?.[breakpointName];
        const css = styles ? rule(`.${customClass.name}`, styles) : null;
        if (css) breakpointStyles.push(css);
      });

      Object.values(this.getElements()).forEach((element) => {
        const styleClass = styleClasses.get(element.id);
        const styles = (element.responsiveStyles as any)?.[breakpointName];
        const css = styleClass && styles ? rule(`.${styleClass}`, styles) : null;
        if (css) breakpointStyles.push(css);
      });

      if (breakpointStyles.length > 0) {
        responsiveRules.push(
          `@media (min-width: ${breakpointConfig.width}px) {\n${breakpointStyles.join('\n\n')}\n}`
        );
      }
    });

    return responsiveRules.join('\n\n');
  }

  generateReactComponent(): string {
    // CRITICAL: Use expanded elements when available for React generation too
    const elements = this.getElements();
    const rootElement = elements.root;
    if (!rootElement) return '';
    
    return `import React from 'react';
import './styles.css';

function ${this.project.name.replace(/\s+/g, '')}() {
  return (
${this.generateReactElementJSX(rootElement, 2)}
  );
}

export default ${this.project.name.replace(/\s+/g, '')};`;
  }
  
  private generateReactElementJSX(element: CanvasElement, depth: number): string {
    const indent = '    '.repeat(depth);

    const classes = this.getElementClasses(element).join(' ');
    // An element with no classes gets no attribute rather than className="".
    const classAttr = classes ? ` className="${classes}"` : '';
    const tag = this.getHTMLTag(element);
    
    let content = '';
    
    if (element.type === 'text' && element.content) {
      content = element.content;
    } else if (element.type === 'button' && element.buttonText) {
      content = element.buttonText;
    } else if (element.type === 'image') {
      const src = element.imageUrl || element.imageBase64 || 'placeholder.jpg';
      return `${indent}<img${classAttr} src={${JSON.stringify(src)}} alt={${JSON.stringify(element.imageAlt || '')}} />`;
    } else if (element.children && element.children.length > 0) {
      // CRITICAL: Use expanded elements when available for child lookup
      const elements = this.getElements();
      content = element.children
        .map(childId => {
          const child = elements[childId];
          return child ? this.generateReactElementJSX(child, depth + 1) : '';
        })
        .join('\n');
    }

    if (VOID_ELEMENTS.has(tag)) {
      return `${indent}<${tag}${classAttr} />`;
    }

    if (content) {
      return `${indent}<${tag}${classAttr}>
${content}
${indent}</${tag}>`;
    } else {
      return `${indent}<${tag}${classAttr} />`;
    }
  }
  
  /**
   * The class that carries each element's own styles, for every element that
   * has any.
   *
   * Resolved once for the whole export so the markup and the stylesheet cannot
   * disagree. They used to, completely: the HTML emitted classes invented by
   * the CSS optimiser while the CSS emitted `[data-element-id="…"]` selectors
   * for an attribute that was never written, so an exported page arrived with
   * no styling on it at all.
   *
   * An element reuses a class of its own when it has one and nothing else has
   * claimed it. A class registered in `customClasses` is shared, so writing an
   * element's ad-hoc styles onto it would leak them onto every other element
   * using it; those elements get a generated class instead.
   *
   * One class per element is not the destination — shared classes are M4 — but
   * it is what the editor produces today, and it has to export correctly.
   */
  private resolveStyleClasses(): Map<string, string> {
    if (this.styleClasses) return this.styleClasses;

    const resolved = new Map<string, string>();
    const claimed = new Set<string>(Object.keys(this.customClasses));

    for (const element of Object.values(this.getElements())) {
      if (!this.needsStyleClass(element)) continue;

      const own = (element.classes || []).find((name) => name && !claimed.has(name));
      if (own) {
        claimed.add(own);
        resolved.set(element.id, own);
        continue;
      }

      let generated = `el-${element.id.replace(/[^a-zA-Z0-9_-]+/g, '-')}`;
      for (let suffix = 2; claimed.has(generated); suffix++) {
        generated = `el-${element.id.replace(/[^a-zA-Z0-9_-]+/g, '-')}-${suffix}`;
      }
      claimed.add(generated);
      resolved.set(element.id, generated);
    }

    this.styleClasses = resolved;
    return resolved;
  }

  /** Whether an element has anything worth writing a rule for. */
  private needsStyleClass(element: CanvasElement): boolean {
    if (Object.keys(toCssDeclarations(element.styles)).length > 0) return true;

    const responsive = element.responsiveStyles as Record<string, any> | undefined;
    return Object.values(responsive || {}).some(
      (styles) => Object.keys(toCssDeclarations(styles)).length > 0
    );
  }

  /** Every class an element carries in the exported markup. */
  private getElementClasses(element: CanvasElement): string[] {
    const classes = [...(element.classes || [])];
    const styleClass = this.resolveStyleClasses().get(element.id);
    if (styleClass && !classes.includes(styleClass)) classes.push(styleClass);
    return classes;
  }

  exportProject(): { html: string; css: string; react: string } {
    return {
      html: this.generateHTML(),
      css: this.generateCSS(),
      react: this.generateReactComponent(),
    };
  }
}
