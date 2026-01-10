import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { addElement, selectElement, updateElement } from '../../store/canvasSlice';
import { createDefaultElement } from '../../utils/canvas';
import { Tool, CanvasElement } from '../../types/canvas';
import { setElementUnitPreference } from '../../utils/unitPersistence';
import type { InsertionPoint } from './utils/insertionLogic';

interface CommitRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface CachedInsertionPoint {
  insertionPoint: InsertionPoint | null;
  indicatorBounds?: {
    x: number;
    y: number | string;
    width: number | string;
    height: number | string;
  } | null;
}

interface DrawingCommitterProps {
  currentElements: Record<string, CanvasElement>;
  zoomLevel: number;
  canvasRef: React.RefObject<HTMLDivElement>;
  currentBreakpointWidth: number;
  cachedInsertionPoint?: CachedInsertionPoint | null;
}

export const useDrawingCommitter = ({
  currentElements,
  zoomLevel,
  canvasRef,
  currentBreakpointWidth,
  cachedInsertionPoint
}: DrawingCommitterProps) => {
  const dispatch = useDispatch();

  const commitDrawnRect = useCallback(async (
    screenRect: CommitRect,
    tool: Tool,
    modifiers: { shift: boolean; alt: boolean },
    overrideCachedInsertionPoint?: CachedInsertionPoint | null
  ) => {
    if (!canvasRef.current) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();

    // Convert screen coordinates to canvas-relative coordinates
    const localRect = {
      left: (screenRect.left - canvasRect.left) / zoomLevel,
      top: (screenRect.top - canvasRect.top) / zoomLevel,
      width: screenRect.width / zoomLevel,
      height: screenRect.height / zoomLevel
    };

    // Use cached insertion point if available, otherwise fall back to hit-testing
    const cached = overrideCachedInsertionPoint || cachedInsertionPoint;
    let placement: {
      parentId: string;
      insertPosition: 'inside' | 'before' | 'after';
      referenceElementId?: string;
      localPosition?: { x: number; y: number };
    };

    if (cached?.insertionPoint) {
      // Use the cached insertion point from the preview system
      placement = {
        parentId: cached.insertionPoint.targetContainerId,
        insertPosition: cached.insertionPoint.insertPosition === 'canvas-start' ? 'before' :
                        cached.insertionPoint.insertPosition === 'canvas-end' ? 'after' :
                        cached.insertionPoint.insertPosition as 'inside' | 'before' | 'after',
        referenceElementId: cached.insertionPoint.referenceElementId,
        localPosition: undefined // Flow positioning, no absolute coords
      };
    } else {
      // Fall back to hit-testing (original behavior)
      const target = chooseTargetContainer(screenRect, currentElements);
      placement = computePlacement(target, localRect, currentElements);
    }

    // Create the element with appropriate properties
    const elementDef = createElementForTool(tool, localRect, placement, modifiers, currentBreakpointWidth);

    // Animate the morphing effect from overlay to final position
    // Pass indicator bounds if available for smoother animation target
    await animateMorphFromOverlayToFinal(
      screenRect,
      cached?.indicatorBounds,
      zoomLevel,
      canvasRect
    );

    // Insert the real element
    dispatch(addElement({
      element: elementDef,
      parentId: placement.parentId,
      insertPosition: placement.insertPosition,
      referenceElementId: placement.referenceElementId
    }));

    // Set element unit preferences for percentage width if applicable
    if (elementDef.widthUnit === '%') {
      setElementUnitPreference(elementDef.id, 'width', '%');
    }

    // Update canvas dimensions based on drawn rectangle
    updateCanvasDimensions(localRect, currentElements, dispatch, currentBreakpointWidth);

    dispatch(selectElement(elementDef.id));
  }, [currentElements, zoomLevel, canvasRef, dispatch, cachedInsertionPoint, currentBreakpointWidth]);

  return { commitDrawnRect };
};

