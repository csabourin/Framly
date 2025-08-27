import React, { useEffect, useRef, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentElements } from '../../store/selectors';


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
  
  // Memoize announcement to prevent unnecessary calculations
  const announcement = useMemo(() => {
    if (!hoveredElementId || !hoveredZone) return '';
    
    const hoveredElement = currentElements[hoveredElementId];
    if (!hoveredElement) return '';
    
    const elementName = hoveredElement.type === 'container' ? 'Container' :
                       hoveredElement.type === 'text' ? 'Text' :
                       hoveredElement.type === 'heading' ? 'Heading' :
                       hoveredElement.type === 'button' ? 'Button' :
                       hoveredElement.type === 'image' ? 'Image' :
                       hoveredElement.type === 'list' ? 'List' :
                       hoveredElement.type === 'section' ? 'Section' :
                       hoveredElement.type === 'nav' ? 'Navigation' :
                       hoveredElement.type === 'header' ? 'Header' :
                       hoveredElement.type === 'footer' ? 'Footer' :
                       hoveredElement.type === 'article' ? 'Article' :
                       'Element';
    
    if (hoveredZone === 'inside') {
      return `Insert into ${elementName}`;
    } else if (hoveredZone === 'before') {
      return `Insert before ${elementName}`;
    } else if (hoveredZone === 'after') {
      return `Insert after ${elementName}`;
    } else if (hoveredZone === 'canvas-top') {
      return `Insert at top of canvas`;
    } else if (hoveredZone === 'canvas-bottom') {
      return `Insert at bottom of canvas`;
    }
    return '';
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