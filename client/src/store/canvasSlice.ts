import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CanvasElement, Project, CSSProperties, DesignTab, TabViewSettings, Breakpoint } from '../types/canvas';
import { nanoid } from 'nanoid';
import { expandComponentTemplate } from '../utils/componentTemplateExpansion';

interface CanvasState {
  project: Project;
  components: Record<string, any>;
  history: Project[];
  historyIndex: number;
  clipboard?: CanvasElement;
}

const createDefaultRootElement = (): CanvasElement => ({
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
    gap: '16px',
  },
  isContainer: true,
  flexDirection: 'column',
  justifyContent: 'flex-start',
  alignItems: 'stretch',
  children: [],
  classes: [],
});

const createDefaultTab = (name: string = 'Untitled Tab'): DesignTab => {
  const tabId = nanoid();
  return {
    id: tabId,
    name,
    elements: {
      root: createDefaultRootElement(),
    },
    viewSettings: {
      zoom: 1,
      panX: 0,
      panY: 0,
      selectedElementId: 'root',
      isTextEditing: false,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
};

const defaultTab = createDefaultTab('Main');
const initialProject: Project = {
  id: 'default',
  name: 'Untitled Project',
  tabs: {
    [defaultTab.id]: defaultTab,
  },
  activeTabId: defaultTab.id,
  tabOrder: [defaultTab.id],
  breakpoints: {
    mobile: {
      name: 'mobile',
      width: 375,
      label: 'Mobile',
      maxWidth: 767,
      isDefault: true
    },
    tablet: {
      name: 'tablet',
      width: 768,
      label: 'Tablet',
      minWidth: 768,
      maxWidth: 1023
    },
    desktop: {
      name: 'desktop',
      width: 1024,
      label: 'Desktop',
      minWidth: 1024,
      maxWidth: 1439
    },
    large: {
      name: 'large',
      width: 1440,
      label: 'Large Desktop',
      minWidth: 1440
    }
  },
  currentBreakpoint: 'mobile',
};

const initialState: CanvasState = {
  project: initialProject,
  components: {},
  history: [initialProject],
  historyIndex: 0,
  clipboard: undefined,
};

// Helper functions to work with tabs
const getCurrentTab = (state: CanvasState): DesignTab | undefined => {
  return state.project.tabs[state.project.activeTabId];
};

const getCurrentElements = (state: CanvasState): Record<string, CanvasElement> => {
  const currentTab = getCurrentTab(state);
  return currentTab ? currentTab.elements : {};
};

const duplicateElementWithNewId = (element: CanvasElement): CanvasElement => {
  // Don't change the root element ID
  if (element.id === 'root') {
    return { ...element };
  }

  const newId = nanoid();
  // Create a deep copy to preserve all properties including image properties
  const newElement = {
    ...element,
    id: newId,
    // Preserve all image-specific properties
    imageBase64: element.imageBase64,
    imageUrl: element.imageUrl,
    imageAlt: element.imageAlt,
    imageTitle: element.imageTitle,
    objectFit: element.objectFit,
    objectPosition: element.objectPosition,
    // Preserve styles object
    styles: element.styles ? { ...element.styles } : {},
    // Preserve classes array
    classes: element.classes ? [...element.classes] : undefined
  };

  // If element has children, duplicate them too with new IDs
  if (element.children) {
    newElement.children = [];
  }

  return newElement;
};

const duplicateElementsRecursively = (elements: Record<string, CanvasElement>, elementId: string, newElementMap: Record<string, string>): CanvasElement => {
  const element = elements[elementId];
  const newElement = duplicateElementWithNewId(element);
  newElementMap[elementId] = newElement.id;

  if (element.children) {
    newElement.children = element.children.map(childId => {
      const duplicatedChild = duplicateElementsRecursively(elements, childId, newElementMap);
      return duplicatedChild.id;
    });
  }

  return newElement;
};

const canvasSlice = createSlice({
  name: 'canvas',
  initialState,
  reducers: {
    // Element actions (work on current active tab)
    selectElement: (state, action: PayloadAction<string>) => {
      const currentTab = getCurrentTab(state);
      if (currentTab) {
        currentTab.viewSettings.selectedElementId = action.payload;
        currentTab.updatedAt = Date.now();
      }
    },

    addElement: (state, action: PayloadAction<{
      element: CanvasElement;
      parentId?: string;
      insertPosition?: 'before' | 'after' | 'inside' | 'canvas-start' | 'canvas-end';
      referenceElementId?: string;
    }>) => {
      const currentTab = getCurrentTab(state);
      if (!currentTab) return;

      const { element, parentId = 'root', insertPosition = 'inside', referenceElementId } = action.payload;
      currentTab.elements[element.id] = element;
      element.parent = parentId;

      const parent = currentTab.elements[parentId];
      if (parent && parent.children) {
        if (!parent.children.includes(element.id)) {
          // ENHANCED: Handle canvas padding insertion (document start/end)
          if (insertPosition === 'canvas-start') {
            // Insert at the beginning of root children (index 0)
            parent.children.unshift(element.id);
          } else if (insertPosition === 'canvas-end') {
            // Append to the end of root children
            parent.children.push(element.id);
          } else if (insertPosition === 'inside' || !referenceElementId) {
            parent.children.push(element.id);
          } else {
            const referenceIndex = parent.children.indexOf(referenceElementId);
            if (referenceIndex !== -1) {
              const insertIndex = insertPosition === 'before' ? referenceIndex : referenceIndex + 1;
              parent.children.splice(insertIndex, 0, element.id);
            } else {
              parent.children.push(element.id);
            }
          }
        }
      }

      currentTab.viewSettings.selectedElementId = element.id;
      currentTab.updatedAt = Date.now();
      canvasSlice.caseReducers.saveToHistory(state);
    },

    updateElement: (state, action: PayloadAction<{ id: string; updates: Partial<CanvasElement> }>) => {
      const currentTab = getCurrentTab(state);
      if (!currentTab) return;

      const { id, updates } = action.payload;
      if (currentTab.elements[id]) {
        currentTab.elements[id] = { ...currentTab.elements[id], ...updates };
        currentTab.updatedAt = Date.now();
      }
    },

    updateElementStyles: (state, action: PayloadAction<{ id: string; styles: Partial<CSSProperties> }>) => {
      const currentTab = getCurrentTab(state);
      if (!currentTab) return;

      const { id, styles } = action.payload;
      if (currentTab.elements[id]) {
        currentTab.elements[id].styles = { ...currentTab.elements[id].styles, ...styles };
        currentTab.updatedAt = Date.now();
      }
    },

    deleteElement: (state, action: PayloadAction<string>) => {
      const currentTab = getCurrentTab(state);
      if (!currentTab) return;

      const elementId = action.payload;
      const element = currentTab.elements[elementId];

      if (!element) return;

      // Recursively delete all children first
      const deleteElementAndChildren = (el: CanvasElement) => {
        if (el.children && el.children.length > 0) {
          // Delete all children recursively
          el.children.forEach(childId => {
            const child = currentTab.elements[childId];
            if (child) {
              deleteElementAndChildren(child);
            }
          });
        }

        // Remove the element itself
        delete currentTab.elements[el.id];
      };

      // Delete the element and all its children
      deleteElementAndChildren(element);

      // Remove from parent's children array
      if (element.parent) {
        const parent = currentTab.elements[element.parent];
        if (parent && parent.children) {
          currentTab.elements[element.parent] = {
            ...parent,
            children: parent.children.filter((id: string) => id !== elementId)
          };
        }
      }

      // Also cleanup any other references (safety check)
      Object.keys(currentTab.elements).forEach(key => {
        const el = currentTab.elements[key];
        if (el.children && el.children.includes(elementId)) {
          currentTab.elements[key] = {
            ...el,
            children: el.children.filter((id: string) => id !== elementId)
          };
        }
      });

      // Update selected element if necessary
      if (currentTab.viewSettings.selectedElementId === elementId) {
        currentTab.viewSettings.selectedElementId = element.parent || 'root';
      }

      currentTab.updatedAt = Date.now();
      canvasSlice.caseReducers.saveToHistory(state);
    },

    duplicateElement: (state, action: PayloadAction<string>) => {
      const currentTab = getCurrentTab(state);
      if (!currentTab) return;

      const elementId = action.payload;
      const element = currentTab.elements[elementId];

      if (element) {
        // Recursively copy element and all its children (optimized shallow copy)
        const copyElementTree = (el: CanvasElement): any => {
          const copiedElement = { ...el };

          // If element has children, recursively copy them too
          if (el.children && el.children.length > 0) {
            (copiedElement as any).childrenData = el.children.map(childId => {
              const child = currentTab.elements[childId];
              return child ? copyElementTree(child) : null;
            }).filter(Boolean);

            // Clear the original children array to prevent duplication
            copiedElement.children = [];
          }

          return copiedElement;
        };

        // Create clipboard data for the element tree
        const clipboardData = copyElementTree(element);

        // Recursively generate new IDs and create the duplicated element tree
        const duplicateElementTree = (element: CanvasElement, parentId: string, timestamp?: number): string => {
          // Use a unique timestamp for each element to ensure no ID collisions
          const uniqueTimestamp = timestamp || Date.now();
          const uniqueId = `${element.type}-${uniqueTimestamp}-${nanoid(9)}`;

          const newElement: CanvasElement = {
            ...element,
            id: uniqueId,
            parent: parentId,
          };

          // Remove childrenData if it exists (it's temporary storage)
          delete (newElement as any).childrenData;

          // Initialize children array
          newElement.children = [];

          // Add the new element to the state
          currentTab.elements[newElement.id] = newElement;

          // Handle children recursively - only process childrenData
          if ((element as any).childrenData && (element as any).childrenData.length > 0) {
            (element as any).childrenData.forEach((childData: CanvasElement, index: number) => {
              // Use a unique timestamp for each child to prevent ID collisions
              const childTimestamp = uniqueTimestamp + index + 1;
              const childId = duplicateElementTree(childData, newElement.id, childTimestamp);
              if (childId && newElement.children) {
                newElement.children.push(childId);
              }
            });
          }

          return newElement.id;
        };

        // Create the duplicated element tree
        const baseTimestamp = Date.now();
        const newElementId = duplicateElementTree(clipboardData, element.parent || 'root', baseTimestamp);

        // Add the root element to its parent's children array
        const parent = currentTab.elements[element.parent || 'root'];
        if (parent) {
          if (!parent.children) {
            parent.children = [];
          }
          parent.children.push(newElementId);
        }

        // Select the new element
        currentTab.viewSettings.selectedElementId = newElementId;
        currentTab.updatedAt = Date.now();
        canvasSlice.caseReducers.saveToHistory(state);
      }
    },

    moveElement: (state, action: PayloadAction<{ id: string; x: number; y: number }>) => {
      const currentTab = getCurrentTab(state);
      if (!currentTab) return;

      const { id, x, y } = action.payload;
      if (currentTab.elements[id]) {
        currentTab.elements[id] = {
          ...currentTab.elements[id],
          x,
          y,
          isExplicitlyPositioned: true // Mark as explicitly positioned when dragged
        };
        currentTab.updatedAt = Date.now();
      }
    },

    reorderElement: (state, action: PayloadAction<{
      elementId: string;
      newParentId: string;
      insertPosition: 'before' | 'after' | 'inside' | 'canvas_start' | 'canvas_end';
      referenceElementId?: string;
    }>) => {
      const currentTab = getCurrentTab(state);
      if (!currentTab) return;

      const { elementId, newParentId, insertPosition, referenceElementId } = action.payload;
      const element = currentTab.elements[elementId];
      const newParent = currentTab.elements[newParentId];

      console.log('🔄 Reorder attempt:', { elementId, newParentId, insertPosition, referenceElementId });

      if (!element) {
        console.log('❌ Element not found:', elementId);
        return;
      }

      // Validate that the target can accept elements
      // Root is always valid, and containers/rectangles are valid
      if (newParentId !== 'root') {
        if (!newParent) {
          console.log('❌ Parent not found:', newParentId);
          return;
        }
        if (newParent.type !== 'container' &&
          newParent.type !== 'rectangle' &&
          !newParent.isContainer) {
          console.log('❌ Reorder blocked: Invalid parent type', { newParentId, parentType: newParent.type, isContainer: newParent.isContainer });
          return;
        }
      }

      // Prevent moving element to itself
      if (elementId === newParentId) {
        return;
      }

      // Get the old parent
      const oldParentId = element.parent || 'root';
      const oldParent = currentTab.elements[oldParentId];

      // Remove from old parent's children
      if (oldParentId === 'root' || !oldParent) {
        // Handle root element children array
        const root = currentTab.elements['root'];
        if (root && root.children) {
          root.children = root.children.filter(id => id !== elementId);
        }
      } else if (oldParent && oldParent.children) {
        const newOldParentChildren = oldParent.children.filter((id: string) => id !== elementId);
        currentTab.elements[oldParentId] = {
          ...oldParent,
          children: newOldParentChildren
        };
      }

      // Handle reordering - Ensure new parent has children array
      if (!newParent) {
        if (newParentId === 'root') {
          // Initialize root children if needed
          if (!currentTab.elements['root'].children) {
            currentTab.elements['root'].children = [];
          }
        } else {
          console.error('❌ Parent not found:', newParentId);
          return;
        }
      } else if (!newParent.children) {
        currentTab.elements[newParentId] = {
          ...newParent,
          children: []
        };
      }

      // Get fresh reference to the updated parent
      const targetParent = currentTab.elements[newParentId];
      const targetChildren = [...(targetParent.children || [])];

      // Add to new parent's children at the correct position
      if (insertPosition === 'canvas_start') {
        targetChildren.unshift(elementId);
        console.log(`✅ Inserted ${elementId} at START of ${newParentId}`);
      } else if (insertPosition === 'after' && !referenceElementId) {
        // Fallback for 'after' without ref is same as canvas_end
        targetChildren.push(elementId);
        console.log(`✅ Appended ${elementId} to ${newParentId}`);
      } else if (insertPosition === 'canvas_end' || insertPosition === 'inside' || !referenceElementId) {
        targetChildren.push(elementId);
        console.log(`✅ Appended ${elementId} to ${newParentId}`);
      } else {
        // Find reference element and insert relative to it
        const refIndex = targetChildren.indexOf(referenceElementId);
        if (refIndex !== -1) {
          const insertIndex = insertPosition === 'before' ? refIndex : refIndex + 1;
          targetChildren.splice(insertIndex, 0, elementId);
          console.log(`✅ Inserted ${elementId} at position ${insertIndex} (${insertPosition} ${referenceElementId})`);
        } else {
          // If reference not found, add at the end
          targetChildren.push(elementId);
          console.log(`⚠️ Reference element ${referenceElementId} not found, added at end`);
        }
      }

      // Update new parent with the modified children array
      currentTab.elements[newParentId] = {
        ...currentTab.elements[newParentId],
        children: targetChildren
      };

      // Update element's parent reference
      currentTab.elements[elementId] = {
        ...element,
        parent: newParentId
      };

      currentTab.updatedAt = Date.now();
      canvasSlice.caseReducers.saveToHistory(state);
    },

    resizeElement: (state, action: PayloadAction<{ id: string; width: number; height: number }>) => {
      const currentTab = getCurrentTab(state);
      if (!currentTab) return;

      const { id, width, height } = action.payload;
      if (currentTab.elements[id]) {
        currentTab.elements[id].width = width;
        currentTab.elements[id].height = height;
        currentTab.updatedAt = Date.now();
      }
    },

    switchBreakpoint: (state, action: PayloadAction<string>) => {
      const breakpointName = action.payload;
      state.project.currentBreakpoint = breakpointName;

      // Ensure breakpoint exists in project state with full properties
      const defaultBreakpoints = {
        mobile: { name: 'mobile', label: 'Mobile', width: 375 },
        tablet: { name: 'tablet', label: 'Tablet', width: 768 },
        desktop: { name: 'desktop', label: 'Desktop', width: 1024 },
        large: { name: 'large', label: 'Large', width: 1440 }
      };

      if (!state.project.breakpoints[breakpointName]) {
        state.project.breakpoints[breakpointName] = defaultBreakpoints[breakpointName as keyof typeof defaultBreakpoints] || { name: 'desktop', label: 'Desktop', width: 1024 };
      }

      const breakpoint = state.project.breakpoints[breakpointName];
      const currentTab = getCurrentTab(state);
      if (breakpoint && currentTab?.elements.root) {
        currentTab.elements.root.width = breakpoint.width;
        // Force immediate update by updating timestamp
        currentTab.updatedAt = Date.now();
      }
      // Save to history for viewport changes
      canvasSlice.caseReducers.saveToHistory(state);
    },

    updateProjectName: (state, action: PayloadAction<string>) => {
      state.project.name = action.payload;
    },

    saveToHistory: (state) => {
      // Skip expensive history save during normal operations
      // History will be saved by the persistence manager on a debounced basis
      // This dramatically improves performance for frequent actions
      return;
    },

    undo: (state) => {
      if (state.historyIndex > 0) {
        state.historyIndex -= 1;
        // Use shallow copy for performance - history is handled by persistence manager
        state.project = { ...state.history[state.historyIndex] };
      }
    },

    redo: (state) => {
      if (state.historyIndex < state.history.length - 1) {
        state.historyIndex += 1;
        // Use shallow copy for performance - history is handled by persistence manager
        state.project = { ...state.history[state.historyIndex] };
      }
    },

    loadProject: (state, action: PayloadAction<Project>) => {
      state.project = action.payload;
      state.history = [action.payload];
      state.historyIndex = 0;
    },

    addCSSClass: (state, action: PayloadAction<{ elementId: string; className: string }>) => {
      const currentTab = getCurrentTab(state);
      if (!currentTab) return;

      const { elementId, className } = action.payload;
      const element = currentTab.elements[elementId];
      if (element) {
        if (!element.classes) element.classes = [];
        if (!element.classes.includes(className)) {
          element.classes.push(className);
          currentTab.updatedAt = Date.now();
        }
      }
    },

    removeCSSClass: (state, action: PayloadAction<{ elementId: string; className: string }>) => {
      const currentTab = getCurrentTab(state);
      if (!currentTab) return;

      const { elementId, className } = action.payload;
      const element = currentTab.elements[elementId];
      if (element && element.classes) {
        element.classes = element.classes.filter((c: string) => c !== className);
        currentTab.updatedAt = Date.now();
      }
    },

    reorderCSSClass: (state, action: PayloadAction<{ elementId: string; fromIndex: number; toIndex: number }>) => {
      const currentTab = getCurrentTab(state);
      if (!currentTab) return;

      const { elementId, fromIndex, toIndex } = action.payload;
      const element = currentTab.elements[elementId];
      if (element && element.classes) {
        const classes = [...element.classes];
        const [moved] = classes.splice(fromIndex, 1);
        classes.splice(toIndex, 0, moved);
        element.classes = classes;
        currentTab.updatedAt = Date.now();
      }
    },

    // Tab management actions
    createTab: (state, action: PayloadAction<{ name?: string; color?: string; isComponentTab?: boolean; componentId?: string }>) => {
      const { name = 'New Tab', color, isComponentTab, componentId } = action.payload;
      const newTab = createDefaultTab(name);
      if (color) newTab.color = color;
      if (isComponentTab && componentId) {
        newTab.isComponentTab = true;
        newTab.componentId = componentId;

        // CRITICAL FIX: Load component template into the tab
        // Get component definition from componentDefinitions slice
        const componentDef = (state as any).componentDefinitions?.definitions?.[componentId];
        if (componentDef) {
          // Replace root element with component template
          newTab.elements = {
            root: {
              ...componentDef.template,
              id: 'root',
              x: 20,
              y: 20,
              parent: undefined // Root has no parent
            }
          };
          newTab.viewSettings.selectedElementId = 'root';
        }
      }

      state.project.tabs[newTab.id] = newTab;
      state.project.tabOrder.push(newTab.id);
      state.project.activeTabId = newTab.id;

      canvasSlice.caseReducers.saveToHistory(state);
    },

    duplicateTab: (state, action: PayloadAction<string>) => {
      const sourceTabId = action.payload;
      const sourceTab = state.project.tabs[sourceTabId];
      if (!sourceTab) return;

      const newTab = createDefaultTab(`${sourceTab.name} Copy`);
      newTab.color = sourceTab.color;

      // Duplicate all elements with new IDs
      const elementMap: Record<string, string> = {};
      const newElements: Record<string, CanvasElement> = {};

      // First pass: create all elements with new IDs
      Object.values(sourceTab.elements).forEach(element => {
        const newElement = duplicateElementWithNewId(element);
        // For root element, keep the same mapping
        if (element.id === 'root') {
          elementMap[element.id] = 'root';
        } else {
          elementMap[element.id] = newElement.id;
        }
        newElements[newElement.id] = newElement;
      });

      // Second pass: update parent/children references
      Object.values(newElements).forEach(element => {
        if (element.parent && elementMap[element.parent]) {
          element.parent = elementMap[element.parent];
        }
        if (element.children) {
          element.children = element.children.map((childId: string) => elementMap[childId] || childId);
        }
      });

      newTab.elements = newElements;
      // For root element, always use 'root' as ID since it doesn't get remapped
      const sourceSelectedId = sourceTab.viewSettings.selectedElementId;
      newTab.viewSettings.selectedElementId = sourceSelectedId === 'root' ? 'root' : (elementMap[sourceSelectedId] || 'root');

      state.project.tabs[newTab.id] = newTab;
      state.project.tabOrder.push(newTab.id);
      state.project.activeTabId = newTab.id;

      canvasSlice.caseReducers.saveToHistory(state);
    },

    deleteTab: (state, action: PayloadAction<string>) => {
      const tabId = action.payload;
      if (Object.keys(state.project.tabs).length <= 1) return; // Don't delete last tab

      delete state.project.tabs[tabId];
      state.project.tabOrder = state.project.tabOrder.filter((id: string) => id !== tabId);

      // Switch to another tab if we're deleting the active one
      if (state.project.activeTabId === tabId) {
        state.project.activeTabId = state.project.tabOrder[0] || Object.keys(state.project.tabs)[0];
      }

      canvasSlice.caseReducers.saveToHistory(state);
    },

    switchTab: (state, action: PayloadAction<string>) => {
      const tabId = action.payload;
      if (state.project.tabs[tabId]) {
        state.project.activeTabId = tabId;
      }
    },

    renameTab: (state, action: PayloadAction<{ tabId: string; name: string }>) => {
      const { tabId, name } = action.payload;
      const tab = state.project.tabs[tabId];
      if (tab) {
        tab.name = name;
        tab.updatedAt = Date.now();
      }
    },

    setTabColor: (state, action: PayloadAction<{ tabId: string; color?: string }>) => {
      const { tabId, color } = action.payload;
      const tab = state.project.tabs[tabId];
      if (tab) {
        tab.color = color;
        tab.updatedAt = Date.now();
      }
    },

    reorderTabs: (state, action: PayloadAction<{ fromIndex: number; toIndex: number }>) => {
      const { fromIndex, toIndex } = action.payload;
      const tabOrder = [...state.project.tabOrder];
      const [moved] = tabOrder.splice(fromIndex, 1);
      tabOrder.splice(toIndex, 0, moved);
      state.project.tabOrder = tabOrder;
    },

    updateTabViewSettings: (state, action: PayloadAction<{ tabId: string; settings: Partial<TabViewSettings> }>) => {
      const { tabId, settings } = action.payload;
      const tab = state.project.tabs[tabId];
      if (tab) {
        tab.viewSettings = { ...tab.viewSettings, ...settings };
        tab.updatedAt = Date.now();
      }
    },

    updateComponent: (state, action: PayloadAction<{ id: string; updates: any }>) => {
      const { id, updates } = action.payload;
      if (state.components[id]) {
        state.components[id] = { ...state.components[id], ...updates };
      }
    },

    // Copy/Cut/Paste actions
    copyElement: (state, action: PayloadAction<string>) => {
      const currentTab = getCurrentTab(state);
      if (!currentTab) return;

      const elementId = action.payload;
      const element = currentTab.elements[elementId];

      if (element) {
        // Recursively copy element and all its children (optimized shallow copy)
        const copyElementTree = (el: CanvasElement): any => {
          const copiedElement = { ...el };

          // If element has children, recursively copy them too
          if (el.children && el.children.length > 0) {
            (copiedElement as any).childrenData = el.children.map(childId => {
              const child = currentTab.elements[childId];
              return child ? copyElementTree(child) : null;
            }).filter(Boolean);

            // Clear the original children array to prevent duplication
            copiedElement.children = [];
          }

          return copiedElement;
        };

        state.clipboard = copyElementTree(element);
      }
    },

    cutElement: (state, action: PayloadAction<string>) => {
      const currentTab = getCurrentTab(state);
      if (!currentTab) return;

      const elementId = action.payload;
      const element = currentTab.elements[elementId];

      if (element) {
        // Recursively copy element and all its children before deleting (optimized)
        const copyElementTree = (el: CanvasElement): any => {
          const copiedElement = { ...el };

          // If element has children, recursively copy them too
          if (el.children && el.children.length > 0) {
            (copiedElement as any).childrenData = el.children.map(childId => {
              const child = currentTab.elements[childId];
              return child ? copyElementTree(child) : null;
            }).filter(Boolean);

            // Clear the original children array to prevent duplication
            copiedElement.children = [];
          }

          return copiedElement;
        };

        state.clipboard = copyElementTree(element);

        // Delete the element using the existing deleteElement logic (which handles children)
        canvasSlice.caseReducers.deleteElement(state, {
          payload: elementId,
          type: 'canvas/deleteElement'
        });
      }
    },

    pasteElement: (state) => {
      const currentTab = getCurrentTab(state);
      if (!currentTab || !state.clipboard) return;

      // Recursively generate new IDs and paste the entire element tree
      const pasteElementTree = (element: CanvasElement, parentId: string, timestamp?: number): string => {
        // Use a unique timestamp for each element to ensure no ID collisions
        const uniqueTimestamp = timestamp || Date.now();
        const uniqueId = `${element.type}-${uniqueTimestamp}-${nanoid(9)}`;

        const newElement: CanvasElement = {
          ...element,
          id: uniqueId,
          parent: parentId,
        };

        // Remove childrenData if it exists (it's temporary storage)
        delete (newElement as any).childrenData;

        // Initialize children array
        newElement.children = [];

        // Add the new element to the state
        currentTab.elements[newElement.id] = newElement;

        // Handle children recursively - only process childrenData
        if ((element as any).childrenData && (element as any).childrenData.length > 0) {
          (element as any).childrenData.forEach((childData: CanvasElement, index: number) => {
            // Use a unique timestamp for each child to prevent ID collisions
            const childTimestamp = uniqueTimestamp + index + 1;
            const childId = pasteElementTree(childData, newElement.id, childTimestamp);
            if (childId && newElement.children) {
              newElement.children.push(childId);
            }
          });
        }

        return newElement.id;
      };

      // Get the parent for the new element
      const selectedElementId = currentTab.viewSettings.selectedElementId;
      const selectedElement = currentTab.elements[selectedElementId];

      // Determine where to paste
      let parentId = 'root';
      if (selectedElement) {
        // If selected element is a container, paste inside it
        if (selectedElement.type === 'container' || selectedElement.type === 'rectangle') {
          parentId = selectedElement.id;
        } else {
          // Otherwise, paste as a sibling
          parentId = selectedElement.parent || 'root';
        }
      }

      // Paste the element tree and select the root of the pasted tree  
      const baseTimestamp = Date.now();
      const newElementId = pasteElementTree(state.clipboard, parentId, baseTimestamp);

      // Add the root element to its parent's children array
      const parent = currentTab.elements[parentId];
      if (parent) {
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(newElementId);
      }

      // No cleanup needed - the tree structure is already clean from the recursive paste logic

      currentTab.viewSettings.selectedElementId = newElementId;
      currentTab.updatedAt = Date.now();
      canvasSlice.caseReducers.saveToHistory(state);
    },

    // Force canvas refresh to re-evaluate all elements (useful for color mode changes)
    forceCanvasRefresh: (state) => {
      const currentTab = getCurrentTab(state);
      if (!currentTab) return;

      // Trigger a re-render by updating the timestamp
      // This ensures all canvas elements re-evaluate their styles and color mode properties
      currentTab.updatedAt = Date.now();
    },

    // Text editing state management
    setTextEditing: (state, action: PayloadAction<boolean>) => {
      const currentTab = getCurrentTab(state);
      if (!currentTab) return;

      currentTab.viewSettings.isTextEditing = action.payload;
    },

    // Group/Ungroup actions for multi-select
    groupElements: (state, action: PayloadAction<string[]>) => {
      const currentTab = getCurrentTab(state);
      if (!currentTab || action.payload.length < 2) return;

      const elementIds = action.payload;
      const elements = elementIds.map(id => currentTab.elements[id]).filter(Boolean);
      if (elements.length < 2) return;

      // Find common parent
      const commonParent = elements[0].parent || 'root';
      if (!elements.every(el => (el.parent || 'root') === commonParent)) {
        console.log('Cannot group elements with different parents');
        return;
      }

      // Calculate bounding box
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      elements.forEach(el => {
        const x = el.x || 0;
        const y = el.y || 0;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + el.width);
        maxY = Math.max(maxY, y + el.height);
      });

      // Create group container
      const groupId = nanoid();
      const groupElement: CanvasElement = {
        id: groupId,
        type: 'container',
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        styles: {
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        },
        isContainer: true,
        children: elementIds,
        parent: commonParent,
        classes: []
      };

      // Update children to be relative to group
      elements.forEach(el => {
        el.parent = groupId;
        if (el.x !== undefined) el.x -= minX;
        if (el.y !== undefined) el.y -= minY;
      });

      // Add group to parent's children
      const parent = currentTab.elements[commonParent];
      if (parent && parent.children) {
        // Remove individual elements from parent
        parent.children = parent.children.filter(id => !elementIds.includes(id));
        // Add group
        parent.children.push(groupId);
      }

      // Add group to elements
      currentTab.elements[groupId] = groupElement;

      // Select the new group
      currentTab.viewSettings.selectedElementId = groupId;

      canvasSlice.caseReducers.saveToHistory(state);
    },

    ungroupElements: (state, action: PayloadAction<string>) => {
      const currentTab = getCurrentTab(state);
      if (!currentTab) return;

      const groupId = action.payload;
      const group = currentTab.elements[groupId];
      if (!group || !group.children || group.children.length === 0) return;

      const groupParent = group.parent || 'root';
      const groupX = group.x || 0;
      const groupY = group.y || 0;

      // Move children to group's parent
      group.children.forEach(childId => {
        const child = currentTab.elements[childId];
        if (child) {
          child.parent = groupParent;
          // Convert relative position to absolute
          if (child.x !== undefined) child.x += groupX;
          if (child.y !== undefined) child.y += groupY;
        }
      });

      // Add children to parent
      const parent = currentTab.elements[groupParent];
      if (parent && parent.children) {
        const groupIndex = parent.children.indexOf(groupId);
        if (groupIndex >= 0) {
          parent.children.splice(groupIndex, 1, ...group.children);
        }
      }

      // Delete the group
      delete currentTab.elements[groupId];

      // Select first child
      if (group.children.length > 0) {
        currentTab.viewSettings.selectedElementId = group.children[0];
      }

      canvasSlice.caseReducers.saveToHistory(state);
    },
  },
});

export const {
  selectElement,
  addElement,
  updateElement,
  updateElementStyles,
  deleteElement,
  duplicateElement,
  moveElement,
  resizeElement,
  reorderElement,
  switchBreakpoint,
  updateProjectName,
  saveToHistory,
  undo,
  redo,
  loadProject,
  addCSSClass,
  removeCSSClass,
  reorderCSSClass,
  updateComponent,
  // Copy/Cut/Paste actions
  copyElement,
  cutElement,
  pasteElement,
  // Tab actions
  createTab,
  duplicateTab,
  deleteTab,
  switchTab,
  renameTab,
  setTabColor,
  reorderTabs,
  updateTabViewSettings,
  forceCanvasRefresh,
  // Text editing actions
  setTextEditing,
  // Group/Ungroup actions
  groupElements,
  ungroupElements,
} = canvasSlice.actions;

export default canvasSlice.reducer;
