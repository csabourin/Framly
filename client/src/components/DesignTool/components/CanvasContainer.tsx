import React from 'react';

interface CanvasContainerProps {
  canvasRef: React.RefObject<HTMLDivElement>;
  zoomLevel: number;
  isGridVisible: boolean;
  canvasWidth: number;
  contentBounds: { minY: number; maxY: number; width: number };
  children: React.ReactNode;
  onMouseDown?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseMove?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseUp?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onDoubleClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onContextMenu?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
}

/**
 * Canvas container with grid, zoom, and proper styling
 * Extracted from Canvas.tsx for better maintainability
 */
export const CanvasContainer: React.FC<CanvasContainerProps> = ({
  canvasRef,
  zoomLevel,
  isGridVisible,
  canvasWidth,
  contentBounds,
  children,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onDragOver,
  onDragLeave,
  onDrop,
  onClick,
  onDoubleClick,
  onContextMenu,
  onKeyDown
}) => {
  // Calculate responsive canvas height
  const canvasHeight = Math.max(contentBounds.maxY - contentBounds.minY, 800);

  // Grid pattern styles
  const gridSize = 20;
  const gridOpacity = Math.min(0.3, zoomLevel * 0.2);

  return (
    <div className="flex-1 overflow-auto bg-gray-100 relative">
      <div 
        className="relative mx-auto"
        style={{
          width: `${canvasWidth * zoomLevel}px`,
          minHeight: '100%',
          paddingTop: '40px',
          paddingBottom: '40px'
        }}
      >
        {/* Canvas */}
        <div
          ref={canvasRef}
          className="relative bg-white shadow-lg mx-auto cursor-crosshair"
          style={{
            width: `${canvasWidth * zoomLevel}px`,
            height: `${canvasHeight * zoomLevel}px`,
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top center',
            backgroundImage: isGridVisible ? 
              `radial-gradient(circle, rgba(0,0,0,${gridOpacity}) 1px, transparent 1px)` : 
              'none',
            backgroundSize: isGridVisible ? `${gridSize}px ${gridSize}px` : 'auto',
          }}
          tabIndex={0}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
          onContextMenu={onContextMenu}
          onKeyDown={onKeyDown}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default CanvasContainer;