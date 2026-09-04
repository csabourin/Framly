import { CanvasElement, Project } from '../types/canvas';
import { CSSOptimizer } from './cssOptimizer';
import { generateColorModeCSS, combineColorModeCSS, isColorModeValues, ColorModeCSS } from './colorModeHelper';

interface CustomClass {
  name: string;
  styles: Record<string, any>;
  description?: string;
  category?: string;
}

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

export class CodeGenerator {
  private project: any; // Use any for now to handle dynamic project structure  
  private cssOptimizer: CSSOptimizer;
  private customClasses: Record<string, CustomClass>;
  private expandedElements?: Record<string, CanvasElement>; // CRITICAL: Support expanded elements
  
  constructor(project: any, customClasses: Record<string, CustomClass> = {}, expandedElements?: Record<string, CanvasElement>) {
    this.project = project;
    this.cssOptimizer = new CSSOptimizer();
    this.customClasses = customClasses;
    this.expandedElements = expandedElements; // Use expanded elements if provided
  }
  
  generateHTML(): string {
    // CRITICAL: Use expanded elements when available to include component instance children
    const elements = this.expandedElements || this.project.elements || {};
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
    
    // Generate optimized classes for this element
    const optimizedClasses = this.getOptimizedClasses(element);
    const classes = optimizedClasses.length > 0 ? optimizedClasses.join(' ') : '';
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
      const elements = this.expandedElements || this.project.elements || {};
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
    const content = element.content?.replace(/<[^>]*>/g, '').trim();
    return content || CONTROL_FALLBACK_NAMES[element.type] || 'Form control';
  }
  
  generateCSS(): string {
    const cssObjects: ColorModeCSS[] = [];
    
    // Reset styles
    const resetCSS = `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
}`;
    
    // Generate CSS for custom classes with color mode support
    Object.values(this.customClasses).forEach(customClass => {
      if (customClass.styles && Object.keys(customClass.styles).length > 0) {
        const selector = `.${customClass.name}`;
        const colorModeCSS = generateColorModeCSS(selector, customClass.styles);
        cssObjects.push(colorModeCSS);
      }
    });
    
    // Generate element-specific styles for elements without classes
    const elementsRecord = this.expandedElements || this.project.elements || {};
    const elements = Object.values(elementsRecord) as CanvasElement[];
    elements.forEach((element) => {
      // Only generate element styles if no custom classes are applied
      if (!element.classes || element.classes.length === 0) {
        const elementSelector = `[data-element-id="${element.id}"]`;
        const colorModeCSS = generateColorModeCSS(elementSelector, element.styles);
        cssObjects.push(colorModeCSS);
      }
    });
    
    // Generate responsive breakpoint styles
    const responsiveCSS = this.generateResponsiveCSS();
    
    // Combine all CSS with color mode support
    const colorModeOutput = combineColorModeCSS(cssObjects);
    
    return [resetCSS, colorModeOutput, responsiveCSS].filter(Boolean).join('\n\n');
  }

  generateLegacyCSS(): string {
    const elements = Object.values(this.project.elements) as CanvasElement[];
    const cssRules: string[] = [];
    
    // Reset styles
    cssRules.push(`* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}`);
    
    cssRules.push(`body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
}`);
    
    // Generate CSS for unique class names only
    const processedClasses = new Set<string>();
    const classToElementMap = new Map<string, CanvasElement>();
    
    // Map classes to their first element to avoid duplicates
    elements.forEach((element) => {
      if (element.classes && element.classes.length > 0) {
        element.classes.forEach((className: string) => {
          if (!processedClasses.has(className)) {
            processedClasses.add(className);
            classToElementMap.set(className, element);
          }
        });
      }
    });
    
    // Generate CSS for unique classes
    classToElementMap.forEach((element, className) => {
      const selector = `.${className}`;
      const styles = this.generateCSSProperties(element);
      if (styles) {
        cssRules.push(`${selector} {
${styles}
}`);
      }
    });
    
    // Generate responsive breakpoint styles
    const responsiveCSS = this.generateResponsiveCSS();
    
    return [cssRules.join('\n\n'), responsiveCSS].filter(Boolean).join('\n\n');
  }
  
  private generateCustomClassCSS(styles: Record<string, any>): string {
    // Use color mode helper to generate proper CSS with color modes
    const colorModeCSS = generateColorModeCSS('', styles);
    const cssProps: string[] = [];
    
    // Extract base CSS properties (remove selector wrapper)
    if (colorModeCSS.baseCSS) {
      const baseLines = colorModeCSS.baseCSS.split('\n').slice(1, -1); // Remove wrapper lines
      cssProps.push(...baseLines);
    }
    
    return cssProps.join('\n');
  }
  
  private generateCSSProperties(element: CanvasElement): string {
    const styles: string[] = [];
    
    if (!element.styles || typeof element.styles !== 'object') {
      return '';
    }
    
    Object.entries(element.styles).forEach(([property, value]) => {
      if (isColorModeValues(value)) {
        // Use light mode as default, fallback to dark or high-contrast
        const defaultValue = value.light || value.dark || value['high-contrast'];
        if (defaultValue) {
          const cssProperty = this.camelToKebab(property);
          styles.push(`    ${cssProperty}: ${defaultValue};`);
        }
      } else if (value !== undefined && value !== null && value !== '' && typeof value !== 'object') {
        // Only process primitive values, skip objects that aren't ColorModeValues
        const cssProperty = this.camelToKebab(property);
        styles.push(`    ${cssProperty}: ${value};`);
      }
    });
    
    return styles.join('\n');
  }
  
  private camelToKebab(str: string): string {
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
  }
  
