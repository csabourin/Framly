import { configureStore } from '@reduxjs/toolkit';
import canvasReducer from './canvasSlice';
import uiReducer from './uiSlice';
import componentReducer from './componentSlice';
import classReducer from './classSlice';
import historyReducer from './historySlice';
import { historyMiddleware } from '../utils/historyIntegration';

export const store = configureStore({
  reducer: {
    canvas: canvasReducer,
    ui: uiReducer,
    components: componentReducer,
    classes: classReducer,
    history: historyReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }).concat(historyMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
