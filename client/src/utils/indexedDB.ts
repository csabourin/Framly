import { CanvasElement, Project, CustomComponent, ComponentCategory } from '../types/canvas';
import { CustomClass, Category } from '../store/classSlice';

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

  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB failed to open:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        console.log('IndexedDB upgrade triggered, version:', event.newVersion, 'from:', event.oldVersion);
        console.log('Existing stores:', Array.from(db.objectStoreNames));
        
        // Create object stores
        if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
          console.log('Creating projects store');
          const projectStore = db.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
          projectStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        if (!db.objectStoreNames.contains(COMPONENTS_STORE)) {
          console.log('Creating components store');
          const componentStore = db.createObjectStore(COMPONENTS_STORE, { keyPath: 'id' });
          componentStore.createIndex('category', 'category', { unique: false });
          componentStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        if (!db.objectStoreNames.contains(CATEGORIES_STORE)) {
          console.log('Creating categories store');
          const categoryStore = db.createObjectStore(CATEGORIES_STORE, { keyPath: 'id' });
          categoryStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
          console.log('Creating settings store');
          db.createObjectStore(SETTINGS_STORE, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(CUSTOM_CLASSES_STORE)) {
          console.log('Creating custom classes store');
          const customClassStore = db.createObjectStore(CUSTOM_CLASSES_STORE, { keyPath: 'name' });
          customClassStore.createIndex('category', 'category', { unique: false });
          customClassStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        if (!db.objectStoreNames.contains(CLASS_CATEGORIES_STORE)) {
          console.log('Creating class categories store');
          const classCategoryStore = db.createObjectStore(CLASS_CATEGORIES_STORE, { keyPath: 'id' });
          classCategoryStore.createIndex('type', 'type', { unique: false });
          classCategoryStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        if (!db.objectStoreNames.contains(IMAGES_STORE)) {
          console.log('Creating images store');
          const imageStore = db.createObjectStore(IMAGES_STORE, { keyPath: 'id' });
          imageStore.createIndex('filename', 'filename', { unique: false });
          imageStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        console.log('IndexedDB schema created/upgraded. Final stores:', Array.from(db.objectStoreNames));
      };
    });

    return this.initPromise;
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
      console.error('Images store missing from database. Available stores:', Array.from(this.db.objectStoreNames));
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
  async saveImage(image: SavedImage): Promise<void> {
    try {
      console.log('IndexedDB saveImage called with:', { 
        id: image.id, 
        filename: image.filename,
        size: image.size,
        mimeType: image.mimeType 
      });

      const db = await this.ensureDB();
      console.log('Database connection established');

      const transaction = db.transaction([IMAGES_STORE], 'readwrite');
      const store = transaction.objectStore(IMAGES_STORE);
      console.log('Transaction and store created');
      
      const imageWithTimestamp = {
        ...image,
        createdAt: image.createdAt || new Date().toISOString() // Use provided timestamp or create new
      };

      console.log('About to store image with data:', {
        id: imageWithTimestamp.id,
        filename: imageWithTimestamp.filename,
        dataLength: imageWithTimestamp.data.length,
        createdAt: imageWithTimestamp.createdAt
      });

      await new Promise<void>((resolve, reject) => {
        const request = store.put(imageWithTimestamp);
        
        request.onsuccess = () => {
          console.log('Image stored successfully in IndexedDB');
          resolve();
        };
        
        request.onerror = () => {
          console.error('IndexedDB store.put failed:', request.error);
          reject(new Error(`IndexedDB store error: ${request.error?.message || 'Unknown error'}`));
        };
      });

      console.log('SaveImage operation completed successfully');
    } catch (error) {
      console.error('SaveImage failed with error:', error);
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
    
    await Promise.all([
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore(PROJECTS_STORE).clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore(COMPONENTS_STORE).clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore(CATEGORIES_STORE).clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore(SETTINGS_STORE).clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore(CUSTOM_CLASSES_STORE).clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore(CLASS_CATEGORIES_STORE).clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore(IMAGES_STORE).clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      })
    ]);
  }
}

