import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CustomClass {
  name: string;
  styles: Record<string, any>;
  description?: string;
  category?: string;
  createdAt: number;
  updatedAt: number;
}

interface ClassState {
  customClasses: Record<string, CustomClass>;
  selectedClass: string | null;
}

const initialState: ClassState = {
  customClasses: {},
  selectedClass: null,
};

const classSlice = createSlice({
  name: 'classes',
  initialState,
  reducers: {
    addCustomClass: (state, action: PayloadAction<{
      name: string;
      styles: Record<string, any>;
      description?: string;
      category?: string;
    }>) => {
      const { name, styles, description, category } = action.payload;
      const now = Date.now();
      
      state.customClasses[name] = {
        name,
        styles,
        description,
        category,
        createdAt: now,
        updatedAt: now,
      };
    },
    
    updateCustomClass: (state, action: PayloadAction<{
      name: string;
      styles?: Record<string, any>;
      description?: string;
      category?: string;
    }>) => {
      const { name, styles, description, category } = action.payload;
      
      if (state.customClasses[name]) {
        if (styles) state.customClasses[name].styles = styles;
        if (description !== undefined) state.customClasses[name].description = description;
        if (category !== undefined) state.customClasses[name].category = category;
        state.customClasses[name].updatedAt = Date.now();
      }
    },
    
    deleteCustomClass: (state, action: PayloadAction<string>) => {
      const className = action.payload;
      delete state.customClasses[className];
      
      if (state.selectedClass === className) {
        state.selectedClass = null;
      }
    },
    
    renameCustomClass: (state, action: PayloadAction<{
      oldName: string;
      newName: string;
    }>) => {
      const { oldName, newName } = action.payload;
      
      if (state.customClasses[oldName] && !state.customClasses[newName]) {
        state.customClasses[newName] = {
          ...state.customClasses[oldName],
          name: newName,
          updatedAt: Date.now(),
        };
        delete state.customClasses[oldName];
        
        if (state.selectedClass === oldName) {
          state.selectedClass = newName;
        }
      }
    },
    
    selectClass: (state, action: PayloadAction<string | null>) => {
      state.selectedClass = action.payload;
    },
    
    importClasses: (state, action: PayloadAction<Record<string, CustomClass>>) => {
      state.customClasses = { ...state.customClasses, ...action.payload };
    },
    
    clearAllClasses: (state) => {
      state.customClasses = {};
      state.selectedClass = null;
    },
  },
});

export const {
  addCustomClass,
  updateCustomClass,
  deleteCustomClass,
  renameCustomClass,
  selectClass,
  importClasses,
  clearAllClasses,
} = classSlice.actions;

export default classSlice.reducer;