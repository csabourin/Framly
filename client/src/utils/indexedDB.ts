import { CanvasElement, Project, CustomComponent, ComponentCategory } from '../types/canvas';
import { CustomClass, Category } from '../store/classSlice';
import { WORKSPACE_KEY, type WorkspaceSnapshot } from './workspace';
import type { HistoryEntry } from '../store/historySlice';

export interface SavedImage {
  id: string;
  filename: string;
  data: string; // Base64 encoded
  mimeType: string;
  size: number;
  createdAt: string;
}

const DB_NAME = 'DesignToolDB';
const DB_VERSION = 3;

// Store names
const PROJECTS_STORE = 'projects';
const COMPONENTS_STORE = 'components';
const CATEGORIES_STORE = 'categories';
const SETTINGS_STORE = 'settings';
const CUSTOM_CLASSES_STORE = 'customClasses';
const CLASS_CATEGORIES_STORE = 'classCategories';
const IMAGES_STORE = 'images';

interface IndexedDBSchema {
  projects: {
    key: string;
    value: Project & { updatedAt: string };
  };
  components: {
    key: string;
    value: CustomComponent & { updatedAt: string };
  };
  categories: {
    key: string;
    value: ComponentCategory & { updatedAt: string };
  };
  settings: {
    key: string;
    value: {
      id: string;
      data: any;
      updatedAt: string;
    };
  };
  customClasses: {
    key: string;
    value: CustomClass & { updatedAt: string };
  };
  classCategories: {
    key: string;
    value: Category & { updatedAt: string };
  };
  images: {
    key: string;
    value: SavedImage;
  };
}

class IndexedDBManager {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private savedHistory = new Map<string, HistoryEntry>();
  private writerId = crypto.randomUUID();

  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onblocked = () => {
        reject(new Error('Local storage is blocked by another Framly tab. Close that tab and retry.'));
      };

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.db.onversionchange = () => {
          this.db?.close();
          this.db = null;
          this.initPromise = null;
        };
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
          const projectStore = db.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
          projectStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        if (!db.objectStoreNames.contains(COMPONENTS_STORE)) {
          const componentStore = db.createObjectStore(COMPONENTS_STORE, { keyPath: 'id' });
          componentStore.createIndex('category', 'category', { unique: false });
          componentStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        if (!db.objectStoreNames.contains(CATEGORIES_STORE)) {
          const categoryStore = db.createObjectStore(CATEGORIES_STORE, { keyPath: 'id' });
          categoryStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
          db.createObjectStore(SETTINGS_STORE, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(CUSTOM_CLASSES_STORE)) {
          const customClassStore = db.createObjectStore(CUSTOM_CLASSES_STORE, { keyPath: 'name' });
          customClassStore.createIndex('category', 'category', { unique: false });
          customClassStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        if (!db.objectStoreNames.contains(CLASS_CATEGORIES_STORE)) {
          const classCategoryStore = db.createObjectStore(CLASS_CATEGORIES_STORE, { keyPath: 'id' });
          classCategoryStore.createIndex('type', 'type', { unique: false });
          classCategoryStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        if (!db.objectStoreNames.contains(IMAGES_STORE)) {
          const imageStore = db.createObjectStore(IMAGES_STORE, { keyPath: 'id' });
          imageStore.createIndex('filename', 'filename', { unique: false });
          imageStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });

    try {
      await this.initPromise;
    } catch (error) {
      this.initPromise = null;
      throw error;
    }
  }

  /** Read the document and all referenced history from one consistent transaction. */
  async loadWorkspace(): Promise<WorkspaceSnapshot | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction([SETTINGS_STORE], 'readonly');
    const result = await new Promise<WorkspaceSnapshot | null>((resolve, reject) => {
      const settings = transaction.objectStore(SETTINGS_STORE);
      let snapshot: WorkspaceSnapshot | null = null;
      transaction.oncomplete = () => resolve(snapshot);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('Reading the workspace was aborted'));
      const request = settings.get(WORKSPACE_KEY);
      request.onsuccess = () => {
        if (!request.result) return;
        const data = request.result.data;
        if (!data || typeof data !== 'object' || (data.historyFormat && data.historyFormat !== 'references')) {
          transaction.abort(); return;
        }
        snapshot = data;
        if (data.historyFormat !== 'references') return;
        if (!Array.isArray(data.history?.entries)) { transaction.abort(); return; }
        const entries: HistoryEntry[] = new Array(data.history.entries.length);
        const { historyFormat, ...document } = data;
        snapshot = { ...document, history: { ...data.history, entries } };
        data.history.entries.forEach((id: string, index: number) => {
          const entry = settings.get(`workspace-history:${id}`);
          entry.onsuccess = () => {
            if (!entry.result?.data) { transaction.abort(); return; }
            entries[index] = entry.result.data;
          };
        });
      };
    });
    this.savedHistory = new Map((result?.history?.entries || []).map((entry) => [entry.id, entry]));
    return result;
  }

