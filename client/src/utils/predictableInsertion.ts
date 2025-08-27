import { CanvasElement } from '../types/canvas';

/**
 * Predictable insertion zone detection that matches visual feedback exactly
 * Implements the clear rules from the specification
 */

interface InsertionZone {
  elementId: string;
  position: 'before' | 'after' | 'inside';
  bounds: { x: number; y: number; width: number; height: number };
  confidence: number;
}

/**
 * Determines if an element can accept children
 */
export function canAcceptChildren(element: CanvasElement): boolean {
  if (!element) return false;
  
  return element.type === 'container' || 
         element.type === 'section' || 
         element.type === 'header' || 
         element.type === 'footer' || 
         element.type === 'nav' || 
         element.type === 'article' ||
         element.isContainer === true;
}

/**
 * Calculates insertion zone with predictable rules:
 * 1. If hovered node accepts children → default to "inside" highlight
 * 2. If hovered node rejects children → compare cursor Y to midpoint → top half = before, bottom half = after
 */
export function calculatePredictableInsertion(
  mouseX: number,
  mouseY: number,
  targetElement: CanvasElement,
  elementBounds: { x: number; y: number; width: number; height: number },
  canvasElements: Record<string, CanvasElement>,
  hysteresisPreviousZone?: string | null
): InsertionZone | null {
  
  if (!targetElement || !elementBounds) return null;
  
  const { x, y, width, height } = elementBounds;
  
  // Check if mouse is within element bounds
  if (mouseX < x || mouseX > x + width || mouseY < y || mouseY > y + height) {
    return null;
  }
  
  // Rule 1: If hovered node accepts children → default to "inside" highlight
  if (canAcceptChildren(targetElement)) {
    // Apply hysteresis for inside zones
    if (hysteresisPreviousZone === 'inside') {
      // Stay in inside zone unless cursor is very close to edges (within 20% from top/bottom)
      const relativeY = (mouseY - y) / height;
      if (relativeY > 0.2 && relativeY < 0.8) {
        return {
          elementId: targetElement.id,
          position: 'inside',
          bounds: elementBounds,
          confidence: 0.9
        };
      }
    }
    
    // For containers, check if we're near edges for before/after
    const relativeY = (mouseY - y) / height;
    const edgeThreshold = 0.25; // 25% from top/bottom for before/after
    
    if (relativeY <= edgeThreshold) {
      return {
        elementId: targetElement.id,
        position: 'before',
        bounds: elementBounds,
        confidence: 1 - (relativeY / edgeThreshold)
      };
    } else if (relativeY >= (1 - edgeThreshold)) {
      return {
        elementId: targetElement.id,
        position: 'after',
        bounds: elementBounds,
        confidence: (relativeY - (1 - edgeThreshold)) / edgeThreshold
      };
    } else {
      // Middle zone - inside
      return {
        elementId: targetElement.id,
        position: 'inside',
        bounds: elementBounds,
        confidence: 0.8
      };
    }
  }
  
  // Rule 2: If hovered node rejects children → compare cursor Y to midpoint
  const midpoint = y + (height / 2);
  const position = mouseY < midpoint ? 'before' : 'after';
  
  // Apply hysteresis for before/after switching
  if (hysteresisPreviousZone === 'before' && position === 'after') {
    // Require cursor to move significantly below midpoint to switch
    if (mouseY < midpoint + 8) {
      return {
        elementId: targetElement.id,
        position: 'before',
        bounds: elementBounds,
        confidence: 0.7
      };
    }
  } else if (hysteresisPreviousZone === 'after' && position === 'before') {
    // Require cursor to move significantly above midpoint to switch
    if (mouseY > midpoint - 8) {
      return {
        elementId: targetElement.id,
        position: 'after',
        bounds: elementBounds,
        confidence: 0.7
      };
    }
  }
  
  return {
    elementId: targetElement.id,
    position,
    bounds: elementBounds,
    confidence: 0.8
  };
}

/**
 * Gets the visual indicator type based on insertion zone
 * Ensures mutual exclusivity between inside highlights and before/after lines
 */
export function getIndicatorType(
  insertionZone: InsertionZone | null,
  targetElement: CanvasElement | null
): 'inside-highlight' | 'before-line' | 'after-line' | null {
  
  if (!insertionZone || !targetElement) return null;
  
  switch (insertionZone.position) {
    case 'inside':
      return canAcceptChildren(targetElement) ? 'inside-highlight' : null;
    case 'before':
      return 'before-line';
    case 'after':
      return 'after-line';
    default:
      return null;
  }
}

/**
 * Validates that the insertion zone matches the actual DOM insertion behavior
 * This ensures no surprises - what you see is what you get
 */
export function validateInsertionMatch(
  insertionZone: InsertionZone,
  targetElement: CanvasElement,
  canvasElements: Record<string, CanvasElement>
): boolean {
  
  if (insertionZone.position === 'inside') {
    // Inside insertion requires the target to accept children
    return canAcceptChildren(targetElement);
  }
  
  if (insertionZone.position === 'before' || insertionZone.position === 'after') {
    // Before/after insertion requires the parent to accept children
    const parentId = targetElement.parent || 'root';
    const parentElement = canvasElements[parentId];
    
    if (!parentElement) return true; // Root always accepts
    return canAcceptChildren(parentElement);
  }
  
  return false;
}

/**
 * Generates the correct announcement text for screen readers
 * Must match exactly with the visual indicator and insertion behavior
 */
export function generateInsertionAnnouncement(
  insertionZone: InsertionZone | null,
  targetElement: CanvasElement | null
): string {
  
  if (!insertionZone || !targetElement) return '';
  
  const elementName = targetElement.type === 'container' ? 'Container' :
                     targetElement.type === 'text' ? 'Text' :
                     targetElement.type === 'heading' ? 'Heading' :
                     targetElement.type === 'button' ? 'Button' :
                     targetElement.type === 'image' ? 'Image' :
                     targetElement.type === 'list' ? 'List' :
                     targetElement.type === 'section' ? 'Section' :
                     targetElement.type === 'nav' ? 'Navigation' :
                     targetElement.type === 'header' ? 'Header' :
                     targetElement.type === 'footer' ? 'Footer' :
                     targetElement.type === 'article' ? 'Article' :
                     'Element';
  
  switch (insertionZone.position) {
    case 'inside':
      return `Insert inside ${elementName}`;
    case 'before':
      return `Insert before ${elementName}`;
    case 'after':
      return `Insert after ${elementName}`;
    default:
      return '';
  }
}