import React from 'react';

interface DragFeedbackProps {
  hoveredElementId: string | null;
  hoveredZone: 'before' | 'after' | 'inside' | null;
  draggedElementId: string;
}

/**
 * Visual feedback component during drag-and-drop reordering
 */
const DragFeedback: React.FC<DragFeedbackProps> = ({
  hoveredElementId,
  hoveredZone,
  draggedElementId
}) => {
  if (!hoveredElementId || !hoveredZone) {
    return null;
  }

  return (
    <div 
      className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 
                 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg 
                 text-sm font-medium pointer-events-none"
      data-testid="drag-feedback"
    >
      Moving element {hoveredZone === 'inside' ? 'into' : hoveredZone} target
    </div>
  );
};

export default DragFeedback;