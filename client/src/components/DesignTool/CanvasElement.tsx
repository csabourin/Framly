import React, { useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { selectElement, updateElement } from '../../store/canvasSlice';
import { setSelectedTool } from '../../store/uiSlice';
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
    const newContent = e.currentTarget.innerHTML || '';
    dispatch(updateElement({
      id: element.id,
      updates: { content: newContent }
    }));
  }, [element.id, dispatch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      if (e.shiftKey) {
        // Shift+Enter: Insert line break
        document.execCommand('insertHTML', false, '<br>');
      } else {
        // Enter: Create new paragraph
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          
          // Create new paragraph element
          const newP = document.createElement('p');
          newP.innerHTML = '<br>'; // Empty paragraph with break for cursor positioning
          
          // Insert the new paragraph
          range.deleteContents();
          range.insertNode(newP);
          
          // Position cursor at start of new paragraph
          range.setStart(newP, 0);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    }
  }, []);

  const renderContent = () => {
    if (element.type === 'text') {
      const isTextEditable = isSelected && selectedTool === 'text';
      
      const processedContent = element.content || 'Edit this text';
      
      // If content doesn't have paragraph tags, wrap it in a paragraph
      const htmlContent = processedContent.includes('<p>') ? 
        processedContent : 
        `<p>${processedContent.replace(/\n/g, '<br>')}</p>`;

      if (isTextEditable) {
        return (
          <div
            contentEditable={true}
            suppressContentEditableWarning
            onBlur={handleContentEdit}
            onKeyDown={handleKeyDown}
            className="w-full h-full outline-none cursor-text"
            style={{ minHeight: '1em' }}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        );
      } else {
        return (
          <div
            onDoubleClick={(e) => {
              e.stopPropagation();
              // Switch to text tool on double click
              dispatch(setSelectedTool('text'));
            }}
            className="w-full h-full outline-none cursor-pointer text-element"
            style={{ minHeight: '1em' }}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        );
      }
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

  // Check if this element can accept drops (only containers and rectangles)
  const canAcceptDrop = element.type === 'container' || element.type === 'rectangle';
  
  // Define visual feedback based on selection, hover, and drag states
  const getBorderStyle = () => {
    if (isSelected) return '2px solid #3b82f6';
    
    // Drag-drop visual feedback (only show for compatible drop targets)
    if (isDraggingForReorder && isThisElementHovered && canAcceptDrop && thisElementHoveredZone === 'inside') {
      return '4px solid #22c55e'; // Green border for valid drop zones
    }
    
    // Creation tool hover feedback (purple for inside, blue for before/after)
    if (isThisElementHovered && thisElementHoveredZone === 'inside') return '4px solid #a855f7';
    if (isThisElementHovered && (thisElementHoveredZone === 'before' || thisElementHoveredZone === 'after')) return '2px solid #3b82f6';
    
    return undefined;
  };

  const getBackgroundColor = () => {
    // Creation tool hover feedback
    if (isThisElementHovered && thisElementHoveredZone === 'inside') return 'rgba(168, 85, 247, 0.1)';
    
    // Drag-drop feedback (green for valid drop zones, red for invalid)
    if (isDraggingForReorder && isThisElementHovered && thisElementHoveredZone === 'inside') {
      if (canAcceptDrop) {
        return 'rgba(34, 197, 94, 0.1)'; // Green background for valid drops
      } else {
        return 'rgba(239, 68, 68, 0.1)'; // Red background for invalid drops
      }
    }
    
    return element.styles.backgroundColor;
  };

  const getBoxShadow = () => {
    if (isSelected) return '0 0 0 1px rgba(59, 130, 246, 0.3)';
    
    // Drag-drop shadow feedback
    if (isDraggingForReorder && isThisElementHovered && thisElementHoveredZone === 'inside') {
      if (canAcceptDrop) {
        return '0 0 0 3px rgba(34, 197, 94, 0.5)'; // Green shadow for valid drops
      } else {
        return '0 0 0 3px rgba(239, 68, 68, 0.5)'; // Red shadow for invalid drops
      }
    }
    
    // Creation tool shadow
    if (isThisElementHovered && thisElementHoveredZone === 'inside') return '0 0 0 2px #a855f7';
    return undefined;
  };

  // Convert kebab-case CSS properties to camelCase for React
  const convertCSSPropertiesToCamelCase = (styles: any): React.CSSProperties => {
    const camelCaseStyles: any = {};
    
    for (const [key, value] of Object.entries(styles)) {
      // Convert kebab-case to camelCase
      const camelKey = key.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
      camelCaseStyles[camelKey] = value;
    }
    
    return camelCaseStyles;
  };

  const combinedStyles: React.CSSProperties = {
    position: element.styles.position === 'absolute' ? 'absolute' : 'relative',
    left: element.styles.position === 'absolute' ? element.x : undefined,
    top: element.styles.position === 'absolute' ? element.y : undefined,
    width: element.styles.width || (element.width === 0 ? '100%' : element.width),
    height: element.styles.minHeight ? undefined : element.height,
    ...convertCSSPropertiesToCamelCase(element.styles),
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

      onClick={handleClick}
      onMouseDown={(e) => {
        // Prevent mouse down from interfering with canvas click detection
        if (!['select', 'hand'].includes(selectedTool)) {
          e.preventDefault();
        }
        // Prevent text selection during drag operations
        if (selectedTool === 'hand') {
          e.preventDefault();
        }
      }}
      onDragStart={(e) => {
        // Prevent default drag behavior that interferes with our custom drag
        e.preventDefault();
      }}
      style={{
        ...combinedStyles,
        userSelect: selectedTool !== 'text' ? 'none' : 'auto',
        WebkitUserSelect: selectedTool !== 'text' ? 'none' : 'auto',
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
