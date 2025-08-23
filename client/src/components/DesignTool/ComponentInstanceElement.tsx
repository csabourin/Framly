import React, { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { selectComponentDefinition } from '../../store/selectors';
import { openComponentTab } from '../../store/componentDefinitionsSlice';
import { selectElement } from '../../store/canvasSlice';
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

  const componentDef = useSelector((state: RootState) => 
    element.componentRef?.componentId ? selectComponentDefinition(state, element.componentRef.componentId) : null
  );

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (element.componentRef?.componentId) {
      // Open component editor tab
      dispatch(openComponentTab(element.componentRef.componentId));
    }
  }, [dispatch, element.componentRef]);

  const handleSingleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
  }, [onSelect]);

  if (!componentDef) {
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
      aria-label={`Component instance: ${componentDef.name}`}
      title={`Double-click to edit ${componentDef.name} component`}
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
        style={componentDef.template.styles}
      >
        {/* Content based on template type */}
        {componentDef.template.type === 'text' && (
          <div 
            className="w-full h-full flex items-center justify-center"
            style={componentDef.template.styles}
          >
            {componentDef.template.content || componentDef.template.text || 'Text'}
          </div>
        )}
        
        {componentDef.template.type === 'button' && (
          <button 
            className="w-full h-full"
            disabled // Always disabled for instances
            style={componentDef.template.styles}
          >
            {componentDef.template.buttonText || componentDef.template.content || 'Button'}
          </button>
        )}
        
        {componentDef.template.type === 'rectangle' && (
          <div 
            className="w-full h-full" 
            style={componentDef.template.styles}
          />
        )}
        
        {componentDef.template.type === 'image' && (
          <img 
            src={componentDef.template.imageUrl || componentDef.template.imageBase64 || '/placeholder.png'}
            alt={componentDef.template.imageAlt || 'Component image'}
            className="w-full h-full object-cover"
            style={componentDef.template.styles}
          />
        )}
        
        {componentDef.template.type === 'container' && (
          <div 
            className="w-full h-full"
            style={{
              display: 'flex',
              flexDirection: componentDef.template.flexDirection || 'column',
              justifyContent: componentDef.template.justifyContent || 'flex-start',
              alignItems: componentDef.template.alignItems || 'stretch',
              ...componentDef.template.styles
            }}
          >
            {/* Container instances show placeholder content */}
            <div className="text-xs text-gray-500 p-2">
              Container Component: {componentDef.name}
            </div>
          </div>
        )}
        
        {/* Small instance indicator */}
        <div 
          className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full opacity-60 pointer-events-none"
          title={`Component: ${componentDef.name}`}
        />
      </div>
    </div>
  );
};

export default ComponentInstanceElement;