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
import { chooseDropForNewElement } from '../../../dnd/chooseDropForNew';
import { createComponentMeta } from '../../../dnd/resolveDrop';

/**
 * Hook for handling HTML5 drag and drop operations and visual feedback
 * Extracted from Canvas.tsx for better maintainability
 */
export const useDragAndDrop = (
  canvasRef: React.RefObject<HTMLDivElement>,
  getCandidateContainerIds: (point: { x: number; y: number }) => string[]
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
    
    // Check if this is a canvas element reorder by checking types
    if (e.dataTransfer.types.includes('application/json') && isDraggingForReorder && draggedElementId) {
      // Provide visual feedback during HTML5 drag operations
      const draggedElement = currentElements[draggedElementId];
      if (!draggedElement) return;
      
      // Calculate insertion point using DnD system
      const candidateIds = getCandidateContainerIds({ x: e.clientX, y: e.clientY });
      const draggedMeta = createComponentMeta(draggedElement);
      
      const getMeta = (id: string) => {
        const el = currentElements[id];
        return el ? createComponentMeta(el) : null;
      };
      
      const getParentId = (id: string) => currentElements[id]?.parent || 'root';
      const indexOf = (parentId: string, childId: string) => {
        const parent = currentElements[parentId];
        if (!parent?.children) return -1;
        return parent.children.indexOf(childId);
      };
      
      const getChildren = (parentId: string) => {
        if (parentId === "root") {
          return Object.values(currentElements)
            .filter(el => el.parent === "root" || !el.parent)
            .map(el => el.id);
        }
        const parent = currentElements[parentId];
        return parent?.children || [];
      };
      
      // Get drop location for visual feedback
      const drop = chooseDropForNewElement(
        { x: e.clientX, y: e.clientY },
        candidateIds,
        draggedMeta,
        getMeta,
        getParentId,
        indexOf,
        getChildren
      );
      
      if (drop) {
        // Convert drop location to insertion indicator
        if (drop.kind === "between" && typeof drop.index === "number") {
          const siblings = getChildren(drop.parentId);
          
          if (drop.index === 0 && siblings.length > 0) {
            // Inserting before first sibling
            const bounds = calculateInsertionBounds(siblings[0], 'before');
            if (bounds) {
              setInsertionIndicator({
                elementId: siblings[0],
                position: 'before',
                bounds
              });
            }
          } else if (drop.index >= siblings.length && siblings.length > 0) {
            // Inserting after last sibling
            const bounds = calculateInsertionBounds(siblings[siblings.length - 1], 'after');
            if (bounds) {
              setInsertionIndicator({
                elementId: siblings[siblings.length - 1],
                position: 'after',
                bounds
              });
            }
          } else if (siblings[drop.index]) {
            // Inserting before specific sibling
            const bounds = calculateInsertionBounds(siblings[drop.index], 'before');
            if (bounds) {
              setInsertionIndicator({
                elementId: siblings[drop.index],
                position: 'before',
                bounds
              });
            }
          }
        } else if (drop.kind === "into") {
          // Inserting inside container
          const bounds = calculateInsertionBounds(drop.parentId, 'inside');
          if (bounds) {
            setInsertionIndicator({
              elementId: drop.parentId,
              position: 'inside',
              bounds
            });
          }
        }
      }
    }
  }, [isDraggingForReorder, draggedElementId, currentElements, getCandidateContainerIds, calculateInsertionBounds]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear states if leaving the main canvas area
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setInsertionIndicator(null);
      dispatch(setHoveredElement({ elementId: null, zone: null }));
    }
  }, [dispatch]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    if (isDraggingForReorder && draggedElementId) {
      // Handle element reordering
      const candidateIds = getCandidateContainerIds({ x: e.clientX, y: e.clientY });
      const draggedElement = currentElements[draggedElementId];
      
      if (draggedElement) {
        const draggedMeta = createComponentMeta(draggedElement);
        
        // Use the same logic as dragOver for consistency
        const getMeta = (id: string) => {
          const el = currentElements[id];
          return el ? createComponentMeta(el) : null;
        };
        
        const getParentId = (id: string) => currentElements[id]?.parent || 'root';
        const indexOf = (parentId: string, childId: string) => {
          const parent = currentElements[parentId];
          if (!parent?.children) return -1;
          return parent.children.indexOf(childId);
        };
        
        const getChildren = (parentId: string) => {
          if (parentId === "root") {
            return Object.values(currentElements)
              .filter(el => el.parent === "root" || !el.parent)
              .map(el => el.id);
          }
          const parent = currentElements[parentId];
          return parent?.children || [];
        };
        
        const drop = chooseDropForNewElement(
          { x: e.clientX, y: e.clientY },
          candidateIds,
          draggedMeta,
          getMeta,
          getParentId,
          indexOf,
          getChildren
        );
        
        if (drop) {
          let insertPosition: 'before' | 'after' | 'inside' = 'inside';
          let referenceElementId: string | undefined;
          
          if (drop.kind === "between" && typeof drop.index === "number") {
            const siblings = getChildren(drop.parentId);
            
            if (drop.index === 0) {
              insertPosition = 'before';
              referenceElementId = siblings[0];
            } else if (drop.index >= siblings.length) {
              insertPosition = 'after';
              referenceElementId = siblings[siblings.length - 1];
            } else {
              insertPosition = 'before';
              referenceElementId = siblings[drop.index];
            }
          } else {
            insertPosition = 'inside';
          }
          
          // Perform the reordering using validated drop location
          dispatch(reorderElement({
            elementId: draggedElementId,
            newParentId: drop.parentId,
            insertPosition,
            referenceElementId
          }));
        } else {
          // Fallback to root insertion if no valid drop found
          dispatch(reorderElement({
            elementId: draggedElementId,
            newParentId: 'root',
            insertPosition: 'inside'
          }));
        }
      }
    }
    
    // Reset all drag states
    dispatch(setDraggingForReorder(false));
    dispatch(setDraggedElement(undefined));
    setInsertionIndicator(null);
    dispatch(setHoveredElement({ elementId: null, zone: null }));
    dispatch(resetUI());
  }, [isDraggingForReorder, draggedElementId, currentElements, getCandidateContainerIds, dispatch]);

  return {
    insertionIndicator,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    setInsertionIndicator
  };
};