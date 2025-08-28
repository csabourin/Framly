/**
 * Hand Tool Handler (100 lines)
 * 
 * Responsibilities:
 * - Drag and reorder functionality
 * - Hand tool specific interactions
 * - Drag state management
 * - Visual feedback coordination
 */

import { Dispatch } from '@reduxjs/toolkit';
import { 
  setDraggingForReorder, 
  setDraggedElement, 
  setHoveredElement,
  resetUI 
} from '../../../store/uiSlice';
import { reorderElement } from '../../../store/canvasSlice';

export class HandTool {
  private dispatch: Dispatch;
  private dragStartPos: { x: number; y: number } | null = null;
  private dragThreshold: number = 5;

  constructor(dispatch: Dispatch) {
    this.dispatch = dispatch;
  }

  /**
   * Handle drag start
   */
  handleDragStart = (
    e: React.DragEvent,
    elementId: string,
    elements: Record<string, any>
  ) => {
    const element = elements[elementId];
    if (!element || element.id === 'root') {
      e.preventDefault();
      return;
    }

    // Set drag data for HTML5 drag and drop
    e.dataTransfer.setData('application/json', JSON.stringify({
      elementId,
      type: 'reorder'
    }));
    e.dataTransfer.effectAllowed = 'move';

    // Update Redux state
    this.dispatch(setDraggingForReorder(true));
    this.dispatch(setDraggedElement(elementId));

    // Store drag start position
    this.dragStartPos = { x: e.clientX, y: e.clientY };
  };

  /**
   * Handle drag over for visual feedback
   */
  handleDragOver = (
    e: React.DragEvent,
    targetElementId: string | null,
    elements: Record<string, any>
  ) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (!targetElementId || !elements[targetElementId]) return;

    // Calculate hover zone
    const element = document.querySelector(`[data-element-id="${targetElementId}"]`);
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const relativeY = (e.clientY - rect.top) / rect.height;
    
    let zone: 'before' | 'after' | 'inside' = 'inside';
    
    if (relativeY < 0.25) {
      zone = 'before';
    } else if (relativeY > 0.75) {
      zone = 'after';
    } else {
      zone = 'inside';
    }

    this.dispatch(setHoveredElement({ 
      elementId: targetElementId, 
      zone 
    }));
  };

  /**
   * Handle successful drop
   */
  handleDrop = (
    e: React.DragEvent,
    targetElementId: string | null,
    insertPosition: 'before' | 'after' | 'inside',
    elements: Record<string, any>
  ) => {
    e.preventDefault();

    const dragData = e.dataTransfer.getData('application/json');
    if (!dragData) return;

    try {
      const { elementId, type } = JSON.parse(dragData);
      
      if (type !== 'reorder' || !elementId || !targetElementId) return;

      // Validate drop target
      const draggedElement = elements[elementId];
      const targetElement = elements[targetElementId];
      
      if (!draggedElement || !targetElement) return;
      
      // Prevent dropping element onto itself or its children
      if (this.isDescendant(elementId, targetElementId, elements)) return;

      // Perform the reorder
      this.dispatch(reorderElement({
        elementId,
        newParentId: insertPosition === 'inside' ? targetElementId : targetElement.parent || 'root',
        insertPosition,
        referenceElementId: insertPosition === 'inside' ? undefined : targetElementId
      }));

    } catch (error) {
      console.warn('Failed to parse drag data:', error);
    } finally {
      this.cleanup();
    }
  };

  /**
   * Handle drag end (cleanup)
   */
  handleDragEnd = () => {
    this.cleanup();
  };

  /**
   * Check if element is descendant of another
   */
  private isDescendant = (
    parentId: string, 
    childId: string, 
    elements: Record<string, any>
  ): boolean => {
    let current = elements[childId];
    
    while (current && current.parent) {
      if (current.parent === parentId) return true;
      current = elements[current.parent];
    }
    
    return false;
  };

  /**
   * Cleanup drag state
   */
  private cleanup = () => {
    this.dispatch(setDraggingForReorder(false));
    this.dispatch(setDraggedElement(undefined));
    this.dispatch(setHoveredElement({ elementId: null, zone: null }));
    this.dispatch(resetUI());
    this.dragStartPos = null;
  };

  /**
   * Check if drag threshold is exceeded
   */
  isDragThresholdExceeded = (currentX: number, currentY: number): boolean => {
    if (!this.dragStartPos) return false;
    
    const deltaX = Math.abs(currentX - this.dragStartPos.x);
    const deltaY = Math.abs(currentY - this.dragStartPos.y);
    
    return deltaX > this.dragThreshold || deltaY > this.dragThreshold;
  };
}