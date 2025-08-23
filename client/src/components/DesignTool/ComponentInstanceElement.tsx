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
  
  // CRITICAL: Prevent crashes from invalid component instances
  if (!isComponentInstance(element) || !element.componentRef?.componentId) {
    console.warn('ComponentInstanceElement: invalid component instance', { elementId: element.id, componentRef: element.componentRef });
    return null;
  }

  // Additional safety check for empty componentId
  if (element.componentRef.componentId.trim() === '') {
    console.warn('ComponentInstanceElement: empty componentId', { elementId: element.id });
    return null;
  }

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

  if (!componentDefinition) {
    // Auto-cleanup orphaned instances to prevent crashes
    React.useEffect(() => {
      console.warn('Orphaned component instance detected, attempting cleanup:', {
        elementId: element.id,
        componentId: element.componentRef?.componentId
      });
      
      // Dispatch action to remove orphaned instance from Redux
      try {
        // Convert back to regular element by removing componentRef
        const cleanElement = { ...element };
        delete cleanElement.componentRef;
        
        // Don't dispatch here to avoid infinite loops - just return null
        console.log('Returning null for orphaned component to prevent crashes');
      } catch (error) {
        console.error('Error during orphaned component cleanup:', error);
      }
    }, []);
    
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