// Hit-testing algorithm to find the best container
function chooseTargetContainer(
  screenRect: CommitRect, 
  currentElements: Record<string, CanvasElement>
): CanvasElement {
  // Use center point for hit-testing
  const centerX = screenRect.left + screenRect.width / 2;
  const centerY = screenRect.top + screenRect.height / 2;

  const elementsAtPoint = document.elementsFromPoint(centerX, centerY);
  
  // Filter to valid containers, prefer deepest
  for (const element of elementsAtPoint) {
    if (!(element instanceof HTMLElement)) continue;
    
    // Skip overlay elements and drawing indicators
    if (element.closest('[data-dnd-overlay="true"]')) continue;
    if (element.classList.contains('drawing-overlay')) continue;
    if (element.classList.contains('rubber-band')) continue;
    
    const elementId = element.dataset.elementId;
    if (!elementId || !currentElements[elementId]) continue;
    
    const canvasElement = currentElements[elementId];
    
    // Check if this element can accept children
    if (isValidDropTarget(canvasElement)) {
      return canvasElement;
    }
  }

  // Fallback to root
  return currentElements.root;
}

// Placement heuristics for different layout types
function computePlacement(
  target: CanvasElement,
  localRect: CommitRect,
  currentElements: Record<string, CanvasElement>
): {
  parentId: string;
  insertPosition: 'inside' | 'before' | 'after';
  referenceElementId?: string;
  localPosition?: { x: number; y: number };
} {
  // For root or absolute positioning containers
  if (target.id === 'root' || hasAbsolutePositioning(target)) {
    // Even for root, we should consider DOM ordering based on Y position
    const rootChildren = Object.values(currentElements).filter(
      el => el.parent === target.id
    );
    
    if (rootChildren.length > 0) {
      // Sort children by Y position to find insertion point
      const sortedChildren = rootChildren.sort((a, b) => (a.y || 0) - (b.y || 0));
      const drawnCenterY = localRect.top + localRect.height / 2;
      
      // Check if should be inserted before any existing child
      for (const child of sortedChildren) {
        const childY = child.y || 0;
        if (drawnCenterY < childY) {
          return {
            parentId: target.id,
            insertPosition: 'before',
            referenceElementId: child.id,
            localPosition: { x: localRect.left, y: localRect.top }
          };
        }
      }
      
      // Insert after the last child
      const lastChild = sortedChildren[sortedChildren.length - 1];
      return {
        parentId: target.id,
        insertPosition: 'after',
        referenceElementId: lastChild.id,
        localPosition: { x: localRect.left, y: localRect.top }
      };
    }
    
    // No children, just insert inside
    return {
      parentId: target.id,
      insertPosition: 'inside',
      localPosition: { x: localRect.left, y: localRect.top }
    };
  }

  // For flex/flow containers, compute insertion index
  const children = Object.values(currentElements).filter(
    el => el.parent === target.id
  );

  if (children.length === 0) {
    return {
      parentId: target.id,
      insertPosition: 'inside'
    };
  }

  // Find best insertion point based on overlap
  const bestMatch = findBestInsertionPoint(localRect, children, target);
  
  return bestMatch;
}

// Find the best insertion point in a flow container
function findBestInsertionPoint(
  drawnRect: CommitRect,
  siblings: CanvasElement[],
  container: CanvasElement
): {
  parentId: string;
  insertPosition: 'inside' | 'before' | 'after';
  referenceElementId?: string;
} {
  // Sort siblings by their visual position
  const sortedSiblings = siblings.sort((a, b) => {
    const aY = a.y || 0;
    const bY = b.y || 0;
    const aX = a.x || 0;
    const bX = b.x || 0;
    
    // Sort by Y first (row), then by X (column)
    if (Math.abs(aY - bY) > 10) return aY - bY;
    return aX - bX;
  });

  const drawnCenterY = drawnRect.top + drawnRect.height / 2;
  const drawnCenterX = drawnRect.left + drawnRect.width / 2;

  // Special check: if drawn rect is above ALL siblings, insert at the very beginning
  if (sortedSiblings.length > 0) {
    const firstSibling = sortedSiblings[0];
    const firstSiblingTop = firstSibling.y || 0;
    
    // If drawn rect center is above the first sibling's top, insert before it
    if (drawnCenterY < firstSiblingTop) {
      return {
        parentId: container.id,
        insertPosition: 'before',
        referenceElementId: firstSibling.id
      };
    }
  }

  // Check insertion position for each sibling
  for (let i = 0; i < sortedSiblings.length; i++) {
    const sibling = sortedSiblings[i];
    const siblingRect = {
      left: sibling.x || 0,
      top: sibling.y || 0,
      width: sibling.width || 100,
      height: sibling.height || 50
    };

    const overlapArea = calculateOverlapArea(drawnRect, siblingRect);
    const siblingArea = siblingRect.width * siblingRect.height;
    const overlapPercentage = overlapArea / siblingArea;

    // If significant overlap with a container, insert inside it (reduced threshold)
    if (overlapPercentage > 0.5 && isValidDropTarget(sibling)) {
      return {
        parentId: sibling.id,
        insertPosition: 'inside'
      };
    }

    // Check if drawn rect should be before this sibling (improved logic)
    const isAboveElement = drawnCenterY < siblingRect.top + (siblingRect.height * 0.3);
    const hasVerticalOverlap = drawnRect.top < siblingRect.top + siblingRect.height && 
                               drawnRect.top + drawnRect.height > siblingRect.top;
    
    if (isAboveElement || (!hasVerticalOverlap && drawnCenterY < siblingRect.top)) {
      return {
        parentId: container.id,
        insertPosition: 'before',
        referenceElementId: sibling.id
      };
    }

    // Check if should be after this element but before the next one
    const nextSibling = sortedSiblings[i + 1];
    if (nextSibling) {
      const nextRect = {
        top: nextSibling.y || 0,
        height: nextSibling.height || 50
      };
      
      const isBetweenElements = drawnCenterY > siblingRect.top + siblingRect.height &&
                               drawnCenterY < nextRect.top;
      
      if (isBetweenElements) {
        return {
          parentId: container.id,
          insertPosition: 'after',
          referenceElementId: sibling.id
        };
      }
    }
  }

  // Insert after the last sibling
  const lastSibling = sortedSiblings[sortedSiblings.length - 1];
  return {
    parentId: container.id,
    insertPosition: 'after',
    referenceElementId: lastSibling?.id
  };
}

