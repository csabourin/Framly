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
 * Rubber band rectangle overlay for drawing tools
 * Extracted from Canvas.tsx for better maintainability
 */
export const DrawingOverlay: React.FC<DrawingOverlayProps> = ({ 
  drawingState, 
  selectedTool, 
  zoomLevel 
}) => {
  if (!drawingState || !['rectangle', 'text', 'image'].includes(selectedTool)) {
    return null;
  }

  const startX = Math.min(drawingState.start.x, drawingState.current.x);
  const startY = Math.min(drawingState.start.y, drawingState.current.y);
  const width = Math.abs(drawingState.current.x - drawingState.start.x);
  const height = Math.abs(drawingState.current.y - drawingState.start.y);

  // Show size indicators if drawing a meaningful rectangle (>5px)
  const showSizeIndicators = width > 5 || height > 5;

  return (
    <div className="absolute pointer-events-none z-[50]">
      {/* Rubber band rectangle */}
      <div
        className="absolute border-2 border-blue-500 border-dashed bg-blue-500/10 rounded"
        style={{
          left: startX,
          top: startY,
          width: Math.max(width, 1),
          height: Math.max(height, 1),
        }}
      />
      
      {/* Tool type indicator */}
      <div
        className="absolute -top-8 left-0 bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium shadow-lg"
        style={{
          left: startX,
          top: startY - 32,
        }}
      >
        {selectedTool === 'rectangle' && '📦 Rectangle'}
        {selectedTool === 'text' && '📝 Text'}
        {selectedTool === 'image' && '🖼️ Image'}
      </div>

      {/* Size indicators */}
      {showSizeIndicators && (
        <>
          {/* Width indicator */}
          <div
            className="absolute bg-gray-900 text-white px-1 py-0.5 rounded text-xs"
            style={{
              left: startX + width / 2 - 20,
              top: startY + height + 4,
            }}
          >
            {Math.round(width)}px
          </div>
          
          {/* Height indicator */}
          <div
            className="absolute bg-gray-900 text-white px-1 py-0.5 rounded text-xs"
            style={{
              left: startX + width + 4,
              top: startY + height / 2 - 10,
            }}
          >
            {Math.round(height)}px
          </div>
        </>
      )}

      {/* Modifier key hints */}
      {(drawingState.isShiftPressed || drawingState.isAltPressed) && (
        <div
          className="absolute bg-purple-600 text-white px-2 py-1 rounded text-xs font-medium shadow-lg"
          style={{
            left: startX + width + 8,
            top: startY - 8,
          }}
        >
          {drawingState.isShiftPressed && '⇧ Square'}
          {drawingState.isAltPressed && '⌥ Center'}
        </div>
      )}
    </div>
  );
};

export default DrawingOverlay;