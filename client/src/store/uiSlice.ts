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
  isClassEditorOpen: boolean;
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
  isClassEditorOpen: false,
  zoomLevel: 1,
  canvasOffset: { x: 0, y: 0 },
  isDragging: false,
  isResizing: false,
  showAdvancedMode: false,
  isDraggingForReorder: false,
  hoveredElementId: null,
  hoveredZone: null,
  insertionIndicator: null,
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
    },
    
    toggleComponentPanel: (state) => {
      state.isComponentPanelVisible = !state.isComponentPanelVisible;
    },
    
    toggleDOMTreePanel: (state) => {
      state.isDOMTreePanelVisible = !state.isDOMTreePanelVisible;
    },
    
    setComponentEditorOpen: (state, action: PayloadAction<boolean>) => {
      state.isComponentEditorOpen = action.payload;
    },
    
    setEditingComponent: (state, action: PayloadAction<string | null>) => {
      state.editingComponentId = action.payload;
    },
    
    setClassEditorOpen: (state, action: PayloadAction<boolean>) => {
      state.isClassEditorOpen = action.payload;
    },
    
    setZoomLevel: (state, action: PayloadAction<number>) => {
      state.zoomLevel = Math.max(0.25, Math.min(4, action.payload));
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
  setClassEditorOpen,
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
} = uiSlice.actions;

export default uiSlice.reducer;
