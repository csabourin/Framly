import { CanvasElement, Project } from '../types/canvas';

export class CodeGenerator {
  private project: Project;
  
  constructor(project: Project) {
    this.project = project;
  }
  
  generateHTML(): string {
    const rootElement = this.project.elements.root;
    if (!rootElement) return '';
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.project.name}</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
${this.generateElementHTML(rootElement, 1)}
</body>
</html>`;
    
    return html;
  }
  
  private generateElementHTML(element: CanvasElement, depth: number): string {
    const indent = '    '.repeat(depth);
    const classes = element.classes ? element.classes.join(' ') : '';
    const tag = this.getHTMLTag(element);
    
    let content = '';
    
    if (element.type === 'text' && element.content) {
      content = element.content;
    } else if (element.type === 'image') {
      return `${indent}<img class="${classes}" src="placeholder.jpg" alt="Image placeholder" />`;
    } else if (element.children && element.children.length > 0) {
      content = element.children
        .map(childId => {
          const child = this.project.elements[childId];
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
      case 'container':
        return 'div';
      case 'rectangle':
        return 'div';
      default:
        return 'div';
    }
  }
  
  generateCSS(): string {
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
    elements.forEach(element => {
      if (element.classes && element.classes.length > 0) {
        element.classes.forEach(className => {
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
      if (name !== 'mobile') {
        cssRules.push(`@media (min-width: ${config.width}px) {
    /* ${name} styles */
}`);
      }
    });
    
    return cssRules.join('\n\n');
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
    const rootElement = this.project.elements.root;
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
    const classes = element.classes ? element.classes.join(' ') : '';
    const tag = this.getHTMLTag(element);
    
    let content = '';
    
    if (element.type === 'text' && element.content) {
      content = element.content;
    } else if (element.type === 'image') {
      return `${indent}<img className="${classes}" src="placeholder.jpg" alt="Image placeholder" />`;
    } else if (element.children && element.children.length > 0) {
      content = element.children
        .map(childId => {
          const child = this.project.elements[childId];
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
  
  exportProject(): { html: string; css: string; react: string } {
    return {
      html: this.generateHTML(),
      css: this.generateCSS(),
      react: this.generateReactComponent(),
    };
  }
}
