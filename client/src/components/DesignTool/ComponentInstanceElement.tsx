import React, { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { CanvasElement } from '../../types/canvas';
import { selectComponentDefinition, selectCustomClasses } from '../../store/selectors';
import { openComponentTab } from '../../store/componentDefinitionsSlice';

interface ComponentInstanceElementProps {
  element: CanvasElement;
  isSelected: boolean;
  onSelect: () => void;
}

const ComponentInstanceElement: React.FC<ComponentInstanceElementProps> = ({
  element,
  isSelected,
  onSelect
}) => {
  const dispatch = useDispatch();
  const customClasses = useSelector(selectCustomClasses);
  
  // Get component definition
  const componentDefinition = useSelector((state: RootState) => {
    try {
      return element.componentRef?.componentId ? selectComponentDefinition(state, element.componentRef.componentId) : null;
    } catch (error) {
      console.error('Error selecting component definition:', error);
      return null;
    }
  });

  const handleSingleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect();
  }, [onSelect]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    console.log('ComponentInstance double-click: opening component editor');
    
    if (element.componentRef?.componentId && componentDefinition) {
      // Open component editor tab
      dispatch(openComponentTab(element.componentRef.componentId));
    }
  }, [element.componentRef?.componentId, componentDefinition, dispatch]);

  // If no component definition found, render error state
  if (!componentDefinition) {
    console.log('Component definition not found for instance:', element.componentRef?.componentId);
    
    return (
      <div
        className="component-instance-error"
        onClick={handleSingleClick}
        style={{
          position: 'absolute',
          left: element.x,
          top: element.y,
          width: element.width,
          height: element.height,
          border: '2px dashed #ef4444',
          backgroundColor: '#fef2f2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ef4444',
          fontSize: '12px',
          padding: '8px',
          cursor: 'pointer'
        }}
        data-testid={`component-instance-error-${element.id}`}
      >
        Component Not Found
      </div>
    );
  }

  // Get template for rendering
  const template = componentDefinition.template;
  
  console.log('Rendering component instance as read-only clone:', {
    componentName: componentDefinition.name,
    templateType: template?.type,
    instanceId: element.id,
    hasTemplate: !!template
  });

  return (
    <div
      className="component-instance-wrapper"
      onClick={handleSingleClick}
      onDoubleClick={handleDoubleClick}
      data-testid={`component-instance-${element.id}`}
      data-instance="true"
      data-state={isSelected ? 'selected' : 'default'}
      style={{
        position: 'absolute',
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        // Component instance visual styling - READ ONLY
        outline: isSelected ? '2px solid #3b82f6' : '1px dashed rgba(59, 130, 246, 0.3)',
        outlineOffset: '-1px',
        borderRadius: '4px',
        backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.05)' : 'rgba(59, 130, 246, 0.02)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        overflow: 'hidden'
      }}
    >
      {/* Chrome overlay for component instances */}
      <div 
        className="component-chrome" 
        style={{
          position: 'absolute',
          top: '-20px',
          left: '0',
          height: '18px',
          backgroundColor: '#3b82f6',
          color: 'white',
          fontSize: '10px',
          padding: '2px 6px',
          borderRadius: '3px 3px 0 0',
          fontWeight: '500',
          pointerEvents: 'none',
          zIndex: 1000,
          whiteSpace: 'nowrap'
        }}
      >
        {componentDefinition.name}
      </div>

      {/* CRITICAL: Render template content as READ-ONLY clone */}
      <div style={{ 
        width: '100%', 
        height: '100%', 
        pointerEvents: 'none' // CRITICAL: Children are not interactive
      }}>
        {template && (
          <TemplateRenderer 
            template={template} 
            customClasses={customClasses}
          />
        )}
        
        {/* Fallback if no template */}
        {!template && (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#9ca3af',
            fontSize: '12px',
            fontStyle: 'italic'
          }}>
            No Template
          </div>
        )}
      </div>
    </div>
  );
};

// Helper component to render template content as read-only
const TemplateRenderer: React.FC<{
  template: CanvasElement;
  customClasses: Record<string, any>;
}> = ({ template, customClasses }) => {
  // Apply template styles
  const getTemplateStyles = (): React.CSSProperties => {
    const styles: React.CSSProperties = {
      width: '100%',
      height: '100%',
      position: 'relative'
    };

    // Apply inline styles from template
    if (template.styles) {
      Object.entries(template.styles).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          (styles as any)[key] = value;
        }
      });
    }

    // Apply class-based styles
    if (template.classes && template.classes.length > 0) {
      template.classes.forEach(className => {
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
  };

  const templateStyles = getTemplateStyles();

  // Render different element types as read-only
  switch (template.type) {
    case 'text':
      return (
        <div style={{
          ...templateStyles,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          padding: '4px',
          fontSize: '14px',
          color: '#1f2937',
          lineHeight: '1.4'
        }}>
          {/* Strip HTML and render clean text */}
          {(template.content || 'Text Content')
            .replace(/<[^>]*>/g, '') // Remove all HTML tags
            .replace(/&nbsp;/g, ' ') // Convert &nbsp; to regular spaces
            .trim()}
        </div>
      );

    case 'button':
      return (
        <div style={{
          ...templateStyles,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            padding: '8px 16px',
            backgroundColor: templateStyles.backgroundColor || '#3b82f6',
            color: templateStyles.color || 'white',
            border: templateStyles.border || 'none',
            borderRadius: templateStyles.borderRadius || '4px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'default',
            userSelect: 'none'
          }}>
            {template.buttonText || template.content || 'Button'}
          </div>
        </div>
      );

    case 'image':
      return (
        <div style={{
          ...templateStyles,
          backgroundImage: template.imageBase64 ? `url(${template.imageBase64})` : 
                          template.imageUrl ? `url(${template.imageUrl})` : 'none',
          backgroundSize: template.objectFit || 'cover',
          backgroundPosition: template.objectPosition || 'center',
          backgroundColor: '#f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#9ca3af',
          fontSize: '12px'
        }}>
          {!template.imageBase64 && !template.imageUrl && 'Image'}
        </div>
      );

    case 'rectangle':
    case 'container':
    default:
      return (
        <div style={{
          ...templateStyles,
          backgroundColor: templateStyles.backgroundColor || 'transparent',
          border: templateStyles.border || '1px solid #d1d5db',
          borderRadius: templateStyles.borderRadius || '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6b7280',
          fontSize: '12px'
        }}>
          {template.content || (template.type === 'container' ? 'Container' : 'Rectangle')}
        </div>
      );
  }
};

export default ComponentInstanceElement;