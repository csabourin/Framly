import React from 'react';
import { DROP_ZONES } from '../utils/insertionLogic';
import type { InsertionIndicatorState } from '../utils/insertionLogic';

interface DrawingRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface InsertionIndicatorProps {
    insertionIndicator: InsertionIndicatorState | null;
    isDrawingMode?: boolean;
    drawingRect?: DrawingRect | null;
    zoomLevel?: number;
}

/**
 * Visual indicator component for showing where elements will be placed.
 * Used during both drag-and-drop and drawing operations.
 *
 * In drawing mode, provides faster transitions and can show a connection
 * line between the drawn rectangle and the insertion point.
 */
const InsertionIndicator: React.FC<InsertionIndicatorProps> = ({
    insertionIndicator,
    isDrawingMode = false,
    drawingRect = null,
    zoomLevel = 1
}) => {
    if (!insertionIndicator || !insertionIndicator.bounds) return null;

    const { bounds, position, type } = insertionIndicator;
    const isCanvasZone = type === DROP_ZONES.CANVAS_START || type === DROP_ZONES.CANVAS_END;

    // Base styles for the indicator - faster transitions in drawing mode
    const style: React.CSSProperties = {
        position: bounds.isFixed ? 'fixed' : 'absolute',
        left: bounds.x,
        top: bounds.y,
        width: bounds.width,
        height: bounds.height,
        pointerEvents: 'none',
        zIndex: 9999,
        transition: isDrawingMode ? 'all 0.05s ease-out' : 'all 0.1s ease-out',
    };

    // Render connector line from drawing rect to insertion indicator
    const renderConnector = () => {
        if (!isDrawingMode || !drawingRect || position === DROP_ZONES.INSIDE) return null;

        // Calculate connector line from center-bottom of drawing rect to indicator
        const drawingCenterX = drawingRect.x + drawingRect.width / 2;
        const drawingBottomY = drawingRect.y + drawingRect.height;

        const indicatorY = typeof bounds.y === 'number' ? bounds.y : 0;
        const indicatorCenterX = typeof bounds.x === 'number'
            ? bounds.x + (typeof bounds.width === 'number' ? bounds.width / 2 : 0)
            : 0;

        // Calculate the line angle and length
        const deltaX = indicatorCenterX - drawingCenterX;
        const deltaY = indicatorY - drawingBottomY;
        const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

        // Only show connector if there's meaningful distance
        if (length < 20) return null;

        return (
            <div
                className="insertion-connector"
                style={{
                    position: 'absolute',
                    left: drawingCenterX * zoomLevel,
                    top: drawingBottomY * zoomLevel,
                    width: length,
                    height: 2,
                    background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.3) 0%, rgba(59, 130, 246, 0.6) 100%)',
                    transformOrigin: '0 50%',
                    transform: `rotate(${angle}deg)`,
                    pointerEvents: 'none',
                    zIndex: 9998,
                    opacity: 0.7,
                    transition: 'all 0.05s ease-out'
                }}
            />
        );
    };

    // Specific styles based on zone type
    if (isCanvasZone) {
        // Canvas Padding Drop (Start/End)
        return (
            <>
                {renderConnector()}
                <div style={{
                    ...style,
                    height: 6,
                    marginTop: type === DROP_ZONES.CANVAS_START ? 0 : -6,
                    background: isDrawingMode ? '#10B981' : '#3B82F6', // Green in drawing mode
                    boxShadow: isDrawingMode
                        ? '0 0 12px rgba(16, 185, 129, 0.8)'
                        : '0 0 8px rgba(59, 130, 246, 0.6)',
                    borderRadius: 3
                }} />
            </>
        );
    }

    if (position === DROP_ZONES.INSIDE) {
        // Inside Drop (Box Highlight)
        return (
            <div style={{
                ...style,
                background: isDrawingMode
                    ? 'rgba(16, 185, 129, 0.15)'
                    : 'rgba(59, 130, 246, 0.1)',
                border: isDrawingMode
                    ? '2px dashed #10B981'
                    : '2px dashed #3B82F6',
                borderRadius: 4
            }} />
        );
    }

    // Before/After Drop (Line)
    const lineColor = isDrawingMode ? '#10B981' : '#3B82F6';
    const shadowColor = isDrawingMode
        ? 'rgba(16, 185, 129, 0.8)'
        : 'rgba(59, 130, 246, 0.8)';

    return (
        <>
            {renderConnector()}
            <div
                className="insertion-line-indicator"
                style={{
                    ...style,
                    background: lineColor,
                    height: 4,
                    borderRadius: 2,
                    boxShadow: `0 0 10px ${shadowColor}, 0 1px 3px rgba(0,0,0,0.3)`,
                    animation: isDrawingMode ? 'none' : 'pulsate-indicator 1.5s infinite ease-in-out'
                }}
            >
                <style>{`
                    @keyframes pulsate-indicator {
                        0% { opacity: 0.6; box-shadow: 0 0 5px rgba(59, 130, 246, 0.5); }
                        50% { opacity: 1; box-shadow: 0 0 15px rgba(59, 130, 246, 0.9); }
                        100% { opacity: 0.6; box-shadow: 0 0 5px rgba(59, 130, 246, 0.5); }
                    }
                `}</style>
                {/* Circle indicators at line ends */}
                <div style={{
                    position: 'absolute',
                    left: -3,
                    top: -3,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: lineColor
                }} />
                <div style={{
                    position: 'absolute',
                    right: -3,
                    top: -3,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: lineColor
                }} />
            </div>
        </>
    );
};

export default InsertionIndicator;
