import { useState, useEffect, useCallback, useRef } from 'react';
import {
  calculateInsertionPoint,
  buildIndicatorState,
  type InsertionPoint,
  type InsertionIndicatorState
} from '../utils/insertionLogic';
import type { CanvasElement } from '../../../types';

/**
 * State representing the current drawing rectangle
 */
interface DrawingState {
  start: { x: number; y: number };
  current: { x: number; y: number };
  isShiftPressed: boolean;
  isAltPressed: boolean;
}

/**
 * Drawing bounds in canvas coordinates
 */
export interface DrawingBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

/**
 * Return type for the useDrawingInsertionPreview hook
 */
export interface DrawingInsertionPreviewResult {
  insertionPreview: InsertionIndicatorState | null;
  insertionPoint: InsertionPoint | null;
  drawingBounds: DrawingBounds | null;
}

/**
 * Calculate drawing bounds from drawing state, handling modifiers
 */
function calculateDrawingBounds(drawingState: DrawingState): DrawingBounds {
  let { start, current, isShiftPressed, isAltPressed } = drawingState;

  let x = Math.min(start.x, current.x);
  let y = Math.min(start.y, current.y);
  let width = Math.abs(current.x - start.x);
  let height = Math.abs(current.y - start.y);

  // Handle shift key for square aspect ratio
  if (isShiftPressed) {
    const size = Math.max(width, height);
    width = size;
    height = size;

    // Adjust position based on drag direction
    if (current.x < start.x) {
      x = start.x - size;
    }
    if (current.y < start.y) {
      y = start.y - size;
    }
  }

  // Handle alt key for drawing from center
  if (isAltPressed) {
    x = start.x - width;
    y = start.y - height;
    width *= 2;
    height *= 2;
  }

  const centerX = x + width / 2;
  const centerY = y + height / 2;

  return { x, y, width, height, centerX, centerY };
}

/**
 * Hook for calculating real-time insertion preview during drawing operations.
 *
 * This hook watches the drawing state and calculates where the element would
 * be inserted in the DOM flow based on the center point of the drawn rectangle.
 * It provides visual feedback to users about element placement BEFORE they
 * release the mouse button.
 *
 * @param drawingState - Current drawing rectangle state from useDrawingEvents
 * @param elements - Current canvas elements from Redux
 * @param canvasRef - Reference to the canvas DOM element
 * @param zoomLevel - Current zoom level for coordinate conversion
 * @param isDrawing - Whether drawing is actively happening
 * @returns Insertion preview state, insertion point, and calculated drawing bounds
 */
export function useDrawingInsertionPreview(
  drawingState: DrawingState | null,
  elements: Record<string, CanvasElement>,
  canvasRef: React.RefObject<HTMLDivElement>,
  zoomLevel: number,
  isDrawing: boolean
): DrawingInsertionPreviewResult {
  const [insertionPreview, setInsertionPreview] = useState<InsertionIndicatorState | null>(null);
  const [insertionPoint, setInsertionPoint] = useState<InsertionPoint | null>(null);
  const [drawingBounds, setDrawingBounds] = useState<DrawingBounds | null>(null);

  // Throttle calculation to prevent excessive DOM queries
  const lastUpdateTime = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  const updateInsertionPreview = useCallback(() => {
    if (!drawingState || !isDrawing) {
      setInsertionPreview(null);
      setInsertionPoint(null);
      setDrawingBounds(null);
      return;
    }

    // Calculate drawing bounds with modifier handling
    const bounds = calculateDrawingBounds(drawingState);
    setDrawingBounds(bounds);

    // Only recalculate if enough time has passed (throttle to ~60fps)
    const now = performance.now();
    if (now - lastUpdateTime.current < 16) {
      return;
    }
    lastUpdateTime.current = now;

    // Calculate insertion point based on center of drawn rectangle
    const point = calculateInsertionPoint(
      bounds.centerX,
      bounds.centerY,
      elements,
      canvasRef,
      zoomLevel
    );

    setInsertionPoint(point);

    if (point) {
      // Build the indicator state for rendering
      const indicatorState = buildIndicatorState(point, elements, canvasRef);
      setInsertionPreview(indicatorState);
    } else {
      setInsertionPreview(null);
    }
  }, [drawingState, elements, canvasRef, zoomLevel, isDrawing]);

  // Update on every animation frame during drawing for smooth feedback
  useEffect(() => {
    if (!isDrawing) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      setInsertionPreview(null);
      setInsertionPoint(null);
      setDrawingBounds(null);
      return;
    }

    const tick = () => {
      updateInsertionPreview();
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isDrawing, updateInsertionPreview]);

  // Also update immediately when drawing state changes significantly
  useEffect(() => {
    if (drawingState && isDrawing) {
      updateInsertionPreview();
    }
  }, [drawingState?.current.x, drawingState?.current.y, isDrawing, updateInsertionPreview]);

  return {
    insertionPreview,
    insertionPoint,
    drawingBounds
  };
}
