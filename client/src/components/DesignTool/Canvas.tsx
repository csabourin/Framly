import React, { useRef, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { 
  selectElement, 
  addElement, 
  reorderElement,
} from '../../store/canvasSlice';
import {
  selectCurrentElements, 
  selectSelectedElementId, 
  selectSelectedTool,
  selectIsDraggingForReorder,
  selectDraggedElementId,
  selectZoomLevel
} from '../../store/selectors';
import {
  setDragging,
  setResizing,
  setDraggingForReorder,
  setDraggedElement,
  setHoveredElement,
  resetUI
} from '../../store/uiSlice';

import CanvasElement from './CanvasElement';
import { useExpandedElements } from '../../hooks/useExpandedElements';
import { useColorModeCanvasSync } from '../../hooks/useColorModeCanvasSync';
import { getElementAtPoint, createDefaultElement, isPointAndClickTool, canAcceptChildren } from '../../utils/canvas';
import { Tool } from '../../types/canvas';
import { useThrottledMouseMove } from '../../hooks/useThrottledMouseMove';
import { useDragAndDropV2 } from './hooks/useDragAndDropV2';
import DragDropStyles from './components/DragDropStyles';

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
  
  // Drawing state for rubber-band rectangle
  const [drawingState, setDrawingState] = useState<{
    start: { x: number; y: number };
    current: { x: number; y: number };
    isShiftPressed: boolean;
    isAltPressed: boolean;
  } | null>(null);

  // Essential selectors for Canvas functionality
  const currentElements = useSelector(selectCurrentElements);
  const selectedElementId = useSelector(selectSelectedElementId);
  // Project data accessed through state directly since selectCanvasProject doesn't exist
  const selectedTool = useSelector(selectSelectedTool);
  const isDraggingForReorder = useSelector(selectIsDraggingForReorder);
  const draggedElementId = useSelector(selectDraggedElementId);
  const zoomLevel = useSelector(selectZoomLevel);
  
  // Additional UI state
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
  
  // Use centralized selectors for tab-based data
  const rawElements = currentElements;
  
  // Expand component instances to show their template children
  const expandedElements = useExpandedElements(rawElements);
  const rootElement = expandedElements.root;
  
  // Override root width based on current breakpoint
  const canvasWidth = breakpoints[currentBreakpoint]?.width || rootElement?.width || 375;

  // Use the comprehensive drag-and-drop system
  const { isDragging: isDndActive, draggedItem, dropZones } = useDragAndDropV2();

  // Simplified point-and-click insertion
  const handlePointAndClickInsertion = useCallback((x: number, y: number, tool: string, isShiftPressed: boolean, isAltPressed: boolean) => {
    const newElement = createDefaultElement(tool as any);
    
    const targetElement = getElementAtPoint(x, y, currentElements, zoomLevel);
    
    if (targetElement && targetElement.id !== 'root' && canAcceptChildren(targetElement)) {
      dispatch(addElement({
        element: newElement,
        parentId: targetElement.id,
        insertPosition: 'inside'
      }));
    } else {
      dispatch(addElement({
        element: newElement,
        parentId: 'root',
        insertPosition: 'inside'
      }));
    }

    dispatch(selectElement(newElement.id));
    setInsertionIndicator(null);
    setHoveredElementId(null);
    setHoveredZone(null);
    dispatch(setHoveredElement({ elementId: null, zone: null }));
  }, [currentElements, dispatch, zoomLevel]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
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
      const clickedElement = getElementAtPoint(x, y, currentElements, zoomLevel);
      if (clickedElement) {
        dispatch(selectElement(clickedElement.id));
      } else {
        dispatch(selectElement('root'));
      }
    } else if (selectedTool === 'hand') {
      const clickedElement = getElementAtPoint(x, y, currentElements, zoomLevel);
      if (clickedElement && clickedElement.id !== 'root') {
        dispatch(selectElement(clickedElement.id));
      } else {
        dispatch(selectElement('root'));
      }
    }
  }, [selectedTool, zoomLevel, currentElements, dispatch]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isClickingText = target.closest('.text-element') || target.closest('[contenteditable="true"]') || target.hasAttribute('contenteditable');
    const isTextEditingActive = document.querySelector('.text-editing') !== null;
    
    if (isClickingText || isTextEditingActive) {
      return;
    }
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    let x = (e.clientX - rect.left) / zoomLevel;
    let y = (e.clientY - rect.top) / zoomLevel;
    
    if (['rectangle', 'text', 'image', 'container', 'heading', 'list', 'button',
         'input', 'textarea', 'checkbox', 'radio',
         'section', 'nav', 'header', 'footer', 'article',
         'video', 'audio', 'link', 'code', 'divider'].includes(selectedTool)) {
      
      e.preventDefault();
      e.stopPropagation();
      
      if (isPointAndClickTool(selectedTool as Tool)) {
        handlePointAndClickInsertion(x, y, selectedTool, e.shiftKey, e.altKey || e.metaKey);
        return;
      }
      
      // Drawing tools
      setDrawingState({
        start: { x, y },
        current: { x, y },
        isShiftPressed: e.shiftKey,
        isAltPressed: e.altKey || e.metaKey
      });
      
      return;
    }
  }, [selectedTool, handlePointAndClickInsertion, zoomLevel]);

  const handleMouseMoveInternal = useCallback((e: MouseEvent | React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    
    const x = (e.clientX - rect.left) / zoomLevel;
    const y = (e.clientY - rect.top) / zoomLevel;
    
    // Handle active drawing
    if (drawingState) {
      setDrawingState(prev => prev ? {
        ...prev,
        current: { x, y },
        isShiftPressed: (e as React.MouseEvent).shiftKey || false,
        isAltPressed: ((e as React.MouseEvent).altKey || (e as React.MouseEvent).metaKey) || false
      } : null);
      return;
    }
    
    // Handle creation tools hover
    if (['rectangle', 'text', 'image', 'container', 'heading', 'list', 'button',
         'input', 'textarea', 'checkbox', 'radio',
         'section', 'nav', 'header', 'footer', 'article',
         'video', 'audio', 'link', 'code', 'divider'].includes(selectedTool)) {
      
      if (isPointAndClickTool(selectedTool as Tool)) {
        const hoveredElement = getElementAtPoint(x, y, currentElements, zoomLevel, draggedElementId);
        if (hoveredElement && hoveredElement.id !== 'root') {
          setHoveredElementId(hoveredElement.id);
          setHoveredZone('inside');
          dispatch(setHoveredElement({ elementId: hoveredElement.id, zone: 'inside' }));
          setInsertionIndicator({
            elementId: hoveredElement.id,
            position: 'inside',
            bounds: { x: hoveredElement.x || 0, y: hoveredElement.y || 0, width: hoveredElement.width || 100, height: hoveredElement.height || 20 }
          });
        } else {
          setInsertionIndicator(null);
          setHoveredElementId(null);
          setHoveredZone(null);
          dispatch(setHoveredElement({ elementId: null, zone: null }));
        }
        return;
      }
      
      if (!drawingState) {
        setInsertionIndicator(null);
        setHoveredElementId(null);
        setHoveredZone(null);
        dispatch(setHoveredElement({ elementId: null, zone: null }));
      }
      return;
    }
    
    if (isDraggingForReorder) {
      return;
    }
    
    if (selectedTool === 'select' || selectedTool === 'hand') {
      const hoveredElement = getElementAtPoint(x, y, currentElements, zoomLevel, draggedElementId);
      
      if (hoveredElement && hoveredElement.id !== 'root') {
        setHoveredElementId(hoveredElement.id);
        setHoveredZone(null);
        dispatch(setHoveredElement({ elementId: hoveredElement.id, zone: null }));
      } else {
        setHoveredElementId(null);
        setHoveredZone(null);
        dispatch(setHoveredElement({ elementId: null, zone: null }));
      }
      setInsertionIndicator(null);
    } else {
      setHoveredElementId(null);
      setHoveredZone(null);
      dispatch(setHoveredElement({ elementId: null, zone: null }));
      setInsertionIndicator(null);
    }
  }, [isDragging, isDraggingForReorder, selectedElementId, draggedElementId, zoomLevel, dispatch, selectedTool, expandedElements, dragThreshold, drawingState]);

  const handleMouseMove = useThrottledMouseMove(handleMouseMoveInternal, 16);

  const handleMouseUp = useCallback((e?: MouseEvent) => {
    if (drawingState) {
      const { start, current, isShiftPressed, isAltPressed } = drawingState;
      
      let left = Math.min(start.x, current.x);
      let top = Math.min(start.y, current.y);
      let width = Math.abs(current.x - start.x);
      let height = Math.abs(current.y - start.y);
      
      if (isShiftPressed) {
        const size = Math.max(width, height);
        width = size;
        height = size;
      }
      
      if (isAltPressed) {
        left = start.x - width / 2;
        top = start.y - height / 2;
      }
      
      if (width > 10 && height > 10) {
        const newElement = createDefaultElement(selectedTool as Tool);
        newElement.x = Math.round(left);
        newElement.y = Math.round(top);
        newElement.width = Math.round(width);
        newElement.height = Math.round(height);
        
        dispatch(addElement({
          element: newElement,
          parentId: 'root',
          insertPosition: 'inside'
        }));
        dispatch(selectElement(newElement.id));
      }
      
      setDrawingState(null);
      return;
    }
    
    if (isDraggingForReorder && draggedElementId) {
      const draggedElement = currentElements[draggedElementId];
      if (draggedElement && hoveredElementId && hoveredZone) {
        dispatch(reorderElement({
          elementId: draggedElementId,
          newParentId: hoveredElementId,
          insertPosition: hoveredZone === 'inside' ? 'inside' : 'before'
        }));
      }
    }
    
    dispatch(setDragging(false));
    dispatch(setResizing(false));
    dispatch(setDraggingForReorder(false));
    dispatch(setDraggedElement(undefined));
    setInsertionIndicator(null);
    setHoveredElementId(null);
    setHoveredZone(null);
    dispatch(setHoveredElement({ elementId: null, zone: null }));
    dispatch(resetUI());
    
    setDragThreshold({ x: 0, y: 0, exceeded: false });
    setExpandedContainerId(null);
  }, [drawingState, selectedTool, dispatch, isDraggingForReorder, draggedElementId, currentElements, hoveredElementId, hoveredZone]);

  React.useEffect(() => {
    const handleGlobalMouseUp = () => handleMouseUp();
    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [handleMouseUp]);

  const selectedElement = selectedElementId ? currentElements[selectedElementId] : null;

  return (
    <main 
      className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden relative"
      style={{
        marginLeft: isDOMTreePanelVisible ? '280px' : '0',
        marginRight: isComponentPanelVisible ? '320px' : '0',
        transition: 'margin-left 0.2s ease-in-out, margin-right 0.2s ease-in-out'
      }}
    >
      <div className="relative flex-1 flex flex-col overflow-hidden">
        <div 
          className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-800 relative"
          style={{
            backgroundImage: isGridVisible 
              ? `radial-gradient(circle, #ccc 1px, transparent 1px)`
              : 'none',
            backgroundSize: isGridVisible ? `${20 * zoomLevel}px ${20 * zoomLevel}px` : 'auto',
            backgroundPosition: isGridVisible ? '0 0' : 'auto'
          }}
        >
          <div 
            ref={canvasRef}
            className="relative mx-auto bg-white dark:bg-gray-900 shadow-lg overflow-visible"
            style={{
              width: `${canvasWidth * zoomLevel}px`,
              minHeight: `${(rootElement?.height || 600) * zoomLevel}px`,
              transform: 'translateZ(0)',
              transformOrigin: '0 0',
              margin: '40px auto'
            }}
            onClick={handleCanvasClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
          >
            {Object.values(expandedElements)
              .filter(el => el.id !== 'root' && (el.parent === 'root' || !el.parent))
              .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
              .map(element => (
                <CanvasElement
                  key={element.id}
                  element={element}
                  isSelected={element.id === selectedElementId}
                  zoomLevel={zoomLevel}
                  canvasRef={canvasRef}
                />
              ))
            }

            {/* Drawing overlay */}
            {drawingState && (() => {
              const { start, current, isShiftPressed, isAltPressed } = drawingState;
              
              let left = Math.min(start.x, current.x);
              let top = Math.min(start.y, current.y);
              let width = Math.abs(current.x - start.x);
              let height = Math.abs(current.y - start.y);
              
              if (isShiftPressed) {
                const size = Math.max(width, height);
                width = size;
                height = size;
              }
              
              if (isAltPressed) {
                left = start.x - width / 2;
                top = start.y - height / 2;
              }
              
              return (
                <div
                  className="absolute pointer-events-none z-[100] border-2 border-blue-500 bg-blue-500/10 rounded"
                  style={{
                    left: left,
                    top: top,
                    width: width,
                    height: height,
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: '0 0'
                  }}
                >
                  <div 
                    className="absolute -top-8 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap"
                    style={{ transform: `scale(${1/zoomLevel})` }}
                  >
                    {Math.round(width)} × {Math.round(height)}
                    {isShiftPressed && <span className="ml-1">□</span>}
                    {isAltPressed && <span className="ml-1">⌥</span>}
                  </div>
                </div>
              );
            })()}

            {/* Enhanced drag-and-drop visual feedback */}
            <DragDropStyles />
          </div>
        </div>
      </div>
    </main>
  );
};

export default Canvas;