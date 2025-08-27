/**
 * Legal Drop Resolution
 * Ensures drops follow HTML semantics and parent-child rules
 */

import { canAcceptChild, ComponentMeta, elementTypeToTag } from './canAcceptChild';

export type Drop =
  | { kind: "into"; parentId: string; index: "end" }
  | { kind: "between"; parentId: string; index: number };

export type TentativeDrop = Drop;

/**
 * Resolve tentative drop to legal drop following HTML semantics
 */
export function resolveLegalDrop(
  tentative: TentativeDrop,
  dragged: ComponentMeta,
  getMeta: (id: string) => ComponentMeta | null,
  getParentId: (id: string) => string | null,
  indexOf: (parentId: string, childId: string) => number
): Drop | null {
  
  // Between drops are always legal (sibling placement)
  if (tentative.kind === "between") {
    return tentative;
  }
  
  // Check if target can accept the dragged element
  const targetMeta = getMeta(tentative.parentId);
  if (!targetMeta) return null;
  
  if (canAcceptChild(targetMeta, dragged)) {
    return tentative;
  }
  
  // Climb ancestors to find legal parent
  let currentId = getParentId(targetMeta.id);
  while (currentId) {
    const ancestorMeta = getMeta(currentId);
    if (!ancestorMeta) break;
    
    if (canAcceptChild(ancestorMeta, dragged)) {
      return {
        kind: "into",
        parentId: ancestorMeta.id,
        index: "end"
      };
    }
    
    currentId = getParentId(ancestorMeta.id);
  }
  
  // Bounce to sibling placement (above/below or left/right of invalid target)
  const invalidParentId = getParentId(targetMeta.id);
  if (!invalidParentId) return null;
  
  const siblingIndex = indexOf(invalidParentId, targetMeta.id);
  return {
    kind: "between",
    parentId: invalidParentId,
    index: siblingIndex
  };
}

/**
 * Create ComponentMeta from canvas element
 */
export function createComponentMeta(element: any): ComponentMeta {
  return {
    id: element.id,
    tag: elementTypeToTag(element.type),
    acceptsChildren: element.isContainer || 
                    element.type === 'container' || 
                    element.type === 'section' ||
                    element.type === 'nav' ||
                    element.type === 'header' ||
                    element.type === 'footer' ||
                    element.type === 'article' ||
                    element.type === 'list'
  };
}

/**
 * Fallback to root when no legal drop found
 */
export function fallbackToRoot(): Drop {
  return {
    kind: "between",
    parentId: "root",
    index: "end" as any
  };
}