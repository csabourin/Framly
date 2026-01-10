/**
 * Shared insertion logic for both drag-and-drop and drawing operations.
 * Centralizes drop zone detection, thresholds, and indicator bounds calculation.
 */

import type { CanvasElement } from '../../../types';

// Drop Zone Constants
export const DROP_ZONES = {
  BEFORE: 'before',
  INSIDE: 'inside',
  AFTER: 'after',
  CANVAS_START: 'canvas_start',
  CANVAS_END: 'canvas_end'
} as const;

export type DropZone = typeof DROP_ZONES[keyof typeof DROP_ZONES];

// Thresholds for drop zones
export const ZONE_THRESHOLDS = {
  TOP: 0.35,           // Top 35% = before
  BOTTOM: 0.65,        // Bottom 35% = after
  CANVAS_PADDING: 100  // Pixels from canvas edge for start/end zones
};

// Valid container elements that can accept children
export const VALID_CONTAINERS = new Set([
  'rectangle', 'container', 'section', 'nav', 'header', 'footer', 'article',
  'main', 'aside', 'form', 'div'
]);

/**
 * Represents a calculated insertion point in the DOM flow
 */
export interface InsertionPoint {
  targetContainerId: string;
  insertPosition: 'before' | 'after' | 'inside' | 'canvas-start' | 'canvas-end';
  referenceElementId?: string;
  zone: DropZone;
}

/**
 * Bounds for the visual insertion indicator
 */
export interface IndicatorBounds {
  x: number;
  y: number | string;
  width: number | string;
  height: number | string;
  isFixed?: boolean;
}

/**
 * Full insertion indicator state for rendering
 */
export interface InsertionIndicatorState {
  type?: DropZone;
  elementId?: string;
  position: DropZone;
  insertPosition: 'before' | 'after' | 'inside';
  referenceElementId?: string;
  bounds: IndicatorBounds | null;
}

/**
 * Check if an element is a valid container that can accept children
 */
export function isValidContainer(element: CanvasElement | undefined): boolean {
  if (!element) return false;
  return VALID_CONTAINERS.has(element.type) || element.isContainer === true;
}

/**
 * Check if an element is an ancestor of another element
 */
export function isAncestor(
  ancestorId: string,
  descendantId: string,
  elements: Record<string, CanvasElement>
): boolean {
  if (ancestorId === descendantId) return false;

  const findDescendant = (elementId: string): boolean => {
    const element = elements[elementId];
    if (!element?.children) return false;

    if (element.children.includes(descendantId)) return true;

    return element.children.some(childId => findDescendant(childId));
  };

  return findDescendant(ancestorId);
}

/**
 * Calculate which zone a point falls into relative to an element
 */
export function calculateZone(
  relativeY: number,
  isContainer: boolean
): DropZone {
  if (relativeY < ZONE_THRESHOLDS.TOP) {
    return DROP_ZONES.BEFORE;
  } else if (relativeY > ZONE_THRESHOLDS.BOTTOM) {
    return DROP_ZONES.AFTER;
  } else if (isContainer) {
    return DROP_ZONES.INSIDE;
  } else {
    // Non-container mid-section: split precisely at midpoint
    return relativeY < 0.5 ? DROP_ZONES.BEFORE : DROP_ZONES.AFTER;
  }
}

/**
 * Calculate insertion bounds for visual indicator based on element and zone
 */
export function calculateInsertionBounds(
  elementId: string,
  zone: DropZone,
  elements: Record<string, CanvasElement>,
  canvasRef: React.RefObject<HTMLDivElement>,
  isCanvasDrop: boolean = false
): IndicatorBounds | null {
  if (isCanvasDrop) {
    // Special bounds for canvas start/end
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return null;

    return {
      x: 0,
      y: zone === DROP_ZONES.CANVAS_START ? 0 : '100%',
      width: '100%',
      height: 4,
      isFixed: true
    };
  }

  const element = elements[elementId];
  if (!element) return null;

  // Query the DOM element to get its bounds
  const domElement = document.getElementById(elementId);
  if (!domElement) return null;

  const rect = domElement.getBoundingClientRect();
  const canvasRect = canvasRef.current?.getBoundingClientRect();

  if (!canvasRect) return null;

  // Calculate relative coordinates including scroll offset
  const scrollLeft = canvasRef.current?.scrollLeft || 0;
  const scrollTop = canvasRef.current?.scrollTop || 0;

  let bounds: IndicatorBounds = {
    x: rect.left - canvasRect.left + scrollLeft,
    y: rect.top - canvasRect.top + scrollTop,
    width: rect.width,
    height: rect.height
  };

  if (zone === DROP_ZONES.BEFORE) {
    bounds.y = (bounds.y as number) - 2;
    bounds.height = 4;
  } else if (zone === DROP_ZONES.AFTER) {
    bounds.y = (bounds.y as number) + rect.height - 2;
    bounds.height = 4;
  }
  // INSIDE keeps full bounds

  return bounds;
}

