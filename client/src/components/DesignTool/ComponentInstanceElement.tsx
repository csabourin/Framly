import React, { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { CanvasElement } from '../../types/canvas';
import { selectComponentDefinition } from '../../store/selectors';
import { isComponentInstance } from '../../utils/componentInstances';
import { createTab } from '../../store/canvasSlice';

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
  
  // CRITICAL: Call all hooks FIRST before any conditional logic
  const componentDefinition = useSelector((state: RootState) => {
    try {
      return element.componentRef?.componentId ? selectComponentDefinition(state, element.componentRef.componentId) : null;
    } catch (error) {
      console.error('Error selecting component definition:', error);
      return null;
    }
  });

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    console.log('ComponentInstanceElement double-click:', {
      componentId: element.componentRef?.componentId,
      hasDefinition: !!componentDefinition,
      definitionName: componentDefinition?.name
    });
    
    if (element.componentRef?.componentId && componentDefinition) {
      // Create component editing tab in main canvas system
      const tabName = `Edit: ${componentDefinition.name}`;
      console.log('Creating component tab:', tabName);
      dispatch(createTab({ 
        name: tabName, 
        color: '#e0e7ff',
        isComponentTab: true,
        componentId: element.componentRef.componentId 
      }));
    } else {
      console.warn('Cannot open component tab - missing definition:', {
        componentId: element.componentRef?.componentId,
        hasDefinition: !!componentDefinition
      });
    }
  }, [dispatch, element.componentRef, componentDefinition]);

  const handleSingleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect();
  }, [onSelect]);

  // NOW handle validation after all hooks are called
  if (!isComponentInstance(element) || !element.componentRef?.componentId) {
    console.warn('ComponentInstanceElement: invalid component instance', { elementId: element.id, componentRef: element.componentRef });
    return null;
  }

  // Additional safety check for empty componentId
  if (element.componentRef.componentId.trim() === '') {
    console.warn('ComponentInstanceElement: empty componentId', { elementId: element.id });
    return null;
  }

  // Handle missing component definition AFTER all hooks - RENDER CONTENT ANYWAY
  if (!componentDefinition) {
    console.warn('Component definition not found for instance:', element.componentRef?.componentId);
    console.log('Rendering fallback content for component instance:', element.id, 'content:', element.content);
    
    // CRITICAL: Render the element content even without definition
    return (
      <div
        className="component-instance-wrapper component-instance-fallback"
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
          border: isSelected ? '2px solid #3b82f6' : '1px dashed #e5e7eb',
          borderRadius: '4px',
          backgroundColor: '#f9fafb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          color: '#6b7280',
          cursor: 'pointer'
        }}
      >
        {/* Render element content based on type */}
        {element.type === 'text' && (
          <span style={{ color: '#1f2937', fontSize: '14px' }}>
            {/* Strip HTML tags for clean text display */}
            {(element.content || 'Text Component')
              .replace(/<[^>]*>/g, '') // Remove all HTML tags
              .replace(/&nbsp;/g, ' ') // Convert &nbsp; to regular spaces
              .trim()}
          </span>
        )}
        {element.type === 'button' && (
          <button 
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#3b82f6', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {element.buttonText || element.content || 'Button Component'}
          </button>
        )}
        {element.type === 'image' && (
          <div style={{ 
            width: '100%', 
            height: '100%', 
            backgroundImage: element.imageBase64 ? `url(${element.imageBase64})` : 
                            element.imageUrl ? `url(${element.imageUrl})` : 'none',
            backgroundSize: element.objectFit || 'cover',
            backgroundPosition: element.objectPosition || 'center',
            backgroundColor: '#f3f4f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#9ca3af'
          }}>
            {!element.imageBase64 && !element.imageUrl && 'Image Component'}
          </div>
        )}
        {(element.type === 'rectangle' || element.type === 'container') && (
          <span>
            {element.type === 'container' ? 'Container Component' : 'Rectangle Component'}
          </span>
        )}
      </div>
    );
  }

  // Safely render the component instance with ACTUAL TEMPLATE CONTENT
  try {
    const template = componentDefinition.template;
    console.log('Rendering component instance with template:', {
      componentName: componentDefinition.name,
      templateType: template?.type,
      templateContent: template?.content,
      templateButtonText: template?.buttonText,
      elementContent: element.content,
      elementButtonText: element.buttonText
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
          // Component instance visual styling
          outline: isSelected ? '2px solid #3b82f6' : '1px dashed rgba(59, 130, 246, 0.3)',
          outlineOffset: '-1px',
          borderRadius: '4px',
          backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.05)' : 'rgba(59, 130, 246, 0.02)',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        {/* Chrome overlay for component instances */}
        <div className="component-chrome" style={{
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
          lineHeight: '14px',
          zIndex: 10,
          whiteSpace: 'nowrap',
          opacity: isSelected ? 1 : 0.7
        }}>
          {componentDefinition.name} v{element.componentRef.version}
        </div>
        
        {/* CRITICAL: Render actual template content based on element type */}
        <div style={{
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          display: 'flex',
          alignItems: template?.type === 'text' ? 'flex-start' : 'center',
          justifyContent: template?.type === 'text' ? 'flex-start' : 'center',
          padding: template?.type === 'text' ? '4px' : '0'
        }}>
          {/* TEXT COMPONENT RENDERING */}
          {template?.type === 'text' && (
            <span style={{
              fontSize: '14px',
              color: '#1f2937',
              lineHeight: '1.4',
              whiteSpace: 'pre-wrap',
              ...(template.styles && Object.fromEntries(
                Object.entries(template.styles).filter(([key]) => 
                  ['color', 'fontSize', 'fontWeight', 'fontStyle', 'textAlign'].includes(key)
                )
              ))
            }}>
              {/* Strip HTML tags and render clean text */}
              {(template.content || element.content || 'Text Content')
                .replace(/<[^>]*>/g, '') // Remove all HTML tags
                .replace(/&nbsp;/g, ' ') // Convert &nbsp; to regular spaces
                .trim()}
            </span>
          )}
          
          {/* BUTTON COMPONENT RENDERING */}
          {template?.type === 'button' && (
            <button style={{
              padding: '8px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              ...(template.styles && Object.fromEntries(
                Object.entries(template.styles).filter(([key]) => 
                  ['backgroundColor', 'color', 'fontSize', 'fontWeight', 'borderRadius', 'padding'].includes(key)
                )
              ))
            }}>
              {template.buttonText || template.content || element.buttonText || element.content || 'Button'}
            </button>
          )}
          
          {/* IMAGE COMPONENT RENDERING */}
          {template?.type === 'image' && (
            <div style={{
              width: '100%',
              height: '100%',
              backgroundImage: template.imageBase64 ? `url(${template.imageBase64})` : 
                              template.imageUrl ? `url(${template.imageUrl})` : 
                              element.imageBase64 ? `url(${element.imageBase64})` :
                              element.imageUrl ? `url(${element.imageUrl})` : 'none',
              backgroundSize: template.objectFit || element.objectFit || 'cover',
              backgroundPosition: template.objectPosition || element.objectPosition || 'center',
              backgroundColor: '#f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9ca3af',
              fontSize: '12px'
            }}>
              {!template.imageBase64 && !template.imageUrl && !element.imageBase64 && !element.imageUrl && 
                (template.imageAlt || element.imageAlt || 'Image')
              }
            </div>
          )}
          
          {/* CONTAINER/RECTANGLE COMPONENT RENDERING */}
          {(template?.type === 'container' || template?.type === 'rectangle') && (
            <div style={{
              width: '100%',
              height: '100%',
              backgroundColor: template?.styles?.backgroundColor || '#f9fafb',
              border: template?.styles?.border || '1px solid #e5e7eb',
              borderRadius: template?.styles?.borderRadius || '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              color: '#6b7280'
            }}>
              {template?.type === 'container' ? 'Container' : 'Rectangle'}
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error rendering component instance:', error);
    
    // Enhanced fallback UI showing element content
    return (
      <div
        className="component-instance-error"
        style={{
          position: 'absolute',
          left: element.x,
          top: element.y,
          width: element.width,
          height: element.height,
          border: '2px dashed #ef4444',
          borderRadius: '4px',
          backgroundColor: '#fef2f2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          color: '#ef4444',
          flexDirection: 'column',
          gap: '4px'
        }}
      >
        <span>Component Error</span>
        <span style={{ fontSize: '10px' }}>
          {element.content || element.buttonText || 'No content'}
        </span>
      </div>
    );
  }
};

export default ComponentInstanceElement;