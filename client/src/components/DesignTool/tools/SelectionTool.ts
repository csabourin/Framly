/**
 * Selection Tool Handler (80 lines)
 * 
 * Responsibilities:
 * - Click-to-select behavior
 * - Hover feedback management
 * - Selection state management
 * - Multi-select support (future)
 */

import { Dispatch } from '@reduxjs/toolkit';
import { selectElement } from '../../../store/canvasSlice';
import { setHoveredElement } from '../../../store/uiSlice';

export class SelectionTool {
  private dispatch: Dispatch;

  constructor(dispatch: Dispatch) {
    this.dispatch = dispatch;
  }

  /**
   * Handle click selection
   */
  handleClick = (
    e: React.MouseEvent,
    elementId: string | null,
    elements: Record<string, any>
  ) => {
    e.stopPropagation();
    
    // If clicking on an element, select it
    if (elementId && elements[elementId]) {
      this.dispatch(selectElement(elementId));
    } else {
      // Clicking on empty canvas selects root
      this.dispatch(selectElement('root'));
    }
  };

  /**
   * Handle hover state changes
   */
  handleMouseEnter = (elementId: string) => {
    this.dispatch(setHoveredElement({ elementId, zone: null }));
  };

  /**
   * Handle hover state cleanup
   */
  handleMouseLeave = () => {
    this.dispatch(setHoveredElement({ elementId: null, zone: null }));
  };

  /**
   * Handle double-click for text editing
   */
  handleDoubleClick = (
    e: React.MouseEvent,
    elementId: string,
    elements: Record<string, any>
  ) => {
    e.stopPropagation();
    
    const element = elements[elementId];
    if (!element) return;

    // Enable text editing for text elements
    if (element.type === 'text' || element.type === 'button') {
      // Text editing would be handled by the parent component
      // This tool just validates the action
      return { startTextEditing: true, elementId };
    }

    return { startTextEditing: false };
  };

  /**
   * Check if element is selectable
   */
  isSelectable = (elementId: string, elements: Record<string, any>): boolean => {
    const element = elements[elementId];
    if (!element) return false;

    // All elements are selectable except for certain special types
    // This could be extended for locked elements, etc.
    return true;
  };

  /**
   * Get selection bounds for visual feedback
   */
  getSelectionBounds = (elementId: string) => {
    const element = document.querySelector(`[data-element-id="${elementId}"]`);
    if (!element) return null;

    const rect = element.getBoundingClientRect();
    const canvas = document.querySelector('[data-canvas="true"]');
    if (!canvas) return null;

    const canvasRect = canvas.getBoundingClientRect();

    return {
      x: rect.left - canvasRect.left,
      y: rect.top - canvasRect.top,
      width: rect.width,
      height: rect.height,
    };
  };
}