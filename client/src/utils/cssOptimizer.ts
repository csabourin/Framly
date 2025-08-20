import { CanvasElement, CSSProperties } from '../types/canvas';

interface CSSRule {
  selector: string;
  properties: CSSProperties;
  specificity: number;
  elementIds: string[];
}

interface OptimizedCSS {
  utilities: CSSRule[];
  components: CSSRule[];
  layout: CSSRule[];
  responsive: Record<string, CSSRule[]>;
  critical: string[];
}

interface PropertyGroup {
  properties: Record<string, string>;
  count: number;
  elements: string[];
  hash: string;
}

export class CSSOptimizer {
  private propertyGroups: Map<string, PropertyGroup> = new Map();
  private utilityClasses: Map<string, string> = new Map();
  private componentClasses: Map<string, string> = new Map();
  
  // CSS property ordering for optimal rendering performance
  private readonly propertyOrder = [
    // Display and positioning
    'display', 'position', 'top', 'right', 'bottom', 'left', 'z-index',
    'float', 'clear',
    
    // Box model
    'width', 'min-width', 'max-width', 'height', 'min-height', 'max-height',
    'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    
    // Flexbox
    'flex', 'flex-direction', 'flex-wrap', 'justify-content', 'align-items',
    'align-content', 'align-self', 'order', 'flex-grow', 'flex-shrink', 'flex-basis',
    
    // Grid
    'grid', 'grid-template', 'grid-template-rows', 'grid-template-columns',
    'grid-template-areas', 'grid-gap', 'grid-row', 'grid-column',
    
    // Background
    'background', 'background-color', 'background-image', 'background-repeat',
    'background-position', 'background-size', 'background-attachment',
    
    // Border
    'border', 'border-width', 'border-style', 'border-color', 'border-radius',
    'border-top', 'border-right', 'border-bottom', 'border-left',
    
    // Typography
    'color', 'font', 'font-family', 'font-size', 'font-weight', 'font-style',
    'line-height', 'letter-spacing', 'text-align', 'text-decoration',
    'text-transform', 'text-indent', 'text-shadow',
    
    // Visual effects
    'opacity', 'visibility', 'box-shadow', 'filter', 'backdrop-filter',
    
    // Transitions and animations
    'transition', 'transform', 'animation',
    
    // Miscellaneous
    'cursor', 'overflow', 'white-space', 'user-select'
  ];

  constructor() {
    this.initializeUtilityClasses();
  }

  private initializeUtilityClasses(): void {
    // Common utility patterns
    const utilities = {
      // Display utilities
      'flex': { display: 'flex' },
      'block': { display: 'block' },
      'inline': { display: 'inline' },
      'inline-block': { display: 'inline-block' },
      'hidden': { display: 'none' },
      
      // Flexbox utilities
      'flex-col': { 'flex-direction': 'column' },
      'flex-row': { 'flex-direction': 'row' },
      'items-center': { 'align-items': 'center' },
      'items-start': { 'align-items': 'flex-start' },
      'items-end': { 'align-items': 'flex-end' },
      'justify-center': { 'justify-content': 'center' },
      'justify-between': { 'justify-content': 'space-between' },
      'justify-around': { 'justify-content': 'space-around' },
      'justify-evenly': { 'justify-content': 'space-evenly' },
      
      // Text utilities
      'text-center': { 'text-align': 'center' },
      'text-left': { 'text-align': 'left' },
      'text-right': { 'text-align': 'right' },
      'font-bold': { 'font-weight': 'bold' },
      'font-normal': { 'font-weight': 'normal' },
      'font-light': { 'font-weight': '300' },
      
      // Sizing utilities
      'w-full': { width: '100%' },
      'h-full': { height: '100%' },
      'w-auto': { width: 'auto' },
      'h-auto': { height: 'auto' },
      
      // Spacing utilities (common patterns)
      'p-0': { padding: '0' },
      'p-2': { padding: '8px' },
      'p-4': { padding: '16px' },
      'm-0': { margin: '0' },
      'm-2': { margin: '8px' },
      'm-4': { margin: '16px' },
      
      // Border utilities
      'rounded': { 'border-radius': '4px' },
      'rounded-lg': { 'border-radius': '8px' },
      'rounded-full': { 'border-radius': '50%' },
      
      // Position utilities
      'relative': { position: 'relative' },
      'absolute': { position: 'absolute' },
      'fixed': { position: 'fixed' },
      'sticky': { position: 'sticky' }
    };

    Object.entries(utilities).forEach(([className, properties]) => {
      this.utilityClasses.set(this.hashProperties(properties), className);
    });
  }

