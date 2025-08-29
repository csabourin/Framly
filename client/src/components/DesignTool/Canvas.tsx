import React, { useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { 
  selectSelectedElementId,
  selectHoveredElementId,
  selectIsDraggingForReorder,
  selectDraggedElementId
} from '../../store/selectors';
import CanvasElement from './CanvasElement';
import { useColorModeCanvasSync } from '../../hooks/useColorModeCanvasSync';
import { useDrawingCommitter } from './DrawingCommitter';
import DragFeedback from './DragFeedback';
import DragIndicatorOverlay from './DragIndicatorOverlay';
import { getCanvasCoordinatesFromEvent } from './utils/coordinateTransforms';

// Modular hooks
import { useCanvasEvents } from './hooks/useCanvasEvents';
import { useDrawingEvents } from './hooks/useDrawingEvents';
import { useDragAndDrop } from './hooks/useDragAndDrop';
import { useToolHandler } from './hooks/useToolHandler';
import { useElementSelection } from './hooks/useElementSelection';
import { useCanvasState } from './hooks/useCanvasState';

// Modular components
import CanvasContainer from './components/CanvasContainer';
import InsertionIndicator from './components/InsertionIndicator';
import DrawingOverlay from './components/DrawingOverlay';
import SelectionOverlay from './components/SelectionOverlay';

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
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Sync color mode changes with canvas
  useColorModeCanvasSync();
  
  // Modular state management
  const canvasState = useCanvasState();
  const {
    expandedElements,
    rootElement,
    zoomLevel,
    isGridVisible,
    canvasWidth,
    contentBounds,
    rootStyles,
    isTextEditingActive
  } = canvasState;
  
  // Selection state
  const selectedElementId = useSelector(selectSelectedElementId);
  const hoveredElementId = useSelector(selectHoveredElementId);
  const isDraggingForReorder = useSelector(selectIsDraggingForReorder);
  const draggedElementId = useSelector(selectDraggedElementId);
  
  // Initialize drawing committer for toolbar element insertion
  const { commitDrawnRect } = useDrawingCommitter({
    currentElements: expandedElements,
    zoomLevel,
    canvasRef,
    currentBreakpointWidth: canvasWidth
  });

  // Initialize modular hooks
  const canvasEvents = useCanvasEvents(expandedElements, zoomLevel);
  const toolHandler = useToolHandler(expandedElements, zoomLevel);
  const elementSelection = useElementSelection(zoomLevel);
  
  const drawingEvents = useDrawingEvents(
    expandedElements,
    canvasRef,
    canvasWidth
  );
  
  const dragAndDrop = useDragAndDrop(canvasRef);

  
  // Orchestrate event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Skip drawing when clicking on editable text elements or when text editing is active
    const target = e.target as HTMLElement;
    const isClickingText = target.closest('.text-element') || target.closest('[contenteditable="true"]') || target.hasAttribute('contenteditable');
    
    if (isClickingText || isTextEditingActive) {
      return;
    }

    const coords = getCanvasCoordinatesFromEvent(e, canvasRef, zoomLevel);
    
    // Handle creation tools (toolbar element insertion)
    if (toolHandler.isCreationTool(toolHandler.selectedTool)) {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('Toolbar insertion:', toolHandler.selectedTool, 'at position:', coords.x, coords.y);
      toolHandler.handlePointAndClickInsertion(
        coords.x, 
        coords.y, 
        toolHandler.selectedTool, 
        e.shiftKey, 
        e.altKey || e.metaKey
      );
      return;
    }
    
    // Canvas-level events for select/hand tools
    canvasEvents.handleCanvasMouseDown(e);
  }, [canvasEvents, toolHandler, isTextEditingActive, zoomLevel]);
  
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (drawingEvents.isDrawing) {
      drawingEvents.handleDrawingMouseMove(e);
    }
  }, [drawingEvents]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    // Skip click handling for creation tools - drawing system handles them
    if (toolHandler.isCreationTool(toolHandler.selectedTool)) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    const coords = getCanvasCoordinatesFromEvent(e, canvasRef, zoomLevel);
    
    // Handle tool-based selection
    toolHandler.handleToolBasedSelection(coords.x, coords.y, toolHandler.selectedTool);
  }, [toolHandler, zoomLevel]);
  
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
      onDragEnd={dragAndDrop.handleDragEnd}
      onClick={handleCanvasClick}
      onDoubleClick={canvasEvents.handleCanvasDoubleClick}
      onContextMenu={canvasEvents.handleCanvasContextMenu}
      onKeyDown={canvasEvents.handleCanvasKeyDown}
    >
      {/* Root element content */}
      <div
        className="relative w-full h-full"
        style={rootStyles}
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
        selectedTool={toolHandler.selectedTool}
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