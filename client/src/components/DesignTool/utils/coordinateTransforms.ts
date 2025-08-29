/**
 * Coordinate transformation utilities for canvas interactions
 * Extracted from Canvas.tsx for better separation of concerns
 */

export interface CanvasCoordinates {
  x: number;
  y: number;
}

export interface ClientCoordinates {
  clientX: number;
  clientY: number;
}

/**
 * Convert client coordinates (mouse/touch) to canvas coordinates
 */
export const clientToCanvasCoordinates = (
  clientX: number,
  clientY: number,
  canvasRef: React.RefObject<HTMLDivElement>,
  zoomLevel: number
): CanvasCoordinates => {
  const rect = canvasRef.current?.getBoundingClientRect();
  if (!rect) return { x: 0, y: 0 };
  
  return {
    x: (clientX - rect.left) / zoomLevel,
    y: (clientY - rect.top) / zoomLevel
  };
};

/**
 * Convert canvas coordinates to client coordinates
 */
export const canvasToClientCoordinates = (
  canvasX: number,
  canvasY: number,
  canvasRef: React.RefObject<HTMLDivElement>,
  zoomLevel: number
): ClientCoordinates => {
  const rect = canvasRef.current?.getBoundingClientRect();
  if (!rect) return { clientX: 0, clientY: 0 };
  
  return {
    clientX: canvasX * zoomLevel + rect.left,
    clientY: canvasY * zoomLevel + rect.top
  };
};

/**
 * Get canvas coordinates from a React mouse event
 */
export const getCanvasCoordinatesFromEvent = (
  event: React.MouseEvent | MouseEvent,
  canvasRef: React.RefObject<HTMLDivElement>,
  zoomLevel: number
): CanvasCoordinates => {
  return clientToCanvasCoordinates(
    event.clientX,
    event.clientY,
    canvasRef,
    zoomLevel
  );
};

/**
 * Calculate distance between two points
 */
export const calculateDistance = (
  point1: CanvasCoordinates,
  point2: CanvasCoordinates
): number => {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Snap coordinates to a grid
 */
export const snapToGrid = (
  coordinates: CanvasCoordinates,
  gridSize: number = 20
): CanvasCoordinates => {
  return {
    x: Math.round(coordinates.x / gridSize) * gridSize,
    y: Math.round(coordinates.y / gridSize) * gridSize
  };
};

/**
 * Check if a point is within a rectangular bounds
 */
export const isPointInBounds = (
  point: CanvasCoordinates,
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  }
): boolean => {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
};

/**
 * Constrain coordinates within bounds
 */
export const constrainToBounds = (
  coordinates: CanvasCoordinates,
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  }
): CanvasCoordinates => {
  return {
    x: Math.max(bounds.minX, Math.min(bounds.maxX, coordinates.x)),
    y: Math.max(bounds.minY, Math.min(bounds.maxY, coordinates.y))
  };
};