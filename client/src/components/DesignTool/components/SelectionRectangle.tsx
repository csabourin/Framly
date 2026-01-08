import React, { useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { setSelectionRectangle, setSelectedIds } from '../../store/uiSlice';
import { selectCurrentElements } from '../../store/selectors';

/**
 * Selection Rectangle Component
 * Allows dragging to select multiple elements
 */
const SelectionRectangle: React.FC = () => {
    const dispatch = useDispatch();
    const selectionRect = useSelector((state: RootState) => state.ui.selectionRectangle);
    const currentElements = useSelector(selectCurrentElements);
    const selectedTool = useSelector((state: RootState) => state.ui.selectedTool);

    const handleMouseDown = useCallback((e: MouseEvent) => {
        // Only activate selection rectangle with pointer tool and no modifier keys
        if (selectedTool !== 'pointer' || e.shiftKey || e.ctrlKey || e.metaKey) return;

        // Don't start selection if clicking on an element
        const target = e.target as HTMLElement;
        if (target.closest('[data-element-id]')) return;

        const canvas = document.querySelector('[data-canvas-container]');
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const startX = e.clientX - rect.left;
        const startY = e.clientY - rect.top;

        dispatch(setSelectionRectangle({
            isActive: true,
            startX,
            startY,
            endX: startX,
            endY: startY
        }));
    }, [selectedTool, dispatch]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!selectionRect?.isActive) return;

        const canvas = document.querySelector('[data-canvas-container]');
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const endX = e.clientX - rect.left;
        const endY = e.clientY - rect.top;

        dispatch(setSelectionRectangle({
            ...selectionRect,
            endX,
            endY
        }));

        // Calculate which elements are within the selection rectangle
        const minX = Math.min(selectionRect.startX, endX);
        const maxX = Math.max(selectionRect.startX, endX);
        const minY = Math.min(selectionRect.startY, endY);
        const maxY = Math.max(selectionRect.startY, endY);

        const selectedIds: string[] = [];
        Object.values(currentElements).forEach(element => {
            if (element.id === 'root') return;

            const elementNode = document.querySelector(`[data-element-id="${element.id}"]`);
            if (!elementNode) return;

            const elementRect = elementNode.getBoundingClientRect();
            const canvasRect = canvas.getBoundingClientRect();

            const elemX = elementRect.left - canvasRect.left;
            const elemY = elementRect.top - canvasRect.top;
            const elemRight = elemX + elementRect.width;
            const elemBottom = elemY + elementRect.height;

            // Check if element intersects with selection rectangle
            if (elemX < maxX && elemRight > minX && elemY < maxY && elemBottom > minY) {
                selectedIds.push(element.id);
            }
        });

        dispatch(setSelectedIds(selectedIds));
    }, [selectionRect, currentElements, dispatch]);

    const handleMouseUp = useCallback(() => {
        if (selectionRect?.isActive) {
            dispatch(setSelectionRectangle(null));
        }
    }, [selectionRect, dispatch]);

    useEffect(() => {
        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseDown, handleMouseMove, handleMouseUp]);

    if (!selectionRect?.isActive) return null;

    const minX = Math.min(selectionRect.startX, selectionRect.endX);
    const minY = Math.min(selectionRect.startY, selectionRect.endY);
    const width = Math.abs(selectionRect.endX - selectionRect.startX);
    const height = Math.abs(selectionRect.endY - selectionRect.startY);

    return (
        <div
            style={{
                position: 'absolute',
                left: `${minX}px`,
                top: `${minY}px`,
                width: `${width}px`,
                height: `${height}px`,
                border: '2px solid #3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                pointerEvents: 'none',
                zIndex: 10000,
            }}
        />
    );
};

export default SelectionRectangle;
