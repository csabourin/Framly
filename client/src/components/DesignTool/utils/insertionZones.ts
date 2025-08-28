/**
 * Insertion Zones Utilities (120 lines)
 * 
 * Responsibilities:
 * - Detect insertion zones between siblings
 * - Calculate insertion points and indicators
 * - Handle container and sibling insertion logic
 * - Zone detection with proper buffer zones
 */

interface InsertionZone {
  position: 'before' | 'after' | 'inside' | 'between';
  elementId: string;
  referenceElementId?: string | null;
  insertPosition?: 'before' | 'after' | 'inside';
  bounds: { x: number; y: number; width: number; height: number };
  spacingOffset?: number;
}

/**
 * Detect insertion point between sibling elements
 */
export const detectSiblingInsertionPoint = (
  x: number,
  y: number,
  containerId: string,
  childIds: string[],
  currentElements: Record<string, any>,
  draggedElementId?: string,
  zoomLevel: number = 1
): InsertionZone | null => {
  const container = currentElements[containerId];
  if (!container) return null;

  // Get container bounds
  const containerDiv = document.querySelector(`[data-element-id="${containerId}"]`) as HTMLElement;
  if (!containerDiv) return null;

  const containerRect = containerDiv.getBoundingClientRect();
  const canvasRect = document.querySelector('[data-canvas="true"]')?.getBoundingClientRect();
  if (!canvasRect) return null;

  const containerX = (containerRect.left - canvasRect.left) / zoomLevel;
  const containerY = (containerRect.top - canvasRect.top) / zoomLevel;
  const containerWidth = containerRect.width / zoomLevel;

  // Check each child element to find insertion points
  for (let i = 0; i < childIds.length; i++) {
    const childId = childIds[i];
    const child = currentElements[childId];
    if (!child || child.id === draggedElementId) continue;

    const childDiv = document.querySelector(`[data-element-id="${childId}"]`) as HTMLElement;
    if (!childDiv) continue;

    const childRect = childDiv.getBoundingClientRect();
    const childX = (childRect.left - canvasRect.left) / zoomLevel;
    const childY = (childRect.top - canvasRect.top) / zoomLevel;
    const childHeight = childRect.height / zoomLevel;
    const childBottom = childY + childHeight;

    // Enhanced insertion point detection with better spacing
    const nextChildId = childIds[i + 1];
    let insertionY: number;
    const insertionGap = 12; // Gap to show between siblings
    
    if (nextChildId) {
      const nextChild = currentElements[nextChildId];
      if (nextChild && nextChild.id !== draggedElementId) {
        const nextChildDiv = document.querySelector(`[data-element-id="${nextChildId}"]`) as HTMLElement;
        if (nextChildDiv) {
          const nextChildRect = nextChildDiv.getBoundingClientRect();
          const nextChildY = (nextChildRect.top - canvasRect.top) / zoomLevel;
          
          // Check if mouse is between current child and next child with expanded detection zone
          const gapStart = childBottom - 4; // Start detection slightly before child bottom
          const gapEnd = nextChildY + 4;     // End detection slightly after next child top
          
          if (y >= gapStart && y <= gapEnd) {
            insertionY = childBottom + (nextChildY - childBottom) / 2;
            
            return {
              position: 'between',
              elementId: containerId,
              referenceElementId: nextChildId,
              insertPosition: 'before',
              bounds: { x: containerX, y: insertionY - 2, width: containerWidth, height: 4 },
              spacingOffset: insertionGap  // For visual sibling spacing
            };
          }
        }
      }
    } else {
      // Check if mouse is after the last child (expanded zone)
      if (y >= childBottom - 4) {
        insertionY = childBottom + insertionGap;
        
        return {
          position: 'between',
          elementId: containerId,
          referenceElementId: null,
          insertPosition: 'inside',
          bounds: { x: containerX, y: insertionY - 2, width: containerWidth, height: 4 }
        };
      }
    }
    
    // Check if mouse is before the first child (expanded zone)
    if (i === 0 && y <= childY + 4) {
      insertionY = childY - insertionGap;
      
      return {
        position: 'between',
        elementId: containerId,
        referenceElementId: childId,
        insertPosition: 'before',
        bounds: { x: containerX, y: insertionY - 2, width: containerWidth, height: 4 },
        spacingOffset: insertionGap  // For visual sibling spacing
      };
    }
  }

  return null;
};

/**
 * Detect insertion zone for element (before, after, inside)
 */
export const detectInsertionZone = (
  x: number,
  y: number,
  elementId: string,
  elements: Record<string, any>,
  isContainer: boolean = false
): 'before' | 'after' | 'inside' | null => {
  const element = elements[elementId];
  if (!element) return null;

  const elementDiv = document.querySelector(`[data-element-id="${elementId}"]`) as HTMLElement;
  if (!elementDiv) return null;

  const rect = elementDiv.getBoundingClientRect();
  
  // Calculate relative position within element
  const relativeY = (y - rect.top) / rect.height;
  
  if (isContainer) {
    // Containers prefer 'inside' insertion
    if (relativeY < 0.2) return 'before';
    if (relativeY > 0.8) return 'after';
    return 'inside';
  } else {
    // Regular elements prefer 'before' and 'after'
    if (relativeY < 0.5) return 'before';
    return 'after';
  }
};

/**
 * Calculate bounds for insertion indicator
 */
export const calculateInsertionIndicatorBounds = (
  elementId: string,
  position: 'before' | 'after' | 'inside',
  elements: Record<string, any>
): { x: number; y: number; width: number; height: number } | null => {
  const elementDiv = document.querySelector(`[data-element-id="${elementId}"]`) as HTMLElement;
  if (!elementDiv) return null;

  const rect = elementDiv.getBoundingClientRect();
  const canvas = document.querySelector('[data-canvas="true"]');
  if (!canvas) return null;
  const canvasRect = canvas.getBoundingClientRect();

  const x = rect.left - canvasRect.left;
  const width = rect.width;

  switch (position) {
    case 'before':
      return { x, y: rect.top - canvasRect.top - 2, width, height: 4 };
    
    case 'after':
      return { x, y: rect.bottom - canvasRect.top - 2, width, height: 4 };
    
    case 'inside':
      return { 
        x: x + 4, 
        y: rect.top - canvasRect.top + 4, 
        width: width - 8, 
        height: rect.height - 8 
      };
    
    default:
      return null;
  }
};