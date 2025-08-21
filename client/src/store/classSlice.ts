import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { customClassesAPI, categoriesAPI } from '../lib/api';
import type { CustomClass as DBCustomClass, InsertCustomClass, Category, InsertCategory } from '@shared/schema';

// Map database CustomClass to our local interface for compatibility
export interface CustomClass {
  name: string;
  styles: Record<string, any>;
  description?: string;
  category?: string;
  createdAt: number;
  updatedAt: number;
}

function dbCustomClassToLocal(dbClass: DBCustomClass): CustomClass {
  return {
    name: dbClass.name,
    styles: dbClass.styles as Record<string, any>,
    description: dbClass.description || undefined,
    category: dbClass.category || undefined,
    createdAt: dbClass.createdAt ? new Date(dbClass.createdAt).getTime() : Date.now(),
    updatedAt: dbClass.updatedAt ? new Date(dbClass.updatedAt).getTime() : Date.now(),
  };
}

function localCustomClassToDb(localClass: Partial<CustomClass>): InsertCustomClass {
  return {
    name: localClass.name!,
    styles: localClass.styles!,
    description: localClass.description,
    category: localClass.category,
  };
}

// Async thunks for database operations
export const loadCustomClasses = createAsyncThunk(
  'classes/loadCustomClasses',
  async () => {
    const dbClasses = await customClassesAPI.list();
    return dbClasses.map(dbCustomClassToLocal);
  }
);

export const saveCustomClass = createAsyncThunk(
  'classes/saveCustomClass',
  async (classData: CustomClass) => {
    const dbData = localCustomClassToDb(classData);
    const dbClass = await customClassesAPI.create(dbData);
    return dbCustomClassToLocal(dbClass);
  }
);

export const updateCustomClassDB = createAsyncThunk(
  'classes/updateCustomClassDB',
  async ({ name, updates }: { name: string; updates: Partial<CustomClass> }) => {
    const dbData = localCustomClassToDb({ name, ...updates });
    const dbClass = await customClassesAPI.update(name, dbData);
    return dbCustomClassToLocal(dbClass);
  }
);

export const deleteCustomClassDB = createAsyncThunk(
  'classes/deleteCustomClassDB',
  async (name: string) => {
    await customClassesAPI.delete(name);
    return name;
  }
);

export const loadCategories = createAsyncThunk(
  'classes/loadCategories',
  async (type?: string) => {
    return await categoriesAPI.list(type);
  }
);

export const saveCategory = createAsyncThunk(
  'classes/saveCategory',
  async (categoryData: InsertCategory) => {
    return await categoriesAPI.create(categoryData);
  }
);

interface ClassState {
  customClasses: Record<string, CustomClass>;
  selectedClass: string | null;
  categories: Category[];
  isLoading: boolean;
  error: string | null;
}

const initialState: ClassState = {
  customClasses: {},
  selectedClass: null,
  categories: [],
  isLoading: false,
  error: null,
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
  extraReducers: (builder) => {
    // Load custom classes
    builder
      .addCase(loadCustomClasses.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadCustomClasses.fulfilled, (state, action) => {
        state.isLoading = false;
        state.customClasses = action.payload.reduce((acc, cls) => {
          acc[cls.name] = cls;
          return acc;
        }, {} as Record<string, CustomClass>);
      })
      .addCase(loadCustomClasses.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to load custom classes';
      });

    // Save custom class
    builder
      .addCase(saveCustomClass.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(saveCustomClass.fulfilled, (state, action) => {
        state.isLoading = false;
        state.customClasses[action.payload.name] = action.payload;
      })
      .addCase(saveCustomClass.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to save custom class';
      });

    // Update custom class
    builder
      .addCase(updateCustomClassDB.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateCustomClassDB.fulfilled, (state, action) => {
        state.isLoading = false;
        state.customClasses[action.payload.name] = action.payload;
      })
      .addCase(updateCustomClassDB.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to update custom class';
      });

    // Delete custom class
    builder
      .addCase(deleteCustomClassDB.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteCustomClassDB.fulfilled, (state, action) => {
        state.isLoading = false;
        delete state.customClasses[action.payload];
        if (state.selectedClass === action.payload) {
          state.selectedClass = null;
        }
      })
      .addCase(deleteCustomClassDB.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to delete custom class';
      });

    // Load categories
    builder
      .addCase(loadCategories.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadCategories.fulfilled, (state, action) => {
        state.isLoading = false;
        state.categories = action.payload;
      })
      .addCase(loadCategories.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to load categories';
      });

    // Save category
    builder
      .addCase(saveCategory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(saveCategory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.categories.push(action.payload);
      })
      .addCase(saveCategory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to save category';
      });
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