/**
 * Find the element at a given point by hit-testing DOM elements
 * @param clientX - Client X coordinate (viewport coordinates)
 * @param clientY - Client Y coordinate (viewport coordinates)
 * @param excludeIds - Element IDs to exclude from hit testing
 */
export function findElementAtPoint(
  clientX: number,
  clientY: number,
  excludeIds: string[] = []
): { elementId: string | null; domElement: HTMLElement | null } {
  // Get all elements at this point using client coordinates
  const elementsAtPoint = document.elementsFromPoint(clientX, clientY);

  // Find the first canvas element (has data-element-id)
  for (const el of elementsAtPoint) {
    const elementId = (el as HTMLElement).getAttribute?.('data-element-id');
    if (elementId && !excludeIds.includes(elementId) && elementId !== 'root') {
      return { elementId, domElement: el as HTMLElement };
    }
  }

  return { elementId: null, domElement: null };
}

/**
 * Calculate a full insertion point from canvas coordinates
 * Used by both drawing and drag-and-drop operations
 */
export function calculateInsertionPoint(
  canvasX: number,
  canvasY: number,
  elements: Record<string, CanvasElement>,
  canvasRef: React.RefObject<HTMLDivElement>,
  zoomLevel: number = 1,
  excludeElementId?: string
): InsertionPoint | null {
  const canvas = canvasRef.current;
  if (!canvas) return null;

  const canvasRect = canvas.getBoundingClientRect();

  // Convert canvas coordinates to client coordinates for hit testing
  const clientX = canvasRect.left + canvasX * zoomLevel;
  const clientY = canvasRect.top + canvasY * zoomLevel;

  // Check for canvas padding zones (top/bottom edges)
  const relativeY = clientY - canvasRect.top;
  if (relativeY < ZONE_THRESHOLDS.CANVAS_PADDING) {
    return {
      targetContainerId: 'root',
      insertPosition: 'canvas-start',
      zone: DROP_ZONES.CANVAS_START
    };
  }
  if (relativeY > canvasRect.height - ZONE_THRESHOLDS.CANVAS_PADDING) {
    return {
      targetContainerId: 'root',
      insertPosition: 'canvas-end',
      zone: DROP_ZONES.CANVAS_END
    };
  }

  // Hit test to find element at point using client coordinates
  const excludeIds = excludeElementId ? [excludeElementId] : [];
  const { elementId, domElement } = findElementAtPoint(clientX, clientY, excludeIds);

  if (!elementId || !domElement) {
    // No element found, append to root
    return {
      targetContainerId: 'root',
      insertPosition: 'inside',
      zone: DROP_ZONES.INSIDE
    };
  }

  const element = elements[elementId];
  if (!element) {
    return {
      targetContainerId: 'root',
      insertPosition: 'inside',
      zone: DROP_ZONES.INSIDE
    };
  }

  // Calculate relative position within the element
  const rect = domElement.getBoundingClientRect();
  const relY = (clientY - rect.top) / rect.height;

  // Determine zone
  const isContainer = isValidContainer(element);
  const zone = calculateZone(relY, isContainer);

  // Calculate insert position and reference
  if (zone === DROP_ZONES.INSIDE) {
    return {
      targetContainerId: elementId,
      insertPosition: 'inside',
      zone
    };
  } else {
    // Before or after - insert relative to this element's parent
    const parentId = element.parent || 'root';
    return {
      targetContainerId: parentId,
      insertPosition: zone === DROP_ZONES.BEFORE ? 'before' : 'after',
      referenceElementId: elementId,
      zone
    };
  }
}

/**
 * Build full indicator state from an insertion point
 */
export function buildIndicatorState(
  insertionPoint: InsertionPoint,
  elements: Record<string, CanvasElement>,
  canvasRef: React.RefObject<HTMLDivElement>
): InsertionIndicatorState | null {
  const { zone, referenceElementId, targetContainerId } = insertionPoint;

  // For canvas zones, we need special handling
  if (zone === DROP_ZONES.CANVAS_START || zone === DROP_ZONES.CANVAS_END) {
    return {
      type: zone,
      position: zone,
      insertPosition: zone === DROP_ZONES.CANVAS_START ? 'before' : 'after',
      bounds: calculateInsertionBounds('root', zone, elements, canvasRef, true)
    };
  }

  // For element-relative zones
  const elementId = referenceElementId || targetContainerId;
  const bounds = calculateInsertionBounds(elementId, zone, elements, canvasRef, false);

  if (!bounds) return null;

  return {
    elementId,
    position: zone,
    insertPosition: zone === DROP_ZONES.BEFORE ? 'before' :
                    zone === DROP_ZONES.AFTER ? 'after' : 'inside',
    referenceElementId,
    bounds
  };
}
