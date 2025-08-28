/**
 * Selection tool behavior
 * Handles click-to-select and hover feedback
 */

import { Point } from '../utils/canvasGeometry';

export interface SelectionToolOptions {
  multiSelect: boolean;
  dragThreshold: number;
}

export interface SelectionResult {
  elementId: string | null;
  action: 'select' | 'toggle' | 'extend';
}

/**
 * Handle selection tool mouse down
 */
export function handleSelectionMouseDown(
  point: Point,
  elements: Record<string, any>,
  currentSelection: string | null,
  options: SelectionToolOptions = { multiSelect: false, dragThreshold: 5 }
): SelectionResult {
  // Find element at point
  const hitElementId = getElementAtPoint(point, elements);
  
  if (!hitElementId) {
    // Clicked on empty space - deselect
    return { elementId: null, action: 'select' };
  }

  if (options.multiSelect) {
    // Multi-select mode (Ctrl/Cmd held)
    if (currentSelection === hitElementId) {
      // Toggle off if already selected
      return { elementId: null, action: 'toggle' };
    } else {
      // Add to selection
      return { elementId: hitElementId, action: 'extend' };
    }
  } else {
    // Single select mode
    return { elementId: hitElementId, action: 'select' };
  }
}

/**
 * Handle selection tool hover
 */
export function handleSelectionHover(
  point: Point,
  elements: Record<string, any>,
  currentSelection: string | null
): string | null {
  const hitElementId = getElementAtPoint(point, elements);
  
  // Don't show hover for already selected element
  if (hitElementId === currentSelection) {
    return null;
  }
  
  return hitElementId;
}

/**
 * Check if drag threshold is exceeded
 */
export function isDragThresholdExceeded(
  startPoint: Point,
  currentPoint: Point,
  threshold: number = 5
): boolean {
  const dx = currentPoint.x - startPoint.x;
  const dy = currentPoint.y - startPoint.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  return distance > threshold;
}

/**
 * Get element at point (simplified version for tools)
 */
function getElementAtPoint(
  point: Point,
  elements: Record<string, any>
): string | null {
  // Check elements in reverse order (top to bottom)
  const elementIds = Object.keys(elements).reverse();
  
  for (const elementId of elementIds) {
    const element = elements[elementId];
    if (!element || elementId === 'root') continue;
    
    const bounds = {
      x: element.x || 0,
      y: element.y || 0,
      width: element.width || 100,
      height: element.height || 20
    };
    
    if (isPointInBounds(point, bounds)) {
      return elementId;
    }
  }
  
  return null;
}

/**
 * Check if point is within bounds
 */
function isPointInBounds(
  point: Point,
  bounds: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}