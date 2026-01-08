import React, { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { updateElementStyles } from '../../store/canvasSlice';

interface PaddingHandlesProps {
    elementId: string;
    currentPadding: string;
    isSelected: boolean;
}

/**
 * Visual Padding Handles Component
 * Shows draggable handles on container edges to adjust padding
 */
const PaddingHandles: React.FC<PaddingHandlesProps> = ({ elementId, currentPadding, isSelected }) => {
    const dispatch = useDispatch();
    const [isDragging, setIsDragging] = useState<'top' | 'right' | 'bottom' | 'left' | null>(null);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0, initialValue: 0 });

    // Parse current padding (supports "20px" or "20px 30px 20px 30px")
    const parsePadding = (padding: string) => {
        if (!padding) return { top: 0, right: 0, bottom: 0, left: 0 };

        const values = padding.split(' ').map(v => parseInt(v) || 0);
        if (values.length === 1) {
            return { top: values[0], right: values[0], bottom: values[0], left: values[0] };
        } else if (values.length === 4) {
            return { top: values[0], right: values[1], bottom: values[2], left: values[3] };
        }
        return { top: 0, right: 0, bottom: 0, left: 0 };
    };

    const padding = parsePadding(currentPadding);

    const handleMouseDown = useCallback((e: React.MouseEvent, side: 'top' | 'right' | 'bottom' | 'left') => {
        e.stopPropagation();
        e.preventDefault();

        setIsDragging(side);
        setDragStart({
            x: e.clientX,
            y: e.clientY,
            initialValue: padding[side]
        });
    }, [padding]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging) return;

        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;

        let newValue = dragStart.initialValue;

        switch (isDragging) {
            case 'top':
                newValue = Math.max(0, dragStart.initialValue + deltaY);
                break;
            case 'right':
                newValue = Math.max(0, dragStart.initialValue - deltaX);
                break;
            case 'bottom':
                newValue = Math.max(0, dragStart.initialValue - deltaY);
                break;
            case 'left':
                newValue = Math.max(0, dragStart.initialValue + deltaX);
                break;
        }

        // Snap to 4px grid
        newValue = Math.round(newValue / 4) * 4;

        // Update padding
        const newPadding = { ...padding, [isDragging]: newValue };
        const paddingString = `${newPadding.top}px ${newPadding.right}px ${newPadding.bottom}px ${newPadding.left}px`;

        dispatch(updateElementStyles({
            id: elementId,
            styles: { padding: paddingString }
        }));
    }, [isDragging, dragStart, padding, elementId, dispatch]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(null);
    }, []);

    React.useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    if (!isSelected) return null;

    const handleStyle = {
        position: 'absolute' as const,
        backgroundColor: 'rgba(147, 51, 234, 0.8)',
        cursor: 'pointer',
        zIndex: 1000,
        transition: isDragging ? 'none' : 'all 0.2s',
    };

    return (
        <>
            {/* Top Handle */}
            <div
                onMouseDown={(e) => handleMouseDown(e, 'top')}
                style={{
                    ...handleStyle,
                    top: 0,
                    left: '20%',
                    right: '20%',
                    height: '4px',
                    cursor: 'ns-resize',
                }}
                title={`Padding Top: ${padding.top}px`}
            >
                {isDragging === 'top' && (
                    <div style={{
                        position: 'absolute',
                        top: '-24px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: 'rgba(147, 51, 234, 0.95)',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap',
                    }}>
                        {padding.top}px
                    </div>
                )}
            </div>

            {/* Right Handle */}
            <div
                onMouseDown={(e) => handleMouseDown(e, 'right')}
                style={{
                    ...handleStyle,
                    right: 0,
                    top: '20%',
                    bottom: '20%',
                    width: '4px',
                    cursor: 'ew-resize',
                }}
                title={`Padding Right: ${padding.right}px`}
            >
                {isDragging === 'right' && (
                    <div style={{
                        position: 'absolute',
                        right: '-60px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        backgroundColor: 'rgba(147, 51, 234, 0.95)',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap',
                    }}>
                        {padding.right}px
                    </div>
                )}
            </div>

            {/* Bottom Handle */}
            <div
                onMouseDown={(e) => handleMouseDown(e, 'bottom')}
                style={{
                    ...handleStyle,
                    bottom: 0,
                    left: '20%',
                    right: '20%',
                    height: '4px',
                    cursor: 'ns-resize',
                }}
                title={`Padding Bottom: ${padding.bottom}px`}
            >
                {isDragging === 'bottom' && (
                    <div style={{
                        position: 'absolute',
                        bottom: '-24px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: 'rgba(147, 51, 234, 0.95)',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap',
                    }}>
                        {padding.bottom}px
                    </div>
                )}
            </div>

            {/* Left Handle */}
            <div
                onMouseDown={(e) => handleMouseDown(e, 'left')}
                style={{
                    ...handleStyle,
                    left: 0,
                    top: '20%',
                    bottom: '20%',
                    width: '4px',
                    cursor: 'ew-resize',
                }}
                title={`Padding Left: ${padding.left}px`}
            >
                {isDragging === 'left' && (
                    <div style={{
                        position: 'absolute',
                        left: '-60px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        backgroundColor: 'rgba(147, 51, 234, 0.95)',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap',
                    }}>
                        {padding.left}px
                    </div>
                )}
            </div>

            {/* Padding Overlay (visual feedback) */}
            {isDragging && (
                <div style={{
                    position: 'absolute',
                    top: `${padding.top}px`,
                    right: `${padding.right}px`,
                    bottom: `${padding.bottom}px`,
                    left: `${padding.left}px`,
                    border: '1px dashed rgba(147, 51, 234, 0.5)',
                    pointerEvents: 'none',
                    zIndex: 999,
                }} />
            )}
        </>
    );
};

export default PaddingHandles;
