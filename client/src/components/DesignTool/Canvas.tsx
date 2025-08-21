import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { selectElement, addElement, moveElement, resizeElement, reorderElement, deleteElement } from '../../store/canvasSlice';
import { setDragging, setDragStart, setResizing, setResizeHandle, resetUI, setDraggedElement, setDraggingForReorder, setHoveredElement } from '../../store/uiSlice';
import { createDefaultElement, getElementAtPoint, calculateSnapPosition, isValidDropTarget } from '../../utils/canvas';
import { instantiateComponent } from '../../utils/componentGenerator';
import CanvasElement from './CanvasElement';
import { Plus, Minus, Maximize } from 'lucide-react';

interface InsertionIndicator {
  position: 'before' | 'after' | 'inside' | 'between';
  elementId: string;
  bounds: { x: number; y: number; width: number; height: number };
  isEmpty?: boolean;
  spacingOffset?: number;
  referenceElementId?: string | null;
  insertPosition?: 'before' | 'after' | 'inside';
}

const Canvas: React.FC = () => {
  const dispatch = useDispatch();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
  const [hoveredZone, setHoveredZone] = useState<'before' | 'after' | 'inside' | null>(null);
  const [insertionIndicator, setInsertionIndicator] = useState<any | null>(null);
  const { project } = useSelector((state: RootState) => state.canvas);
  const { selectedTool, isDragging, dragStart, isResizing, resizeHandle, zoomLevel, isGridVisible, draggedElementId, isDraggingForReorder, isDOMTreePanelVisible } = useSelector((state: RootState) => state.ui);

  const rootElement = project.elements.root;
  const selectedElement = project.selectedElementId ? project.elements[project.selectedElementId] : null;

  // Function to detect insertion zones based on mouse position
  const detectInsertionZone = useCallback((x: number, y: number, forDrag = false): InsertionIndicator | null => {
    if (!forDrag && !['rectangle', 'text', 'image', 'container', 'component', 'heading', 'list'].includes(selectedTool)) {
      return null;
    }
    if (forDrag && selectedTool !== 'hand') {
      return null;
    }

    const hoveredElement = getElementAtPoint(x, y, project.elements, zoomLevel, draggedElementId);
    console.log('detectInsertionZone - hoveredElement:', hoveredElement?.id);
    
    // Skip the dragged element itself during drag operations
    if (forDrag && draggedElementId && hoveredElement?.id === draggedElementId) {
      return null;
    }
    
    // Only show root insertion if no specific element found
    if (!hoveredElement) {
      return {
        position: 'inside',
        elementId: 'root',
        bounds: { x: 0, y: 0, width: rootElement.width, height: rootElement.height }
      };
    }

    // If we found root explicitly, only show if no other elements are at this point
    if (hoveredElement.id === 'root') {
      return {
        position: 'inside',
        elementId: 'root',
        bounds: { x: 0, y: 0, width: rootElement.width, height: rootElement.height }
      };
    }

    // Get element bounds from DOM
    const elementDiv = document.querySelector(`[data-element-id="${hoveredElement.id}"]`) as HTMLElement;
    if (!elementDiv) return null;

    const rect = elementDiv.getBoundingClientRect();
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return null;

    // Convert to canvas coordinates
    const elementX = (rect.left - canvasRect.left) / zoomLevel;
    const elementY = (rect.top - canvasRect.top) / zoomLevel;
    const elementWidth = rect.width / zoomLevel;
    const elementHeight = rect.height / zoomLevel;

    // Determine insertion zone based on mouse position relative to element
    const relativeY = y - elementY;
    
    // Check if element is a valid drop target (container)
    const isValidContainer = hoveredElement.isContainer || hoveredElement.type === 'container' || hoveredElement.type === 'rectangle';
    
    if (isValidContainer) {
      const children = hoveredElement.children || [];
      
      if (children.length > 0 && forDrag) {
        // For containers with children, detect insertion points between siblings
        const insertionPoint = detectSiblingInsertionPoint(x, y, hoveredElement.id, children);
        if (insertionPoint) {
          return insertionPoint;
        }
      }
      
      // Enhanced zone detection for containers
      const beforeZone = 15;  // Larger for better UX
      const afterZone = elementHeight - 15;
      
      if (relativeY < beforeZone) {
        return {
          position: 'before',
          elementId: hoveredElement.id,
          bounds: { x: elementX, y: elementY - 3, width: elementWidth, height: 6 }
        };
      } else if (relativeY > afterZone) {
        return {
          position: 'after',
          elementId: hoveredElement.id,
          bounds: { x: elementX, y: elementY + elementHeight - 3, width: elementWidth, height: 6 }
        };
      } else {
        // Inside zone for containers - enhanced visual feedback for empty containers
        return {
          position: 'inside',
          elementId: hoveredElement.id,
          bounds: { x: elementX + 2, y: elementY + 2, width: elementWidth - 4, height: elementHeight - 4 },
          isEmpty: children.length === 0
        };
      }
    } else {
      // For non-container elements (text, image, heading, list), show before/after as sibling insertion
      const beforeZone = elementHeight * 0.25;  // Top 25% for "before"
      const afterZone = elementHeight * 0.75;   // Bottom 25% for "after"
      
      if (relativeY < beforeZone) {
        return {
          position: 'before',
          elementId: hoveredElement.id,
          bounds: { x: elementX, y: elementY - 3, width: elementWidth, height: 6 }
        };
      } else if (relativeY > afterZone) {
        return {
          position: 'after',
          elementId: hoveredElement.id,
          bounds: { x: elementX, y: elementY + elementHeight - 3, width: elementWidth, height: 6 }
        };
      } else {
        // Middle zone - no insertion feedback for non-containers
        return null;
      }
    }
  }, [selectedTool, project.elements, zoomLevel, rootElement, draggedElementId]);

  // New function to detect insertion points between sibling elements
  const detectSiblingInsertionPoint = useCallback((x: number, y: number, containerId: string, childIds: string[]) => {
    const container = project.elements[containerId];
    if (!container) return null;

    // Get container bounds
    const containerDiv = document.querySelector(`[data-element-id="${containerId}"]`) as HTMLElement;
    if (!containerDiv) return null;

    const containerRect = containerDiv.getBoundingClientRect();
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return null;

    const containerX = (containerRect.left - canvasRect.left) / zoomLevel;
    const containerY = (containerRect.top - canvasRect.top) / zoomLevel;
    const containerWidth = containerRect.width / zoomLevel;

    // Check each child element to find insertion points
    for (let i = 0; i < childIds.length; i++) {
      const childId = childIds[i];
      const child = project.elements[childId];
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
        const nextChild = project.elements[nextChildId];
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
                position: 'between' as any,
                elementId: containerId,
                referenceElementId: nextChildId,
                insertPosition: 'before' as any,
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
            position: 'between' as any,
            elementId: containerId,
            referenceElementId: null,
            insertPosition: 'inside' as any,
            bounds: { x: containerX, y: insertionY - 2, width: containerWidth, height: 4 }
          };
        }
      }
      
      // Check if mouse is before the first child (expanded zone)
      if (i === 0 && y <= childY + 4) {
        insertionY = childY - insertionGap;
        
        return {
          position: 'between' as any,
          elementId: containerId,
          referenceElementId: childId,
          insertPosition: 'before' as any,
          bounds: { x: containerX, y: insertionY - 2, width: containerWidth, height: 4 },
          spacingOffset: insertionGap  // For visual sibling spacing
        };
      }
    }

    return null;
  }, [project.elements, zoomLevel, draggedElementId]);



  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    console.log('Canvas click triggered - selectedTool:', selectedTool);
    e.preventDefault();
    e.stopPropagation();
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = (e.clientX - rect.left) / zoomLevel;
    const y = (e.clientY - rect.top) / zoomLevel;
    
    if (selectedTool === 'select') {
      const clickedElement = getElementAtPoint(x, y, project.elements, zoomLevel);
      if (clickedElement) {
        dispatch(selectElement(clickedElement.id));
      } else {
        dispatch(selectElement('root'));
      }
    } else if (selectedTool === 'hand') {
      // Hand tool for selection and drag preparation
      const clickedElement = getElementAtPoint(x, y, project.elements, zoomLevel);
      if (clickedElement && clickedElement.id !== 'root') {
        dispatch(selectElement(clickedElement.id));
        // Don't start drag on click, only on mouse down
      } else {
        dispatch(selectElement('root'));
      }
    } else if (['rectangle', 'text', 'image', 'container', 'heading', 'list'].includes(selectedTool)) {
      // Re-detect the insertion point at click time to ensure we have current hover state
      const clickedElement = getElementAtPoint(x, y, project.elements, zoomLevel);
      let targetElementId = hoveredElementId;
      let targetZone = hoveredZone;
      
      console.log('CLICK DEBUG - hoveredElementId:', hoveredElementId, 'hoveredZone:', hoveredZone);
      console.log('CLICK DEBUG - clickedElement:', clickedElement?.id);
      
      // If hover state was lost, re-detect it
      if (!targetElementId && clickedElement) {
        targetElementId = clickedElement.id;
        targetZone = 'inside'; // Default to inside for direct clicks
        console.log('CLICK DEBUG - Using clicked element:', targetElementId);
      }
      
      // Validate the target element can accept new elements
      const targetElement = targetElementId ? project.elements[targetElementId] : null;
      const canInsertInTarget = targetElement ? isValidDropTarget(targetElement) : true;
      
      console.log('CLICK DEBUG - Final target:', targetElementId, 'zone:', targetZone, 'canInsert:', canInsertInTarget);
      
      if (targetElementId && targetZone && targetElementId !== 'root' && canInsertInTarget) {
        console.log('CLICK DEBUG - Creating element inside:', targetElementId);
        
        const newElement = createDefaultElement(selectedTool as any, 0, 0);
        
        if (targetZone === 'inside') {
          // Insert inside the target element
          console.log('CLICK DEBUG - Dispatching addElement with parentId:', targetElementId);
          dispatch(addElement({ 
            element: newElement, 
            parentId: targetElementId,
            insertPosition: 'inside'
          }));
        } else {
          // Insert before or after the target element (sibling)
          const targetElement = project.elements[targetElementId];
          const parentId = targetElement?.parent || 'root';
          
          console.log('CLICK DEBUG - Dispatching addElement as sibling, parentId:', parentId);
          dispatch(addElement({ 
            element: newElement, 
            parentId: parentId,
            insertPosition: targetZone,
            referenceElementId: targetElementId
          }));
        }
        
        setHoveredElementId(null);
        setHoveredZone(null);
        dispatch(selectElement(newElement.id));
      } else {
        // If no valid insertion point, create at root
        if (!canInsertInTarget) {
          console.log('CLICK DEBUG - Target cannot accept elements, creating at root instead');
        } else {
          console.log('CLICK DEBUG - Creating element at root, targetElementId was:', targetElementId);
        }
        const newElement = createDefaultElement(selectedTool as any, x, y);
        dispatch(addElement({ 
          element: newElement, 
          parentId: 'root',
          insertPosition: 'inside'
        }));
        dispatch(selectElement(newElement.id));
      }
    }
  }, [selectedTool, zoomLevel, project.elements, dispatch, hoveredElementId, hoveredZone]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = (e.clientX - rect.left) / zoomLevel;
    const y = (e.clientY - rect.top) / zoomLevel;
    
    console.log('DRAG DEBUG - Mouse down:', { selectedTool, selectedElementId: selectedElement?.id });
    
    if (selectedTool === 'select' && selectedElement) {
      dispatch(setDragStart({ x: x - selectedElement.x, y: y - selectedElement.y }));
      dispatch(setDragging(true));
    } else if (selectedTool === 'hand') {
      const clickedElement = getElementAtPoint(x, y, project.elements, zoomLevel);
      if (clickedElement && clickedElement.id !== 'root') {
        console.log('DRAG DEBUG - Starting reorder drag for:', clickedElement.id);
        dispatch(selectElement(clickedElement.id));
        dispatch(setDraggedElement(clickedElement.id));
        dispatch(setDraggingForReorder(true));
        dispatch(setDragStart({ x, y }));
      }
    }
  }, [selectedTool, selectedElement, zoomLevel, dispatch, project.elements]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = (e.clientX - rect.left) / zoomLevel;
    const y = (e.clientY - rect.top) / zoomLevel;
    
    if (isDragging && selectedElement && dragStart) {
      // Regular element dragging (select tool)
      const snappedPosition = calculateSnapPosition(x - dragStart.x, y - dragStart.y);
      
      dispatch(moveElement({
        id: selectedElement.id,
        x: snappedPosition.x,
        y: snappedPosition.y,
      }));
    } else if (isDraggingForReorder && draggedElementId) {
      // Element reordering (hand tool) - show precise insertion feedback
      console.log('DRAG DEBUG - Mouse move during reorder:', { 
        draggedElementId, 
        x, y
      });
      
      // Detect more precise insertion zones during drag
      const insertionZone = detectInsertionZone(x, y, true);
      
      if (insertionZone) {
        console.log('DRAG DEBUG - Insertion zone detected:', insertionZone);
        
        const targetElement = project.elements[insertionZone.elementId];
        // Different validation logic based on insertion type
        let canDropHere = false;
        if ((insertionZone as any).position === 'inside' || (insertionZone as any).position === 'between') {
          // For inside/between positions, the target must be a container
          canDropHere = targetElement ? isValidDropTarget(targetElement) : false;
        } else {
          // For before/after positions (sibling insertion), check if the parent can accept children
          const parentId = targetElement?.parent || 'root';
          const parentElement = project.elements[parentId];
          canDropHere = parentElement ? isValidDropTarget(parentElement) : false;
        }
        
        console.log('DRAG DEBUG - Drop validation during move:', { 
          targetType: targetElement?.type, 
          targetId: targetElement?.id,
          canDropHere,
          position: (insertionZone as any).position,
          parentId: targetElement?.parent,
          parentType: project.elements[targetElement?.parent || 'root']?.type
        });
        
        setHoveredElementId(insertionZone.elementId);
        setHoveredZone((insertionZone as any).position === 'between' ? 'inside' : (insertionZone as any).position);
        
        // Update Redux state for visual feedback 
        dispatch(setHoveredElement({ 
          elementId: insertionZone.elementId, 
          zone: (insertionZone as any).position === 'between' ? 'inside' : (insertionZone as any).position
        }));
        
        // Store the insertion indicator for visual feedback
        setInsertionIndicator(insertionZone);
      } else {
        setHoveredElementId(null);
        setHoveredZone(null);
        dispatch(setHoveredElement({ elementId: null, zone: null }));
        setInsertionIndicator(null);
      }
    } else if (['rectangle', 'text', 'image', 'container', 'heading', 'list'].includes(selectedTool)) {
      // Creation tool hover detection for insertion feedback
      console.log('Mouse move triggered, selectedTool:', selectedTool);
      
      const hoveredElement = getElementAtPoint(x, y, project.elements, zoomLevel, draggedElementId);
      
      if (!hoveredElement) {
        console.log('No element found at point');
        setHoveredElementId(null);
        setHoveredZone(null);
        return;
      }

      console.log('Mouse move - hoveredElement:', hoveredElement.id);
      setHoveredElementId(hoveredElement.id);
      
      // Also update Redux state for nested elements
      dispatch(setHoveredElement({ elementId: hoveredElement.id, zone: null }));

      // Determine insertion zone for non-root elements
      if (hoveredElement.id !== 'root' && (hoveredElement.isContainer || hoveredElement.type === 'container' || hoveredElement.type === 'rectangle')) {
        const elementDiv = document.querySelector(`[data-element-id="${hoveredElement.id}"]`) as HTMLElement;
        if (elementDiv) {
          const elementRect = elementDiv.getBoundingClientRect();
          const canvasRect = canvasRef.current?.getBoundingClientRect();
          if (!canvasRect) return;
          
          const elementX = (elementRect.left - canvasRect.left) / zoomLevel;
          const elementY = (elementRect.top - canvasRect.top) / zoomLevel;
          const elementHeight = elementRect.height / zoomLevel;
          
          const relativeY = y - elementY;
          const beforeZone = 8;
          const afterZone = elementHeight - 8;
          
          if (relativeY < beforeZone) {
            setHoveredZone('before');
            dispatch(setHoveredElement({ elementId: hoveredElement.id, zone: 'before' }));
            console.log('Hover zone: before');
          } else if (relativeY > afterZone) {
            setHoveredZone('after');
            dispatch(setHoveredElement({ elementId: hoveredElement.id, zone: 'after' }));
            console.log('Hover zone: after');
          } else {
            setHoveredZone('inside');
            dispatch(setHoveredElement({ elementId: hoveredElement.id, zone: 'inside' }));
            console.log('Hover zone: inside');
          }
        }
      } else {
        setHoveredZone('inside');
        dispatch(setHoveredElement({ elementId: hoveredElement.id, zone: 'inside' }));
        console.log('Hover zone: inside (default)');
      }
    } else {
      // Clear hover state for other tools
      setHoveredElementId(null);
      setHoveredZone(null);
      dispatch(setHoveredElement({ elementId: null, zone: null }));
    }
  }, [isDragging, isDraggingForReorder, selectedElement, draggedElementId, dragStart, zoomLevel, dispatch, selectedTool, project.elements]);

  const handleMouseUp = useCallback((e?: MouseEvent) => {
    console.log('DRAG DEBUG - Mouse up:', { isDraggingForReorder, draggedElementId, hoveredElementId, hoveredZone, insertionIndicator });
    
    if (isDraggingForReorder && draggedElementId && insertionIndicator) {
      const targetElement = project.elements[insertionIndicator.elementId];
      let canDropHere = false;
      
      // Different validation logic based on insertion type
      if ((insertionIndicator as any).position === 'inside' || (insertionIndicator as any).position === 'between') {
        // For inside/between positions, the target must be a container
        canDropHere = targetElement ? isValidDropTarget(targetElement) : false;
      } else {
        // For before/after positions (sibling insertion), check if the parent can accept children
        const parentId = targetElement?.parent || 'root';
        const parentElement = project.elements[parentId];
        canDropHere = parentElement ? isValidDropTarget(parentElement) : false;
      }
      
      console.log('DRAG DEBUG - Drop validation:', { 
        targetElement: targetElement?.type, 
        canDropHere, 
        insertionPosition: (insertionIndicator as any).position,
        parentId: targetElement?.parent,
        parentType: project.elements[targetElement?.parent || 'root']?.type
      });
      
      if (canDropHere) {
        // Complete the reorder operation only for valid targets
        if ((insertionIndicator as any).position === 'inside') {
          console.log('DRAG DEBUG - Reordering inside:', insertionIndicator.elementId);
          dispatch(reorderElement({
            elementId: draggedElementId,
            newParentId: insertionIndicator.elementId,
            insertPosition: 'inside'
          }));
        } else if ((insertionIndicator as any).position === 'between') {
          // Precise insertion between siblings using the container and reference element
          console.log('DRAG DEBUG - Reordering between siblings:', { 
            containerId: insertionIndicator.elementId,
            insertPosition: (insertionIndicator as any).insertPosition,
            referenceElementId: (insertionIndicator as any).referenceElementId
          });
          
          dispatch(reorderElement({
            elementId: draggedElementId,
            newParentId: insertionIndicator.elementId, // This is the container ID
            insertPosition: (insertionIndicator as any).insertPosition,
            referenceElementId: (insertionIndicator as any).referenceElementId
          }));
        } else {
          // Handle before/after positions (sibling insertion) - use the hovered element's parent
          const hoveredElement = project.elements[insertionIndicator.elementId];
          const parentId = hoveredElement?.parent || 'root';
          
          console.log('DRAG DEBUG - Reordering as sibling:', { 
            hoveredElementId: insertionIndicator.elementId,
            parentId, 
            position: (insertionIndicator as any).position 
          });
          
          dispatch(reorderElement({
            elementId: draggedElementId,
            newParentId: parentId,
            insertPosition: (insertionIndicator as any).position,
            referenceElementId: insertionIndicator.elementId
          }));
        }
      } else {
        console.log('DRAG DEBUG - Invalid drop target, canceling reorder');
      }
    }
    
    // Reset all drag states
    console.log('DRAG DEBUG - Resetting all drag states');
    dispatch(setDragging(false));
    dispatch(setResizing(false));
    dispatch(setDraggingForReorder(false));
    dispatch(setDraggedElement(undefined));
    setInsertionIndicator(null);
    setHoveredElementId(null);
    setHoveredZone(null);
    dispatch(setHoveredElement({ elementId: null, zone: null }));
    dispatch(resetUI());
  }, [dispatch, isDraggingForReorder, draggedElementId, hoveredElementId, hoveredZone, insertionIndicator, project.elements]);

  // Handle drop events for components
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      
      if (data.type === 'component' && data.component) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        
        // Calculate drop coordinates with validation
        const rawX = (e.clientX - rect.left) / zoomLevel;
        const rawY = (e.clientY - rect.top) / zoomLevel;
        
        // Ensure coordinates are finite numbers
        const x = isFinite(rawX) ? rawX : 50;
        const y = isFinite(rawY) ? rawY : 50;
        
        console.log('Component drop coordinates:', { x, y, rawX, rawY, zoomLevel });
        
        // Get target element from hover state or mouse position
        let targetElementId = hoveredElementId;
        let targetZone = hoveredZone;
        
        // If no hover state, try to detect element at drop position
        if (!targetElementId) {
          const elementAtPoint = getElementAtPoint(x, y, project.elements, zoomLevel, draggedElementId);
          targetElementId = elementAtPoint?.id || 'root';
          targetZone = 'inside'; // Default to inside when detected via coordinates
        }
        
        const targetElement = targetElementId ? project.elements[targetElementId] : null;
        
        console.log('Component drop targeting:', { targetElementId, targetZone, x, y });
        
        // Instantiate the component at the drop position
        const { elements: newElements, rootElementId } = instantiateComponent(data.component, x, y);
        
        // Add the root element first with proper targeting
        const rootElement = newElements[rootElementId];
        if (rootElement) {
          let parentId = 'root';
          let insertPosition: 'before' | 'after' | 'inside' = 'inside';
          let referenceElementId: string | undefined;
          
          // Use hover targeting for intelligent placement
          if (targetElement && targetElementId && targetElementId !== 'root') {
            if (targetZone === 'inside' && isValidDropTarget(targetElement)) {
              parentId = targetElementId;
              insertPosition = 'inside';
            } else if (targetZone === 'before' || targetZone === 'after') {
              parentId = targetElement.parent || 'root';
              insertPosition = targetZone;
              referenceElementId = targetElementId;
            }
          }
          
          // Add the root element with proper parent relationship
          dispatch(addElement({ 
            element: { ...rootElement, parent: parentId },
            parentId,
            insertPosition,
            referenceElementId
          }));
          
          // Add child elements (excluding the root which we already added)
          Object.values(newElements).forEach(element => {
            if (element.id !== rootElementId) {
              dispatch(addElement({ 
                element, 
                parentId: element.parent || rootElementId,
                insertPosition: 'inside'
              }));
            }
          });
        }
        
        // Select the root element
        dispatch(selectElement(rootElementId));
        
        console.log('Component dropped successfully:', data.component.name, 'in zone:', targetZone, 'of element:', targetElementId);
      }
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  }, [zoomLevel, dispatch, hoveredElementId, hoveredZone, project.elements]);

  const handleZoomIn = () => {
    // Zoom functionality would be implemented here
  };

  const handleZoomOut = () => {
    // Zoom functionality would be implemented here
  };

  const handleFitToScreen = () => {
    // Fit to screen functionality would be implemented here
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging || isDraggingForReorder) {
        console.log('DRAG DEBUG - Global mouse move triggered');
        
        // Create a synthetic React event for consistency
        const syntheticEvent = {
          clientX: e.clientX,
          clientY: e.clientY,
          preventDefault: () => {},
          stopPropagation: () => {}
        } as React.MouseEvent;
        
        handleMouseMove(syntheticEvent);
      }
    };

    const handleGlobalMouseUp = () => {
      if (isDragging || isResizing || isDraggingForReorder) {
        console.log('DRAG DEBUG - Global mouse up triggered');
        handleMouseUp();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger delete when user is typing in an input, textarea, or contenteditable element
      const target = e.target as HTMLElement;
      const isTextInput = target.tagName === 'INPUT' || 
                         target.tagName === 'TEXTAREA' || 
                         target.contentEditable === 'true' ||
                         target.isContentEditable;
      
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isTextInput) {
        if (selectedElement && selectedElement.id !== 'root') {
          e.preventDefault();
          dispatch(deleteElement(selectedElement.id));
          dispatch(selectElement('root'));
        }
      }
    };

    if (isDragging || isResizing || isDraggingForReorder) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    // Always listen for delete key
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDragging, isResizing, isDraggingForReorder, handleMouseMove, handleMouseUp, selectedElement, dispatch]);

  if (!rootElement) {
    return (
      <main className={`absolute top-12 bottom-8 bg-gray-50 flex items-center justify-center ${
        isDOMTreePanelVisible ? 'left-80 right-80' : 'left-16 right-80'
      }`}>
        <div className="text-gray-500">No canvas available</div>
      </main>
    );
  }

  return (
    <main 
      className={`absolute top-12 bottom-8 bg-gray-50 overflow-auto flex items-center justify-center ${
        isDOMTreePanelVisible ? 'left-80 right-[576px]' : 'left-16 right-[576px]'
      }`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      data-testid="canvas-main"
    >
      {/* Canvas Container */}
      <div 
        ref={canvasRef}
        className={`
          bg-white shadow-lg rounded-lg overflow-hidden relative cursor-crosshair
          ${isGridVisible ? 'canvas-grid' : ''}
        `}
        style={{ 
          width: rootElement.width, 
          minHeight: rootElement.height,
          transform: `scale(${zoomLevel})`,
        }}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          // Clear hover state when leaving canvas area, but not during drag operations
          if (!isDraggingForReorder && !isDragging) {
            setHoveredElementId(null);
            setHoveredZone(null);
            dispatch(setHoveredElement({ elementId: null, zone: null }));
          }
        }}
        data-testid="canvas-container"
      >
        {/* Render Canvas Elements */}
        {rootElement.children?.filter((childId, index, arr) => arr.indexOf(childId) === index).map(childId => {
          const element = project.elements[childId];
          return element ? (
            <CanvasElement 
              key={element.id} 
              element={element}
              isSelected={element.id === project.selectedElementId}
              isHovered={element.id === hoveredElementId}
              hoveredZone={element.id === hoveredElementId ? hoveredZone : null}
            />
          ) : null;
        })}
        
        {/* Enhanced Insertion Indicator */}
        {insertionIndicator && (
          <div
            className="absolute pointer-events-none z-[60]"
            style={{
              left: insertionIndicator.bounds.x,
              top: insertionIndicator.bounds.y,
              width: insertionIndicator.bounds.width,
              height: insertionIndicator.bounds.height,
              backgroundColor: 
                (insertionIndicator as any).position === 'inside' ? 
                  (insertionIndicator as any).isEmpty ? 'rgba(34, 197, 94, 0.15)' : 'rgba(168, 85, 247, 0.15)' :
                (insertionIndicator as any).position === 'between' ? '#3b82f6' :
                '#3b82f6',
              border: 
                (insertionIndicator as any).position === 'inside' ? 
                  (insertionIndicator as any).isEmpty ? '2px dashed #22c55e' : '2px dashed #a855f7' :
                'none',
              borderRadius: (insertionIndicator as any).position === 'inside' ? '6px' : '2px',
              boxShadow: 
                (insertionIndicator as any).position === 'between' ? '0 0 12px rgba(59, 130, 246, 0.8)' :
                (insertionIndicator as any).position === 'inside' && (insertionIndicator as any).isEmpty ? '0 0 8px rgba(34, 197, 94, 0.4)' :
                (insertionIndicator as any).position === 'inside' ? '0 0 8px rgba(168, 85, 247, 0.4)' :
                '0 0 12px rgba(59, 130, 246, 0.8)'
            }}
          >
            {/* Enhanced visual indicators */}
            {(insertionIndicator as any).position === 'between' && (
              <>
                <div 
                  className="absolute left-0 top-1/2 w-3 h-3 bg-blue-500 rounded-full transform -translate-x-1.5 -translate-y-1.5 border-2 border-white"
                  style={{ boxShadow: '0 0 6px rgba(59, 130, 246, 1)' }}
                />
                <div 
                  className="absolute right-0 top-1/2 w-3 h-3 bg-blue-500 rounded-full transform translate-x-1.5 -translate-y-1.5 border-2 border-white"
                  style={{ boxShadow: '0 0 6px rgba(59, 130, 246, 1)' }}
                />
                {/* Center indicator for better visibility */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-white rounded-full" />
              </>
            )}
            
            {/* Empty container indicator */}
            {(insertionIndicator as any).position === 'inside' && (insertionIndicator as any).isEmpty && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-green-600 text-sm font-medium bg-white px-2 py-1 rounded shadow-sm">
                  Drop here
                </div>
              </div>
            )}
            
            {/* Regular insertion line indicators */}
            {((insertionIndicator as any).position === 'before' || (insertionIndicator as any).position === 'after') && (
              <>
                <div 
                  className="absolute left-0 top-1/2 w-3 h-3 bg-blue-500 rounded-full transform -translate-x-1.5 -translate-y-1.5 border-2 border-white"
                  style={{ boxShadow: '0 0 6px rgba(59, 130, 246, 1)' }}
                />
                <div 
                  className="absolute right-0 top-1/2 w-3 h-3 bg-blue-500 rounded-full transform translate-x-1.5 -translate-y-1.5 border-2 border-white"
                  style={{ boxShadow: '0 0 6px rgba(59, 130, 246, 1)' }}
                />
              </>
            )}
          </div>
        )}

      </div>
    </main>
  );
};

export default Canvas;
