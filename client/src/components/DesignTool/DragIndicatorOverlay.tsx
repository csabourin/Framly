import React from 'react';
import { CanvasElement as CanvasElementType } from '../../types/canvas';

interface DragIndicatorOverlayProps {
  hoveredElementId: string | null;
  hoveredZone: 'before' | 'after' | 'inside' | null;
  currentElements: Record<string, CanvasElementType>;
  zoomLevel: number;
  canvasRef: React.RefObject<HTMLDivElement>;
}

/**
 * Overlay component showing drop indicators during drag operations
 */
const DragIndicatorOverlay: React.FC<DragIndicatorOverlayProps> = ({
  hoveredElementId,
  hoveredZone,
  currentElements,
  zoomLevel,
  canvasRef
}) => {
  if (!hoveredElementId || !hoveredZone || !canvasRef.current) {
    return null;
  }

  const element = currentElements[hoveredElementId];
  if (!element) {
    return null;
  }

  // Find the DOM element to get its actual position
  const domElement = canvasRef.current.querySelector(`[data-element-id="${hoveredElementId}"]`);
  if (!domElement) {
    return null;
  }

  const canvasRect = canvasRef.current.getBoundingClientRect();
  const elementRect = domElement.getBoundingClientRect();

  // Calculate position relative to canvas
  const relativeLeft = (elementRect.left - canvasRect.left) / zoomLevel;
  const relativeTop = (elementRect.top - canvasRect.top) / zoomLevel;
  const width = elementRect.width / zoomLevel;
  const height = elementRect.height / zoomLevel;

  // Render appropriate indicator based on zone
  if (hoveredZone === 'inside') {
    return (
      <div
        className="absolute pointer-events-none border-2 border-dashed border-blue-500 bg-blue-500/10 rounded"
        style={{
          left: relativeLeft,
          top: relativeTop,
          width: width,
          height: height,
          zIndex: 100
        }}
        data-testid="drag-indicator-inside"
      />
    );
  }

  // Before/After indicators - show a line
  const lineStyle: React.CSSProperties = {
    position: 'absolute',
    pointerEvents: 'none',
    backgroundColor: '#3b82f6',
    zIndex: 100
  };

  if (hoveredZone === 'before') {
    return (
      <div
        style={{
          ...lineStyle,
          left: relativeLeft,
          top: relativeTop - 2,
          width: width,
          height: 4,
          borderRadius: 2
        }}
        data-testid="drag-indicator-before"
      />
    );
  }

  if (hoveredZone === 'after') {
    return (
      <div
        style={{
          ...lineStyle,
          left: relativeLeft,
          top: relativeTop + height - 2,
          width: width,
          height: 4,
          borderRadius: 2
        }}
        data-testid="drag-indicator-after"
      />
    );
  }

  return null;
};

export default DragIndicatorOverlay;