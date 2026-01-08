import React from 'react';
import { DROP_ZONES } from '../hooks/useDragAndDrop';

interface InsertionIndicatorProps {
    insertionIndicator: {
        type?: string;
        elementId?: string;
        position: string;
        bounds: {
            x: number;
            y: number | string;
            width: number | string;
            height: number | string;
            isFixed?: boolean;
        };
    } | null;
}

const InsertionIndicator: React.FC<InsertionIndicatorProps> = ({ insertionIndicator }) => {
    if (!insertionIndicator || !insertionIndicator.bounds) return null;

    const { bounds, position, type } = insertionIndicator;
    const isCanvasZone = type === DROP_ZONES.CANVAS_START || type === DROP_ZONES.CANVAS_END;

    // Base styles for the indicator
    const style: React.CSSProperties = {
        position: bounds.isFixed ? 'fixed' : 'absolute',
        left: bounds.x,
        top: bounds.y,
        width: bounds.width,
        height: bounds.height,
        pointerEvents: 'none',
        zIndex: 9999, // Ensure it's on top of everything
        transition: 'all 0.1s ease-out', // Smooth movement
    };

    // Specific styles based on zone type
    if (isCanvasZone) {
        // Canvas Padding Drop (Start/End)
        // We want a thick blue line across the screen
        return (
            <div style={{
                ...style,
                height: 6, // Thicker line
                marginTop: type === DROP_ZONES.CANVAS_START ? 0 : -6, // Adjust visual alignment
                background: '#3B82F6', // Tailwind Blue-500
                boxShadow: '0 0 8px rgba(59, 130, 246, 0.6)',
                borderRadius: 3
            }} />
        );
    }

    if (position === DROP_ZONES.INSIDE) {
        // Inside Drop (Box Highlight)
        return (
            <div style={{
                ...style,
                background: 'rgba(59, 130, 246, 0.1)',
                border: '2px dashed #3B82F6',
                borderRadius: 4
            }} />
        );
    }

    // Before/After Drop (Line)
    return (
        <div
            className="insertion-line-indicator"
            style={{
                ...style,
                background: '#3B82F6',
                height: 4,
                borderRadius: 2,
                boxShadow: '0 0 10px rgba(59, 130, 246, 0.8), 0 1px 3px rgba(0,0,0,0.3)',
                animation: 'pulsate-indicator 1.5s infinite ease-in-out'
            }}
        >
            <style>{`
                @keyframes pulsate-indicator {
                    0% { opacity: 0.6; box-shadow: 0 0 5px rgba(59, 130, 246, 0.5); }
                    50% { opacity: 1; box-shadow: 0 0 15px rgba(59, 130, 246, 0.9); }
                    100% { opacity: 0.6; box-shadow: 0 0 5px rgba(59, 130, 246, 0.5); }
                }
            `}</style>
            {/* Little circles at the ends for polish */}
            <div style={{
                position: 'absolute',
                left: -3,
                top: -3,
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#3B82F6'
            }} />
            <div style={{
                position: 'absolute',
                right: -3,
                top: -3,
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#3B82F6'
            }} />
        </div>
    );
};

export default InsertionIndicator;
