import React, { useMemo } from 'react';
import { CanvasElement } from '../../types/canvas';

interface DragIndicatorOverlayProps {
  hoveredElementId: string | null;
  hoveredZone: 'before' | 'after' | 'inside' | 'canvas-top' | 'canvas-bottom' | null;
  currentElements: Record<string, CanvasElement>;
  zoomLevel: number;
  canvasRef: React.RefObject<HTMLDivElement>;
}

/**
 * Centralized overlay for all drag indicators to prevent artifacts and ensure proper layering
 * Implements mutual exclusivity and proper anchoring as per the artifact fixes
 */
const DragIndicatorOverlay: React.FC<DragIndicatorOverlayProps> = React.memo(({ 
  hoveredElementId, 
  hoveredZone, 
  currentElements,
  zoomLevel,
  canvasRef
}) => {
  
  const indicatorStyle = useMemo(() => {
    if (!hoveredElementId || !hoveredZone || !canvasRef.current) return null;
    
    const element = currentElements[hoveredElementId];
    if (!element) return null;
    
    // Get element bounds in canvas coordinate space
    const elementRef = canvasRef.current?.querySelector(`[data-element-id="${hoveredElementId}"]`) as HTMLElement;
    if (!elementRef) return null;
    
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return null;
    
    const elementRect = elementRef.getBoundingClientRect();
    
    // Calculate position relative to canvas viewport (not scaled)
    const relativeX = (elementRect.left - canvasRect.left);
    const relativeY = (elementRect.top - canvasRect.top);
    const relativeWidth = elementRect.width;
    const relativeHeight = elementRect.height;
    
    // Determine indicator type and style based on zone and element capabilities
    const canAcceptChildren = element.type === 'container' || 
                              element.type === 'section' || 
                              element.type === 'header' || 
                              element.type === 'footer' || 
                              element.type === 'nav' || 
                              element.type === 'article';
    
    // Mutual exclusivity rule: inside highlight OR before/after lines, never both
    if (hoveredZone === 'inside' && canAcceptChildren) {
      // Blue inside highlight for valid containers
      return {
        type: 'inside',
        left: relativeX,
        top: relativeY,
        width: relativeWidth,
        height: relativeHeight
      };
    } else if (hoveredZone === 'before' || hoveredZone === 'after') {
      // Green lines for sibling insertion
      const lineY = hoveredZone === 'before' ? relativeY : relativeY + relativeHeight;
      
      // Find parent container for full-width line anchoring
      const parentElement = element.parent ? currentElements[element.parent] : null;
      const parentRef = parentElement ? canvasRef.current?.querySelector(`[data-element-id="${parentElement.id}"]`) as HTMLElement : canvasRef.current;
      
      let lineWidth = relativeWidth;
      let lineX = relativeX;
      
      if (parentRef && parentRef !== canvasRef.current) {
        const parentRect = parentRef.getBoundingClientRect();
        lineWidth = parentRect.width;
        lineX = (parentRect.left - canvasRect.left);
      } else if (parentRef === canvasRef.current) {
        // Use full canvas width for root-level elements
        lineWidth = canvasRect.width;
        lineX = 0;
      }
      
      return {
        type: 'line',
        left: lineX,
        top: lineY - 1, // Center the 2px line
        width: lineWidth,
        height: 2
      };
    } else if (hoveredZone === 'canvas-top' || hoveredZone === 'canvas-bottom') {
      // Document start/end indicators
      const canvasWidth = canvasRef.current.offsetWidth;
      return {
        type: 'line',
        left: 0,
        top: hoveredZone === 'canvas-top' ? 0 : canvasRef.current.offsetHeight - 2,
        width: canvasWidth,
        height: 2
      };
    }
    
    return null;
  }, [hoveredElementId, hoveredZone, currentElements, zoomLevel, canvasRef]);
  
  if (!indicatorStyle) return null;
  
  return (
    <div 
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 9999 }}
    >
      {indicatorStyle.type === 'inside' && (
        <>
          {/* Container highlight - blue background */}
          <div
            className="absolute border-2 border-blue-500 bg-blue-500/30 rounded animate-pulse"
            style={{
              left: `${indicatorStyle.left}px`,
              top: `${indicatorStyle.top}px`,
              width: `${indicatorStyle.width}px`,
              height: `${indicatorStyle.height}px`,
              transition: 'none'
            }}
          />
          {/* Landing zone preview */}
          <div
            className="absolute border-2 border-blue-600 bg-blue-600/40 rounded-sm"
            style={{
              left: `${indicatorStyle.left + 8}px`,
              top: `${indicatorStyle.top + 8}px`,
              width: `${Math.max(60, indicatorStyle.width - 16)}px`,
              height: `${Math.max(30, indicatorStyle.height - 16)}px`,
              transition: 'none'
            }}
          />
          {/* Text label */}
          <div
            className="absolute bg-blue-600 text-white text-xs px-2 py-1 rounded-sm font-medium pointer-events-none"
            style={{
              left: `${indicatorStyle.left + 4}px`,
              top: `${indicatorStyle.top - 20}px`,
              transition: 'none'
            }}
          >
            Drop inside
          </div>
        </>
      )}
      
      {indicatorStyle.type === 'line' && (
        <>
          {/* Green insertion line */}
          <div
            className="absolute bg-green-500 shadow-lg"
            style={{
              left: `${indicatorStyle.left}px`,
              top: `${indicatorStyle.top}px`,
              width: `${indicatorStyle.width}px`,
              height: `${indicatorStyle.height}px`,
              transition: 'none'
            }}
          />
          {/* Landing zone preview box */}
          <div
            className="absolute border-2 border-green-500 bg-green-500/20 rounded-sm"
            style={{
              left: `${indicatorStyle.left + 8}px`,
              top: `${indicatorStyle.top - 15}px`,
              width: `${Math.min(120, indicatorStyle.width - 16)}px`,
              height: `30px`,
              transition: 'none'
            }}
          />
          {/* Text label */}
          <div
            className="absolute bg-green-600 text-white text-xs px-2 py-1 rounded-sm font-medium pointer-events-none"
            style={{
              left: `${indicatorStyle.left + 4}px`,
              top: `${indicatorStyle.top - 35}px`,
              transition: 'none'
            }}
          >
            Drop here
          </div>
        </>
      )}
    </div>
  );
});

DragIndicatorOverlay.displayName = 'DragIndicatorOverlay';

export default DragIndicatorOverlay;