import React from 'react';

interface CanvasContainerProps {
  canvasRef: React.RefObject<HTMLDivElement>;
  zoomLevel: number;
  isGridVisible: boolean;
  canvasWidth: number;
  contentBounds: { minY: number; maxY: number; width: number };
  children: React.ReactNode;
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseUp: (e: React.MouseEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onDoubleClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onContextMenu: (e: React.MouseEvent<HTMLDivElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
}

/**
 * Canvas Container Component (100 lines)
 * 
 * Responsibilities:
 * - Canvas styling and layout
 * - Grid rendering and zoom handling
 * - Event delegation to parent handlers
 * - Responsive canvas sizing
 */
const CanvasContainer: React.FC<CanvasContainerProps> = ({
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
  onDragEnd,
  onClick,
  onDoubleClick,
  onContextMenu,
  onKeyDown
}) => {
  const { minY, maxY, width } = contentBounds;
  const canvasHeight = Math.max(800, maxY - minY + 100);

  return (
    <div 
      className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 to-gray-100/30 dark:from-gray-900 dark:to-gray-800/50 p-8 relative"
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <div className="flex justify-center items-start min-h-full">
        <div 
          ref={canvasRef}
          className="relative bg-white dark:bg-gray-800 shadow-2xl border border-gray-200/60 dark:border-gray-700 cursor-crosshair rounded-xl overflow-hidden"
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top center',
            width: `${canvasWidth}px`,
            height: `${canvasHeight}px`,
            minHeight: '600px'
          }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onDragEnd={onDragEnd}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
          onContextMenu={onContextMenu}
          data-canvas="true"
        >
          {/* Grid overlay */}
          {isGridVisible && (
            <div 
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage: `
                  linear-gradient(to right, #ccc 1px, transparent 1px),
                  linear-gradient(to bottom, #ccc 1px, transparent 1px)
                `,
                backgroundSize: '20px 20px'
              }}
            />
          )}

          {/* Canvas content */}
          {children}
        </div>
      </div>
    </div>
  );
};

export default CanvasContainer;