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

  const getCanvasCoordinates = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    
    return {
      x: (clientX - rect.left) / zoomLevel,
      y: (clientY - rect.top) / zoomLevel
    };
  }, [canvasRef, zoomLevel]);

  const handleDrawingMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Only handle drawing tools
    if (!['rectangle', 'text', 'image'].includes(selectedTool)) return;
    if (e.target !== e.currentTarget) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    
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

    const coords = getCanvasCoordinates(e.clientX, e.clientY);

    // Calculate final rectangle
    const startX = Math.min(drawingState.start.x, coords.x);
    const startY = Math.min(drawingState.start.y, coords.y);
    const width = Math.abs(coords.x - drawingState.start.x);
    const height = Math.abs(coords.y - drawingState.start.y);

    // Only create element if there's meaningful size (>5px)
    if (width > 5 || height > 5) {
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