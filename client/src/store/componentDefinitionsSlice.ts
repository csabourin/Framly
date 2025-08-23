import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ComponentDef, ComponentCategory, ComponentId, CategoryId } from '../types/canvas';

interface ComponentDefinitionsState {
  // Component definitions (spec-compliant)
  definitions: Record<ComponentId, ComponentDef>;
  categories: Record<CategoryId, ComponentCategory>;
  
  // In-memory cache for performance
  componentMap: Map<ComponentId, ComponentDef>;
  instanceIndex: Record<ComponentId, string[]>; // Track which elements are instances of which components
  
  // UI state
  isComponentEditorOpen: boolean;
  editingComponentId: ComponentId | null;
  
  // Tab management for component editing
  openComponentTabs: ComponentId[];
  activeComponentTabId: ComponentId | null;
}

const initialState: ComponentDefinitionsState = {
  definitions: {},
  categories: {},
  componentMap: new Map(),
  instanceIndex: {},
  isComponentEditorOpen: false,
  editingComponentId: null,
  openComponentTabs: [],
  activeComponentTabId: null,
};

const componentDefinitionsSlice = createSlice({
  name: 'componentDefinitions',
  initialState,
  reducers: {
    // Component definition management
    addComponentDefinition: (state, action: PayloadAction<ComponentDef>) => {
      const def = action.payload;
      state.definitions[def.id] = def;
      state.componentMap.set(def.id, def);
      if (!state.instanceIndex[def.id]) {
        state.instanceIndex[def.id] = [];
      }
    },
    
    updateComponentDefinition: (state, action: PayloadAction<ComponentDef>) => {
      const def = action.payload;
      state.definitions[def.id] = def;
      state.componentMap.set(def.id, def);
    },
    
    deleteComponentDefinition: (state, action: PayloadAction<ComponentId>) => {
      const componentId = action.payload;
      delete state.definitions[componentId];
      state.componentMap.delete(componentId);
      delete state.instanceIndex[componentId];
      
      // Close any open tabs for this component
      state.openComponentTabs = state.openComponentTabs.filter(id => id !== componentId);
      if (state.activeComponentTabId === componentId) {
        state.activeComponentTabId = state.openComponentTabs[0] || null;
      }
    },
    
    renameComponentDefinition: (state, action: PayloadAction<{ componentId: ComponentId; newName: string }>) => {
      const { componentId, newName } = action.payload;
      if (state.definitions[componentId]) {
        state.definitions[componentId].name = newName;
        state.definitions[componentId].version += 1;
        state.definitions[componentId].updatedAt = Date.now();
        state.componentMap.set(componentId, state.definitions[componentId]);
      }
    },
    
    // Category management
    addComponentCategory: (state, action: PayloadAction<ComponentCategory>) => {
      const category = action.payload;
      state.categories[category.id] = category;
    },
    
    updateComponentCategory: (state, action: PayloadAction<ComponentCategory>) => {
      const category = action.payload;
      state.categories[category.id] = category;
    },
    
    deleteComponentCategory: (state, action: PayloadAction<CategoryId>) => {
      const categoryId = action.payload;
      delete state.categories[categoryId];
      
      // Move components in deleted category to uncategorized
      Object.values(state.definitions).forEach(def => {
        if (def.categoryId === categoryId) {
          def.categoryId = null;
        }
      });
    },
    
    reorderCategories: (state, action: PayloadAction<{ categoryId: CategoryId; newSortIndex: number }[]>) => {
      action.payload.forEach(({ categoryId, newSortIndex }) => {
        if (state.categories[categoryId]) {
          state.categories[categoryId].sortIndex = newSortIndex;
        }
      });
    },
    
    // Instance tracking
    registerComponentInstance: (state, action: PayloadAction<{ componentId: ComponentId; instanceId: string }>) => {
      const { componentId, instanceId } = action.payload;
      if (!state.instanceIndex[componentId]) {
        state.instanceIndex[componentId] = [];
      }
      if (!state.instanceIndex[componentId].includes(instanceId)) {
        state.instanceIndex[componentId].push(instanceId);
      }
    },
    
    unregisterComponentInstance: (state, action: PayloadAction<{ componentId: ComponentId; instanceId: string }>) => {
      const { componentId, instanceId } = action.payload;
      if (state.instanceIndex[componentId]) {
        state.instanceIndex[componentId] = state.instanceIndex[componentId].filter(id => id !== instanceId);
      }
    },
    
    // Component editing tabs
    openComponentTab: (state, action: PayloadAction<ComponentId>) => {
      const componentId = action.payload;
      if (!state.openComponentTabs.includes(componentId)) {
        state.openComponentTabs.push(componentId);
      }
      state.activeComponentTabId = componentId;
      state.isComponentEditorOpen = true;
    },
    
    closeComponentTab: (state, action: PayloadAction<ComponentId>) => {
      const componentId = action.payload;
      state.openComponentTabs = state.openComponentTabs.filter(id => id !== componentId);
      
      // Switch to another tab or close editor
      if (state.activeComponentTabId === componentId) {
        state.activeComponentTabId = state.openComponentTabs[0] || null;
        state.isComponentEditorOpen = state.openComponentTabs.length > 0;
      }
    },
    
    setActiveComponentTab: (state, action: PayloadAction<ComponentId>) => {
      state.activeComponentTabId = action.payload;
    },
    
    // Editor state
    setComponentEditorOpen: (state, action: PayloadAction<boolean>) => {
      state.isComponentEditorOpen = action.payload;
      if (!action.payload) {
        state.openComponentTabs = [];
        state.activeComponentTabId = null;
      }
    },
    
    setEditingComponent: (state, action: PayloadAction<ComponentId | null>) => {
      state.editingComponentId = action.payload;
    },
    
    // Batch operations
    loadComponentDefinitions: (state, action: PayloadAction<{ definitions: Record<ComponentId, ComponentDef>; categories: Record<CategoryId, ComponentCategory> }>) => {
      const { definitions, categories } = action.payload;
      state.definitions = definitions;
      state.categories = categories;
      
      // Rebuild component map
      state.componentMap.clear();
      Object.values(definitions).forEach(def => {
        state.componentMap.set(def.id, def);
      });
    },
  }
});

export const {
  addComponentDefinition,
  updateComponentDefinition,
  deleteComponentDefinition,
  renameComponentDefinition,
  addComponentCategory,
  updateComponentCategory,
  deleteComponentCategory,
  reorderCategories,
  registerComponentInstance,
  unregisterComponentInstance,
  openComponentTab,
  closeComponentTab,
  setActiveComponentTab,
  setComponentEditorOpen,
  setEditingComponent,
  loadComponentDefinitions
} = componentDefinitionsSlice.actions;

export default componentDefinitionsSlice.reducer;