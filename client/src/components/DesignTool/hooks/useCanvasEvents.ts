import { useCallback, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { resetUI } from '../../../store/uiSlice';
import { useToolHandler } from './useToolHandler';
import { useElementSelection } from './useElementSelection';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

/**
 * Hook for handling core canvas events (mouse, keyboard, touch)
 * Extracted from Canvas.tsx for better maintainability
 */
export const useCanvasEvents = (expandedElements?: Record<string, any>, zoomLevel?: number) => {
  const dispatch = useDispatch();
  const toolHandler = useToolHandler(expandedElements || {}, zoomLevel || 1);
  const elementSelection = useElementSelection(zoomLevel || 1);
  const keyboardShortcuts = useKeyboardShortcuts();
  const lastMousePos = useRef({ x: 0, y: 0 });
  const [inputModality, setInputModality] = useState<'mouse' | 'keyboard'>('mouse');

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    
    e.preventDefault();
    setInputModality('mouse');
    
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    
    // Clear any existing drag states
    dispatch(resetUI());
    
    if (toolHandler.selectedTool === 'select') {
      // Click on empty canvas area - select root
      elementSelection.handleCanvasBackgroundClick();
    }
  }, [toolHandler.selectedTool, elementSelection, dispatch]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Handle canvas-level clicks
    if (e.target === e.currentTarget) {
      elementSelection.handleCanvasBackgroundClick();
    }
  }, [elementSelection]);

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
    keyboardShortcuts.handleKeyDown(e);
  }, [keyboardShortcuts]);

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