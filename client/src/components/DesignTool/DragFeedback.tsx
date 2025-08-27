import React, { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { canAcceptChildren } from '../../utils/canvas';

interface DragFeedbackProps {
  hoveredElementId: string | null;
  hoveredZone: 'before' | 'after' | 'inside' | 'canvas-top' | 'canvas-bottom' | null;
  draggedElementId?: string;
  currentElements: Record<string, any>;
}

const DragFeedback: React.FC<DragFeedbackProps> = ({ 
  hoveredElementId, 
  hoveredZone, 
  draggedElementId,
  currentElements 
}) => {
  const liveRegionRef = useRef<HTMLDivElement>(null);
  
  // Update ARIA live announcement
  useEffect(() => {
    if (!hoveredElementId || !hoveredZone || !liveRegionRef.current) return;
    
    const hoveredElement = currentElements[hoveredElementId];
    if (!hoveredElement) return;
    
    let announcement = '';
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
      announcement = `Insert into ${elementName}`;
    } else if (hoveredZone === 'before') {
      announcement = `Insert before ${elementName}`;
    } else if (hoveredZone === 'after') {
      announcement = `Insert after ${elementName}`;
    } else if (hoveredZone === 'canvas-top') {
      announcement = `Insert at top of canvas`;
    } else if (hoveredZone === 'canvas-bottom') {
      announcement = `Insert at bottom of canvas`;
    }
    
    // Update the live region content
    liveRegionRef.current.textContent = announcement;
    
    // Clear the announcement after a short delay to prevent repetition
    const timer = setTimeout(() => {
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = '';
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [hoveredElementId, hoveredZone, currentElements]);
  
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
      
      {/* Visual feedback tooltip - only show during drag operations */}
      {hoveredElementId && hoveredZone && draggedElementId && (
        <div
          className="fixed z-50 px-3 py-2 text-xs font-medium text-white bg-gray-900/90 backdrop-blur-sm rounded-lg shadow-xl pointer-events-none border border-gray-700"
          style={{
            top: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999
          }}
        >
          {(() => {
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
          })()}
        </div>
      )}
    </>
  );
};

export default DragFeedback;