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
  const rootStyles = useMemo(() => {
    if (!rootElement) return {};

    return {
      minHeight: `${rootElement.height || 600}px`,
      backgroundColor: rootElement.styles?.backgroundColor || '#ffffff',
      padding: rootElement.styles?.padding || '0', // Default body padding often 0
      gap: rootElement.styles?.gap || '0',
      display: rootElement.styles?.display || 'block',
      flexDirection: (rootElement.styles?.flexDirection as any) || 'row',
      fontFamily: rootElement.styles?.fontFamily,
      color: rootElement.styles?.color,
      fontSize: rootElement.styles?.fontSize,
      fontWeight: rootElement.styles?.fontWeight,
      lineHeight: rootElement.styles?.lineHeight,
      textAlign: rootElement.styles?.textAlign,
      // Include any other body-affecting styles
      backgroundImage: rootElement.styles?.backgroundImage,
      backgroundSize: rootElement.styles?.backgroundSize,
      backgroundPosition: rootElement.styles?.backgroundPosition,
      backgroundRepeat: rootElement.styles?.backgroundRepeat
    };
  }, [rootElement]);

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