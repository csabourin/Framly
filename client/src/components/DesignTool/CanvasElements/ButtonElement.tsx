import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../store';
import { updateElement, selectElement } from '../../../store/canvasSlice';
import { CanvasElement } from '../../../types/canvas';
import { ButtonStyles } from '../../../types/button';

interface ButtonElementProps {
  element: CanvasElement;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<CanvasElement>) => void;
}

const ButtonElement: React.FC<ButtonElementProps> = ({ 
  element, 
  isSelected, 
  onSelect, 
  onUpdate 
}) => {
  const dispatch = useDispatch();
  const { designs } = useSelector((state: RootState) => state.button);
  // Use element's currentButtonState for real-time state visualization from Properties panel
  const currentState = element.currentButtonState || 'default';

  // Get button design if linked to one
  const buttonDesign = element.buttonDesignId ? designs[element.buttonDesignId] : null;

  // Calculate styles - use design if available, otherwise use element styles
  const getButtonStyles = (): React.CSSProperties => {
    if (buttonDesign && buttonDesign.states[currentState as keyof typeof buttonDesign.states]) {
      const designStyles = buttonDesign.states[currentState as keyof typeof buttonDesign.states].styles;
      return {
        ...element.styles,
        ...designStyles,
        position: 'absolute',
        left: `${element.x}px`,
        top: `${element.y}px`,
        width: `${element.width}px`,
        height: `${element.height}px`,
      } as React.CSSProperties;
    }
    
    return {
      ...element.styles,
      position: 'absolute',
      left: `${element.x}px`,
      top: `${element.y}px`,
      width: `${element.width}px`,
      height: `${element.height}px`,
    } as React.CSSProperties;
  };

  const handleMouseEnter = () => {
    // Only update state if not being edited in Properties panel (when not selected)
    if (!isSelected && buttonDesign?.states.hover) {
      dispatch(updateElement({
        id: element.id,
        updates: { currentButtonState: 'hover' }
      }));
    }
  };

  const handleMouseLeave = () => {
    // Only reset to default if not being edited in Properties panel
    if (!isSelected) {
      dispatch(updateElement({
        id: element.id,
        updates: { currentButtonState: 'default' }
      }));
    }
  };

  const handleMouseDown = () => {
    if (!isSelected && buttonDesign?.states.active) {
      dispatch(updateElement({
        id: element.id,
        updates: { currentButtonState: 'active' }
      }));
    }
  };

  const handleMouseUp = () => {
    if (!isSelected && buttonDesign?.states.hover) {
      dispatch(updateElement({
        id: element.id,
        updates: { currentButtonState: 'hover' }
      }));
    }
  };

  const handleFocus = () => {
    if (!isSelected && buttonDesign?.states.focus) {
      dispatch(updateElement({
        id: element.id,
        updates: { currentButtonState: 'focus' }
      }));
    }
  };

  const handleBlur = () => {
    if (!isSelected) {
      dispatch(updateElement({
        id: element.id,
        updates: { currentButtonState: 'default' }
      }));
    }
  };

  const handleTextChange = (newText: string) => {
    onUpdate({ buttonText: newText });
  };

  const buttonText = element.buttonText || 'Button';

  return (
    <button
      style={getButtonStyles()}
      className={`
        font-medium focus:outline-none transition-all duration-200
        ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
      `}
      onClick={onSelect}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onFocus={handleFocus}
      onBlur={handleBlur}
      data-testid={`canvas-button-${element.id}`}
      data-element-id={element.id}
      data-element-type="button"
    >
      {buttonText}
      
      {/* Edit overlay when selected */}
      {isSelected && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-6 left-0 bg-blue-500 text-white text-xs px-2 py-1 rounded">
            Button
            {buttonDesign && (
              <span className="ml-1 opacity-75">({buttonDesign.name})</span>
            )}
          </div>
        </div>
      )}
    </button>
  );
};

export default ButtonElement;