  /** Workspace and changed history entries become durable together. */
  async saveWorkspace(snapshot: WorkspaceSnapshot, preserveCurrent = false): Promise<void> {
    // Imports retain a self-contained recovery copy, independent of entry ids.
    const previous = preserveCurrent ? await this.loadWorkspace() : null;
    const db = await this.ensureDB();
    const transaction = db.transaction([SETTINGS_STORE], 'readwrite', { durability: 'strict' });
    const nextHistory = new Map(snapshot.history.entries.map((entry) => [entry.id, entry]));
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error || new Error('The workspace save was aborted.'));
      transaction.onerror = () => reject(transaction.error || new Error('The workspace could not be saved.'));
      const settings = transaction.objectStore(SETTINGS_STORE);
      if (previous) settings.put({ id: 'workspace-before-import', data: previous });
      const current = settings.get(WORKSPACE_KEY);
      current.onsuccess = () => {
        // Another browser tab may have pruned our cached history records. In
        // that case rewrite this document's entries before publishing its ids.
        const sameWriter = current.result?.writerId === this.writerId;
        for (const [id, entry] of nextHistory) {
          if (!sameWriter || this.savedHistory.get(id) !== entry) settings.put({ id: `workspace-history:${id}`, data: entry });
        }
        for (const id of this.savedHistory.keys()) {
          if (!nextHistory.has(id)) settings.delete(`workspace-history:${id}`);
        }
        settings.put({ id: WORKSPACE_KEY, writerId: this.writerId, data: {
          ...snapshot, historyFormat: 'references',
          history: { ...snapshot.history, entries: snapshot.history.entries.map((entry) => entry.id) },
        }, updatedAt: new Date().toISOString() });
      };
    });
    this.savedHistory = nextHistory;
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Failed to initialize IndexedDB');
    }

    // Verify that required stores exist
    if (!this.db.objectStoreNames.contains(IMAGES_STORE)) {
      throw new Error(`Database is missing required store: ${IMAGES_STORE}. Please refresh the page to upgrade your database.`);
    }

    return this.db;
  }

  // Project operations
  async saveProject(project: Project): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([PROJECTS_STORE], 'readwrite');
    const store = transaction.objectStore(PROJECTS_STORE);

    const projectWithTimestamp = {
      ...project,
      updatedAt: new Date().toISOString()
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.put(projectWithTimestamp);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async loadProject(projectId: string): Promise<Project | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction([PROJECTS_STORE], 'readonly');
    const store = transaction.objectStore(PROJECTS_STORE);

    return new Promise((resolve, reject) => {
      const request = store.get(projectId);
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          // Remove timestamp before returning
          const { updatedAt, ...project } = result;
          resolve(project as Project);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllProjects(): Promise<Project[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction([PROJECTS_STORE], 'readonly');
    const store = transaction.objectStore(PROJECTS_STORE);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result.map((item: any) => {
          const { updatedAt, ...project } = item;
          return project as Project;
        });
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Component operations
  async saveComponent(component: CustomComponent): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([COMPONENTS_STORE], 'readwrite');
    const store = transaction.objectStore(COMPONENTS_STORE);

    const componentWithTimestamp = {
      ...component,
      updatedAt: new Date().toISOString()
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.put(componentWithTimestamp);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async loadComponent(componentId: string): Promise<CustomComponent | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction([COMPONENTS_STORE], 'readonly');
    const store = transaction.objectStore(COMPONENTS_STORE);

    return new Promise((resolve, reject) => {
      const request = store.get(componentId);
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          const { updatedAt, ...component } = result;
          resolve(component as CustomComponent);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllComponents(): Promise<CustomComponent[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction([COMPONENTS_STORE], 'readonly');
    const store = transaction.objectStore(COMPONENTS_STORE);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result.map((item: any) => {
          const { updatedAt, ...component } = item;
          return component as CustomComponent;
        });
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteComponent(componentId: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([COMPONENTS_STORE], 'readwrite');
    const store = transaction.objectStore(COMPONENTS_STORE);

    await new Promise<void>((resolve, reject) => {
      const request = store.delete(componentId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Category operations
  async saveCategory(category: ComponentCategory): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([CATEGORIES_STORE], 'readwrite');
    const store = transaction.objectStore(CATEGORIES_STORE);

    const categoryWithTimestamp = {
      ...category,
      updatedAt: new Date().toISOString()
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.put(categoryWithTimestamp);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllCategories(): Promise<ComponentCategory[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction([CATEGORIES_STORE], 'readonly');
    const store = transaction.objectStore(CATEGORIES_STORE);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result.map((item: any) => {
          const { updatedAt, ...category } = item;
          return category as ComponentCategory;
        });
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Settings operations
  async saveSetting(key: string, data: any): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([SETTINGS_STORE], 'readwrite');
    const store = transaction.objectStore(SETTINGS_STORE);

    const setting = {
      id: key,
      data,
      updatedAt: new Date().toISOString()
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.put(setting);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async loadSetting(key: string): Promise<any> {
    const db = await this.ensureDB();
    const transaction = db.transaction([SETTINGS_STORE], 'readonly');
    const store = transaction.objectStore(SETTINGS_STORE);

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Custom Classes operations
  async saveCustomClass(customClass: CustomClass): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([CUSTOM_CLASSES_STORE], 'readwrite');
    const store = transaction.objectStore(CUSTOM_CLASSES_STORE);

    const classWithTimestamp = {
      ...customClass,
      updatedAt: new Date().toISOString()
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.put(classWithTimestamp);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllCustomClasses(): Promise<CustomClass[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction([CUSTOM_CLASSES_STORE], 'readonly');
    const store = transaction.objectStore(CUSTOM_CLASSES_STORE);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result.map((item: any) => {
          const { updatedAt, ...customClass } = item;
          return customClass as CustomClass;
        });
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteCustomClass(className: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([CUSTOM_CLASSES_STORE], 'readwrite');
    const store = transaction.objectStore(CUSTOM_CLASSES_STORE);

    await new Promise<void>((resolve, reject) => {
      const request = store.delete(className);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Class Categories operations
  async saveClassCategory(category: Category): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([CLASS_CATEGORIES_STORE], 'readwrite');
    const store = transaction.objectStore(CLASS_CATEGORIES_STORE);

    const categoryWithTimestamp = {
      ...category,
      updatedAt: new Date().toISOString()
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.put(categoryWithTimestamp);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllClassCategories(): Promise<Category[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction([CLASS_CATEGORIES_STORE], 'readonly');
    const store = transaction.objectStore(CLASS_CATEGORIES_STORE);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result.map((item: any) => {
          const { updatedAt, ...category } = item;
          return category as Category;
        });
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Image operations
  // createdAt is filled in below when the caller does not supply one, so it is
  // optional on the way in.
  async saveImage(image: Omit<SavedImage, 'createdAt'> & { createdAt?: string }): Promise<void> {
    try {
      const db = await this.ensureDB();

      const transaction = db.transaction([IMAGES_STORE], 'readwrite');
      const store = transaction.objectStore(IMAGES_STORE);

      const imageWithTimestamp = {
        ...image,
        createdAt: image.createdAt || new Date().toISOString() // Use provided timestamp or create new
      };

      await new Promise<void>((resolve, reject) => {
        const request = store.put(imageWithTimestamp);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          reject(new Error(`IndexedDB store error: ${request.error?.message || 'Unknown error'}`));
        };
      });

    } catch (error) {
      throw error;
    }
  }

  async getImage(id: string): Promise<SavedImage | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction([IMAGES_STORE], 'readonly');
    const store = transaction.objectStore(IMAGES_STORE);

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result as SavedImage : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllImages(): Promise<SavedImage[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction([IMAGES_STORE], 'readonly');
    const store = transaction.objectStore(IMAGES_STORE);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        resolve(request.result as SavedImage[]);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteImage(id: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([IMAGES_STORE], 'readwrite');
    const store = transaction.objectStore(IMAGES_STORE);

    await new Promise<void>((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Utility methods
  async clearAll(): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([PROJECTS_STORE, COMPONENTS_STORE, CATEGORIES_STORE, SETTINGS_STORE, CUSTOM_CLASSES_STORE, CLASS_CATEGORIES_STORE, IMAGES_STORE], 'readwrite');

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error || new Error('Clearing local data was aborted'));
      transaction.onerror = () => reject(transaction.error);
      for (const name of transaction.objectStoreNames) transaction.objectStore(name).clear();
    });
  }
}

// Export singleton instance
export const indexedDBManager = new IndexedDBManager();

// Convenience methods
export async function initializeDB(): Promise<void> {
  try {
    await indexedDBManager.init();
  } catch (error) {
    throw error;
  }
}

export async function saveProjectToIndexedDB(project: Project): Promise<void> {
  try {
    await indexedDBManager.saveProject(project);
  } catch (error) {
    throw error;
  }
}

export async function loadProjectFromIndexedDB(projectId: string): Promise<Project | null> {
  try {
    const project = await indexedDBManager.loadProject(projectId);
    return project;
  } catch (error) {
    throw error;
  }
}

export async function saveComponentToIndexedDB(component: CustomComponent): Promise<void> {
  try {
    await indexedDBManager.saveComponent(component);
  } catch (error) {
    throw error;
  }
}

export async function loadComponentsFromIndexedDB(): Promise<CustomComponent[]> {
  try {
    const components = await indexedDBManager.getAllComponents();
    return components;
  } catch (error) {
    throw error;
  }
}

export async function saveCategoryToIndexedDB(category: ComponentCategory): Promise<void> {
  try {
    await indexedDBManager.saveCategory(category);
  } catch (error) {
    throw error;
  }
}

export async function loadCategoriesFromIndexedDB(): Promise<ComponentCategory[]> {
  try {
    const categories = await indexedDBManager.getAllCategories();
    return categories;
  } catch (error) {
    return [];
  }
}

// Custom Classes convenience methods
export async function saveCustomClassToIndexedDB(customClass: CustomClass): Promise<void> {
  try {
    await indexedDBManager.saveCustomClass(customClass);
  } catch (error) {
    throw error;
  }
}

export async function loadCustomClassesFromIndexedDB(): Promise<CustomClass[]> {
  try {
    return await indexedDBManager.getAllCustomClasses();
  } catch (error) {
    return [];
  }
}

export async function deleteCustomClassFromIndexedDB(className: string): Promise<void> {
  try {
    await indexedDBManager.deleteCustomClass(className);
  } catch (error) {
    throw error;
  }
}

// Class Categories convenience methods
export async function saveClassCategoryToIndexedDB(category: Category): Promise<void> {
  try {
    await indexedDBManager.saveClassCategory(category);
  } catch (error) {
    throw error;
  }
}

export async function loadClassCategoriesFromIndexedDB(): Promise<Category[]> {
  try {
    return await indexedDBManager.getAllClassCategories();
  } catch (error) {
    return [];
  }
}
