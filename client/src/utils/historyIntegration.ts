import { Middleware, AnyAction } from '@reduxjs/toolkit';
import { historyManager } from './historyManager';

/**
 * Redux middleware to automatically record history for specific actions
 */
export const historyMiddleware: Middleware = (store) => (next) => (action: AnyAction) => {
  // Get state before action
  const stateBefore = store.getState();
  
  // Execute the action
  const result = next(action);
  
  // Get state after action
  const stateAfter = store.getState();
  
  // Define actions that should be recorded in history
  const historyActions: Record<string, string> = {
    'canvas/addElement': 'Add element',
    'canvas/deleteElement': 'Delete element',
    'canvas/moveElement': 'Move element',
    'canvas/updateElement': 'Update element',
    'canvas/updateElementStyles': 'Update element styles',
    'canvas/resizeElement': 'Resize element',
    'canvas/updateElementText': 'Update text',
    'canvas/updateElementSrc': 'Update image source',
    'canvas/duplicateElement': 'Duplicate element',
    'canvas/addCSSClass': 'Add CSS class',
    'canvas/removeCSSClass': 'Remove CSS class',
    'canvas/switchBreakpoint': 'Switch breakpoint',
    'classes/createCustomClass': 'Create custom class',
    'classes/updateCustomClass': 'Update custom class',
    'classes/batchUpdateCustomClass': 'Update class properties',
    'classes/deleteCustomClass': 'Delete custom class',
    'classes/renameCustomClass': 'Rename custom class',
  };
  
  // Record history if this action should be tracked
  if (historyActions[action.type]) {
    // Add specific details based on action
    let description = historyActions[action.type];
    
    if (action.type === 'canvas/addElement' && action.payload?.element?.type) {
      description = `Add ${action.payload.element.type}`;
    } else if (action.type === 'canvas/updateElementText' && action.payload?.text) {
      const text = String(action.payload.text);
      description = `Update text: "${text.substring(0, 20)}${text.length > 20 ? '...' : ''}"`;
    } else if (action.type === 'classes/updateCustomClass' && action.payload?.className) {
      description = `Update class: ${action.payload.className}`;
    }
    
    // Record the action in history
    historyManager.recordAction(action.type, description);
  }
  
  return result;
};

/**
 * Manually record a history entry with custom description
 */
export const recordHistoryEntry = (actionType: string, description: string) => {
  historyManager.recordAction(actionType, description);
};