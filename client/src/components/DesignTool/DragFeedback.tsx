import React, { useEffect, useRef, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentElements } from '../../store/selectors';
import { generateInsertionAnnouncement } from '../../utils/predictableInsertion';

interface DragFeedbackProps {
  hoveredElementId: string | null;
  hoveredZone: 'before' | 'after' | 'inside' | 'canvas-top' | 'canvas-bottom' | null;
  draggedElementId?: string;
}

const DragFeedback: React.FC<DragFeedbackProps> = React.memo(({ 
  hoveredElementId, 
  hoveredZone, 
  draggedElementId
}) => {
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const currentElements = useSelector(selectCurrentElements);
  
  // Generate announcement using predictable insertion logic
  const announcement = useMemo(() => {
    if (!hoveredElementId || !hoveredZone) return '';
    
    const hoveredElement = currentElements[hoveredElementId];
    if (!hoveredElement) return '';
    
    // Handle special canvas zones
    if (hoveredZone === 'canvas-top') {
      return 'Insert at top of canvas';
    } else if (hoveredZone === 'canvas-bottom') {
      return 'Insert at bottom of canvas';
    }
    
    // Use predictable announcement generation
    const insertionZone = {
      elementId: hoveredElementId,
      position: hoveredZone as 'before' | 'after' | 'inside',
      bounds: { x: 0, y: 0, width: 0, height: 0 }, // Bounds not needed for announcement
      confidence: 1
    };
    
    return generateInsertionAnnouncement(insertionZone, hoveredElement);
  }, [hoveredElementId, hoveredZone, currentElements]);

  // Update ARIA live announcement (throttled)
  useEffect(() => {
    if (!announcement || !liveRegionRef.current) return;
    
    liveRegionRef.current.textContent = announcement;
    
    // Clear the announcement after a short delay to prevent repetition
    const timer = setTimeout(() => {
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = '';
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [announcement]);
  
  return (
    <>
      {/* ARIA Live Region for screen reader announcements */}
      <div
        ref={liveRegionRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      />
      
      {/* Visual feedback tooltip */}
      {hoveredElementId && hoveredZone && (
        <div
          className="fixed z-50 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded shadow-lg pointer-events-none"
          style={{
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999
          }}
        >
          {announcement}
        </div>
      )}
    </>
  );
});

DragFeedback.displayName = 'DragFeedback';

export default DragFeedback;