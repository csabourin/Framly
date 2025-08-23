import React from 'react';
import { Move } from 'lucide-react';

interface DragHandleProps {
  onMouseDown: (e: React.MouseEvent) => void;
  className?: string;
}

const DragHandle: React.FC<DragHandleProps> = ({ onMouseDown, className = '' }) => {
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent element selection
    onMouseDown(e);
  };

  return (
    <div
      className={`
        drag-handle
        absolute -top-2 -right-2 w-6 h-6 
        bg-green-500 hover:bg-green-600 active:bg-green-700
        border-2 border-white 
        rounded-lg shadow-lg 
        flex items-center justify-center 
        cursor-grab hover:cursor-grab active:cursor-grabbing
        opacity-100
        transition-all duration-150
        z-50
        ${className}
      `}
      onMouseDown={handleMouseDown}
      data-testid="drag-handle"
      title="Drag to move"
    >
      <Move className="w-3 h-3 text-white" />
    </div>
  );
};

export default DragHandle;