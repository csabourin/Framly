import { useEffect } from 'react';
import { historyManager } from '../utils/historyManager';

export const useKeyboardShortcuts = () => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl+Z (Undo) or Cmd+Z on Mac
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        historyManager.performUndo();
        console.log('Undo triggered via keyboard shortcut');
        return;
      }

      // Check for Ctrl+Shift+Z (Redo) or Cmd+Shift+Z on Mac
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && event.shiftKey) {
        event.preventDefault();
        historyManager.performRedo();
        console.log('Redo triggered via keyboard shortcut');
        return;
      }

      // Alternative Redo shortcut: Ctrl+Y or Cmd+Y
      if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
        event.preventDefault();
        historyManager.performRedo();
        console.log('Redo triggered via keyboard shortcut (Ctrl+Y)');
        return;
      }
    };

    // Add event listener to document
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup on unmount
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
};