import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectElement } from '../../../store/canvasSlice';
import { resetUI } from '../../../store/uiSlice';
import { 
  selectSelectedElementId, 
  selectHoveredElementId,
  selectCurrentElements
} from '../../../store/selectors';
import { getElementAtPoint } from '../../../utils/canvas';
import { CanvasElement } from '../../../types/canvas';

/**
 * Hook for handling element selection and interaction logic
 * Extracted from Canvas.tsx for better separation of concerns
 */
export const useElementSelection = (
  zoomLevel: number
) => {
  const dispatch = useDispatch();
  const selectedElementId = useSelector(selectSelectedElementId);
  const hoveredElementId = useSelector(selectHoveredElementId);
  const currentElements = useSelector(selectCurrentElements);

  const selectElementById = useCallback((elementId: string | null) => {
    if (elementId) {
      dispatch(selectElement(elementId));
    } else {
      dispatch(selectElement('root'));
    }
  }, [dispatch]);

  const selectElementAtPoint = useCallback((
    x: number, 
    y: number, 
    elements: Record<string, CanvasElement>
  ) => {
    const clickedElement = getElementAtPoint(x, y, elements, zoomLevel);
    if (clickedElement) {
      dispatch(selectElement(clickedElement.id));
      return clickedElement;
    } else {
      dispatch(selectElement('root'));
      return null;
    }
  }, [zoomLevel, dispatch]);

  const clearSelection = useCallback(() => {
    dispatch(selectElement('root'));
    dispatch(resetUI());
  }, [dispatch]);

  const isElementSelected = useCallback((elementId: string) => {
    return selectedElementId === elementId;
  }, [selectedElementId]);

  const isElementHovered = useCallback((elementId: string) => {
    return hoveredElementId === elementId;
  }, [hoveredElementId]);

  const getSelectedElement = useCallback(() => {
    if (selectedElementId && currentElements[selectedElementId]) {
      return currentElements[selectedElementId];
    }
    return currentElements['root'] || null;
  }, [selectedElementId, currentElements]);

  const handleCanvasBackgroundClick = useCallback(() => {
    // When clicking on canvas background, select root
    dispatch(selectElement('root'));
  }, [dispatch]);

  return {
    selectedElementId,
    hoveredElementId,
    selectElementById,
    selectElementAtPoint,
    clearSelection,
    isElementSelected,
    isElementHovered,
    getSelectedElement,
    handleCanvasBackgroundClick
  };
};