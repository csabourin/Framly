import React from 'react';

/**
 * CSS styles for the drag-and-drop system
 * Provides visual feedback during drag operations
 */
const DragDropStyles: React.FC = () => (
  <style>{`
    /* Canvas Elements */
    .canvas-element {
      position: relative;
      border: 2px solid transparent;
      transition: all 0.2s ease;
    }

    .canvas-element:hover {
      border-color: rgba(59, 130, 246, 0.3);
    }

    .canvas-element.selected {
      border-color: rgb(59, 130, 246);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
    }

    .canvas-element.dragging {
      opacity: 0.3;
      transform: scale(0.98);
    }

    .canvas-element.invalid-target {
      background: rgba(239, 68, 68, 0.1);
      border-color: rgb(239, 68, 68);
      cursor: not-allowed;
    }

    /* Drop Indicators */
    .canvas-element.drop-before::before {
      content: '';
      position: absolute;
      top: -3px;
      left: -2px;
      right: -2px;
      height: 3px;
      background: rgb(34, 197, 94);
      border-radius: 2px;
      z-index: 1000;
      animation: drag-pulse 0.5s ease-in-out infinite;
    }

    .canvas-element.drop-after::after {
      content: '';
      position: absolute;
      bottom: -3px;
      left: -2px;
      right: -2px;
      height: 3px;
      background: rgb(34, 197, 94);
      border-radius: 2px;
      z-index: 1000;
      animation: drag-pulse 0.5s ease-in-out infinite;
    }

    .canvas-element.drop-inside {
      background: rgba(34, 197, 94, 0.1);
      border-color: rgb(34, 197, 94);
      border-style: dashed;
      box-shadow: inset 0 0 10px rgba(34, 197, 94, 0.2);
    }

    @keyframes drag-pulse {
      0%, 100% { 
        opacity: 1;
        transform: scaleY(1);
      }
      50% { 
        opacity: 0.7;
        transform: scaleY(1.2);
      }
    }

    /* Toolbar Items */
    .toolbar-item.dragging {
      opacity: 0.5;
      transform: scale(0.95);
    }

    /* Container Elements */
    .container-element {
      min-height: 60px;
      background: rgba(59, 130, 246, 0.02);
    }

    .container-element:empty {
      background: rgba(59, 130, 246, 0.05);
      border: 2px dashed rgba(59, 130, 246, 0.2);
    }

    .container-element:empty::before {
      content: 'Drop elements here';
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: rgba(59, 130, 246, 0.5);
      font-size: 14px;
      font-style: italic;
    }

    /* Leaf Elements */
    .leaf-element {
      background: rgba(139, 69, 19, 0.02);
    }

    /* Enhanced visual feedback for valid drop targets */
    .canvas-element[data-droppable="true"]:hover {
      background: rgba(34, 197, 94, 0.05);
    }

    /* Smooth transitions for all interactions */
    .canvas-element,
    .canvas-element::before,
    .canvas-element::after {
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
  `}</style>
);

export default DragDropStyles;