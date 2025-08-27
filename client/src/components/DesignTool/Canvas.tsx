import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { selectElement, addElement, moveElement, resizeElement, reorderElement, deleteElement, copyElement, cutElement, pasteElement } from '../../store/canvasSlice';
import { setDragging, setDragStart, setResizing, setResizeHandle, resetUI, setDraggedElement, setDraggingForReorder, setHoveredElement, setSelectedTool } from '../../store/uiSlice';
import { createDefaultElement, getElementAtPoint, calculateSnapPosition, isValidDropTarget, isPointAndClickTool, isDrawingTool, canAcceptChildren } from '../../utils/canvas';
import { detectInsertionZoneWithHysteresis, resetInsertionHysteresis } from '../../utils/insertionFeedback';
import { selectCurrentElements, selectSelectedElementId, selectCanvasProject, selectCanvasUIState } from '../../store/selectors';
import { ComponentDef, CanvasElement as CanvasElementType, Tool } from '../../types/canvas';
import CanvasElement from './CanvasElement';
import { useExpandedElements } from '../../hooks/useExpandedElements';
import DragFeedback from './DragFeedback';

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
  const canvasRef = useRef<HTMLDivElement>(null);
  const lastMousePos = useRef({ x: 0, y: 0 });
  
  // Local state
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
  const [hoveredZone, setHoveredZone] = useState<'before' | 'after' | 'inside' | 'canvas-top' | 'canvas-bottom' | null>(null);
  const [insertionIndicator, setInsertionIndicator] = useState<any | null>(null);
  const [isDraggingComponent, setIsDraggingComponent] = useState(false);
  const [dragThreshold, setDragThreshold] = useState({ x: 0, y: 0, exceeded: false });
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [inputModality, setInputModality] = useState<'mouse' | 'keyboard'>('mouse');
  const [isDragFromHandle, setIsDragFromHandle] = useState(false);
  
  // Drawing state for rubber-band rectangle
  const [drawingState, setDrawingState] = useState<{
    start: { x: number; y: number };
    current: { x: number; y: number };
    isShiftPressed: boolean;
    isAltPressed: boolean;
  } | null>(null);

  // Redux selectors
  const project = useSelector(selectCanvasProject);
  const { selectedTool, isDragging, dragStart, isResizing, resizeHandle, zoomLevel, isGridVisible, draggedElementId, isDraggingForReorder, isDOMTreePanelVisible, isComponentPanelVisible, settings } = useSelector(selectCanvasUIState);
  const currentBreakpoint = useSelector((state: RootState) => state.canvas.project.currentBreakpoint);
  const breakpoints = useSelector((state: RootState) => state.canvas.project.breakpoints);
  
  // Use centralized selectors for tab-based data
  const rawElements = useSelector(selectCurrentElements);
  const selectedElementId = useSelector(selectSelectedElementId);
  
  // Expand component instances to show their template children
  const currentElements = useExpandedElements(rawElements);

  const rootElement = currentElements.root;
  
  // Override root width based on current breakpoint
  const canvasWidth = breakpoints[currentBreakpoint]?.width || rootElement?.width || 375;

  // Calculate actual content bounds to handle elements positioned outside initial canvas
  const contentBounds = React.useMemo(() => {
    if (!currentElements || !rootElement) return { minY: 0, maxY: rootElement?.height || 800, width: canvasWidth };
    
    let minY = 0;  // Start from 0 (top of intended canvas)
    let maxY = rootElement.height || 800;  // Default canvas height
    
    // Check all elements for their actual positions
    Object.values(currentElements).forEach(element => {
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
  }, [Object.keys(currentElements).length, rootElement?.height, canvasWidth]);

  const selectedElement = selectedElementId ? currentElements[selectedElementId] : null;

  // Professional hit-testing that skips overlay elements during drag
  const deepestDroppableAt = useCallback((clientX: number, clientY: number): string | null => {
    const stack = document.elementsFromPoint(clientX, clientY);
    for (const el of stack) {
      if (!(el instanceof HTMLElement)) continue;
      
      // Skip overlay elements that should be click-through
      if (el.closest('[data-dnd-overlay="true"]')) continue;
      if (el.classList.contains('dnd-ghost') || 
          el.classList.contains('dnd-indicator') ||
          el.classList.contains('dnd-line') ||
          el.classList.contains('insertion-indicator') ||
          el.classList.contains('selection-overlay')) continue;
      
      // Find the closest droppable element
      const droppable = el.closest('[data-element-id]');
      if (droppable instanceof HTMLElement) {
        const elementId = droppable.dataset.elementId;
        if (elementId && elementId !== draggedElementId) {
          return elementId;
        }
      }
    }
    return 'root'; // Fallback to root
  }, [draggedElementId]);

  // Function to detect insertion zones based on mouse position with hysteresis
  const detectInsertionZone = useCallback((x: number, y: number, forDrag = false, forComponentDrag = false): InsertionIndicator | null => {
    // Allow insertion zone detection for:
    // 1. Element creation with specific tools
    // 2. Element reordering with hand tool
    // 3. Component dragging from panel
    if (!forComponentDrag && !forDrag && !['rectangle', 'text', 'image', 'container', 'component', 'heading', 'list', 'button',
              'input', 'textarea', 'checkbox', 'radio', 'select',
              'section', 'nav', 'header', 'footer', 'article',
              'video', 'audio', 'link', 'code', 'divider'].includes(selectedTool)) {
      return null;
    }
    if (forDrag && selectedTool !== 'hand') {
      return null;
    }

    // Use professional hit-testing for drag operations
    let hoveredElement;
    if (forDrag && canvasRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const clientX = canvasRect.left + (x * zoomLevel);
      const clientY = canvasRect.top + (y * zoomLevel);
      const elementId = deepestDroppableAt(clientX, clientY);
      hoveredElement = elementId ? currentElements[elementId] : null;
    } else {
      hoveredElement = getElementAtPoint(x, y, currentElements, zoomLevel, draggedElementId);
    }
    
    // Skip the dragged element itself during drag operations
    if (forDrag && draggedElementId && hoveredElement?.id === draggedElementId) {
      return null;
    }
    
    // Only show root insertion if no specific element found
    if (!hoveredElement) {
      return {
        position: 'inside',
        elementId: 'root',
        bounds: { x: 0, y: 0, width: rootElement.width, height: rootElement.height }
      };
    }

    // If we found root explicitly, only show if no other elements are at this point
    if (hoveredElement.id === 'root') {
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

    // Enhanced insertion zone detection with hysteresis buffer
    const relativeY = y - elementY;
    const midpoint = elementHeight / 2;
    
    // Check if element is a valid drop target (container)
    const isValidContainer = isValidDropTarget(hoveredElement);
    
    if (isValidContainer) {
      // For containers: default to "inside" unless cursor is very close to edges
      const edgeThreshold = Math.min(elementHeight * 0.2, 20); // 20% or 20px max
      
      if (relativeY < edgeThreshold) {
        // Top edge - before
        return {
          position: 'before',
          elementId: hoveredElement.id,
          bounds: { x: elementX, y: elementY - 2, width: elementWidth, height: 4 }
        };
      } else if (relativeY > elementHeight - edgeThreshold) {
        // Bottom edge - after
        return {
          position: 'after',
          elementId: hoveredElement.id,
          bounds: { x: elementX, y: elementY + elementHeight - 2, width: elementWidth, height: 4 }
        };
      } else {
        // Center - inside
        const children = hoveredElement.children || [];
        return {
          position: 'inside',
          elementId: hoveredElement.id,
          bounds: { x: elementX + 4, y: elementY + 4, width: elementWidth - 8, height: elementHeight - 8 },
          isEmpty: children.length === 0,
          insertAtBeginning: relativeY < midpoint
        };
      }
    } else {
      // For non-containers: use Y-midpoint comparison for before/after
      if (relativeY < midpoint) {
        return {
          position: 'before',
          elementId: hoveredElement.id,
          bounds: { x: elementX, y: elementY - 2, width: elementWidth, height: 4 }
        };
      } else {
        return {
          position: 'after',
          elementId: hoveredElement.id,
          bounds: { x: elementX, y: elementY + elementHeight - 2, width: elementWidth, height: 4 }
        };
      }
    }
  }, [selectedTool, currentElements, zoomLevel, rootElement, draggedElementId, deepestDroppableAt]);

  // Handle point-and-click insertion for content elements
  const handlePointAndClickInsertion = useCallback((x: number, y: number, tool: string, isShiftPressed: boolean, isAltPressed: boolean) => {
    // Find the insertion zone at this point
    const insertionZone = detectInsertionZone(x, y, false);
    
    if (!insertionZone) {
      // Fallback to root insertion
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
    
    // Determine insertion parameters based on the insertion zone
    let parentId = insertionZone.elementId;
    let insertPosition: 'before' | 'after' | 'inside' = 'inside';
    let referenceElementId: string | undefined;

    if ((insertionZone as any).position === 'before') {
      // Before element
      const targetElement = currentElements[insertionZone.elementId];
      parentId = targetElement?.parent || 'root';
      insertPosition = 'before';
      referenceElementId = insertionZone.elementId;
    } else if ((insertionZone as any).position === 'after') {
      // After element
      const targetElement = currentElements[insertionZone.elementId];
      parentId = targetElement?.parent || 'root';
      insertPosition = 'after';
      referenceElementId = insertionZone.elementId;
    } else {
      // Inside element
      parentId = insertionZone.elementId;
      insertPosition = 'inside';
      referenceElementId = undefined;
    }

    // Dispatch the add element action
    dispatch(addElement({
      element: newElement,
      parentId,
      insertPosition,
      referenceElementId
    }));

    // Select the newly created element
    dispatch(selectElement(newElement.id));

    // Clear any visual feedback
    setInsertionIndicator(null);
    setHoveredElementId(null);
    setHoveredZone(null);
    dispatch(setHoveredElement({ elementId: null, zone: null }));
  }, [detectInsertionZone, currentElements, dispatch]);

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
      const clickedElement = getElementAtPoint(x, y, currentElements, zoomLevel);
      if (clickedElement) {
        dispatch(selectElement(clickedElement.id));
      } else {
        dispatch(selectElement('root'));
      }
    } else if (selectedTool === 'hand') {
      // Hand tool for selection and drag preparation
      const clickedElement = getElementAtPoint(x, y, currentElements, zoomLevel);
      if (clickedElement && clickedElement.id !== 'root') {
        dispatch(selectElement(clickedElement.id));
      } else {
        dispatch(selectElement('root'));
      }
    }
  }, [selectedTool, zoomLevel, currentElements, dispatch]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
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
    
    // Only handle drawing for creation tools (exclude select and hand)
    if (['rectangle', 'text', 'image', 'container', 'heading', 'list', 'button',
         'input', 'textarea', 'checkbox', 'radio',
         'section', 'nav', 'header', 'footer', 'article',
         'video', 'audio', 'link', 'code', 'divider'].includes(selectedTool)) {
      
      e.preventDefault();
      e.stopPropagation();
      
      // Check if this is a point-and-click tool
      if (isPointAndClickTool(selectedTool as Tool)) {
        // Point-and-click insertion for content elements
        handlePointAndClickInsertion(x, y, selectedTool, e.shiftKey, e.altKey || e.metaKey);
        return;
      }
      
      // Drawing tools use the existing drawing behavior
      setDrawingState({
        start: { x, y },
        current: { x, y },
        isShiftPressed: e.shiftKey,
        isAltPressed: e.altKey || e.metaKey
      });
      
      return;
    }
    
    // Handle selection and hand tools
    if (['select', 'hand'].includes(selectedTool)) {
      const clickedElement = getElementAtPoint(x, y, currentElements, zoomLevel);
      if (clickedElement && clickedElement.id !== 'root') {
        dispatch(selectElement(clickedElement.id));
      } else {
        dispatch(selectElement('root'));
      }
    }
  }, [selectedTool, zoomLevel, currentElements, dispatch, handlePointAndClickInsertion]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    // Track mouse position for drag operations
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    
    const x = (e.clientX - rect.left) / zoomLevel;
    const y = (e.clientY - rect.top) / zoomLevel;
    
    // Update drawing state for rubber-band rectangles
    if (drawingState) {
      setDrawingState(prev => prev ? { ...prev, current: { x, y } } : null);
      return;
    }
    
    // Show insertion feedback for creation tools or during drag operations
    if (['rectangle', 'text', 'image', 'container', 'heading', 'list', 'button',
         'input', 'textarea', 'checkbox', 'radio', 'select',
         'section', 'nav', 'header', 'footer', 'article',
         'video', 'audio', 'link', 'code', 'divider'].includes(selectedTool) || isDraggingForReorder) {
      
      const insertionZone = detectInsertionZoneWithHysteresis(x, y, currentElements, isDraggingForReorder, false);
      
      if (insertionZone) {
        setHoveredElementId(insertionZone.elementId);
        setHoveredZone((insertionZone as any).position);
        setInsertionIndicator(insertionZone);
        
        // Update Redux state for visual feedback
        dispatch(setHoveredElement({ 
          elementId: insertionZone.elementId, 
          zone: (insertionZone as any).position 
        }));
      } else {
        // Clear feedback when no valid insertion zone
        setHoveredElementId(null);
        setHoveredZone(null);
        setInsertionIndicator(null);
        dispatch(setHoveredElement({ elementId: null, zone: null }));
      }
    }
  }, [zoomLevel, drawingState, selectedTool, isDraggingForReorder, currentElements, dispatch]);

  const handleMouseUp = useCallback(() => {
    // Handle drawing completion
    if (drawingState && selectedTool && isDrawingTool(selectedTool as Tool)) {
      const { start, current, isShiftPressed, isAltPressed } = drawingState;
      
      let left = Math.min(start.x, current.x);
      let top = Math.min(start.y, current.y);
      let width = Math.abs(current.x - start.x);
      let height = Math.abs(current.y - start.y);
      
      // Apply modifier key behaviors
      if (isShiftPressed) {
        // Shift key: make square
        const size = Math.max(width, height);
        width = size;
        height = size;
      }
      
      if (isAltPressed) {
        // Alt key: draw from center
        left = start.x - width / 2;
        top = start.y - height / 2;
      }
      
      // Minimum size check
      if (width > 5 && height > 5) {
        // Create element using drawing coordinates
        const newElement = createDefaultElement(selectedTool as Tool);
        newElement.x = left;
        newElement.y = top;
        newElement.width = width;
        newElement.height = height;
        
        // Enhanced drawing insertion using Y-position logic
        const canvasRect = canvasRef.current?.getBoundingClientRect();
        if (canvasRect) {
          const centerY = top + height / 2;
          
          // Find all elements to determine insertion position
          const rootChildren = rootElement.children || [];
          let insertPosition: 'before' | 'after' | 'inside' = 'inside';
          let referenceElementId: string | undefined;
          let targetParentId = 'root';
          
          // Check against existing elements for Y-position based insertion
          for (const childId of rootChildren) {
            const child = currentElements[childId];
            if (!child) continue;
            
            const childDiv = document.querySelector(`[data-element-id="${childId}"]`) as HTMLElement;
            if (!childDiv) continue;
            
            const childRect = childDiv.getBoundingClientRect();
            const childCanvasY = (childRect.top - canvasRect.top) / zoomLevel;
            const childMidpoint = childCanvasY + (childRect.height / zoomLevel) / 2;
            
            if (centerY < childMidpoint) {
              // Insert before this element
              insertPosition = 'before';
              referenceElementId = childId;
              break;
            }
          }
          
          // If no element found to insert before, append to end
          if (!referenceElementId) {
            insertPosition = 'inside';
          }
          
          dispatch(addElement({
            element: newElement,
            parentId: targetParentId,
            insertPosition,
            referenceElementId
          }));
          
          dispatch(selectElement(newElement.id));
        }
      }
      
      // Clear drawing state
      setDrawingState(null);
      return;
    }
    
    // Handle drag operations completion
    if (isDraggingForReorder && draggedElementId && insertionIndicator) {
      const draggedElement = currentElements[draggedElementId];
      
      if (draggedElement) {
        // Determine target based on insertion indicator
        let targetParentId = insertionIndicator.elementId;
        let insertPosition: 'before' | 'after' | 'inside' = 'inside';
        let referenceElementId = insertionIndicator.referenceElementId;
        
        if ((insertionIndicator as any).position === 'before') {
          const targetElement = currentElements[insertionIndicator.elementId];
          targetParentId = targetElement?.parent || 'root';
          insertPosition = 'before';
          referenceElementId = insertionIndicator.elementId;
        } else if ((insertionIndicator as any).position === 'after') {
          const targetElement = currentElements[insertionIndicator.elementId];
          targetParentId = targetElement?.parent || 'root';
          insertPosition = 'after';
          referenceElementId = insertionIndicator.elementId;
        } else if ((insertionIndicator as any).position === 'inside') {
          targetParentId = insertionIndicator.elementId;
          insertPosition = 'inside';
          referenceElementId = undefined;
        }
        
        // Perform the reorder operation
        dispatch(reorderElement({
          elementId: draggedElementId,
          newParentId: targetParentId,
          insertPosition,
          referenceElementId
        }));
      }
      
      // Clear drag state
      dispatch(setDraggedElement(null));
      dispatch(setDraggingForReorder(false));
      setHoveredElementId(null);
      setHoveredZone(null);
      setInsertionIndicator(null);
      dispatch(setHoveredElement({ elementId: null, zone: null }));
    }
  }, [drawingState, selectedTool, isDraggingForReorder, draggedElementId, insertionIndicator, currentElements, rootElement, dispatch, zoomLevel]);

  // Keyboard shortcuts for copy/cut/paste
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keyboard shortcuts when typing in input fields
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        return;
      }
      
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey;
      
      if (ctrlKey && selectedElementId && selectedElementId !== 'root') {
        if (e.key === 'c' || e.key === 'C') {
          e.preventDefault();
          dispatch(copyElement(selectedElementId));
        } else if (e.key === 'x' || e.key === 'X') {
          e.preventDefault();
          dispatch(cutElement(selectedElementId));
        }
      }
      
      if (ctrlKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        dispatch(pasteElement());
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, selectedElementId]);

  // Handle drop events for components
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const x = (e.clientX - rect.left) / zoomLevel;
      const y = (e.clientY - rect.top) / zoomLevel;
      
      const insertionZone = detectInsertionZoneWithHysteresis(x, y, currentElements, false, true);
      
      if (insertionZone) {
        setHoveredElementId(insertionZone.elementId);
        setHoveredZone((insertionZone as any).position);
        setInsertionIndicator(insertionZone);
        
        dispatch(setHoveredElement({ 
          elementId: insertionZone.elementId, 
          zone: (insertionZone as any).position 
        }));
      }
    }
  }, [zoomLevel, detectInsertionZoneWithHysteresis, currentElements, dispatch]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    try {
      const data = e.dataTransfer.getData('application/json');
      if (data) {
        const componentData = JSON.parse(data);
        
        if (componentData.type === 'component' && insertionIndicator) {
          // Handle component drop logic here
          const rect = canvasRef.current?.getBoundingClientRect();
          if (rect) {
            const x = (e.clientX - rect.left) / zoomLevel;
            const y = (e.clientY - rect.top) / zoomLevel;
            
            handlePointAndClickInsertion(x, y, 'component', false, false);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to parse drop data:', error);
    }
    
    // Clear visual feedback
    setIsDraggingComponent(false);
    setHoveredElementId(null);
    setHoveredZone(null);
    dispatch(setHoveredElement({ elementId: null, zone: null }));
    setInsertionIndicator(null);
  }, [zoomLevel, insertionIndicator, handlePointAndClickInsertion, dispatch]);

  // Clear drawing state when tool changes
  useEffect(() => {
    setDrawingState(null);
  }, [selectedTool]);

  return (
    <div className="canvas-wrapper h-full overflow-hidden bg-gray-50 dark:bg-gray-900 relative">
      <div className="canvas-toolbar bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-2 flex items-center gap-2">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Canvas {canvasWidth}×{rootElement?.height || 800}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[3rem] text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
        </div>
      </div>

      <div className="canvas-container flex-1 overflow-auto bg-white dark:bg-gray-900 relative">
        <div
          ref={canvasRef}
          className="canvas-content relative bg-white dark:bg-gray-900"
          style={{
            minWidth: `${canvasWidth}px`,
            minHeight: `${Math.max(rootElement?.height || 800, contentBounds.maxY - contentBounds.minY + 100)}px`,
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top left',
            paddingTop: contentBounds.minY < 0 ? Math.abs(contentBounds.minY) + 50 : 50,
            paddingBottom: '50px',
            paddingLeft: '0px',
            paddingRight: '0px',
          }}
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragLeave={() => {
            setIsDraggingComponent(false);
            setHoveredElementId(null);
            setHoveredZone(null);
            dispatch(setHoveredElement({ elementId: null, zone: null }));
            setInsertionIndicator(null);
          }}
        >
          {/* Drawing overlay for rubber-band rectangles */}
          {drawingState && (
            <div
              className="absolute pointer-events-none z-50"
              style={{
                left: Math.min(drawingState.start.x, drawingState.current.x),
                top: Math.min(drawingState.start.y, drawingState.current.y),
                width: Math.abs(drawingState.current.x - drawingState.start.x),
                height: Math.abs(drawingState.current.y - drawingState.start.y),
                border: '2px dashed #3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderRadius: '4px',
              }}
            />
          )}

          {/* Enhanced visual feedback with comprehensive accessibility */}
          <DragFeedback
            hoveredElementId={hoveredElementId}
            hoveredZone={hoveredZone}
            insertionIndicator={insertionIndicator}
            currentElements={currentElements}
            zoomLevel={zoomLevel}
          />

          {/* Render all canvas elements */}
          {rootElement && (
            <CanvasElement
              key={rootElement.id}
              element={rootElement}
              isSelected={selectedElementId === rootElement.id}
              isContainer={true}
              allElements={currentElements}
              rootElement={rootElement}
              canvasWidth={canvasWidth}
              isHovered={hoveredElementId === rootElement.id}
              insertionIndicator={hoveredElementId === rootElement.id ? insertionIndicator : null}
              depth={0}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Canvas;
