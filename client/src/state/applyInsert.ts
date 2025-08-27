/**
 * Insert Operation Application
 * Ensures elements are never swallowed and always get inserted
 */

import { CanvasElement } from '../types/canvas';

export type InsertOp = {
  type: "insert";
  node: CanvasElement;
  to: { parent: string; index: number | "end" };
};

export type MoveOp = {
  type: "move";
  id: string;
  from: { parent: string; index: number };
  to: { parent: string; index: number | "end" };
};

function clampIndex(len: number, idx: number | "end"): number {
  return idx === "end" ? len : Math.max(0, Math.min(idx, len));
}

/**
 * Apply insert operation ensuring element is never lost
 */
export function applyInsertOp(
  elements: Record<string, CanvasElement>,
  op: InsertOp
): Record<string, CanvasElement> {
  
  const nextElements = { ...elements };
  
  // Ensure parent exists (fallback to root)
  const parentId = op.to.parent in nextElements ? op.to.parent : "root";
  const parent = nextElements[parentId];
  
  if (!parent) {
    console.warn(`Parent ${parentId} not found, skipping insert`);
    return nextElements;
  }
  
  // Ensure parent has children array
  if (!parent.children) {
    parent.children = [];
  }
  
  // Clamp index to valid range
  const clampedIndex = clampIndex(parent.children.length, op.to.index);
  
  // Set parent relationship
  const nodeWithParent = {
    ...op.node,
    parent: parentId
  };
  
  // Add node to elements
  nextElements[op.node.id] = nodeWithParent;
  
  // Update parent's children array
  const updatedParent = {
    ...parent,
    children: [...parent.children]
  };
  updatedParent.children.splice(clampedIndex, 0, op.node.id);
  nextElements[parentId] = updatedParent;
  
  return nextElements;
}

/**
 * Apply move operation ensuring element maintains its position
 */
export function applyMoveOp(
  elements: Record<string, CanvasElement>,
  op: MoveOp
): Record<string, CanvasElement> {
  
  const nextElements = { ...elements };
  const element = nextElements[op.id];
  
  if (!element) {
    console.warn(`Element ${op.id} not found for move`);
    return nextElements;
  }
  
  // Remove from old parent
  const oldParent = nextElements[op.from.parent];
  if (oldParent && oldParent.children) {
    const updatedOldParent = {
      ...oldParent,
      children: oldParent.children.filter(childId => childId !== op.id)
    };
    nextElements[op.from.parent] = updatedOldParent;
  }
  
  // Add to new parent
  const newParentId = op.to.parent in nextElements ? op.to.parent : "root";
  const newParent = nextElements[newParentId];
  
  if (newParent) {
    if (!newParent.children) {
      newParent.children = [];
    }
    
    const clampedIndex = clampIndex(newParent.children.length, op.to.index);
    const updatedNewParent = {
      ...newParent,
      children: [...newParent.children]
    };
    updatedNewParent.children.splice(clampedIndex, 0, op.id);
    nextElements[newParentId] = updatedNewParent;
    
    // Update element's parent reference
    nextElements[op.id] = {
      ...element,
      parent: newParentId
    };
  }
  
  return nextElements;
}