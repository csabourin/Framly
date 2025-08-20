import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CanvasElement, Project, CSSProperties } from '../types/canvas';

interface CanvasState {
  project: Project;
  history: Project[];
  historyIndex: number;
  clipboard?: CanvasElement;
}

const initialProject: Project = {
  id: 'default',
  name: 'Untitled Project',
  elements: {
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
        gap: '16px',
      },
      isContainer: true,
      flexDirection: 'column',
      justifyContent: 'flex-start',
      alignItems: 'stretch',
      children: [],
      classes: [],
    },
  },
  breakpoints: {
    mobile: { width: 375 },
    desktop: { width: 768 },
    large: { width: 1024 },
  },
  selectedElementId: 'root',
  currentBreakpoint: 'mobile',
};

const initialState: CanvasState = {
  project: initialProject,
  history: [initialProject],
  historyIndex: 0,
};

const canvasSlice = createSlice({
  name: 'canvas',
  initialState,
  reducers: {
    selectElement: (state, action: PayloadAction<string>) => {
      state.project.selectedElementId = action.payload;
    },
    
    addElement: (state, action: PayloadAction<{ 
      element: CanvasElement; 
      parentId?: string; 
      insertPosition?: 'before' | 'after' | 'inside';
      referenceElementId?: string;
    }>) => {
      const { element, parentId = 'root', insertPosition = 'inside', referenceElementId } = action.payload;
      state.project.elements[element.id] = element;
      element.parent = parentId;
      
      const parent = state.project.elements[parentId];
      if (parent && parent.children) {
        if (insertPosition === 'inside' || !referenceElementId) {
          // Add to end of children
          parent.children.push(element.id);
        } else {
          // Find reference element index and insert before or after
          const referenceIndex = parent.children.indexOf(referenceElementId);
          if (referenceIndex !== -1) {
            const insertIndex = insertPosition === 'before' ? referenceIndex : referenceIndex + 1;
            parent.children.splice(insertIndex, 0, element.id);
          } else {
            parent.children.push(element.id);
          }
        }
      }
      
      state.project.selectedElementId = element.id;
      canvasSlice.caseReducers.saveToHistory(state);
    },
    
    updateElement: (state, action: PayloadAction<{ id: string; updates: Partial<CanvasElement> }>) => {
      const { id, updates } = action.payload;
      if (state.project.elements[id]) {
        state.project.elements[id] = { ...state.project.elements[id], ...updates };
      }
    },
    
    updateElementStyles: (state, action: PayloadAction<{ id: string; styles: Partial<CSSProperties> }>) => {
      const { id, styles } = action.payload;
      if (state.project.elements[id]) {
        state.project.elements[id].styles = { ...state.project.elements[id].styles, ...styles };
      }
    },
    
    deleteElement: (state, action: PayloadAction<string>) => {
      const elementId = action.payload;
      const element = state.project.elements[elementId];
      
      if (element && element.parent) {
        const parent = state.project.elements[element.parent];
        if (parent && parent.children) {
          parent.children = parent.children.filter(id => id !== elementId);
        }
      }
      
      delete state.project.elements[elementId];
      
      if (state.project.selectedElementId === elementId) {
        state.project.selectedElementId = 'root';
      }
      
      canvasSlice.caseReducers.saveToHistory(state);
    },
    
    duplicateElement: (state, action: PayloadAction<string>) => {
      const elementId = action.payload;
      const element = state.project.elements[elementId];
      
      if (element) {
        const newElement: CanvasElement = {
          ...element,
          id: `${element.type}-${Date.now()}`,
          x: element.x + 20,
          y: element.y + 20,
        };
        
        canvasSlice.caseReducers.addElement(state, { 
          payload: { element: newElement, parentId: element.parent },
          type: 'canvas/addElement'
        });
      }
    },
    
    moveElement: (state, action: PayloadAction<{ id: string; x: number; y: number }>) => {
      const { id, x, y } = action.payload;
      if (state.project.elements[id]) {
        state.project.elements[id].x = x;
        state.project.elements[id].y = y;
      }
    },

    reorderElement: (state, action: PayloadAction<{
      elementId: string;
      newParentId: string;
      insertPosition: 'before' | 'after' | 'inside';
      referenceElementId?: string;
    }>) => {
      const { elementId, newParentId, insertPosition, referenceElementId } = action.payload;
      const element = state.project.elements[elementId];
      const newParent = state.project.elements[newParentId];
      
      if (!element || !newParent) {
        console.log('REORDER DEBUG - Element or target not found:', { elementId, newParentId });
        return;
      }

      // Validate that the target can accept elements
      if (newParent.type !== 'container' && newParent.type !== 'rectangle' && newParentId !== 'root') {
        console.log('REORDER DEBUG - Invalid target type, canceling reorder:', newParent.type);
        return;
      }

      // Prevent moving element to itself or its children
      if (elementId === newParentId) {
        console.log('REORDER DEBUG - Cannot move element to itself');
        return;
      }

      console.log('REORDER DEBUG - Executing reorder:', { 
        elementId, 
        newParentId, 
        insertPosition, 
        referenceElementId,
        currentParent: element.parent 
      });

      // Remove element from current parent
      const currentParent = state.project.elements[element.parent || 'root'];
      if (currentParent && currentParent.children) {
        currentParent.children = currentParent.children.filter(id => id !== elementId);
      }

      // Add element to new parent at specified position
      if (!newParent.children) {
        newParent.children = [];
      }

      if (insertPosition === 'inside' || !referenceElementId) {
        newParent.children.push(elementId);
      } else {
        const referenceIndex = newParent.children.indexOf(referenceElementId);
        if (referenceIndex !== -1) {
          const insertIndex = insertPosition === 'before' ? referenceIndex : referenceIndex + 1;
          newParent.children.splice(insertIndex, 0, elementId);
        } else {
          newParent.children.push(elementId);
        }
      }

      // Update element's parent reference
      element.parent = newParentId;

      console.log('REORDER DEBUG - Reorder completed successfully');
      canvasSlice.caseReducers.saveToHistory(state);
    },
    
    resizeElement: (state, action: PayloadAction<{ id: string; width: number; height: number }>) => {
      const { id, width, height } = action.payload;
      if (state.project.elements[id]) {
        state.project.elements[id].width = width;
        state.project.elements[id].height = height;
      }
    },
    
    switchBreakpoint: (state, action: PayloadAction<string>) => {
      state.project.currentBreakpoint = action.payload;
      const breakpoint = state.project.breakpoints[action.payload];
      if (breakpoint && state.project.elements.root) {
        state.project.elements.root.width = breakpoint.width;
      }
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
      const { elementId, className } = action.payload;
      const element = state.project.elements[elementId];
      if (element) {
        if (!element.classes) element.classes = [];
        if (!element.classes.includes(className)) {
          element.classes.push(className);
        }
      }
    },
    
    removeCSSClass: (state, action: PayloadAction<{ elementId: string; className: string }>) => {
      const { elementId, className } = action.payload;
      const element = state.project.elements[elementId];
      if (element && element.classes) {
        element.classes = element.classes.filter(c => c !== className);
      }
    },
    
    reorderCSSClass: (state, action: PayloadAction<{ elementId: string; fromIndex: number; toIndex: number }>) => {
      const { elementId, fromIndex, toIndex } = action.payload;
      const element = state.project.elements[elementId];
      if (element && element.classes) {
        const classes = [...element.classes];
        const [moved] = classes.splice(fromIndex, 1);
        classes.splice(toIndex, 0, moved);
        element.classes = classes;
      }
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
} = canvasSlice.actions;

export default canvasSlice.reducer;
