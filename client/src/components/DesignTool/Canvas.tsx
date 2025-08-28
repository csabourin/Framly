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
import { chooseDropForNewElement, getCandidateContainerIds, createElementMetaForInsertion } from '../../dnd/chooseDropForNew';
import { createComponentMeta } from '../../dnd/resolveDrop';

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

  // CRITICAL: Handle point-and-click insertion for toolbar elements
  const handlePointAndClickInsertion = useCallback((x: number, y: number, tool: string, isShiftPressed: boolean, isAltPressed: boolean) => {
    // Convert canvas coordinates to screen coordinates for the new DnD system
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const screenX = x * zoomLevel + rect.left;
    const screenY = y * zoomLevel + rect.top;
    
    // Get candidate containers and element metadata for the new DnD system
    const candidateIds = getCandidateContainerIds({ x: screenX, y: screenY });
    const elementMeta = createElementMetaForInsertion(tool);
    
    // Create helper functions for the new DnD system
    const getMeta = (id: string) => {
      if (id === "root") {
        return { id: "root", tag: "DIV", acceptsChildren: true };
      }
      const element = expandedElements[id];
      return element ? createComponentMeta(element) : null;
    };
    
    const getParentId = (id: string) => {
      if (id === "root") return null;
      const element = expandedElements[id];
      return element?.parent || "root";
    };
    
    const indexOf = (parentId: string, childId: string) => {
      if (parentId === "root") {
        return Object.values(expandedElements)
          .filter(el => el.parent === "root" || !el.parent)
          .findIndex(el => el.id === childId);
      }
      const parent = expandedElements[parentId];
      return parent?.children?.indexOf(childId) || 0;
    };
    
    const getChildren = (parentId: string) => {
      if (parentId === "root") {
        return Object.values(expandedElements)
          .filter(el => el.parent === "root" || !el.parent)
          .map(el => el.id);
      }
      const parent = expandedElements[parentId];
      return parent?.children || [];
    };
    
    // Get legal drop location using new DnD system
    const drop = chooseDropForNewElement(
      { x: screenX, y: screenY },
      candidateIds,
      elementMeta,
      getMeta,
      getParentId,
      indexOf,
      getChildren
    );
    
    if (!drop) {
      // Fallback to root insertion if no valid drop found
      const newElement = createDefaultElement(tool as any);
      dispatch(addElement({
        element: newElement,
        parentId: 'root',
        insertPosition: 'inside'
      }));
      dispatch(selectElement(newElement.id));
      return;
    }

    // Create the new element
    const newElement = createDefaultElement(tool as any);
    
    // Convert new DnD format to insertion parameters
    let parentId = drop.parentId;
    let insertPosition: 'before' | 'after' | 'inside' = drop.kind === "into" ? 'inside' : 'before';
    let referenceElementId: string | undefined;
    
    if (drop.kind === "between" && typeof drop.index === "number") {
      // For between insertion, find the reference element
      const siblings = getChildren(parentId);
      if (drop.index < siblings.length) {
        referenceElementId = siblings[drop.index];
        insertPosition = 'before';
      } else {
        // Insert at end
        insertPosition = 'inside';
      }
    }

    // Insert the element using validated drop location
    dispatch(addElement({
      element: newElement,
      parentId,
      insertPosition,
      referenceElementId
    }));

    // Select the newly created element
    dispatch(selectElement(newElement.id));
  }, [expandedElements, dispatch, zoomLevel]);
  
  // Orchestrate event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Skip drawing when clicking on editable text elements or when text editing is active
    const target = e.target as HTMLElement;
    const isClickingText = target.closest('.text-element') || target.closest('[contenteditable="true"]') || target.hasAttribute('contenteditable');
    const isTextEditingActive = document.querySelector('.text-editing') !== null;
    
    if (isClickingText || isTextEditingActive) {
      return;
    }

    // Only handle if clicking on canvas background
    if (e.target !== e.currentTarget) {
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
      
      // Check if this is a point-and-click tool (toolbar insertion)
      if (isPointAndClickTool(selectedTool as Tool)) {
        // Point-and-click insertion for content elements
        handlePointAndClickInsertion(x, y, selectedTool, e.shiftKey, e.altKey || e.metaKey);
        return;
      }
      
      // Drawing tools (rectangle, text, image) use drawing events
      drawingEvents.handleDrawingMouseDown(e);
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