  private generateResponsiveCSS(): string {
    const breakpoints = Object.entries(this.project.breakpoints || {});
    const responsiveRules: string[] = [];
    
    // Get all elements for responsive styles
    const elementsRecord = this.expandedElements || this.project.elements || {};
    const elements = Object.values(elementsRecord) as CanvasElement[];
    
    // Generate styles for each breakpoint (mobile-first)
    breakpoints.forEach(([breakpointName, config]) => {
      if (breakpointName === 'mobile') return; // Mobile is base styles
      
      const breakpointConfig = config as any;
      if (!breakpointConfig.width) return;
      
      const breakpointStyles: string[] = [];
      
      // Check custom classes for responsive styles
      Object.values(this.customClasses).forEach(customClass => {
        const responsiveStyles = customClass.styles?.responsiveStyles as any;
        if (responsiveStyles?.[breakpointName]) {
          const styles = responsiveStyles[breakpointName];
          const cssProps = Object.entries(styles)
            .map(([prop, value]) => `    ${this.camelToKebab(prop)}: ${value};`)
            .join('\n');
          if (cssProps) {
            breakpointStyles.push(`  .${customClass.name} {\n${cssProps}\n  }`);
          }
        }
      });
      
      // Check elements for responsive styles
      elements.forEach(element => {
        const responsiveStyles = element.responsiveStyles as any;
        if (responsiveStyles?.[breakpointName]) {
          const styles = responsiveStyles[breakpointName];
          const cssProps = Object.entries(styles)
            .map(([prop, value]) => `    ${this.camelToKebab(prop)}: ${value};`)
            .join('\n');
          
          if (cssProps) {
            const selector = element.classes && element.classes.length > 0 
              ? `.${element.classes[0]}`
              : `[data-element-id="${element.id}"]`;
            breakpointStyles.push(`  ${selector} {\n${cssProps}\n  }`);
          }
        }
      });
      
      if (breakpointStyles.length > 0) {
        responsiveRules.push(`@media (min-width: ${breakpointConfig.width}px) {\n${breakpointStyles.join('\n\n')}\n}`);
      }
    });
    
    return responsiveRules.join('\n\n');
  }
  
  generateReactComponent(): string {
    // CRITICAL: Use expanded elements when available for React generation too
    const elements = this.expandedElements || this.project.elements || {};
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
    
    // Generate optimized classes for this element
    const optimizedClasses = this.getOptimizedClasses(element);
    const classes = optimizedClasses.length > 0 ? optimizedClasses.join(' ') : '';
    const tag = this.getHTMLTag(element);
    
    let content = '';
    
    if (element.type === 'text' && element.content) {
      content = element.content;
    } else if (element.type === 'button' && element.buttonText) {
      content = element.buttonText;
    } else if (element.type === 'image') {
      const src = element.imageUrl || element.imageBase64 || 'placeholder.jpg';
      return `${indent}<img className="${classes}" src={${JSON.stringify(src)}} alt={${JSON.stringify(element.imageAlt || '')}} />`;
    } else if (element.children && element.children.length > 0) {
      // CRITICAL: Use expanded elements when available for child lookup
      const elements = this.expandedElements || this.project.elements || {};
      content = element.children
        .map(childId => {
          const child = elements[childId];
          return child ? this.generateReactElementJSX(child, depth + 1) : '';
        })
        .join('\n');
    }

    if (VOID_ELEMENTS.has(tag)) {
      return `${indent}<${tag} className="${classes}" />`;
    }
    
    if (content) {
      return `${indent}<${tag} className="${classes}">
${content}
${indent}</${tag}>`;
    } else {
      return `${indent}<${tag} className="${classes}" />`;
    }
  }
  
  private getOptimizedClasses(element: CanvasElement): string[] {
    const classes: string[] = [];
    
    // Add existing custom classes
    if (element.classes && element.classes.length > 0) {
      classes.push(...element.classes);
    }
    
    // Check if we can use utility classes for this element's styles
    if (element.styles && Object.keys(element.styles).length > 0) {
      try {
        const utilityClass = this.cssOptimizer.getUtilityClass(element.styles);
        if (utilityClass) {
          classes.push(utilityClass);
        } else {
          const componentClass = this.cssOptimizer.getComponentClass(element.styles);
          if (componentClass) {
            classes.push(componentClass);
          } else {
            // Generate a unique class for this element
            classes.push(`el-${element.id.split('-').pop()}`);
          }
        }
      } catch (error) {
        // Fallback to element classes
        if (element.classes && element.classes.length > 0) {
          return element.classes;
        } else {
          // Generate a fallback class
          classes.push(`el-${element.id.split('-').pop()}`);
        }
      }
    }
    
    return classes;
  }

  exportProject(): { 
    html: string; 
    css: string; 
    react: string; 
    optimizedCSS?: string;
    cssAnalysis?: any;
  } {
    try {
      // CRITICAL: Use expanded elements for CSS optimization too
      const elements = this.expandedElements || this.project.elements || {};
      const optimizedCSS = this.cssOptimizer.optimizeCSS(elements);
      
      return {
        html: this.generateHTML(),
        css: this.generateCSS(),
        react: this.generateReactComponent(),
        optimizedCSS: this.cssOptimizer.generateOptimizedCSS(optimizedCSS),
        cssAnalysis: {
          utilityClasses: optimizedCSS.utilities.length,
          componentClasses: optimizedCSS.components.length,
          layoutClasses: optimizedCSS.layout.length,
          criticalCSS: optimizedCSS.critical.length
        }
      };
    } catch (error) {
      // Fallback to legacy CSS generation
      return {
        html: this.generateHTML(),
        css: this.generateLegacyCSS(),
        react: this.generateReactComponent()
      };
    }
  }
}
