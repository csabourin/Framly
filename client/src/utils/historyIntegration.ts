import { store } from '../store';
import { historyManager } from './historyManager';

// Debouncing state for grouping rapid changes
let debounceTimeout: NodeJS.Timeout | null = null;
let pendingAction: { type: string; description: string } | null = null;
let isMiddlewareActive = false;

// When we last recorded an entry outright, used to tell whether a debounced
// change is a consequence of that action rather than a new one.
let lastImmediateRecordAt = 0;

// How long after an immediate action a debounced change still counts as part of
// it. Comfortably covers the 800ms debounce below, while staying short enough
// that a separate deliberate edit lands on its own entry.
const COALESCE_WINDOW_MS = 2000;

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
  
  // Loading a whole project (restored from storage, or imported) replaces the
  // document. Any existing entries belong to a different one, so undoing into
  // them would discard what was just loaded. Restores during undo/redo are
  // already excluded by the isUndoing/isRedoing check above.
  if (action.type === 'canvas/loadProject') {
    historyManager.resetBaseline();
    return;
  }

  // Define actions that should be recorded in history
  const immediateActions: Record<string, string> = {
    'canvas/addElement': 'Add element',
    'canvas/applyStarterTemplate': 'Apply template',
    'canvas/deleteElement': 'Delete element',
    'canvas/moveElement': 'Move element',
    'canvas/duplicateElement': 'Duplicate element',
    // Structural changes that were previously left out of history entirely
    'canvas/reorderElement': 'Reorder element',
    'canvas/pasteElement': 'Paste element',
    'canvas/cutElement': 'Cut element',
    'canvas/groupElements': 'Group elements',
    'canvas/ungroupElements': 'Ungroup elements',
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
    lastImmediateRecordAt = Date.now();
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
        // A debounced change landing right after an immediate one is a
        // consequence of it, not a separate edit: drawing a shape dispatches
        // addElement and then resizes the root container to fit. Folding it
        // into the entry the immediate action created avoids an undo step that
        // looks like it does nothing. Note the follow-up often targets a
        // different element (the root), so this cannot key off element id.
        const isConsequenceOfLastAction =
          Date.now() - lastImmediateRecordAt < COALESCE_WINDOW_MS;

        if (isConsequenceOfLastAction) {
          historyManager.amendCurrentAction();
        } else {
          historyManager.recordAction(pendingAction.type, pendingAction.description);
        }
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