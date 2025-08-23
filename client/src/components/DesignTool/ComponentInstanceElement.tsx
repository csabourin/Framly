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

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (element.componentRef?.componentId && componentDefinition) {
      // Create component editing tab in main canvas system
      const tabName = `Edit: ${componentDefinition.name}`;
      dispatch(createTab({ 
        name: tabName, 
        color: '#e0e7ff',
        isComponentTab: true,
        componentId: element.componentRef.componentId 
      }));
    }
  }, [dispatch, element.componentRef, componentDefinition]);

  const handleSingleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
  }, [onSelect]);

  if (!componentDefinition) {
    // Component definition not found - show error state without draggable behavior
    return (
      <div
        className="w-full h-full border-2 border-red-500 border-dashed bg-red-50 flex items-center justify-center text-red-600 text-sm pointer-events-none"
        data-testid={`component-instance-missing-${element.id}`}
        data-component-error="true"
        style={{
          position: 'relative',
          zIndex: 1,
          pointerEvents: 'none'
        }}
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
        zIndex: 1
      }}
    >
      {/* Render actual component template content */}
      <div 
        className="w-full h-full relative"
        style={componentDefinition.template.styles}
      >
        {/* Content based on template type */}
        {componentDefinition.template.type === 'text' && (
          <div 
            className="w-full h-full flex items-center justify-center"
            style={componentDefinition.template.styles}
          >
            {componentDefinition.template.content || 'Text'}
          </div>
        )}
        
        {componentDefinition.template.type === 'button' && (
          <button 
            className="w-full h-full"
            disabled // Always disabled for instances
            style={componentDefinition.template.styles}
          >
            {componentDefinition.template.buttonText || componentDefinition.template.content || 'Button'}
          </button>
        )}
        
        {componentDefinition.template.type === 'rectangle' && (
          <div 
            className="w-full h-full" 
            style={componentDefinition.template.styles}
          />
        )}
        
        {componentDefinition.template.type === 'image' && (
          <img 
            src={componentDefinition.template.imageUrl || componentDefinition.template.imageBase64 || '/placeholder.png'}
            alt={componentDefinition.template.imageAlt || 'Component image'}
            className="w-full h-full object-cover"
            style={componentDefinition.template.styles}
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
              ...componentDefinition.template.styles
            }}
          >
            {/* Container instances show placeholder content */}
            <div className="text-xs text-gray-500 p-2">
              Container Component: {componentDefinition.name}
            </div>
          </div>
        )}
        
        {/* Small instance indicator */}
        <div 
          className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full opacity-60 pointer-events-none"
          title={`Component: ${componentDefinition.name}`}
        />
      </div>
    </div>
  );
};

export default ComponentInstanceElement;