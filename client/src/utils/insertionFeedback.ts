import { CanvasElement } from '../types/canvas';
import { canAcceptChildren } from './canvas';

interface InsertionZone {
  elementId: string;
  position: 'inside' | 'before' | 'after' | 'canvas-top' | 'canvas-bottom';
  bounds: { x: number; y: number; width: number; height: number };
}

interface HysteresisState {
  lastIndicator: InsertionZone | null;
  lastCursorY: number;
  stability: number; // frames of stability
}

// Hysteresis buffer to prevent flickering
const HYSTERESIS_BUFFER = 8; // pixels
const STABILITY_THRESHOLD = 3; // frames before switching

let hysteresisState: HysteresisState = {
  lastIndicator: null,
  lastCursorY: 0,
  stability: 0
};

export function detectInsertionZoneWithHysteresis(
  x: number,
  y: number,
  currentElements: Record<string, CanvasElement>,
  forDrag: boolean = false,
  forComponentDrag: boolean = false
): InsertionZone | null {
  
  // Get the raw insertion zone without hysteresis
  const rawZone = detectRawInsertionZone(x, y, currentElements, forDrag, forComponentDrag);
  
  if (!rawZone) {
    hysteresisState = { lastIndicator: null, lastCursorY: y, stability: 0 };
    return null;
  }
  
  // If this is the first time or no previous indicator, use raw zone
  if (!hysteresisState.lastIndicator) {
    hysteresisState = { lastIndicator: rawZone, lastCursorY: y, stability: 1 };
    return rawZone;
  }
  
  // Check if cursor moved significantly
  const cursorMovement = Math.abs(y - hysteresisState.lastCursorY);
  
  // If targeting the same element, apply hysteresis for position changes
  if (rawZone.elementId === hysteresisState.lastIndicator.elementId) {
    // If position changed but cursor didn't move much, stick with last indicator
    if (rawZone.position !== hysteresisState.lastIndicator.position && cursorMovement < HYSTERESIS_BUFFER) {
      hysteresisState.stability = Math.max(0, hysteresisState.stability - 1);
      
      // Only switch if we've been stable for long enough
      if (hysteresisState.stability < STABILITY_THRESHOLD) {
        return hysteresisState.lastIndicator;
      }
    } else if (rawZone.position === hysteresisState.lastIndicator.position) {
      // Same position, increase stability
      hysteresisState.stability = Math.min(STABILITY_THRESHOLD + 1, hysteresisState.stability + 1);
    }
  }
  
  // Update state and return new zone
  hysteresisState = {
    lastIndicator: rawZone,
    lastCursorY: y,
    stability: rawZone.elementId === hysteresisState.lastIndicator.elementId ? hysteresisState.stability : 1
  };
  
  return rawZone;
}

function detectRawInsertionZone(
  x: number,
  y: number,
  currentElements: Record<string, CanvasElement>,
  forDrag: boolean = false,
  forComponentDrag: boolean = false
): InsertionZone | null {
  
  // Get all elements at this point
  const elementsAtPoint = getElementsAtPoint(x, y, currentElements);
  
  if (elementsAtPoint.length === 0) {
    // Check for canvas-level insertion
    return detectCanvasInsertion(y, currentElements);
  }
  
  // Find the best target element (topmost non-dragged element)
  const targetElement = elementsAtPoint.find(el => el.id !== 'root');
  
  if (!targetElement) {
    return detectCanvasInsertion(y, currentElements);
  }
  
  // Apply predictable rules based on element capabilities
  return determineInsertionPosition(targetElement, x, y, currentElements);
}

