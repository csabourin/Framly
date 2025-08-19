import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { selectElement, addElement, moveElement, resizeElement } from '../../store/canvasSlice';
import { setDragging, setDragStart, setResizing, setResizeHandle, resetUI } from '../../store/uiSlice';
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
  const { selectedTool, isDragging, dragStart, isResizing, resizeHandle, zoomLevel, isGridVisible } = useSelector((state: RootState) => state.ui);

  const rootElement = project.elements.root;
  const selectedElement = project.selectedElementId ? project.elements[project.selectedElementId] : null;

  // Function to detect insertion zones based on mouse position
  const detectInsertionZone = useCallback((x: number, y: number): InsertionIndicator | null => {
    if (!['rectangle', 'text', 'image', 'container'].includes(selectedTool)) {
      return null;
    }

    const hoveredElement = getElementAtPoint(x, y, project.elements);
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
      return {
        position: 'inside',
        elementId: hoveredElement.id,
        bounds: { x: elementX, y: elementY, width: elementWidth, height: elementHeight }
      };
    }
  }, [selectedTool, project.elements, zoomLevel, rootElement]);

  // Handle mouse move for insertion indicators
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!['rectangle', 'text', 'image', 'container'].includes(selectedTool)) {
      setInsertionIndicator(null);
      return;
    }

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / zoomLevel;
    const y = (e.clientY - rect.top) / zoomLevel;

    const indicator = detectInsertionZone(x, y);
    setInsertionIndicator(indicator);
  }, [selectedTool, zoomLevel, detectInsertionZone]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = (e.clientX - rect.left) / zoomLevel;
    const y = (e.clientY - rect.top) / zoomLevel;
    
    if (selectedTool === 'select') {
      const clickedElement = getElementAtPoint(x, y, project.elements);
      if (clickedElement) {
        dispatch(selectElement(clickedElement.id));
      } else {
        dispatch(selectElement('root'));
      }
    } else if (['rectangle', 'text', 'image', 'container'].includes(selectedTool)) {
      const indicator = detectInsertionZone(x, y);
      
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
        
        // Clear the insertion indicator
        setInsertionIndicator(null);
      }
    }
  }, [selectedTool, zoomLevel, project.elements, dispatch]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (selectedTool !== 'select' || !selectedElement) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = (e.clientX - rect.left) / zoomLevel;
    const y = (e.clientY - rect.top) / zoomLevel;
    
    dispatch(setDragStart({ x: x - selectedElement.x, y: y - selectedElement.y }));
    dispatch(setDragging(true));
  }, [selectedTool, selectedElement, zoomLevel, dispatch]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !selectedElement || !dragStart) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = (e.clientX - rect.left) / zoomLevel;
    const y = (e.clientY - rect.top) / zoomLevel;
    
    const snappedPosition = calculateSnapPosition(x - dragStart.x, y - dragStart.y);
    
    dispatch(moveElement({
      id: selectedElement.id,
      x: snappedPosition.x,
      y: snappedPosition.y,
    }));
  }, [isDragging, selectedElement, dragStart, zoomLevel, dispatch]);

  const handleMouseUp = useCallback(() => {
    dispatch(resetUI());
  }, [dispatch]);

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
      if (isDragging) {
        handleMouseMove(e as any);
      }
    };

    const handleGlobalMouseUp = () => {
      if (isDragging || isResizing) {
        handleMouseUp();
      }
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

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
            className={`absolute pointer-events-none z-50 ${
              insertionIndicator.position === 'inside' 
                ? 'border-2 border-blue-400 border-dashed bg-blue-50 bg-opacity-30' 
                : 'bg-blue-500'
            }`}
            style={{
              left: insertionIndicator.bounds.x,
              top: insertionIndicator.bounds.y,
              width: insertionIndicator.bounds.width,
              height: insertionIndicator.bounds.height,
            }}
            data-testid="insertion-indicator"
          >
            {insertionIndicator.position !== 'inside' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  Insert {insertionIndicator.position}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Canvas Overlay Controls */}
        <div className="absolute top-4 right-4 flex gap-2" data-testid="canvas-controls">
          <button
            onClick={handleZoomIn}
            className="w-8 h-8 bg-white shadow-lg rounded-lg flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
            title="Zoom In"
            data-testid="button-zoom-in"
          >
            <Plus className="w-3 h-3" />
          </button>
          <button
            onClick={handleZoomOut}
            className="w-8 h-8 bg-white shadow-lg rounded-lg flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
            title="Zoom Out"
            data-testid="button-zoom-out"
          >
            <Minus className="w-3 h-3" />
          </button>
          <button
            onClick={handleFitToScreen}
            className="w-8 h-8 bg-white shadow-lg rounded-lg flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
            title="Fit to Screen"
            data-testid="button-fit-screen"
          >
            <Maximize className="w-3 h-3" />
          </button>
        </div>
      </div>
    </main>
  );
};

export default Canvas;
