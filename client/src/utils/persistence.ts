import { store } from '../store';
import { loadProject } from '../store/canvasSlice';
import { loadComponents } from '../store/componentSlice';
import { 
  initializeDB, 
  saveProjectToIndexedDB, 
  loadProjectFromIndexedDB,
  saveComponentToIndexedDB,
  loadComponentsFromIndexedDB,
  saveCategoryToIndexedDB,
  loadCategoriesFromIndexedDB,
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
    } catch (error) {
      console.error('Failed to load persisted data:', error);
    }
  }

  private async loadCurrentProject(): Promise<void> {
    try {
      const project = await loadProjectFromIndexedDB(PROJECT_ID);
      if (project) {
        console.log('Loading persisted project:', project.name);
        store.dispatch(loadProject(project));
      } else {
        console.log('No persisted project found, using default');
      }
    } catch (error) {
      console.error('Failed to load current project:', error);
    }
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