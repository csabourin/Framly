/**
 * Insertion zone detection utilities
 * Handles complex zone detection logic for drag and drop operations
 */

import { Point, Bounds, isPointInBounds } from './canvasGeometry';

export type InsertionZone = 'before' | 'after' | 'inside' | 'canvas-top' | 'canvas-bottom';

export interface InsertionZoneResult {
  zone: InsertionZone;
  elementId: string;
  bounds: Bounds;
}

/**
 * Detect insertion zone for a point relative to an element
 */
export function detectInsertionZone(
  point: Point,
  elementId: string,
  elements: Record<string, any>,
  containerRect: DOMRect
): InsertionZoneResult | null {
  const element = elements[elementId];
  if (!element) return null;

  const elementBounds: Bounds = {
    x: element.x || 0,
    y: element.y || 0,
    width: element.width || 100,
    height: element.height || 20
  };

  // Check if point is within element bounds
  if (!isPointInBounds(point, elementBounds)) return null;

  // Define zone thresholds (in pixels)
  const zoneThreshold = 8; // 8px zones for before/after
  const insideThreshold = 16; // Minimum 16px for inside zone

  // Calculate zone boundaries
  const topZone = elementBounds.y + zoneThreshold;
  const bottomZone = elementBounds.y + elementBounds.height - zoneThreshold;
  const leftZone = elementBounds.x + zoneThreshold;
  const rightZone = elementBounds.x + elementBounds.width - zoneThreshold;

  // Determine zone based on point position
  let zone: InsertionZone;
  let bounds: Bounds;

  if (point.y < topZone) {
    // Before (above) zone
    zone = 'before';
    bounds = {
      x: elementBounds.x,
      y: elementBounds.y - 2,
      width: elementBounds.width,
      height: 4
    };
  } else if (point.y > bottomZone) {
    // After (below) zone
    zone = 'after';
    bounds = {
      x: elementBounds.x,
      y: elementBounds.y + elementBounds.height - 2,
      width: elementBounds.width,
      height: 4
    };
  } else {
    // Inside zone (center area)
    zone = 'inside';
    bounds = elementBounds;
  }

  return {
    zone,
    elementId,
    bounds
  };
}

/**
 * Detect sibling insertion point between elements
 */
export function detectSiblingInsertionPoint(
  point: Point,
  parentId: string,
  elements: Record<string, any>
): { index: number; elementId?: string; zone: 'before' | 'after' } | null {
  const parent = elements[parentId];
  if (!parent?.children) return null;

  const siblings = parent.children
    .map((childId: string) => elements[childId])
    .filter(Boolean)
    .sort((a: any, b: any) => (a.y || 0) - (b.y || 0)); // Sort by Y position

  // Check gaps between siblings
  for (let i = 0; i < siblings.length - 1; i++) {
    const current = siblings[i];
    const next = siblings[i + 1];

    const gapTop = (current.y || 0) + (current.height || 20);
    const gapBottom = next.y || 0;

    if (point.y >= gapTop && point.y <= gapBottom) {
      // Point is in gap between siblings
      return {
        index: i + 1,
        elementId: next.id,
        zone: 'before'
      };
    }
  }

  // Check if point is before first sibling
  if (siblings.length > 0) {
    const first = siblings[0];
    if (point.y < (first.y || 0)) {
      return {
        index: 0,
        elementId: first.id,
        zone: 'before'
      };
    }

    // Check if point is after last sibling
    const last = siblings[siblings.length - 1];
    const lastBottom = (last.y || 0) + (last.height || 20);
    if (point.y > lastBottom) {
      return {
        index: siblings.length,
        elementId: last.id,
        zone: 'after'
      };
    }
  }

  return null;
}

/**
 * Check if point is in canvas top or bottom padding areas
 */
export function detectCanvasPaddingZone(
  point: Point,
  canvasRect: DOMRect,
  elements: Record<string, any>
): InsertionZoneResult | null {
  const paddingThreshold = 50; // 50px padding zones

  // Top padding zone
  if (point.y < paddingThreshold) {
    return {
      zone: 'canvas-top',
      elementId: 'root',
      bounds: {
        x: 0,
        y: 0,
        width: canvasRect.width,
        height: paddingThreshold
      }
    };
  }

  // Bottom padding zone
  const canvasHeight = canvasRect.height;
  if (point.y > canvasHeight - paddingThreshold) {
    return {
      zone: 'canvas-bottom',
      elementId: 'root',
      bounds: {
        x: 0,
        y: canvasHeight - paddingThreshold,
        width: canvasRect.width,
        height: paddingThreshold
      }
    };
  }

  return null;
}

/**
 * Get all candidate container elements at a point
 */
export function getCandidateContainersAtPoint(
  point: Point,
  elements: Record<string, any>
): string[] {
  const candidates: string[] = [];

  // Always include root as fallback
  candidates.push('root');

  // Check all container elements
  Object.values(elements).forEach((element: any) => {
    if (!element || !element.isContainer) return;

    const elementBounds: Bounds = {
      x: element.x || 0,
      y: element.y || 0,
      width: element.width || 100,
      height: element.height || 20
    };

    if (isPointInBounds(point, elementBounds)) {
      candidates.unshift(element.id); // Add to front (deepest first)
    }
  });

  return candidates;
}

/**
 * Calculate visual feedback bounds for insertion indicator
 */
export function calculateInsertionIndicatorBounds(
  elementId: string,
  zone: InsertionZone,
  elements: Record<string, any>
): Bounds | null {
  const element = elements[elementId];
  if (!element) return null;

  const elementBounds: Bounds = {
    x: element.x || 0,
    y: element.y || 0,
    width: element.width || 100,
    height: element.height || 20
  };

  switch (zone) {
    case 'before':
      return {
        x: elementBounds.x,
        y: elementBounds.y - 2,
        width: elementBounds.width,
        height: 4
      };

    case 'after':
      return {
        x: elementBounds.x,
        y: elementBounds.y + elementBounds.height - 2,
        width: elementBounds.width,
        height: 4
      };

    case 'inside':
      return elementBounds;

    case 'canvas-top':
      return {
        x: 0,
        y: 0,
        width: elementBounds.width,
        height: 50
      };

    case 'canvas-bottom':
      return {
        x: 0,
        y: elementBounds.height - 50,
        width: elementBounds.width,
        height: 50
      };

    default:
      return null;
  }
}