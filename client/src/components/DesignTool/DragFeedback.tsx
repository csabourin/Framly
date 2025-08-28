import React, { useEffect, useRef, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentElements, selectIsDraggingForReorder } from '../../store/selectors';


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
  const isDraggingForReorder = useSelector(selectIsDraggingForReorder);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
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

  // Track mouse position for ghost object with better precision
  useEffect(() => {
    if (!isDraggingForReorder) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      // Use RAF for smooth positioning
      requestAnimationFrame(() => {
        setMousePosition({ x: e.clientX, y: e.clientY });
      });
    };
    
    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [isDraggingForReorder]);

  // Get dragged element for ghost rendering
  const draggedElement = draggedElementId ? currentElements[draggedElementId] : null;
  
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
      
      {/* HTML5 drag and drop doesn't need custom ghost - browser handles it */}
      {false && isDraggingForReorder && draggedElement && draggedElement.id && (
        <div
          className="fixed z-[10000] pointer-events-none opacity-75"
          style={{
            left: `${mousePosition.x}px`,
            top: `${mousePosition.y}px`,
            transform: 'translate(-50%, -50%)',
            width: `${Math.min(draggedElement?.width || 100, 200)}px`,
            height: `${Math.min(draggedElement?.height || 40, 100)}px`
          }}
        >
          {/* Visual clone that matches the original element */}
          <div 
            className="relative w-full h-full border-2 border-blue-500 rounded shadow-lg"
            style={{
              backgroundColor: draggedElement?.styles?.backgroundColor || 'white',
              borderColor: draggedElement?.styles?.borderColor || '#3b82f6',
              borderRadius: draggedElement?.styles?.borderRadius || '4px',
              fontSize: draggedElement?.styles?.fontSize || '14px',
              fontWeight: draggedElement?.styles?.fontWeight || 'normal',
              color: draggedElement?.styles?.color || '#1f2937'
            }}
          >
            {/* Element-specific content rendering */}
            {draggedElement?.type === 'text' && (
              <div className="p-2 overflow-hidden">
                {draggedElement?.content?.substring(0, 50) || 'Text Element'}
              </div>
            )}
            {draggedElement?.type === 'button' && (
              <div className="w-full h-full flex items-center justify-center font-medium">
                {(draggedElement as any)?.buttonText || draggedElement?.content || 'Button'}
              </div>
            )}
            {draggedElement?.type === 'image' && (
              <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                {(draggedElement as any)?.imageBase64 || (draggedElement as any)?.imageUrl ? (
                  <img 
                    src={(draggedElement as any)?.imageBase64 || (draggedElement as any)?.imageUrl} 
                    alt=""
                    className="w-full h-full object-cover rounded"
                  />
                ) : (
                  <span className="text-gray-500 text-sm">Image</span>
                )}
              </div>
            )}
            {draggedElement?.type === 'rectangle' && (
              <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">
                Rectangle
              </div>
            )}
            {draggedElement?.type === 'container' && (
              <div className="w-full h-full flex items-center justify-center text-sm text-gray-500 border-2 border-dashed border-gray-300">
                Container
              </div>
            )}
            {!['text', 'button', 'image', 'rectangle', 'container'].includes(draggedElement?.type || '') && (
              <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">
                {draggedElement?.type?.charAt(0).toUpperCase() + draggedElement?.type?.slice(1)}
              </div>
            )}
            
            {/* Dragging indicator overlay */}
            <div className="absolute inset-0 bg-blue-500/20 rounded pointer-events-none" />
          </div>
        </div>
      )}
      
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