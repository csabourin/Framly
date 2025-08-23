import React, { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { selectComponentDefinition } from '../../store/selectors';
import { openComponentTab } from '../../store/componentDefinitionsSlice';
import { selectElement, createTab } from '../../store/canvasSlice';
import { CanvasElement, ComponentId } from '../../types/canvas';
import { isComponentInstance, renderComponentInstance } from '../../utils/componentInstances';

interface ComponentInstanceElementProps {
  element: CanvasElement;
  isSelected: boolean;
  onSelect: () => void;
}

/**
 * Component that renders a component instance with read-only behavior
 * and double-click to edit functionality
 */
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
    // Prevent any child interactions
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

  // Handle missing component definition AFTER all hooks
  if (!componentDefinition) {
    console.warn('Component definition not found for instance:', element.componentRef?.componentId);
    // Return null instead of rendering fallback to prevent further issues
    return null;
  }

  // Safely render the component instance with error boundaries
  try {
    return (
      <div
        className="component-instance-wrapper"
        onClick={handleSingleClick}
        onDoubleClick={handleDoubleClick}
        data-testid={`component-instance-${element.id}`}
        data-instance="true"
        data-state={isSelected ? 'selected' : 'default'}
        data-component-id={element.componentRef?.componentId}
        role="group"
        aria-label={`Component instance: ${componentDefinition.name}`}
        title={`Double-click to edit ${componentDefinition.name} component`}
        style={{
          position: 'absolute',
          left: element.x || 0,
          top: element.y || 0,
          width: element.width || 100,
          height: element.height || 40,
          zIndex: 1,
          pointerEvents: 'all',
          cursor: 'pointer'
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onMouseMove={(e) => e.stopPropagation()}
      >
      {/* Render actual component template content - COMPLETELY LOCKED */}
      <div 
        className="w-full h-full relative component-instance-content"
        style={{
          ...componentDefinition.template.styles,
          pointerEvents: 'none', // Disable all interactions on child content
          userSelect: 'none',    // Prevent text selection
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none'
        }}
        onMouseDown={(e) => e.preventDefault()}
        onMouseUp={(e) => e.preventDefault()}
        onClick={(e) => e.preventDefault()}
        onDoubleClick={(e) => e.preventDefault()}
      >
        {/* CRITICAL: Always render visible content for component instances */}
        {componentDefinition.template && componentDefinition.template.type === 'text' && (
          <div 
            className="w-full h-full flex items-center justify-center text-sm"
            style={{
              ...componentDefinition.template.styles,
              pointerEvents: 'none',
              userSelect: 'none'
            }}
          >
            {componentDefinition.template.content || componentDefinition.name}
          </div>
        )}
        
        {componentDefinition.template && componentDefinition.template.type === 'button' && (
          <button 
            className="w-full h-full text-sm"
            disabled
            style={{
              ...componentDefinition.template.styles,
              pointerEvents: 'none',
              cursor: 'inherit',
              border: componentDefinition.template.styles?.border || '1px solid #d1d5db',
              borderRadius: componentDefinition.template.styles?.borderRadius || '4px',
              backgroundColor: componentDefinition.template.styles?.backgroundColor || '#f9fafb'
            }}
            tabIndex={-1}
          >
            {componentDefinition.template.buttonText || componentDefinition.template.content || componentDefinition.name}
          </button>
        )}
        
        {componentDefinition.template && componentDefinition.template.type === 'rectangle' && (
          <div 
            className="w-full h-full flex items-center justify-center text-xs text-gray-600" 
            style={{
              ...componentDefinition.template.styles,
              pointerEvents: 'none',
              userSelect: 'none',
              border: componentDefinition.template.styles?.border || '1px solid #d1d5db',
              borderRadius: componentDefinition.template.styles?.borderRadius || '4px',
              backgroundColor: componentDefinition.template.styles?.backgroundColor || '#f9fafb'
            }}
          >
            {componentDefinition.name}
          </div>
        )}
        
        {componentDefinition.template && componentDefinition.template.type === 'image' && (
          <img 
            src={componentDefinition.template.imageUrl || componentDefinition.template.imageBase64 || '/placeholder.png'}
            alt={componentDefinition.template.imageAlt || componentDefinition.name}
            className="w-full h-full object-cover"
            style={{
              ...componentDefinition.template.styles,
              pointerEvents: 'none',
              userSelect: 'none'
            }}
            draggable={false}
          />
        )}
        
        {componentDefinition.template && componentDefinition.template.type === 'container' && (
          <div 
            className="w-full h-full flex items-center justify-center text-xs text-blue-600 border-2 border-dashed border-blue-300 bg-blue-50"
            style={{
              display: 'flex',
              flexDirection: 'row', // Override for display 
              justifyContent: 'center',
              alignItems: 'center',
              ...componentDefinition.template.styles,
              pointerEvents: 'none',
              userSelect: 'none'
            }}
          >
            {componentDefinition.name}
          </div>
        )}
        
        {/* CRITICAL: Always show fallback for components without proper template */}
        {(!componentDefinition.template || !['text', 'button', 'rectangle', 'image', 'container'].includes(componentDefinition.template.type)) && (
          <div 
            className="w-full h-full flex items-center justify-center text-xs text-purple-600 border-2 border-dashed border-purple-300 bg-purple-50"
            style={{ 
              pointerEvents: 'none', 
              userSelect: 'none'
            }}
          >
            {componentDefinition.name}
          </div>
        )}
        
        {/* Component instance indicator overlay */}
        <div 
          className="absolute top-0 right-0 w-4 h-4 bg-blue-500 opacity-70 pointer-events-none"
          style={{ 
            clipPath: 'polygon(100% 0%, 0% 0%, 100% 100%)',
            borderRadius: '0 4px 0 0'
          }}
          title={`Component: ${componentDefinition.name}`}
        />
      </div>
    </div>
  );
  } catch (error) {
    console.error('Error rendering component instance:', error, { elementId: element.id, componentId: element.componentRef?.componentId });
    return (
      <div
        style={{
          position: 'absolute',
          left: element.x || 0,
          top: element.y || 0,
          width: element.width || 100,
          height: element.height || 40,
          backgroundColor: '#fee2e2',
          border: '1px solid #fca5a5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          color: '#dc2626'
        }}
      >
        Error
      </div>
    );
  }
};

export default ComponentInstanceElement;