import { configureStore } from '@reduxjs/toolkit';
import { componentPersistenceMiddleware } from './middleware/componentPersistenceMiddleware';
import canvasReducer from './canvasSlice';
import uiReducer from './uiSlice';
import componentReducer from './componentSlice';
import componentDefinitionsReducer from './componentDefinitionsSlice';
import classReducer from './classSlice';
import historyReducer from './historySlice';
import buttonReducer from './buttonSlice';

export const store = configureStore({
  reducer: {
    canvas: canvasReducer,
    ui: uiReducer,
    components: componentReducer,
    componentDefinitions: componentDefinitionsReducer,
    classes: classReducer,
    history: historyReducer,
    button: buttonReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Disable expensive middleware in development for better performance
      serializableCheck: false,
      immutableCheck: false,
    }).concat(componentPersistenceMiddleware),
});

// Note: History tracking is initialized in DesignTool/index.tsx to avoid circular dependencies

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
