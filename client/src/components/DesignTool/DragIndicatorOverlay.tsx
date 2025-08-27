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
        <div
          className="absolute border-2 border-blue-500 bg-blue-500/20 rounded"
          style={{
            left: `${indicatorStyle.left}px`,
            top: `${indicatorStyle.top}px`,
            width: `${indicatorStyle.width}px`,
            height: `${indicatorStyle.height}px`,
            transition: 'none' // Prevent transition artifacts
          }}
        />
      )}
      
      {indicatorStyle.type === 'line' && (
        <div
          className="absolute bg-green-500 rounded-full"
          style={{
            left: `${indicatorStyle.left}px`,
            top: `${indicatorStyle.top}px`,
            width: `${indicatorStyle.width}px`,
            height: `${indicatorStyle.height}px`,
            transition: 'none' // Prevent transition artifacts
          }}
        />
      )}
    </div>
  );
});

DragIndicatorOverlay.displayName = 'DragIndicatorOverlay';

export default DragIndicatorOverlay;