  public optimizeCSS(elements: Record<string, CanvasElement>): OptimizedCSS {
    this.analyzeElements(elements);
    
    const result: OptimizedCSS = {
      utilities: [],
      components: [],
      layout: [],
      responsive: {},
      critical: []
    };

    // Generate utility classes for common property groups
    result.utilities = this.generateUtilityClasses();
    
    // Generate component classes for complex patterns
    result.components = this.generateComponentClasses();
    
    // Generate layout classes
    result.layout = this.generateLayoutClasses();
    
    // Identify critical CSS for above-the-fold content
    result.critical = this.identifyCriticalCSS(elements);

    return result;
  }

  private analyzeElements(elements: Record<string, CanvasElement>): void {
    this.propertyGroups.clear();

    Object.values(elements).forEach(element => {
      if (element.styles) {
        this.analyzeElementStyles(element);
      }
    });
  }

  private analyzeElementStyles(element: CanvasElement): void {
    const styles = element.styles;
    if (!styles || Object.keys(styles).length === 0) return;

    // Group properties by logical categories
    const groups = this.categorizeProperties(styles);
    
    groups.forEach((properties, category) => {
      const hash = this.hashProperties(properties);
      const existing = this.propertyGroups.get(hash);
      
      if (existing) {
        existing.count++;
        existing.elements.push(element.id);
      } else {
        this.propertyGroups.set(hash, {
          properties,
          count: 1,
          elements: [element.id],
          hash
        });
      }
    });
  }

  private categorizeProperties(styles: CSSProperties): Map<string, Record<string, string>> {
    const categories = new Map<string, Record<string, string>>();

    Object.entries(styles).forEach(([property, value]) => {
      if (value === undefined || value === null) return;

      const category = this.getPropertyCategory(property);
      const existing = categories.get(category) || {};
      existing[property] = String(value);
      categories.set(category, existing);
    });

    return categories;
  }

  private getPropertyCategory(property: string): string {
    if (property.includes('flex') || property === 'justify-content' || property === 'align-items') {
      return 'flexbox';
    }
    if (property.includes('grid')) {
      return 'grid';
    }
    if (property.includes('margin') || property.includes('padding')) {
      return 'spacing';
    }
    if (property.includes('border') || property === 'border-radius') {
      return 'border';
    }
    if (property.includes('background') || property === 'color') {
      return 'color';
    }
    if (property.includes('font') || property.includes('text') || property === 'line-height') {
      return 'typography';
    }
    if (property === 'width' || property === 'height' || property.includes('max-') || property.includes('min-')) {
      return 'sizing';
    }
    if (property === 'position' || property === 'top' || property === 'left' || property === 'right' || property === 'bottom' || property === 'z-index') {
      return 'position';
    }
    return 'misc';
  }

