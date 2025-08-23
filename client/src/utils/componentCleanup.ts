import { CanvasElement } from '../types/canvas';
import { ComponentDef } from '../types/canvas';

/**
 * Utility functions for cleaning up orphaned component instances
 */

/**
 * Check if an element is an orphaned component instance
 */
export function isOrphanedComponentInstance(
  element: CanvasElement, 
  componentDefinitions: Record<string, ComponentDef>
): boolean {
  if (!element.componentRef?.componentId) return false;
  return !componentDefinitions[element.componentRef.componentId];
}

/**
 * Clean orphaned component instances from elements
 */
export function cleanOrphanedInstances(
  elements: Record<string, CanvasElement>,
  componentDefinitions: Record<string, ComponentDef>
): Record<string, CanvasElement> {
  const cleaned: Record<string, CanvasElement> = {};
  let orphanedCount = 0;

  Object.entries(elements).forEach(([id, element]) => {
    if (isOrphanedComponentInstance(element, componentDefinitions)) {
      // Convert orphaned instance back to regular element
      const cleanElement = { ...element };
      delete cleanElement.componentRef;
      cleaned[id] = cleanElement;
      orphanedCount++;
      console.log(`Cleaned orphaned component instance: ${id} (was referencing ${element.componentRef?.componentId})`);
    } else {
      cleaned[id] = element;
    }
  });

  if (orphanedCount > 0) {
    console.log(`Cleaned ${orphanedCount} orphaned component instances`);
  }

  return cleaned;
}

/**
 * Validate component instance integrity
 */
export function validateComponentInstance(element: CanvasElement): boolean {
  if (!element.componentRef) return true; // Not a component instance, valid
  
  const { componentId } = element.componentRef;
  
  // Check for valid componentId
  if (!componentId || typeof componentId !== 'string' || componentId.trim() === '') {
    console.warn('Invalid componentId in component instance:', element.id);
    return false;
  }

  return true;
}