import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ButtonDesign, ButtonDesignState, ButtonStyles, defaultButtonStates, defaultButtonStyles } from '../types/button';

const initialState: ButtonDesignState = {
  designs: {},
  currentDesignId: null,
  currentState: 'default',
  currentVariant: null,
  previewState: 'default',
  isPreviewMode: false,
  isTestingMode: false,
};

const buttonSlice = createSlice({
  name: 'button',
  initialState,
  reducers: {
    createButtonDesign: (state, action: PayloadAction<{ name: string; description?: string }>) => {
      const { name, description } = action.payload;
      const id = `button-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const newDesign: ButtonDesign = {
        id,
        name,
        description,
        baseStyles: { ...defaultButtonStyles },
        states: JSON.parse(JSON.stringify(defaultButtonStates)),
        variants: {
          primary: { ...defaultButtonStyles } as ButtonStyles,
          secondary: {
            backgroundColor: 'transparent',
            color: '#3b82f6',
            border: '1px solid #3b82f6'
          } as ButtonStyles,
          ghost: {
            backgroundColor: 'transparent',
            color: '#374151',
            border: '1px solid transparent'
          } as ButtonStyles,
          destructive: {
            backgroundColor: '#ef4444',
            color: '#ffffff'
          } as ButtonStyles
        },
        previewText: 'Button',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      state.designs[id] = newDesign;
      state.currentDesignId = id;
    },

    updateButtonDesign: (state, action: PayloadAction<{ id: string; updates: Partial<ButtonDesign> }>) => {
      const { id, updates } = action.payload;
      if (state.designs[id]) {
        state.designs[id] = { ...state.designs[id], ...updates, updatedAt: Date.now() };
      }
    },

    deleteButtonDesign: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      delete state.designs[id];
      if (state.currentDesignId === id) {
        state.currentDesignId = null;
      }
    },

    selectButtonDesign: (state, action: PayloadAction<string>) => {
      state.currentDesignId = action.payload;
    },

    updateButtonState: (state, action: PayloadAction<{
      designId: string;
      stateName: keyof ButtonDesign['states'];
      styles: Partial<ButtonStyles>;
    }>) => {
      const { designId, stateName, styles } = action.payload;
      const design = state.designs[designId];
      if (design && design.states[stateName]) {
        design.states[stateName].styles = {
          ...design.states[stateName].styles,
          ...styles
        };
        design.updatedAt = Date.now();
      }
    },

    updateButtonVariant: (state, action: PayloadAction<{
      designId: string;
      variantName: keyof ButtonDesign['variants'];
      styles: Partial<ButtonStyles>;
    }>) => {
      const { designId, variantName, styles } = action.payload;
      const design = state.designs[designId];
      if (design && design.variants && design.variants[variantName]) {
        design.variants[variantName] = {
          ...design.variants[variantName],
          ...styles
        };
        design.updatedAt = Date.now();
      }
    },

    setCurrentState: (state, action: PayloadAction<keyof ButtonDesign['states']>) => {
      state.currentState = action.payload;
    },

    setCurrentVariant: (state, action: PayloadAction<keyof ButtonDesign['variants'] | null>) => {
      state.currentVariant = action.payload;
    },

    setPreviewState: (state, action: PayloadAction<keyof ButtonDesign['states']>) => {
      state.previewState = action.payload;
    },

    setPreviewMode: (state, action: PayloadAction<boolean>) => {
      state.isPreviewMode = action.payload;
    },

    setTestingMode: (state, action: PayloadAction<boolean>) => {
      state.isTestingMode = action.payload;
    },

    updatePreviewText: (state, action: PayloadAction<{ designId: string; text: string }>) => {
      const { designId, text } = action.payload;
      if (state.designs[designId]) {
        state.designs[designId].previewText = text;
        state.designs[designId].updatedAt = Date.now();
      }
    },

    duplicateButtonDesign: (state, action: PayloadAction<string>) => {
      const originalId = action.payload;
      const original = state.designs[originalId];
      if (original) {
        const newId = `button-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const duplicate: ButtonDesign = {
          ...JSON.parse(JSON.stringify(original)),
          id: newId,
          name: `${original.name} Copy`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        state.designs[newId] = duplicate;
        state.currentDesignId = newId;
      }
    },

    importButtonDesigns: (state, action: PayloadAction<Record<string, ButtonDesign>>) => {
      state.designs = { ...state.designs, ...action.payload };
    },

    resetButtonDesign: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      if (state.designs[id]) {
        state.designs[id].states = JSON.parse(JSON.stringify(defaultButtonStates));
        state.designs[id].baseStyles = { ...defaultButtonStyles };
        state.designs[id].updatedAt = Date.now();
      }
    },
  },
});

export const {
  createButtonDesign,
  updateButtonDesign,
  deleteButtonDesign,
  selectButtonDesign,
  updateButtonState,
  updateButtonVariant,
  setCurrentState,
  setCurrentVariant,
  setPreviewState,
  setPreviewMode,
  setTestingMode,
  updatePreviewText,
  duplicateButtonDesign,
  importButtonDesigns,
  resetButtonDesign,
} = buttonSlice.actions;

export default buttonSlice.reducer;