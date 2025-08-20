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
  position: 'before' | 'after' | 'inside';
  elementId: string;
  bounds: { x: number; y: number; width: number; height: number };
}

const Canvas: React.FC = () => {
  const dispatch = useDispatch();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
  const [hoveredZone, setHoveredZone] = useState<'before' | 'after' | 'inside' | null>(null);
  const { project } = useSelector((state: RootState) => state.canvas);
  const { selectedTool, isDragging, dragStart, isResizing, resizeHandle, zoomLevel, isGridVisible, draggedElementId, isDraggingForReorder } = useSelector((state: RootState) => state.ui);

  const rootElement = project.elements.root;
  const selectedElement = project.selectedElementId ? project.elements[project.selectedElementId] : null;

  // Function to detect insertion zones based on mouse position
  const detectInsertionZone = useCallback((x: number, y: number, forDrag = false): InsertionIndicator | null => {
    if (!forDrag && !['rectangle', 'text', 'image', 'container', 'component'].includes(selectedTool)) {
      return null;
    }
    if (forDrag && selectedTool !== 'hand') {
      return null;
    }

    const hoveredElement = getElementAtPoint(x, y, project.elements, zoomLevel);
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
    const relativeX = x - elementX;
    
    // Make before/after zones much smaller to reduce flickering
    const beforeZone = 6;  // Only 6px at top edge
    const afterZone = elementHeight - 6;  // Only 6px at bottom edge

    // For containers and rectangles, strongly prioritize "inside" detection
    if (hoveredElement.isContainer || hoveredElement.type === 'container' || hoveredElement.type === 'rectangle') {
      // Only show before/after if very close to edges AND away from the center
      if (relativeY < beforeZone && relativeX > 15 && relativeX < elementWidth - 15) {
        return {
          position: 'before',
          elementId: hoveredElement.id,
          bounds: { x: elementX, y: elementY - 2, width: elementWidth, height: 4 }
        };
      } else if (relativeY > afterZone && relativeX > 15 && relativeX < elementWidth - 15) {
        return {
          position: 'after',
          elementId: hoveredElement.id,
          bounds: { x: elementX, y: elementY + elementHeight - 2, width: elementWidth, height: 4 }
        };
      } else {
        // Default to inside for containers - this is the main case
        return {
          position: 'inside',
          elementId: hoveredElement.id,
          bounds: { x: elementX, y: elementY, width: elementWidth, height: elementHeight }
        };
      }
    } else {
      // For non-container elements like text, use before/after more readily
      if (relativeY < beforeZone) {
        return {
          position: 'before',
          elementId: hoveredElement.id,
          bounds: { x: elementX, y: elementY - 2, width: elementWidth, height: 4 }
        };
      } else {
        return {
          position: 'after',
          elementId: hoveredElement.id,
          bounds: { x: elementX, y: elementY + elementHeight - 2, width: elementWidth, height: 4 }
        };
      }
    }
  }, [selectedTool, project.elements, zoomLevel, rootElement, draggedElementId]);



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
    } else if (['rectangle', 'text', 'image', 'container', 'component'].includes(selectedTool)) {
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
      
      if (selectedTool === 'component') {
        // Handle component tool - show user guidance
        alert('Component Tool: Drag and drop components from the Component Panel on the right, or select an element and click "Create Component" to make your own reusable components.');
        return;
      }
      
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
      // Element reordering (hand tool) - show hover feedback
      const hoveredElement = getElementAtPoint(x, y, project.elements, zoomLevel);
      
      console.log('DRAG DEBUG - Mouse move during reorder:', { 
        draggedElementId, 
        hoveredElement: hoveredElement?.id,
        hoveredElementType: hoveredElement?.type 
      });
      
      if (hoveredElement && hoveredElement.id !== draggedElementId) {
        const canDropHere = isValidDropTarget(hoveredElement);
        console.log('DRAG DEBUG - Drop validation during move:', { 
          targetType: hoveredElement.type, 
          canDropHere 
        });
        
        setHoveredElementId(hoveredElement.id);
        setHoveredZone('inside');
        
        // Update Redux state for visual feedback 
        dispatch(setHoveredElement({ 
          elementId: hoveredElement.id, 
          zone: 'inside' 
        }));
      } else {
        setHoveredElementId(null);
        setHoveredZone(null);
        dispatch(setHoveredElement({ elementId: null, zone: null }));
      }
    } else if (['rectangle', 'text', 'image', 'container', 'component'].includes(selectedTool)) {
      // Creation tool hover detection for insertion feedback
      console.log('Mouse move triggered, selectedTool:', selectedTool);
      
      const hoveredElement = getElementAtPoint(x, y, project.elements, zoomLevel);
      
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
    console.log('DRAG DEBUG - Mouse up:', { isDraggingForReorder, draggedElementId, hoveredElementId, hoveredZone });
    
    if (isDraggingForReorder && draggedElementId && hoveredElementId && hoveredZone) {
      const targetElement = project.elements[hoveredElementId];
      const canDropHere = isValidDropTarget(targetElement);
      
      console.log('DRAG DEBUG - Drop validation:', { targetElement: targetElement?.type, canDropHere });
      
      if (canDropHere) {
        // Complete the reorder operation only for valid targets
        if (hoveredZone === 'inside') {
          console.log('DRAG DEBUG - Reordering inside:', hoveredElementId);
          dispatch(reorderElement({
            elementId: draggedElementId,
            newParentId: hoveredElementId,
            insertPosition: 'inside'
          }));
        } else {
          const parentId = targetElement?.parent || 'root';
          console.log('DRAG DEBUG - Reordering as sibling:', { parentId, hoveredZone });
          
          dispatch(reorderElement({
            elementId: draggedElementId,
            newParentId: parentId,
            insertPosition: hoveredZone,
            referenceElementId: hoveredElementId
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
    setHoveredElementId(null);
    setHoveredZone(null);
    dispatch(setHoveredElement({ elementId: null, zone: null }));
    dispatch(resetUI());
  }, [dispatch, isDraggingForReorder, draggedElementId, hoveredElementId, hoveredZone, project.elements]);

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
        
        // Use the current hover state for intelligent placement
        const targetElementId = hoveredElementId || 'root';
        const targetElement = project.elements[targetElementId];
        const targetZone = hoveredZone || 'inside';
        
        // Instantiate the component at the drop position
        const { elements: newElements, rootElementId } = instantiateComponent(data.component, x, y);
        
        // Add the root element first with proper targeting
        const rootElement = newElements[rootElementId];
        if (rootElement) {
          let parentId = 'root';
          let insertPosition: 'before' | 'after' | 'inside' = 'inside';
          let referenceElementId: string | undefined;
          
          // Use hover targeting for intelligent placement
          if (targetElement && targetElementId !== 'root') {
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
      <main className="absolute left-12 right-80 top-12 bottom-8 bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">No canvas available</div>
      </main>
    );
  }

  return (
    <main 
      className="absolute left-12 right-[576px] top-12 bottom-8 bg-gray-50 overflow-auto flex items-center justify-center"
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
        

        

      </div>
    </main>
  );
};

export default Canvas;
