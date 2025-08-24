import React from 'react';
import { CanvasElement, ComponentDef } from '../../types/canvas';

interface ComponentInstanceRendererProps {
  template: CanvasElement;
  componentDef: ComponentDef;
  instanceElement: CanvasElement;
  customClasses: Record<string, any>;
}

/**
 * Renders a component template as a read-only clone without individual element interaction
 * This creates the visual representation of the component instance without making children selectable
 */
export const ComponentInstanceRenderer: React.FC<ComponentInstanceRendererProps> = ({
  template,
  componentDef,
  instanceElement,
  customClasses
}) => {
  // Recursive function to render template elements as read-only clones
  const renderTemplateElement = (element: CanvasElement, offsetX = 0, offsetY = 0): React.ReactNode => {
    if (!element) return null;

    // Calculate position relative to instance root
    const x = offsetX + (element.x || 0);
    const y = offsetY + (element.y || 0);

    // Get element styles
    const elementStyles: React.CSSProperties = {
      position: 'absolute',
      left: x,
      top: y,
      width: element.width || 100,
      height: element.height || 40,
      pointerEvents: 'none', // CRITICAL: Children are not interactive
      ...getElementStyles(element, customClasses)
    };

    let content: React.ReactNode = null;

    // Render different element types
    switch (element.type) {
      case 'text':
        content = (
          <div style={elementStyles}>
            {element.content || 'Text'}
          </div>
        );
        break;

      case 'button':
        content = (
          <button 
            style={{ 
              ...elementStyles,
              cursor: 'default',
              border: element.styles?.border || '1px solid #d1d5db',
              borderRadius: element.styles?.borderRadius || '6px',
              backgroundColor: element.styles?.backgroundColor || '#f9fafb',
              color: element.styles?.color || '#374151',
              padding: '8px 16px',
              fontSize: '14px'
            }}
            disabled
          >
            {element.buttonText || element.content || 'Button'}
          </button>
        );
        break;

      case 'image':
        content = (
          <div style={{
            ...elementStyles,
            backgroundImage: element.imageBase64 ? `url(${element.imageBase64})` : 
                            element.imageUrl ? `url(${element.imageUrl})` : 'none',
            backgroundSize: element.objectFit || 'cover',
            backgroundPosition: element.objectPosition || 'center',
            backgroundColor: '#f3f4f6',
            border: '1px solid #e5e7eb',
            borderRadius: element.styles?.borderRadius || '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#9ca3af',
            fontSize: '12px'
          }}>
            {!element.imageBase64 && !element.imageUrl && 'Image'}
          </div>
        );
        break;

      case 'rectangle':
      case 'container':
      default:
        content = (
          <div style={{
            ...elementStyles,
            backgroundColor: element.styles?.backgroundColor || 'transparent',
            border: element.styles?.border || '1px solid #d1d5db',
            borderRadius: element.styles?.borderRadius || '6px'
          }}>
            {element.content || ''}
          </div>
        );
        break;
    }

    return (
      <React.Fragment key={`template-${element.id}`}>
        {content}
        {/* Recursively render children */}
        {element.children?.map(childId => {
          // For read-only rendering, we need to find the child element
          // This would need access to the template structure
          return null; // TODO: Implement child rendering if templates have nested structure
        })}
      </React.Fragment>
    );
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {renderTemplateElement(template)}
    </div>
  );
};

// Helper function to convert element styles to React CSSProperties
function getElementStyles(element: CanvasElement, customClasses: Record<string, any>): React.CSSProperties {
  const styles: React.CSSProperties = {};
  
  // Apply inline styles (though spec says we should avoid these)
  if (element.styles) {
    Object.entries(element.styles).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        (styles as any)[key] = value;
      }
    });
  }

  // Apply class-based styles
  if (element.classes && element.classes.length > 0) {
    element.classes.forEach(className => {
      const classStyles = customClasses[className];
      if (classStyles && classStyles.properties) {
        Object.entries(classStyles.properties).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            (styles as any)[key] = value;
          }
        });
      }
    });
  }

  return styles;
}