import React from 'react';

interface InsertionIndicatorProps {
  insertionIndicator: {
    elementId: string;
    position: 'before' | 'after' | 'inside' | 'canvas-top' | 'canvas-bottom';
    bounds: { x: number; y: number; width: number; height: number };
  } | null;
}

/**
 * Visual feedback component for drag and drop insertion points
 * Extracted from Canvas.tsx for better maintainability
 */
export const InsertionIndicator: React.FC<InsertionIndicatorProps> = ({ insertionIndicator }) => {
  if (!insertionIndicator || !insertionIndicator.bounds) return null;

  return (
    <div
      className="absolute pointer-events-none z-[60] transition-all duration-150"
      style={{
        left: insertionIndicator.bounds.x,
        top: insertionIndicator.bounds.y,
        width: insertionIndicator.bounds.width,
        height: insertionIndicator.bounds.height,
      }}
    >
      {/* CRISP ABOVE/BELOW INDICATORS */}
      {(insertionIndicator.position === 'before' || insertionIndicator.position === 'after') && (
        <div className="relative w-full h-full">
          {/* 2px hairline with rounded endcaps */}
          <div 
            className="w-full h-full animate-in fade-in duration-150"
            style={{
              backgroundColor: 'oklch(60% 0.20 265)',
              borderRadius: '12px',
              boxShadow: '0 0 0 1px currentColor inset',
              animation: 'cubic-bezier(0.2, 0.7, 0, 1) 150ms'
            }}
          />
          {/* Micro-hint badge with delayed fade-in */}
          <div 
            className="absolute -right-12 top-1/2 transform -translate-y-1/2 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 text-xs font-medium text-gray-700 shadow-sm border border-gray-200 animate-in fade-in duration-150 delay-120"
            style={{ animation: 'cubic-bezier(0.2, 0.7, 0, 1) 150ms 120ms both' }}
          >
            {insertionIndicator.position === 'before' ? 'Above' : 'Below'}
          </div>
        </div>
      )}

      {/* CANVAS PADDING INDICATORS - Document Start/End */}
      {(insertionIndicator.position === 'canvas-top' || insertionIndicator.position === 'canvas-bottom') && (
        <div className="relative w-full h-full">
          {/* Animated stripe pattern for document zones */}
          <div 
            className="w-full h-full animate-in fade-in duration-150"
            style={{
              background: 'repeating-linear-gradient(45deg, oklch(65% 0.15 265) 0px, oklch(65% 0.15 265) 8px, oklch(70% 0.10 265) 8px, oklch(70% 0.10 265) 16px)',
              borderRadius: '16px',
              border: '2px solid oklch(60% 0.20 265)',
              animation: 'cubic-bezier(0.2, 0.7, 0, 1) 150ms'
            }}
          />
          {/* Canvas zone label with icon */}
          <div 
            className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-800 shadow-md border border-gray-300 animate-in fade-in duration-150 delay-120"
            style={{ animation: 'cubic-bezier(0.2, 0.7, 0, 1) 150ms 120ms both' }}
          >
            📄 {insertionIndicator.position === 'canvas-top' ? 'Document Start' : 'Document End'}
          </div>
        </div>
      )}

      {/* CONTAINER HIGHLIGHT - Inside Insertion */}
      {insertionIndicator.position === 'inside' && (
        <div className="relative w-full h-full">
          {/* Subtle container highlight with inset shadow */}
          <div 
            className="w-full h-full animate-in fade-in duration-150"
            style={{
              backgroundColor: 'oklch(75% 0.08 265 / 0.3)',
              border: '2px solid oklch(60% 0.20 265)',
              borderRadius: '12px',
              boxShadow: '0 0 0 4px oklch(75% 0.08 265 / 0.2) inset',
              animation: 'cubic-bezier(0.2, 0.7, 0, 1) 150ms'
            }}
          />
          {/* Container insertion hint */}
          <div 
            className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium text-gray-700 shadow-sm border border-gray-200 animate-in fade-in duration-150 delay-120"
            style={{ animation: 'cubic-bezier(0.2, 0.7, 0, 1) 150ms 120ms both' }}
          >
            📦 Inside Container
          </div>
        </div>
      )}
    </div>
  );
};

export default InsertionIndicator;