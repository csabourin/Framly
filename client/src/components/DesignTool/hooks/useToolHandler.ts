import { useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectElement, addElement } from '../../../store/canvasSlice';
import { setSelectedTool } from '../../../store/uiSlice';
import { selectSelectedTool } from '../../../store/selectors';
import { createDefaultElement, getElementAtPoint, isPointAndClickTool } from '../../../utils/canvas';
import { CanvasElement } from '../../../types/canvas';
import { calculateInsertionPoint } from '../utils/insertionLogic';

/**
 * Hook for handling tool-specific operations and mode switching
 * Extracted from Canvas.tsx for better separation of concerns
 */
export const useToolHandler = (
  expandedElements: Record<string, CanvasElement>,
  zoomLevel: number,
  canvasRef?: React.RefObject<HTMLDivElement>
) => {
  const dispatch = useDispatch();
  const selectedTool = useSelector(selectSelectedTool);

  // Auto-migrate legacy 'select' tool to 'pointer'
  // This is critical because 'select' now refers to the dropdown element tool
  useEffect(() => {
    if (selectedTool === 'select' as any) {
      console.log('🔄 Migrating legacy "select" tool to "pointer"');
      dispatch(setSelectedTool('pointer'));
    }
  }, [selectedTool, dispatch]);

  const handlePointAndClickInsertion = useCallback((
    x: number,
    y: number,
    tool: string,
    isShiftPressed: boolean,
    isAltPressed: boolean
  ) => {
    console.log('Point-and-click insertion called:', { tool, x, y });

    // Create the new element with default positioning
    const type = tool === 'select-dropdown' ? 'dropdown' : tool as any;
    const newElement = createDefaultElement(type);

    // Use shared insertion logic to determine placement based on click position
    let parentId = 'root';
    let insertPosition: 'inside' | 'before' | 'after' = 'inside';
    let referenceElementId: string | undefined;

    if (canvasRef) {
      const insertionPoint = calculateInsertionPoint(
        x,
        y,
        expandedElements,
        canvasRef,
        zoomLevel
      );

      if (insertionPoint) {
        parentId = insertionPoint.targetContainerId;
        insertPosition = insertionPoint.insertPosition === 'canvas-start' ? 'before' :
                        insertionPoint.insertPosition === 'canvas-end' ? 'after' :
                        insertionPoint.insertPosition as 'inside' | 'before' | 'after';
        referenceElementId = insertionPoint.referenceElementId;

        console.log('Insertion point calculated:', insertionPoint);
      }
    }

    // Insert at the calculated position
    dispatch(addElement({
      element: newElement,
      parentId,
      insertPosition,
      referenceElementId
    }));

    // Select the newly created element
    dispatch(selectElement(newElement.id));

    console.log('Element created:', newElement.id, 'in', parentId);
  }, [dispatch, expandedElements, zoomLevel, canvasRef]);

  const handleToolBasedSelection = useCallback((
    x: number,
    y: number,
    tool: string
  ) => {
    if (tool === 'pointer') {
      const clickedElement = getElementAtPoint(x, y, expandedElements, zoomLevel);
      if (clickedElement) {
        dispatch(selectElement(clickedElement.id));
      } else {
        dispatch(selectElement('root'));
      }
    } else if (tool === 'hand') {
      // Hand tool for selection and drag preparation
      const clickedElement = getElementAtPoint(x, y, expandedElements, zoomLevel);
      if (clickedElement && clickedElement.id !== 'root') {
        dispatch(selectElement(clickedElement.id));
      } else {
        dispatch(selectElement('root'));
      }
    }
  }, [expandedElements, zoomLevel, dispatch]);

  const isCreationTool = useCallback((tool: string) => {
    return ['rectangle', 'text', 'image', 'container', 'heading', 'list', 'button',
      'input', 'textarea', 'checkbox', 'radio', 'select-dropdown',
      'section', 'nav', 'header', 'footer', 'article',
      'video', 'audio', 'link', 'code', 'divider'].includes(tool);
  }, []);

  const isDrawingTool = useCallback((tool: string) => {
    return ['rectangle', 'text', 'image'].includes(tool);
  }, []);


  return {
    selectedTool,
    handlePointAndClickInsertion,
    handleToolBasedSelection,
    isCreationTool,
    isDrawingTool
  };
};