import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { 
  setSelectedTool,
  setDragging,
  setResizing,
  setDraggedElement,
  setDraggingForReorder,
  setHoveredElement,
  resetUI
} from '../../../store/uiSlice';
import { selectElement } from '../../../store/canvasSlice';

/**
 * Hook for handling core canvas events (mouse, keyboard, touch)
 * Extracted from Canvas.tsx for better maintainability
 */
export const useCanvasEvents = () => {
  const dispatch = useDispatch();

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Prevent default to avoid unwanted selections
    e.preventDefault();
    
    // If clicking on empty canvas, select root and switch to select tool
    if (e.target === e.currentTarget) {
      dispatch(selectElement('root'));
      dispatch(setSelectedTool('select'));
    }
  }, [dispatch]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Handle canvas-level clicks
    if (e.target === e.currentTarget) {
      dispatch(selectElement('root'));
    }
  }, [dispatch]);

  const handleCanvasDoubleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Double-click on canvas creates new text element
    // This could be moved to a tool-specific handler later
  }, []);

  const handleCanvasContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    // Canvas context menu logic here
  }, []);

  const handleCanvasKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    // Canvas-specific keyboard shortcuts
    switch (e.key) {
      case 'Escape':
        // Clear selections, reset states
        dispatch(resetUI());
        break;
      case 'Delete':
      case 'Backspace':
        // Delete selected element (if not root)
        break;
      default:
        break;
    }
  }, [dispatch]);

  return {
    handleCanvasMouseDown,
    handleCanvasClick,
    handleCanvasDoubleClick,
    handleCanvasContextMenu,
    handleCanvasKeyDown
  };
};