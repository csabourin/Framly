/**
 * Drawing Tools Handler (120 lines)
 * 
 * Responsibilities:
 * - Rectangle, text, image creation tools
 * - Point-and-click vs drawing behaviors
 * - Tool-specific constraints and modifiers
 * - Drawing state management
 */

import { Dispatch } from '@reduxjs/toolkit';
import { addElement } from '../../../store/canvasSlice';
import { setSelectedTool } from '../../../store/uiSlice';
// import { createDefaultElement } from '../../../utils/canvas';
import { nanoid } from 'nanoid';

export type DrawingToolType = 'rectangle' | 'text' | 'image';

export class DrawingTools {
  private dispatch: Dispatch;

  constructor(dispatch: Dispatch) {
    this.dispatch = dispatch;
  }

  /**
   * Handle point-and-click insertion (for text/image tools)
   */
  handlePointClick = (
    x: number,
    y: number,
    tool: DrawingToolType,
    parentId: string = 'root'
  ) => {
    const defaultSizes = {
      text: { width: 200, height: 40 },
      image: { width: 200, height: 150 },
      rectangle: { width: 200, height: 100 }
    };

    const size = defaultSizes[tool];
    
    const element = {
      id: nanoid(),
      type: tool,
      x,
      y,
      width: size.width,
      height: size.height,
      parent: parentId,
      styles: this.getDefaultStyles(tool),
      content: tool === 'text' ? 'Click to edit text' : undefined,
      imageUrl: tool === 'image' ? 'https://via.placeholder.com/200x150' : undefined,
    };

    this.dispatch(addElement({ element }));
    
    // Keep tool active for continued use
    // This implements "intelligent tool persistence"
    return element.id;
  };

  /**
   * Handle rectangle drawing with drag
   */
  handleRectangleDrawn = (
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    modifiers: { shift?: boolean; alt?: boolean } = {},
    parentId: string = 'root'
  ) => {
    let width = Math.abs(endX - startX);
    let height = Math.abs(endY - startY);
    let x = Math.min(startX, endX);
    let y = Math.min(startY, endY);

    // Apply modifiers
    if (modifiers.shift) {
      // Square aspect ratio
      const size = Math.min(width, height);
      width = height = size;
    }

    if (modifiers.alt) {
      // Draw from center
      x = startX - width / 2;
      y = startY - height / 2;
    }

    const element = {
      id: nanoid(),
      type: 'rectangle' as const,
      x,
      y,
      width,
      height,
      parent: parentId,
      styles: this.getDefaultStyles('rectangle'),
    };

    this.dispatch(addElement({ element }));
    return element.id;
  };

  /**
   * Get default styles for each tool type
   */
  private getDefaultStyles = (tool: DrawingToolType) => {
    const baseStyles = {
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '4px',
    };

    switch (tool) {
      case 'text':
        return {
          ...baseStyles,
          color: '#111827',
          fontSize: '16px',
          fontWeight: '400',
          textAlign: 'left' as const,
          padding: '8px',
          backgroundColor: 'transparent',
          border: 'none',
        };

      case 'image':
        return {
          ...baseStyles,
          objectFit: 'cover' as const,
          borderRadius: '8px',
        };

      case 'rectangle':
        return {
          ...baseStyles,
          backgroundColor: '#f3f4f6',
          border: '1px solid #d1d5db',
        };

      default:
        return baseStyles;
    }
  };

  /**
   * Validate drawing constraints
   */
  validateDrawing = (
    width: number,
    height: number,
    tool: DrawingToolType
  ): boolean => {
    const minSizes = {
      rectangle: { width: 10, height: 10 },
      text: { width: 20, height: 20 },
      image: { width: 30, height: 30 }
    };

    const min = minSizes[tool];
    return width >= min.width && height >= min.height;
  };

  /**
   * Get tool cursor style
   */
  getToolCursor = (tool: DrawingToolType): string => {
    switch (tool) {
      case 'rectangle':
        return 'crosshair';
      case 'text':
        return 'text';
      case 'image':
        return 'copy';
      default:
        return 'default';
    }
  };

  /**
   * Check if tool supports drawing (vs point-and-click)
   */
  supportsDrawing = (tool: DrawingToolType): boolean => {
    return ['rectangle', 'text', 'image'].includes(tool);
  };

  /**
   * Check if tool supports point-and-click
   */
  supportsPointClick = (tool: DrawingToolType): boolean => {
    return ['text', 'image'].includes(tool);
  };
}