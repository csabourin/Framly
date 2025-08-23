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
  
  if (!isComponentInstance(element) || !element.componentRef) {
    console.warn('ComponentInstanceElement: element is not a component instance');
    return null;
  }

  const componentDefinition = useSelector((state: RootState) => 
    element.componentRef?.componentId ? selectComponentDefinition(state, element.componentRef.componentId) : null
  );
  
  // Debug logging
  React.useEffect(() => {
    console.log('ComponentInstanceElement render:', {
      elementId: element.id,
      componentRef: element.componentRef,
      hasDefinition: !!componentDefinition,
      definitionName: componentDefinition?.name
    });
  }, [element.id, element.componentRef, componentDefinition]);

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

  if (!componentDefinition) {
    console.warn('Component definition not found for instance:', element.componentRef?.componentId);
    // Component definition not found - show error state
    return (
      <div
        className="border-2 border-red-500 border-dashed bg-red-50 flex items-center justify-center text-red-600 text-sm"
        data-testid={`component-instance-missing-${element.id}`}
        data-component-error="true"
        style={{
          position: 'absolute',
          left: element.x,
          top: element.y,
          width: element.width,
          height: element.height,
          zIndex: 1,
          pointerEvents: 'all',
          cursor: 'pointer'
        }}
        onClick={handleSingleClick}
      >
        <div className="text-center">
          <p className="font-medium">Component Not Found</p>
          <p className="text-xs mt-1">ID: {element.componentRef?.componentId}</p>
        </div>
      </div>
    );
  }

  // Instead of rendering as a gray box, render the actual component content
  // The component instance should look exactly like the original element
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
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        zIndex: 1,
        pointerEvents: 'all', // Capture all interactions
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
        {/* Content based on template type - ALL INTERACTIONS DISABLED */}
        {componentDefinition.template.type === 'text' && (
          <div 
            className="w-full h-full flex items-center justify-center"
            style={{
              ...componentDefinition.template.styles,
              pointerEvents: 'none',
              userSelect: 'none'
            }}
          >
            {componentDefinition.template.content || 'Text'}
          </div>
        )}
        
        {componentDefinition.template.type === 'button' && (
          <button 
            className="w-full h-full"
            disabled // Always disabled for instances
            style={{
              ...componentDefinition.template.styles,
              pointerEvents: 'none', // Completely disable button interactions
              cursor: 'inherit'
            }}
            tabIndex={-1}
          >
            {componentDefinition.template.buttonText || componentDefinition.template.content || 'Button'}
          </button>
        )}
        
        {componentDefinition.template.type === 'rectangle' && (
          <div 
            className="w-full h-full" 
            style={{
              ...componentDefinition.template.styles,
              pointerEvents: 'none',
              userSelect: 'none'
            }}
          />
        )}
        
        {componentDefinition.template.type === 'image' && (
          <img 
            src={componentDefinition.template.imageUrl || componentDefinition.template.imageBase64 || '/placeholder.png'}
            alt={componentDefinition.template.imageAlt || 'Component image'}
            className="w-full h-full object-cover"
            style={{
              ...componentDefinition.template.styles,
              pointerEvents: 'none',
              userSelect: 'none'
            }}
            draggable={false}
          />
        )}
        
        {componentDefinition.template.type === 'container' && (
          <div 
            className="w-full h-full"
            style={{
              display: 'flex',
              flexDirection: componentDefinition.template.flexDirection || 'column',
              justifyContent: componentDefinition.template.justifyContent || 'flex-start',
              alignItems: componentDefinition.template.alignItems || 'stretch',
              ...componentDefinition.template.styles,
              pointerEvents: 'none',
              userSelect: 'none'
            }}
          >
            {/* Container instances show placeholder content */}
            <div 
              className="text-xs text-gray-500 p-2"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              Container Component: {componentDefinition.name}
            </div>
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
};

export default ComponentInstanceElement;