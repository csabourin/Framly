import { store } from '../store';
import { loadProject } from '../store/canvasSlice';
import { loadComponents } from '../store/componentSlice';
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
import { Project, CustomComponent, ComponentCategory } from '../types/canvas';

// Constants
const CURRENT_PROJECT_KEY = 'currentProject';
const AUTO_SAVE_INTERVAL = 5000; // 5 seconds
const PROJECT_ID = 'default-project'; // For now, we'll use a single project

export class PersistenceManager {
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private lastSavedState: string = '';

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize IndexedDB
      await initializeDB();
      
      // Load persisted data
      await this.loadPersistedData();
      
      // Start auto-save
      this.startAutoSave();
      
      this.isInitialized = true;
      console.log('Persistence manager initialized');
    } catch (error) {
      console.error('Failed to initialize persistence manager:', error);
      // Continue without persistence if IndexedDB fails
    }
  }

  private async loadPersistedData(): Promise<void> {
    try {
      // Load current project
      await this.loadCurrentProject();
      
      // Load components and categories
      await this.loadComponents();
      
      // Load custom classes and categories
      await this.loadCustomClasses();
      
      // Load UI settings
      await this.loadUISettings();
    } catch (error) {
      console.error('Failed to load persisted data:', error);
    }
  }

  private async loadCurrentProject(): Promise<void> {
    try {
      const project = await loadProjectFromIndexedDB(PROJECT_ID);
      if (project) {
        console.log('Loading persisted project:', project.name);
        
        // Check if project needs migration from old structure to new tab structure
        const migratedProject = this.migrateProjectToTabStructure(project);
        store.dispatch(loadProject(migratedProject));
      } else {
        console.log('No persisted project found, using default');
      }
    } catch (error) {
      console.error('Failed to load current project:', error);
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
            selectedElementId: project.selectedElementId || 'root'
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

    console.log('Migrated project from old structure to tab structure');
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
          components: uncategorizedComponents
        });
      }

      // Load into Redux store
      store.dispatch(loadComponents(categoriesWithComponents));
      
      console.log(`Loaded ${components.length} components in ${categories.length} categories`);
    } catch (error) {
      console.error('Failed to load components:', error);
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
      
      console.log(`Loaded ${customClasses.length} custom classes and ${classCategories.length} class categories`);
    } catch (error) {
      console.error('Failed to load custom classes:', error);
    }
  }

  private async loadUISettings(): Promise<void> {
    try {
      const uiSettings = await indexedDBManager.loadSetting('uiSettings');
      if (uiSettings) {
        console.log('Loading persisted UI settings');
        store.dispatch(loadUISettings(uiSettings));
      } else {
        console.log('No persisted UI settings found, using defaults');
      }
    } catch (error) {
      console.error('Failed to load UI settings:', error);
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
      
      this.lastSavedState = currentStateString;
      console.log('Project auto-saved');
    } catch (error) {
      console.error('Failed to save current project:', error);
    }
  }

  async saveComponent(component: CustomComponent): Promise<void> {
    try {
      await saveComponentToIndexedDB(component);
      console.log('Component saved:', component.name);
    } catch (error) {
      console.error('Failed to save component:', error);
      throw error;
    }
  }

  async saveCategory(category: ComponentCategory): Promise<void> {
    try {
      await saveCategoryToIndexedDB(category);
      console.log('Category saved:', category.name);
    } catch (error) {
      console.error('Failed to save category:', error);
      throw error;
    }
  }

  async deleteComponent(componentId: string): Promise<void> {
    try {
      await indexedDBManager.deleteComponent(componentId);
      console.log('Component deleted:', componentId);
    } catch (error) {
      console.error('Failed to delete component:', error);
      throw error;
    }
  }

  private startAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    this.autoSaveTimer = setInterval(() => {
      this.saveCurrentProject();
    }, AUTO_SAVE_INTERVAL);

    console.log('Auto-save started (interval: 5s)');
  }

  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
      console.log('Auto-save stopped');
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
      console.error('Failed to export data:', error);
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
      console.error('Failed to save custom classes:', error);
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
      console.error('Failed to save UI settings:', error);
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
      
      console.log('Data imported successfully');
    } catch (error) {
      console.error('Failed to import data:', error);
      throw error;
    }
  }

  async clearAllData(): Promise<void> {
    try {
      await indexedDBManager.clearAll();
      
      // Reset store to default state
      const state = store.getState();
      store.dispatch(loadProject({
        id: PROJECT_ID,
        name: 'Untitled Project',
        elements: { root: { id: 'root', type: 'container' as any, x: 0, y: 0, width: 800, height: 600, styles: {}, children: [] } },
        breakpoints: { desktop: { width: 1200 } },
        currentBreakpoint: 'desktop'
      }));
      
      store.dispatch(loadComponents([]));
      
      console.log('All data cleared');
    } catch (error) {
      console.error('Failed to clear data:', error);
      throw error;
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