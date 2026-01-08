import React, { useRef, useState, useCallback, useEffect } from 'react';

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

// Panning state interface
interface PanState {
  isDragging: boolean;
  lastX: number;
  lastY: number;
}

/**
 * Canvas Container Component
 * 
 * Responsibilities:
 * - Canvas styling and layout with scrollable/draggable workspace
 * - Grid rendering and zoom handling
 * - Event delegation to parent handlers
 * - Canvas panning with middle-click or Ctrl+drag
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
  
  // Panning state
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const panState = useRef<PanState>({ isDragging: false, lastX: 0, lastY: 0 });
  const [isPanning, setIsPanning] = useState(false);

  // Handle pan start (middle click or Ctrl+click)
  const handlePanStart = useCallback((e: React.MouseEvent) => {
    const isMiddleClick = e.button === 1;
    const isCtrlClick = (e.ctrlKey || e.metaKey) && e.button === 0;
    
    if (!isMiddleClick && !isCtrlClick) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    panState.current = { isDragging: true, lastX: e.clientX, lastY: e.clientY };
    setIsPanning(true);
  }, []);

  // Handle pan move
  const handlePanMove = useCallback((e: MouseEvent) => {
    if (!panState.current.isDragging || !scrollContainerRef.current) return;
    
    const deltaX = e.clientX - panState.current.lastX;
    const deltaY = e.clientY - panState.current.lastY;
    
    scrollContainerRef.current.scrollLeft -= deltaX;
    scrollContainerRef.current.scrollTop -= deltaY;
    
    panState.current.lastX = e.clientX;
    panState.current.lastY = e.clientY;
  }, []);

  // Handle pan end
  const handlePanEnd = useCallback(() => {
    panState.current.isDragging = false;
    setIsPanning(false);
  }, []);

  // Global mouse events for panning
  useEffect(() => {
    if (!isPanning) return;
    
    document.addEventListener('mousemove', handlePanMove);
    document.addEventListener('mouseup', handlePanEnd);
    
    return () => {
      document.removeEventListener('mousemove', handlePanMove);
      document.removeEventListener('mouseup', handlePanEnd);
    };
  }, [isPanning, handlePanMove, handlePanEnd]);

  // Handle shift+wheel for horizontal scrolling
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const handleWheel = (e: WheelEvent) => {
      if (e.shiftKey) {
        e.preventDefault();
        container.scrollLeft += e.deltaY;
      }
    };
    
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  return (
    <div 
      ref={scrollContainerRef}
      className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 to-gray-100/30 dark:from-gray-900 dark:to-gray-800/50 relative select-none"
      style={{ 
        cursor: isPanning ? 'grabbing' : 'default',
        padding: '100px'
      }}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseDown={handlePanStart}
    >
      <div className="flex justify-center items-start min-h-full" style={{ minWidth: 'fit-content' }}>
        <div 
          ref={canvasRef}
          className="relative bg-white dark:bg-gray-800 shadow-2xl border border-gray-200/60 dark:border-gray-700 cursor-crosshair rounded-xl overflow-hidden"
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top center',
            width: `${canvasWidth}px`,
            height: `${canvasHeight}px`,
            minHeight: '600px',
            margin: '0 100px'
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
      
      {/* Panning indicator */}
      {isPanning && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 bg-blue-600 text-white text-xs px-3 py-2 rounded-lg shadow-lg">
          Panning...
        </div>
      )}
    </div>
  );
};

export default CanvasContainer;