function determineInsertionPosition(
  targetElement: CanvasElement,
  x: number,
  y: number,
  currentElements: Record<string, CanvasElement>
): InsertionZone {
  
  const elementDiv = document.querySelector(`[data-element-id="${targetElement.id}"]`) as HTMLElement;
  if (!elementDiv) {
    // Fallback to after insertion
    return {
      elementId: targetElement.id,
      position: 'after',
      bounds: { x: targetElement.x || 0, y: targetElement.y || 0, width: targetElement.width || 100, height: targetElement.height || 32 }
    };
  }
  
  const rect = elementDiv.getBoundingClientRect();
  const canvasElement = document.querySelector('.design-canvas') as HTMLElement;
  const canvasRect = canvasElement?.getBoundingClientRect();
  
  if (!canvasRect) {
    return {
      elementId: targetElement.id,
      position: 'after',
      bounds: { x: targetElement.x || 0, y: targetElement.y || 0, width: targetElement.width || 100, height: targetElement.height || 32 }
    };
  }
  
  // Convert screen coordinates to canvas coordinates
  const canvasY = (rect.top + rect.height / 2 - canvasRect.top);
  const elementMidpoint = canvasY;
  const cursorCanvasY = (y);
  
  // Rule 1: If element accepts children, default to "inside"
  if (canAcceptChildren(targetElement)) {
    // Check if cursor is very close to edges (within 12px) for before/after
    const distanceFromTop = Math.abs(cursorCanvasY - (rect.top - canvasRect.top));
    const distanceFromBottom = Math.abs(cursorCanvasY - (rect.bottom - canvasRect.top));
    
    if (distanceFromTop <= 12) {
      return {
        elementId: targetElement.id,
        position: 'before',
        bounds: { x: rect.left - canvasRect.left, y: rect.top - canvasRect.top, width: rect.width, height: rect.height }
      };
    } else if (distanceFromBottom <= 12) {
      return {
        elementId: targetElement.id,
        position: 'after',
        bounds: { x: rect.left - canvasRect.left, y: rect.bottom - canvasRect.top, width: rect.width, height: rect.height }
      };
    } else {
      // Default to inside for containers
      return {
        elementId: targetElement.id,
        position: 'inside',
        bounds: { x: rect.left - canvasRect.left, y: rect.top - canvasRect.top, width: rect.width, height: rect.height }
      };
    }
  }
  
  // Rule 2: If element rejects children, use Y position to determine before/after
  const position = cursorCanvasY < elementMidpoint ? 'before' : 'after';
  
  return {
    elementId: targetElement.id,
    position,
    bounds: { x: rect.left - canvasRect.left, y: rect.top - canvasRect.top, width: rect.width, height: rect.height }
  };
}

function detectCanvasInsertion(y: number, currentElements: Record<string, CanvasElement>): InsertionZone | null {
  // Check if we're at the very top or bottom of the canvas
  const rootElements = Object.values(currentElements).filter(el => el.parent === 'root' || !el.parent);
  
  if (rootElements.length === 0) {
    return {
      elementId: 'root',
      position: 'canvas-top',
      bounds: { x: 0, y: 0, width: 800, height: 20 }
    };
  }
  
  // Sort by Y position
  const sortedElements = rootElements.sort((a, b) => (a.y || 0) - (b.y || 0));
  const firstElement = sortedElements[0];
  const lastElement = sortedElements[sortedElements.length - 1];
  
  // Check if cursor is above first element
  if (y < (firstElement.y || 0) - 20) {
    return {
      elementId: 'root',
      position: 'canvas-top',
      bounds: { x: 0, y: 0, width: 800, height: 20 }
    };
  }
  
  // Check if cursor is below last element
  if (y > (lastElement.y || 0) + (lastElement.height || 32) + 20) {
    return {
      elementId: 'root',
      position: 'canvas-bottom',
      bounds: { x: 0, y: y, width: 800, height: 20 }
    };
  }
  
  return null;
}

function getElementsAtPoint(x: number, y: number, currentElements: Record<string, CanvasElement>): CanvasElement[] {
  const elements: CanvasElement[] = [];
  
  // Use the existing getElementAtPoint function from canvas utils
  const canvasElement = document.querySelector('[data-testid="canvas-container"]');
  if (!canvasElement) return elements;
  
  const canvasRect = canvasElement.getBoundingClientRect();
  const pageX = canvasRect.left + x;
  const pageY = canvasRect.top + y;
  
  const elementsAtScreenPoint = document.elementsFromPoint(pageX, pageY);
  
  for (const domElement of elementsAtScreenPoint) {
    const elementId = domElement.getAttribute('data-element-id');
    if (elementId && currentElements[elementId] && elementId !== 'root') {
      elements.push(currentElements[elementId]);
    }
  }
  
  return elements;
}

// Reset hysteresis state when drag ends
export function resetInsertionHysteresis() {
  hysteresisState = {
    lastIndicator: null,
    lastCursorY: 0,
    stability: 0
  };
}