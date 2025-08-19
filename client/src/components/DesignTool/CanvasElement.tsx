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
}

const CanvasElement: React.FC<CanvasElementProps> = ({ element, isSelected, isHovered = false, hoveredZone = null }) => {
  const dispatch = useDispatch();
  const { project } = useSelector((state: RootState) => state.canvas);
  const { selectedTool } = useSelector((state: RootState) => state.ui);
  const elementRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(selectElement(element.id));
  }, [element.id, dispatch]);

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
                isHovered={false}
                hoveredZone={null}
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

  // Define visual feedback based on selection and hover states
  const getBorderStyle = () => {
    if (isSelected) return '2px solid #3b82f6';
    if (isHovered && hoveredZone === 'inside') return '4px solid #a855f7';
    if (isHovered && (hoveredZone === 'before' || hoveredZone === 'after')) return '2px solid #3b82f6';
    return undefined;
  };

  const getBackgroundColor = () => {
    if (isHovered && hoveredZone === 'inside') return 'rgba(168, 85, 247, 0.1)';
    return element.styles.backgroundColor;
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
    boxShadow: isSelected ? '0 0 0 1px rgba(59, 130, 246, 0.3)' : undefined,
  };

  // Add debug logging
  if (isHovered) {
    console.log('Element hover state:', { 
      elementId: element.id, 
      isHovered, 
      hoveredZone, 
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
