import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { selectElement, addElement, moveElement, resizeElement, reorderElement, deleteElement } from '../../store/canvasSlice';
import { setDragging, setDragStart, setResizing, setResizeHandle, resetUI, setDraggedElement, setDraggingForReorder } from '../../store/uiSlice';
import { createDefaultElement, getElementAtPoint, calculateSnapPosition } from '../../utils/canvas';
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
  const [insertionIndicator, setInsertionIndicator] = useState<InsertionIndicator | null>(null);
  const { project } = useSelector((state: RootState) => state.canvas);
  const { selectedTool, isDragging, dragStart, isResizing, resizeHandle, zoomLevel, isGridVisible, draggedElementId, isDraggingForReorder } = useSelector((state: RootState) => state.ui);

  const rootElement = project.elements.root;
  const selectedElement = project.selectedElementId ? project.elements[project.selectedElementId] : null;

  // Function to detect insertion zones based on mouse position
  const detectInsertionZone = useCallback((x: number, y: number, forDrag = false): InsertionIndicator | null => {
    if (!forDrag && !['rectangle', 'text', 'image', 'container'].includes(selectedTool)) {
      return null;
    }
    if (forDrag && selectedTool !== 'hand') {
      return null;
    }

    const hoveredElement = getElementAtPoint(x, y, project.elements, zoomLevel);
    
    // Skip the dragged element itself during drag operations
    if (forDrag && draggedElementId && hoveredElement?.id === draggedElementId) {
      return null;
    }
    
    if (!hoveredElement || hoveredElement.id === 'root') {
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
    const topThird = elementHeight * 0.25;
    const bottomThird = elementHeight * 0.75;

    if (relativeY < topThird) {
      return {
        position: 'before',
        elementId: hoveredElement.id,
        bounds: { x: elementX, y: elementY - 2, width: elementWidth, height: 4 }
      };
    } else if (relativeY > bottomThird) {
      return {
        position: 'after',
        elementId: hoveredElement.id,
        bounds: { x: elementX, y: elementY + elementHeight - 2, width: elementWidth, height: 4 }
      };
    } else {
      // Inside element (containers and rectangles can accept children)
      if (hoveredElement.isContainer || hoveredElement.type === 'container' || hoveredElement.type === 'rectangle') {
        return {
          position: 'inside',
          elementId: hoveredElement.id,
          bounds: { x: elementX, y: elementY, width: elementWidth, height: elementHeight }
        };
      } else {
        // For non-container elements, default to after
        return {
          position: 'after',
          elementId: hoveredElement.id,
          bounds: { x: elementX, y: elementY + elementHeight - 2, width: elementWidth, height: 4 }
        };
      }
    }
  }, [selectedTool, project.elements, zoomLevel, rootElement, draggedElementId]);

  // Handle mouse move for insertion indicators and drag operations
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / zoomLevel;
    const y = (e.clientY - rect.top) / zoomLevel;

    // Handle dragging for reorder (hand tool)
    if (isDraggingForReorder && draggedElementId && selectedTool === 'hand') {
      const indicator = detectInsertionZone(x, y, true);
      setInsertionIndicator(indicator);
      return;
    }

    // Handle insertion indicators for element creation tools
    if (['rectangle', 'text', 'image', 'container'].includes(selectedTool)) {
      const indicator = detectInsertionZone(x, y, false);
      setInsertionIndicator(indicator);
    } else {
      setInsertionIndicator(null);
    }
  }, [selectedTool, zoomLevel, detectInsertionZone, isDraggingForReorder, draggedElementId]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
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
      } else {
        dispatch(selectElement('root'));
      }
    } else if (['rectangle', 'text', 'image', 'container'].includes(selectedTool)) {
      const indicator = detectInsertionZone(x, y, false);
  
      
      if (indicator) {
        const newElement = createDefaultElement(selectedTool as any, 0, 0);

        
        if (indicator.position === 'inside') {
          // Insert inside the target element
          dispatch(addElement({ 
            element: newElement, 
            parentId: indicator.elementId,
            insertPosition: 'inside'
          }));
        } else {
          // Insert before or after the target element (sibling)
          const targetElement = project.elements[indicator.elementId];
          const parentId = targetElement?.parent || 'root';
          

          
          dispatch(addElement({ 
            element: newElement, 
            parentId: parentId,
            insertPosition: indicator.position,
            referenceElementId: indicator.elementId
          }));
        }
        
        // Clear the insertion indicator and select new element
        setInsertionIndicator(null);
        dispatch(selectElement(newElement.id));
      } else {

        // If no specific insertion point, create at root
        const newElement = createDefaultElement(selectedTool as any, x, y);
        dispatch(addElement({ 
          element: newElement, 
          parentId: 'root',
          insertPosition: 'inside'
        }));
        setInsertionIndicator(null);
        dispatch(selectElement(newElement.id));
      }
    }
  }, [selectedTool, zoomLevel, project.elements, dispatch, detectInsertionZone]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = (e.clientX - rect.left) / zoomLevel;
    const y = (e.clientY - rect.top) / zoomLevel;
    
    if (selectedTool === 'select' && selectedElement) {
      dispatch(setDragStart({ x: x - selectedElement.x, y: y - selectedElement.y }));
      dispatch(setDragging(true));
    } else if (selectedTool === 'hand') {
      const clickedElement = getElementAtPoint(x, y, project.elements, zoomLevel);
      if (clickedElement && clickedElement.id !== 'root') {
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
      // Element reordering (hand tool) - show insertion indicators
      const indicator = detectInsertionZone(x, y, true);
      
      // Only show insertion indicator if it's different from the dragged element
      if (indicator && indicator.elementId !== draggedElementId) {
        setInsertionIndicator(indicator);
      } else {
        setInsertionIndicator(null);
      }
    }
  }, [isDragging, isDraggingForReorder, selectedElement, draggedElementId, dragStart, zoomLevel, dispatch]);

  const handleMouseUp = useCallback((e?: MouseEvent) => {
    if (isDraggingForReorder && draggedElementId && insertionIndicator) {
      // Complete the reorder operation
      if (insertionIndicator.position === 'inside') {
        dispatch(reorderElement({
          elementId: draggedElementId,
          newParentId: insertionIndicator.elementId,
          insertPosition: 'inside'
        }));
      } else {
        const targetElement = project.elements[insertionIndicator.elementId];
        const parentId = targetElement?.parent || 'root';
        
        dispatch(reorderElement({
          elementId: draggedElementId,
          newParentId: parentId,
          insertPosition: insertionIndicator.position,
          referenceElementId: insertionIndicator.elementId
        }));
      }
    }
    
    // Reset all drag states
    dispatch(setDragging(false));
    dispatch(setResizing(false));
    dispatch(setDraggingForReorder(false));
    dispatch(setDraggedElement(undefined));
    setInsertionIndicator(null);
    dispatch(resetUI());
  }, [dispatch, isDraggingForReorder, draggedElementId, insertionIndicator, project.elements]);

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
        handleMouseMove(e as any);
      }
    };

    const handleGlobalMouseUp = () => {
      if (isDragging || isResizing || isDraggingForReorder) {
        handleMouseUp();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
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
      className="absolute left-12 right-80 top-12 bottom-8 bg-gray-50 overflow-auto flex items-center justify-center"
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
        onMouseMove={handleCanvasMouseMove}
        onMouseLeave={() => setInsertionIndicator(null)}
        data-testid="canvas-container"
      >
        {/* Render Canvas Elements */}
        {rootElement.children?.map(childId => {
          const element = project.elements[childId];
          return element ? (
            <CanvasElement 
              key={element.id} 
              element={element}
              isSelected={element.id === project.selectedElementId}
            />
          ) : null;
        })}
        
        {/* Insertion Indicator */}
        {insertionIndicator && (
          <div
            className={`absolute z-50 ${
              isDraggingForReorder 
                ? insertionIndicator.position === 'inside' 
                  ? 'border-2 border-green-400 border-dashed bg-green-50 bg-opacity-30 pointer-events-none' 
                  : 'bg-green-500 pointer-events-auto cursor-pointer'
                : insertionIndicator.position === 'inside' 
                  ? 'border-2 border-blue-400 border-dashed bg-blue-50 bg-opacity-30 pointer-events-auto cursor-pointer' 
                  : 'bg-blue-500 pointer-events-auto cursor-pointer'
            }`}
            style={{
              left: insertionIndicator.bounds.x,
              top: insertionIndicator.bounds.y,
              width: insertionIndicator.bounds.width,
              height: insertionIndicator.bounds.height,
            }}
            data-testid="insertion-indicator"
            onClick={(e) => {
              e.stopPropagation();
              console.log('Insertion indicator clicked!', insertionIndicator);
              // Trigger element creation at this position
              if (['rectangle', 'text', 'image', 'container'].includes(selectedTool)) {
                const newElement = createDefaultElement(selectedTool as any, 0, 0);
                
                if (insertionIndicator.position === 'inside') {
                  // Insert inside the target element
                  dispatch(addElement({ 
                    element: newElement, 
                    parentId: insertionIndicator.elementId,
                    insertPosition: 'inside'
                  }));
                } else {
                  // Insert before or after the target element (sibling)
                  const targetElement = project.elements[insertionIndicator.elementId];
                  const parentId = targetElement?.parent || 'root';
                  
                  dispatch(addElement({ 
                    element: newElement, 
                    parentId: parentId,
                    insertPosition: insertionIndicator.position,
                    referenceElementId: insertionIndicator.elementId
                  }));
                }
                
                setInsertionIndicator(null);
                dispatch(selectElement(newElement.id));
              }
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className={`text-white text-xs px-2 py-1 rounded whitespace-nowrap ${
                isDraggingForReorder ? 'bg-green-500' : 'bg-blue-500'
              }`}>
                {isDraggingForReorder ? 'Move' : 'Insert'} {insertionIndicator.position}
              </div>
            </div>
          </div>
        )}
        

      </div>
    </main>
  );
};

export default Canvas;
