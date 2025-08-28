/**
 * Canvas Geometry Utilities (80 lines)
 * 
 * Responsibilities:
 * - Content bounds calculation
 * - Coordinate transformations
 * - Hit testing and zone detection
 * - Canvas sizing and positioning
 */

interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ContentBounds {
  minY: number;
  maxY: number;
  width: number;
}

/**
 * Calculate actual content bounds to handle elements positioned outside initial canvas
 */
export const calculateContentBounds = (
  currentElements: Record<string, any>,
  rootElement: any,
  canvasWidth: number
): ContentBounds => {
  if (!currentElements || !rootElement) {
    return { minY: 0, maxY: rootElement?.height || 800, width: canvasWidth };
  }

  let minY = 0;
  let maxY = rootElement.height || 800;

  // Find bounds of all elements to expand canvas if needed
  Object.values(currentElements).forEach((element: any) => {
    if (element.id === 'root') return;
    
    const elementY = element.y || 0;
    const elementHeight = element.height || 40;
    const elementBottom = elementY + elementHeight;
    
    minY = Math.min(minY, elementY - 50);
    maxY = Math.max(maxY, elementBottom + 50);
  });

  return {
    minY,
    maxY: Math.max(maxY, 800), // Minimum canvas height
    width: canvasWidth
  };
};

/**
 * Convert screen coordinates to canvas coordinates
 */
export const screenToCanvas = (
  screenX: number,
  screenY: number,
  canvasRef: React.RefObject<HTMLDivElement>,
  zoomLevel: number
): { x: number; y: number } => {
  const rect = canvasRef.current?.getBoundingClientRect();
  if (!rect) return { x: 0, y: 0 };
  
  return {
    x: (screenX - rect.left) / zoomLevel,
    y: (screenY - rect.top) / zoomLevel
  };
};

/**
 * Convert canvas coordinates to screen coordinates
 */
export const canvasToScreen = (
  canvasX: number,
  canvasY: number,
  canvasRef: React.RefObject<HTMLDivElement>,
  zoomLevel: number
): { x: number; y: number } => {
  const rect = canvasRef.current?.getBoundingClientRect();
  if (!rect) return { x: 0, y: 0 };
  
  return {
    x: rect.left + canvasX * zoomLevel,
    y: rect.top + canvasY * zoomLevel
  };
};

/**
 * Check if a point is inside an element's bounds
 */
export const isPointInBounds = (
  x: number,
  y: number,
  bounds: ElementBounds
): boolean => {
  return x >= bounds.x && 
         x <= bounds.x + bounds.width && 
         y >= bounds.y && 
         y <= bounds.y + bounds.height;
};

/**
 * Calculate distance between two points
 */
export const calculateDistance = (
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number => {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

/**
 * Clamp a value between min and max
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};