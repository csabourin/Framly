import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CustomComponent, ComponentCategory } from '../types/canvas';

interface ComponentState {
  components: CustomComponent[];
  categories: ComponentCategory[];
  selectedComponent: CustomComponent | null;
  isComponentPanelOpen: boolean;
  isCreatingComponent: boolean;
}

const initialState: ComponentState = {
  components: [],
  categories: [
    { id: 'custom', name: 'Custom', components: [] },
    { id: 'ui', name: 'UI Elements', components: [] },
    { id: 'layout', name: 'Layout', components: [] },
    { id: 'forms', name: 'Forms', components: [] }
  ],
  selectedComponent: null,
  isComponentPanelOpen: false,
  isCreatingComponent: false,
};

const componentSlice = createSlice({
  name: 'components',
  initialState,
  reducers: {
    addComponent: (state, action: PayloadAction<CustomComponent>) => {
      const component = action.payload;
      state.components.push(component);
      
      // Add to appropriate category
      const category = state.categories.find(cat => cat.id === component.category);
      if (category) {
        category.components.push(component);
      } else {
        // Add to custom category if category doesn't exist
        const customCategory = state.categories.find(cat => cat.id === 'custom');
        if (customCategory) {
          customCategory.components.push(component);
        }
      }
    },
    
    updateComponent: (state, action: PayloadAction<CustomComponent>) => {
      const updatedComponent = action.payload;
      const index = state.components.findIndex(comp => comp.id === updatedComponent.id);
      
      if (index !== -1) {
        state.components[index] = updatedComponent;
        
        // Update in categories
        state.categories.forEach(category => {
          const compIndex = category.components.findIndex(comp => comp.id === updatedComponent.id);
          if (compIndex !== -1) {
            category.components[compIndex] = updatedComponent;
          }
        });
      }
    },
    
    deleteComponent: (state, action: PayloadAction<string>) => {
      const componentId = action.payload;
      state.components = state.components.filter(comp => comp.id !== componentId);
      
      // Remove from categories
      state.categories.forEach(category => {
        category.components = category.components.filter(comp => comp.id !== componentId);
      });
      
      if (state.selectedComponent?.id === componentId) {
        state.selectedComponent = null;
      }
    },
    
    selectComponent: (state, action: PayloadAction<CustomComponent | null>) => {
      state.selectedComponent = action.payload;
    },
    
    toggleComponentPanel: (state) => {
      state.isComponentPanelOpen = !state.isComponentPanelOpen;
    },
    
    setComponentPanelOpen: (state, action: PayloadAction<boolean>) => {
      state.isComponentPanelOpen = action.payload;
    },
    
    setCreatingComponent: (state, action: PayloadAction<boolean>) => {
      state.isCreatingComponent = action.payload;
    },
    
    addCategory: (state, action: PayloadAction<{ id: string; name: string }>) => {
      const { id, name } = action.payload;
      if (!state.categories.find(cat => cat.id === id)) {
        state.categories.push({ id, name, components: [] });
      }
    },
    
    loadComponents: (state, action: PayloadAction<CustomComponent[]>) => {
      state.components = action.payload;
      
      // Rebuild categories
      state.categories.forEach(category => {
        category.components = [];
      });
      
      action.payload.forEach(component => {
        const category = state.categories.find(cat => cat.id === component.category);
        if (category) {
          category.components.push(component);
        } else {
          // Add to custom category if category doesn't exist
          const customCategory = state.categories.find(cat => cat.id === 'custom');
          if (customCategory) {
            customCategory.components.push(component);
          }
        }
      });
    },
  },
});

export const {
  addComponent,
  updateComponent,
  deleteComponent,
  selectComponent,
  toggleComponentPanel,
  setComponentPanelOpen,
  setCreatingComponent,
  addCategory,
  loadComponents,
} = componentSlice.actions;

export default componentSlice.reducer;