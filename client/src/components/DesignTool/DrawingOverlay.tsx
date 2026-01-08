import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectUIState } from '../../store/selectors';
import { createDefaultElement, isValidDropTarget } from '../../utils/canvas';
import { addElement } from '../../store/canvasSlice';
import { setSelectedTool } from '../../store/uiSlice';
import { selectElement } from '../../store/canvasSlice';
import { Tool } from '../../types/canvas';

interface DrawingState {
  start: { x: number; y: number };
  current: { x: number; y: number };
  isShiftPressed: boolean;
  isAltPressed: boolean;
}

interface CommitRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface DrawingOverlayProps {
  currentElements: Record<string, any>;
  zoomLevel: number;
  onCommit: (rect: CommitRect, tool: Tool, modifiers: { shift: boolean; alt: boolean }) => void;
}

const DrawingOverlay: React.FC<DrawingOverlayProps> = ({
  currentElements,
  zoomLevel,
  onCommit
}) => {
  const dispatch = useDispatch();
  const { selectedTool } = useSelector(selectUIState);
  const [drawingState, setDrawingState] = useState<DrawingState | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Track modifier keys during drawing
  const [modifiers, setModifiers] = useState({ shift: false, alt: false });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setModifiers(prev => ({
        shift: e.shiftKey,
        alt: e.altKey || e.metaKey
      }));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setModifiers(prev => ({
        shift: e.shiftKey,
        alt: e.altKey || e.metaKey
      }));
    };

    // Handle Escape to cancel drawing
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drawingState) {
        setDrawingState(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [drawingState]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    console.log('🎨 DrawingOverlay: pointerDown received', { selectedTool, x: e.clientX, y: e.clientY });

    e.preventDefault();
    e.stopPropagation();

    // Only handle creation tools, not select/hand
    if (!['rectangle', 'text', 'image', 'container', 'heading', 'list', 'button',
      'input', 'textarea', 'checkbox', 'radio', 'select-dropdown',
      'section', 'nav', 'header', 'footer', 'article',
      'video', 'audio', 'link', 'code', 'divider'].includes(selectedTool)) {
      console.log('🎨 DrawingOverlay: ignoring tool', selectedTool);
      return;
    }

    console.log('🎨 DrawingOverlay: starting draw for tool', selectedTool);
    e.currentTarget.setPointerCapture(e.pointerId);
    const point = { x: e.clientX, y: e.clientY };

    setDrawingState({
      start: point,
      current: point,
      isShiftPressed: e.shiftKey,
      isAltPressed: e.altKey || e.metaKey
    });
  }, [selectedTool]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!drawingState) return;

    setDrawingState(prev => prev ? {
      ...prev,
      current: { x: e.clientX, y: e.clientY },
      isShiftPressed: e.shiftKey,
      isAltPressed: e.altKey || e.metaKey
    } : null);
  }, [drawingState]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!drawingState) return;

    const { start, current } = drawingState;
    let { left, top, width, height } = calculateRect(start, current, modifiers);

    setDrawingState(null);

    // Only commit if the drawn area is meaningful (> 2px in both dimensions)
    if (width > 2 && height > 2) {
      onCommit({ left, top, width, height }, selectedTool as Tool, modifiers);
    }
  }, [drawingState, modifiers, onCommit, selectedTool]);

  // Calculate rectangle bounds with modifier support
  const calculateRect = useCallback((
    start: { x: number; y: number },
    current: { x: number; y: number },
    modifiers: { shift: boolean; alt: boolean }
  ) => {
    let left = Math.min(start.x, current.x);
    let top = Math.min(start.y, current.y);
    let width = Math.abs(current.x - start.x);
    let height = Math.abs(current.y - start.y);

    // Shift: constrain to square
    if (modifiers.shift) {
      const size = Math.min(width, height);
      width = size;
      height = size;

      // Adjust position to maintain drawing direction
      if (current.x < start.x) left = start.x - width;
      if (current.y < start.y) top = start.y - height;
    }

    // Alt: draw from center
    if (modifiers.alt) {
      const centerX = start.x;
      const centerY = start.y;
      left = centerX - width / 2;
      top = centerY - height / 2;
      width = width;
      height = height;
    }

    return { left, top, width, height };
  }, []);

  // Calculate visual bounds for the ghost rectangle
  const getGhostBounds = useCallback(() => {
    if (!drawingState) return null;

    return calculateRect(drawingState.start, drawingState.current, {
      shift: drawingState.isShiftPressed || modifiers.shift,
      alt: drawingState.isAltPressed || modifiers.alt
    });
  }, [drawingState, modifiers, calculateRect]);

  // Only show overlay for creation tools
  if (!['rectangle', 'text', 'image', 'container', 'heading', 'button', 'input', 'textarea', 'select-dropdown'].includes(selectedTool)) {
    return null;
  }

  const ghostBounds = getGhostBounds();

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 z-[1000] cursor-crosshair select-none"
      style={{
        pointerEvents: 'auto',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      data-dnd-overlay="true"
    >
      {/* Drawing feedback ghost rectangle */}
      {drawingState && ghostBounds && (
        <div
          className="absolute border-2 border-dashed border-blue-500 bg-blue-500/10 pointer-events-none"
          style={{
            left: ghostBounds.left,
            top: ghostBounds.top,
            width: ghostBounds.width,
            height: ghostBounds.height,
            transition: 'none' // No transitions during drawing for smoothness
          }}
        >
          {/* Size indicator */}
          <div className="absolute -bottom-6 left-0 text-xs bg-blue-600 text-white px-1 rounded pointer-events-none">
            {Math.round(ghostBounds.width)}×{Math.round(ghostBounds.height)}
          </div>
        </div>
      )}

      {/* Tool cursor indicator */}
      <div className="absolute inset-0 pointer-events-none">
        <style>{`
          .drawing-cursor {
            cursor: crosshair;
          }
          .drawing-cursor::before {
            content: '';
            position: absolute;
            width: 20px;
            height: 20px;
            border: 1px solid #3b82f6;
            border-radius: 50%;
            pointer-events: none;
            z-index: 1001;
          }
        `}</style>
      </div>
    </div>
  );
};

export default DrawingOverlay;