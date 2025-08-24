import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CanvasElement, Project, CSSProperties, DesignTab, TabViewSettings } from '../types/canvas';
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
    mobile: { width: 375 },
    desktop: { width: 768 },
    large: { width: 1024 },
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
      insertPosition?: 'before' | 'after' | 'inside';
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
          if (insertPosition === 'inside' || !referenceElementId) {
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
        const newElement: CanvasElement = {
          ...element,
          id: `${element.type}-${Date.now()}`,
          // Only add coordinates if original element was positioned and at root level
          ...(element.parent === 'root' && element.x !== undefined && element.y !== undefined 
              ? { x: element.x + 20, y: element.y + 20 } 
              : {}),
        };
        
        canvasSlice.caseReducers.addElement(state, { 
          payload: { element: newElement, parentId: element.parent },
          type: 'canvas/addElement'
        });
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
      insertPosition: 'before' | 'after' | 'inside';
      referenceElementId?: string;
    }>) => {
      const currentTab = getCurrentTab(state);
      if (!currentTab) return;
      
      const { elementId, newParentId, insertPosition, referenceElementId } = action.payload;
      const element = currentTab.elements[elementId];
      const newParent = currentTab.elements[newParentId];
      
      if (!element || !newParent) {
        console.warn('reorderElement: Element or parent not found', { elementId, newParentId });
        return;
      }

      // Validate that the target can accept elements
      if (newParent.type !== 'container' && newParent.type !== 'rectangle' && newParentId !== 'root') {
        console.warn('reorderElement: Invalid parent type', newParent.type);
        return;
      }

      // Prevent moving element to itself
      if (elementId === newParentId) {
        console.warn('reorderElement: Cannot move element to itself');
        return;
      }

      // Get the old parent
      const oldParentId = element.parent || 'root';
      const oldParent = currentTab.elements[oldParentId];
      
      // Remove from old parent's children
      if (oldParent && oldParent.children) {
        const newOldParentChildren = oldParent.children.filter((id: string) => id !== elementId);
        currentTab.elements[oldParentId] = {
          ...oldParent,
          children: newOldParentChildren
        };
      }

      // Initialize new parent's children if needed
      if (!newParent.children) {
        currentTab.elements[newParentId] = {
          ...newParent,
          children: []
        };
      }

      // Get fresh reference to the updated parent
      const targetParent = currentTab.elements[newParentId];
      const targetChildren = [...(targetParent.children || [])];

      // Add to new parent's children at the correct position
      if (insertPosition === 'inside' || !referenceElementId) {
        // Add at the end
        targetChildren.push(elementId);
      } else {
        // Find reference element and insert relative to it
        const refIndex = targetChildren.indexOf(referenceElementId);
        if (refIndex !== -1) {
          const insertIndex = insertPosition === 'before' ? refIndex : refIndex + 1;
          targetChildren.splice(insertIndex, 0, elementId);
        } else {
          // If reference not found, add at the end
          targetChildren.push(elementId);
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
      
      console.log('reorderElement: Success', { 
        elementId, 
        oldParentId, 
        newParentId, 
        insertPosition,
        newChildrenCount: targetChildren.length 
      });
      
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
      state.project.currentBreakpoint = action.payload;
      const breakpoint = state.project.breakpoints[action.payload];
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
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(state.project)));
      state.history = newHistory.slice(-50); // Keep last 50 states
      state.historyIndex = state.history.length - 1;
    },
    
    undo: (state) => {
      if (state.historyIndex > 0) {
        state.historyIndex -= 1;
        state.project = JSON.parse(JSON.stringify(state.history[state.historyIndex]));
      }
    },
    
    redo: (state) => {
      if (state.historyIndex < state.history.length - 1) {
        state.historyIndex += 1;
        state.project = JSON.parse(JSON.stringify(state.history[state.historyIndex]));
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
          console.log('Component tab loaded with template:', componentDef.name);
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
        // Recursively copy element and all its children
        const copyElementTree = (el: CanvasElement): CanvasElement => {
          const copiedElement = JSON.parse(JSON.stringify(el));
          
          // If element has children, recursively copy them too
          if (el.children && el.children.length > 0) {
            copiedElement.childrenData = el.children.map(childId => {
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
        // Recursively copy element and all its children before deleting
        const copyElementTree = (el: CanvasElement): CanvasElement => {
          const copiedElement = JSON.parse(JSON.stringify(el));
          
          // If element has children, recursively copy them too
          if (el.children && el.children.length > 0) {
            copiedElement.childrenData = el.children.map(childId => {
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
          // Offset position slightly so it's visible as a new element
          ...(element.x !== undefined && element.y !== undefined 
            ? { x: element.x + 20, y: element.y + 20 } 
            : {}),
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
      
      // Clean up any duplicate references - ensure no element appears in multiple parents
      const processedElements = new Set<string>();
      const cleanUpDuplicates = (elementId: string) => {
        if (processedElements.has(elementId)) {
          // Element already processed, remove from other parents
          Object.values(currentTab.elements).forEach(el => {
            if (el.children && el.children.includes(elementId) && el.id !== currentTab.elements[elementId]?.parent) {
              el.children = el.children.filter(id => id !== elementId);
            }
          });
          return;
        }
        
        processedElements.add(elementId);
        const element = currentTab.elements[elementId];
        if (element && element.children) {
          element.children.forEach(childId => cleanUpDuplicates(childId));
        }
      };
      
      cleanUpDuplicates(newElementId);
      
      currentTab.viewSettings.selectedElementId = newElementId;
      currentTab.updatedAt = Date.now();
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
} = canvasSlice.actions;

export default canvasSlice.reducer;
