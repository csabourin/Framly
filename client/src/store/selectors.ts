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
  (currentTab) => currentTab?.viewSettings || defaultViewSettings
);

export const selectAllTabs = createSelector(
  [(state: RootState) => state.canvas.project.tabs],
  (tabs) => tabs
);

export const selectActiveTabId = createSelector(
  [(state: RootState) => state.canvas.project.activeTabId],
  (activeTabId) => activeTabId
);

export const selectTabOrder = createSelector(
  [(state: RootState) => state.canvas.project.tabOrder],
  (tabOrder) => tabOrder
);

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