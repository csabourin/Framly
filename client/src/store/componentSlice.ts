import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CustomComponent, ComponentCategory } from '../types/canvas';

interface ComponentState {
  components: CustomComponent[];
  categories: ComponentCategory[];
  selectedComponent: CustomComponent | null;
  isComponentPanelOpen: boolean;
  isCreatingComponent: boolean;
}

// Sample components for testing
const sampleComponents: CustomComponent[] = [
  {
    id: 'sample-button-1',
    name: 'Primary Button',
    category: 'ui',
    thumbnail: `data:image/svg+xml,${encodeURIComponent(`
      <svg width="80" height="60" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="20" width="60" height="20" fill="#3b82f6" stroke="#2563eb" rx="4"/>
        <text x="40" y="32" font-family="Arial" font-size="8" fill="white" text-anchor="middle">Button</text>
      </svg>
    `)}`,
    elements: {
      'sample-button-element': {
        id: 'sample-button-element',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 120,
        height: 40,
        styles: {
          backgroundColor: '#3b82f6',
          color: '#ffffff',
          border: '1px solid #2563eb',
          borderRadius: '6px',
          padding: '8px 16px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        },
        classes: [],
        parent: 'root',
        children: []
      }
    },
    rootElementId: 'sample-button-element',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'sample-card-1',
    name: 'Info Card',
    category: 'layout',
    thumbnail: `data:image/svg+xml,${encodeURIComponent(`
      <svg width="80" height="60" xmlns="http://www.w3.org/2000/svg">
        <rect x="5" y="10" width="70" height="40" fill="#ffffff" stroke="#e5e7eb" rx="8"/>
        <text x="10" y="25" font-family="Arial" font-size="6" fill="#374151">Title</text>
        <text x="10" y="35" font-family="Arial" font-size="5" fill="#6b7280">Description text...</text>
      </svg>
    `)}`,
    elements: {
      'sample-card-container': {
        id: 'sample-card-container',
        type: 'container',
        x: 0,
        y: 0,
        width: 300,
        height: 150,
        styles: {
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '16px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
        },
        classes: [],
        parent: 'root',
        children: ['sample-card-title', 'sample-card-content'],
        isContainer: true
      },
      'sample-card-title': {
        id: 'sample-card-title',
        type: 'text',
        x: 0,
        y: 0,
        width: 268,
        height: 30,
        content: 'Card Title',
        styles: {
          fontSize: '18px',
          fontWeight: '600',
          color: '#111827',
          marginBottom: '8px'
        },
        classes: [],
        parent: 'sample-card-container',
        children: []
      },
      'sample-card-content': {
        id: 'sample-card-content',
        type: 'text',
        x: 0,
        y: 40,
        width: 268,
        height: 60,
        content: 'This is a sample card component with a title and content area. You can customize the styling and layout.',
        styles: {
          fontSize: '14px',
          color: '#6b7280',
          lineHeight: '1.5'
        },
        classes: [],
        parent: 'sample-card-container',
        children: []
      }
    },
    rootElementId: 'sample-card-container',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const initialState: ComponentState = {
  components: sampleComponents,
  categories: [
    { 
      id: 'custom', 
      name: 'Custom', 
      components: sampleComponents.filter(comp => comp.category === 'custom') 
    },
    { 
      id: 'ui', 
      name: 'UI Elements', 
      components: sampleComponents.filter(comp => comp.category === 'ui') 
    },
    { 
      id: 'layout', 
      name: 'Layout', 
      components: sampleComponents.filter(comp => comp.category === 'layout') 
    },
    { 
      id: 'forms', 
      name: 'Forms', 
      components: sampleComponents.filter(comp => comp.category === 'forms') 
    }
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
    
    loadComponents: (state, action: PayloadAction<ComponentCategory[]>) => {
      state.categories = action.payload;
      state.components = action.payload.flatMap(category => category.components);
    },
    
    addCategory: (state, action: PayloadAction<{ id: string; name: string }>) => {
      const { id, name } = action.payload;
      if (!state.categories.find(cat => cat.id === id)) {
        state.categories.push({ id, name, components: [] });
      }
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