import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { selectElement, addElement, moveElement, resizeElement, reorderElement, deleteElement } from '../../store/canvasSlice';
import { setDragging, setDragStart, setResizing, setResizeHandle, resetUI, setDraggedElement, setDraggingForReorder, setHoveredElement, setSelectedTool } from '../../store/uiSlice';
import { createDefaultElement, getElementAtPoint, calculateSnapPosition, isValidDropTarget } from '../../utils/canvas';
import { instantiateComponent } from '../../utils/componentGenerator';
import { selectCurrentElements, selectSelectedElementId, selectCanvasProject, selectCanvasUIState } from '../../store/selectors';
import CanvasElement from './CanvasElement';
import { Plus, Minus, Maximize } from 'lucide-react';

interface InsertionIndicator {
  position: 'before' | 'after' | 'inside' | 'between';
  elementId: string;
  bounds: { x: number; y: number; width: number; height: number };
  isEmpty?: boolean;
  insertAtBeginning?: boolean;
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
  const [isDraggingComponent, setIsDraggingComponent] = useState(false);
  const [dragThreshold, setDragThreshold] = useState({ x: 0, y: 0, exceeded: false });
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [expandedContainerId, setExpandedContainerId] = useState<string | null>(null);
  const project = useSelector(selectCanvasProject);
  const { selectedTool, isDragging, dragStart, isResizing, resizeHandle, zoomLevel, isGridVisible, draggedElementId, isDraggingForReorder, isDOMTreePanelVisible, isComponentPanelVisible } = useSelector(selectCanvasUIState);
  
  // Use centralized selectors for tab-based data
  const currentElements = useSelector(selectCurrentElements);
  const selectedElementId = useSelector(selectSelectedElementId);

  const rootElement = currentElements.root;
  

  const selectedElement = selectedElementId ? currentElements[selectedElementId] : null;

  // Function to detect insertion zones based on mouse position
  const detectInsertionZone = useCallback((x: number, y: number, forDrag = false, forComponentDrag = false): InsertionIndicator | null => {
    // Allow insertion zone detection for:
    // 1. Element creation with specific tools
    // 2. Element reordering with hand tool
    // 3. Component dragging from panel
    if (!forComponentDrag && !forDrag && !['rectangle', 'text', 'image', 'container', 'component', 'heading', 'list', 'button',
              'input', 'textarea', 'checkbox', 'radio', 'select',
              'section', 'nav', 'header', 'footer', 'article',
              'video', 'audio', 'link', 'code', 'divider'].includes(selectedTool)) {
      return null;
    }
    if (forDrag && selectedTool !== 'hand') {
      return null;
    }

    const hoveredElement = getElementAtPoint(x, y, currentElements, zoomLevel, draggedElementId);
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

    // SIMPLIFIED DETECTION LOGIC - More predictable zones
    const relativeY = y - elementY;
    
    // Larger tolerance zones for better UX
    const BEFORE_ZONE_HEIGHT = Math.max(20, elementHeight * 0.25); // Top 25% or minimum 20px
    const AFTER_ZONE_HEIGHT = Math.max(20, elementHeight * 0.25);  // Bottom 25% or minimum 20px
    
    // Check if element is a valid drop target (container)
    const isValidContainer = isValidDropTarget(hoveredElement);
    
    if (isValidContainer) {
      const children = hoveredElement.children || [];
      
      if (children.length > 0 && forDrag) {
        // For containers with children, detect insertion points between siblings
        const insertionPoint = detectSiblingInsertionPoint(x, y, hoveredElement.id, children);
        if (insertionPoint) {
          return insertionPoint;
        }
      }
      
      if (relativeY < BEFORE_ZONE_HEIGHT) {
        return {
          position: 'before',
          elementId: hoveredElement.id,
          bounds: { x: elementX - 4, y: elementY - 10, width: elementWidth + 8, height: 20 } // Large visible zone
        };
      } else if (relativeY > elementHeight - AFTER_ZONE_HEIGHT) {
        return {
          position: 'after',
          elementId: hoveredElement.id,
          bounds: { x: elementX - 4, y: elementY + elementHeight - 10, width: elementWidth + 8, height: 20 } // Large visible zone
        };
      } else {
        // Inside zone for containers
        if (children.length === 0) {
          return {
            position: 'inside',
            elementId: hoveredElement.id,
            bounds: { x: elementX + 2, y: elementY + 2, width: elementWidth - 4, height: elementHeight - 4 },
            isEmpty: true,
            insertAtBeginning: relativeY < elementHeight / 2
          };
        } else {
          return {
            position: 'inside',
            elementId: hoveredElement.id,
            bounds: { x: elementX + 2, y: elementY + 2, width: elementWidth - 4, height: elementHeight - 4 },
            isEmpty: false
          };
        }
      }
    } else {
      // For non-container elements - simplified zones
      if (relativeY < BEFORE_ZONE_HEIGHT) {
        return {
          position: 'before',
          elementId: hoveredElement.id,
          bounds: { x: elementX - 4, y: elementY - 10, width: elementWidth + 8, height: 20 } // Large visible zone
        };
      } else if (relativeY > elementHeight - AFTER_ZONE_HEIGHT) {
        return {
          position: 'after',
          elementId: hoveredElement.id,
          bounds: { x: elementX - 4, y: elementY + elementHeight - 10, width: elementWidth + 8, height: 20 } // Large visible zone
        };
      } else {
        // Middle zone - no insertion feedback for non-containers
        return null;
      }
    }
  }, [selectedTool, currentElements, zoomLevel, rootElement, draggedElementId]);

