import { configureStore } from '@reduxjs/toolkit';
import canvasReducer from './canvasSlice';
import uiReducer from './uiSlice';
import componentReducer from './componentSlice';
import classReducer from './classSlice';

export const store = configureStore({
  reducer: {
    canvas: canvasReducer,
    ui: uiReducer,
    components: componentReducer,
    classes: classReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
