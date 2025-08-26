import { ComponentDef, CanvasElement, ComponentId } from '../types/canvas';
import { store } from '../store';
import { updateElement } from '../store/canvasSlice';
import { selectCurrentElements } from '../store/selectors';
import { isComponentInstance, renderComponentInstance } from './componentInstances';

/**
 * Component propagation system for updating all instances when definitions change
 */

/**
 * Find all component instances in the current canvas
 */
export function findComponentInstances(componentId: ComponentId): string[] {
  const state = store.getState();
  const currentElements = selectCurrentElements(state);
  
  const instanceIds: string[] = [];
  
  Object.values(currentElements).forEach(element => {
    if (isComponentInstance(element) && element.componentRef?.componentId === componentId) {
      instanceIds.push(element.id);
    }
  });
  
  return instanceIds;
}

/**
 * Update all instances of a component when its definition changes
 */
export function propagateComponentUpdates(componentDef: ComponentDef): void {
  const instanceIds = findComponentInstances(componentDef.id);
  
  if (instanceIds.length === 0) {
    return;
  }
  
  const state = store.getState();
  const currentElements = selectCurrentElements(state);
  
  instanceIds.forEach(instanceId => {
    const instance = currentElements[instanceId];
    if (instance && isComponentInstance(instance)) {
      // Render the updated instance
      const updatedInstance = renderComponentInstance(instance, componentDef);
      
      // Preserve instance-specific properties (position, size, overrides)
      const preservedInstance: CanvasElement = {
        ...updatedInstance,
        id: instance.id,
        x: instance.x,
        y: instance.y,
        width: instance.width,
        height: instance.height,
        parent: instance.parent,
        componentRef: instance.componentRef
      };
      
      // Dispatch update to Redux
      store.dispatch(updateElement({
        id: instanceId,
        updates: preservedInstance
      }));
    }
  });

}

/**
 * Check if a component definition can be safely deleted
 * Returns list of instance IDs that would be affected
 */
export function getComponentUsage(componentId: ComponentId): {
  instanceIds: string[];
  canSafelyDelete: boolean;
} {
  const instanceIds = findComponentInstances(componentId);
  
  return {
    instanceIds,
    canSafelyDelete: instanceIds.length === 0
  };
}

/**
 * Convert all instances of a component back to regular elements (detach)
 */
export function detachAllComponentInstances(componentDef: ComponentDef): void {
  const instanceIds = findComponentInstances(componentDef.id);
  
  if (instanceIds.length === 0) {
    return;
  }
  
  const state = store.getState();
  const currentElements = selectCurrentElements(state);
  
  instanceIds.forEach(instanceId => {
    const instance = currentElements[instanceId];
    if (instance && isComponentInstance(instance)) {
      // Create detached element by removing componentRef
      const detachedElement: CanvasElement = {
        ...instance,
        componentRef: undefined // Remove component reference
      };
      
      // Merge properties from component template
      const mergedElement: CanvasElement = {
        ...componentDef.template,
        id: instance.id,
        x: instance.x,
        y: instance.y,
        width: instance.width,
        height: instance.height,
        parent: instance.parent,
        componentRef: undefined
      };
      
      // Dispatch update to Redux
      store.dispatch(updateElement({
        id: instanceId,
        updates: mergedElement
      }));
    }
  });
}

/**
 * Get statistics about component usage across the canvas
 */
export function getComponentStatistics(): Record<ComponentId, {
  name: string;
  instanceCount: number;
  instanceIds: string[];
}> {
  const state = store.getState();
  const currentElements = selectCurrentElements(state);
  const stats: Record<ComponentId, {
    name: string;
    instanceCount: number;
    instanceIds: string[];
  }> = {};
  
  Object.values(currentElements).forEach(element => {
    if (isComponentInstance(element) && element.componentRef?.componentId) {
      const componentId = element.componentRef.componentId;
      
      if (!stats[componentId]) {
        stats[componentId] = {
          name: `Component ${componentId}`, // Would get actual name from component def
          instanceCount: 0,
          instanceIds: []
        };
      }
      
      stats[componentId].instanceCount++;
      stats[componentId].instanceIds.push(element.id);
    }
  });
  
  return stats;
}