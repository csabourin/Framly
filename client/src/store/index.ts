import { configureStore } from '@reduxjs/toolkit';
import canvasReducer from './canvasSlice';
import uiReducer from './uiSlice';
import componentReducer from './componentSlice';
import classReducer from './classSlice';
import historyReducer from './historySlice';
import buttonReducer from './buttonSlice';

export const store = configureStore({
  reducer: {
    canvas: canvasReducer,
    ui: uiReducer,
    components: componentReducer,
    classes: classReducer,
    history: historyReducer,
    button: buttonReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for performance
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        // Ignore large state objects for performance
        ignoredPaths: ['history.entries'],
      },
    }),
});

// Note: History tracking is initialized in DesignTool/index.tsx to avoid circular dependencies

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
