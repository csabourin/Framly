import { useCallback, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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
import { selectSelectedTool } from '../../../store/selectors';

/**
 * Hook for handling core canvas events (mouse, keyboard, touch)
 * Extracted from Canvas.tsx for better maintainability
 */
export const useCanvasEvents = () => {
  const dispatch = useDispatch();
  const selectedTool = useSelector(selectSelectedTool);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const [inputModality, setInputModality] = useState<'mouse' | 'keyboard'>('mouse');

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    
    e.preventDefault();
    setInputModality('mouse');
    
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    
    // Clear any existing drag states
    dispatch(resetUI());
    
    if (selectedTool === 'select') {
      // Click on empty canvas area - select root
      dispatch(selectElement('root'));
    }
  }, [selectedTool, dispatch]);

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
    setInputModality('keyboard');
    
    // Handle keyboard shortcuts
    if (e.key === 'Escape') {
      dispatch(resetUI());
    } else if (e.key === 'v' && !e.ctrlKey && !e.metaKey) {
      dispatch(setSelectedTool('select'));
    } else if (e.key === 'r' && !e.ctrlKey && !e.metaKey) {
      dispatch(setSelectedTool('rectangle'));
    } else if (e.key === 't' && !e.ctrlKey && !e.metaKey) {
      dispatch(setSelectedTool('text'));
    } else if (e.key === 'i' && !e.ctrlKey && !e.metaKey) {
      dispatch(setSelectedTool('image'));
    }
  }, [dispatch]);

  return {
    handleCanvasMouseDown,
    handleCanvasClick,
    handleCanvasDoubleClick,
    handleCanvasContextMenu,
    handleCanvasKeyDown,
    inputModality,
    lastMousePos: lastMousePos.current
  };
};