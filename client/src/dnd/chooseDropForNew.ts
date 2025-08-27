/**
 * New Element Insertion
 * Handles drop choice for newly created elements
 */

import { chooseDrop } from './chooseDrop';
import { resolveLegalDrop, Drop, createComponentMeta } from './resolveDrop';
import { ComponentMeta } from './canAcceptChild';

/**
 * Choose drop location for new element insertion
 */
export function chooseDropForNewElement(
  point: { x: number; y: number },
  candidateContainers: string[],
  draggedMeta: ComponentMeta,
  getMeta: (id: string) => ComponentMeta | null,
  getParentId: (id: string) => string | null,
  indexOf: (parentId: string, childId: string) => number,
  getChildren: (parentId: string) => string[]
): Drop {
  
  // Try each candidate container
  for (const containerId of candidateContainers) {
    const containerElement = document.querySelector(`[data-element-id="${containerId}"]`) as HTMLElement;
    if (!containerElement) continue;
    
    const tentative = chooseDrop(point, containerElement);
    if (!tentative) continue;
    
    const legal = resolveLegalDrop(tentative, draggedMeta, getMeta, getParentId, indexOf);
    if (legal) {
      return legal;
    }
  }
  
  // Fallback to root@end
  const rootChildren = getChildren("root");
  return {
    kind: "between",
    parentId: "root",
    index: rootChildren.length
  };
}

/**
 * Get candidate container IDs from DOM elements at point
 */
export function getCandidateContainerIds(point: { x: number; y: number }): string[] {
  const elements = document.elementsFromPoint(point.x, point.y);
  const candidates: string[] = [];
  
  for (const el of elements) {
    if (el instanceof HTMLElement) {
      const elementId = el.dataset.elementId;
      const canAccept = el.dataset.container === 'true' || 
                       el.dataset.accepts || 
                       el.classList.contains('canvas-element');
      
      if (elementId && canAccept) {
        candidates.push(elementId);
      }
    }
  }
  
  return candidates;
}

/**
 * Create element metadata for insertion
 */
export function createElementMetaForInsertion(elementType: string): ComponentMeta {
  return createComponentMeta({
    id: `temp-${Date.now()}`, // Temporary ID for meta creation
    type: elementType,
    isContainer: ['container', 'section', 'nav', 'header', 'footer', 'article', 'list'].includes(elementType)
  });
}