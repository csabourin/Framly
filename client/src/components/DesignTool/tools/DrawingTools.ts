/**
 * Drawing tools behavior
 * Handles rectangle, text, and image creation tools
 */

import { Point, Bounds } from '../utils/canvasGeometry';

export type DrawingTool = 'rectangle' | 'text' | 'image';

export interface DrawingSession {
  tool: DrawingTool;
  startPoint: Point;
  currentPoint: Point;
  isActive: boolean;
  modifiers: {
    shift: boolean; // Constraint (square/circle)
    alt: boolean;   // Center origin
  };
}

export interface DrawingResult {
  bounds: Bounds;
  tool: DrawingTool;
  modifiers: {
    shift: boolean;
    alt: boolean;
  };
}

/**
 * Start a new drawing session
 */
export function startDrawingSession(
  tool: DrawingTool,
  startPoint: Point,
  modifiers: { shift: boolean; alt: boolean }
): DrawingSession {
  return {
    tool,
    startPoint,
    currentPoint: startPoint,
    isActive: true,
    modifiers
  };
}

/**
 * Update drawing session with new mouse position
 */
export function updateDrawingSession(
  session: DrawingSession,
  currentPoint: Point,
  modifiers: { shift: boolean; alt: boolean }
): DrawingSession {
  return {
    ...session,
    currentPoint,
    modifiers
  };
}

/**
 * Calculate drawing bounds from session
 */
export function calculateDrawingBounds(session: DrawingSession): Bounds {
  let { startPoint, currentPoint, modifiers } = session;
  
  // Apply constraint modifier (Shift key)
  if (modifiers.shift) {
    currentPoint = applySquareConstraint(startPoint, currentPoint);
  }
  
  // Apply center origin modifier (Alt key)
  if (modifiers.alt) {
    const centerBounds = applyCenterOrigin(startPoint, currentPoint);
    return centerBounds;
  }
  
  // Normal bounds calculation
  const x = Math.min(startPoint.x, currentPoint.x);
  const y = Math.min(startPoint.y, currentPoint.y);
  const width = Math.abs(currentPoint.x - startPoint.x);
  const height = Math.abs(currentPoint.y - startPoint.y);
  
  return { x, y, width, height };
}

/**
 * Check if drawing session should be committed (has meaningful size)
 */
export function shouldCommitDrawing(session: DrawingSession, minSize: number = 5): boolean {
  const bounds = calculateDrawingBounds(session);
  return bounds.width > minSize || bounds.height > minSize;
}

/**
 * Finish drawing session and return result
 */
export function finishDrawingSession(session: DrawingSession): DrawingResult | null {
  if (!shouldCommitDrawing(session)) {
    return null; // Drawing too small
  }
  
  return {
    bounds: calculateDrawingBounds(session),
    tool: session.tool,
    modifiers: session.modifiers
  };
}

/**
 * Apply square constraint (Shift key modifier)
 */
function applySquareConstraint(startPoint: Point, currentPoint: Point): Point {
  const deltaX = currentPoint.x - startPoint.x;
  const deltaY = currentPoint.y - startPoint.y;
  
  // Use the larger of the two deltas to maintain square
  const size = Math.max(Math.abs(deltaX), Math.abs(deltaY));
  
  return {
    x: startPoint.x + (deltaX >= 0 ? size : -size),
    y: startPoint.y + (deltaY >= 0 ? size : -size)
  };
}

/**
 * Apply center origin (Alt key modifier)
 */
function applyCenterOrigin(startPoint: Point, currentPoint: Point): Bounds {
  const deltaX = currentPoint.x - startPoint.x;
  const deltaY = currentPoint.y - startPoint.y;
  
  // Double the deltas to make start point the center
  const width = Math.abs(deltaX) * 2;
  const height = Math.abs(deltaY) * 2;
  
  return {
    x: startPoint.x - width / 2,
    y: startPoint.y - height / 2,
    width,
    height
  };
}

/**
 * Get tool-specific default properties
 */
export function getToolDefaults(tool: DrawingTool): Record<string, any> {
  switch (tool) {
    case 'rectangle':
      return {
        type: 'rectangle',
        styles: {
          backgroundColor: '#3b82f6',
          border: '1px solid #2563eb',
          borderRadius: '4px'
        }
      };
      
    case 'text':
      return {
        type: 'text',
        content: 'Text',
        styles: {
          fontSize: '16px',
          fontFamily: 'Inter, sans-serif',
          color: '#374151',
          textAlign: 'left'
        }
      };
      
    case 'image':
      return {
        type: 'image',
        src: '',
        alt: 'Image',
        styles: {
          objectFit: 'cover',
          borderRadius: '4px'
        }
      };
      
    default:
      return {};
  }
}

/**
 * Check if tool is a drawing tool
 */
export function isDrawingTool(tool: string): tool is DrawingTool {
  return ['rectangle', 'text', 'image'].includes(tool);
}

/**
 * Check if tool requires point-and-click vs drawing
 */
export function isPointAndClickTool(tool: DrawingTool): boolean {
  return tool === 'text'; // Text elements are typically point-and-click
}