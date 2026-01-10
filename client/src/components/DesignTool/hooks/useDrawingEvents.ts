import { useState, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { selectSelectedTool, selectZoomLevel } from '../../../store/selectors';
import { useDrawingCommitter } from '../DrawingCommitter';
import type { InsertionPoint } from '../utils/insertionLogic';

export interface DrawingState {
  start: { x: number; y: number };
  current: { x: number; y: number };
  isShiftPressed: boolean;
  isAltPressed: boolean;
}

interface CachedInsertionPoint {
  insertionPoint: InsertionPoint | null;
  indicatorBounds?: {
    x: number;
    y: number | string;
    width: number | string;
    height: number | string;
  } | null;
}

/**
 * Hook for handling drawing events and rubber-band rectangle creation
 * Extracted from Canvas.tsx for better maintainability
 */
export const useDrawingEvents = (
  currentElements: Record<string, any>,
  canvasRef: React.RefObject<HTMLDivElement>,
  currentBreakpointWidth: number,
  cachedInsertionPoint?: CachedInsertionPoint | null
) => {
  const selectedTool = useSelector(selectSelectedTool);
  const zoomLevel = useSelector(selectZoomLevel);

  const [drawingState, setDrawingState] = useState<DrawingState | null>(null);

  // Store latest cached insertion point for use in mouseUp
  const latestCachedInsertionPoint = useRef<CachedInsertionPoint | null>(null);
  latestCachedInsertionPoint.current = cachedInsertionPoint || null;

  // Initialize drawing committer for the new drawing-based UX
  const { commitDrawnRect } = useDrawingCommitter({
    currentElements,
    zoomLevel,
    canvasRef,
    currentBreakpointWidth,
    cachedInsertionPoint: cachedInsertionPoint || undefined
  });

  // Get canvas coordinates from client coordinates, optionally clamping to canvas bounds
  const getCanvasCoordinates = useCallback((clientX: number, clientY: number, clampToBounds: boolean = false) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };

    let x = (clientX - rect.left) / zoomLevel;
    let y = (clientY - rect.top) / zoomLevel;

    // Clamp to canvas bounds if requested (for final element placement)
    if (clampToBounds) {
      x = Math.max(0, x);
      y = Math.max(0, y);
      // Note: We don't clamp max because canvas can expand
    }

    return { x, y };
  }, [canvasRef, zoomLevel]);

  const handleDrawingMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Only handle drawing tools - this check is also done in Canvas.tsx but kept for safety
    if (!['rectangle', 'text', 'image'].includes(selectedTool)) return;

    e.preventDefault();
    e.stopPropagation();

    // Allow drawing to start from anywhere, even outside canvas bounds
    // Coordinates can be negative if starting outside the canvas
    const coords = getCanvasCoordinates(e.clientX, e.clientY, false);

    setDrawingState({
      start: coords,
      current: coords,
      isShiftPressed: e.shiftKey,
      isAltPressed: e.altKey
    });
  }, [selectedTool, getCanvasCoordinates]);

  const handleDrawingMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!drawingState) return;
    
    e.preventDefault();
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    
    setDrawingState(prev => prev ? {
      ...prev,
      current: coords,
      isShiftPressed: e.shiftKey,
      isAltPressed: e.altKey
    } : null);
  }, [drawingState, getCanvasCoordinates]);

  const handleDrawingMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!drawingState) return;

    e.preventDefault();
    e.stopPropagation();

    const coords = getCanvasCoordinates(e.clientX, e.clientY, false);

    // Calculate raw rectangle from drawing coordinates
    let startX = Math.min(drawingState.start.x, coords.x);
    let startY = Math.min(drawingState.start.y, coords.y);
    let endX = Math.max(drawingState.start.x, coords.x);
    let endY = Math.max(drawingState.start.y, coords.y);

    // Clamp rectangle to canvas bounds (left and top edges)
    // This ensures elements respect canvas limits even when drawing starts outside
    startX = Math.max(0, startX);
    startY = Math.max(0, startY);

    // Recalculate dimensions after clamping
    const width = endX - startX;
    const height = endY - startY;

    // Only create element if there's meaningful size (>5px) after clamping
    if (width > 5 && height > 5) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        // Use the latest cached insertion point from the preview system
        commitDrawnRect(
          {
            left: rect.left + startX * zoomLevel,
            top: rect.top + startY * zoomLevel,
            width: width * zoomLevel,
            height: height * zoomLevel
          },
          selectedTool as 'rectangle' | 'text' | 'image',
          { shift: drawingState.isShiftPressed, alt: drawingState.isAltPressed },
          latestCachedInsertionPoint.current
        );
      }
    }

    setDrawingState(null);
  }, [drawingState, selectedTool, commitDrawnRect, getCanvasCoordinates, canvasRef, zoomLevel]);

  const calculateDrawingRect = useCallback(() => {
    if (!drawingState) return null;
    
    const startX = Math.min(drawingState.start.x, drawingState.current.x);
    const startY = Math.min(drawingState.start.y, drawingState.current.y);
    const width = Math.abs(drawingState.current.x - drawingState.start.x);
    const height = Math.abs(drawingState.current.y - drawingState.start.y);
    
    return { x: startX, y: startY, width, height };
  }, [drawingState]);

  return {
    drawingState,
    handleDrawingMouseDown,
    handleDrawingMouseMove,
    handleDrawingMouseUp,
    calculateDrawingRect,
    isDrawing: drawingState !== null
  };
};