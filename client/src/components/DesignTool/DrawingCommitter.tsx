import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { addElement, selectElement } from '../../store/canvasSlice';
import { createDefaultElement } from '../../utils/canvas';
import { Tool, CanvasElement } from '../../types/canvas';

interface CommitRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface DrawingCommitterProps {
  currentElements: Record<string, CanvasElement>;
  zoomLevel: number;
  canvasRef: React.RefObject<HTMLDivElement>;
}

export const useDrawingCommitter = ({ 
  currentElements, 
  zoomLevel, 
  canvasRef 
}: DrawingCommitterProps) => {
  const dispatch = useDispatch();

  const commitDrawnRect = useCallback(async (
    screenRect: CommitRect, 
    tool: Tool, 
    modifiers: { shift: boolean; alt: boolean }
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
    
    console.log('🎯 DrawingCommitter: Converting coordinates', { 
      screenRect, 
      canvasRect: { left: canvasRect.left, top: canvasRect.top },
      localRect,
      zoomLevel 
    });

    // Hit-test to find the best container
    const target = chooseTargetContainer(screenRect, currentElements);
    const placement = computePlacement(target, localRect, currentElements);

    // Create the element with appropriate properties
    const elementDef = createElementForTool(tool, localRect, placement, modifiers);

    // Animate the morphing effect from overlay to final position
    await animateMorphFromOverlayToFinal(
      screenRect, 
      target, 
      placement, 
      elementDef
    );

    // Insert the real element
    dispatch(addElement({
      element: elementDef,
      parentId: placement.parentId,
      insertPosition: placement.insertPosition,
      referenceElementId: placement.referenceElementId
    }));

    dispatch(selectElement(elementDef.id));
  }, [currentElements, zoomLevel, canvasRef, dispatch]);

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

  console.log('🎯 Hit-testing at screen coordinates:', { centerX, centerY });

  const elementsAtPoint = document.elementsFromPoint(centerX, centerY);
  console.log('🎯 Elements found at point:', elementsAtPoint.map(el => ({ 
    tag: el.tagName, 
    elementId: (el as HTMLElement).dataset?.elementId,
    classes: el.className 
  })));
  
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
    console.log('🎯 Checking element:', { id: elementId, type: canvasElement.type, isValidTarget: isValidDropTarget(canvasElement) });
    
    // Check if this element can accept children
    if (isValidDropTarget(canvasElement)) {
      console.log('🎯 Selected target container:', elementId, canvasElement.type);
      return canvasElement;
    }
  }

  console.log('🎯 Fallback to root container');
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

  // Check if rect overlaps significantly with any child
  for (const sibling of sortedSiblings) {
    const siblingRect = {
      left: sibling.x || 0,
      top: sibling.y || 0,
      width: sibling.width || 100,
      height: sibling.height || 50
    };

    const overlapArea = calculateOverlapArea(drawnRect, siblingRect);
    const siblingArea = siblingRect.width * siblingRect.height;
    const overlapPercentage = overlapArea / siblingArea;

    // If >70% overlap with a container, try to insert inside it
    if (overlapPercentage > 0.7 && isValidDropTarget(sibling)) {
      return {
        parentId: sibling.id,
        insertPosition: 'inside'
      };
    }

    // Check if drawn rect should be before this sibling
    if (drawnCenterY < siblingRect.top + siblingRect.height / 2) {
      return {
        parentId: container.id,
        insertPosition: 'before',
        referenceElementId: sibling.id
      };
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
  modifiers: { shift: boolean; alt: boolean }
): CanvasElement {
  // Only create elements for valid creation tools
  if (!['rectangle', 'text', 'image', 'container', 'heading', 'button', 'input', 'textarea', 'section', 'nav', 'header', 'footer', 'article'].includes(tool)) {
    tool = 'rectangle'; // Fallback to rectangle
  }
  
  // Create base element using existing utility
  const baseElement = createDefaultElement(tool as any);

  // Add positioning if absolute
  if (placement.localPosition) {
    return {
      ...baseElement,
      x: placement.localPosition.x,
      y: placement.localPosition.y,
      width: localRect.width,
      height: localRect.height
    };
  }

  // For flow elements, set appropriate size classes
  return {
    ...baseElement,
    width: localRect.width,
    height: localRect.height
  };
}

// Animation system for morphing from overlay to final position
async function animateMorphFromOverlayToFinal(
  screenRect: CommitRect,
  target: CanvasElement,
  placement: any,
  elementDef: CanvasElement
): Promise<void> {
  return new Promise((resolve) => {
    console.log('🎭 Animation starting with screen rect:', screenRect);
    
    // Position animation ghost using viewport coordinates
    const ghost = document.createElement('div');
    ghost.className = 'fixed border-2 border-blue-500 bg-blue-500/20 pointer-events-none z-[1001]';
    ghost.style.left = `${screenRect.left}px`;
    ghost.style.top = `${screenRect.top}px`;
    ghost.style.width = `${screenRect.width}px`;
    ghost.style.height = `${screenRect.height}px`;
    ghost.style.transition = 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)';
    
    console.log('🎭 Animation ghost positioned at:', { 
      left: screenRect.left, 
      top: screenRect.top,
      width: screenRect.width,
      height: screenRect.height
    });
    
    // Append to body with fixed positioning
    document.body.appendChild(ghost);

    // Animate the morphing effect
    requestAnimationFrame(() => {
      ghost.style.opacity = '0';
      ghost.style.transform = 'scale(0.95)';
      
      setTimeout(() => {
        if (ghost.parentNode) {
          ghost.parentNode.removeChild(ghost);
        }
        resolve();
      }, 250);
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

export default useDrawingCommitter;