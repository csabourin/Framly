import { store as reduxStore } from '../store';
import {
  pushHistoryEntry,
  amendCurrentEntry,
  undo,
  redo,
  setUndoingFlag,
  setRedoingFlag,
  // aliased: the class below also has a clearHistory method
  clearHistory as clearHistoryAction,
  loadHistoryFromStorage,
} from '../store/historySlice';
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
    } finally {
      // Always seed a baseline, even if IndexedDB was unavailable - without one
      // the first action of a session cannot be undone.
      this.ensureBaseline();
    }
  }

  /**
   * Make sure the state currently on screen is the head of the history stack.
   *
   * Entries are snapshots taken *after* each action, so undoing to entry n-1
   * restores the state before action n. That only works if a snapshot of the
   * starting state exists: without it the first action of a session has nothing
   * to go back to, and `currentIndex > 0` keeps undo disabled forever.
   */
  private ensureBaseline(): void {
    const state = reduxStore.getState();
    const entries = state.history.entries;
    const currentDoc = this.documentSignature(state.canvas.project);
    const headDoc = entries.length
      ? this.documentSignature(entries[entries.length - 1].canvasState?.project)
      : null;

    // A restored session whose head already matches the screen needs no baseline.
    if (headDoc !== null && headDoc === currentDoc) return;

    reduxStore.dispatch(pushHistoryEntry({
      action: 'history/baseline',
      description: 'Initial state',
      canvasState: state.canvas,
      classState: (state as any).classes || {},
    }));
  }

  /**
   * The part of a project that undo actually restores: the element trees.
   *
   * Deliberately excludes the project id, `updatedAt` stamps, and view state
   * such as the current selection - reloading rewrites all of those, and
   * comparing whole projects would see a difference every time and seed a
   * duplicate baseline, leaving an undo step that changes nothing on screen.
   */
  private documentSignature(project: any): string {
    if (!project?.tabs) return '';

    const tabIds: string[] = project.tabOrder?.length
      ? project.tabOrder
      : Object.keys(project.tabs);

    return JSON.stringify(tabIds.map((tabId) => {
      const tab = project.tabs[tabId];
      return tab ? { id: tabId, name: tab.name, elements: tab.elements } : null;
    }));
  }

  /**
   * Start a fresh stack from whatever is now on screen.
   *
   * Called when a whole project is loaded - restored from storage or imported.
   * The existing entries describe a different document, and undoing into them
   * would replace the loaded project with unrelated state.
   */
  resetBaseline(): void {
    reduxStore.dispatch(clearHistoryAction());
    this.ensureBaseline();
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
      reduxStore.dispatch(loadHistoryFromStorage(entries));
      
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


    // Save to IndexedDB (debounced)
    this.debouncedSave();
  }

  /**
   * Fold the current state into the entry at the head, rather than adding a
   * new one. Used when a debounced change belongs to the gesture that the
   * head entry already represents.
   */
  amendCurrentAction(): void {
    const state = reduxStore.getState();

    if (state.history.isUndoing || state.history.isRedoing) {
      return;
    }

    reduxStore.dispatch(amendCurrentEntry({
      canvasState: state.canvas,
      classState: (state as any).classes || {},
    }));

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
    reduxStore.dispatch(clearHistoryAction());
    
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