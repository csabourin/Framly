import { RootState } from './index';
import { CanvasElement, DesignTab } from '../types/canvas';
import { createSelector } from '@reduxjs/toolkit';

// Tab selectors - the most critical one for tab switching performance
export const selectCurrentTab = createSelector(
  [
    (state: RootState) => state.canvas.project.tabs,
    (state: RootState) => state.canvas.project.activeTabId
  ],
  (tabs, activeTabId): DesignTab | undefined => tabs[activeTabId]
);

// Create a default root element once to avoid recreation
const defaultRootElement: CanvasElement = {
  id: 'root',
  type: 'container',
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
  flexDirection: 'column',
  justifyContent: 'flex-start',
  alignItems: 'stretch',
  children: [],
  classes: []
};

const defaultElements = { root: defaultRootElement };

export const selectCurrentElements = createSelector(
  [selectCurrentTab],
  (currentTab): Record<string, CanvasElement> => {
    if (currentTab?.elements) {
      return currentTab.elements;
    }
    return defaultElements;
  }
);

export const selectSelectedElement = createSelector(
  [selectCurrentTab],
  (currentTab): CanvasElement | undefined => {
    if (!currentTab) return undefined;
    
    const selectedId = currentTab.viewSettings.selectedElementId;
    return selectedId ? currentTab.elements[selectedId] : undefined;
  }
);

export const selectSelectedElementId = createSelector(
  [selectCurrentTab],
  (currentTab): string | undefined => currentTab?.viewSettings.selectedElementId
);

export const selectRootElement = createSelector(
  [selectCurrentTab],
  (currentTab): CanvasElement | undefined => currentTab?.elements.root
);

const defaultViewSettings = {
  zoom: 1,
  panX: 0,
  panY: 0,
  selectedElementId: 'root'
};

export const selectCurrentTabViewSettings = createSelector(
  [selectCurrentTab],
  (currentTab) => {
    // Transform data to ensure proper memoization
    const viewSettings = currentTab?.viewSettings;
    if (!viewSettings) return defaultViewSettings;
    
    // Return a properly structured object to avoid identity selector warning
    return {
      zoom: viewSettings.zoom,
      panX: viewSettings.panX,
      panY: viewSettings.panY,
      selectedElementId: viewSettings.selectedElementId
    };
  }
);

// Simple selectors that don't need memoization (no transformation)
export const selectAllTabs = (state: RootState) => state.canvas.project.tabs;
export const selectActiveTabId = (state: RootState) => state.canvas.project.activeTabId;
export const selectTabOrder = (state: RootState) => state.canvas.project.tabOrder;

// Helper to get element by ID in current tab
export const selectElementById = createSelector(
  [selectCurrentElements, (_state: RootState, elementId: string) => elementId],
  (elements, elementId): CanvasElement | undefined => elements[elementId]
);

// Helper to get children of an element in current tab
export const selectElementChildren = createSelector(
  [selectCurrentElements, (_state: RootState, elementId: string) => elementId],
  (elements, elementId): CanvasElement[] => {
    const element = elements[elementId];
    
    if (!element?.children) return [];
    
    return element.children
      .map(childId => elements[childId])
      .filter(Boolean);
  }
);

// Helper to check if element exists in current tab
export const selectElementExists = createSelector(
  [selectCurrentElements, (_state: RootState, elementId: string) => elementId],
  (elements, elementId): boolean => !!elements[elementId]
);

// UI state selectors to prevent inline object creation
export const selectUIState = createSelector(
  [(state: RootState) => state.ui],
  (ui) => ({
    selectedTool: ui.selectedTool,
    isDraggingForReorder: ui.isDraggingForReorder,
    draggedElementId: ui.draggedElementId,
    insertionIndicator: ui.insertionIndicator,
    isComponentPanelVisible: ui.isComponentPanelVisible,
    isDOMTreePanelVisible: ui.isDOMTreePanelVisible,
    isClassEditorOpen: ui.isClassEditorOpen,
    isComponentEditorOpen: ui.isComponentEditorOpen,
    editingComponentId: ui.editingComponentId,
    isButtonDesignerOpen: ui.isButtonDesignerOpen,
    isCodeModalOpen: ui.isCodeModalOpen,
    isCSSOptimizationModalOpen: ui.isCSSOptimizationModalOpen,
    hoveredElementId: ui.hoveredElementId || null,
    hoveredZone: ui.hoveredZone || null,
    settings: ui.settings || { enableHandToolDragging: false, enableClickToMove: false }
  })
);

// Hover state selector to prevent inline object creation
export const selectHoverState = createSelector(
  [(state: RootState) => state.ui],
  (ui) => ({
    hoveredElementId: ui.hoveredElementId || null,
    hoveredZone: ui.hoveredZone || null,
  })
);

// Canvas project selector - CRITICAL: prevents browser crashes
export const selectCanvasProject = createSelector(
  [(state: RootState) => state.canvas],
  (canvas) => canvas.project
);

// Canvas UI state selector - CRITICAL: prevents browser crashes  
export const selectCanvasUIState = createSelector(
  [(state: RootState) => state.ui],
  (ui) => ({
    selectedTool: ui.selectedTool,
    isDragging: ui.isDragging,
    dragStart: ui.dragStart,
    isResizing: ui.isResizing,
    resizeHandle: ui.resizeHandle,
    zoomLevel: ui.zoomLevel,
    isGridVisible: ui.isGridVisible,
    draggedElementId: ui.draggedElementId,
    isDraggingForReorder: ui.isDraggingForReorder,
    isDOMTreePanelVisible: ui.isDOMTreePanelVisible,
    isComponentPanelVisible: ui.isComponentPanelVisible,
    settings: ui.settings
  })
);

// Custom classes selector - CRITICAL: prevents browser crashes
export const selectCustomClasses = createSelector(
  [(state: RootState) => (state as any).classes?.customClasses],
  (customClasses) => customClasses || {}
);

// Components state selectors - CRITICAL: prevents browser crashes
export const selectComponentsState = createSelector(
  [(state: RootState) => state.components],
  (components) => components
);

// Export modal state - CRITICAL: prevents browser crashes
export const selectExportModalState = createSelector(
  [(state: RootState) => state.ui],
  (ui) => ({
    isExportModalOpen: ui.isExportModalOpen
  })
);

// Button designer state - CRITICAL: prevents browser crashes  
export const selectButtonDesignerState = createSelector(
  [(state: RootState) => state.button],
  (button) => ({
    designs: button.designs,
    currentDesignId: button.currentDesignId
  })
);