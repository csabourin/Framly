import React from 'react';

interface SelectionOverlayProps {
  selectedElementId: string | null;
  hoveredElementId: string | null;
  elements: Record<string, any>;
  zoomLevel: number;
}

/**
 * Visual feedback for element selection and hover states
 * Extracted from Canvas.tsx for better maintainability
 */
export const SelectionOverlay: React.FC<SelectionOverlayProps> = ({ 
  selectedElementId,
  hoveredElementId,
  elements,
  zoomLevel
}) => {
  const renderElementOutline = (elementId: string, type: 'selected' | 'hovered') => {
    const element = elements[elementId];
    if (!element) return null;

    const isSelected = type === 'selected';
    const outlineColor = isSelected ? 'border-blue-500' : 'border-gray-400';
    const bgColor = isSelected ? 'bg-blue-500/10' : 'bg-gray-400/5';

    return (
      <div
        key={`${type}-${elementId}`}
        className={`absolute pointer-events-none z-[40] border-2 ${outlineColor} ${bgColor} rounded transition-all duration-150`}
        style={{
          left: element.x || 0,
          top: element.y || 0,
          width: element.width || 100,
          height: element.height || 20,
        }}
      >
        {/* Element type label */}
        {isSelected && (
          <div
            className="absolute -top-6 left-0 bg-blue-600 text-white px-1.5 py-0.5 rounded text-xs font-medium shadow-sm"
            style={{ fontSize: `${Math.max(10, 12 / zoomLevel)}px` }}
          >
            {element.type}
          </div>
        )}
        
        {/* Selection handles for selected element */}
        {isSelected && (
          <>
            {/* Corner handles */}
            <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-600 border border-white rounded-sm cursor-nw-resize" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-600 border border-white rounded-sm cursor-ne-resize" />
            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-600 border border-white rounded-sm cursor-sw-resize" />
            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-600 border border-white rounded-sm cursor-se-resize" />
            
            {/* Edge handles */}
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-600 border border-white rounded-sm cursor-n-resize" />
            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-600 border border-white rounded-sm cursor-s-resize" />
            <div className="absolute top-1/2 -left-1 transform -translate-y-1/2 w-2 h-2 bg-blue-600 border border-white rounded-sm cursor-w-resize" />
            <div className="absolute top-1/2 -right-1 transform -translate-y-1/2 w-2 h-2 bg-blue-600 border border-white rounded-sm cursor-e-resize" />
          </>
        )}
      </div>
    );
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Hovered element outline */}
      {hoveredElementId && hoveredElementId !== selectedElementId && 
        renderElementOutline(hoveredElementId, 'hovered')
      }
      
      {/* Selected element outline (renders on top) */}
      {selectedElementId && 
        renderElementOutline(selectedElementId, 'selected')
      }
    </div>
  );
};

export default SelectionOverlay;