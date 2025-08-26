import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useColorMode } from '../contexts/ColorModeContext';
import { forceCanvasRefresh } from '../store/canvasSlice';

/**
 * Hook to synchronize color mode changes with canvas element re-rendering
 * Ensures all canvas elements with color mode properties update when theme changes
 */
export function useColorModeCanvasSync() {
  const dispatch = useDispatch();
  let colorModeContext = null;
  
  try {
    colorModeContext = useColorMode();
  } catch (error) {
    // ColorModeContext not available, hook will do nothing
    return;
  }
  
  const { resolvedMode } = colorModeContext;
  
  useEffect(() => {
    // Force canvas refresh when color mode changes
    // This ensures all elements with color mode properties re-evaluate their styles
    dispatch(forceCanvasRefresh());
  }, [resolvedMode, dispatch]);
}