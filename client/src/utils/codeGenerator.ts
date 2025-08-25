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
        console.log(`🎨 Generating CSS for custom class: ${customClass.name}`);
        console.log(`🎨 Styles:`, customClass.styles);
        
        const selector = `.${customClass.name}`;
        const colorModeCSS = generateColorModeCSS(selector, customClass.styles);
        console.log(`🎨 Generated ColorModeCSS:`, colorModeCSS);
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
    // Use color mode helper to generate proper CSS with color modes
    const colorModeCSS = generateColorModeCSS('', element.styles);
    const styles: string[] = [];
    
    // Extract base CSS properties (remove selector wrapper)
    if (colorModeCSS.baseCSS) {
      const baseLines = colorModeCSS.baseCSS.split('\n').slice(1, -1); // Remove wrapper lines
      styles.push(...baseLines);
    }
    
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
