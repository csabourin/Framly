import { configureStore } from '@reduxjs/toolkit';
import canvasReducer from './canvasSlice';
import uiReducer from './uiSlice';
import componentReducer from './componentSlice';

export const store = configureStore({
  reducer: {
    canvas: canvasReducer,
    ui: uiReducer,
    components: componentReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
