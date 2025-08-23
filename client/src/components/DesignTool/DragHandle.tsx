import React from 'react';

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
        absolute -top-2 left-6 w-6 h-6 
        bg-blue-500 hover:bg-blue-600 active:bg-blue-700
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
      {/* Move icon with four arrows */}
      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" className="text-white">
        <path d="M6 0L4 2h4L6 0zM6 12l2-2H4l2 2zM0 6l2-2v4L0 6zM12 6l-2 2V4l2 2z"/>
        <circle cx="6" cy="6" r="1"/>
      </svg>
    </div>
  );
};

export default DragHandle;