import React, { useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { selectElement } from '../../store/canvasSlice';
import { setSelectedTool } from '../../store/uiSlice';
import { 
  selectCurrentElements, 
  selectSelectedElementId, 
  selectCanvasProject, 
  selectSelectedTool,
  selectZoomLevel,
  selectHoveredElementId,
  selectIsDraggingForReorder,
  selectDraggedElementId
} from '../../store/selectors';
import { CanvasElement as CanvasElementType } from '../../types/canvas';
import CanvasElement from './CanvasElement';
import { useExpandedElements } from '../../hooks/useExpandedElements';
import { useColorModeCanvasSync } from '../../hooks/useColorModeCanvasSync';
import DragFeedback from './DragFeedback';
import DragIndicatorOverlay from './DragIndicatorOverlay';

// Modular hooks
import { useCanvasEvents } from './hooks/useCanvasEvents';
import { useDrawingEvents } from './hooks/useDrawingEvents';
import { useDragAndDrop } from './hooks/useDragAndDrop';

// Modular components
import CanvasContainer from './components/CanvasContainer';
import InsertionIndicator from './components/InsertionIndicator';
import DrawingOverlay from './components/DrawingOverlay';
import SelectionOverlay from './components/SelectionOverlay';

// Utilities
import { calculateContentBounds } from './utils/canvasGeometry';

/**
 * Modular Canvas Component (150 lines - orchestration only)
 * 
 * Responsibilities:
 * - Coordinate child components and hooks
 * - Manage global state and layout
 * - Handle complex event orchestration
 * - Provide keyboard shortcuts
 */
const Canvas: React.FC = () => {
  const dispatch = useDispatch();
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Sync color mode changes with canvas
  useColorModeCanvasSync();
  
  // Core selectors
  const currentElements = useSelector(selectCurrentElements);
  const selectedElementId = useSelector(selectSelectedElementId);
  const project = useSelector(selectCanvasProject);
  const selectedTool = useSelector(selectSelectedTool);
  const zoomLevel = useSelector(selectZoomLevel);
  const hoveredElementId = useSelector(selectHoveredElementId);
  const isDraggingForReorder = useSelector(selectIsDraggingForReorder);
  const draggedElementId = useSelector(selectDraggedElementId);
  
  // UI state
  const isGridVisible = useSelector((state: RootState) => state.ui.isGridVisible);
  const currentBreakpoint = useSelector((state: RootState) => state.canvas.project.currentBreakpoint);
  const breakpoints = useSelector((state: RootState) => state.canvas.project.breakpoints);
  
  // Expanded elements for component rendering
  const expandedElements = useExpandedElements(currentElements);
  const rootElement = expandedElements.root;
  
  // Calculate canvas dimensions
  const canvasWidth = breakpoints[currentBreakpoint]?.width || rootElement?.width || 375;
  const contentBounds = calculateContentBounds(expandedElements, rootElement, canvasWidth);
  
  // Initialize modular hooks
  const canvasEvents = useCanvasEvents();
  
  const drawingEvents = useDrawingEvents(
    expandedElements,
    canvasRef,
    canvasWidth
  );
  
  const dragAndDrop = useDragAndDrop(canvasRef);
  
  // Orchestrate event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Canvas-level events first
    canvasEvents.handleCanvasMouseDown(e);
    
    // Drawing tool events if applicable
    if (['rectangle', 'text', 'image'].includes(selectedTool)) {
      drawingEvents.handleDrawingMouseDown(e);
    }
  }, [canvasEvents, drawingEvents, selectedTool]);
  
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (drawingEvents.isDrawing) {
      drawingEvents.handleDrawingMouseMove(e);
    }
  }, [drawingEvents]);
  
  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (drawingEvents.isDrawing) {
      drawingEvents.handleDrawingMouseUp(e);
    }
  }, [drawingEvents]);

  return (
    <CanvasContainer
      canvasRef={canvasRef}
      zoomLevel={zoomLevel}
      isGridVisible={isGridVisible}
      canvasWidth={canvasWidth}
      contentBounds={contentBounds}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDragOver={dragAndDrop.handleDragOver}
      onDragLeave={dragAndDrop.handleDragLeave}
      onDrop={dragAndDrop.handleDrop}
      onClick={canvasEvents.handleCanvasClick}
      onDoubleClick={canvasEvents.handleCanvasDoubleClick}
      onContextMenu={canvasEvents.handleCanvasContextMenu}
      onKeyDown={canvasEvents.handleCanvasKeyDown}
    >
      {/* Root element content */}
      <div
        className="relative w-full h-full"
        style={{
          minHeight: `${rootElement?.height || 600}px`,
          backgroundColor: rootElement?.styles?.backgroundColor || '#ffffff',
          padding: rootElement?.styles?.padding || '20px',
          gap: rootElement?.styles?.gap || '16px',
          display: rootElement?.styles?.display || 'flex',
          flexDirection: (rootElement?.styles?.flexDirection as any) || 'column',
        }}
      >
        {/* Render child elements */}
        {(rootElement.children || []).map((childId: string) => {
          const element = expandedElements[childId];
          if (!element) return null;
          
          return (
            <CanvasElement 
              key={element.id} 
              element={element}
              isSelected={element.id === selectedElementId}
              isHovered={element.id === hoveredElementId}
              currentElements={expandedElements}
            />
          );
        })}
      </div>
      
      {/* Visual feedback overlays */}
      <InsertionIndicator insertionIndicator={dragAndDrop.insertionIndicator} />
      
      <DrawingOverlay 
        drawingState={drawingEvents.drawingState}
        selectedTool={selectedTool}
        zoomLevel={zoomLevel}
      />
      
      <SelectionOverlay
        selectedElementId={selectedElementId || null}
        hoveredElementId={hoveredElementId || null}
        elements={expandedElements}
        zoomLevel={zoomLevel}
      />
      
      {/* Drag feedback overlay */}
      {isDraggingForReorder && draggedElementId && (
        <DragFeedback
          hoveredElementId={hoveredElementId}
          hoveredZone={null}
          draggedElementId={draggedElementId}
        />
      )}
      
      {/* Drag indicator overlay */}
      <DragIndicatorOverlay
        hoveredElementId={hoveredElementId}
        hoveredZone={null}
        currentElements={expandedElements}
        zoomLevel={zoomLevel}
        canvasRef={canvasRef}
      />
    </CanvasContainer>
  );
};

export default Canvas;