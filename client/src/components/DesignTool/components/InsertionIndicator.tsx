import React from 'react';
import { DROP_ZONES } from '../utils/insertionLogic';
import type { InsertionIndicatorState } from '../utils/insertionLogic';

interface InsertionIndicatorProps {
    insertionIndicator: InsertionIndicatorState | null;
    isDrawingMode?: boolean;
}

/**
 * Visual indicator component for showing where elements will be placed.
 * Used during both drag-and-drop and drawing operations.
 *
 * In drawing mode, provides faster transitions at the insertion point.
 */
const InsertionIndicator: React.FC<InsertionIndicatorProps> = ({
    insertionIndicator,
    isDrawingMode = false
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

    // Specific styles based on zone type
    if (isCanvasZone) {
        // Canvas Padding Drop (Start/End)
        return (
            <>
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
