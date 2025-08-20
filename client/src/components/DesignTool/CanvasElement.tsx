import React, { useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { selectElement, updateElement } from '../../store/canvasSlice';
import { CanvasElement as CanvasElementType } from '../../types/canvas';

interface CanvasElementProps {
  element: CanvasElementType;
  isSelected: boolean;
  isHovered?: boolean;
  hoveredZone?: 'before' | 'after' | 'inside' | null;
  hoveredElementId?: string | null;
}

// Get hover state from Redux if not passed down
const useHoverState = () => {
  return useSelector((state: RootState) => ({
    hoveredElementId: (state as any).ui?.hoveredElementId || null,
    hoveredZone: (state as any).ui?.hoveredZone || null,
  }));
};

const CanvasElement: React.FC<CanvasElementProps> = ({ 
  element, 
  isSelected, 
  isHovered = false, 
  hoveredZone = null,
  hoveredElementId
}) => {
  const dispatch = useDispatch();
  const { project } = useSelector((state: RootState) => state.canvas);
  const { selectedTool, isDraggingForReorder, draggedElementId } = useSelector((state: RootState) => state.ui);
  const elementRef = useRef<HTMLDivElement>(null);
  
  // Get hover state from Redux if not provided via props
  const reduxHoverState = useHoverState();
  const actualHoveredElementId = hoveredElementId !== undefined ? hoveredElementId : reduxHoverState.hoveredElementId;
  const actualHoveredZone = hoveredZone !== undefined ? hoveredZone : reduxHoverState.hoveredZone;
  
  // Check if this element is hovered
  const isThisElementHovered = actualHoveredElementId === element.id;
  const thisElementHoveredZone = isThisElementHovered ? actualHoveredZone : null;

  const handleClick = useCallback((e: React.MouseEvent) => {
    console.log('CanvasElement click - selectedTool:', selectedTool, 'elementId:', element.id);
    
    // Only handle selection for select and hand tools
    // For creation tools, let the event bubble to canvas
    if (['select', 'hand'].includes(selectedTool)) {
      e.stopPropagation();
      dispatch(selectElement(element.id));
    } else {
      console.log('Creation tool - NOT stopping propagation, letting canvas handle it');
      // Don't stop propagation for creation tools - let canvas handle it
    }
  }, [element.id, dispatch, selectedTool]);

  const handleContentEdit = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    const newContent = e.currentTarget.textContent || '';
    dispatch(updateElement({
      id: element.id,
      updates: { content: newContent }
    }));
  }, [element.id, dispatch]);

  const renderContent = () => {
    if (element.type === 'text') {
      const isTextEditable = isSelected && selectedTool === 'text';
      
      return (
        <div
          contentEditable={isTextEditable}
          suppressContentEditableWarning
          onBlur={handleContentEdit}
          onDoubleClick={(e) => {
            e.stopPropagation();
            // Make editable on double click
            e.currentTarget.contentEditable = 'true';
            e.currentTarget.focus();
          }}
          className={`w-full h-full outline-none ${isTextEditable ? 'cursor-text' : 'cursor-pointer'}`}
          style={{ minHeight: '1em' }}
        >
          {element.content || 'Edit this text'}
        </div>
      );
    }

    if (element.type === 'image') {
      return (
        <div className="w-full h-full flex items-center justify-center text-gray-500 bg-gray-100 rounded">
          <span>Image Placeholder</span>
        </div>
      );
    }

    if ((element.type === 'container' || element.type === 'rectangle') && element.children) {
      return (
        <>
          {element.children.map(childId => {
            const child = project.elements[childId];
            return child ? (
              <CanvasElement 
                key={child.id} 
                element={child}
                isSelected={child.id === project.selectedElementId}
                isHovered={child.id === actualHoveredElementId}
                hoveredZone={child.id === actualHoveredElementId ? actualHoveredZone : null}
                hoveredElementId={actualHoveredElementId}
              />
            ) : null;
          })}
        </>
      );
    }

    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400">
        {element.type}
      </div>
    );
  };

  // Define visual feedback based on selection, hover, and drag states
  const getBorderStyle = () => {
    if (isSelected) return '2px solid #3b82f6';
    
    // Drag-drop visual feedback (blue dashed for insertion zones)
    if (isDraggingForReorder && isThisElementHovered && thisElementHoveredZone === 'inside') {
      return '3px dashed #3b82f6';
    }
    
    // Creation tool hover feedback (purple for inside, blue for before/after)
    if (isThisElementHovered && thisElementHoveredZone === 'inside') return '4px solid #a855f7';
    if (isThisElementHovered && (thisElementHoveredZone === 'before' || thisElementHoveredZone === 'after')) return '2px solid #3b82f6';
    
    return undefined;
  };

  const getBackgroundColor = () => {
    // Creation tool hover feedback
    if (isThisElementHovered && thisElementHoveredZone === 'inside') return 'rgba(168, 85, 247, 0.1)';
    
    // Drag-drop feedback (lighter blue)
    if (isDraggingForReorder && isThisElementHovered && thisElementHoveredZone === 'inside') {
      return 'rgba(59, 130, 246, 0.05)';
    }
    
    return element.styles.backgroundColor;
  };

  const getBoxShadow = () => {
    if (isSelected) return '0 0 0 1px rgba(59, 130, 246, 0.3)';
    if (isThisElementHovered && thisElementHoveredZone === 'inside') return '0 0 0 2px #a855f7';
    return undefined;
  };

  const combinedStyles: React.CSSProperties = {
    position: element.styles.position === 'absolute' ? 'absolute' : 'relative',
    left: element.styles.position === 'absolute' ? element.x : undefined,
    top: element.styles.position === 'absolute' ? element.y : undefined,
    width: element.styles.width || (element.width === 0 ? '100%' : element.width),
    height: element.styles.minHeight ? undefined : element.height,
    ...element.styles,
    backgroundColor: getBackgroundColor(),
    border: getBorderStyle() || element.styles.border,
    boxShadow: getBoxShadow(),
    // Ensure the visual feedback is always visible
    zIndex: isThisElementHovered ? 1000 : (isSelected ? 100 : undefined),
  };

  // Add debug logging for hover state
  if (isThisElementHovered) {
    console.log('Element hover state:', { 
      elementId: element.id, 
      isHovered: isThisElementHovered, 
      hoveredZone: thisElementHoveredZone, 
      border: getBorderStyle(),
      backgroundColor: getBackgroundColor()
    });
  }

  return (
    <div
      ref={elementRef}
      className={`
        canvas-element
        ${isSelected ? 'selected' : ''}
        ${element.classes?.join(' ') || ''}
      `}
      style={combinedStyles}
      onClick={handleClick}
      onMouseDown={(e) => {
        // Prevent mouse down from interfering with canvas click detection
        if (!['select', 'hand'].includes(selectedTool)) {
          e.preventDefault();
        }
      }}
      data-element-id={element.id}
      data-testid={`canvas-element-${element.id}`}
    >
      {renderContent()}
      
      {/* Resize Handles */}
      {isSelected && (
        <>
          <div className="resize-handle top" data-testid="resize-handle-top" />
          <div className="resize-handle bottom" data-testid="resize-handle-bottom" />
          <div className="resize-handle left" data-testid="resize-handle-left" />
          <div className="resize-handle right" data-testid="resize-handle-right" />
        </>
      )}
    </div>
  );
};

export default CanvasElement;
