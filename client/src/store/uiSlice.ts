import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Tool } from '../types/canvas';

interface UIState {
  selectedTool: Tool;
  isExportModalOpen: boolean;
  isCodeModalOpen: boolean;
  isCSSOptimizationModalOpen: boolean;
  isGridVisible: boolean;
  isComponentPanelVisible: boolean;
  isDOMTreePanelVisible: boolean;
  isComponentEditorOpen: boolean;
  editingComponentId: string | null;
  isButtonDesignerOpen: boolean;
  isClassEditorOpen: boolean;
  isSettingsMenuOpen: boolean;
  zoomLevel: number;
  canvasOffset: { x: number; y: number };
  isDragging: boolean;
  dragStart?: { x: number; y: number };
  isResizing: boolean;
  resizeHandle?: string;
  showAdvancedMode: boolean;
  draggedElementId?: string;
  isDraggingForReorder: boolean;
  hoveredElementId: string | null;
  hoveredZone: 'before' | 'after' | 'inside' | null;
  insertionIndicator: any;
  // Tree drag state
  isTreeDragActive: boolean;
  treeDraggedElementId: string | null;
  treeHoveredElementId: string | null;
  treeHoveredZone: 'before' | 'after' | 'inside' | null;
  autoExpandTimer: NodeJS.Timeout | null;
  // Settings
  settings: {
    enableHandToolDragging: boolean;
    enableClickToMove: boolean;
    enablePWAPrompt: boolean;
  };
}

