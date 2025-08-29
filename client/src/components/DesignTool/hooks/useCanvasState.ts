import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { 
  selectCurrentElements, 
  selectCanvasProject, 
  selectZoomLevel 
} from '../../../store/selectors';
import { useExpandedElements } from '../../../hooks/useExpandedElements';
import { calculateContentBounds } from '../utils/canvasGeometry';

/**
 * Hook for managing computed canvas state and derived values
 * Extracted from Canvas.tsx for better separation of concerns
 */
export const useCanvasState = () => {
  // Core selectors
  const currentElements = useSelector(selectCurrentElements);
  const project = useSelector(selectCanvasProject);
  const zoomLevel = useSelector(selectZoomLevel);
  
  // UI state
  const isGridVisible = useSelector((state: RootState) => state.ui.isGridVisible);
  const currentBreakpoint = useSelector((state: RootState) => state.canvas.project.currentBreakpoint);
  const breakpoints = useSelector((state: RootState) => state.canvas.project.breakpoints);
  
  // Expanded elements for component rendering
  const expandedElements = useExpandedElements(currentElements);
  const rootElement = expandedElements.root;
  
  // Calculate canvas dimensions
  const canvasWidth = useMemo(() => {
    return breakpoints[currentBreakpoint]?.width || rootElement?.width || 375;
  }, [breakpoints, currentBreakpoint, rootElement?.width]);
  
  // Calculate content bounds
  const contentBounds = useMemo(() => {
    return calculateContentBounds(expandedElements, rootElement, canvasWidth);
  }, [expandedElements, rootElement, canvasWidth]);
  
  // Canvas height calculation
  const canvasHeight = useMemo(() => {
    const { minY, maxY } = contentBounds;
    return Math.max(800, maxY - minY + 100);
  }, [contentBounds]);

  // Root element styles with defaults
  const rootStyles = useMemo(() => ({
    minHeight: `${rootElement?.height || 600}px`,
    backgroundColor: rootElement?.styles?.backgroundColor || '#ffffff',
    padding: rootElement?.styles?.padding || '20px',
    gap: rootElement?.styles?.gap || '16px',
    display: rootElement?.styles?.display || 'flex',
    flexDirection: (rootElement?.styles?.flexDirection as any) || 'column',
  }), [rootElement]);

  // Check if text editing is active
  const isTextEditingActive = useMemo(() => {
    return document.querySelector('.text-editing') !== null;
  }, []);

  return {
    // Core state
    currentElements,
    expandedElements,
    rootElement,
    project,
    
    // UI state
    zoomLevel,
    isGridVisible,
    currentBreakpoint,
    breakpoints,
    
    // Computed dimensions
    canvasWidth,
    canvasHeight,
    contentBounds,
    
    // Computed styles
    rootStyles,
    
    // Computed flags
    isTextEditingActive
  };
};