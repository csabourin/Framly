import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { 
  selectElement, 
  duplicateElement, 
  deleteElement,
  undo,
  redo,
  moveElement
} from '../store/canvasSlice';
import { setSelectedTool, setZoomLevel } from '../store/uiSlice';
import { Tool } from '../types/canvas';

// Detect platform
const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

export interface KeyboardShortcut {
  key: string;
  modifiers: {
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
  };
  description: string;
  category: string;
  action: () => void;
}

export const useKeyboardShortcuts = (onShowCheatsheet?: () => void) => {
  const dispatch = useDispatch();
  const selectedTool = useSelector((state: RootState) => state.ui.selectedTool);
  const zoomLevel = useSelector((state: RootState) => state.ui.zoomLevel);
  const selectedElement = useSelector((state: RootState) => {
    const currentTab = state.canvas.project.tabs[state.canvas.project.activeTabId];
    const selectedElementId = currentTab?.viewSettings.selectedElementId;
    return selectedElementId && currentTab?.elements[selectedElementId] ? currentTab.elements[selectedElementId] : null;
  });
  const canUndo = useSelector((state: RootState) => state.canvas.historyIndex > 0);
  const canRedo = useSelector((state: RootState) => state.canvas.historyIndex < state.canvas.history.length - 1);

  // Helper to check if an input field is focused
  const isInputFocused = useCallback(() => {
    const activeElement = document.activeElement;
    if (!activeElement) return false;
    
    const tagName = activeElement.tagName.toLowerCase();
    const isContentEditable = activeElement.hasAttribute('contenteditable');
    const isTextInput = ['input', 'textarea', 'select'].includes(tagName);
    
    return isTextInput || isContentEditable;
  }, []);

  // Helper to check modifier keys
  const checkModifiers = useCallback((event: KeyboardEvent, modifiers: KeyboardShortcut['modifiers']) => {
    const ctrlKey = isMac ? event.metaKey : event.ctrlKey;
    const metaKey = isMac ? event.metaKey : event.ctrlKey;
    
    // For shortcuts without modifiers, ensure no modifiers are pressed
    const hasAnyModifier = Object.keys(modifiers).length > 0;
    
    if (!hasAnyModifier) {
      // If no modifiers are specified, ensure none are pressed
      return !event.shiftKey && !event.altKey && !ctrlKey;
    }
    
    // For shortcuts with modifiers, check exact match
    return (
      (modifiers.ctrl === undefined ? !event.ctrlKey : modifiers.ctrl === event.ctrlKey) &&
      (modifiers.meta === undefined ? !event.metaKey : modifiers.meta === event.metaKey) &&
      (modifiers.shift === undefined ? !event.shiftKey : modifiers.shift === event.shiftKey) &&
      (modifiers.alt === undefined ? !event.altKey : modifiers.alt === event.altKey)
    );
  }, []);

  // Define all keyboard shortcuts
  const shortcuts: KeyboardShortcut[] = [
    // Tool shortcuts
    {
      key: 'v',
      modifiers: {},
      description: 'Select Tool',
      category: 'Tools',
      action: () => dispatch(setSelectedTool('select'))
    },
    {
      key: 'h',
      modifiers: {},
      description: 'Hand Tool',
      category: 'Tools',
      action: () => dispatch(setSelectedTool('hand'))
    },
    {
      key: 'r',
      modifiers: {},
      description: 'Rectangle Tool',
      category: 'Tools',
      action: () => dispatch(setSelectedTool('rectangle'))
    },
    {
      key: 't',
      modifiers: {},
      description: 'Text Tool',
      category: 'Tools',
      action: () => dispatch(setSelectedTool('text'))
    },
    {
      key: 'h',
      modifiers: { shift: true },
      description: 'Header Tool',
      category: 'Tools',
      action: () => dispatch(setSelectedTool('heading'))
    },
    {
      key: 'i',
      modifiers: {},
      description: 'Image Tool',
      category: 'Tools',
      action: () => dispatch(setSelectedTool('image'))
    },
    {
      key: 'b',
      modifiers: {},
      description: 'Button Tool',
      category: 'Tools',
      action: () => dispatch(setSelectedTool('button'))
    },

    // Edit shortcuts
    {
      key: 'z',
      modifiers: { [isMac ? 'meta' : 'ctrl']: true },
      description: 'Undo',
      category: 'Edit',
      action: () => canUndo && dispatch(undo())
    },
    {
      key: 'z',
      modifiers: { [isMac ? 'meta' : 'ctrl']: true, shift: true },
      description: 'Redo',
      category: 'Edit',
      action: () => canRedo && dispatch(redo())
    },
    {
      key: 'y',
      modifiers: { [isMac ? 'meta' : 'ctrl']: true },
      description: 'Redo',
      category: 'Edit',
      action: () => canRedo && dispatch(redo())
    },
    {
      key: 'd',
      modifiers: { [isMac ? 'meta' : 'ctrl']: true },
      description: 'Duplicate',
      category: 'Edit',
      action: () => {
        if (selectedElement && selectedElement.id !== 'root') {
          dispatch(duplicateElement(selectedElement.id));
        }
      }
    },
    {
      key: 'a',
      modifiers: { [isMac ? 'meta' : 'ctrl']: true },
      description: 'Select All',
      category: 'Edit',
      action: () => {
        // Select root to show all elements
        dispatch(selectElement('root'));
      }
    },

    // Delete shortcuts
    {
      key: 'Backspace',
      modifiers: {},
      description: 'Delete',
      category: 'Edit',
      action: () => {
        if (selectedElement && selectedElement.id !== 'root') {
          dispatch(deleteElement(selectedElement.id));
        }
      }
    },
    {
      key: 'Delete',
      modifiers: {},
      description: 'Delete',
      category: 'Edit',
      action: () => {
        if (selectedElement && selectedElement.id !== 'root') {
          dispatch(deleteElement(selectedElement.id));
        }
      }
    },

    // Group shortcuts
    {
      key: 'g',
      modifiers: { [isMac ? 'meta' : 'ctrl']: true },
      description: 'Group',
      category: 'Arrange',
      action: () => {
        // TODO: Implement grouping
        console.log('Group shortcut - to be implemented');
      }
    },
    {
      key: 'g',
      modifiers: { [isMac ? 'meta' : 'ctrl']: true, shift: true },
      description: 'Ungroup',
      category: 'Arrange',
      action: () => {
        // TODO: Implement ungrouping
        console.log('Ungroup shortcut - to be implemented');
      }
    },

    // Layer shortcuts - temporarily stubbed out
    {
      key: ']',
      modifiers: { shift: true },
      description: 'Bring to Front',
      category: 'Arrange',
      action: () => {
        console.log('Bring to front - to be implemented');
      }
    },
    {
      key: '[',
      modifiers: { shift: true },
      description: 'Send to Back',
      category: 'Arrange',
      action: () => {
        console.log('Send to back - to be implemented');
      }
    },
    {
      key: ']',
      modifiers: {},
      description: 'Bring Forward',
      category: 'Arrange',
      action: () => {
        console.log('Bring forward - to be implemented');
      }
    },
    {
      key: '[',
      modifiers: {},
      description: 'Send Backward',
      category: 'Arrange',
      action: () => {
        console.log('Send backward - to be implemented');
      }
    },

    // Nudge shortcuts
    {
      key: 'ArrowUp',
      modifiers: {},
      description: 'Nudge Up (1px)',
      category: 'Position',
      action: () => {
        if (selectedElement && selectedElement.id !== 'root' && selectedElement.x !== undefined && selectedElement.y !== undefined) {
          dispatch(moveElement({ 
            id: selectedElement.id, 
            x: selectedElement.x, 
            y: selectedElement.y - 1 
          }));
        }
      }
    },
    {
      key: 'ArrowDown',
      modifiers: {},
      description: 'Nudge Down (1px)',
      category: 'Position',
      action: () => {
        if (selectedElement && selectedElement.id !== 'root' && selectedElement.x !== undefined && selectedElement.y !== undefined) {
          dispatch(moveElement({ 
            id: selectedElement.id, 
            x: selectedElement.x, 
            y: selectedElement.y + 1 
          }));
        }
      }
    },
    {
      key: 'ArrowLeft',
      modifiers: {},
      description: 'Nudge Left (1px)',
      category: 'Position',
      action: () => {
        if (selectedElement && selectedElement.id !== 'root' && selectedElement.x !== undefined && selectedElement.y !== undefined) {
          dispatch(moveElement({ 
            id: selectedElement.id, 
            x: selectedElement.x - 1, 
            y: selectedElement.y 
          }));
        }
      }
    },
    {
      key: 'ArrowRight',
      modifiers: {},
      description: 'Nudge Right (1px)',
      category: 'Position',
      action: () => {
        if (selectedElement && selectedElement.id !== 'root' && selectedElement.x !== undefined && selectedElement.y !== undefined) {
          dispatch(moveElement({ 
            id: selectedElement.id, 
            x: selectedElement.x + 1, 
            y: selectedElement.y 
          }));
        }
      }
    },

    // Large nudge shortcuts
    {
      key: 'ArrowUp',
      modifiers: { shift: true },
      description: 'Nudge Up (10px)',
      category: 'Position',
      action: () => {
        if (selectedElement && selectedElement.id !== 'root' && selectedElement.x !== undefined && selectedElement.y !== undefined) {
          dispatch(moveElement({ 
            id: selectedElement.id, 
            x: selectedElement.x, 
            y: selectedElement.y - 10 
          }));
        }
      }
    },
    {
      key: 'ArrowDown',
      modifiers: { shift: true },
      description: 'Nudge Down (10px)',
      category: 'Position',
      action: () => {
        if (selectedElement && selectedElement.id !== 'root' && selectedElement.x !== undefined && selectedElement.y !== undefined) {
          dispatch(moveElement({ 
            id: selectedElement.id, 
            x: selectedElement.x, 
            y: selectedElement.y + 10 
          }));
        }
      }
    },
    {
      key: 'ArrowLeft',
      modifiers: { shift: true },
      description: 'Nudge Left (10px)',
      category: 'Position',
      action: () => {
        if (selectedElement && selectedElement.id !== 'root' && selectedElement.x !== undefined && selectedElement.y !== undefined) {
          dispatch(moveElement({ 
            id: selectedElement.id, 
            x: selectedElement.x - 10, 
            y: selectedElement.y 
          }));
        }
      }
    },
    {
      key: 'ArrowRight',
      modifiers: { shift: true },
      description: 'Nudge Right (10px)',
      category: 'Position',
      action: () => {
        if (selectedElement && selectedElement.id !== 'root' && selectedElement.x !== undefined && selectedElement.y !== undefined) {
          dispatch(moveElement({ 
            id: selectedElement.id, 
            x: selectedElement.x + 10, 
            y: selectedElement.y 
          }));
        }
      }
    },

    // Fine nudge shortcuts
    {
      key: 'ArrowUp',
      modifiers: { alt: true },
      description: 'Fine Nudge Up (0.1px)',
      category: 'Position',
      action: () => {
        if (selectedElement && selectedElement.id !== 'root' && selectedElement.x !== undefined && selectedElement.y !== undefined) {
          dispatch(moveElement({ 
            id: selectedElement.id, 
            x: selectedElement.x, 
            y: selectedElement.y - 0.1 
          }));
        }
      }
    },
    {
      key: 'ArrowDown',
      modifiers: { alt: true },
      description: 'Fine Nudge Down (0.1px)',
      category: 'Position',
      action: () => {
        if (selectedElement && selectedElement.id !== 'root' && selectedElement.x !== undefined && selectedElement.y !== undefined) {
          dispatch(moveElement({ 
            id: selectedElement.id, 
            x: selectedElement.x, 
            y: selectedElement.y + 0.1 
          }));
        }
      }
    },
    {
      key: 'ArrowLeft',
      modifiers: { alt: true },
      description: 'Fine Nudge Left (0.1px)',
      category: 'Position',
      action: () => {
        if (selectedElement && selectedElement.id !== 'root' && selectedElement.x !== undefined && selectedElement.y !== undefined) {
          dispatch(moveElement({ 
            id: selectedElement.id, 
            x: selectedElement.x - 0.1, 
            y: selectedElement.y 
          }));
        }
      }
    },
    {
      key: 'ArrowRight',
      modifiers: { alt: true },
      description: 'Fine Nudge Right (0.1px)',
      category: 'Position',
      action: () => {
        if (selectedElement && selectedElement.id !== 'root' && selectedElement.x !== undefined && selectedElement.y !== undefined) {
          dispatch(moveElement({ 
            id: selectedElement.id, 
            x: selectedElement.x + 0.1, 
            y: selectedElement.y 
          }));
        }
      }
    },

    // Zoom shortcuts
    {
      key: '=',
      modifiers: { [isMac ? 'meta' : 'ctrl']: true },
      description: 'Zoom In',
      category: 'View',
      action: () => {
        const newZoom = Math.min(zoomLevel * 1.2, 5);
        dispatch(setZoomLevel(newZoom));
      }
    },
    {
      key: '-',
      modifiers: { [isMac ? 'meta' : 'ctrl']: true },
      description: 'Zoom Out',
      category: 'View',
      action: () => {
        const newZoom = Math.max(zoomLevel / 1.2, 0.1);
        dispatch(setZoomLevel(newZoom));
      }
    },
    {
      key: '0',
      modifiers: { [isMac ? 'meta' : 'ctrl']: true },
      description: 'Zoom to 100%',
      category: 'View',
      action: () => {
        dispatch(setZoomLevel(1));
      }
    },

    // Help shortcut
    {
      key: '?',
      modifiers: {},
      description: 'Show Keyboard Shortcuts',
      category: 'Help',
      action: () => {
        onShowCheatsheet?.();
      }
    }
  ];

  // Handle keydown events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Skip if input is focused
    if (isInputFocused()) {
      return;
    }

    // Find matching shortcuts, prioritizing those with more specific modifiers
    const matchingShortcuts = shortcuts.filter(shortcut => {
      return shortcut.key.toLowerCase() === event.key.toLowerCase() && 
             checkModifiers(event, shortcut.modifiers);
    });

    // Sort by specificity (more modifiers = higher priority)
    const sortedShortcuts = matchingShortcuts.sort((a, b) => {
      const aModifierCount = Object.keys(a.modifiers).length;
      const bModifierCount = Object.keys(b.modifiers).length;
      return bModifierCount - aModifierCount; // More modifiers first
    });

    const matchingShortcut = sortedShortcuts[0];

    if (matchingShortcut) {
      event.preventDefault();
      event.stopPropagation();
      matchingShortcut.action();
    }
  }, [shortcuts, isInputFocused, checkModifiers]);

  // Set up event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    shortcuts,
    isMac
  };
};