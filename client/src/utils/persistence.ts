import { store, type RootState } from '../store';
import { loadProject } from '../store/canvasSlice';
import { loadComponents } from '../store/componentSlice';
import { loadComponentDefinitions } from '../store/componentDefinitionsSlice';
import { loadCustomClassesFromStorage, loadCategoriesFromStorage } from '../store/classSlice';
import { loadUISettings } from '../store/uiSlice';
import { indexedDBManager } from './indexedDB';
import { initializeComponentDefinitionsDB, loadComponentDefinitions as loadDefinitions, loadComponentCategories, clearComponentDefinitionsDB } from './componentPersistence';
import { exportUnitPreferences, loadUnitPreferences, subscribeUnitPreferences } from './unitPersistence';
import { historyManager } from './historyManager';
import { historyForPersistence } from './historyIntegration';
import { WORKSPACE_KEY, validateWorkspace, type WorkspaceSnapshot } from './workspace';
import type { Project, CustomComponent, ComponentCategory } from '../types/canvas';

export interface PersistenceState {
  status: 'loading' | 'saving' | 'saved' | 'error';
  savedAt: number | null;
}

function uiSettings(state: RootState) {
  const ui = state.ui;
  return {
    isComponentPanelVisible: ui.isComponentPanelVisible,
    isDOMTreePanelVisible: ui.isDOMTreePanelVisible,
    isRightPanelVisible: ui.isRightPanelVisible,
    rightPanelTab: ui.rightPanelTab,
    workspaceLayout: ui.workspaceLayout,
    zoomLevel: ui.zoomLevel,
    isGridVisible: ui.isGridVisible,
    canvasOffset: ui.canvasOffset,
  };
}

export class PersistenceManager {
  private isInitialized = false;
  private revision = 0;
  private savedRevision = -1;
  private queued = false;
  private saving: Promise<void> | null = null;
  private unsubscribe: (() => void) | null = null;
  private unsubscribeUnits: (() => void) | null = null;
  private listeners = new Set<() => void>();
  private status: PersistenceState = { status: 'loading', savedAt: null };
  getSnapshot = () => this.status;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  private report(status: PersistenceState['status'], savedAt = this.status.savedAt) {
    this.status = { status, savedAt };
    this.listeners.forEach((listener) => listener());
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    this.report('loading');
    try {
      await indexedDBManager.init();
      await initializeComponentDefinitionsDB();
      const saved = await indexedDBManager.loadSetting(WORKSPACE_KEY);
      if (saved !== null) {
        validateWorkspace(saved);
        this.restore(saved);
        await historyManager.init(saved.history);
      } else {
        await this.loadLegacyData();
        await historyManager.init();
      }
      this.isInitialized = true;
      this.startAutoSave();
    } catch (error) {
      this.report('error');
      throw error;
    }
  }

  private async loadLegacyData() {
    // Read everything before installing it. Legacy records stay untouched as
    // recoverable originals when the first workspace snapshot is committed.
    const [project, definitions, categories, classes, classCategories, settings, units] = await Promise.all([
      indexedDBManager.loadProject('default-project'), loadDefinitions(), loadComponentCategories(),
      indexedDBManager.getAllCustomClasses(), indexedDBManager.getAllClassCategories(),
      indexedDBManager.loadSetting('uiSettings'), indexedDBManager.loadSetting('unitPreferences'),
    ]);
    if (project) store.dispatch(loadProject(this.migrateProjectToTabStructure(project)));
    store.dispatch(loadComponentDefinitions({
      definitions: Object.fromEntries(definitions.map((definition) => [definition.id, definition])),
      categories: categories.length ? Object.fromEntries(categories.map((category) => [category.id, category])) : store.getState().componentDefinitions.categories,
    }));
    store.dispatch(loadCustomClassesFromStorage(Object.fromEntries(classes.map((entry) => [entry.name, entry]))));
    store.dispatch(loadCategoriesFromStorage(classCategories));
    if (settings) store.dispatch(loadUISettings(settings));
    if (units) loadUnitPreferences(units);
  }

  private restore(snapshot: WorkspaceSnapshot) {
    store.dispatch(loadProject(snapshot.project));
    store.dispatch(loadCustomClassesFromStorage(snapshot.classes.customClasses));
    store.dispatch(loadCategoriesFromStorage(snapshot.classes.categories));
    store.dispatch(loadComponentDefinitions(snapshot.componentDefinitions));
    store.dispatch(loadComponents(snapshot.componentCategories));
    store.dispatch(loadUISettings(snapshot.uiSettings));
    loadUnitPreferences(snapshot.unitPreferences);
  }

  private capture(): WorkspaceSnapshot {
    const state = store.getState();
    return {
      version: 1,
      project: state.canvas.project,
      classes: { customClasses: state.classes.customClasses, categories: state.classes.categories },
      componentDefinitions: { definitions: state.componentDefinitions.definitions, categories: state.componentDefinitions.categories },
      componentCategories: state.components.categories.map((category) => ({
        ...category, components: state.components.components.filter((component) => component.category === category.id),
      })),
      uiSettings: uiSettings(state),
      unitPreferences: structuredClone(exportUnitPreferences()),
      history: historyForPersistence(),
    };
  }

