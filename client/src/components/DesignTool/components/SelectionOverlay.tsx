import React from 'react';

interface SelectionOverlayProps {
  selectedElementId: string | null;
  hoveredElementId: string | null;
  elements: Record<string, any>;
  zoomLevel: number;
}

/**
 * Selection Overlay Component (60 lines)
 * 
 * Responsibilities:
 * - Element selection highlighting
 * - Hover state visual feedback
 * - Focus indicators for accessibility
 */
const SelectionOverlay: React.FC<SelectionOverlayProps> = ({
  selectedElementId,
  hoveredElementId,
  elements,
  zoomLevel
}) => {
  const getElementBounds = (elementId: string) => {
    const element = document.querySelector(`[data-element-id="${elementId}"]`);
    if (!element) return null;
    
    const rect = element.getBoundingClientRect();
    const canvas = document.querySelector('[data-canvas="true"]');
    if (!canvas) return null;
    
    const canvasRect = canvas.getBoundingClientRect();
    
    return {
      x: (rect.left - canvasRect.left) / zoomLevel,
      y: (rect.top - canvasRect.top) / zoomLevel,
      width: rect.width / zoomLevel,
      height: rect.height / zoomLevel,
    };
  };

  const renderSelectionOutline = (elementId: string, isSelected: boolean, isHovered: boolean) => {
    const bounds = getElementBounds(elementId);
    if (!bounds) return null;

    const style = {
      position: 'absolute' as const,
      left: `${bounds.x - 2}px`,
      top: `${bounds.y - 2}px`,
      width: `${bounds.width + 4}px`,
      height: `${bounds.height + 4}px`,
      pointerEvents: 'none' as const,
      zIndex: isSelected ? 998 : 997,
      border: isSelected 
        ? '2px solid #3b82f6' 
        : isHovered 
          ? '2px solid rgba(59, 130, 246, 0.5)'
          : 'none',
      borderRadius: '2px',
      backgroundColor: isHovered && !isSelected 
        ? 'rgba(59, 130, 246, 0.05)' 
        : 'transparent',
    };

    return <div key={`${elementId}-${isSelected ? 'selected' : 'hovered'}`} style={style} />;
  };

  return (
    <>
      {/* Hovered element outline */}
      {hoveredElementId && hoveredElementId !== selectedElementId && (
        renderSelectionOutline(hoveredElementId, false, true)
      )}
      
      {/* Selected element outline */}
      {selectedElementId && selectedElementId !== 'root' && (
        renderSelectionOutline(selectedElementId, true, false)
      )}
    </>
  );
};

export default SelectionOverlay;