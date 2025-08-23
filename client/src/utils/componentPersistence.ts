import { ComponentDef, ComponentCategory, ComponentId, CategoryId } from '../types/canvas';

// IndexedDB persistence for spec-compliant component system

const DB_NAME = 'ComponentDefinitionsDB';
const DB_VERSION = 1;
const COMPONENT_STORE = 'components';
const CATEGORY_STORE = 'categories';

// Type-safe database interface
type ComponentDefinitionDB = IDBDatabase;

let db: ComponentDefinitionDB | null = null;

/**
 * Initialize the component definitions database
 */
export async function initializeComponentDefinitionsDB(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result as ComponentDefinitionDB;
      resolve();
    };
    
    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result as ComponentDefinitionDB;
      
      // Create component definitions store
      if (!database.objectStoreNames.contains(COMPONENT_STORE)) {
        const componentStore = database.createObjectStore(COMPONENT_STORE, { keyPath: 'id' });
        componentStore.createIndex('categoryId', 'categoryId', { unique: false });
        componentStore.createIndex('name', 'name', { unique: false });
        componentStore.createIndex('version', 'version', { unique: false });
      }
      
      // Create categories store
      if (!database.objectStoreNames.contains(CATEGORY_STORE)) {
        const categoryStore = database.createObjectStore(CATEGORY_STORE, { keyPath: 'id' });
        categoryStore.createIndex('name', 'name', { unique: false });
        categoryStore.createIndex('sortIndex', 'sortIndex', { unique: false });
      }
    };
  });
}

/**
 * Save a component definition to IndexedDB
 */
export async function saveComponentDefinition(componentDef: ComponentDef): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  
  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([COMPONENT_STORE], 'readwrite');
    const store = transaction.objectStore(COMPONENT_STORE);
    
    const request = store.put(componentDef);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Load all component definitions from IndexedDB
 */
export async function loadComponentDefinitions(): Promise<ComponentDef[]> {
  if (!db) throw new Error('Database not initialized');
  
  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([COMPONENT_STORE], 'readonly');
    const store = transaction.objectStore(COMPONENT_STORE);
    
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Delete a component definition from IndexedDB
 */
export async function deleteComponentDefinition(componentId: ComponentId): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  
  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([COMPONENT_STORE], 'readwrite');
    const store = transaction.objectStore(COMPONENT_STORE);
    
    const request = store.delete(componentId);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Save a component category to IndexedDB
 */
export async function saveComponentCategory(category: ComponentCategory): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  
  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([CATEGORY_STORE], 'readwrite');
    const store = transaction.objectStore(CATEGORY_STORE);
    
    const request = store.put(category);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Load all component categories from IndexedDB
 */
export async function loadComponentCategories(): Promise<ComponentCategory[]> {
  if (!db) throw new Error('Database not initialized');
  
  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([CATEGORY_STORE], 'readonly');
    const store = transaction.objectStore(CATEGORY_STORE);
    
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Delete a component category from IndexedDB
 */
export async function deleteComponentCategory(categoryId: CategoryId): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  
  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([CATEGORY_STORE], 'readwrite');
    const store = transaction.objectStore(CATEGORY_STORE);
    
    const request = store.delete(categoryId);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Get components by category
 */
export async function getComponentsByCategory(categoryId: CategoryId | null): Promise<ComponentDef[]> {
  if (!db) throw new Error('Database not initialized');
  
  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([COMPONENT_STORE], 'readonly');
    const store = transaction.objectStore(COMPONENT_STORE);
    
    let request: IDBRequest;
    
    if (categoryId === null) {
      // Get uncategorized components
      const index = store.index('categoryId');
      request = index.getAll(null);
    } else {
      const index = store.index('categoryId');
      request = index.getAll(categoryId);
    }
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Search component definitions by name
 */
export async function searchComponentDefinitions(searchTerm: string): Promise<ComponentDef[]> {
  const allComponents = await loadComponentDefinitions();
  
  return allComponents.filter(component =>
    component.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
}