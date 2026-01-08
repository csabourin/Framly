import { useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectIsDraggingForReorder,
  selectDraggedElementId,
  selectCurrentElements,
  selectZoomLevel
} from '../../../store/selectors';
import {
  setDraggingForReorder,
  setDraggedElement,
  setHoveredElement,
  resetUI
} from '../../../store/uiSlice';
import { reorderElement, addElement, selectElement } from '../../../store/canvasSlice';
import { createDefaultElement } from '../../../utils/canvas';

// Drop Zone Constants
export const DROP_ZONES = {
  BEFORE: 'before',
  INSIDE: 'inside',
  AFTER: 'after',
  CANVAS_START: 'canvas_start',
  CANVAS_END: 'canvas_end'
} as const;

// Thresholds for drop zones
const ZONE_THRESHOLDS = {
  TOP: 0.35,    // Top 35% = before
  BOTTOM: 0.65  // Bottom 35% = after
};

// Valid container elements that can accept children
// Valid container elements that can accept children
const VALID_CONTAINERS = new Set([
  'rectangle', 'container', 'section', 'nav', 'header', 'footer', 'article',
  'main', 'aside', 'form', 'div'
]);

/**
 * Hook for handling HTML5 drag and drop operations and visual feedback
 * Enhanced with V2 logic for better drop zones and canvas padding support
 */