  private changed = () => {
    this.revision++;
    this.report('saving');
    if (this.queued) return;
    this.queued = true;
    // Group synchronous reducer actions, with no timer-based loss window.
    queueMicrotask(() => {
      this.queued = false;
      if (this.unsubscribe) void this.saveCurrentProject().catch(() => {});
    });
  };

  private beforeUnload = (event: BeforeUnloadEvent) => {
    if (this.savedRevision >= this.revision) return;
    event.preventDefault();
    event.returnValue = '';
  };

  private startAutoSave() {
    const tracked = () => {
      const state = store.getState();
      return [state.canvas.project, state.classes.customClasses, state.classes.categories,
        state.componentDefinitions.definitions, state.componentDefinitions.categories,
        state.components.components, state.components.categories, state.history.entries,
        state.history.currentIndex, ...Object.values(uiSettings(state))];
    };
    let previous = tracked();
    this.unsubscribe = store.subscribe(() => {
      const next = tracked();
      if (next.some((value, index) => value !== previous[index])) {
        previous = next;
        this.changed();
      }
    });
    this.unsubscribeUnits = subscribeUnitPreferences(this.changed);
    window.addEventListener('beforeunload', this.beforeUnload);
    this.changed();
  }

  stopAutoSave() {
    this.unsubscribe?.();
    this.unsubscribeUnits?.();
    this.unsubscribe = null;
    this.unsubscribeUnits = null;
    window.removeEventListener('beforeunload', this.beforeUnload);
  }

  saveCurrentProject(): Promise<void> {
    if (!this.isInitialized) return Promise.reject(new Error('Local storage is not ready.'));
    if (this.saving) return this.saving;
    this.saving = this.writePending().finally(() => { this.saving = null; });
    return this.saving;
  }

  private async writePending() {
    try {
      this.report('saving');
      while (this.savedRevision < this.revision) {
        const revision = this.revision;
        const snapshot = this.capture();
        await indexedDBManager.saveWorkspace(snapshot);
        this.savedRevision = revision;
      }
      this.report('saved', Date.now());
    } catch (error) {
      this.report('error');
      throw error;
    }
  }

  async exportData(): Promise<string> {
    // Backup works even when saving fails and includes the latest in-memory edit.
    const workspace = this.capture();
    return JSON.stringify({ version: '1.0', exportedAt: new Date().toISOString(),
      workspace, project: workspace.project,
      components: store.getState().components.components,
      categories: workspace.componentCategories,
    }, null, 2);
  }

  async importData(dataString: string): Promise<void> {
    const data = JSON.parse(dataString);
    if (data.version !== '1.0' || !data.project) throw new Error('Unsupported export format');
    const imported: WorkspaceSnapshot = data.workspace || {
      ...this.capture(), project: this.migrateProjectToTabStructure(data.project),
      classes: { customClasses: {}, categories: [] },
      componentDefinitions: { definitions: {}, categories: store.getState().componentDefinitions.categories },
      componentCategories: (data.categories || []).map((category: ComponentCategory) => ({
        ...category, components: (data.components || []).filter((component: CustomComponent) => component.category === category.id),
      })),
      history: { entries: [], currentIndex: -1, maxEntries: 50 },
    };
    validateWorkspace(imported);
    this.stopAutoSave();
    try {
      await this.saving?.catch(() => {});
      await indexedDBManager.saveWorkspace(imported, true);
      this.restore(imported);
      await historyManager.init(imported.history);
    } finally {
      this.startAutoSave();
    }
    await this.saveCurrentProject();
  }

  async clearAllData(): Promise<void> {
    this.stopAutoSave();
    try {
      await this.saving?.catch(() => {});
      await clearComponentDefinitionsDB();
      await historyManager.clearLegacyStorage();
      await indexedDBManager.clearAll();
      window.location.reload();
    } catch (error) {
      this.startAutoSave();
      throw error;
    }
  }

  async saveComponent(component: CustomComponent) { await indexedDBManager.saveComponent(component); }
  async saveCategory(category: ComponentCategory) { await indexedDBManager.saveCategory(category); }
  async deleteComponent(id: string) { await indexedDBManager.deleteComponent(id); }

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

}

export const persistenceManager = new PersistenceManager();
export async function initializePersistence() { await persistenceManager.initialize(); }
export async function saveComponent(component: CustomComponent) { await persistenceManager.saveComponent(component); }
export async function saveCategory(category: ComponentCategory) { await persistenceManager.saveCategory(category); }
export async function deleteComponent(id: string) { await persistenceManager.deleteComponent(id); }
export async function saveCurrentProject() { await persistenceManager.saveCurrentProject(); }
