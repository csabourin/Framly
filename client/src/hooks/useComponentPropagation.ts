import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectComponentDefinitionsState, selectCurrentElements } from '../store/selectors';
import { updateElement } from '../store/canvasSlice';
import { updateComponentDefinition } from '../store/componentDefinitionsSlice';
import { isComponentInstance, renderComponentInstance } from '../utils/componentInstances';
import { ComponentDef } from '../types/canvas';

/**
 * Hook that handles automatic propagation of component definition changes
 * to all component instances in the canvas
 */
export function useComponentPropagation() {
  const dispatch = useDispatch();
  const { definitions } = useSelector(selectComponentDefinitionsState);
  const currentElements = useSelector(selectCurrentElements);

  useEffect(() => {
    // Listen for component definition updates and propagate to instances
    const propagateToInstances = (componentDef: ComponentDef) => {
      const instances = findComponentInstances(componentDef.id, currentElements);
      
      if (instances.length === 0) return;
      
      console.log(`Propagating updates to ${instances.length} instances of:`, componentDef.name);
      
      instances.forEach(({ element, elementId }) => {
        if (element.componentRef && element.componentRef.componentId === componentDef.id) {
          // Render the updated instance
          const updatedInstance = renderComponentInstance(element, componentDef);
          
          // Preserve instance-specific properties (position, size, etc.)
          const preservedInstance = {
            ...updatedInstance,
            id: element.id,
            x: element.x,
            y: element.y,
            width: element.width,
            height: element.height,
            parent: element.parent,
            componentRef: {
              ...element.componentRef,
              version: componentDef.version // Update to latest version
            }
          };
          
          // Update the instance in Redux
          dispatch(updateElement({
            id: elementId,
            updates: preservedInstance
          }));
        }
      });
    };

    // Set up propagation for all component definitions
    Object.values(definitions).forEach(componentDef => {
      // This is a simplified version - in a full implementation,
      // you'd set up listeners for component definition changes
    });
  }, [definitions, currentElements, dispatch]);
}

/**
 * Find all component instances for a given component ID
 */
function findComponentInstances(componentId: string, elements: Record<string, any>) {
  const instances: Array<{ element: any; elementId: string }> = [];
  
  Object.entries(elements).forEach(([elementId, element]) => {
    if (isComponentInstance(element) && element.componentRef?.componentId === componentId) {
      instances.push({ element, elementId });
    }
  });
  
  return instances;
}

/**
 * Hook for component editors to trigger propagation when they save changes
 */
export function usePropagateComponentChanges() {
  const dispatch = useDispatch();
  const currentElements = useSelector(selectCurrentElements);
  
  const propagateChanges = (updatedComponentDef: ComponentDef) => {
    // Update the component definition
    dispatch(updateComponentDefinition(updatedComponentDef));
    
    // Find and update all instances
    const instances = findComponentInstances(updatedComponentDef.id, currentElements);
    
    console.log(`Propagating changes to ${instances.length} instances of:`, updatedComponentDef.name);
    
    instances.forEach(({ element, elementId }) => {
      if (element.componentRef) {
        // Check if instance needs update (version mismatch)
        if (element.componentRef.version < updatedComponentDef.version) {
          const updatedInstance = renderComponentInstance(element, updatedComponentDef);
          
          const preservedInstance = {
            ...updatedInstance,
            id: element.id,
            x: element.x,
            y: element.y,
            width: element.width,
            height: element.height,
            parent: element.parent,
            componentRef: {
              ...element.componentRef,
              version: updatedComponentDef.version
            }
          };
          
          dispatch(updateElement({
            id: elementId,
            updates: preservedInstance
          }));
        }
      }
    });
  };
  
  return propagateChanges;
}