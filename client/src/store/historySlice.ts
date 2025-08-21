import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from './index';

export interface HistoryEntry {
  id: string;
  timestamp: number;
  action: string;
  description: string;
  canvasState: any; // Full canvas state snapshot
  classState: any; // Custom classes state snapshot
}

interface HistoryState {
  entries: HistoryEntry[];
  currentIndex: number;
  maxEntries: number;
  isUndoing: boolean;
  isRedoing: boolean;
}

const initialState: HistoryState = {
  entries: [],
  currentIndex: -1,
  maxEntries: 50, // Keep last 50 actions
  isUndoing: false,
  isRedoing: false,
};

const historySlice = createSlice({
  name: 'history',
  initialState,
  reducers: {
    pushHistoryEntry: (state, action: PayloadAction<{
      action: string;
      description: string;
      canvasState: any;
      classState: any;
    }>) => {
      // Don't record history during undo/redo operations
      if (state.isUndoing || state.isRedoing) {
        return;
      }

      const { action: actionType, description, canvasState, classState } = action.payload;
      
      const newEntry: HistoryEntry = {
        id: `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        action: actionType,
        description,
        canvasState: JSON.parse(JSON.stringify(canvasState)), // Deep clone
        classState: JSON.parse(JSON.stringify(classState)), // Deep clone
      };

      // Remove any entries after current index (when undoing then making new changes)
      if (state.currentIndex < state.entries.length - 1) {
        state.entries = state.entries.slice(0, state.currentIndex + 1);
      }

      // Add new entry
      state.entries.push(newEntry);
      state.currentIndex = state.entries.length - 1;

      // Limit history size
      if (state.entries.length > state.maxEntries) {
        const removeCount = state.entries.length - state.maxEntries;
        state.entries = state.entries.slice(removeCount);
        state.currentIndex = state.entries.length - 1;
      }
    },

    undo: (state) => {
      if (state.currentIndex > 0) {
        state.currentIndex--;
        state.isUndoing = true;
      }
    },

    redo: (state) => {
      if (state.currentIndex < state.entries.length - 1) {
        state.currentIndex++;
        state.isRedoing = true;
      }
    },

    setUndoingFlag: (state, action: PayloadAction<boolean>) => {
      state.isUndoing = action.payload;
    },

    setRedoingFlag: (state, action: PayloadAction<boolean>) => {
      state.isRedoing = action.payload;
    },

    clearHistory: (state) => {
      state.entries = [];
      state.currentIndex = -1;
      state.isUndoing = false;
      state.isRedoing = false;
    },

    loadHistoryFromStorage: (state, action: PayloadAction<HistoryEntry[]>) => {
      state.entries = action.payload;
      state.currentIndex = state.entries.length - 1;
    },

    setMaxEntries: (state, action: PayloadAction<number>) => {
      state.maxEntries = action.payload;
      
      // Trim existing entries if needed
      if (state.entries.length > state.maxEntries) {
        const removeCount = state.entries.length - state.maxEntries;
        state.entries = state.entries.slice(removeCount);
        state.currentIndex = Math.min(state.currentIndex, state.entries.length - 1);
      }
    },
  },
});

export const {
  pushHistoryEntry,
  undo,
  redo,
  setUndoingFlag,
  setRedoingFlag,
  clearHistory,
  loadHistoryFromStorage,
  setMaxEntries,
} = historySlice.actions;

// Selectors
export const selectCanUndo = (state: RootState) => 
  state.history.currentIndex > 0;

export const selectCanRedo = (state: RootState) => 
  state.history.currentIndex < state.history.entries.length - 1;

export const selectCurrentHistoryEntry = (state: RootState) => 
  state.history.entries[state.history.currentIndex] || null;

export const selectHistoryStats = (state: RootState) => ({
  totalEntries: state.history.entries.length,
  currentIndex: state.history.currentIndex,
  canUndo: selectCanUndo(state),
  canRedo: selectCanRedo(state),
});

export default historySlice.reducer;