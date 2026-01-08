import { store } from '../store';
import { loadProject } from '../store/canvasSlice';
import { loadComponents } from '../store/componentSlice';
import { loadComponentDefinitions } from '../store/componentDefinitionsSlice';
import { loadCustomClassesFromStorage, loadCategoriesFromStorage } from '../store/classSlice';
import { loadUISettings } from '../store/uiSlice';
import {
  initializeDB,
  saveProjectToIndexedDB,
  loadProjectFromIndexedDB,
  saveComponentToIndexedDB,
  loadComponentsFromIndexedDB,
  saveCategoryToIndexedDB,
  loadCategoriesFromIndexedDB,
  loadCustomClassesFromIndexedDB,
  loadClassCategoriesFromIndexedDB,
  indexedDBManager
} from './indexedDB';
import {
  initializeComponentDefinitionsDB,
  loadComponentDefinitions as loadComponentDefsFromDB,
  loadComponentCategories
} from './componentPersistence';
import {
  exportUnitPreferences,
  loadUnitPreferences
} from './unitPersistence';
import { Project, CustomComponent, ComponentCategory } from '../types/canvas';

// Constants
const CURRENT_PROJECT_KEY = 'currentProject';
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds - drastically reduced to prevent browser crashes
const PROJECT_ID = 'default-project'; // For now, we'll use a single project

export class PersistenceManager {
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private lastSavedState: string = '';
  private componentDb: IDBDatabase | null = null;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize IndexedDB for main data
      await initializeDB();

      // Initialize IndexedDB for component definitions
      await initializeComponentDefinitionsDB();

      // Load persisted data
      await this.loadPersistedData();

      // Start auto-save
      this.startAutoSave();

