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
  selectHoveredElementId
} from '../../store/selectors';
import { CanvasElement as CanvasElementType } from '../../types/canvas';
import CanvasElement from './CanvasElement';
import { useExpandedElements } from '../../hooks/useExpandedElements';
import { useColorModeCanvasSync } from '../../hooks/useColorModeCanvasSync';

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
import { getCandidateContainersAtPoint } from './utils/insertionZones';
import { getCandidateContainerIds } from '../../dnd/chooseDropForNew';

/**
 * Refactored Canvas Component (150 lines vs 1000+)
 * 
 * Responsibilities:
 * - Coordinate child components
 * - Manage global state
 * - Handle keyboard shortcuts
 * - Layout and positioning
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
  
  // Helper function for candidate container detection
  const getCandidateContainerIdsCallback = useCallback((point: { x: number; y: number }) => {
    return getCandidateContainerIds(point);
  }, []);
  
  // Initialize modular hooks
  const canvasEvents = useCanvasEvents();
  
  const drawingEvents = useDrawingEvents(
    expandedElements,
    canvasRef,
    canvasWidth
  );
  
  const dragAndDrop = useDragAndDrop(
    canvasRef,
    getCandidateContainerIdsCallback
  );
  
  // Combined event handlers that coordinate between hooks
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Canvas-level events first
    canvasEvents.handleCanvasMouseDown(e);
    
    // Tool-specific events
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
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    canvasEvents.handleCanvasKeyDown(e);
    
    // Global keyboard shortcuts
    if (e.key === 'v' && !e.ctrlKey && !e.metaKey) {
      dispatch(setSelectedTool('select'));
    } else if (e.key === 'r' && !e.ctrlKey && !e.metaKey) {
      dispatch(setSelectedTool('rectangle'));
    } else if (e.key === 't' && !e.ctrlKey && !e.metaKey) {
      dispatch(setSelectedTool('text'));
    }
  }, [canvasEvents, dispatch]);
  
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
      onKeyDown={handleKeyDown}
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
    </CanvasContainer>
  );
};

export default Canvas;