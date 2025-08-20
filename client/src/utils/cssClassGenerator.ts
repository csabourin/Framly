import { CanvasElement, CSSProperties } from '../types/canvas';
import { CSSOptimizer } from './cssOptimizer';

export interface ClassSuggestion {
  name: string;
  description: string;
  properties: CSSProperties;
  category: 'layout' | 'typography' | 'spacing' | 'colors' | 'effects' | 'utilities';
}

export class CSSClassGenerator {
  private cssOptimizer: CSSOptimizer;

  constructor() {
    this.cssOptimizer = new CSSOptimizer();
  }

  generateCSSClassSuggestions(elementType: string): ClassSuggestion[] {
    const suggestions: ClassSuggestion[] = [];

    // Base suggestions for all elements
    suggestions.push(...this.getBaseSuggestions());

    // Type-specific suggestions
    switch (elementType) {
      case 'text':
        suggestions.push(...this.getTextSuggestions());
        break;
      case 'container':
        suggestions.push(...this.getContainerSuggestions());
        break;
      case 'rectangle':
        suggestions.push(...this.getRectangleSuggestions());
        break;
      case 'image':
        suggestions.push(...this.getImageSuggestions());
        break;
    }

    return suggestions;
  }

  private getBaseSuggestions(): ClassSuggestion[] {
    return [
      {
        name: 'flex',
        description: 'Make element a flex container',
        properties: { display: 'flex' },
        category: 'layout'
      },
      {
        name: 'flex-center',
        description: 'Center content with flexbox',
        properties: { 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center' 
        },
        category: 'layout'
      },
      {
        name: 'grid',
        description: 'Make element a grid container',
        properties: { display: 'grid' },
        category: 'layout'
      },
      {
        name: 'hidden',
        description: 'Hide element',
        properties: { display: 'none' },
        category: 'utilities'
      },
      {
        name: 'relative',
        description: 'Position relative',
        properties: { position: 'relative' },
        category: 'layout'
      },
      {
        name: 'absolute',
        description: 'Position absolute',
        properties: { position: 'absolute' },
        category: 'layout'
      },
      {
        name: 'shadow',
        description: 'Add box shadow',
        properties: { boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
        category: 'effects'
      },
      {
        name: 'rounded',
        description: 'Round corners',
        properties: { borderRadius: '8px' },
        category: 'effects'
      }
    ];
  }

  private getTextSuggestions(): ClassSuggestion[] {
    return [
      {
        name: 'heading',
        description: 'Large heading text',
        properties: { 
          fontSize: '2rem', 
          fontWeight: 'bold', 
          lineHeight: '1.2' 
        },
        category: 'typography'
      },
      {
        name: 'subheading',
        description: 'Subheading text',
        properties: { 
          fontSize: '1.5rem', 
          fontWeight: '600', 
          lineHeight: '1.3' 
        },
        category: 'typography'
      },
      {
        name: 'body-text',
        description: 'Regular body text',
        properties: { 
          fontSize: '1rem', 
          lineHeight: '1.6' 
        },
        category: 'typography'
      },
      {
        name: 'small-text',
        description: 'Small text',
        properties: { 
          fontSize: '0.875rem', 
          lineHeight: '1.4' 
        },
        category: 'typography'
      },
      {
        name: 'text-center',
        description: 'Center align text',
        properties: { textAlign: 'center' },
        category: 'typography'
      },
      {
        name: 'text-bold',
        description: 'Bold text',
        properties: { fontWeight: 'bold' },
        category: 'typography'
      },
      {
        name: 'text-italic',
        description: 'Italic text',
        properties: { fontStyle: 'italic' },
        category: 'typography'
      },
      {
        name: 'text-primary',
        description: 'Primary color text',
        properties: { color: '#3b82f6' },
        category: 'colors'
      },
      {
        name: 'text-secondary',
        description: 'Secondary color text',
        properties: { color: '#6b7280' },
        category: 'colors'
      }
    ];
  }

  private getContainerSuggestions(): ClassSuggestion[] {
    return [
      {
        name: 'container',
        description: 'Responsive container',
        properties: { 
          maxWidth: '1200px', 
          margin: '0 auto', 
          padding: '0 1rem' 
        },
        category: 'layout'
      },
      {
        name: 'flex-col',
        description: 'Flex column layout',
        properties: { 
          display: 'flex', 
          flexDirection: 'column' 
        },
        category: 'layout'
      },
      {
        name: 'flex-row',
        description: 'Flex row layout',
        properties: { 
          display: 'flex', 
          flexDirection: 'row' 
        },
        category: 'layout'
      },
      {
        name: 'grid-2',
        description: '2-column grid',
        properties: { 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: '1rem' 
        },
        category: 'layout'
      },
      {
        name: 'grid-3',
        description: '3-column grid',
        properties: { 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '1rem' 
        },
        category: 'layout'
      },
      {
        name: 'space-between',
        description: 'Space between children',
        properties: { 
          display: 'flex', 
          justifyContent: 'space-between' 
        },
        category: 'layout'
      },
      {
        name: 'gap-4',
        description: 'Add gap between children',
        properties: { gap: '1rem' },
        category: 'spacing'
      },
      {
        name: 'p-4',
        description: 'Padding all around',
        properties: { padding: '1rem' },
        category: 'spacing'
      },
      {
        name: 'm-4',
        description: 'Margin all around',
        properties: { margin: '1rem' },
        category: 'spacing'
      }
    ];
  }

  private getRectangleSuggestions(): ClassSuggestion[] {
    return [
      {
        name: 'card',
        description: 'Card-like appearance',
        properties: { 
          backgroundColor: '#ffffff', 
          borderRadius: '8px', 
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          padding: '1.5rem'
        },
        category: 'layout'
      },
      {
        name: 'button',
        description: 'Button appearance',
        properties: { 
          backgroundColor: '#3b82f6', 
          color: '#ffffff',
          padding: '0.75rem 1.5rem',
          borderRadius: '6px',
          border: 'none',
          cursor: 'pointer'
        },
        category: 'utilities'
      },
      {
        name: 'pill',
        description: 'Pill-shaped element',
        properties: { 
          borderRadius: '9999px',
          padding: '0.5rem 1rem'
        },
        category: 'effects'
      },
      {
        name: 'border',
        description: 'Add border',
        properties: { border: '1px solid #e5e7eb' },
        category: 'effects'
      },
      {
        name: 'bg-primary',
        description: 'Primary background color',
        properties: { backgroundColor: '#3b82f6' },
        category: 'colors'
      },
      {
        name: 'bg-secondary',
        description: 'Secondary background color',
        properties: { backgroundColor: '#f3f4f6' },
        category: 'colors'
      },
      {
        name: 'bg-white',
        description: 'White background',
        properties: { backgroundColor: '#ffffff' },
        category: 'colors'
      },
      {
        name: 'bg-transparent',
        description: 'Transparent background',
        properties: { backgroundColor: 'transparent' },
        category: 'colors'
      }
    ];
  }

  private getImageSuggestions(): ClassSuggestion[] {
    return [
      {
        name: 'img-responsive',
        description: 'Responsive image',
        properties: { 
          maxWidth: '100%', 
          height: 'auto' 
        },
        category: 'utilities'
      },
      {
        name: 'img-cover',
        description: 'Cover image',
        properties: { 
          width: '100%', 
          height: '100%', 
          objectFit: 'cover' 
        },
        category: 'utilities'
      },
      {
        name: 'img-contain',
        description: 'Contain image',
        properties: { 
          width: '100%', 
          height: '100%', 
          objectFit: 'contain' 
        },
        category: 'utilities'
      },
      {
        name: 'img-rounded',
        description: 'Rounded image',
        properties: { borderRadius: '8px' },
        category: 'effects'
      },
      {
        name: 'img-circle',
        description: 'Circular image',
        properties: { borderRadius: '50%' },
        category: 'effects'
      },
      {
        name: 'img-shadow',
        description: 'Image with shadow',
        properties: { boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' },
        category: 'effects'
      }
    ];
  }

  generateUtilityClass(properties: CSSProperties): string | null {
    return this.cssOptimizer.getUtilityClass(properties);
  }

  generateComponentClass(properties: CSSProperties): string | null {
    return this.cssOptimizer.getComponentClass(properties);
  }

  validateCSSClassName(className: string): boolean {
    // CSS class name validation rules
    const cssClassRegex = /^[a-zA-Z][\w-]*$/;
    
    // Check basic pattern
    if (!cssClassRegex.test(className)) {
      return false;
    }
    
    // Check for reserved keywords
    const reservedKeywords = ['initial', 'inherit', 'unset', 'revert'];
    if (reservedKeywords.includes(className.toLowerCase())) {
      return false;
    }
    
    // Check length (reasonable limit)
    if (className.length > 50) {
      return false;
    }
    
    return true;
  }

  analyzeElementForOptimization(element: CanvasElement): {
    suggestedUtilities: string[];
    potentialComponents: string[];
    duplicateStyles: string[];
    optimization: {
      canUseUtilities: boolean;
      canCreateComponent: boolean;
      stylesToInline: string[];
    };
  } {
    const analysis = {
      suggestedUtilities: [] as string[],
      potentialComponents: [] as string[],
      duplicateStyles: [] as string[],
      optimization: {
        canUseUtilities: false,
        canCreateComponent: false,
        stylesToInline: [] as string[]
      }
    };

    if (!element.styles || Object.keys(element.styles).length === 0) {
      return analysis;
    }

    // Check for utility class opportunities
    const utilityClass = this.cssOptimizer.getUtilityClass(element.styles);
    if (utilityClass) {
      analysis.suggestedUtilities.push(utilityClass);
      analysis.optimization.canUseUtilities = true;
    }

    // Check for component class opportunities
    const componentClass = this.cssOptimizer.getComponentClass(element.styles);
    if (componentClass) {
      analysis.potentialComponents.push(componentClass);
      analysis.optimization.canCreateComponent = true;
    }

    // Analyze individual style properties
    Object.entries(element.styles).forEach(([property, value]) => {
      const singlePropertyStyle = { [property]: value as string };
      const singleUtility = this.cssOptimizer.getUtilityClass(singlePropertyStyle);
      
      if (singleUtility) {
        analysis.suggestedUtilities.push(singleUtility);
      } else {
        analysis.optimization.stylesToInline.push(property);
      }
    });

    return analysis;
  }
}

export const cssClassGenerator = new CSSClassGenerator();