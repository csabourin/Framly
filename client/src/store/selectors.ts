import { RootState } from './index';
import { CanvasElement, DesignTab } from '../types/canvas';

// Tab selectors
export const selectCurrentTab = (state: RootState): DesignTab | undefined => {
  return state.canvas.project.tabs[state.canvas.project.activeTabId];
};

export const selectCurrentElements = (state: RootState): Record<string, CanvasElement> => {
  const currentTab = selectCurrentTab(state);
  if (currentTab && currentTab.elements) {
    return currentTab.elements;
  }
  
  // Return default root element structure when no data is available
  return {
    root: {
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
    }
  };
};

export const selectSelectedElement = (state: RootState): CanvasElement | undefined => {
  const currentTab = selectCurrentTab(state);
  if (!currentTab) return undefined;
  
  const selectedId = currentTab.viewSettings.selectedElementId;
  return selectedId ? currentTab.elements[selectedId] : undefined;
};

export const selectSelectedElementId = (state: RootState): string | undefined => {
  const currentTab = selectCurrentTab(state);
  return currentTab?.viewSettings.selectedElementId;
};

export const selectRootElement = (state: RootState): CanvasElement | undefined => {
  const currentTab = selectCurrentTab(state);
  return currentTab?.elements.root;
};

export const selectCurrentTabViewSettings = (state: RootState) => {
  const currentTab = selectCurrentTab(state);
  return currentTab?.viewSettings || {
    zoom: 1,
    panX: 0,
    panY: 0,
    selectedElementId: 'root'
  };
};

export const selectAllTabs = (state: RootState) => {
  return state.canvas.project.tabs;
};

export const selectActiveTabId = (state: RootState) => {
  return state.canvas.project.activeTabId;
};

export const selectTabOrder = (state: RootState) => {
  return state.canvas.project.tabOrder;
};

// Helper to get element by ID in current tab
export const selectElementById = (state: RootState, elementId: string): CanvasElement | undefined => {
  const elements = selectCurrentElements(state);
  return elements[elementId];
};

// Helper to get children of an element in current tab
export const selectElementChildren = (state: RootState, elementId: string): CanvasElement[] => {
  const elements = selectCurrentElements(state);
  const element = elements[elementId];
  
  if (!element?.children) return [];
  
  return element.children
    .map(childId => elements[childId])
    .filter(Boolean);
};

// Helper to check if element exists in current tab
export const selectElementExists = (state: RootState, elementId: string): boolean => {
  const elements = selectCurrentElements(state);
  return !!elements[elementId];
};