// Create element definition based on tool and context
function createElementForTool(
  tool: Tool,
  localRect: CommitRect,
  placement: any,
  modifiers: { shift: boolean; alt: boolean },
  currentBreakpointWidth: number
): CanvasElement {
  // Only create elements for valid creation tools
  if (!['rectangle', 'text', 'image', 'container', 'heading', 'button', 'input', 'textarea', 'section', 'nav', 'header', 'footer', 'article'].includes(tool)) {
    tool = 'rectangle'; // Fallback to rectangle
  }
  
  // Create base element using existing utility
  const baseElement = createDefaultElement(tool as any);

  const drawnWidth = Math.round(localRect.width);
  const drawnHeight = Math.round(localRect.height);
  
  // Check if drawn width exceeds breakpoint for 100% width behavior
  const exceedsBreakpoint = (localRect.left + localRect.width + 20) > currentBreakpointWidth;

  // Add positioning if absolute
  if (placement.localPosition) {
    return {
      ...baseElement,
      x: placement.localPosition.x,
      y: placement.localPosition.y,
      width: exceedsBreakpoint ? 100 : drawnWidth,
      height: drawnHeight,
      widthUnit: exceedsBreakpoint ? '%' : 'px',
      heightUnit: 'px',
      // Override default styles with drawn dimensions
      styles: {
        ...baseElement.styles,
        width: exceedsBreakpoint ? '100%' : `${drawnWidth}px`,
        height: `${drawnHeight}px`,
      }
    };
  }

  // For flow elements, use 100% width if exceeds breakpoint
  return {
    ...baseElement,
    width: exceedsBreakpoint ? 100 : drawnWidth,
    height: drawnHeight,
    widthUnit: exceedsBreakpoint ? '%' : 'px',
    heightUnit: 'px',
    // Override default styles with drawn dimensions
    styles: {
      ...baseElement.styles,
      width: exceedsBreakpoint ? '100%' : (drawnWidth > 0 ? `${drawnWidth}px` : '100%'),
      height: `${drawnHeight}px`,
      minHeight: `${drawnHeight}px`,
    }
  };
}

