import { store } from '../store';
import { historyManager } from './historyManager';

// Debouncing state for grouping rapid changes
let debounceTimeout: NodeJS.Timeout | null = null;
let pendingAction: { type: string; description: string } | null = null;
let isMiddlewareActive = false;

/**
 * Add history middleware to an existing store (avoids circular dependencies)
 */
export const addHistoryMiddleware = () => {
  if (isMiddlewareActive) return;
  
  isMiddlewareActive = true;
  
  // Override the store's dispatch to add our history tracking
  const originalDispatch = store.dispatch;
  
  store.dispatch = (action: any) => {
    // Get state before action
    const stateBefore = store.getState();
    
    // Execute the action
    const result = originalDispatch(action);
    
    // Get state after action
    const stateAfter = store.getState();
    
    // Track history for this action
    trackHistoryForAction(action);
    
    return result;
  };
};

/**
 * Track history for specific actions with debouncing
 */
const trackHistoryForAction = (action: any) => {
  // Skip tracking if we're undoing/redoing
  const state = store.getState();
  if (state.history?.isUndoing || state.history?.isRedoing) {
    return;
  }
  
  // Define actions that should be recorded in history
  const immediateActions: Record<string, string> = {
    'canvas/addElement': 'Add element',
    'canvas/deleteElement': 'Delete element',
    'canvas/moveElement': 'Move element',
    'canvas/duplicateElement': 'Duplicate element',
    'canvas/addCSSClass': 'Add CSS class',
    'canvas/removeCSSClass': 'Remove CSS class',
    'canvas/switchBreakpoint': 'Switch breakpoint',
    'classes/createCustomClass': 'Create custom class',
    'classes/deleteCustomClass': 'Delete custom class',
    'classes/renameCustomClass': 'Rename custom class',
  };

  // Actions that should be debounced (property changes, styling, etc.)
  const debouncedActions: Record<string, string> = {
    'canvas/updateElement': 'Update element',
    'canvas/updateElementStyles': 'Update element styles',
    'canvas/resizeElement': 'Resize element',
    'canvas/updateElementText': 'Update text',
    'canvas/updateElementSrc': 'Update image source',
    'classes/updateCustomClass': 'Update custom class',
    'classes/batchUpdateCustomClass': 'Update class properties',
  };
  
  // Handle immediate actions (no debouncing)
  if (immediateActions[action.type]) {
    let description = immediateActions[action.type];
    
    if (action.type === 'canvas/addElement' && action.payload?.element?.type) {
      description = `Add ${action.payload.element.type}`;
    }
    
    // Clear any pending debounced action and record immediately
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
      debounceTimeout = null;
      pendingAction = null;
    }
    
    historyManager.recordAction(action.type, description);
  }
  
  // Handle debounced actions (property changes)
  else if (debouncedActions[action.type]) {
    let description = debouncedActions[action.type];
    
    if (action.type === 'canvas/updateElementText' && action.payload?.text) {
      const text = String(action.payload.text);
      description = `Update text: "${text.substring(0, 20)}${text.length > 20 ? '...' : ''}"`;
    } else if (action.type === 'classes/updateCustomClass' && action.payload?.className) {
      description = `Update class: ${action.payload.className}`;
    } else if (action.type === 'classes/batchUpdateCustomClass') {
      description = 'Update properties';
    }
    
    // Store the action to be recorded after debounce
    pendingAction = { type: action.type, description };
    
    // Clear existing timeout and start a new one
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }
    
    debounceTimeout = setTimeout(() => {
      if (pendingAction) {
        historyManager.recordAction(pendingAction.type, pendingAction.description);
        pendingAction = null;
      }
      debounceTimeout = null;
    }, 800); // 800ms debounce - user has stopped making changes
  }
};

/**
 * Manually record a history entry with custom description
 */
export const recordHistoryEntry = (actionType: string, description: string) => {
  historyManager.recordAction(actionType, description);
};

/**
 * Force record any pending debounced action (useful for manual triggers)
 */
export const flushPendingHistory = () => {
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
    debounceTimeout = null;
  }
  
  if (pendingAction) {
    historyManager.recordAction(pendingAction.type, pendingAction.description);
    pendingAction = null;
  }
};