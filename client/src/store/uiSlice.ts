import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Tool } from '../types/canvas';

interface UIState {
  selectedTool: Tool;
  isExportModalOpen: boolean;
  isCodeModalOpen: boolean;
  isGridVisible: boolean;
  zoomLevel: number;
  canvasOffset: { x: number; y: number };
  isDragging: boolean;
  dragStart?: { x: number; y: number };
  isResizing: boolean;
  resizeHandle?: string;
  showAdvancedMode: boolean;
  draggedElementId?: string;
  isDraggingForReorder: boolean;
}

const initialState: UIState = {
  selectedTool: 'select',
  isExportModalOpen: false,
  isCodeModalOpen: false,
  isGridVisible: true,
  zoomLevel: 1,
  canvasOffset: { x: 0, y: 0 },
  isDragging: false,
  isResizing: false,
  showAdvancedMode: false,
  isDraggingForReorder: false,
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
    
    setGridVisible: (state, action: PayloadAction<boolean>) => {
      state.isGridVisible = action.payload;
    },
    
    setZoomLevel: (state, action: PayloadAction<number>) => {
      state.zoomLevel = Math.max(0.25, Math.min(4, action.payload));
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
  },
});

export const {
  setSelectedTool,
  setExportModalOpen,
  setCodeModalOpen,
  setGridVisible,
  setZoomLevel,
  setCanvasOffset,
  setDragging,
  setDragStart,
  setResizing,
  setResizeHandle,
  setAdvancedMode,
  resetUI,
  setDraggedElement,
  setDraggingForReorder,
} = uiSlice.actions;

export default uiSlice.reducer;
