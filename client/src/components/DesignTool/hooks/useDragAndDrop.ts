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
import { chooseDropForNewElement, getCandidateContainerIds } from '../../../dnd/chooseDropForNew';
import { createComponentMeta } from '../../../dnd/resolveDrop';
import { calculateHitZone } from '../../../utils/hitZoneGeometry';
import { createDefaultElement } from '../../../utils/canvas';

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
    
    // Check if this is a toolbar element being dragged
    const dragData = e.dataTransfer.types.includes('application/json');
    if (dragData) {
      e.dataTransfer.dropEffect = 'copy'; // For toolbar elements
    } else {
      e.dataTransfer.dropEffect = 'move'; // For existing elements
    }
    
    // Handle visual feedback for both existing element reordering and toolbar drops
    const shouldShowDropZones = isDraggingForReorder || dragData;
    
    if (shouldShowDropZones) {
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
            element.type === 'container' || element.type === 'section' || 
            element.isContainer === true
          );
          
          if (hitZone.zone) {
            setInsertionIndicator({
              elementId: elementId,
              position: hitZone.zone,
              referenceElementId: elementId,
              insertPosition: hitZone.zone,
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

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    // Ensure all drag states are cleaned up on drag end
    setInsertionIndicator(null);
    dispatch(setHoveredElement({ elementId: null, zone: null }));
    dispatch(setDraggingForReorder(false));
    dispatch(setDraggedElement(undefined));
  }, [dispatch]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    try {
      // Check if this is a toolbar element being dropped
      const dragDataString = e.dataTransfer.getData('application/json');
      if (dragDataString) {
        const dragData = JSON.parse(dragDataString);
        
        if (dragData.type === 'toolbar-element') {
          // Create new element from toolbar
          const newElement = createDefaultElement(dragData.elementType);
          
          // Add to root for now (could be enhanced to use insertion indicator later)
          dispatch(addElement({
            element: newElement,
            parentId: 'root',
            insertPosition: 'inside'
          }));
          
          // Select the newly created element
          dispatch(selectElement(newElement.id));
          
          console.log('Created new element from toolbar:', newElement.id);
        }
      } else if (isDraggingForReorder && draggedElementId && insertionIndicator) {
        // Handle existing element reordering
        let newParentId = 'root';
        let insertPosition = insertionIndicator.insertPosition || 'inside';
        let referenceElementId = insertionIndicator.referenceElementId;
        
        // For before/after positions, we need the parent of the reference element
        if (insertPosition === 'before' || insertPosition === 'after') {
          const referenceElement = currentElements[referenceElementId!];
          if (referenceElement) {
            // Find the parent by checking which element contains this one as a child
            const parent = Object.values(currentElements).find(el => 
              el.children && el.children.includes(referenceElementId!)
            );
            newParentId = parent?.id || 'root';
          }
        } else if (insertPosition === 'inside') {
          // For inside position, the reference element becomes the parent
          newParentId = referenceElementId || 'root';
        }
        
        dispatch(reorderElement({
          elementId: draggedElementId,
          newParentId,
          insertPosition,
          referenceElementId
        }));
      }
    } catch (error) {
      console.error('Error processing drop:', error);
    }
    
    // Reset all drag states
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
    setInsertionIndicator
  };
};