// Export singleton instance
export const indexedDBManager = new IndexedDBManager();

// Convenience methods
export async function initializeDB(): Promise<void> {
  try {
    await indexedDBManager.init();
    console.log('IndexedDB initialized successfully');
  } catch (error) {
    console.error('Failed to initialize IndexedDB:', error);
    throw error;
  }
}

export async function saveProjectToIndexedDB(project: Project): Promise<void> {
  try {
    await indexedDBManager.saveProject(project);
    console.log('Project saved to IndexedDB:', project.id);
  } catch (error) {
    console.error('Failed to save project to IndexedDB:', error);
    throw error;
  }
}

export async function loadProjectFromIndexedDB(projectId: string): Promise<Project | null> {
  try {
    const project = await indexedDBManager.loadProject(projectId);
    console.log('Project loaded from IndexedDB:', projectId);
    return project;
  } catch (error) {
    console.error('Failed to load project from IndexedDB:', error);
    throw error;
  }
}

export async function saveComponentToIndexedDB(component: CustomComponent): Promise<void> {
  try {
    await indexedDBManager.saveComponent(component);
    console.log('Component saved to IndexedDB:', component.id);
  } catch (error) {
    console.error('Failed to save component to IndexedDB:', error);
    throw error;
  }
}

export async function loadComponentsFromIndexedDB(): Promise<CustomComponent[]> {
  try {
    const components = await indexedDBManager.getAllComponents();
    console.log('Components loaded from IndexedDB:', components.length);
    return components;
  } catch (error) {
    console.error('Failed to load components from IndexedDB:', error);
    throw error;
  }
}

export async function saveCategoryToIndexedDB(category: ComponentCategory): Promise<void> {
  try {
    await indexedDBManager.saveCategory(category);
    console.log('Category saved to IndexedDB:', category.id);
  } catch (error) {
    console.error('Failed to save category to IndexedDB:', error);
    throw error;
  }
}

export async function loadCategoriesFromIndexedDB(): Promise<ComponentCategory[]> {
  try {
    const categories = await indexedDBManager.getAllCategories();
    console.log('Categories loaded from IndexedDB:', categories.length);
    return categories;
  } catch (error) {
    console.error('Failed to load categories from IndexedDB:', error);
    return [];
  }
}

// Custom Classes convenience methods
export async function saveCustomClassToIndexedDB(customClass: CustomClass): Promise<void> {
  try {
    await indexedDBManager.saveCustomClass(customClass);
    console.log('Custom class saved to IndexedDB:', customClass.name);
  } catch (error) {
    console.error('Failed to save custom class to IndexedDB:', error);
    throw error;
  }
}

export async function loadCustomClassesFromIndexedDB(): Promise<CustomClass[]> {
  try {
    return await indexedDBManager.getAllCustomClasses();
  } catch (error) {
    console.error('Failed to load custom classes from IndexedDB:', error);
    return [];
  }
}

export async function deleteCustomClassFromIndexedDB(className: string): Promise<void> {
  try {
    await indexedDBManager.deleteCustomClass(className);
    console.log('Custom class deleted from IndexedDB:', className);
  } catch (error) {
    console.error('Failed to delete custom class from IndexedDB:', error);
    throw error;
  }
}

// Class Categories convenience methods
export async function saveClassCategoryToIndexedDB(category: Category): Promise<void> {
  try {
    await indexedDBManager.saveClassCategory(category);
    console.log('Class category saved to IndexedDB:', category.id);
  } catch (error) {
    console.error('Failed to save class category to IndexedDB:', error);
    throw error;
  }
}

export async function loadClassCategoriesFromIndexedDB(): Promise<Category[]> {
  try {
    return await indexedDBManager.getAllClassCategories();
  } catch (error) {
    console.error('Failed to load class categories from IndexedDB:', error);
    return [];
  }
}