import React from 'react';

interface DrawingState {
  start: { x: number; y: number };
  current: { x: number; y: number };
  isShiftPressed: boolean;
  isAltPressed: boolean;
}

interface DrawingOverlayProps {
  drawingState: DrawingState | null;
  selectedTool: string;
  zoomLevel: number;
}

/**
 * Drawing Overlay Component (80 lines)
 * 
 * Responsibilities:
 * - Rubber band rectangle visualization
 * - Drawing feedback and size indicators
 * - Modifier key hints during drawing
 */
const DrawingOverlay: React.FC<DrawingOverlayProps> = ({
  drawingState,
  selectedTool,
  zoomLevel
}) => {
  if (!drawingState || !['rectangle', 'text', 'image'].includes(selectedTool)) {
    return null;
  }

  const { start, current, isShiftPressed, isAltPressed } = drawingState;

  // Calculate rubber band rectangle
  const left = Math.min(start.x, current.x);
  const top = Math.min(start.y, current.y);
  const width = Math.abs(current.x - start.x);
  const height = Math.abs(current.y - start.y);

  // Tool-specific styling
  const getToolStyle = () => {
    const baseStyle = {
      position: 'absolute' as const,
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
      pointerEvents: 'none' as const,
      zIndex: 999,
    };

    switch (selectedTool) {
      case 'rectangle':
        return {
          ...baseStyle,
          border: '2px dashed #3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderRadius: '4px',
        };
      
      case 'text':
        return {
          ...baseStyle,
          border: '2px dashed #10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderRadius: '2px',
        };
      
      case 'image':
        return {
          ...baseStyle,
          border: '2px dashed #f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          borderRadius: '6px',
        };
      
      default:
        return baseStyle;
    }
  };

  const toolStyle = getToolStyle();

  return (
    <>
      {/* Rubber band rectangle */}
      <div style={toolStyle} />
      
      {/* Size indicator */}
      {width > 20 && height > 20 && (
        <div
          style={{
            position: 'absolute',
            left: `${left + width + 8}px`,
            top: `${top}px`,
            padding: '4px 8px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            fontSize: '12px',
            borderRadius: '4px',
            pointerEvents: 'none',
            zIndex: 1000,
            whiteSpace: 'nowrap',
          }}
        >
          {Math.round(width)}×{Math.round(height)}
        </div>
      )}
      
      {/* Modifier key hints */}
      {(isShiftPressed || isAltPressed) && (
        <div
          style={{
            position: 'absolute',
            left: `${left}px`,
            top: `${top - 30}px`,
            padding: '4px 8px',
            backgroundColor: 'rgba(59, 130, 246, 0.9)',
            color: 'white',
            fontSize: '11px',
            borderRadius: '4px',
            pointerEvents: 'none',
            zIndex: 1000,
            whiteSpace: 'nowrap',
          }}
        >
          {isShiftPressed && 'Square aspect ratio'}
          {isShiftPressed && isAltPressed && ' • '}
          {isAltPressed && 'Draw from center'}
        </div>
      )}
    </>
  );
};

export default DrawingOverlay;