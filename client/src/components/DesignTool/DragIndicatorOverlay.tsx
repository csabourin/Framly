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
    const elementRef = canvasRef.current.querySelector(`[data-element-id="${hoveredElementId}"]`) as HTMLElement;
    if (!elementRef) return null;
    
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const elementRect = elementRef.getBoundingClientRect();
    
    // Calculate relative position within canvas
    const relativeX = (elementRect.left - canvasRect.left) / zoomLevel;
    const relativeY = (elementRect.top - canvasRect.top) / zoomLevel;
    const relativeWidth = elementRect.width / zoomLevel;
    const relativeHeight = elementRect.height / zoomLevel;
    
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
      const parentElement = element.parent ? currentElements[element.parent] : currentElements.root;
      const parentRef = canvasRef.current.querySelector(`[data-element-id="${parentElement?.id || 'root'}"]`) as HTMLElement;
      
      let lineWidth = relativeWidth;
      let lineX = relativeX;
      
      if (parentRef) {
        const parentRect = parentRef.getBoundingClientRect();
        lineWidth = parentRect.width / zoomLevel;
        lineX = (parentRect.left - canvasRect.left) / zoomLevel;
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
      const canvasWidth = canvasRef.current.offsetWidth / zoomLevel;
      return {
        type: 'line',
        left: 0,
        top: hoveredZone === 'canvas-top' ? 0 : canvasRef.current.offsetHeight / zoomLevel - 2,
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
            className="absolute border-2 border-blue-500 bg-blue-500/20 rounded animate-pulse"
            style={{
              left: `${indicatorStyle.left}px`,
              top: `${indicatorStyle.top}px`,
              width: `${indicatorStyle.width}px`,
              height: `${indicatorStyle.height}px`,
              transition: 'none'
            }}
          />
          
          {/* Container corners for better visual clarity */}
          {[
            { left: indicatorStyle.left - 4, top: indicatorStyle.top - 4 },
            { left: indicatorStyle.left + indicatorStyle.width - 8, top: indicatorStyle.top - 4 },
            { left: indicatorStyle.left - 4, top: indicatorStyle.top + indicatorStyle.height - 8 },
            { left: indicatorStyle.left + indicatorStyle.width - 8, top: indicatorStyle.top + indicatorStyle.height - 8 }
          ].map((corner, index) => (
            <div
              key={index}
              className="absolute bg-blue-600 rounded-sm"
              style={{
                left: `${corner.left}px`,
                top: `${corner.top}px`,
                width: '12px',
                height: '12px',
                transition: 'none'
              }}
            />
          ))}
          
          {/* Landing zone preview */}
          <div
            className="absolute border-2 border-dashed border-blue-600 bg-blue-600/10 rounded-sm"
            style={{
              left: `${indicatorStyle.left + 8}px`,
              top: `${indicatorStyle.top + 8}px`,
              width: `${Math.max(60, indicatorStyle.width - 16)}px`,
              height: `${Math.max(30, indicatorStyle.height - 16)}px`,
              transition: 'none'
            }}
          />
          
          {/* Enhanced text label */}
          <div
            className="absolute bg-blue-600 text-white text-xs px-3 py-1 rounded-md font-medium pointer-events-none flex items-center gap-1 shadow-lg"
            style={{
              left: `${indicatorStyle.left + 4}px`,
              top: `${indicatorStyle.top - 25}px`,
              transition: 'none'
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M2 2V10H10V2H2ZM9 9H3V3H9V9Z"/>
            </svg>
            Drop inside container
          </div>
        </>
      )}
      
      {indicatorStyle.type === 'line' && (
        <>
          {/* Enhanced insertion line with better visibility */}
          <div
            className="absolute bg-green-500 shadow-lg animate-pulse"
            style={{
              left: `${indicatorStyle.left}px`,
              top: `${indicatorStyle.top}px`,
              width: `${indicatorStyle.width}px`,
              height: `${indicatorStyle.height}px`,
              transition: 'none',
              borderRadius: '2px'
            }}
          />
          
          {/* Side markers for better insertion visibility */}
          <div
            className="absolute bg-green-500 rounded-full animate-pulse"
            style={{
              left: `${indicatorStyle.left - 6}px`,
              top: `${indicatorStyle.top - 3}px`,
              width: '12px',
              height: `${indicatorStyle.height + 6}px`,
              transition: 'none'
            }}
          />
          <div
            className="absolute bg-green-500 rounded-full animate-pulse"
            style={{
              left: `${indicatorStyle.left + indicatorStyle.width - 6}px`,
              top: `${indicatorStyle.top - 3}px`,
              width: '12px',
              height: `${indicatorStyle.height + 6}px`,
              transition: 'none'
            }}
          />
          
          {/* Landing zone preview box */}
          <div
            className="absolute border-2 border-green-500 bg-green-500/20 rounded-sm animate-pulse"
            style={{
              left: `${indicatorStyle.left}px`,
              top: `${indicatorStyle.top - 20}px`,
              width: `${indicatorStyle.width}px`,
              height: `35px`,
              transition: 'none'
            }}
          />
          
          {/* Enhanced text label with arrow */}
          <div
            className="absolute bg-green-600 text-white text-xs px-3 py-1 rounded-md font-medium pointer-events-none flex items-center gap-1 shadow-lg"
            style={{
              left: `${indicatorStyle.left + 4}px`,
              top: `${indicatorStyle.top - 40}px`,
              transition: 'none'
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M6 2L10 6H8V10H4V6H2L6 2Z"/>
            </svg>
            Insert between
          </div>
        </>
      )}
    </div>
  );
});

DragIndicatorOverlay.displayName = 'DragIndicatorOverlay';

export default DragIndicatorOverlay;