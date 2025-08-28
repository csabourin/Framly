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
import { CanvasElement as CanvasElementType, Tool } from '../../types/canvas';
import CanvasElement from './CanvasElement';
import { useExpandedElements } from '../../hooks/useExpandedElements';
import { useColorModeCanvasSync } from '../../hooks/useColorModeCanvasSync';
import { useDrawingCommitter } from './DrawingCommitter';
import DragFeedback from './DragFeedback';
import DragIndicatorOverlay from './DragIndicatorOverlay';
import { 
  createDefaultElement, 
  getElementAtPoint, 
  isPointAndClickTool, 
  isDrawingTool 
} from '../../utils/canvas';
import { addElement } from '../../store/canvasSlice';

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
  
  // Initialize drawing committer for toolbar element insertion
  const { commitDrawnRect } = useDrawingCommitter({
    currentElements: expandedElements,
    zoomLevel,
    canvasRef,
    currentBreakpointWidth: canvasWidth
  });

  // Initialize modular hooks
  const canvasEvents = useCanvasEvents();
  
  const drawingEvents = useDrawingEvents(
    expandedElements,
    canvasRef,
    canvasWidth
  );
  
  const dragAndDrop = useDragAndDrop(canvasRef);

  // CRITICAL: Simple point-and-click insertion for toolbar elements
  const handlePointAndClickInsertion = useCallback((x: number, y: number, tool: string, isShiftPressed: boolean, isAltPressed: boolean) => {
    console.log('Point-and-click insertion called:', { tool, x, y });
    
    // Create the new element with default positioning
    const newElement = createDefaultElement(tool as any);
    
    // For now, always insert at root level to get basic functionality working
    dispatch(addElement({
      element: newElement,
      parentId: 'root',
      insertPosition: 'inside'
    }));

    // Select the newly created element
    dispatch(selectElement(newElement.id));
    
    console.log('Element created:', newElement.id);
  }, [dispatch]);
  
  // Orchestrate event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Skip drawing when clicking on editable text elements or when text editing is active
    const target = e.target as HTMLElement;
    const isClickingText = target.closest('.text-element') || target.closest('[contenteditable="true"]') || target.hasAttribute('contenteditable');
    const isTextEditingActive = document.querySelector('.text-editing') !== null;
    
    if (isClickingText || isTextEditingActive) {
      return;
    }

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    // Simple coordinate conversion without complex offsets
    let x = (e.clientX - rect.left) / zoomLevel;
    let y = (e.clientY - rect.top) / zoomLevel;
    
    // Handle creation tools (toolbar element insertion)
    if (['rectangle', 'text', 'image', 'container', 'heading', 'list', 'button',
         'input', 'textarea', 'checkbox', 'radio', 'select',
         'section', 'nav', 'header', 'footer', 'article',
         'video', 'audio', 'link', 'code', 'divider'].includes(selectedTool)) {
      
      e.preventDefault();
      e.stopPropagation();
      
      // For toolbar element insertion, always use point-and-click logic
      // (Drawing tools like 'r', 't', 'i' keys are handled separately)
      console.log('Toolbar insertion:', selectedTool, 'at position:', x, y);
      handlePointAndClickInsertion(x, y, selectedTool, e.shiftKey, e.altKey || e.metaKey);
      return;
    }
    
    // Canvas-level events for select/hand tools
    canvasEvents.handleCanvasMouseDown(e);
  }, [canvasEvents, drawingEvents, selectedTool, handlePointAndClickInsertion, zoomLevel]);
  
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (drawingEvents.isDrawing) {
      drawingEvents.handleDrawingMouseMove(e);
    }
  }, [drawingEvents]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    // Skip click handling for creation tools - drawing system handles them
    if (['rectangle', 'text', 'image', 'container', 'heading', 'list', 'button',
         'input', 'textarea', 'checkbox', 'radio', 'select',
         'section', 'nav', 'header', 'footer', 'article',
         'video', 'audio', 'link', 'code', 'divider'].includes(selectedTool)) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = (e.clientX - rect.left) / zoomLevel;
    const y = (e.clientY - rect.top) / zoomLevel;
    
    if (selectedTool === 'select') {
      const clickedElement = getElementAtPoint(x, y, expandedElements, zoomLevel);
      if (clickedElement) {
        dispatch(selectElement(clickedElement.id));
      } else {
        dispatch(selectElement('root'));
      }
    } else if (selectedTool === 'hand') {
      // Hand tool for selection and drag preparation
      const clickedElement = getElementAtPoint(x, y, expandedElements, zoomLevel);
      if (clickedElement && clickedElement.id !== 'root') {
        dispatch(selectElement(clickedElement.id));
      } else {
        dispatch(selectElement('root'));
      }
    }
  }, [selectedTool, zoomLevel, expandedElements, dispatch]);
  
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
      onClick={handleCanvasClick}
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