  private hashProperties(properties: Record<string, string>): string {
    const sorted = Object.entries(properties)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(';');
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < sorted.length; i++) {
      const char = sorted.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private generateUtilityClasses(): CSSRule[] {
    const utilities: CSSRule[] = [];
    const minUsage = 2; // Only create utility classes for properties used 2+ times

    this.propertyGroups.forEach((group, hash) => {
      if (group.count >= minUsage && Object.keys(group.properties).length <= 3) {
        // Check if we already have a utility class for this pattern
        const existingClass = this.utilityClasses.get(hash);
        
        if (existingClass) {
          utilities.push({
            selector: `.${existingClass}`,
            properties: group.properties,
            specificity: 10,
            elementIds: group.elements
          });
        } else {
          // Generate a new utility class name
          const className = this.generateUtilityClassName(group.properties);
          this.utilityClasses.set(hash, className);
          
          utilities.push({
            selector: `.${className}`,
            properties: group.properties,
            specificity: 10,
            elementIds: group.elements
          });
        }
      }
    });

    return utilities;
  }

  private generateUtilityClassName(properties: Record<string, string>): string {
    const keys = Object.keys(properties);
    
    if (keys.length === 1) {
      const [property] = keys;
      const value = properties[property];
      
      // Generate semantic class names for single properties
      switch (property) {
        case 'display':
          return `d-${value}`;
        case 'flex-direction':
          return value === 'column' ? 'flex-col' : 'flex-row';
        case 'justify-content':
          return `justify-${value.replace('flex-', '').replace('space-', '')}`;
        case 'align-items':
          return `items-${value.replace('flex-', '')}`;
        case 'text-align':
          return `text-${value}`;
        case 'font-weight':
          return `font-${value === 'bold' ? 'bold' : value === 'normal' ? 'normal' : value}`;
        default:
          return `util-${this.hashProperties(properties)}`;
      }
    }
    
    // For multiple properties, create a compound class name
    const category = this.getPropertyCategory(keys[0]);
    return `${category}-${this.hashProperties(properties)}`;
  }

  private generateComponentClasses(): CSSRule[] {
    const components: CSSRule[] = [];
    const minUsage = 3; // Component classes for patterns used 3+ times

    this.propertyGroups.forEach((group, hash) => {
      if (group.count >= minUsage && Object.keys(group.properties).length > 3) {
        const className = `comp-${hash}`;
        this.componentClasses.set(hash, className);
        
        components.push({
          selector: `.${className}`,
          properties: group.properties,
          specificity: 10,
          elementIds: group.elements
        });
      }
    });

    return components;
  }

  private generateLayoutClasses(): CSSRule[] {
    const layouts: CSSRule[] = [];

    // Common layout patterns
    const layoutPatterns = [
      {
        name: 'container',
        properties: {
          'max-width': '1200px',
          'margin': '0 auto',
          'padding': '0 16px'
        }
      },
      {
        name: 'flex-center',
        properties: {
          'display': 'flex',
          'justify-content': 'center',
          'align-items': 'center'
        }
      },
      {
        name: 'flex-between',
        properties: {
          'display': 'flex',
          'justify-content': 'space-between',
          'align-items': 'center'
        }
      },
      {
        name: 'grid-auto',
        properties: {
          'display': 'grid',
          'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
          'gap': '16px'
        }
      }
    ];

    layoutPatterns.forEach(pattern => {
      layouts.push({
        selector: `.${pattern.name}`,
        properties: pattern.properties,
        specificity: 10,
        elementIds: []
      });
    });

    return layouts;
  }

  private identifyCriticalCSS(elements: Record<string, CanvasElement>): string[] {
    const critical: string[] = [];
    
    // Add reset styles as critical
    critical.push('reset');
    
    // Add layout classes as critical
    critical.push('layout');
    
    // Add utility classes used by visible elements as critical
    Object.values(elements).forEach(element => {
      if (element.id === 'root' || this.isAboveFold(element)) {
        if (element.classes) {
          critical.push(...element.classes);
        }
      }
    });

    return Array.from(new Set(critical));
  }

  private isAboveFold(element: CanvasElement): boolean {
    // Simple heuristic: elements positioned in the top 600px are likely above the fold
    return element.y < 600;
  }

  public generateOptimizedCSS(optimized: OptimizedCSS): string {
    const sections: string[] = [];

    // CSS Reset (critical)
    sections.push(this.generateResetCSS());
    
    // CSS Variables
    sections.push(this.generateCSSVariables());

    // Utility classes
    if (optimized.utilities.length > 0) {
      sections.push('/* Utility Classes */');
      optimized.utilities.forEach(rule => {
        sections.push(this.formatCSSRule(rule));
      });
    }

    // Layout classes
    if (optimized.layout.length > 0) {
      sections.push('/* Layout Classes */');
      optimized.layout.forEach(rule => {
        sections.push(this.formatCSSRule(rule));
      });
    }

    // Component classes
    if (optimized.components.length > 0) {
      sections.push('/* Component Classes */');
      optimized.components.forEach(rule => {
        sections.push(this.formatCSSRule(rule));
      });
    }

    // Responsive utilities
    Object.entries(optimized.responsive).forEach(([breakpoint, rules]) => {
      if (rules.length > 0) {
        sections.push(`/* ${breakpoint} breakpoint */`);
        sections.push(`@media (min-width: ${this.getBreakpointWidth(breakpoint)}px) {`);
        rules.forEach(rule => {
          sections.push(this.formatCSSRule(rule, '  '));
        });
        sections.push('}');
      }
    });

    return sections.join('\n\n');
  }

  private generateResetCSS(): string {
    return `/* CSS Reset */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

img, picture, video, canvas, svg {
  display: block;
  max-width: 100%;
}

input, button, textarea, select {
  font: inherit;
}`;
  }

  private generateCSSVariables(): string {
    return `/* CSS Variables */
:root {
  --color-primary: #3b82f6;
  --color-secondary: #8b5cf6;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-200: #e5e7eb;
  --color-gray-300: #d1d5db;
  --color-gray-400: #9ca3af;
  --color-gray-500: #6b7280;
  --color-gray-600: #4b5563;
  --color-gray-700: #374151;
  --color-gray-800: #1f2937;
  --color-gray-900: #111827;
  
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-2xl: 48px;
  
  --border-radius-sm: 4px;
  --border-radius-md: 8px;
  --border-radius-lg: 12px;
  --border-radius-xl: 16px;
  
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}`;
  }

  private formatCSSRule(rule: CSSRule, indent: string = ''): string {
    const properties = this.sortProperties(rule.properties);
    const formattedProperties = Object.entries(properties)
      .map(([prop, value]) => `${indent}  ${this.camelToKebab(prop)}: ${value};`)
      .join('\n');

    return `${indent}${rule.selector} {
${formattedProperties}
${indent}}`;
  }

  private sortProperties(properties: Record<string, string>): Record<string, string> {
    const sorted: Record<string, string> = {};
    
    // Sort properties according to optimal rendering order
    this.propertyOrder.forEach(prop => {
      const kebabProp = this.camelToKebab(prop);
      if (kebabProp in properties || prop in properties) {
        const key = kebabProp in properties ? kebabProp : prop;
        sorted[key] = properties[key];
      }
    });

    // Add any remaining properties
    Object.entries(properties).forEach(([prop, value]) => {
      if (!(prop in sorted)) {
        sorted[prop] = value;
      }
    });

    return sorted;
  }

  private camelToKebab(str: string): string {
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
  }

  private getBreakpointWidth(breakpoint: string): number {
    const breakpoints: Record<string, number> = {
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      '2xl': 1536
    };
    return breakpoints[breakpoint] || 768;
  }

  public getUtilityClass(properties: Record<string, string>): string | null {
    const hash = this.hashProperties(properties);
    return this.utilityClasses.get(hash) || null;
  }

  public getComponentClass(properties: Record<string, string>): string | null {
    const hash = this.hashProperties(properties);
    return this.componentClasses.get(hash) || null;
  }
}