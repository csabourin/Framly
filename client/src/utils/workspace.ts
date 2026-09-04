import type { RootState } from '../store';
import type { SavedHistory } from '../store/historySlice';
import type { Project } from '../types/canvas';
import type { exportUnitPreferences } from './unitPersistence';

export const WORKSPACE_KEY = 'workspace-v1';

export interface WorkspaceSnapshot {
  version: 1;
  project: Project;
  classes: Pick<RootState['classes'], 'customClasses' | 'categories'>;
  componentDefinitions: Pick<RootState['componentDefinitions'], 'definitions' | 'categories'>;
  componentCategories: RootState['components']['categories'];
  uiSettings: Partial<RootState['ui']>;
  unitPreferences: ReturnType<typeof exportUnitPreferences>;
  history: SavedHistory;
}

/** Reject unknown formats before any original data can be overwritten. */
export function validateWorkspace(value: unknown): asserts value is WorkspaceSnapshot {
  const data = value as WorkspaceSnapshot;
  if (data?.version !== 1 || !data.project?.tabs || !Array.isArray(data.project.tabOrder)
    || !data.project.tabs[data.project.activeTabId]
    || !data.project.tabOrder.every((id) => data.project.tabs[id]?.elements?.root)
    || !data.classes?.customClasses || !Array.isArray(data.classes.categories)
    || !data.componentDefinitions?.definitions || !data.componentDefinitions.categories
    || !Array.isArray(data.componentCategories) || !data.uiSettings || !data.unitPreferences
    || !Array.isArray(data.history?.entries) || !Number.isInteger(data.history.currentIndex)
    || data.history.currentIndex < -1 || data.history.currentIndex >= data.history.entries.length
    || !Number.isInteger(data.history.maxEntries) || data.history.maxEntries < 1) {
    throw new Error('The saved workspace format could not be read. The original has been preserved.');
  }
}
