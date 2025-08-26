import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type ColorMode = 'light' | 'dark' | 'auto' | 'high-contrast';

export interface ColorModeContextValue {
  mode: ColorMode;
  resolvedMode: 'light' | 'dark' | 'high-contrast';
  setMode: (mode: ColorMode) => void;
  systemPreference: 'light' | 'dark';
  supportsHighContrast: boolean;
  isColorModeDesignEnabled: boolean;
  setColorModeDesignEnabled: (enabled: boolean) => void;
}

const ColorModeContext = createContext<ColorModeContextValue | null>(null);

export interface ColorModeProviderProps {
  children: React.ReactNode;
  defaultMode?: ColorMode;
}

export function ColorModeProvider({ children, defaultMode = 'auto' }: ColorModeProviderProps) {
  
  const [mode, setModeState] = useState<ColorMode>(() => {
    if (typeof window === 'undefined') {
      return defaultMode;
    }
    
    // Try to load from localStorage
    try {
      const saved = localStorage.getItem('design-tool-color-mode');
      if (saved && ['light', 'dark', 'auto', 'high-contrast'].includes(saved)) {
        return saved as ColorMode;
      }
    } catch (error) {
      // Failed to load from localStorage, use default
    }
    
    return defaultMode;
  });

  const [systemPreference, setSystemPreference] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [supportsHighContrast] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-contrast: more)').media !== 'not all';
  });

  const [isColorModeDesignEnabled, setColorModeDesignEnabledState] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    try {
      const saved = localStorage.getItem('design-tool-color-mode-design-enabled');
      return saved === 'true';
    } catch (error) {
      return false;
    }
  });

  // Resolve the actual mode based on system preferences
  const resolvedMode: 'light' | 'dark' | 'high-contrast' = React.useMemo(() => {
    switch (mode) {
      case 'high-contrast':
        return 'high-contrast';
      case 'auto':
        return systemPreference;
      default:
        return mode;
    }
  }, [mode, systemPreference]);

  // Update system preference when media query changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPreference(e.matches ? 'dark' : 'light');
    };

    darkMediaQuery.addEventListener('change', handleChange);
    return () => darkMediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Apply the resolved mode to document
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    
    // Remove all theme classes
    root.classList.remove('light', 'dark', 'high-contrast');
    
    // Add the resolved mode class
    root.classList.add(resolvedMode);
    
    // For high-contrast, also apply additional high-contrast styles
    if (resolvedMode === 'high-contrast') {
      root.style.setProperty('--contrast-multiplier', '1.5');
      root.style.setProperty('--border-contrast', '2px solid');
    } else {
      root.style.removeProperty('--contrast-multiplier');
      root.style.removeProperty('--border-contrast');
    }
  }, [resolvedMode]);

  // Save to localStorage when mode changes
  const setMode = useCallback((newMode: ColorMode) => {
    setModeState(newMode);
    localStorage.setItem('design-tool-color-mode', newMode);
  }, []);

  // Save color mode design enabled state
  const setColorModeDesignEnabled = useCallback((enabled: boolean) => {
    setColorModeDesignEnabledState(enabled);
    try {
      localStorage.setItem('design-tool-color-mode-design-enabled', enabled.toString());
    } catch (error) {
      // Silently handle localStorage error
    }
  }, []);

  const value: ColorModeContextValue = {
    mode,
    resolvedMode,
    setMode,
    systemPreference,
    supportsHighContrast,
    isColorModeDesignEnabled,
    setColorModeDesignEnabled,
  };
  
  
  return (
    <ColorModeContext.Provider value={value}>
      {children}
    </ColorModeContext.Provider>
  );
}

export function useColorMode(): ColorModeContextValue {
  const context = useContext(ColorModeContext);
  if (!context) {
    throw new Error('useColorMode must be used within a ColorModeProvider');
  }
  return context;
}