  // New function to detect insertion points between sibling elements
  const detectSiblingInsertionPoint = useCallback((x: number, y: number, containerId: string, childIds: string[]) => {
    const container = currentElements[containerId];
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
  }, [currentElements, zoomLevel, draggedElementId]);



  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    console.log('Canvas click triggered - selectedTool:', selectedTool);
    e.preventDefault();
    e.stopPropagation();
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = (e.clientX - rect.left) / zoomLevel;
    const y = (e.clientY - rect.top) / zoomLevel;
    
    if (selectedTool === 'select') {
      const clickedElement = getElementAtPoint(x, y, currentElements, zoomLevel);
      if (clickedElement) {
        dispatch(selectElement(clickedElement.id));
      } else {
        dispatch(selectElement('root'));
      }
    } else if (selectedTool === 'hand') {
      // Hand tool for selection and drag preparation
      const clickedElement = getElementAtPoint(x, y, currentElements, zoomLevel);
      if (clickedElement && clickedElement.id !== 'root') {
        dispatch(selectElement(clickedElement.id));
        // Don't start drag on click, only on mouse down
      } else {
        dispatch(selectElement('root'));
      }
    } else if (['rectangle', 'text', 'image', 'container', 'heading', 'list', 'button',
              'input', 'textarea', 'checkbox', 'radio', 'select',
              'section', 'nav', 'header', 'footer', 'article',
              'video', 'audio', 'link', 'code', 'divider'].includes(selectedTool)) {
      // Re-detect the insertion point at click time to ensure we have current hover state
      const clickedElement = getElementAtPoint(x, y, currentElements, zoomLevel);
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
      const targetElement = targetElementId ? currentElements[targetElementId] : null;
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
          const targetElement = currentElements[targetElementId];
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
        
        // Keep the current tool active so user can continue placing elements
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
        
        // Keep the current tool active so user can continue placing elements
      }
    } else {
      // Clicked on empty area (non-recipient) with creation tool - switch to selection tool
      const clickedElement = getElementAtPoint(x, y, currentElements, zoomLevel);
      
      // Only switch to select tool if clicking on truly empty area or non-recipient elements
      if (!clickedElement || clickedElement.id === 'root' || !isValidDropTarget(clickedElement)) {
        if (['rectangle', 'text', 'image', 'container', 'heading', 'list', 'button'].includes(selectedTool)) {
          console.log('TOOL SWITCH DEBUG - Switching to select tool (clicked non-recipient):', { clickedElement: clickedElement?.id, selectedTool });
          dispatch(setSelectedTool('select'));
          dispatch(selectElement('root'));
        }
      } else {
        // Clicked on recipient element (like rectangle/container) - stay in current tool mode for more creation
        console.log('TOOL SWITCH DEBUG - Staying in current tool (clicked recipient):', { clickedElement: clickedElement?.id, selectedTool, isValidDropTarget: isValidDropTarget(clickedElement) });
      }
    }
  }, [selectedTool, zoomLevel, currentElements, dispatch, hoveredElementId, hoveredZone]);

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
      const clickedElement = getElementAtPoint(x, y, currentElements, zoomLevel);
      if (clickedElement && clickedElement.id !== 'root') {
        console.log('DRAG DEBUG - Preparing drag for:', clickedElement.id);
        dispatch(selectElement(clickedElement.id));
        // Set up drag preparation but don't start dragging yet
        setDragStartPos({ x, y });
        setDragThreshold({ x, y, exceeded: false });
        dispatch(setDraggedElement(clickedElement.id));
        // Don't set dragging state yet - wait for threshold
      }
    }
  }, [selectedTool, selectedElement, zoomLevel, dispatch, currentElements]);

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
    } else if (draggedElementId) {
      // Handle drag threshold logic first
      if (!dragThreshold.exceeded) {
        const distance = Math.sqrt(
          Math.pow(x - dragThreshold.x, 2) + Math.pow(y - dragThreshold.y, 2)
        );
        
        const DRAG_THRESHOLD = 8; // pixels - require actual drag movement
        
        if (distance > DRAG_THRESHOLD) {
          console.log('DRAG DEBUG - Threshold exceeded, starting drag for:', draggedElementId);
          setDragThreshold(prev => ({ ...prev, exceeded: true }));
          dispatch(setDraggingForReorder(true));
          dispatch(setDragStart({ x: dragThreshold.x, y: dragThreshold.y }));
        } else {
          // Below threshold - no drag feedback yet
          return;
        }
      }
      
      // Element reordering (hand tool) - show precise insertion feedback
      console.log('DRAG DEBUG - Mouse move during reorder:', { 
        draggedElementId, 
        x, y, 
        thresholdExceeded: dragThreshold.exceeded
      });
      
      // Only show insertion feedback if we're actually dragging
      if (isDraggingForReorder) {
        // Detect more precise insertion zones during drag
        const insertionZone = detectInsertionZone(x, y, true);
      
      if (insertionZone) {
        console.log('DRAG DEBUG - Insertion zone detected:', insertionZone);
        
        const targetElement = currentElements[insertionZone.elementId];
        // Different validation logic based on insertion type
        let canDropHere = false;
        if ((insertionZone as any).position === 'inside' || (insertionZone as any).position === 'between') {
          // For inside/between positions, the target must be a container
          canDropHere = targetElement ? isValidDropTarget(targetElement) : false;
        } else {
          // For before/after positions (sibling insertion), check if the parent can accept children
          const parentId = targetElement?.parent || 'root';
          const parentElement = currentElements[parentId];
          canDropHere = parentElement ? isValidDropTarget(parentElement) : false;
        }
        
        console.log('DRAG DEBUG - Drop validation during move:', { 
          targetType: targetElement?.type, 
          targetId: targetElement?.id,
          canDropHere,
          position: (insertionZone as any).position,
          parentId: targetElement?.parent,
          parentType: currentElements[targetElement?.parent || 'root']?.type
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
        
        // Apply padding expansion for better targeting
        const hoveredContainerElement = currentElements[insertionZone.elementId];
        if (hoveredContainerElement && (hoveredContainerElement.isContainer || hoveredContainerElement.type === 'container' || hoveredContainerElement.type === 'rectangle')) {
          setExpandedContainerId(insertionZone.elementId);
        }
      } else {
        setHoveredElementId(null);
        setHoveredZone(null);
        dispatch(setHoveredElement({ elementId: null, zone: null }));
        setInsertionIndicator(null);
        setExpandedContainerId(null);
      }
      } // Close isDraggingForReorder check
    } else if (['rectangle', 'text', 'image', 'container', 'heading', 'list', 'button',
              'input', 'textarea', 'checkbox', 'radio', 'select',
              'section', 'nav', 'header', 'footer', 'article',
              'video', 'audio', 'link', 'code', 'divider'].includes(selectedTool)) {
      // Creation tool hover detection for insertion feedback
      console.log('Mouse move triggered, selectedTool:', selectedTool);
      
      const hoveredElement = getElementAtPoint(x, y, currentElements, zoomLevel, draggedElementId);
      
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
  }, [isDragging, isDraggingForReorder, selectedElement, draggedElementId, dragStart, zoomLevel, dispatch, selectedTool, currentElements, dragThreshold]);

  const handleMouseUp = useCallback((e?: MouseEvent) => {
    console.log('DRAG DEBUG - Mouse up:', { isDraggingForReorder, draggedElementId, hoveredElementId, hoveredZone, insertionIndicator });
    
    if (isDraggingForReorder && draggedElementId && insertionIndicator) {
      const targetElement = currentElements[insertionIndicator.elementId];
      let canDropHere = false;
      
      // Different validation logic based on insertion type
      if ((insertionIndicator as any).position === 'inside' || (insertionIndicator as any).position === 'between') {
        // For inside/between positions, the target must be a container
        canDropHere = targetElement ? isValidDropTarget(targetElement) : false;
      } else {
        // For before/after positions (sibling insertion), check if the parent can accept children
        const parentId = targetElement?.parent || 'root';
        const parentElement = currentElements[parentId];
        canDropHere = parentElement ? isValidDropTarget(parentElement) : false;
      }
      
      console.log('DRAG DEBUG - Drop validation:', { 
        targetElement: targetElement?.type, 
        canDropHere, 
        insertionPosition: (insertionIndicator as any).position,
        parentId: targetElement?.parent,
        parentType: currentElements[targetElement?.parent || 'root']?.type
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
          const hoveredElement = currentElements[insertionIndicator.elementId];
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
    
    // Reset drag threshold and expanded container
    setDragThreshold({ x: 0, y: 0, exceeded: false });
    setExpandedContainerId(null);
  }, [dispatch, isDraggingForReorder, draggedElementId, hoveredElementId, hoveredZone, insertionIndicator, currentElements, dragThreshold, setDragThreshold]);

  // Handle drop events for components
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    
    // Check if we're dragging a component from the component panel
    try {
      const data = e.dataTransfer.types.includes('application/json');
      if (data) {
        setIsDraggingComponent(true);
        
        // Get mouse coordinates and detect insertion zones during component dragging
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const x = (e.clientX - rect.left) / zoomLevel;
          const y = (e.clientY - rect.top) / zoomLevel;
          
          // Use the same insertion zone detection as element reordering
          const insertionZone = detectInsertionZone(x, y, false, true); // false for forDrag, true for forComponentDrag
          
          if (insertionZone) {
            console.log('COMPONENT DRAG - Insertion zone detected:', insertionZone);
            
            const targetElement = currentElements[insertionZone.elementId];
            
            // Apply the same validation logic as element reordering
            let canDropHere = false;
            if ((insertionZone as any).position === 'inside' || (insertionZone as any).position === 'between') {
              // For inside/between positions, the target must be a container
              canDropHere = targetElement ? isValidDropTarget(targetElement) : false;
            } else {
              // For before/after positions (sibling insertion), check if the parent can accept children
              const parentId = targetElement?.parent || 'root';
              const parentElement = currentElements[parentId];
              canDropHere = parentElement ? isValidDropTarget(parentElement) : false;
            }
            
            console.log('COMPONENT DRAG - Drop validation:', { 
              targetType: targetElement?.type, 
              canDropHere, 
              insertionPosition: (insertionZone as any).position,
              parentId: targetElement?.parent,
              parentType: currentElements[targetElement?.parent || 'root']?.type
            });
            
            if (canDropHere) {
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
              // Clear visual feedback if invalid drop target
              setHoveredElementId(null);
              setHoveredZone(null);
              dispatch(setHoveredElement({ elementId: null, zone: null }));
              setInsertionIndicator(null);
            }
          } else {
            // Clear visual feedback if no insertion zone
            setHoveredElementId(null);
            setHoveredZone(null);
            dispatch(setHoveredElement({ elementId: null, zone: null }));
            setInsertionIndicator(null);
          }
        }
      }
    } catch (error) {
      // Silently handle drag data parsing errors
    }
  }, [zoomLevel, dispatch, currentElements]);

  // Handle drag leave to clear visual feedback when component drag leaves canvas
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the canvas container itself, not child elements
    if (e.target === canvasRef.current) {
      console.log('COMPONENT DRAG - Left canvas area');
      setIsDraggingComponent(false);
      setHoveredElementId(null);
      setHoveredZone(null);
      dispatch(setHoveredElement({ elementId: null, zone: null }));
      setInsertionIndicator(null);
    }
  }, [dispatch]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    // Clear component dragging state
    setIsDraggingComponent(false);
    
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
        
        // Use the same precise insertion zone detection as element reordering
        const insertionZone = detectInsertionZone(x, y, false, true); // false for forDrag, true for forComponentDrag
        
        let parentId = 'root';
        let insertPosition: 'before' | 'after' | 'inside' = 'inside';
        let referenceElementId: string | undefined;
        
        if (insertionZone) {
          const targetElement = currentElements[insertionZone.elementId];
          
          // Apply the same validation logic as element reordering
          let canDropHere = false;
          if ((insertionZone as any).position === 'inside' || (insertionZone as any).position === 'between') {
            // For inside/between positions, the target must be a container
            canDropHere = targetElement ? isValidDropTarget(targetElement) : false;
          } else {
            // For before/after positions (sibling insertion), check if the parent can accept children
            const targetParentId = targetElement?.parent || 'root';
            const parentElement = currentElements[targetParentId];
            canDropHere = parentElement ? isValidDropTarget(parentElement) : false;
          }
          
          console.log('Component drop validation:', { 
            targetElement: targetElement?.type, 
            canDropHere, 
            insertionPosition: (insertionZone as any).position,
            parentId: targetElement?.parent,
            parentType: currentElements[targetElement?.parent || 'root']?.type
          });
          
          if (canDropHere) {
            if ((insertionZone as any).position === 'inside') {
              parentId = insertionZone.elementId;
              // For empty containers, respect the spatial positioning
              if ((insertionZone as any).isEmpty && (insertionZone as any).insertAtBeginning) {
                insertPosition = 'inside'; // Will be first child
              } else {
                insertPosition = 'inside'; // Will be last child (default)
              }
            } else if ((insertionZone as any).position === 'between') {
              // Precise insertion between siblings
              parentId = insertionZone.elementId; // This is the container ID
              insertPosition = (insertionZone as any).insertPosition;
              referenceElementId = (insertionZone as any).referenceElementId;
            } else {
              // Handle before/after positions (sibling insertion)
              parentId = targetElement?.parent || 'root';
              insertPosition = (insertionZone as any).position;
              referenceElementId = insertionZone.elementId;
            }
            
            console.log('Component insertion targeting:', { parentId, insertPosition, referenceElementId });
          } else {
            console.log('Component drop rejected - invalid target, falling back to root');
          }
        } else {
          console.log('No insertion zone detected, using root as default');
        }
        
        // Instantiate the component at the drop position
        const { elements: newElements, rootElementId } = instantiateComponent(data.component, x, y);
        
        // Add the root element first with proper targeting
        const rootElement = newElements[rootElementId];
        if (rootElement) {
          
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
        
        console.log('Component dropped successfully:', data.component.name, 'at position:', insertPosition, 'in parent:', parentId);
      }
    } catch (error) {
      console.error('Error handling drop:', error);
    }
    
    // Always clear visual feedback after drop
    setHoveredElementId(null);
    setHoveredZone(null);
    dispatch(setHoveredElement({ elementId: null, zone: null }));
    setInsertionIndicator(null);
  }, [zoomLevel, dispatch, currentElements]);

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
      <main className={`absolute top-12 bottom-20 bg-gray-50 flex items-center justify-center ${
        isDOMTreePanelVisible 
          ? (isComponentPanelVisible ? 'left-80 right-[576px]' : 'left-80 right-80')
          : (isComponentPanelVisible ? 'left-16 right-[576px]' : 'left-16 right-80')
      }`}>
        <div className="text-gray-500">Loading canvas...</div>
      </main>
    );
  }

  return (
    <main 
      className={`absolute top-12 bottom-20 bg-gray-50 overflow-auto flex items-center justify-center ${
        isDOMTreePanelVisible 
          ? (isComponentPanelVisible ? 'left-80 right-[576px]' : 'left-80 right-80')
          : (isComponentPanelVisible ? 'left-16 right-[576px]' : 'left-16 right-80')
      }`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={handleDragLeave}
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
          const element = currentElements[childId];
          return element ? (
            <CanvasElement 
              key={element.id} 
              element={element}
              isSelected={element.id === selectedElementId}
              isHovered={element.id === hoveredElementId}
              hoveredZone={element.id === hoveredElementId ? hoveredZone : null}
              expandedContainerId={expandedContainerId}
            />
          ) : null;
        })}
        
        {/* LARGE, OBVIOUS DROP ZONES */}
        {insertionIndicator && (
          <div
            className="absolute pointer-events-none z-[60] transition-all duration-150"
            style={{
              left: insertionIndicator.bounds.x,
              top: insertionIndicator.bounds.y,
              width: insertionIndicator.bounds.width,
              height: insertionIndicator.bounds.height,
            }}
          >
            {/* BEFORE/AFTER ZONES - Large blue bars */}
            {((insertionIndicator as any).position === 'before' || (insertionIndicator as any).position === 'after') && (
              <div 
                className="w-full h-full rounded-lg animate-pulse"
                style={{
                  backgroundColor: 'rgba(59, 130, 246, 0.8)',
                  boxShadow: '0 0 20px rgba(59, 130, 246, 0.6), inset 0 2px 4px rgba(255, 255, 255, 0.3)',
                  border: '2px solid #3b82f6'
                }}
              >
                <div className="flex items-center justify-center h-full">
                  <div className="bg-white text-blue-600 text-sm font-bold px-4 py-2 rounded-lg shadow-lg border border-blue-300">
                    {(insertionIndicator as any).position === 'before' ? '⬆ DROP ABOVE ⬆' : '⬇ DROP BELOW ⬇'}
                  </div>
                </div>
                {/* Side indicators for extra visibility */}
                <div className="absolute -left-2 top-1/2 w-4 h-4 bg-blue-500 rounded-full transform -translate-y-2 border-2 border-white shadow-lg" />
                <div className="absolute -right-2 top-1/2 w-4 h-4 bg-blue-500 rounded-full transform -translate-y-2 border-2 border-white shadow-lg" />
              </div>
            )}

            {/* INSIDE EMPTY CONTAINER - Green highlight */}
            {(insertionIndicator as any).position === 'inside' && (insertionIndicator as any).isEmpty && (
              <div 
                className="w-full h-full rounded-lg border-4 border-dashed animate-pulse"
                style={{
                  backgroundColor: 'rgba(34, 197, 94, 0.15)',
                  borderColor: '#22c55e',
                  boxShadow: '0 0 20px rgba(34, 197, 94, 0.4)'
                }}
              >
                <div className="flex items-center justify-center h-full">
                  <div className="text-green-700 text-lg font-bold bg-white px-6 py-3 rounded-lg shadow-lg border-2 border-green-300">
                    📦 DROP INSIDE CONTAINER
                  </div>
                </div>
                <div 
                  className={`absolute w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-lg ${
                    (insertionIndicator as any).insertAtBeginning ? 'top-4 left-1/2 transform -translate-x-1/2' : 'bottom-4 left-1/2 transform -translate-x-1/2'
                  }`}
                />
              </div>
            )}

            {/* INSIDE NON-EMPTY CONTAINER - Purple highlight */}
            {(insertionIndicator as any).position === 'inside' && !(insertionIndicator as any).isEmpty && (
              <div 
                className="w-full h-full rounded-lg border-4 border-dashed animate-pulse"
                style={{
                  backgroundColor: 'rgba(168, 85, 247, 0.15)',
                  borderColor: '#a855f7',
                  boxShadow: '0 0 20px rgba(168, 85, 247, 0.4)'
                }}
              >
                <div className="flex items-center justify-center h-full">
                  <div className="text-purple-700 text-lg font-bold bg-white px-6 py-3 rounded-lg shadow-lg border-2 border-purple-300">
                    🎯 ADD TO CONTAINER
                  </div>
                </div>
              </div>
            )}

            {/* BETWEEN SIBLINGS - Special blue highlight */}
            {(insertionIndicator as any).position === 'between' && (
              <div 
                className="w-full h-full rounded-lg animate-pulse"
                style={{
                  backgroundColor: 'rgba(59, 130, 246, 0.9)',
                  boxShadow: '0 0 25px rgba(59, 130, 246, 0.8), inset 0 2px 4px rgba(255, 255, 255, 0.3)',
                  border: '3px solid #2563eb'
                }}
              >
                <div className="flex items-center justify-center h-full">
                  <div className="bg-white text-blue-600 text-sm font-bold px-4 py-2 rounded-lg shadow-lg border border-blue-300">
                    ↕ INSERT BETWEEN ELEMENTS ↕
                  </div>
                </div>
                <div className="absolute -left-3 top-1/2 w-6 h-6 bg-blue-500 rounded-full transform -translate-y-3 border-3 border-white shadow-lg" />
                <div className="absolute -right-3 top-1/2 w-6 h-6 bg-blue-500 rounded-full transform -translate-y-3 border-3 border-white shadow-lg" />
              </div>
            )}
          </div>
        )}

        {/* GHOST PREVIEW SYSTEM */}
        {isDraggingForReorder && draggedElementId && insertionIndicator && (
          (() => {
            const draggedElement = currentElements[draggedElementId];
            if (!draggedElement) return null;
            
            // Calculate ghost position based on insertion indicator
            let ghostX = insertionIndicator.bounds.x;
            let ghostY = insertionIndicator.bounds.y;
            
            if ((insertionIndicator as any).position === 'before') {
              ghostY += 25; // Position ghost below the drop zone
            } else if ((insertionIndicator as any).position === 'after') {
              ghostY -= 25; // Position ghost above the drop zone  
            } else if ((insertionIndicator as any).position === 'inside') {
              ghostX += 10;
              ghostY += 10;
            }
            
            return (
              <div
                className="absolute pointer-events-none z-[70] transition-all duration-200 ease-out"
                style={{
                  left: ghostX,
                  top: ghostY,
                  opacity: 0.6,
                  transform: 'scale(0.95)',
                  filter: 'blur(0.5px)',
                }}
              >
                <div 
                  className="border-4 border-dashed border-blue-400 rounded-lg bg-blue-50 shadow-xl"
                  style={{
                    width: draggedElement.width || 200,
                    height: draggedElement.height || 100,
                    minHeight: 40
                  }}
                >
                  <div className="flex items-center justify-center h-full text-blue-600 font-medium text-sm">
                    👻 {draggedElement.type.toUpperCase()}
                  </div>
                </div>
              </div>
            );
          })()
        )}

      </div>
    </main>
  );
};

export default Canvas;
