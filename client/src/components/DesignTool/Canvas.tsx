import React, { useRef, useCallback, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { selectElement, addElement, moveElement, resizeElement } from '../../store/canvasSlice';
import { setDragging, setDragStart, setResizing, setResizeHandle, resetUI } from '../../store/uiSlice';
import { createDefaultElement, getElementAtPoint, calculateSnapPosition } from '../../utils/canvas';
import CanvasElement from './CanvasElement';
import { Plus, Minus, Maximize } from 'lucide-react';

const Canvas: React.FC = () => {
  const dispatch = useDispatch();
  const canvasRef = useRef<HTMLDivElement>(null);
  const { project } = useSelector((state: RootState) => state.canvas);
  const { selectedTool, isDragging, dragStart, isResizing, resizeHandle, zoomLevel, isGridVisible } = useSelector((state: RootState) => state.ui);

  const rootElement = project.elements.root;
  const selectedElement = project.selectedElementId ? project.elements[project.selectedElementId] : null;

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
      const newElement = createDefaultElement(selectedTool as any, x, y);
      const parentId = getElementAtPoint(x, y, project.elements)?.id || 'root';
      dispatch(addElement({ element: newElement, parentId }));
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
