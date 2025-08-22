import { RootState } from './index';
import { CanvasElement, DesignTab } from '../types/canvas';
import { createSelector } from '@reduxjs/toolkit';

// Tab selectors
export const selectCurrentTab = (state: RootState): DesignTab | undefined => {
  return state.canvas.project.tabs[state.canvas.project.activeTabId];
};

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

export const selectSelectedElementId = (state: RootState): string | undefined => {
  const currentTab = selectCurrentTab(state);
  return currentTab?.viewSettings.selectedElementId;
};

export const selectRootElement = (state: RootState): CanvasElement | undefined => {
  const currentTab = selectCurrentTab(state);
  return currentTab?.elements.root;
};

const defaultViewSettings = {
  zoom: 1,
  panX: 0,
  panY: 0,
  selectedElementId: 'root'
};

export const selectCurrentTabViewSettings = createSelector(
  [selectCurrentTab],
  (currentTab) => currentTab?.viewSettings || defaultViewSettings
);

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
export const selectElementExists = (state: RootState, elementId: string): boolean => {
  const elements = selectCurrentElements(state);
  return !!elements[elementId];
};