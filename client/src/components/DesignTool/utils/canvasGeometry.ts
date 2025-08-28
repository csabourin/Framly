/**
 * Canvas geometry utilities
 * Handles coordinate conversions, hit testing, and zone detection
 */

export interface Point {
  x: number;
  y: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ContentBounds {
  minY: number;
  maxY: number;
  width: number;
}

/**
 * Convert screen coordinates to canvas-relative coordinates
 */
export function screenToCanvas(
  screenPoint: Point,
  canvasRect: DOMRect,
  zoomLevel: number
): Point {
  return {
    x: (screenPoint.x - canvasRect.left) / zoomLevel,
    y: (screenPoint.y - canvasRect.top) / zoomLevel
  };
}

/**
 * Convert canvas coordinates to screen coordinates
 */
export function canvasToScreen(
  canvasPoint: Point,
  canvasRect: DOMRect,
  zoomLevel: number
): Point {
  return {
    x: canvasPoint.x * zoomLevel + canvasRect.left,
    y: canvasPoint.y * zoomLevel + canvasRect.top
  };
}

/**
 * Calculate content bounds for dynamic canvas sizing
 */
export function calculateContentBounds(
  elements: Record<string, any>,
  rootElement: any,
  canvasWidth: number
): ContentBounds {
  if (!elements || !rootElement) {
    return { minY: 0, maxY: rootElement?.height || 800, width: canvasWidth };
  }
  
  let minY = 0;  // Start from 0 (top of intended canvas)
  let maxY = rootElement.height || 800;  // Default canvas height
  
  // Check all elements for their actual positions
  Object.values(elements).forEach(element => {
    if (!element || element.id === 'root') return;
    
    // For explicitly positioned elements, check their Y coordinates
    if (element.x !== undefined && element.y !== undefined) {
      const elementTop = element.y;
      const elementBottom = element.y + (element.height || 100);
      
      minY = Math.min(minY, elementTop);
      maxY = Math.max(maxY, elementBottom);
    }
  });
  
  return { minY, maxY, width: canvasWidth };
}

/**
 * Hit test to find element at point
 */
export function getElementAtPoint(
  point: Point,
  elements: Record<string, any>,
  excludeIds: string[] = []
): string | null {
  // Check elements in reverse order (top to bottom)
  const elementIds = Object.keys(elements).reverse();
  
  for (const elementId of elementIds) {
    if (excludeIds.includes(elementId)) continue;
    
    const element = elements[elementId];
    if (!element) continue;
    
    const elementBounds = {
      x: element.x || 0,
      y: element.y || 0,
      width: element.width || 100,
      height: element.height || 20
    };
    
    if (isPointInBounds(point, elementBounds)) {
      return elementId;
    }
  }
  
  return null;
}

/**
 * Check if point is within bounds
 */
export function isPointInBounds(point: Point, bounds: Bounds): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

/**
 * Calculate snap position for element positioning
 */
export function calculateSnapPosition(
  point: Point,
  snapSize: number = 10,
  enabled: boolean = true
): Point {
  if (!enabled) return point;
  
  return {
    x: Math.round(point.x / snapSize) * snapSize,
    y: Math.round(point.y / snapSize) * snapSize
  };
}

/**
 * Calculate distance between two points
 */
export function distanceBetweenPoints(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Get bounding box that contains all given bounds
 */
export function getBoundingBox(bounds: Bounds[]): Bounds {
  if (bounds.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  
  let minX = bounds[0].x;
  let minY = bounds[0].y;
  let maxX = bounds[0].x + bounds[0].width;
  let maxY = bounds[0].y + bounds[0].height;
  
  for (let i = 1; i < bounds.length; i++) {
    const bound = bounds[i];
    minX = Math.min(minX, bound.x);
    minY = Math.min(minY, bound.y);
    maxX = Math.max(maxX, bound.x + bound.width);
    maxY = Math.max(maxY, bound.y + bound.height);
  }
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * Check if two bounds intersect
 */
export function boundsIntersect(bounds1: Bounds, bounds2: Bounds): boolean {
  return !(
    bounds1.x + bounds1.width < bounds2.x ||
    bounds2.x + bounds2.width < bounds1.x ||
    bounds1.y + bounds1.height < bounds2.y ||
    bounds2.y + bounds2.height < bounds1.y
  );
}

/**
 * Clamp point to stay within bounds
 */
export function clampPointToBounds(point: Point, bounds: Bounds): Point {
  return {
    x: Math.max(bounds.x, Math.min(bounds.x + bounds.width, point.x)),
    y: Math.max(bounds.y, Math.min(bounds.y + bounds.height, point.y))
  };
}