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

  // Render the component instance by expanding its template
  const renderedElement = renderComponentInstance(element, componentDef);

  return (
    <div
      className="component-instance w-full h-full cursor-pointer"
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
      {/* Instance visual chrome */}
      <div 
        className="w-full h-full relative"
        style={renderedElement.styles}
      >
        {/* Content based on component type */}
        {renderedElement.type === 'text' && (
          <div 
            className="w-full h-full"
            dangerouslySetInnerHTML={{ __html: renderedElement.content || 'Text' }}
          />
        )}
        
        {renderedElement.type === 'button' && (
          <button 
            className="w-full h-full"
            disabled // Always disabled for instances
            style={renderedElement.styles}
          >
            {renderedElement.buttonText || renderedElement.content || 'Button'}
          </button>
        )}
        
        {renderedElement.type === 'rectangle' && (
          <div className="w-full h-full" />
        )}
        
        {renderedElement.type === 'container' && (
          <div className="w-full h-full">
            {/* Container instances show placeholder content */}
            <div className="w-full h-full opacity-50 text-gray-500 flex items-center justify-center text-xs">
              Container Component
            </div>
          </div>
        )}
        
        {/* Instance indicator overlay */}
        <div className="absolute top-0 right-0 pointer-events-none">
          <div className="component-instance-badge bg-blue-600 text-white text-xs px-1 rounded-bl opacity-75">
            {componentDef.name}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComponentInstanceElement;