import { useState, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { CanvasElement } from '../../../types/canvas';
import { selectCurrentElements } from '../../../store/selectors';
import { addElement, moveElement, selectElement } from '../../../store/canvasSlice';
import { createDefaultElement } from '../../../utils/canvas';

// Constants for drop zones
export const DROP_ZONES = {
  BEFORE: 'BEFORE',
  INSIDE: 'INSIDE', 
  AFTER: 'AFTER'
} as const;

// Threshold percentages for drop zones
const ZONE_THRESHOLDS = {
  TOP: 0.25,    // Top 25% = before
  BOTTOM: 0.75  // Bottom 25% = after
  // Middle 50% = inside (for valid containers)
};

// Valid container elements
const VALID_CONTAINERS = new Set(['rectangle', 'container', 'section', 'nav', 'header', 'footer', 'article']);

export type DragState = {
  draggedElement: CanvasElement | null;
  draggedToolbarItem: string | null;
  dropTarget: string | null;
  dropZone: keyof typeof DROP_ZONES | null;
};

/**
 * Comprehensive drag-and-drop system adapted from the reference implementation
 * Handles both element reordering and toolbar element creation
 */
export const useDragAndDropV2 = () => {
  const dispatch = useDispatch();
  const currentElements = useSelector(selectCurrentElements);
  
  const [dragState, setDragState] = useState<DragState>({
    draggedElement: null,
    draggedToolbarItem: null,
    dropTarget: null,
    dropZone: null
  });

  // Check if element is ancestor of another (prevents invalid drops)
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

  // Calculate drop zone based on mouse position
  const calculateDropZone = useCallback((e: React.DragEvent, targetElementId: string) => {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const relativeY = y / rect.height;
    
    const element = currentElements[targetElementId];
    const isContainer = element && (VALID_CONTAINERS.has(element.type) || element.isContainer);
    
    if (relativeY < ZONE_THRESHOLDS.TOP) {
      return DROP_ZONES.BEFORE;
    } else if (relativeY > ZONE_THRESHOLDS.BOTTOM) {
      return DROP_ZONES.AFTER;
    } else if (isContainer) {
      return DROP_ZONES.INSIDE;
    } else {
      // For non-containers, prefer before/after based on which half
      return relativeY < 0.5 ? DROP_ZONES.BEFORE : DROP_ZONES.AFTER;
    }
  }, [currentElements]);

  // Handle drag start for existing elements
  const handleElementDragStart = useCallback((e: React.DragEvent, elementId: string) => {
    e.stopPropagation();
    const element = currentElements[elementId];
    if (!element) return;
    
    setDragState(prev => ({
      ...prev,
      draggedElement: element,
      draggedToolbarItem: null
    }));
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', (e.target as HTMLElement).innerHTML);
  }, [currentElements]);

  // Handle drag start for toolbar items
  const handleToolbarDragStart = useCallback((e: React.DragEvent, toolType: string) => {
    setDragState(prev => ({
      ...prev,
      draggedElement: null,
      draggedToolbarItem: toolType
    }));
    
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  // Handle drag end - clear all states
  const handleDragEnd = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragState({
      draggedElement: null,
      draggedToolbarItem: null,
      dropTarget: null,
      dropZone: null
    });
  }, []);

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent, targetElementId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!dragState.draggedElement && !dragState.draggedToolbarItem) return;
    
    const draggedId = dragState.draggedElement?.id;
    
    // Check if trying to drop on itself
    if (draggedId === targetElementId) {
      setDragState(prev => ({ ...prev, dropTarget: null, dropZone: null }));
      return;
    }
    
    // Check if trying to drop an element into its own descendant
    if (draggedId && isAncestor(draggedId, targetElementId)) {
      setDragState(prev => ({ ...prev, dropTarget: null, dropZone: null }));
      return;
    }
    
    const zone = calculateDropZone(e, targetElementId);
    setDragState(prev => ({
      ...prev,
      dropTarget: targetElementId,
      dropZone: zone
    }));
  }, [dragState.draggedElement, dragState.draggedToolbarItem, isAncestor, calculateDropZone]);

  // Handle drag leave
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if ((e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) return;
    setDragState(prev => ({ ...prev, dropTarget: null, dropZone: null }));
  }, []);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent, targetElementId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!dragState.dropTarget || !dragState.dropZone) {
      setDragState({
        draggedElement: null,
        draggedToolbarItem: null,
        dropTarget: null,
        dropZone: null
      });
      return;
    }
    
    if (dragState.draggedElement) {
      // Moving existing element
      console.log('Moving element:', dragState.draggedElement.id, 'to:', targetElementId, 'position:', dragState.dropZone);
      
      dispatch(moveElement({
        id: dragState.draggedElement.id,
        x: 0, y: 0 // Position will be calculated by the reducer based on target
      }));
      
    } else if (dragState.draggedToolbarItem) {
      // Adding new element from toolbar
      console.log('Adding new element:', dragState.draggedToolbarItem, 'to:', targetElementId, 'position:', dragState.dropZone);
      
      const newElement = createDefaultElement(dragState.draggedToolbarItem as any);
      
      dispatch(addElement({
        element: newElement,
        parentId: dragState.dropZone === DROP_ZONES.INSIDE ? targetElementId : currentElements[targetElementId]?.parent || 'root',
        insertPosition: dragState.dropZone === DROP_ZONES.BEFORE ? 'before' : 
                       dragState.dropZone === DROP_ZONES.AFTER ? 'after' : 'inside',
        referenceElementId: dragState.dropZone !== DROP_ZONES.INSIDE ? targetElementId : undefined
      }));
      
      // Select the newly created element
      dispatch(selectElement(newElement.id));
    }
    
    // Clear all drag states
    setDragState({
      draggedElement: null,
      draggedToolbarItem: null,
      dropTarget: null,
      dropZone: null
    });
  }, [dragState, dispatch, currentElements]);

  // Get CSS classes for drop feedback
  const getDropClasses = useCallback((elementId: string): string => {
    const isDropTarget = dragState.dropTarget === elementId;
    const isDraggedElement = dragState.draggedElement?.id === elementId;
    const isInvalidTarget = dragState.draggedElement && isAncestor(dragState.draggedElement.id, elementId);
    
    let classes = '';
    
    if (isDraggedElement) classes += ' dragging';
    if (isInvalidTarget) classes += ' invalid-target';
    
    if (isDropTarget && !isInvalidTarget) {
      if (dragState.dropZone === 'BEFORE') classes += ' drop-before';
      else if (dragState.dropZone === 'AFTER') classes += ' drop-after';
      else if (dragState.dropZone === 'INSIDE') classes += ' drop-inside';
    }
    
    return classes.trim();
  }, [dragState, isAncestor]);

  return {
    dragState,
    handleElementDragStart,
    handleToolbarDragStart, 
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    getDropClasses
  };
};