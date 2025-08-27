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
  }, [currentElements, rootElement, canvasWidth]);
  
  const contentBounds = calculateContentBounds();
  

  const selectedElement = selectedElementId ? currentElements[selectedElementId] : null;

  // Check if we have imported elements that need Shadow DOM isolation
  const hasImportedElements = Object.values(currentElements).some(element => 
    element?.classes?.includes('_imported-element')
  );
  
  // Get imported CSS for Shadow DOM if available
  const importedCSS = (window as any).lastImportedCSS;
  const importScope = (window as any).lastImportScope;

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

  // Update the detectInsertionZone dependency array to include the new function

  // Function to detect insertion zones based on mouse position
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

    // ENHANCED: Check for canvas padding areas first (top/bottom document insertion)
    const canvasContainer = canvasRef.current?.getBoundingClientRect();
    if (canvasContainer) {
      const canvasY = (y * zoomLevel);
      const paddingTop = contentBounds.minY < 0 ? Math.abs(contentBounds.minY) + 50 : 50;
      const paddingBottom = 50;
      const canvasHeight = Math.max(rootElement.height, contentBounds.maxY - contentBounds.minY + 100);
      
      // Check if mouse is in top padding area (document start)
      if (canvasY < paddingTop) {
        return {
          position: 'canvas-top' as any,
          elementId: 'root',
          bounds: { x: 0, y: 0, width: rootElement.width, height: 12 } // Thin line at top
        };
      }
      
      // Check if mouse is in bottom padding area (document end)  
      if (canvasY > (canvasHeight - paddingBottom)) {
        const rootChildren = rootElement.children || [];
        let insertionY = 0;
        
        if (rootChildren.length > 0) {
          // Find the bottom of the last element
          const lastChildId = rootChildren[rootChildren.length - 1];
          const lastChild = currentElements[lastChildId];
          if (lastChild) {
            const lastChildDiv = document.querySelector(`[data-element-id="${lastChildId}"]`) as HTMLElement;
            if (lastChildDiv) {
              const lastChildRect = lastChildDiv.getBoundingClientRect();
              insertionY = ((lastChildRect.bottom - canvasContainer.top) / zoomLevel) + 20; // 20px gap after last element
            }
          }
        } else {
          insertionY = paddingTop + 20; // Default position if no children
        }
        
        return {
          position: 'canvas-bottom' as any,
          elementId: 'root',
          bounds: { x: 0, y: insertionY, width: rootElement.width, height: 12 } // Thin line at bottom
        };
      }
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
    
    // console.log('detectInsertionZone - hoveredElement:', hoveredElement?.id);
    
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

    // PROFESSIONAL BAND DETECTION - Per acceptance criteria
    const relativeY = y - elementY;
    const relativePercent = relativeY / elementHeight;
    
    // Band detection as per specs: Top 0-25%, Middle 25-75%, Bottom 75-100%
    const TOP_BAND_END = 0.25;      // 25% from top
    const BOTTOM_BAND_START = 0.75; // 75% from top
    
    // Hysteresis to prevent flicker (6-10px movement required)
    const HYSTERESIS_PX = 8;
    
    // Check if element is a valid drop target (container)
    const isValidContainer = isValidDropTarget(hoveredElement);
    
    if (isValidContainer) {
      const children = hoveredElement.children || [];
      
      if (children.length > 0 && forDrag) {
        // For containers with children, detect insertion points between siblings
        const insertionPoint = detectSiblingInsertionPoint(x, y, hoveredElement.id, children);
        if (insertionPoint) {
          return insertionPoint;
        }
      }
      
      if (relativePercent < TOP_BAND_END) {
        // TOP BAND (0-25%): Above indicator
        return {
          position: 'before',
          elementId: hoveredElement.id,
          bounds: { x: elementX, y: elementY - 1, width: elementWidth, height: 2 } // 2px line as per specs
        };
      } else if (relativePercent > BOTTOM_BAND_START) {
        // BOTTOM BAND (75-100%): Below indicator  
        return {
          position: 'after',
          elementId: hoveredElement.id,
          bounds: { x: elementX, y: elementY + elementHeight - 1, width: elementWidth, height: 2 } // 2px line as per specs
        };
      } else {
        // MIDDLE BAND (25-75%): Inside zone for containers - padded rectangle as per specs
        if (children.length === 0) {
          return {
            position: 'inside',
            elementId: hoveredElement.id,
            bounds: { x: elementX + 4, y: elementY + 4, width: elementWidth - 8, height: elementHeight - 8 },
            isEmpty: true,
            insertAtBeginning: relativePercent < 0.5
          };
        } else {
          return {
            position: 'inside',
            elementId: hoveredElement.id,
            bounds: { x: elementX + 4, y: elementY + 4, width: elementWidth - 8, height: elementHeight - 8 },
            isEmpty: false
          };
        }
      }
    } else {
      // For non-container elements - band detection (no inside option)
      if (relativePercent < TOP_BAND_END) {
        return {
          position: 'before',
          elementId: hoveredElement.id,
          bounds: { x: elementX, y: elementY - 1, width: elementWidth, height: 2 } // 2px line as per specs
        };
      } else if (relativePercent > BOTTOM_BAND_START) {
        return {
          position: 'after',
          elementId: hoveredElement.id,
          bounds: { x: elementX, y: elementY + elementHeight - 1, width: elementWidth, height: 2 } // 2px line as per specs
        };
      } else {
        // MIDDLE BAND (25-75%): No insertion feedback for non-containers
        return null;
      }
    }
  }, [selectedTool, currentElements, zoomLevel, rootElement, draggedElementId]);

  // New function to detect insertion points between sibling elements
  const detectSiblingInsertionPoint = useCallback((x: number, y: number, containerId: string, childIds: string[]) => {
    const container = currentElements[containerId];
    if (!container) return null;

    // Get container bounds
    const containerDiv = document.querySelector(`[data-element-id="${containerId}"]`) as HTMLElement;
    if (!containerDiv) return null;

    const containerRect = containerDiv.getBoundingClientRect();
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return null;

    const containerX = (containerRect.left - canvasRect.left) / zoomLevel;
    const containerY = (containerRect.top - canvasRect.top) / zoomLevel;
    const containerWidth = containerRect.width / zoomLevel;

    // Check each child element to find insertion points
    for (let i = 0; i < childIds.length; i++) {
      const childId = childIds[i];
      const child = currentElements[childId];
      if (!child || child.id === draggedElementId) continue;

      const childDiv = document.querySelector(`[data-element-id="${childId}"]`) as HTMLElement;
      if (!childDiv) continue;

      const childRect = childDiv.getBoundingClientRect();
      const childX = (childRect.left - canvasRect.left) / zoomLevel;
      const childY = (childRect.top - canvasRect.top) / zoomLevel;
      const childHeight = childRect.height / zoomLevel;
      const childBottom = childY + childHeight;

      // Enhanced insertion point detection with better spacing
      const nextChildId = childIds[i + 1];
      let insertionY: number;
      const insertionGap = 12; // Gap to show between siblings
      
      if (nextChildId) {
        const nextChild = currentElements[nextChildId];
        if (nextChild && nextChild.id !== draggedElementId) {
          const nextChildDiv = document.querySelector(`[data-element-id="${nextChildId}"]`) as HTMLElement;
          if (nextChildDiv) {
            const nextChildRect = nextChildDiv.getBoundingClientRect();
            const nextChildY = (nextChildRect.top - canvasRect.top) / zoomLevel;
            
            // Check if mouse is between current child and next child with expanded detection zone
            const gapStart = childBottom - 4; // Start detection slightly before child bottom
            const gapEnd = nextChildY + 4;     // End detection slightly after next child top
            
            if (y >= gapStart && y <= gapEnd) {
              insertionY = childBottom + (nextChildY - childBottom) / 2;
              
              return {
                position: 'between' as any,
                elementId: containerId,
                referenceElementId: nextChildId,
                insertPosition: 'before' as any,
                bounds: { x: containerX, y: insertionY - 2, width: containerWidth, height: 4 },
                spacingOffset: insertionGap  // For visual sibling spacing
              };
            }
          }
        }
      } else {
        // Check if mouse is after the last child (expanded zone)
        if (y >= childBottom - 4) {
          insertionY = childBottom + insertionGap;
          
          return {
            position: 'between' as any,
            elementId: containerId,
            referenceElementId: null,
            insertPosition: 'inside' as any,
            bounds: { x: containerX, y: insertionY - 2, width: containerWidth, height: 4 }
          };
        }
      }
      
      // Check if mouse is before the first child (expanded zone)
      if (i === 0 && y <= childY + 4) {
        insertionY = childY - insertionGap;
        
        return {
          position: 'between' as any,
          elementId: containerId,
          referenceElementId: childId,
          insertPosition: 'before' as any,
          bounds: { x: containerX, y: insertionY - 2, width: containerWidth, height: 4 },
          spacingOffset: insertionGap  // For visual sibling spacing
        };
      }
    }

    return null;
  }, [currentElements, zoomLevel, draggedElementId]);

  // NEW DnD SYSTEM: Handle point-and-click insertion for content elements using proper HTML semantics
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
      const element = currentElements[id];
      return element ? createComponentMeta(element) : null;
    };
    
    const getParentId = (id: string) => {
      if (id === "root") return null;
      const element = currentElements[id];
      return element?.parent || "root";
    };
    
    const indexOf = (parentId: string, childId: string) => {
      if (parentId === "root") {
        return Object.values(currentElements)
          .filter(el => el.parent === "root" || !el.parent)
          .findIndex(el => el.id === childId);
      }
      const parent = currentElements[parentId];
      return parent?.children?.indexOf(childId) || 0;
    };
    
    const getChildren = (parentId: string) => {
      if (parentId === "root") {
        return Object.values(currentElements)
          .filter(el => el.parent === "root" || !el.parent)
          .map(el => el.id);
      }
      const parent = currentElements[parentId];
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

    // Clear any visual feedback
    setInsertionIndicator(null);
    setHoveredElementId(null);
    setHoveredZone(null);
    dispatch(setHoveredElement({ elementId: null, zone: null }));
  }, [currentElements, dispatch, zoomLevel]);

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
    
    // console.log('Canvas click triggered - selectedTool:', selectedTool);
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
        // Don't start drag on click, only on mouse down
      } else {
        dispatch(selectElement('root'));
      }
    // Creation tools are now handled by the drawing overlay - no click handling needed
    }
  }, [selectedTool, zoomLevel, currentElements, dispatch, hoveredElementId, hoveredZone]);

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
      // console.log('DRAG DEBUG - Mouse down:', { selectedTool, selectedElementId: selectedElement?.id });
      
      if (selectedTool === 'select') {
        // Selection tool should only select elements, never create new ones
        const clickedElement = getElementAtPoint(x, y, currentElements, zoomLevel);
        if (clickedElement && clickedElement.id !== 'root') {
          dispatch(selectElement(clickedElement.id));
        } else {
          // Click on empty space - select root
          dispatch(selectElement('root'));
        }
      } else if (selectedTool === 'hand') {
        // With new drag handle system, regular clicks on elements should only select
        // Dragging only happens from drag handles (handled by dragHandleMouseDown event)
        const clickedElement = getElementAtPoint(x, y, currentElements, zoomLevel);
        if (clickedElement && clickedElement.id !== 'root') {
          // console.log('DRAG DEBUG - Hand tool clicked element (selection only):', clickedElement.id);
          dispatch(selectElement(clickedElement.id));
          
          // Click-to-move behavior (if enabled in settings)
          if (settings.enableClickToMove) {
            // console.log('DRAG DEBUG - Click-to-move enabled - implement later');
            // TODO: Implement click-to-move behavior
          }
        } else {
          // Click on empty space - select root
          dispatch(selectElement('root'));
        }
      }
    }
  }, [selectedTool, selectedElement, zoomLevel, dispatch, currentElements, settings]);

  // Handle drag handle mouse down events
  useEffect(() => {
    const handleDragHandleMouseDown = (e: CustomEvent) => {
      const { elementId, originalEvent } = e.detail;
      // Received drag handle event
      
      // Get canvas rect for coordinate calculation
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const x = (originalEvent.clientX - rect.left) / zoomLevel;
      const y = (originalEvent.clientY - rect.top) / zoomLevel;
      
      // Select the element and immediately start dragging
      dispatch(selectElement(elementId));
      setDragStartPos({ x, y });
      setDragThreshold({ x, y, exceeded: true }); // Immediately mark as exceeded
      dispatch(setDraggedElement(elementId));
      dispatch(setDraggingForReorder(true)); // Start dragging immediately
      setIsDragFromHandle(true);
      
      // Drag started immediately on mousedown
    };

    window.addEventListener('dragHandleMouseDown', handleDragHandleMouseDown as EventListener);
    return () => window.removeEventListener('dragHandleMouseDown', handleDragHandleMouseDown as EventListener);
  }, [zoomLevel, dispatch]);

  const handleMouseMoveInternal = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    // Track mouse position for drag operations
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    
    // Allow unconstrained coordinates for natural drawing outside canvas
    const x = (e.clientX - rect.left) / zoomLevel;
    const y = (e.clientY - rect.top) / zoomLevel;
    
    // Handle active drawing - no constraints, allow expansion
    if (drawingState) {
      setDrawingState(prev => prev ? {
        ...prev,
        current: { x, y },
        isShiftPressed: e.shiftKey,
        isAltPressed: e.altKey || e.metaKey
      } : null);
      return;
    }
    
    // For creation tools, handle insertion indicators based on tool type
    if (['rectangle', 'text', 'image', 'container', 'heading', 'list', 'button',
         'input', 'textarea', 'checkbox', 'radio',
         'section', 'nav', 'header', 'footer', 'article',
         'video', 'audio', 'link', 'code', 'divider'].includes(selectedTool)) {
      
      // NEW DnD SYSTEM: Show insertion indicators for point-and-click tools
      if (isPointAndClickTool(selectedTool as Tool)) {
        // Use new DnD system for element insertion
        const candidateIds = getCandidateContainerIds({ x: e.clientX, y: e.clientY });
        const elementMeta = createElementMetaForInsertion(selectedTool);
        
        // Create helper functions for the new DnD system
        const getMeta = (id: string) => {
          if (id === "root") {
            return { id: "root", tag: "DIV", acceptsChildren: true };
          }
          const element = currentElements[id];
          return element ? createComponentMeta(element) : null;
        };
        
        const getParentId = (id: string) => {
          if (id === "root") return null;
          const element = currentElements[id];
          return element?.parent || "root";
        };
        
        const indexOf = (parentId: string, childId: string) => {
          if (parentId === "root") {
            return Object.values(currentElements)
              .filter(el => el.parent === "root" || !el.parent)
              .findIndex(el => el.id === childId);
          }
          const parent = currentElements[parentId];
          return parent?.children?.indexOf(childId) || 0;
        };
        
        const getChildren = (parentId: string) => {
          if (parentId === "root") {
            return Object.values(currentElements)
              .filter(el => el.parent === "root" || !el.parent)
              .map(el => el.id);
          }
          const parent = currentElements[parentId];
          return parent?.children || [];
        };
        
        // Get legal drop location using new system
        const drop = chooseDropForNewElement(
          { x: e.clientX, y: e.clientY },
          candidateIds,
          elementMeta,
          getMeta,
          getParentId,
          indexOf,
          getChildren
        );
        
        if (drop) {
          // Convert new DnD format to old insertion zone format for compatibility
          const targetElement = currentElements[drop.parentId];
          if (targetElement) {
            const insertionZone = {
              elementId: drop.parentId,
              position: drop.kind === "into" ? "inside" : "between",
              bounds: { x: 0, y: 0, width: 100, height: 100 }, // Placeholder bounds
              index: drop.index
            };
            
            stableDragTarget.updateTarget({
              elementId: drop.parentId,
              zone: drop.kind === "into" ? "inside" : "between" as any,
              bounds: insertionZone.bounds
            }, x, y, (target) => {
              setHoveredElementId(target.elementId);
              setHoveredZone(target.zone);
              dispatch(setHoveredElement({ 
                elementId: target.elementId, 
                zone: target.zone
              }));
              setInsertionIndicator(insertionZone);
            });
          }
        } else {
          // No valid insertion zone
          stableDragTarget.clearTarget();
          setInsertionIndicator(null);
          setHoveredElementId(null);
          setHoveredZone(null);
          dispatch(setHoveredElement({ elementId: null, zone: null }));
        }
        return;
      }
      
      // For drawing tools, only clear indicators when not actively drawing
      if (!drawingState) {
        // Clear insertion indicators for drawing mode when mouse is just hovering
        setInsertionIndicator(null);
        setHoveredElementId(null);
        setHoveredZone(null);
        dispatch(setHoveredElement({ elementId: null, zone: null }));
      }
      return; // Early return to avoid processing other hover logic
    }
    
    // Check if mouse button is down (only for real React events, not synthetic ones)
    const isMouseButtonDown = e.buttons > 0;
    
    if (isDragging && selectedElement && dragStart) {
      // Regular element dragging (select tool)
      const snappedPosition = calculateSnapPosition(x - dragStart.x, y - dragStart.y);
      
      dispatch(moveElement({
        id: selectedElement.id,
        x: snappedPosition.x,
        y: snappedPosition.y,
      }));
    } else if (draggedElementId) {
      // Handle drag threshold and reordering logic
      if (!dragThreshold.exceeded && !isDragFromHandle) {
        const distance = Math.sqrt(
          Math.pow(x - dragThreshold.x, 2) + Math.pow(y - dragThreshold.y, 2)
        );
        
        const DRAG_THRESHOLD = 8; // pixels - require actual drag movement
        
        if (distance > DRAG_THRESHOLD) {
          // Threshold exceeded, starting drag
          setDragThreshold(prev => ({ ...prev, exceeded: true }));
          dispatch(setDraggingForReorder(true));
          dispatch(setDragStart({ x: dragThreshold.x, y: dragThreshold.y }));
        } else {
          // Below threshold - no drag feedback yet
          return;
        }
      }
      
      // Element reordering (hand tool) - show precise insertion feedback
      // console.log('DRAG DEBUG - Mouse move during drag:', {
      //   draggedElementId, 
      //   x, y, 
      //   thresholdExceeded: dragThreshold.exceeded
      // });
      
      // DISABLE OLD DRAG SYSTEM entirely - HTML5 drag will handle this
      return; // Skip the entire old drag system
      
      // OLD SYSTEM BELOW (disabled) - keeping for reference
      // NEW DnD SYSTEM: Only show insertion feedback if we're actually dragging
      if (isDraggingForReorder && draggedElementId) {
        // Use new DnD system for element reordering validation
        const draggedElement = currentElements[draggedElementId];
        if (!draggedElement) return;
        

        
        // Get candidate containers for the dragged element
        const candidateIds = getCandidateContainerIds({ x: e.clientX, y: e.clientY });
        const draggedMeta = createComponentMeta(draggedElement);
        
        // Create helper functions for the new DnD system
        const getMeta = (id: string) => {
          if (id === "root") {
            return { id: "root", tag: "DIV", acceptsChildren: true };
          }
          if (id === draggedElementId) {
            return draggedMeta; // Return meta for the dragged element itself
          }
          const element = currentElements[id];
          return element ? createComponentMeta(element) : null;
        };
        
        const getParentId = (id: string) => {
          if (id === "root") return null;
          const element = currentElements[id];
          return element?.parent || "root";
        };
        
        const indexOf = (parentId: string, childId: string) => {
          if (parentId === "root") {
            return Object.values(currentElements)
              .filter(el => el.parent === "root" || !el.parent)
              .findIndex(el => el.id === childId);
          }
          const parent = currentElements[parentId];
          return parent?.children?.indexOf(childId) || 0;
        };
        
        const getChildren = (parentId: string) => {
          if (parentId === "root") {
            return Object.values(currentElements)
              .filter(el => el.parent === "root" || !el.parent)
              .map(el => el.id);
          }
          const parent = currentElements[parentId];
          return parent?.children || [];
        };
        
        // Get legal drop location using new DnD system
        const drop = chooseDropForNewElement(
          { x: e.clientX, y: e.clientY },
          candidateIds,
          draggedMeta,
          getMeta,
          getParentId,
          indexOf,
          getChildren
        );
        
        if (drop) {

          
          // Convert new DnD format to old insertion zone format for compatibility
          const insertionZone = {
            elementId: drop.parentId,
            position: drop.kind === "into" ? "inside" : "between",
            bounds: { x: 0, y: 0, width: 100, height: 100 }, // Placeholder bounds
            index: drop.index
          };
          
          const insertionPosition = drop.kind === "into" ? "inside" : "inside";
          
          setHoveredElementId(drop.parentId);
          setHoveredZone(insertionPosition);
          
          // Update Redux state for visual feedback 
          dispatch(setHoveredElement({ 
            elementId: drop.parentId, 
            zone: insertionPosition
          }));
          
          // Store the insertion indicator for visual feedback
          setInsertionIndicator(insertionZone);
          
          // Apply padding expansion for better targeting
          const targetElement = currentElements[drop.parentId];
          if (targetElement && (targetElement.isContainer || targetElement.type === 'container' || targetElement.type === 'rectangle')) {
            setExpandedContainerId(drop.parentId);
          }
        } else {

          // No valid drop location found, clear feedback
          setHoveredElementId(null);
          setHoveredZone(null);
          dispatch(setHoveredElement({ elementId: null, zone: null }));
          setInsertionIndicator(null);
          setExpandedContainerId(null);
        }
      } else {
        setHoveredElementId(null);
        setHoveredZone(null);
        dispatch(setHoveredElement({ elementId: null, zone: null }));
        setInsertionIndicator(null);
        setExpandedContainerId(null);
      }
    } else if (selectedTool === 'select' || selectedTool === 'hand') {
      // Handle selection/hand tool hover detection - NO insertion indicators
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
      // Always clear insertion indicators for selection tools
      setInsertionIndicator(null);
    } else {
      // Clear hover state and insertion indicators for other tools
      setHoveredElementId(null);
      setHoveredZone(null);
      dispatch(setHoveredElement({ elementId: null, zone: null }));
      setInsertionIndicator(null);
    }
  }, [isDragging, isDraggingForReorder, selectedElementId, draggedElementId, dragStart, zoomLevel, dispatch, selectedTool, expandedElements, dragThreshold, drawingState, stableDragTarget]);

  // Throttled mouse move handler to improve performance
  const handleMouseMove = useThrottledMouseMove(handleMouseMoveInternal, 16);

  const handleMouseUp = useCallback((e?: MouseEvent) => {
    // Handle drawing completion FIRST
    if (drawingState) {
      
      const { start, current, isShiftPressed, isAltPressed } = drawingState;
      
      // Calculate rectangle dimensions
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
        // Convert canvas coordinates to screen coordinates for the committer
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const screenRect = {
            left: left * zoomLevel + rect.left,
            top: top * zoomLevel + rect.top,
            width: width * zoomLevel,
            height: height * zoomLevel
          };
          
          // Use the drawing committer to create the element
          commitDrawnRect(
            screenRect,
            selectedTool as Tool,
            { shift: isShiftPressed, alt: isAltPressed }
          );
        }
      }
      
      // Clear drawing state
      setDrawingState(null);
      return;
    }
    
    // console.log('DRAG DEBUG - Mouse up:', { isDraggingForReorder, draggedElementId, hoveredElementId, hoveredZone, insertionIndicator });
    
    if (isDraggingForReorder && draggedElementId) {
      const draggedElement = currentElements[draggedElementId];
      if (!draggedElement) return;
      
      // NEW DnD SYSTEM: Use new system for final drop validation and insertion
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      // Get candidate containers for the dragged element
      const candidateIds = getCandidateContainerIds({ x: lastMousePos.current.x, y: lastMousePos.current.y });
      const draggedMeta = createComponentMeta(draggedElement);
      
      // Create helper functions for the new DnD system
      const getMeta = (id: string) => {
        if (id === "root") {
          return { id: "root", tag: "DIV", acceptsChildren: true };
        }
        if (id === draggedElementId) {
          return draggedMeta; // Return meta for the dragged element itself
        }
        const element = currentElements[id];
        return element ? createComponentMeta(element) : null;
      };
      
      const getParentId = (id: string) => {
        if (id === "root") return null;
        const element = currentElements[id];
        return element?.parent || "root";
      };
      
      const indexOf = (parentId: string, childId: string) => {
        if (parentId === "root") {
          return Object.values(currentElements)
            .filter(el => el.parent === "root" || !el.parent)
            .findIndex(el => el.id === childId);
        }
        const parent = currentElements[parentId];
        return parent?.children?.indexOf(childId) || 0;
      };
      
      const getChildren = (parentId: string) => {
        if (parentId === "root") {
          return Object.values(currentElements)
            .filter(el => el.parent === "root" || !el.parent)
            .map(el => el.id);
        }
        const parent = currentElements[parentId];
        return parent?.children || [];
      };
      
      // Get legal drop location using new DnD system
      const candidateIds2 = getCandidateContainerIds({ x: lastMousePos.current.x, y: lastMousePos.current.y });
      const drop = chooseDropForNewElement(
        { x: lastMousePos.current.x, y: lastMousePos.current.y },
        candidateIds2,
        draggedMeta,
        getMeta,
        getParentId,
        indexOf,
        getChildren
      );
      
      if (drop) {
        // Convert new DnD format to reorder parameters
        let insertPosition: 'before' | 'after' | 'inside' = drop.kind === "into" ? 'inside' : 'before';
        let referenceElementId: string | undefined;
        
        if (drop.kind === "between" && typeof drop.index === "number") {
          // For between insertion, find the reference element
          const siblings = getChildren(drop.parentId);
          if (drop.index < siblings.length) {
            referenceElementId = siblings[drop.index];
            insertPosition = 'before';
          } else {
            // Insert at end
            insertPosition = 'inside';
          }
        }
        
        // Perform the reordering using validated drop location
        dispatch(reorderElement({
          elementId: draggedElementId,
          newParentId: drop.parentId,
          insertPosition,
          referenceElementId
        }));
      } else {
        // Fallback to root insertion if no valid drop found
        dispatch(reorderElement({
          elementId: draggedElementId,
          newParentId: 'root',
          insertPosition: 'inside'
        }));
      }
    }
    
    // Reset all drag states
    // console.log('DRAG DEBUG - Resetting all drag states');
    dispatch(setDragging(false));
    dispatch(setResizing(false));
    dispatch(setDraggingForReorder(false));
    dispatch(setDraggedElement(undefined));
    setInsertionIndicator(null);
    setHoveredElementId(null);
    setHoveredZone(null);
    dispatch(setHoveredElement({ elementId: null, zone: null }));
    dispatch(resetUI());
    
    // Reset drag threshold and expanded container
    setDragThreshold({ x: 0, y: 0, exceeded: false });
    setExpandedContainerId(null);
    
    // Auto-switch to selection tool after successful drag from handle
    if (isDragFromHandle && isDraggingForReorder && draggedElementId) {
      // console.log('DRAG HANDLE DEBUG - Auto-switching to selection tool after drag completion');
      dispatch(setSelectedTool('select'));
    }
    setIsDragFromHandle(false);
  }, [dispatch, isDraggingForReorder, draggedElementId, hoveredElementId, hoveredZone, insertionIndicator, currentElements, dragThreshold, setDragThreshold, isDragFromHandle, drawingState, selectedTool, commitDrawnRect]);

  // HTML5 Drag and Drop event handlers for the canvas
  const handleCanvasDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    console.log('🎯 CANVAS DRAG OVER - HTML5 System Active', e.clientX, e.clientY);
    
    // Use the DnD system to determine drop location and show visual feedback
    const candidateIds = getCandidateContainerIds({ x: e.clientX, y: e.clientY });
    
    try {
      const dragData = e.dataTransfer.getData('application/json');
      if (!dragData) return;
      
      const data = JSON.parse(dragData);
      if (data.type === 'canvas-element' && data.elementId) {
        const draggedElement = currentElements[data.elementId];
        if (!draggedElement) return;
        
        const draggedMeta = createComponentMeta(draggedElement);
        
        // Helper functions for DnD system
        const getMeta = (id: string) => {
          if (id === "root") {
            return { id: "root", tag: "DIV", acceptsChildren: true };
          }
          if (id === data.elementId) {
            return draggedMeta;
          }
          const element = currentElements[id];
          return element ? createComponentMeta(element) : null;
        };
        
        const getParentId = (id: string) => {
          if (id === "root") return null;
          const element = currentElements[id];
          return element?.parent || "root";
        };
        
        const indexOf = (parentId: string, childId: string) => {
          if (parentId === "root") {
            return Object.values(currentElements)
              .filter(el => el.parent === "root" || !el.parent)
              .findIndex(el => el.id === childId);
          }
          const parent = currentElements[parentId];
          return parent?.children?.indexOf(childId) || 0;
        };
        
        const getChildren = (parentId: string) => {
          if (parentId === "root") {
            return Object.values(currentElements)
              .filter(el => el.parent === "root" || !el.parent)
              .map(el => el.id);
          }
          const parent = currentElements[parentId];
          return parent?.children || [];
        };
        
        // Get legal drop location
        const drop = chooseDropForNewElement(
          { x: e.clientX, y: e.clientY },
          candidateIds,
          draggedMeta,
          getMeta,
          getParentId,
          indexOf,
          getChildren
        );
        
        if (drop) {
          console.log('✅ DROP LOCATION FOUND:', drop);
          // Create visual insertion indicator based on drop location
          let indicatorPosition: 'before' | 'after' | 'inside' | 'canvas-top' | 'canvas-bottom';
          let targetElementId = drop.parentId;
          
          if (drop.kind === "between" && typeof drop.index === "number") {
            const siblings = getChildren(drop.parentId);
            
            if (drop.index === 0) {
              // Insert at beginning
              if (siblings.length > 0) {
                targetElementId = siblings[0];
                indicatorPosition = 'before';
              } else {
                indicatorPosition = 'inside'; // Empty container
              }
            } else if (drop.index >= siblings.length) {
              // Insert at end
              if (siblings.length > 0) {
                targetElementId = siblings[siblings.length - 1];
                indicatorPosition = 'after';
              } else {
                indicatorPosition = 'inside'; // Empty container
              }
            } else {
              // Insert between siblings
              targetElementId = siblings[drop.index];
              indicatorPosition = 'before';
            }
          } else {
            // "into" drop
            indicatorPosition = 'inside';
          }
          
          // Get element bounds for visual indicator
          const targetElement = document.querySelector(`[data-element-id="${targetElementId}"]`) as HTMLElement;
          if (targetElement) {
            const canvasRect = canvasRef.current!.getBoundingClientRect();
            const elementRect = targetElement.getBoundingClientRect();
            
            const relativeX = (elementRect.left - canvasRect.left) / zoomLevel;
            const relativeY = (elementRect.top - canvasRect.top) / zoomLevel;
            const relativeWidth = elementRect.width / zoomLevel;
            const relativeHeight = elementRect.height / zoomLevel;
            
            let bounds;
            if (indicatorPosition === 'before') {
              bounds = {
                x: relativeX,
                y: relativeY - 1,
                width: relativeWidth,
                height: 2
              };
            } else if (indicatorPosition === 'after') {
              bounds = {
                x: relativeX,
                y: relativeY + relativeHeight - 1,
                width: relativeWidth,
                height: 2
              };
            } else {
              // inside
              bounds = {
                x: relativeX,
                y: relativeY,
                width: relativeWidth,
                height: relativeHeight
              };
            }
            
            console.log('📍 SHOWING VISUAL INDICATOR:', indicatorPosition, bounds);
            setInsertionIndicator({
              bounds,
              position: indicatorPosition as any
            });
          }
        } else {
          setInsertionIndicator(null);
        }
      }
    } catch (error) {
      // Invalid drag data
    }
  }, [currentElements, dispatch]);

  const handleCanvasDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    try {
      const dragData = e.dataTransfer.getData('application/json');
      if (!dragData) return;
      
      const data = JSON.parse(dragData);
      if (data.type === 'canvas-element' && data.elementId) {
        const draggedElement = currentElements[data.elementId];
        if (!draggedElement) return;
        
        const candidateIds = getCandidateContainerIds({ x: e.clientX, y: e.clientY });
        const draggedMeta = createComponentMeta(draggedElement);
        
        // Same helper functions as dragOver
        const getMeta = (id: string) => {
          if (id === "root") {
            return { id: "root", tag: "DIV", acceptsChildren: true };
          }
          if (id === data.elementId) {
            return draggedMeta;
          }
          const element = currentElements[id];
          return element ? createComponentMeta(element) : null;
        };
        
        const getParentId = (id: string) => {
          if (id === "root") return null;
          const element = currentElements[id];
          return element?.parent || "root";
        };
        
        const indexOf = (parentId: string, childId: string) => {
          if (parentId === "root") {
            return Object.values(currentElements)
              .filter(el => el.parent === "root" || !el.parent)
              .findIndex(el => el.id === childId);
          }
          const parent = currentElements[parentId];
          return parent?.children?.indexOf(childId) || 0;
        };
        
        const getChildren = (parentId: string) => {
          if (parentId === "root") {
            return Object.values(currentElements)
              .filter(el => el.parent === "root" || !el.parent)
              .map(el => el.id);
          }
          const parent = currentElements[parentId];
          return parent?.children || [];
        };
        
        // Get legal drop location
        const drop = chooseDropForNewElement(
          { x: e.clientX, y: e.clientY },
          candidateIds,
          draggedMeta,
          getMeta,
          getParentId,
          indexOf,
          getChildren
        );
        
        if (drop) {
          // Convert to reorder parameters with precise positioning
          let insertPosition: 'before' | 'after' | 'inside' = 'inside';
          let referenceElementId: string | undefined;
          
          if (drop.kind === "between" && typeof drop.index === "number") {
            const siblings = getChildren(drop.parentId);
            
            if (drop.index === 0) {
              // Insert at beginning
              if (siblings.length > 0) {
                referenceElementId = siblings[0];
                insertPosition = 'before';
              } else {
                insertPosition = 'inside'; // Empty container
              }
            } else if (drop.index >= siblings.length) {
              // Insert at end
              if (siblings.length > 0) {
                referenceElementId = siblings[siblings.length - 1];
                insertPosition = 'after';
              } else {
                insertPosition = 'inside'; // Empty container
              }
            } else {
              // Insert between siblings - before the element at index
              referenceElementId = siblings[drop.index];
              insertPosition = 'before';
            }
          } else if (drop.kind === "into") {
            insertPosition = 'inside';
          }
          
          // Perform the reordering
          dispatch(reorderElement({
            elementId: data.elementId,
            newParentId: drop.parentId,
            insertPosition,
            referenceElementId
          }));
        } else {
          // Fallback to root
          dispatch(reorderElement({
            elementId: data.elementId,
            newParentId: 'root',
            insertPosition: 'inside'
          }));
        }
        
        // Clear visual feedback
        setInsertionIndicator(null);
        setHoveredElementId(null);
        setHoveredZone(null);
        dispatch(setHoveredElement({ elementId: null, zone: null }));
      }
    } catch (error) {
      // Invalid drag data
    }
  }, [currentElements, dispatch]);

  const handleCanvasDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    // Only clear feedback if leaving the canvas entirely
    if (!canvasRef.current?.contains(e.relatedTarget as Node)) {
      setInsertionIndicator(null);
      setHoveredElementId(null);
      setHoveredZone(null);
      dispatch(setHoveredElement({ elementId: null, zone: null }));
    }
  }, [dispatch]);

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
          // console.log('Copy element:', selectedElementId);
          dispatch(copyElement(selectedElementId));
        } else if (e.key === 'x' || e.key === 'X') {
          e.preventDefault();
          // console.log('Cut element:', selectedElementId);
          dispatch(cutElement(selectedElementId));
        }
      }
      
      if (ctrlKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        // console.log('Paste element');
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
    
    // Check if we're dragging a component from the component panel
    try {
      const data = e.dataTransfer.types.includes('application/json');
      if (data) {
        setIsDraggingComponent(true);
        
        // NEW DnD SYSTEM: Get mouse coordinates and use new system for component drops
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          // Use new DnD system for component dropping
          const candidateIds = getCandidateContainerIds({ x: e.clientX, y: e.clientY });
          // Component drops use generic element metadata
          const elementMeta = createElementMetaForInsertion('rectangle'); // Use generic container type
          
          // Create helper functions for the new DnD system
          const getMeta = (id: string) => {
            if (id === "root") {
              return { id: "root", tag: "DIV", acceptsChildren: true };
            }
            const element = currentElements[id];
            return element ? createComponentMeta(element) : null;
          };
          
          const getParentId = (id: string) => {
            if (id === "root") return null;
            const element = currentElements[id];
            return element?.parent || "root";
          };
          
          const indexOf = (parentId: string, childId: string) => {
            if (parentId === "root") {
              return Object.values(currentElements)
                .filter(el => el.parent === "root" || !el.parent)
                .findIndex(el => el.id === childId);
            }
            const parent = currentElements[parentId];
            return parent?.children?.indexOf(childId) || 0;
          };
          
          const getChildren = (parentId: string) => {
            if (parentId === "root") {
              return Object.values(currentElements)
                .filter(el => el.parent === "root" || !el.parent)
                .map(el => el.id);
            }
            const parent = currentElements[parentId];
            return parent?.children || [];
          };
          
          // Get legal drop location using new DnD system
          const drop = chooseDropForNewElement(
            { x: e.clientX, y: e.clientY },
            candidateIds,
            elementMeta,
            getMeta,
            getParentId,
            indexOf,
            getChildren
          );
          
          if (drop) {
            // Additional validation for component drops - prevent dropping into component instances
            const targetElement = currentElements[drop.parentId];
            const canDropHere = !targetElement?.componentRef;
            
            if (canDropHere) {
              // Convert new DnD format to old insertion zone format for compatibility
              const insertionZone = {
                elementId: drop.parentId,
                position: drop.kind === "into" ? "inside" : "between",
                bounds: { x: 0, y: 0, width: 100, height: 100 }, // Placeholder bounds
                index: drop.index
              };
              
              setHoveredElementId(drop.parentId);
              setHoveredZone(drop.kind === "into" ? "inside" : "inside");
              
              // Update Redux state for visual feedback 
              dispatch(setHoveredElement({ 
                elementId: drop.parentId, 
                zone: drop.kind === "into" ? "inside" : "inside"
              }));
              
              // Store the insertion indicator for visual feedback
              setInsertionIndicator(insertionZone);
            } else {
              // Clear visual feedback if component instance detected
              setHoveredElementId(null);
              setHoveredZone(null);
              dispatch(setHoveredElement({ elementId: null, zone: null }));
              setInsertionIndicator(null);
            }
          } else {
            // Clear visual feedback if no valid drop location
            setHoveredElementId(null);
            setHoveredZone(null);
            dispatch(setHoveredElement({ elementId: null, zone: null }));
            setInsertionIndicator(null);
          }
        }
      }
    } catch (error) {
      // Silently handle drag data parsing errors
    }
  }, [zoomLevel, dispatch, currentElements]);

  // Handle drag leave to clear visual feedback when component drag leaves canvas
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the canvas container itself, not child elements
    if (e.target === canvasRef.current) {
      console.log('COMPONENT DRAG - Left canvas area');
      setIsDraggingComponent(false);
      setHoveredElementId(null);
      setHoveredZone(null);
      dispatch(setHoveredElement({ elementId: null, zone: null }));
      setInsertionIndicator(null);
    }
  }, [dispatch]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    // Clear component dragging state
    setIsDraggingComponent(false);
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      
      if (data.type === 'component' && data.component) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        
        // Calculate drop coordinates with validation
        const rawX = (e.clientX - rect.left) / zoomLevel;
        const rawY = (e.clientY - rect.top) / zoomLevel;
        
        // Ensure coordinates are finite numbers
        const x = isFinite(rawX) ? rawX : 50;
        const y = isFinite(rawY) ? rawY : 50;
        
        console.log('Component drop coordinates:', { x, y, rawX, rawY, zoomLevel });
        
        // NEW DnD SYSTEM: Use new system for component dropping validation
        const candidateIds = getCandidateContainerIds({ x: e.clientX, y: e.clientY });
        // Component drops use generic element metadata
        const elementMeta = createElementMetaForInsertion('rectangle');
        
        // Create helper functions for the new DnD system
        const getMeta = (id: string) => {
          if (id === "root") {
            return { id: "root", tag: "DIV", acceptsChildren: true };
          }
          const element = currentElements[id];
          return element ? createComponentMeta(element) : null;
        };
        
        const getParentId = (id: string) => {
          if (id === "root") return null;
          const element = currentElements[id];
          return element?.parent || "root";
        };
        
        const indexOf = (parentId: string, childId: string) => {
          if (parentId === "root") {
            return Object.values(currentElements)
              .filter(el => el.parent === "root" || !el.parent)
              .findIndex(el => el.id === childId);
          }
          const parent = currentElements[parentId];
          return parent?.children?.indexOf(childId) || 0;
        };
        
        const getChildren = (parentId: string) => {
          if (parentId === "root") {
            return Object.values(currentElements)
              .filter(el => el.parent === "root" || !el.parent)
              .map(el => el.id);
          }
          const parent = currentElements[parentId];
          return parent?.children || [];
        };
        
        // Get legal drop location using new DnD system
        const drop = chooseDropForNewElement(
          { x: e.clientX, y: e.clientY },
          candidateIds,
          elementMeta,
          getMeta,
          getParentId,
          indexOf,
          getChildren
        );
        
        let parentId = 'root';
        let insertPosition: 'before' | 'after' | 'inside' = 'inside';
        let referenceElementId: string | undefined;
        
        if (drop) {
          // Additional validation for component drops - prevent dropping into component instances
          const targetElement = currentElements[drop.parentId];
          if (!targetElement?.componentRef) {
            // Convert new DnD format to insertion parameters
            parentId = drop.parentId;
            insertPosition = drop.kind === "into" ? 'inside' : 'before';
            
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
          }
        }
        
        // CRITICAL: Create component instance using proper ComponentDef structure
        const componentDef: ComponentDef = data.component;
        
        // Create instance element with proper insertion positioning (NO free x,y coordinates)
        const instanceElement: CanvasElementType = {
          id: `component-instance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: componentDef.template.type,
          // CRITICAL: Use template size but NO absolute positioning - let insertion system handle placement
          x: 0, // Will be set by insertion system
          y: 0, // Will be set by insertion system  
          width: componentDef.template.width || 100,
          height: componentDef.template.height || 40,
          styles: { ...componentDef.template.styles },
          parent: parentId,
          children: [],
          componentRef: {
            componentId: componentDef.id,
            version: componentDef.version,
            overrides: {}
          },
          
          // Preserve template content for rendering
          ...(componentDef.template.type === 'text' && {
            content: componentDef.template.content
          }),
          ...(componentDef.template.type === 'button' && {
            buttonText: componentDef.template.buttonText || componentDef.template.content,
            content: componentDef.template.content
          }),
          ...(componentDef.template.type === 'image' && {
            imageUrl: componentDef.template.imageUrl,
            imageBase64: componentDef.template.imageBase64,
            imageAlt: componentDef.template.imageAlt,
            objectFit: componentDef.template.objectFit,
            objectPosition: componentDef.template.objectPosition
          })
        };
        
        // Add the component instance using proper insertion system
        dispatch(addElement({ 
          element: instanceElement,
          parentId,
          insertPosition,
          referenceElementId
        }));
        
        // Select the instance element
        dispatch(selectElement(instanceElement.id));
      }
    } catch (error) {
      // Ensure we clear dragging state even on error
      setIsDraggingComponent(false);
      setHoveredElementId(null);
      setHoveredZone(null);
      dispatch(setHoveredElement({ elementId: null, zone: null }));
      setInsertionIndicator(null);
    }
    
    // Always clear visual feedback after drop
    setHoveredElementId(null);
    setHoveredZone(null);
    dispatch(setHoveredElement({ elementId: null, zone: null }));
    setInsertionIndicator(null);
  }, [zoomLevel, dispatch, currentElements]);

  const handleZoomIn = () => {
    // Zoom functionality would be implemented here
  };

  const handleZoomOut = () => {
    // Zoom functionality would be implemented here
  };

  const handleFitToScreen = () => {
    // Fit to screen functionality would be implemented here
  };

  // Clear drawing state when tool changes
  useEffect(() => {
    if (drawingState) {
      setDrawingState(null);
    }
  }, [selectedTool]);

  // Input modality detection for professional selection styling
  useEffect(() => {
    const handleMouseMove = () => {
      if (inputModality !== 'mouse') {
        setInputModality('mouse');
        document.body.setAttribute('data-input-modality', 'mouse');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && inputModality !== 'keyboard') {
        setInputModality('keyboard');
        document.body.setAttribute('data-input-modality', 'keyboard');
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keydown', handleKeyDown);
    
    // Set initial modality
    document.body.setAttribute('data-input-modality', inputModality);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [inputModality]);

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging || isDraggingForReorder) {
        // console.log('DRAG DEBUG - Global mouse move triggered');
        
        // Create a synthetic React event for consistency with proper buttons property
        const syntheticEvent = {
          clientX: e.clientX,
          clientY: e.clientY,
          buttons: 1, // Indicate button is pressed during global move
          preventDefault: () => {},
          stopPropagation: () => {}
        } as React.MouseEvent;
        
        handleMouseMove(syntheticEvent);
      }
    };

    const handleGlobalMouseUp = () => {
      if (isDragging || isResizing || isDraggingForReorder) {
        // console.log('DRAG DEBUG - Global mouse up triggered');
        handleMouseUp();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger delete when user is typing in an input, textarea, or contenteditable element
      const target = e.target as HTMLElement;
      const isTextInput = target.tagName === 'INPUT' || 
                         target.tagName === 'TEXTAREA' || 
                         target.contentEditable === 'true' ||
                         target.isContentEditable;
      
      if (e.key === 'Escape') {
        // Cancel drag operation and return focus to moved element
        if (isDraggingForReorder && draggedElementId) {
          // Escape pressed, canceling drag
          dispatch(setDraggingForReorder(false));
          dispatch(setDraggedElement(undefined));
          setInsertionIndicator(null);
          setDragThreshold({ x: 0, y: 0, exceeded: false });
          
          // Return focus to the element that was being dragged
          const elementToFocus = document.querySelector(`[data-element-id="${draggedElementId}"]`) as HTMLElement;
          if (elementToFocus) {
            elementToFocus.focus();
          }
          
          // If drag was from handle, auto-switch back to selection tool
          if (isDragFromHandle) {
            dispatch(setSelectedTool('select'));
            setIsDragFromHandle(false);
          }
        }
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && !isTextInput) {
        if (selectedElement && selectedElement.id !== 'root') {
          e.preventDefault();
          // Force synchronous delete rendering
          flushSync(() => {
            dispatch(deleteElement(selectedElement.id));
            dispatch(selectElement('root'));
          });
        }
      }
    };

    if (isDragging || isResizing || isDraggingForReorder) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    // Always listen for delete key
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDragging, isResizing, isDraggingForReorder, handleMouseMove, handleMouseUp, selectedElement, dispatch]);

  if (!rootElement) {
    return (
      <main className={`absolute top-12 bottom-20 bg-gray-50 flex items-center justify-center ${
        isDOMTreePanelVisible 
          ? (isComponentPanelVisible ? 'left-80 right-[576px]' : 'left-80 right-80')
          : (isComponentPanelVisible ? 'left-16 right-[576px]' : 'left-16 right-80')
      }`}>
        <div className="text-gray-500">Loading canvas...</div>
      </main>
    );
  }

  return (
    <main 
      className={`absolute top-12 bottom-20 bg-gray-50 overflow-auto flex items-center justify-center ${
        isDOMTreePanelVisible 
          ? (isComponentPanelVisible ? 'left-80 right-[576px]' : 'left-80 right-80')
          : (isComponentPanelVisible ? 'left-16 right-[576px]' : 'left-16 right-80')
      }`}
      onDragOver={handleCanvasDragOver}
      onDrop={handleCanvasDrop}
      onDragLeave={handleCanvasDragLeave}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={() => handleMouseUp()}
      data-testid="canvas-main"
    >
      {/* Drawing functionality integrated into canvas handlers */}
      
      {/* Canvas Container */}
      <div 
        ref={canvasRef}
        className={`
          bg-background text-foreground font-sans antialiased shadow-lg rounded-lg relative cursor-crosshair
          ${isGridVisible ? 'canvas-grid' : ''}
        `}
        style={{ 
          width: canvasWidth, 
          height: rootElement.height || 800,
          transform: `scale(${zoomLevel})`,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif",
        }}
        onClick={handleCanvasClick}
        onMouseLeave={() => {
          // Clear hover state when leaving canvas area, but not during drag operations
          if (!isDraggingForReorder && !isDragging) {
            setHoveredElementId(null);
            setHoveredZone(null);
            dispatch(setHoveredElement({ elementId: null, zone: null }));
          }
        }}
        data-testid="canvas-container"
      >
        {/* Enhanced Canvas with CSS isolation wrapper - inherits body styling */}
        <div 
          className={`${hasImportedElements && importScope ? importScope : ''} bg-background text-foreground`}
          data-canvas={hasImportedElements && importScope ? importScope : undefined}
          style={{
            // For imported elements, use CSS-based layout instead of canvas positioning
            ...(hasImportedElements ? {
              position: 'relative',
              width: '100%',
              minHeight: '100%'
            } : {}),
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif",
            position: 'relative',
          }}
        >
          {/* Render child elements efficiently */}
          {(rootElement.children || []).map((childId: string) => {
            const element = currentElements[childId];
            if (!element) {
              // console.warn('Missing element in currentElements:', childId);
              return null;
            }
            return (
              <CanvasElement 
                key={element.id} 
                element={element}
                isSelected={element.id === selectedElementId}
                isHovered={element.id === hoveredElementId}
                hoveredZone={element.id === hoveredElementId && hoveredZone && ['before', 'after', 'inside'].includes(hoveredZone) ? hoveredZone as 'before' | 'after' | 'inside' : null}
                expandedContainerId={expandedContainerId}
                currentElements={currentElements}
              />
            );
          })}
        </div>
        
        {/* Component children are now rendered by their parent elements - no separate rendering needed */}
        
        {/* LARGE, OBVIOUS DROP ZONES */}
        {insertionIndicator && (
          <div
            className="absolute pointer-events-none z-[60] transition-all duration-150"
            style={{
              left: insertionIndicator.bounds.x,
              top: insertionIndicator.bounds.y,
              width: insertionIndicator.bounds.width,
              height: insertionIndicator.bounds.height,
            }}
          >
            {/* CRISP ABOVE/BELOW INDICATORS */}
            {((insertionIndicator as any).position === 'before' || (insertionIndicator as any).position === 'after') && (
              <div className="relative w-full h-full">
                {/* 2px hairline with rounded endcaps */}
                <div 
                  className="w-full h-full animate-in fade-in duration-150"
                  style={{
                    backgroundColor: 'oklch(60% 0.20 265)',
                    borderRadius: '12px',
                    boxShadow: '0 0 0 1px currentColor inset',
                    animation: 'cubic-bezier(0.2, 0.7, 0, 1) 150ms'
                  }}
                />
                {/* Micro-hint badge with delayed fade-in */}
                <div 
                  className="absolute -right-12 top-1/2 transform -translate-y-1/2 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 text-xs font-medium text-gray-700 shadow-sm border border-gray-200 animate-in fade-in duration-150 delay-120"
                  style={{ animation: 'cubic-bezier(0.2, 0.7, 0, 1) 150ms 120ms both' }}
                >
                  {(insertionIndicator as any).position === 'before' ? 'Above' : 'Below'}
                </div>
              </div>
            )}

            {/* CANVAS PADDING INDICATORS - Document Start/End */}
            {((insertionIndicator as any).position === 'canvas-top' || (insertionIndicator as any).position === 'canvas-bottom') && (
              <div className="relative w-full h-full">
                {/* Wide insertion line with glow effect */}
                <div 
                  className="w-full h-full animate-in fade-in duration-150"
                  style={{
                    backgroundColor: 'oklch(60% 0.20 265)',
                    borderRadius: '6px',
                    boxShadow: '0 0 0 1px currentColor inset, 0 0 12px rgba(135, 80, 255, 0.3)',
                    animation: 'cubic-bezier(0.2, 0.7, 0, 1) 150ms'
                  }}
                />
                {/* Enhanced hint badge for document positioning */}
                <div 
                  className="absolute -right-16 top-1/2 transform -translate-y-1/2 bg-purple-50 border-purple-200 rounded-full px-3 py-1 text-xs font-medium text-purple-700 shadow-sm border animate-in fade-in duration-150 delay-120"
                  style={{ animation: 'cubic-bezier(0.2, 0.7, 0, 1) 150ms 120ms both' }}
                >
                  {(insertionIndicator as any).position === 'canvas-top' ? 'Document Start' : 'Document End'}
                </div>
              </div>
            )}

            {/* CRISP INSIDE CONTAINER INDICATOR */}
            {(insertionIndicator as any).position === 'inside' && (
              <div className="relative w-full h-full">
                {/* Inset mask with 8px padding, never touches edges */}
                <div 
                  className="absolute inset-2 rounded animate-in fade-in duration-150"
                  style={{
                    backgroundColor: 'color-mix(in oklab, oklch(60% 0.20 265), transparent 85%)',
                    border: '1px dashed oklch(60% 0.20 265)',
                    borderRadius: 'calc(8px - 2px)', // Target's border-radius - 2px
                    animation: 'cubic-bezier(0.2, 0.7, 0, 1) 150ms'
                  }}
                />
                {/* Micro-hint badge */}
                <div 
                  className="absolute -right-12 top-1/2 transform -translate-y-1/2 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 text-xs font-medium text-gray-700 shadow-sm border border-gray-200 animate-in fade-in duration-150 delay-120"
                  style={{ animation: 'cubic-bezier(0.2, 0.7, 0, 1) 150ms 120ms both' }}
                >
                  Inside
                </div>
              </div>
            )}

            {/* CRISP BETWEEN SIBLINGS INDICATOR */}
            {(insertionIndicator as any).position === 'between' && (
              <div 
                className="w-full h-full rounded animate-in fade-in duration-150"
                style={{
                  backgroundColor: 'color-mix(in oklab, oklch(60% 0.20 265), transparent 85%)',
                  border: '1px solid oklch(60% 0.20 265)',
                  borderRadius: '12px',
                  animation: 'cubic-bezier(0.2, 0.7, 0, 1) 150ms'
                }}
              >
                <div className="flex items-center justify-center h-full">
                  <div 
                    className="bg-white/90 backdrop-blur-sm text-gray-700 text-xs px-2 py-1 rounded shadow-sm border border-gray-200 animate-in fade-in duration-150 delay-120"
                    style={{ animation: 'cubic-bezier(0.2, 0.7, 0, 1) 150ms 120ms both' }}
                  >
                    Between
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* POLISHED GHOST PREVIEW */}
        {isDraggingForReorder && draggedElementId && insertionIndicator && (
          (() => {
            const draggedElement = currentElements[draggedElementId];
            if (!draggedElement) return null;
            
            return (
              <div
                className="absolute pointer-events-none z-[70] transition-all duration-150"
                style={{
                  left: insertionIndicator.bounds.x + 12,
                  top: insertionIndicator.bounds.y - 32,
                  opacity: 0.85,
                  transform: 'scale(0.98)',
                  filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.15))',
                  animation: 'cubic-bezier(0.2, 0.7, 0, 1) 150ms'
                }}
              >
                <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 shadow-lg backdrop-blur-sm">
                  <div className="font-medium">{draggedElement.type}</div>
                  {draggedElement.content && (
                    <div className="text-gray-500 truncate max-w-[120px]">
                      {typeof draggedElement.content === 'string' ? draggedElement.content.slice(0, 20) : 'Content'}
                    </div>
                  )}
                </div>
              </div>
            );
          })()
        )}

        {/* DRAWING RUBBER-BAND RECTANGLE */}
        {drawingState && (
          (() => {
            const { start, current, isShiftPressed, isAltPressed } = drawingState;
            
            let left = Math.min(start.x, current.x);
            let top = Math.min(start.y, current.y);
            let width = Math.abs(current.x - start.x);
            let height = Math.abs(current.y - start.y);
            
            // Apply modifier key behaviors for preview
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
                {/* Size indicator */}
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
          })()
        )}

        {/* DRAG FEEDBACK SYSTEM - New overlay approach for artifact-free indicators */}
        <DragIndicatorOverlay
          hoveredElementId={hoveredElementId}
          hoveredZone={hoveredZone}
          currentElements={expandedElements}
          zoomLevel={zoomLevel}
          canvasRef={canvasRef}
        />
        
        {/* Keep original feedback for ARIA announcements */}
        <DragFeedback
          hoveredElementId={hoveredElementId}
          hoveredZone={hoveredZone}
          draggedElementId={draggedElementId}
        />

      </div>
    </main>
  );
};

export default Canvas;
