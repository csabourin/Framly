import { configureStore } from '@reduxjs/toolkit';
import canvasReducer from './canvasSlice';
import uiReducer from './uiSlice';

export const store = configureStore({
  reducer: {
    canvas: canvasReducer,
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
