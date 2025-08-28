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
import { reorderElement } from '../../../store/canvasSlice';
import { chooseDropForNewElement, getCandidateContainerIds } from '../../../dnd/chooseDropForNew';
import { createComponentMeta } from '../../../dnd/resolveDrop';
import { calculateHitZone } from '../../../utils/hitZoneGeometry';

/**
 * Hook for handling HTML5 drag and drop operations and visual feedback
 * Extracted from Canvas.tsx for better maintainability
 */
export const useDragAndDrop = (
  canvasRef: React.RefObject<HTMLDivElement>
) => {
  const dispatch = useDispatch();
  const isDraggingForReorder = useSelector(selectIsDraggingForReorder);
  const draggedElementId = useSelector(selectDraggedElementId);
  const currentElements = useSelector(selectCurrentElements);
  const zoomLevel = useSelector(selectZoomLevel);
  
  const [insertionIndicator, setInsertionIndicator] = useState<any>(null);

  // Helper function to calculate insertion indicator bounds
  const calculateInsertionBounds = useCallback((elementId: string, position: 'before' | 'after' | 'inside') => {
    const element = currentElements[elementId];
    if (!element) return null;

    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return null;

    // Base element bounds
    const elementX = element.x || 0;
    const elementY = element.y || 0;
    const elementWidth = element.width || 100;
    const elementHeight = element.height || 20;

    let bounds = {
      x: elementX,
      y: elementY,
      width: elementWidth,
      height: elementHeight
    };

    if (position === 'before') {
      // Line above element
      bounds = {
        x: elementX,
        y: elementY - 2,
        width: elementWidth,
        height: 4
      };
    } else if (position === 'after') {
      // Line below element
      bounds = {
        x: elementX,
        y: elementY + elementHeight - 2,
        width: elementWidth,
        height: 4
      };
    } else if (position === 'inside') {
      // Highlight entire element with padding
      bounds = {
        x: elementX,
        y: elementY,
        width: elementWidth,
        height: elementHeight
      };
    }

    return bounds;
  }, [currentElements]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (isDraggingForReorder && draggedElementId) {
      // Find element at mouse position for drag feedback
      const elementAtPoint = document.elementFromPoint(e.clientX, e.clientY);
      const elementId = elementAtPoint?.closest('[data-element-id]')?.getAttribute('data-element-id');
      
      if (elementId && elementId !== draggedElementId && currentElements[elementId]) {
        const element = currentElements[elementId];
        const elementRect = elementAtPoint?.getBoundingClientRect();
        
        if (elementRect) {
          const elementBounds = {
            x: elementRect.left,
            y: elementRect.top,
            width: elementRect.width,
            height: elementRect.height
          };
          
          const hitZone = calculateHitZone(
            e.clientX,
            e.clientY,
            elementBounds,
            element.type === 'container' || element.type === 'section'
          );
          
          if (hitZone.zone) {
            setInsertionIndicator({
              elementId: elementId,
              position: hitZone.zone,
              bounds: calculateInsertionBounds(elementId, hitZone.zone)
            });
          }
        }
      }
    }
  }, [isDraggingForReorder, draggedElementId, currentElements, calculateInsertionBounds]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear states if leaving the main canvas area
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setInsertionIndicator(null);
      dispatch(setHoveredElement({ elementId: null, zone: null }));
    }
  }, [dispatch]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    if (isDraggingForReorder && draggedElementId && insertionIndicator) {
      dispatch(reorderElement({
        elementId: draggedElementId,
        newParentId: insertionIndicator.referenceElementId || 'root',
        insertPosition: insertionIndicator.insertPosition || 'inside',
        referenceElementId: insertionIndicator.referenceElementId
      }));
    }
    
    // Reset all drag states
    dispatch(setDraggingForReorder(false));
    dispatch(setDraggedElement(undefined));
    setInsertionIndicator(null);
    dispatch(setHoveredElement({ elementId: null, zone: null }));
    dispatch(resetUI());
  }, [isDraggingForReorder, draggedElementId, insertionIndicator, dispatch]);

  return {
    insertionIndicator,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    setInsertionIndicator
  };
};