// Animation system for morphing from overlay to final position
async function animateMorphFromOverlayToFinal(
  screenRect: CommitRect,
  indicatorBounds: CachedInsertionPoint['indicatorBounds'],
  zoomLevel: number,
  canvasRect: DOMRect
): Promise<void> {
  return new Promise((resolve) => {
    // Position animation ghost using viewport coordinates
    const ghost = document.createElement('div');
    ghost.className = 'fixed border-2 border-emerald-500 bg-emerald-500/20 pointer-events-none z-[1001]';
    ghost.style.left = `${screenRect.left}px`;
    ghost.style.top = `${screenRect.top}px`;
    ghost.style.width = `${screenRect.width}px`;
    ghost.style.height = `${screenRect.height}px`;
    ghost.style.transition = 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)';
    ghost.style.borderRadius = '4px';

    // Append to body with fixed positioning
    document.body.appendChild(ghost);

    // Animate toward the insertion point if we have indicator bounds
    requestAnimationFrame(() => {
      if (indicatorBounds && typeof indicatorBounds.y === 'number') {
        // Calculate target position based on indicator bounds
        const targetY = canvasRect.top + (indicatorBounds.y * zoomLevel);
        const targetX = canvasRect.left + ((typeof indicatorBounds.x === 'number' ? indicatorBounds.x : 0) * zoomLevel);

        // Animate toward the insertion indicator position
        ghost.style.left = `${targetX}px`;
        ghost.style.top = `${targetY}px`;
        ghost.style.height = '4px';
        ghost.style.opacity = '0.8';
        ghost.style.transform = 'scaleY(0.1)';

        setTimeout(() => {
          ghost.style.opacity = '0';
          ghost.style.transform = 'scaleY(0)';

          setTimeout(() => {
            if (ghost.parentNode) {
              ghost.parentNode.removeChild(ghost);
            }
            resolve();
          }, 100);
        }, 150);
      } else {
        // Fallback: simple fade out
        ghost.style.opacity = '0';
        ghost.style.transform = 'scale(0.95)';

        setTimeout(() => {
          if (ghost.parentNode) {
            ghost.parentNode.removeChild(ghost);
          }
          resolve();
        }, 200);
      }
    });
  });
}

// Helper functions
function isValidDropTarget(element: CanvasElement): boolean {
  return ['container', 'rectangle', 'section', 'nav', 'header', 'footer', 'article'].includes(element.type) 
    || element.id === 'root';
}

function hasAbsolutePositioning(element: CanvasElement): boolean {
  return element.classes?.includes('absolute') || element.id === 'root';
}

function calculateOverlapArea(rect1: CommitRect, rect2: CommitRect): number {
  const left = Math.max(rect1.left, rect2.left);
  const right = Math.min(rect1.left + rect1.width, rect2.left + rect2.width);
  const top = Math.max(rect1.top, rect2.top);
  const bottom = Math.min(rect1.top + rect1.height, rect2.top + rect2.height);

  if (left < right && top < bottom) {
    return (right - left) * (bottom - top);
  }
  return 0;
}

// Update canvas dimensions based on drawn rectangle
function updateCanvasDimensions(
  drawnRect: CommitRect,
  currentElements: Record<string, CanvasElement>,
  dispatch: any,
  currentBreakpointWidth: number
) {
  const rootElement = currentElements.root;
  if (!rootElement) return;

  const currentCanvasHeight = rootElement.height || 600;

  // Calculate required dimensions based on drawn rectangle
  const requiredWidth = Math.max(drawnRect.left + drawnRect.width + 20, 0); // Add 20px padding
  const requiredHeight = Math.max(drawnRect.top + drawnRect.height + 20, 0); // Add 20px padding

  let newWidth = currentBreakpointWidth; // Start with current breakpoint width
  let newHeight = currentCanvasHeight;
  let needsUpdate = false;

  // Height: apply right away from drawn rectangles
  if (requiredHeight > currentCanvasHeight) {
    newHeight = requiredHeight;
    needsUpdate = true;
  }

  // Width logic: compare against current breakpoint width
  if (requiredWidth <= currentBreakpointWidth) {
    // Rectangle fits within breakpoint - update to actual required width if smaller
    if (requiredWidth < currentBreakpointWidth) {
      newWidth = Math.max(requiredWidth, 200); // Minimum width of 200px
      needsUpdate = true;
    }
  } else {
    // Rectangle exceeds breakpoint width - ensure 100% width is set
    newWidth = currentBreakpointWidth;
    needsUpdate = true; // Force update to ensure 100% CSS is applied
  }

  // Apply updates if any dimension changed
  if (needsUpdate) {
    const updates: any = { height: newHeight };
    
    // For width, set CSS width appropriately
    if (newWidth === currentBreakpointWidth) {
      // Use 100% width when at breakpoint size
      updates.width = currentBreakpointWidth;
      updates.styles = {
        ...rootElement.styles,
        width: '100%'
      };
    } else {
      // Use specific pixel width when smaller
      updates.width = newWidth;
      updates.styles = {
        ...rootElement.styles,
        width: `${newWidth}px`
      };
    }
    
    dispatch(updateElement({
      id: 'root',
      updates
    }));
  }
}

export default useDrawingCommitter;