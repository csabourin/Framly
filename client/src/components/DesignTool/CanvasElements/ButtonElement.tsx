import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../store';
import { selectButtonDesignerState, selectCustomClasses } from '../../../store/selectors';
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
  const { designs } = useSelector(selectButtonDesignerState);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(element.buttonText || 'Button');
  
  // Sync editText with element.buttonText when it changes
  useEffect(() => {
    setEditText(element.buttonText || 'Button');
  }, [element.buttonText]);
  // Use element's currentButtonState for real-time state visualization from Properties panel
  const currentState = element.currentButtonState || 'default';

  // Get button design if linked to one
  const buttonDesign = element.buttonDesignId ? designs[element.buttonDesignId] : null;

  // Get custom classes styles with state-specific support
  const customClasses = useSelector(selectCustomClasses);
  
  // Calculate styles - prioritize custom classes with state support over design states
  const getButtonStyles = (): React.CSSProperties => {
    let combinedStyles = { ...element.styles };
    
    // Apply styles from custom classes (including state-specific styles)
    if (element.classes && element.classes.length > 0) {
      element.classes.forEach((className: string) => {
        const customClass = customClasses[className];
        if (customClass && customClass.styles) {
          // Apply base styles first
          Object.keys(customClass.styles).forEach(key => {
            if (!key.includes(':')) {
              combinedStyles[key] = customClass.styles[key];
            }
          });
          
          // Apply state-specific styles if current state matches
          const statePrefix = `${currentState}:`;
          Object.keys(customClass.styles).forEach(key => {
            if (key.startsWith(statePrefix)) {
              const actualProperty = key.substring(statePrefix.length);
              combinedStyles[actualProperty] = customClass.styles[key];
            }
          });
        }
      });
    }
    
    // Fall back to button design if available and no custom classes applied
    if (buttonDesign && buttonDesign.states[currentState as keyof typeof buttonDesign.states] && 
        (!element.classes || element.classes.length === 0)) {
      const designStyles = buttonDesign.states[currentState as keyof typeof buttonDesign.states].styles;
      combinedStyles = { ...combinedStyles, ...designStyles };
    }
    
    return {
      ...combinedStyles,
      width: '100%',
      height: '100%',
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

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditText(element.buttonText || 'Button');
  };

  const handleTextSubmit = () => {
    dispatch(updateElement({
      id: element.id,
      updates: { buttonText: editText }
    }));
    setIsEditing(false);
  };

  const handleTextKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTextSubmit();
    } else if (e.key === 'Escape') {
      setEditText(element.buttonText || 'Button');
      setIsEditing(false);
    }
  };

  const buttonText = element.buttonText || 'Button';

  if (isEditing) {
    return (
      <div
        style={{
          ...getButtonStyles(),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        className="font-medium focus:outline-none transition-all duration-200 ring-2 ring-blue-500 ring-offset-1"
      >
        <input
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleTextSubmit}
          onKeyDown={handleTextKeyDown}
          className="bg-transparent text-center outline-none w-full"
          style={{ 
            color: 'inherit',
            fontSize: 'inherit',
            fontFamily: 'inherit',
            fontWeight: 'inherit'
          }}
          autoFocus
          data-testid={`button-text-editor-${element.id}`}
        />
      </div>
    );
  }

  return (
    <button
      style={getButtonStyles()}
      className={`
        font-medium focus:outline-none transition-all duration-200 w-full h-full
      `}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onFocus={handleFocus}
      onBlur={handleBlur}
      data-testid={`canvas-button-${element.id}`}
      data-element-type="button"
    >
      {buttonText}
    </button>
  );
};

export default ButtonElement;