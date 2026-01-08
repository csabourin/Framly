import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { setSelectedTool, resetUI } from '../../../store/uiSlice';

/**
 * Hook for handling keyboard shortcuts within the canvas
 * Extracted for better maintainability and testing
 */
export const useKeyboardShortcuts = () => {
  const dispatch = useDispatch();

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    // Prevent default behavior for handled shortcuts
    const handleShortcut = (action: () => void) => {
      e.preventDefault();
      e.stopPropagation();
      action();
    };

    // Global shortcuts
    if (e.key === 'Escape') {
      handleShortcut(() => dispatch(resetUI()));
      return;
    }

    // Tool shortcuts (only when not holding modifier keys)
    if (!e.ctrlKey && !e.metaKey && !e.altKey) {
      switch (e.key.toLowerCase()) {
        case 'v':
          handleShortcut(() => dispatch(setSelectedTool('pointer')));
          break;
        case 'h':
          handleShortcut(() => dispatch(setSelectedTool('hand')));
          break;
        case 'r':
          handleShortcut(() => dispatch(setSelectedTool('rectangle')));
          break;
        case 't':
          handleShortcut(() => dispatch(setSelectedTool('text')));
          break;
        case 'i':
          handleShortcut(() => dispatch(setSelectedTool('image')));
          break;
        case 'c':
          handleShortcut(() => dispatch(setSelectedTool('container')));
          break;
        case 'b':
          handleShortcut(() => dispatch(setSelectedTool('button')));
          break;
        default:
          // Don't prevent default for unhandled keys
          break;
      }
    }
  }, [dispatch]);

  const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
    // Handle global shortcuts that work anywhere in the app
    if (e.key === 'Escape') {
      dispatch(resetUI());
    }
  }, [dispatch]);

  return {
    handleKeyDown,
    handleGlobalKeyDown
  };
};