export const useDragAndDrop = (
  canvasRef: React.RefObject<HTMLDivElement>
) => {
  const dispatch = useDispatch();
  const isDraggingForReorder = useSelector(selectIsDraggingForReorder);
  const draggedElementId = useSelector(selectDraggedElementId);
  const currentElements = useSelector(selectCurrentElements);

  const [insertionIndicator, setInsertionIndicator] = useState<any>(null);

  // Helper to check if element is ancestor of another
  const isAncestor = useCallback((ancestorId: string, descendantId: string): boolean => {
    if (ancestorId === descendantId) return false;

    const findDescendant = (elementId: string): boolean => {
      const element = currentElements[elementId];
      if (!element?.children) return false;

      if (element.children.includes(descendantId)) return true;

      return element.children.some(childId => findDescendant(childId));
    };

    return findDescendant(ancestorId);
  }, [currentElements]);

  // Calculate insertion bounds for visual indicator
  const calculateInsertionBounds = useCallback((elementId: string, zone: string, isCanvasDrop: boolean = false) => {
    if (isCanvasDrop) {
      // Special bounds for canvas start/end
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return null;

      return {
        x: 0,
        y: zone === DROP_ZONES.CANVAS_START ? 0 : '100%',
        width: '100%',
        height: 4,
        isFixed: true // Indicator should be fixed relative to canvas content
      };
    }

    const element = currentElements[elementId];
    if (!element) return null;

    // We can't easily get DOM rects here without querying the DOM
    // So we rely on the component rendering the indicator to use the element's layout properties
    // OR we query the DOM element if it exists
    const domElement = document.getElementById(elementId);
    if (!domElement) return null;

    const rect = domElement.getBoundingClientRect();
    const canvasRect = canvasRef.current?.getBoundingClientRect();

    if (!canvasRect) return null;

    // Calculate relative coordinates
    const scale = 1; // Assuming zoom is handled by the parent

    // Bounds relative to the element itself
    let bounds = {
      x: rect.left - canvasRect.left + canvasRef.current!.scrollLeft,
      y: rect.top - canvasRect.top + canvasRef.current!.scrollTop,
      width: rect.width,
      height: rect.height
    };

    if (zone === DROP_ZONES.BEFORE) {
      bounds.y -= 2;
      bounds.height = 4;
    } else if (zone === DROP_ZONES.AFTER) {
      bounds.y += rect.height - 2;
      bounds.height = 4;
    }
    // Inside keeps full bounds

    return bounds;
  }, [currentElements, canvasRef]);

  const handleElementDragStart = useCallback((e: React.DragEvent, elementId: string) => {
    e.stopPropagation(); // Prevent parent elements from also starting a drag
    dispatch(setDraggingForReorder(true));
    dispatch(setDraggedElement(elementId));

    // For reordering, we use a simpler data type to distinguish from toolbar drops
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'canvas-element',
      elementId: elementId
    }));
    e.dataTransfer.effectAllowed = 'move';
  }, [dispatch]);

  const handleDragOver = useCallback((e: React.DragEvent<any>, providedTargetId?: string) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if this is a toolbar element or existing element
    const dragDataString = e.dataTransfer.types.includes('application/json');

    // If we're dragging for reorder, always allow it
    if (isDraggingForReorder) {
      e.dataTransfer.dropEffect = 'move';
    } else if (dragDataString) {
      // JSON data usually means toolbar element
      e.dataTransfer.dropEffect = 'copy';
    } else {
      return;
    }

    // Unified target identification via DOM bubbling
    const target = e.target as HTMLElement;
    const targetElement = target.closest('[data-element-id]') as HTMLElement;
    const targetId = providedTargetId || targetElement?.getAttribute('data-element-id');

    // Canvas Padding Handling (Root Insertion)
    if (!targetId || targetId === 'root') {
      // If dropping on background/root, check position relative to canvas content
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (canvasRect) {
        // If Y is in top 10% of canvas viewport -> Start
        // If Y is in bottom 10% or below content -> End
        const relativeY = e.clientY - canvasRect.top;
        const isTop = relativeY < 100; // Drop near top padding
        const isBottom = relativeY > (canvasRect.height - 100); // Drop near bottom

        if (isTop) {
          setInsertionIndicator({
            type: DROP_ZONES.CANVAS_START,
            bounds: calculateInsertionBounds('root', DROP_ZONES.CANVAS_START, true)
          });
          return;
        } else if (isBottom) {
          setInsertionIndicator({
            type: DROP_ZONES.CANVAS_END,
            bounds: calculateInsertionBounds('root', DROP_ZONES.CANVAS_END, true)
          });
          return;
        }
      }
    }

    if (!targetId || !currentElements[targetId]) {
      setInsertionIndicator(null);
      return;
    }

    // Prevent dropping on self or children
    if (draggedElementId) {
      if (targetId === draggedElementId || isAncestor(draggedElementId, targetId)) {
        setInsertionIndicator(null);
        return;
      }
    }

    // Zone Calculation
    const rect = targetElement.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const relativeY = y / rect.height;

    const element = currentElements[targetId];
    const isContainer = element && (VALID_CONTAINERS.has(element.type) || element.isContainer);

    let zone;
    if (relativeY < ZONE_THRESHOLDS.TOP) {
      zone = DROP_ZONES.BEFORE;
    } else if (relativeY > ZONE_THRESHOLDS.BOTTOM) {
      zone = DROP_ZONES.AFTER;
    } else if (isContainer) {
      zone = DROP_ZONES.INSIDE;
    } else {
      // Non-container mid-section: split precisely at midpoint
      zone = relativeY < 0.5 ? DROP_ZONES.BEFORE : DROP_ZONES.AFTER;
    }

    // Visual Updates
    setInsertionIndicator({
      elementId: targetId,
      position: zone,
      referenceElementId: targetId,
      insertPosition: zone === DROP_ZONES.BEFORE ? 'before' : zone === DROP_ZONES.AFTER ? 'after' : 'inside',
      bounds: calculateInsertionBounds(targetId, zone)
    });

    dispatch(setHoveredElement({ elementId: targetId, zone: zone as any }));

  }, [isDraggingForReorder, draggedElementId, currentElements, canvasRef, calculateInsertionBounds, isAncestor, dispatch]);

  const handleDragLeave = useCallback((e: React.DragEvent<any>) => {
    // Only clear if actually leaving the canvas area
    // Use a small timeout to avoid flickering when moving between elements
    const rect = e.currentTarget.getBoundingClientRect();
    const isOutside =
      e.clientX < rect.left ||
      e.clientX >= rect.right ||
      e.clientY < rect.top ||
      e.clientY >= rect.bottom;

    if (isOutside) {
      setInsertionIndicator(null);
      dispatch(setHoveredElement({ elementId: null, zone: null }));
    }
  }, [dispatch]);

  const handleDragEnd = useCallback((e: React.DragEvent<any>) => {
    setInsertionIndicator(null);
    dispatch(setHoveredElement({ elementId: null, zone: null }));
    dispatch(setDraggingForReorder(false));
    dispatch(setDraggedElement(undefined));
  }, [dispatch]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      // 1. Check for Drag Data
      const dragDataString = e.dataTransfer.getData('application/json');
      let dragData = null;
      if (dragDataString) {
        try {
          dragData = JSON.parse(dragDataString);
        } catch (err) {
          console.error('Failed to parse drag data:', err);
        }
      }

      // 2. Process Based on Drag Type
      // CASE A: NEW ELEMENT FROM TOOLBAR
      if (dragData?.type === 'toolbar-element') {
        const newElement = createDefaultElement(dragData.elementType);

        if (insertionIndicator?.type === DROP_ZONES.CANVAS_START) {
          dispatch(addElement({ element: newElement, parentId: 'root', insertPosition: 'canvas-start' }));
        } else if (insertionIndicator?.type === DROP_ZONES.CANVAS_END) {
          dispatch(addElement({ element: newElement, parentId: 'root', insertPosition: 'canvas-end' }));
        } else if (insertionIndicator?.elementId) {
          // Normal relative drop
          dispatch(addElement({
            element: newElement,
            parentId: insertionIndicator.position === DROP_ZONES.INSIDE
              ? insertionIndicator.elementId
              : currentElements[insertionIndicator.elementId]?.parent || 'root',
            insertPosition: insertionIndicator.insertPosition,
            referenceElementId: insertionIndicator.position !== DROP_ZONES.INSIDE ? insertionIndicator.elementId : undefined
          }));
        } else {
          // Fallback: Append to root
          dispatch(addElement({ element: newElement, parentId: 'root', insertPosition: 'inside' }));
        }

        dispatch(selectElement(newElement.id));
      }
      // CASE B: REORDERING EXISTING ELEMENT (FROM CANVAS OR TREE)
      else if (isDraggingForReorder && draggedElementId) {
        if (insertionIndicator?.type === DROP_ZONES.CANVAS_START) {
          dispatch(reorderElement({
            elementId: draggedElementId,
            newParentId: 'root',
            insertPosition: 'before',
            referenceElementId: currentElements['root'].children?.[0] // Insert before first child
          }));
        } else if (insertionIndicator?.type === DROP_ZONES.CANVAS_END) {
          dispatch(reorderElement({
            elementId: draggedElementId,
            newParentId: 'root',
            insertPosition: 'inside' // Inside root (append by default)
          }));
        } else if (insertionIndicator?.elementId) {
          let newParentId = 'root';
          let insertPosition = insertionIndicator.insertPosition;
          let referenceElementId = insertionIndicator.referenceElementId;

          if (insertPosition === 'before' || insertPosition === 'after') {
            newParentId = currentElements[insertionIndicator.elementId]?.parent || 'root';
          } else {
            newParentId = insertionIndicator.elementId;
          }

          dispatch(reorderElement({
            elementId: draggedElementId,
            newParentId,
            insertPosition,
            referenceElementId
          }));
        }
      }
    } catch (error) {
      console.error('Error processing drop:', error);
    }

    // Cleanup
    dispatch(setDraggingForReorder(false));
    dispatch(setDraggedElement(undefined));
    setInsertionIndicator(null);
    dispatch(setHoveredElement({ elementId: null, zone: null }));
    dispatch(resetUI());
  }, [isDraggingForReorder, draggedElementId, insertionIndicator, currentElements, dispatch]);

  return {
    insertionIndicator,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    handleElementDragStart,
    setInsertionIndicator
  };
};