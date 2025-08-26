import { store as reduxStore } from '../store';
import { pushHistoryEntry, undo, redo, setUndoingFlag, setRedoingFlag } from '../store/historySlice';
import { loadProject } from '../store/canvasSlice';
import { loadCustomClassesFromStorage } from '../store/classSlice';

/**
 * History Manager - Handles undo/redo operations and IndexedDB persistence
 */
export class HistoryManager {
  private dbName = 'DesignToolHistory';
  private dbVersion = 1;
  private storeName = 'historyEntries';
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    try {
      this.db = await this.openDB();
      await this.loadHistoryFromStorage();
    } catch (error) {
      // Failed to initialize history manager
    }
  }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async saveHistoryToStorage(): Promise<void> {
    if (!this.db) return;

    try {
      const state = reduxStore.getState();
      const historyEntries = state.history.entries;

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);

      // Clear existing entries
      await new Promise<void>((resolve, reject) => {
        const clearRequest = objectStore.clear();
        clearRequest.onsuccess = () => resolve();
        clearRequest.onerror = () => reject(clearRequest.error);
      });

      // Add current entries
      for (const entry of historyEntries) {
        await new Promise<void>((resolve, reject) => {
          const addRequest = objectStore.add(entry);
          addRequest.onsuccess = () => resolve();
          addRequest.onerror = () => reject(addRequest.error);
        });
      }

    } catch (error) {
      // Failed to save history to IndexedDB
    }
  }

  async loadHistoryFromStorage(): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);
      const index = objectStore.index('timestamp');

      const entries = await new Promise<any[]>((resolve, reject) => {
        const request = index.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      // Sort by timestamp to ensure correct order
      entries.sort((a, b) => a.timestamp - b.timestamp);

      // Load into Redux store
      reduxStore.dispatch({ type: 'history/loadHistoryFromStorage', payload: entries });
      
    } catch (error) {
      // Failed to load history from IndexedDB
    }
  }

  /**
   * Record a new action in history
   */
  recordAction(action: string, description: string): void {
    const state = reduxStore.getState();
    
    // Skip if we're currently undoing/redoing
    if (state.history.isUndoing || state.history.isRedoing) {
      return;
    }

    const canvasState = state.canvas;
    const classState = (state as any).classes || {};

    reduxStore.dispatch(pushHistoryEntry({
      action,
      description,
      canvasState,
      classState,
    }));

    // console.log(`History recorded: ${description}`);

    // Save to IndexedDB (debounced)
    this.debouncedSave();
  }

  /**
   * Perform undo operation
   */
  async performUndo(): Promise<boolean> {
    const state = reduxStore.getState();
    
    if (state.history.currentIndex <= 0) {
      return false;
    }

    try {
      // Set undoing flag
      reduxStore.dispatch(setUndoingFlag(true));
      
      // Move to previous state
      reduxStore.dispatch(undo());
      
      // Get the previous state
      const newState = reduxStore.getState();
      const targetEntry = newState.history.entries[newState.history.currentIndex];
      
      if (targetEntry) {
        // Restore canvas state
        reduxStore.dispatch(loadProject(targetEntry.canvasState.project));
        
        // Restore class state
        reduxStore.dispatch(loadCustomClassesFromStorage(targetEntry.classState.customClasses || {}));
      }
      
      return true;
    } catch (error) {
      return false;
    } finally {
      // Clear undoing flag
      setTimeout(() => {
        reduxStore.dispatch(setUndoingFlag(false));
      }, 100);
    }
  }

  /**
   * Perform redo operation
   */
  async performRedo(): Promise<boolean> {
    const state = reduxStore.getState();
    
    if (state.history.currentIndex >= state.history.entries.length - 1) {
      return false;
    }

    try {
      // Set redoing flag
      reduxStore.dispatch(setRedoingFlag(true));
      
      // Move to next state
      reduxStore.dispatch(redo());
      
      // Get the next state
      const newState = reduxStore.getState();
      const targetEntry = newState.history.entries[newState.history.currentIndex];
      
      if (targetEntry) {
        // Restore canvas state
        reduxStore.dispatch(loadProject(targetEntry.canvasState.project));
        
        // Restore class state
        reduxStore.dispatch(loadCustomClassesFromStorage(targetEntry.classState.customClasses || {}));
      }
      
      return true;
    } catch (error) {
      return false;
    } finally {
      // Clear redoing flag
      setTimeout(() => {
        reduxStore.dispatch(setRedoingFlag(false));
      }, 100);
    }
  }

  /**
   * Clear all history
   */
  async clearHistory(): Promise<void> {
    reduxStore.dispatch({ type: 'history/clearHistory' });
    
    if (this.db) {
      try {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const objectStore = transaction.objectStore(this.storeName);
        await new Promise<void>((resolve, reject) => {
          const request = objectStore.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      } catch (error) {
        // Failed to clear history from IndexedDB
      }
    }
  }

  // Debounced save to avoid excessive IndexedDB writes
  private saveTimeout: NodeJS.Timeout | null = null;
  private debouncedSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    this.saveTimeout = setTimeout(() => {
      this.saveHistoryToStorage();
    }, 3000); // Save 3 seconds after last action to reduce IndexedDB writes
  }
}

// Global instance
export const historyManager = new HistoryManager();