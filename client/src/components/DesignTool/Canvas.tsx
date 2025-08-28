import React, { useRef, useCallback, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { selectElement, addElement, moveElement, resizeElement, reorderElement, deleteElement, copyElement, cutElement, pasteElement } from '../../store/canvasSlice';
import { setDragging, setDragStart, setResizing, setResizeHandle, resetUI, setDraggedElement, setDraggingForReorder, setHoveredElement, setSelectedTool } from '../../store/uiSlice';
import { createDefaultElement, getElementAtPoint, calculateSnapPosition, isValidDropTarget, isPointAndClickTool, isDrawingTool, canAcceptChildren } from '../../utils/canvas';
import { 
  selectCurrentElements, 
  selectSelectedElementId, 
  selectCanvasProject, 
  selectSelectedTool,
  selectIsDraggingForReorder,
  selectDraggedElementId,
  selectZoomLevel,
  selectHoveredElementId,
  selectHoveredZone
} from '../../store/selectors';
import { ComponentDef, CanvasElement as CanvasElementType, Tool } from '../../types/canvas';
import CanvasElement from './CanvasElement';
import { useExpandedElements } from '../../hooks/useExpandedElements';
import { useColorModeCanvasSync } from '../../hooks/useColorModeCanvasSync';
import { useDrawingCommitter } from './DrawingCommitter';
import DragFeedback from './DragFeedback';
import { useThrottledMouseMove } from '../../hooks/useThrottledMouseMove';
import { useStableDragTarget } from '../../hooks/useStableDragTarget';
import DragIndicatorOverlay from './DragIndicatorOverlay';

import { calculateHitZone, clampToCanvas, areZonesMutuallyExclusive } from '../../utils/hitZoneGeometry';
import { chooseDropForNewElement, getCandidateContainerIds, createElementMetaForInsertion } from '../../dnd/chooseDropForNew';
import { chooseDropWithFallback } from '../../dnd/chooseDrop';
import { resolveLegalDrop, createComponentMeta } from '../../dnd/resolveDrop';
import { canAcceptChild } from '../../dnd/canAcceptChild';

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

/**
 * Modular Canvas Component with preserved functionality
 * 
 * Responsibilities:
 * - Coordinate modular hooks and components
 * - Manage global state and event orchestration
 * - Handle keyboard shortcuts and complex interactions
 * - Layout and positioning with full functionality
 */
const Canvas: React.FC = () => {
  const dispatch = useDispatch();
  
  // Sync color mode changes with canvas refresh
  useColorModeCanvasSync();
  const canvasRef = useRef<HTMLDivElement>(null);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
  const [hoveredZone, setHoveredZone] = useState<'before' | 'after' | 'inside' | 'canvas-top' | 'canvas-bottom' | null>(null);
  const [insertionIndicator, setInsertionIndicator] = useState<any | null>(null);
  const [isDraggingComponent, setIsDraggingComponent] = useState(false);
  const [dragThreshold, setDragThreshold] = useState({ x: 0, y: 0, exceeded: false });
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [expandedContainerId, setExpandedContainerId] = useState<string | null>(null);
  const [inputModality, setInputModality] = useState<'mouse' | 'keyboard'>('mouse');
  const [isDragFromHandle, setIsDragFromHandle] = useState(false);
  
  // Stable drag target management for artifact-free feedback
  const stableDragTarget = useStableDragTarget({
    bufferX: 5,
    bufferY: 8,
    hysteresisBuffer: 8
  });
  
  // Drawing state for rubber-band rectangle
  const [drawingState, setDrawingState] = useState<{
    start: { x: number; y: number };
    current: { x: number; y: number };
    isShiftPressed: boolean;
    isAltPressed: boolean;
  } | null>(null);
  
  // Essential selectors for Canvas functionality (optimized)
  const currentElements = useSelector(selectCurrentElements);
  const selectedElementId = useSelector(selectSelectedElementId);
  const project = useSelector(selectCanvasProject);
  const selectedTool = useSelector(selectSelectedTool);
  const isDraggingForReorder = useSelector(selectIsDraggingForReorder);
  const draggedElementId = useSelector(selectDraggedElementId);
  const zoomLevel = useSelector(selectZoomLevel);
  
  // Extract additional UI state individually (optimized)
  const isDragging = useSelector((state: RootState) => state.ui.isDragging);
  const dragStart = useSelector((state: RootState) => state.ui.dragStart);
  const isResizing = useSelector((state: RootState) => state.ui.isResizing);
  const resizeHandle = useSelector((state: RootState) => state.ui.resizeHandle);
  const isGridVisible = useSelector((state: RootState) => state.ui.isGridVisible);
  const isDOMTreePanelVisible = useSelector((state: RootState) => state.ui.isDOMTreePanelVisible);
  const isComponentPanelVisible = useSelector((state: RootState) => state.ui.isComponentPanelVisible);
  const settings = useSelector((state: RootState) => state.ui.settings);
  
  const currentBreakpoint = useSelector((state: RootState) => state.canvas.project.currentBreakpoint);
  const breakpoints = useSelector((state: RootState) => state.canvas.project.breakpoints);
  
  // Use centralized selectors for tab-based data (reusing currentElements)
  const rawElements = currentElements;
  
  // CRITICAL: Expand component instances to show their template children
  const expandedElements = useExpandedElements(rawElements);

  const rootElement = expandedElements.root;
  
  // Override root width based on current breakpoint
  const canvasWidth = breakpoints[currentBreakpoint]?.width || rootElement?.width || 375;

  // Initialize drawing committer for the new drawing-based UX
  const { commitDrawnRect } = useDrawingCommitter({
    currentElements: expandedElements,
    zoomLevel,
    canvasRef,
    currentBreakpointWidth: canvasWidth
  });
  
  // Calculate actual content bounds to handle elements positioned outside initial canvas
  const calculateContentBounds = useCallback(() => {
    if (!currentElements || !rootElement) return { minY: 0, maxY: rootElement?.height || 800, width: canvasWidth };
    
    let minY = 0;  // Start from 0 (top of intended canvas)
    let maxY = rootElement.height || 800;  // Default canvas height
    
    // Check all elements for their actual positions
    Object.values(expandedElements).forEach(element => {
      if (!element || element.id === 'root') return;
      
      // For explicitly positioned elements, check their Y coordinates
      if (element.x !== undefined && element.y !== undefined) {
        const elementTop = element.y;
        const elementBottom = element.y + (element.height || 100);
        
        minY = Math.min(minY, elementTop);
        maxY = Math.max(maxY, elementBottom);
      }
    });
    
    return { minY, maxY, width: canvasWidth };
  }, [expandedElements, rootElement, canvasWidth]);

  const contentBounds = calculateContentBounds();
  
  // Canvas mouse event handlers with preserved functionality
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    
    e.preventDefault();
    setInputModality('mouse');
    
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    
    // Clear any existing drag states
    dispatch(resetUI());
    
    if (['rectangle', 'text', 'image'].includes(selectedTool)) {
      // Start drawing for creation tools
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const canvasX = (e.clientX - rect.left) / zoomLevel;
      const canvasY = (e.clientY - rect.top) / zoomLevel;
      
      setDrawingState({
        start: { x: canvasX, y: canvasY },
        current: { x: canvasX, y: canvasY },
        isShiftPressed: e.shiftKey,
        isAltPressed: e.altKey
      });
    } else if (selectedTool === 'select') {
      // Click on empty canvas area - select root
      dispatch(selectElement('root'));
    }
  }, [selectedTool, dispatch, zoomLevel]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    
    if (drawingState && ['rectangle', 'text', 'image'].includes(selectedTool)) {
      // Update drawing state
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const canvasX = (e.clientX - rect.left) / zoomLevel;
      const canvasY = (e.clientY - rect.top) / zoomLevel;
      
      setDrawingState(prev => prev ? {
        ...prev,
        current: { x: canvasX, y: canvasY },
        isShiftPressed: e.shiftKey,
        isAltPressed: e.altKey
      } : null);
    }
  }, [drawingState, selectedTool, zoomLevel]);

  const handleCanvasMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (drawingState && ['rectangle', 'text', 'image'].includes(selectedTool)) {
      e.preventDefault();
      e.stopPropagation();
      
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const canvasX = (e.clientX - rect.left) / zoomLevel;
      const canvasY = (e.clientY - rect.top) / zoomLevel;
      
      // Calculate final rectangle
      const startX = Math.min(drawingState.start.x, canvasX);
      const startY = Math.min(drawingState.start.y, canvasY);
      const width = Math.abs(canvasX - drawingState.start.x);
      const height = Math.abs(canvasY - drawingState.start.y);
      
      // Only create element if there's meaningful size (>5px)
      if (width > 5 || height > 5) {
        commitDrawnRect(
          { 
            left: rect.left + startX * zoomLevel, 
            top: rect.top + startY * zoomLevel, 
            width: width * zoomLevel, 
            height: height * zoomLevel 
          },
          selectedTool as 'rectangle' | 'text' | 'image',
          { shift: drawingState.isShiftPressed, alt: drawingState.isAltPressed }
        );
      }
      
      setDrawingState(null);
    }
  }, [drawingState, selectedTool, commitDrawnRect, zoomLevel]);

  const handleCanvasKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    setInputModality('keyboard');
    
    // Handle keyboard shortcuts
    if (e.key === 'Escape') {
      dispatch(resetUI());
      setDrawingState(null);
    } else if (e.key === 'v' && !e.ctrlKey && !e.metaKey) {
      dispatch(setSelectedTool('select'));
    } else if (e.key === 'r' && !e.ctrlKey && !e.metaKey) {
      dispatch(setSelectedTool('rectangle'));
    } else if (e.key === 't' && !e.ctrlKey && !e.metaKey) {
      dispatch(setSelectedTool('text'));
    } else if (e.key === 'i' && !e.ctrlKey && !e.metaKey) {
      dispatch(setSelectedTool('image'));
    }
  }, [dispatch]);
  
  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (isDraggingForReorder && draggedElementId) {
      // Find element at mouse position for drag feedback
      const elementAtPoint = document.elementFromPoint(e.clientX, e.clientY);
      const elementId = elementAtPoint?.closest('[data-element-id]')?.getAttribute('data-element-id');
      
      if (elementId && elementId !== draggedElementId && expandedElements[elementId]) {
        const element = expandedElements[elementId];
        const elementRect = elementAtPoint?.getBoundingClientRect();
        
        if (elementRect) {
          const elementBounds = {
            x: elementRect.left,
            y: elementRect.top,
            width: elementRect.width,
            height: elementRect.height
          };
          
          const hitZone = calculateHitZone(
            e.clientX,
            e.clientY,
            elementBounds,
            element.type === 'container' || element.type === 'section'
          );
          
          if (hitZone.zone) {
            setInsertionIndicator({
              elementId: elementId,
              position: hitZone.zone,
              bounds: calculateIndicatorBounds(elementId, hitZone.zone)
            });
          }
        }
      }
    }
  }, [isDraggingForReorder, draggedElementId, expandedElements]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setInsertionIndicator(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    if (isDraggingForReorder && draggedElementId && insertionIndicator) {
      dispatch(reorderElement({
        elementId: draggedElementId,
        newParentId: insertionIndicator.referenceElementId || 'root',
        insertPosition: insertionIndicator.insertPosition || 'inside',
        referenceElementId: insertionIndicator.referenceElementId
      }));
    }
    
    dispatch(setDraggingForReorder(false));
    dispatch(setDraggedElement(undefined));
    setInsertionIndicator(null);
    dispatch(resetUI());
  }, [isDraggingForReorder, draggedElementId, insertionIndicator, dispatch]);

  const calculateIndicatorBounds = useCallback((elementId: string, position: string) => {
    const element = expandedElements[elementId];
    if (!element) return { x: 0, y: 0, width: 0, height: 0 };
    
    return {
      x: element.x || 0,
      y: element.y || 0,
      width: element.width || 100,
      height: element.height || 20
    };
  }, [expandedElements]);

  // Calculate canvas height based on content
  const canvasHeight = Math.max(contentBounds.maxY - contentBounds.minY, 800);

  return (
    <div className="flex-1 overflow-auto bg-gray-100 relative">
      <div 
        className="relative mx-auto"
        style={{
          width: `${canvasWidth * zoomLevel}px`,
          minHeight: '100%',
          paddingTop: '40px',
          paddingBottom: '40px'
        }}
      >
        {/* Canvas */}
        <div
          ref={canvasRef}
          className="relative bg-white shadow-lg mx-auto cursor-crosshair"
          style={{
            width: `${canvasWidth * zoomLevel}px`,
            height: `${canvasHeight * zoomLevel}px`,
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top center',
            backgroundImage: isGridVisible ? 
              `radial-gradient(circle, rgba(0,0,0,0.3) 1px, transparent 1px)` : 
              'none',
            backgroundSize: isGridVisible ? '20px 20px' : 'auto',
          }}
          tabIndex={0}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onKeyDown={handleCanvasKeyDown}
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
          
          {/* Drawing overlay for rubber-band rectangle */}
          {drawingState && ['rectangle', 'text', 'image'].includes(selectedTool) && (
            <div className="absolute pointer-events-none z-[50]">
              <div
                className="absolute border-2 border-blue-500 border-dashed bg-blue-500/10 rounded"
                style={{
                  left: Math.min(drawingState.start.x, drawingState.current.x),
                  top: Math.min(drawingState.start.y, drawingState.current.y),
                  width: Math.abs(drawingState.current.x - drawingState.start.x),
                  height: Math.abs(drawingState.current.y - drawingState.start.y),
                }}
              />
            </div>
          )}
          
          {/* Insertion indicator */}
          {insertionIndicator && (
            <div
              className="absolute pointer-events-none z-[60] bg-blue-500 rounded"
              style={{
                left: insertionIndicator.bounds.x,
                top: insertionIndicator.bounds.y,
                width: insertionIndicator.bounds.width,
                height: insertionIndicator.bounds.height,
                opacity: 0.5
              }}
            />
          )}
        </div>
      </div>
      
      {/* Drag feedback overlay */}
      {isDraggingForReorder && draggedElementId && (
        <DragFeedback
          hoveredElementId={hoveredElementId}
          hoveredZone={hoveredZone}
          draggedElementId={draggedElementId}
        />
      )}
      
      {/* Drag indicator overlay */}
      <DragIndicatorOverlay
        hoveredElementId={hoveredElementId}
        hoveredZone={hoveredZone}
        currentElements={expandedElements}
        zoomLevel={zoomLevel}
        canvasRef={canvasRef}
      />
    </div>
  );
};

export default Canvas;