import { CanvasElement, Project } from '../types/canvas';
import { CSSOptimizer } from './cssOptimizer';
import { generateColorModeCSS, combineColorModeCSS, isColorModeValues, ColorModeCSS } from './colorModeHelper';

interface CustomClass {
  name: string;
  styles: Record<string, any>;
  description?: string;
  category?: string;
}

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
    } else if (element.type === 'image') {
      return `${indent}<img class="${classes}" src="placeholder.jpg" alt="Image placeholder" />`;
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
      return `${indent}<${tag} class="${classes}">
${content}
${indent}</${tag}>`;
    } else {
      return `${indent}<${tag} class="${classes}"></${tag}>`;
    }
  }
  
  private getHTMLTag(element: CanvasElement): string {
    switch (element.type) {
      case 'text':
        return 'p';
      case 'heading':
        const headingLevel = element.headingLevel || 1;
        return `h${headingLevel}`;
      case 'button':
        return 'button';
      case 'list':
        const listType = element.listType || 'unordered';
        return listType === 'ordered' ? 'ol' : 'ul';
      case 'container':
        return 'div';
      case 'rectangle':
        return 'div';
      default:
        return 'div';
    }
  }
  
  generateCSS(): string {
    // Generate CSS including custom classes
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
    
    // Generate CSS for custom classes
    Object.values(this.customClasses).forEach(customClass => {
      if (customClass.styles && Object.keys(customClass.styles).length > 0) {
        const selector = `.${customClass.name}`;
        const styles = this.generateCustomClassCSS(customClass.styles);
        if (styles) {
          cssRules.push(`${selector} {
${styles}
}`);
        }
      }
    });
    
    // Generate element-specific styles for elements without classes
    // CRITICAL: Use expanded elements when available to include component instance children
    const elementsRecord = this.expandedElements || this.project.elements || {};
    const elements = Object.values(elementsRecord);
    elements.forEach((element: any) => {
      // Only generate element styles if no custom classes are applied
      if (!element.classes || element.classes.length === 0) {
        const elementSelector = `[data-element-id="${element.id}"]`;
        const styles = this.generateCSSProperties(element);
        if (styles) {
          cssRules.push(`${elementSelector} {
${styles}
}`);
        }
      }
    });
    
    return cssRules.join('\n\n');
  }

  generateLegacyCSS(): string {
    const elements = Object.values(this.project.elements);
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
    elements.forEach((element: CanvasElement) => {
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
    
    // Generate responsive breakpoints
    const breakpoints = Object.entries(this.project.breakpoints);
    breakpoints.forEach(([name, config]) => {
      if (name !== 'mobile' && (config as any).width) {
        cssRules.push(`@media (min-width: ${(config as any).width}px) {
    /* ${name} styles */
}`);
      }
    });
    
    return cssRules.join('\n\n');
  }
  
  private generateCustomClassCSS(styles: Record<string, any>): string {
    const cssProps: string[] = [];
    
    for (const [key, value] of Object.entries(styles)) {
      if (value !== undefined && value !== null && value !== '') {
        // Convert camelCase to kebab-case
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        cssProps.push(`    ${cssKey}: ${value};`);
      }
    }
    
    return cssProps.join('\n');
  }
  
  private generateCSSProperties(element: CanvasElement): string {
    const styles: string[] = [];
    
    Object.entries(element.styles).forEach(([property, value]) => {
      if (value !== undefined && value !== null) {
        const cssProperty = this.camelToKebab(property);
        styles.push(`    ${cssProperty}: ${value};`);
      }
    });
    
    return styles.join('\n');
  }
  
  private camelToKebab(str: string): string {
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
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
      return `${indent}<img className="${classes}" src="placeholder.jpg" alt="Image placeholder" />`;
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
        console.error('Error getting optimized classes:', error);
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
      console.error('Error generating optimized CSS:', error);
      // Fallback to legacy CSS generation
      return {
        html: this.generateHTML(),
        css: this.generateLegacyCSS(),
        react: this.generateReactComponent()
      };
    }
  }
}