      this.isInitialized = true;
    } catch (error) {
      // Continue without persistence if IndexedDB fails
    }
  }

  private async loadPersistedData(): Promise<void> {
    try {
      // Load current project
      await this.loadCurrentProject();

      // Load new component definitions and categories (ONLY)
      await this.loadComponentDefinitions();

      // Clean up orphaned component instances after loading
      await this.cleanupOrphanedInstances();

      // Load custom classes and categories
      await this.loadCustomClasses();

      // Load UI settings
      await this.loadUISettings();

      // Load unit preferences
      await this.loadUnitPreferences();
    } catch (error) {
      // Failed to load persisted data
    }
  }

  private async loadCurrentProject(): Promise<void> {
    try {
      const project = await loadProjectFromIndexedDB(PROJECT_ID);
      if (project) {
        // Check if project needs migration from old structure to new tab structure
        const migratedProject = this.migrateProjectToTabStructure(project);
        store.dispatch(loadProject(migratedProject));
      }
    } catch (error) {
      // Failed to load current project
    }
  }

  private migrateProjectToTabStructure(project: any): Project {
    // Check if project already has the new tab structure
    if (project.tabs && project.activeTabId && project.tabOrder) {
      return project as Project;
    }

    // Migrate old structure to new tab structure
    const tabId = 'main-tab';

    const migratedProject: Project = {
      id: project.id || 'default',
      name: project.name || 'Untitled Project',
      tabs: {
        [tabId]: {
          id: tabId,
          name: 'Main',
          elements: project.elements || { root: this.createDefaultRootElement() },
          viewSettings: {
            zoom: 1,
            panX: 0,
            panY: 0,
            selectedElementId: project.selectedElementId || 'root',
            isTextEditing: false
          },
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      },
      activeTabId: tabId,
      tabOrder: [tabId],
      breakpoints: project.breakpoints || {
        mobile: { name: 'Mobile', width: 375, isDefault: true },
        tablet: { name: 'Tablet', width: 768, isDefault: false },
        desktop: { name: 'Desktop', width: 1024, isDefault: false }
      },
      currentBreakpoint: project.currentBreakpoint || 'mobile'
    };

    return migratedProject;
  }

  private createDefaultRootElement() {
    return {
      id: 'root',
      type: 'container' as const,
      x: 0,
      y: 0,
      width: 375,
      height: 600,
      styles: {
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#ffffff',
        minHeight: '600px',
        padding: '20px',
        gap: '16px'
      },
      isContainer: true,
      flexDirection: 'column' as const,
      justifyContent: 'flex-start' as const,
      alignItems: 'stretch' as const,
      children: [],
      classes: []
    };
  }

  private async loadComponents(): Promise<void> {
    try {
      const [components, categories] = await Promise.all([
        loadComponentsFromIndexedDB(),
        loadCategoriesFromIndexedDB()
      ]);

      // Group components by category
      const categoriesWithComponents: ComponentCategory[] = categories.map(category => ({
        ...category,
        components: components.filter(comp => comp.category === category.id)
      }));

      // Add components that don't have categories to a default category
      const uncategorizedComponents = components.filter(comp =>
        !categories.some(cat => cat.id === comp.category)
      );

      if (uncategorizedComponents.length > 0) {
        categoriesWithComponents.push({
          id: 'uncategorized',
          name: 'Uncategorized',
          sortIndex: 999,
          createdAt: Date.now(),
          components: uncategorizedComponents
        });
      }

      // Load into Redux store
      store.dispatch(loadComponents(categoriesWithComponents));

    } catch (error) {
      // Failed to load components
    }
  }

  private async loadComponentDefinitions(): Promise<void> {
    try {
      const [componentDefs, categories] = await Promise.all([
        loadComponentDefsFromDB(),
        loadComponentCategories()
      ]);

      // Transform to the expected structure for the Redux store
      const definitionsRecord: Record<string, any> = {};
      componentDefs.forEach(def => {
        definitionsRecord[def.id] = def;
      });

      const categoriesRecord: Record<string, any> = {};
      categories.forEach(cat => {
        categoriesRecord[cat.id] = cat;
      });

      // Only load categories if we actually have them, otherwise keep initial state defaults
      if (categories.length > 0) {
        store.dispatch(loadComponentDefinitions({
          definitions: definitionsRecord,
          categories: categoriesRecord
        }));
      } else {
        // Just load definitions, keep default categories from initial state
        store.dispatch(loadComponentDefinitions({
          definitions: definitionsRecord,
          categories: store.getState().componentDefinitions.categories
        }));
      }

    } catch (error) {
      // Failed to load component definitions
    }
  }

  private async loadCustomClasses(): Promise<void> {
    try {
      const [customClasses, classCategories] = await Promise.all([
        loadCustomClassesFromIndexedDB(),
        loadClassCategoriesFromIndexedDB()
      ]);

      // Convert array to object for Redux store
      const customClassesObject = customClasses.reduce((acc, cls) => {
        acc[cls.name] = cls;
        return acc;
      }, {} as Record<string, any>);

      // Load into Redux store
      store.dispatch(loadCustomClassesFromStorage(customClassesObject));
      store.dispatch(loadCategoriesFromStorage(classCategories));

    } catch (error) {
      // Failed to load custom classes
    }
  }

  private async loadUISettings(): Promise<void> {
    try {
      const uiSettings = await indexedDBManager.loadSetting('uiSettings');
      if (uiSettings) {
        store.dispatch(loadUISettings(uiSettings));
      }

      // Also load theme setting and apply it
      const theme = await indexedDBManager.loadSetting('theme');
      if (theme) {
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(theme);
      }
    } catch (error) {
      // Failed to load UI settings
    }
  }

  private async loadUnitPreferences(): Promise<void> {
    try {
      const unitPrefs = await indexedDBManager.loadSetting('unitPreferences');
      if (unitPrefs) {
        loadUnitPreferences(unitPrefs);
      }
    } catch (error) {
      // Failed to load unit preferences
    }
  }

  private async saveUnitPreferences(): Promise<void> {
    try {
      const unitPrefs = exportUnitPreferences();
      await indexedDBManager.saveSetting('unitPreferences', unitPrefs);
    } catch (error) {
      // Failed to save unit preferences
    }
  }

  async saveCurrentProject(): Promise<void> {
    try {
      const state = store.getState();
      const project = state.canvas.project;

      // Don't save if project hasn't changed
      const currentStateString = JSON.stringify(project);
      if (currentStateString === this.lastSavedState) {
        return;
      }

      await saveProjectToIndexedDB({
        ...project,
        id: PROJECT_ID
      });

      // Also save custom classes when project is saved
      await this.saveCustomClasses();

      // Also save UI settings when project is saved
      await this.saveUISettings();

      // Also save unit preferences when project is saved
      await this.saveUnitPreferences();

      this.lastSavedState = currentStateString;
    } catch (error) {
      // Failed to save current project
    }
  }

  async saveComponent(component: CustomComponent): Promise<void> {
    try {
      await saveComponentToIndexedDB(component);
    } catch (error) {
      throw error;
    }
  }

  async saveCategory(category: ComponentCategory): Promise<void> {
    try {
      await saveCategoryToIndexedDB(category);
    } catch (error) {
      throw error;
    }
  }

  async deleteComponent(componentId: string): Promise<void> {
    try {
      await indexedDBManager.deleteComponent(componentId);
    } catch (error) {
      throw error;
    }
  }

  private startAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    // Auto-save re-enabled after fixing memory leak issues with memoized selectors
    this.autoSaveTimer = setInterval(() => {
      this.saveCurrentProject();
    }, AUTO_SAVE_INTERVAL);

    // Auto-save enabled
  }

  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  async exportData(): Promise<string> {
    try {
      const [project, components, categories] = await Promise.all([
        loadProjectFromIndexedDB(PROJECT_ID),
        loadComponentsFromIndexedDB(),
        loadCategoriesFromIndexedDB()
      ]);

      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        project,
        components,
        categories
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      throw error;
    }
  }

  async saveCustomClasses(): Promise<void> {
    try {
      const state = store.getState();
      const classState = (state as any).classes;

      if (classState) {
        const { customClasses, categories } = classState;

        // Save custom classes
        await Promise.all(
          Object.values(customClasses).map((cls: any) =>
            indexedDBManager.saveCustomClass(cls)
          )
        );

        // Save class categories
        await Promise.all(
          categories.map((category: any) =>
            indexedDBManager.saveClassCategory(category)
          )
        );
      }
    } catch (error) {
      // Failed to save custom classes
    }
  }

  private async saveUISettings(): Promise<void> {
    try {
      const state = store.getState();
      const uiState = state.ui;

      // Extract only the persistent UI settings
      const persistentUISettings = {
        isComponentPanelVisible: uiState.isComponentPanelVisible,
        isDOMTreePanelVisible: uiState.isDOMTreePanelVisible,
        zoomLevel: uiState.zoomLevel,
        isGridVisible: uiState.isGridVisible,
        canvasOffset: uiState.canvasOffset
      };

      await indexedDBManager.saveSetting('uiSettings', persistentUISettings);
    } catch (error) {
      // Failed to save UI settings
    }
  }

  async importData(dataString: string): Promise<void> {
    try {
      const data = JSON.parse(dataString);

      if (data.version !== '1.0') {
        throw new Error('Unsupported export version');
      }

      // Clear existing data
      await indexedDBManager.clearAll();

      // Import project
      if (data.project) {
        await saveProjectToIndexedDB({
          ...data.project,
          id: PROJECT_ID
        });
      }

      // Import components
      if (data.components) {
        for (const component of data.components) {
          await saveComponentToIndexedDB(component);
        }
      }

      // Import categories
      if (data.categories) {
        for (const category of data.categories) {
          await saveCategoryToIndexedDB(category);
        }
      }

      // Reload data
      await this.loadPersistedData();

    } catch (error) {
      throw error;
    }
  }

  async clearAllData(): Promise<void> {
    try {

      // Clear main IndexedDB
      await indexedDBManager.clearAll();

      // Clear component definitions database completely
      if (this.componentDb) {
        this.componentDb.close();
        this.componentDb = null;
      }

      // Clear component definitions IndexedDB
      try {
        const deleteRequest = indexedDB.deleteDatabase('ComponentDefinitions');
        await new Promise((resolve, reject) => {
          deleteRequest.onsuccess = () => resolve(true);
          deleteRequest.onerror = () => reject(deleteRequest.error);
        });
      } catch (error) {
        // Error deleting component definitions database
      }

      // Clear local storage
      try {
        localStorage.clear();
      } catch (error) {
        // Error clearing local storage
      }

      // Clear session storage
      try {
        sessionStorage.clear();
      } catch (error) {
        // Error clearing session storage
      }

      // Force complete page reload to reset all state
      setTimeout(() => {
        window.location.href = window.location.href;
      }, 100);

    } catch (error) {
      // Force reload even if clearing failed
      window.location.reload();
    }
  }

  // CRITICAL: Clean up orphaned component instances to prevent crashes
  private async cleanupOrphanedInstances(): Promise<void> {
    try {
      const state = store.getState();
      const currentProject = state.canvas.project;
      const componentDefinitions = state.componentDefinitions.definitions;

      let hasOrphans = false;
      const cleanedTabs: Record<string, any> = {};

      // Check each tab for orphaned instances
      Object.entries(currentProject.tabs).forEach(([tabId, tab]) => {
        const cleanedElements: Record<string, any> = {};
        let tabHasOrphans = false;

        Object.entries(tab.elements).forEach(([elementId, element]: [string, any]) => {
          if (element.componentRef?.componentId && !componentDefinitions[element.componentRef.componentId]) {
            // Convert orphaned instance back to regular element
            const cleanElement = { ...element };
            delete cleanElement.componentRef;
            cleanedElements[elementId] = cleanElement;
            tabHasOrphans = true;
            hasOrphans = true;
          } else {
            cleanedElements[elementId] = element;
          }
        });

        if (tabHasOrphans) {
          cleanedTabs[tabId] = { ...tab, elements: cleanedElements };
        } else {
          cleanedTabs[tabId] = tab;
        }
      });

      if (hasOrphans) {
        // Update Redux with cleaned elements
        const cleanedProject = { ...currentProject, tabs: cleanedTabs };
        store.dispatch({ type: 'canvas/setProject', payload: cleanedProject });

        // Save cleaned project back to IndexedDB
        await this.saveCurrentProject();
      }

    } catch (error) {
      // Error cleaning up orphaned instances
    }
  }
}

// Export singleton instance
export const persistenceManager = new PersistenceManager();

// Initialize on app start
export async function initializePersistence(): Promise<void> {
  await persistenceManager.initialize();
}

// Convenience functions for components to use
export async function saveComponent(component: CustomComponent): Promise<void> {
  await persistenceManager.saveComponent(component);
}

export async function saveCategory(category: ComponentCategory): Promise<void> {
  await persistenceManager.saveCategory(category);
}

export async function deleteComponent(componentId: string): Promise<void> {
  await persistenceManager.deleteComponent(componentId);
}

export async function saveCurrentProject(): Promise<void> {
  await persistenceManager.saveCurrentProject();
}