import React from 'react';

interface InsertionIndicator {
  position: 'before' | 'after' | 'inside' | 'between';
  elementId: string;
  bounds: { x: number; y: number; width: number; height: number };
  isEmpty?: boolean;
  insertAtBeginning?: boolean;
  spacingOffset?: number;
  referenceElementId?: string | null;
  insertPosition?: 'before' | 'after' | 'inside';
}

interface InsertionIndicatorProps {
  insertionIndicator: InsertionIndicator | null;
}

/**
 * Insertion Indicator Component (100 lines)
 * 
 * Responsibilities:
 * - Visual feedback for element insertion zones
 * - Different indicator styles for different insertion types
 * - Accessibility support for drag operations
 */
const InsertionIndicator: React.FC<InsertionIndicatorProps> = ({ insertionIndicator }) => {
  if (!insertionIndicator) return null;

  const { position, bounds, isEmpty } = insertionIndicator;

  // Different styles for different insertion types
  const getIndicatorStyle = () => {
    const baseStyle = {
      position: 'absolute' as const,
      left: `${bounds.x}px`,
      top: `${bounds.y}px`,
      width: `${bounds.width}px`,
      height: `${bounds.height}px`,
      pointerEvents: 'none' as const,
      zIndex: 1000,
    };

    switch (position) {
      case 'before':
      case 'after':
        return {
          ...baseStyle,
          backgroundColor: '#3b82f6',
          height: '4px',
          borderRadius: '2px',
          boxShadow: '0 0 8px rgba(59, 130, 246, 0.5)',
        };
      
      case 'inside':
        return {
          ...baseStyle,
          border: '2px dashed #3b82f6',
          backgroundColor: isEmpty ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
          borderRadius: '4px',
          boxShadow: '0 0 12px rgba(59, 130, 246, 0.3)',
        };
      
      case 'between':
        return {
          ...baseStyle,
          backgroundColor: '#10b981',
          height: '3px',
          borderRadius: '2px',
          boxShadow: '0 0 6px rgba(16, 185, 129, 0.5)',
        };
      
      default:
        return baseStyle;
    }
  };

  const indicatorStyle = getIndicatorStyle();

  return (
    <>
      {/* Main insertion indicator */}
      <div style={indicatorStyle} />
      
      {/* Additional visual cues for different insertion types */}
      {position === 'inside' && (
        <div
          style={{
            position: 'absolute',
            left: `${bounds.x + bounds.width / 2 - 12}px`,
            top: `${bounds.y + bounds.height / 2 - 12}px`,
            width: '24px',
            height: '24px',
            backgroundColor: '#3b82f6',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 1001,
            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)',
          }}
        >
          <div
            style={{
              width: '12px',
              height: '12px',
              backgroundColor: 'white',
              borderRadius: '2px',
            }}
          />
        </div>
      )}
      
      {/* Accessibility enhancement - screen reader announcement */}
      <div
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      >
        {position === 'inside' 
          ? `Drop zone active: Insert inside container`
          : `Drop zone active: Insert ${position} element`
        }
      </div>
    </>
  );
};

export default InsertionIndicator;