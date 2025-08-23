import { Middleware } from '@reduxjs/toolkit';
import { 
  addComponentDefinition, 
  updateComponentDefinition, 
  deleteComponentDefinition,
  addComponentCategory,
  updateComponentCategory,
  deleteComponentCategory
} from '../componentDefinitionsSlice';
import { addCategory } from '../componentSlice';
import { 
  saveComponentDefinition, 
  saveComponentCategory,
  deleteComponentDefinition as deleteComponentFromDB,
  deleteComponentCategory as deleteCategoryFromDB
} from '../../utils/componentPersistence';

/**
 * Middleware that automatically persists component definitions and categories
 * to IndexedDB when they're modified in the Redux store
 */
export const componentPersistenceMiddleware: Middleware = () => (next) => async (action) => {
  // Process the action first
  const result = next(action);
  
  try {
    // Handle component definition persistence
    if (addComponentDefinition.match(action)) {
      console.log('Persisting new component definition:', action.payload.name);
      await saveComponentDefinition(action.payload);
    } else if (updateComponentDefinition.match(action)) {
      console.log('Persisting updated component definition:', action.payload.name);
      await saveComponentDefinition(action.payload);
    } else if (deleteComponentDefinition.match(action)) {
      console.log('Deleting component definition from IndexedDB:', action.payload);
      await deleteComponentFromDB(action.payload);
    }
    
    // Handle component category persistence (new system)
    else if (addComponentCategory.match(action)) {
      console.log('Persisting new component category:', action.payload.name);
      await saveComponentCategory(action.payload);
    } else if (updateComponentCategory.match(action)) {
      console.log('Persisting updated component category:', action.payload.name);
      await saveComponentCategory(action.payload);
    } else if (deleteComponentCategory.match(action)) {
      console.log('Deleting component category from IndexedDB:', action.payload);
      await deleteCategoryFromDB(action.payload);
    }
    
    // Handle legacy category system (convert to new system)
    else if (addCategory.match(action)) {
      console.log('Converting legacy category to new system:', action.payload.name);
      const legacyCategory = action.payload;
      const newCategory = {
        id: legacyCategory.id,
        name: legacyCategory.name,
        sortIndex: 0,
        createdAt: Date.now(),
        components: [] // Required by ComponentCategory interface
      };
      await saveComponentCategory(newCategory);
    }
  } catch (error) {
    console.error('Component persistence error:', error);
    // Continue without throwing to prevent breaking the app
  }
  
  return result;
};