const initialState: UIState = {
  selectedTool: 'select',
  isExportModalOpen: false,
  isCodeModalOpen: false,
  isCSSOptimizationModalOpen: false,
  isGridVisible: true,
  isComponentPanelVisible: true,
  isDOMTreePanelVisible: true,
  isComponentEditorOpen: false,
  editingComponentId: null,
  isButtonDesignerOpen: false,
  isClassEditorOpen: false,
  isSettingsMenuOpen: false,
  zoomLevel: 1,
  canvasOffset: { x: 0, y: 0 },
  isDragging: false,
  isResizing: false,
  showAdvancedMode: false,
  isDraggingForReorder: false,
  hoveredElementId: null,
  hoveredZone: null,
  insertionIndicator: null,
  // Tree drag state
  isTreeDragActive: false,
  treeDraggedElementId: null,
  treeHoveredElementId: null,
  treeHoveredZone: null,
  autoExpandTimer: null,
  settings: {
    enableHandToolDragging: false, // Disabled by default
    enableClickToMove: false, // Disabled by default
    enablePWAPrompt: true, // Enabled by default
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setSelectedTool: (state, action: PayloadAction<Tool>) => {
      state.selectedTool = action.payload;
    },
    
    setExportModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isExportModalOpen = action.payload;
    },
    
    setCodeModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isCodeModalOpen = action.payload;
    },
    setCSSOptimizationModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isCSSOptimizationModalOpen = action.payload;
    },
    
    setGridVisible: (state, action: PayloadAction<boolean>) => {
      state.isGridVisible = action.payload;
      // Note: Auto-save should be handled by middleware or effects, not in reducers
    },
    
    toggleComponentPanel: (state) => {
      state.isComponentPanelVisible = !state.isComponentPanelVisible;
      // Auto-save UI settings when panel visibility changes
      import('../utils/persistence').then(({ persistenceManager }) => {
        persistenceManager.saveCurrentProject();
      });
    },
    
    toggleDOMTreePanel: (state) => {
      state.isDOMTreePanelVisible = !state.isDOMTreePanelVisible;
      // Auto-save UI settings when panel visibility changes
      import('../utils/persistence').then(({ persistenceManager }) => {
        persistenceManager.saveCurrentProject();
      });
    },
    
    setComponentEditorOpen: (state, action: PayloadAction<boolean>) => {
      state.isComponentEditorOpen = action.payload;
    },
    
    setEditingComponent: (state, action: PayloadAction<string | null>) => {
      state.editingComponentId = action.payload;
    },

    setButtonDesignerOpen: (state, action: PayloadAction<boolean>) => {
      state.isButtonDesignerOpen = action.payload;
    },
    
    setClassEditorOpen: (state, action: PayloadAction<boolean>) => {
      state.isClassEditorOpen = action.payload;
    },
    
    setSettingsMenuOpen: (state, action: PayloadAction<boolean>) => {
      state.isSettingsMenuOpen = action.payload;
    },
    
    updateSettings: (state, action: PayloadAction<Partial<UIState['settings']>>) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    
    setZoomLevel: (state, action: PayloadAction<number>) => {
      state.zoomLevel = Math.max(0.25, Math.min(4, action.payload));
      // Note: Auto-save should be handled by middleware or effects, not in reducers
    },
    
    zoomIn: (state) => {
      state.zoomLevel = Math.max(0.25, Math.min(4, state.zoomLevel * 1.2));
    },
    
    zoomOut: (state) => {
      state.zoomLevel = Math.max(0.25, Math.min(4, state.zoomLevel / 1.2));
    },
    
    fitToScreen: (state) => {
      state.zoomLevel = 1;
      state.canvasOffset = { x: 0, y: 0 };
    },
    
    setCanvasOffset: (state, action: PayloadAction<{ x: number; y: number }>) => {
      state.canvasOffset = action.payload;
      // Auto-save UI settings when canvas offset changes (debounced via auto-save)
    },
    
    setDragging: (state, action: PayloadAction<boolean>) => {
      state.isDragging = action.payload;
    },
    
    setDragStart: (state, action: PayloadAction<{ x: number; y: number } | undefined>) => {
      state.dragStart = action.payload;
    },
    
    setResizing: (state, action: PayloadAction<boolean>) => {
      state.isResizing = action.payload;
    },
    
    setResizeHandle: (state, action: PayloadAction<string | undefined>) => {
      state.resizeHandle = action.payload;
    },
    
    setAdvancedMode: (state, action: PayloadAction<boolean>) => {
      state.showAdvancedMode = action.payload;
    },
    
    resetUI: (state) => {
      state.isDragging = false;
      state.isResizing = false;
      state.dragStart = undefined;
      state.resizeHandle = undefined;
      state.isDraggingForReorder = false;
      state.draggedElementId = undefined;
      // Reset tree drag state
      state.isTreeDragActive = false;
      state.treeDraggedElementId = null;
      state.treeHoveredElementId = null;
      state.treeHoveredZone = null;
      if (state.autoExpandTimer) {
        clearTimeout(state.autoExpandTimer);
        state.autoExpandTimer = null;
      }
    },

    setDraggedElement: (state, action: PayloadAction<string | undefined>) => {
      state.draggedElementId = action.payload;
    },

    setDraggingForReorder: (state, action: PayloadAction<boolean>) => {
      state.isDraggingForReorder = action.payload;
    },
    
    setHoveredElement: (state, action: PayloadAction<{ elementId: string | null; zone: 'before' | 'after' | 'inside' | null }>) => {
      state.hoveredElementId = action.payload.elementId;
      state.hoveredZone = action.payload.zone;
    },

    // Tree drag actions
    setTreeDragActive: (state, action: PayloadAction<boolean>) => {
      state.isTreeDragActive = action.payload;
      if (!action.payload) {
        // Clear tree drag state when drag ends
        state.treeDraggedElementId = null;
        state.treeHoveredElementId = null;
        state.treeHoveredZone = null;
        if (state.autoExpandTimer) {
          clearTimeout(state.autoExpandTimer);
          state.autoExpandTimer = null;
        }
      }
    },

    setTreeDraggedElement: (state, action: PayloadAction<string | null>) => {
      state.treeDraggedElementId = action.payload;
    },

    setTreeHoveredElement: (state, action: PayloadAction<{ elementId: string | null; zone: 'before' | 'after' | 'inside' | null }>) => {
      state.treeHoveredElementId = action.payload.elementId;
      state.treeHoveredZone = action.payload.zone;
    },

    setAutoExpandTimer: (state, action: PayloadAction<NodeJS.Timeout | null>) => {
      if (state.autoExpandTimer) {
        clearTimeout(state.autoExpandTimer);
      }
      state.autoExpandTimer = action.payload;
    },
    
    loadUISettings: (state, action: PayloadAction<Partial<UIState>>) => {
      // Load persisted UI settings while preserving non-persistent states
      const persistentSettings = action.payload;
      if (persistentSettings.isComponentPanelVisible !== undefined) {
        state.isComponentPanelVisible = persistentSettings.isComponentPanelVisible;
      }
      if (persistentSettings.isDOMTreePanelVisible !== undefined) {
        state.isDOMTreePanelVisible = persistentSettings.isDOMTreePanelVisible;
      }
      if (persistentSettings.zoomLevel !== undefined) {
        state.zoomLevel = persistentSettings.zoomLevel;
      }
      if (persistentSettings.isGridVisible !== undefined) {
        state.isGridVisible = persistentSettings.isGridVisible;
      }
      if (persistentSettings.canvasOffset !== undefined) {
        state.canvasOffset = persistentSettings.canvasOffset;
      }
    },
  },
});

export const {
  setSelectedTool,
  setExportModalOpen,
  setCodeModalOpen,
  setCSSOptimizationModalOpen,
  setGridVisible,
  toggleComponentPanel,
  toggleDOMTreePanel,
  setComponentEditorOpen,
  setEditingComponent,
  setButtonDesignerOpen,
  setClassEditorOpen,
  setSettingsMenuOpen,
  updateSettings,
  setZoomLevel,
  zoomIn,
  zoomOut,
  fitToScreen,
  setCanvasOffset,
  setDragging,
  setDragStart,
  setResizing,
  setResizeHandle,
  setAdvancedMode,
  resetUI,
  setDraggedElement,
  setDraggingForReorder,
  setHoveredElement,
  setTreeDragActive,
  setTreeDraggedElement,
  setTreeHoveredElement,
  setAutoExpandTimer,
  loadUISettings,
} = uiSlice.actions;

export default uiSlice.reducer;
