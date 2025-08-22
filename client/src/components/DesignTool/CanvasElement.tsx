import React, { useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { selectElement, updateElement } from '../../store/canvasSlice';
import { setSelectedTool } from '../../store/uiSlice';
import { CanvasElement as CanvasElementType } from '../../types/canvas';
import ButtonElement from './CanvasElements/ButtonElement';

interface CanvasElementProps {
  element: CanvasElementType;
  isSelected: boolean;
  isHovered?: boolean;
  hoveredZone?: 'before' | 'after' | 'inside' | null;
  hoveredElementId?: string | null;
  expandedContainerId?: string | null;
}

// Get hover state from Redux if not passed down
const useHoverState = () => {
  return useSelector((state: RootState) => ({
    hoveredElementId: (state as any).ui?.hoveredElementId || null,
    hoveredZone: (state as any).ui?.hoveredZone || null,
  }));
};

const CanvasElement: React.FC<CanvasElementProps> = ({ 
  element, 
  isSelected, 
  isHovered = false, 
  hoveredZone = null,
  hoveredElementId,
  expandedContainerId = null
}) => {
  const dispatch = useDispatch();
  const { project } = useSelector((state: RootState) => state.canvas);
  const { selectedTool, isDraggingForReorder, draggedElementId, insertionIndicator } = useSelector((state: RootState) => state.ui);
  const customClasses = useSelector((state: RootState) => (state as any).classes?.customClasses || {});
  const elementRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = React.useState(false);
  const textEditRef = useRef<HTMLDivElement>(null);
  
  // Get hover state from Redux if not provided via props
  const reduxHoverState = useHoverState();
  const actualHoveredElementId = hoveredElementId !== undefined ? hoveredElementId : reduxHoverState.hoveredElementId;
  const actualHoveredZone = hoveredZone !== undefined ? hoveredZone : reduxHoverState.hoveredZone;
  
  // Check if this element is hovered
  const isThisElementHovered = actualHoveredElementId === element.id;
  const thisElementHoveredZone = isThisElementHovered ? actualHoveredZone : null;
  
  // Check if this element should have expanded padding
  const isExpandedContainer = expandedContainerId === element.id;
  const isDragActive = isDraggingForReorder || draggedElementId;
  
  // Calculate sibling spacing classes based on insertion indicator
  const getSiblingSpacingClass = useCallback(() => {
    if (!isDraggingForReorder || !insertionIndicator || !draggedElementId) {
      return 'sibling-spacing-reset';
    }
    
    const indicator = insertionIndicator as any;
    
    // Only apply spacing for "between" position
    if (indicator.position === 'between' && indicator.referenceElementId) {
      // If this element is the reference element (the one after the insertion point)
      if (element.id === indicator.referenceElementId) {
        return 'sibling-spacing-after'; // Move this element down
      }
      
      // Find the element before the reference element
      const container = project.elements[indicator.elementId];
      if (container && container.children) {
        const refIndex = container.children.indexOf(indicator.referenceElementId);
        if (refIndex > 0) {
          const beforeElementId = container.children[refIndex - 1];
          if (element.id === beforeElementId) {
            return 'sibling-spacing-before'; // Move this element up
          }
        }
      }
    }
    
    return 'sibling-spacing-reset';
  }, [isDraggingForReorder, insertionIndicator, draggedElementId, element.id, project.elements]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    console.log('CanvasElement click - selectedTool:', selectedTool, 'elementId:', element.id);
    
    // Define non-container elements that cannot have children
    const nonContainerElements = ['text', 'heading', 'list', 'image'];
    const isNonContainer = nonContainerElements.includes(element.type);
    
    // Handle selection for select and hand tools
    if (['select', 'hand'].includes(selectedTool)) {
      e.stopPropagation();
      dispatch(selectElement(element.id));
    } else if (isNonContainer && ['rectangle', 'text', 'image', 'container', 'heading', 'list'].includes(selectedTool)) {
      // For non-container elements clicked with creation tools, auto-switch to selection
      console.log('Non-container clicked with creation tool - switching to select tool');
      e.stopPropagation();
      dispatch(setSelectedTool('select'));
      dispatch(selectElement(element.id));
    } else {
      console.log('Creation tool - NOT stopping propagation, letting canvas handle it');
      // Don't stop propagation for creation tools on containers - let canvas handle it
    }
  }, [element.id, element.type, dispatch, selectedTool]);

  const handleContentEdit = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    const newContent = e.currentTarget.innerHTML || '';
    dispatch(updateElement({
      id: element.id,
      updates: { content: newContent }
    }));
    setIsEditing(false);
  }, [element.id, dispatch]);
  
  const handleListContentEdit = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    const htmlContent = e.currentTarget.innerHTML || '';
    
    // Extract list items from the HTML
    const listContainer = e.currentTarget.querySelector('ul, ol');
    if (listContainer) {
      const listItems = Array.from(listContainer.querySelectorAll('li')).map(li => li.textContent || '');
      dispatch(updateElement({ 
        id: element.id, 
        updates: { listItems } 
      }));
    }
    setIsEditing(false);
  }, [element.id, dispatch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      if (e.shiftKey) {
        // Shift+Enter: Insert line break
        document.execCommand('insertHTML', false, '<br>');
      } else {
        // Enter: Create new paragraph
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          
          // Create new paragraph element
          const newP = document.createElement('p');
          newP.innerHTML = '<br>'; // Empty paragraph with break for cursor positioning
          
          // Insert the new paragraph
          range.deleteContents();
          range.insertNode(newP);
          
          // Position cursor at start of new paragraph
          range.setStart(newP, 0);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    }
  }, []);

  // Handle clicking outside to stop text editing
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isEditing && textEditRef.current && !textEditRef.current.contains(event.target as Node)) {
        setIsEditing(false);
      }
    };

    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isEditing]);

  const renderContent = () => {
    if (element.type === 'text') {
      const isTextEditable = isSelected && (selectedTool === 'text' || isEditing);
      
      const processedContent = element.content || 'Edit this text';
      
      // If content doesn't have paragraph tags, wrap it in a paragraph
      const htmlContent = processedContent.includes('<p>') ? 
        processedContent : 
        `<p>${processedContent.replace(/\n/g, '<br>')}</p>`;

      if (isTextEditable) {
        return (
          <div
            ref={textEditRef}
            contentEditable={true}
            suppressContentEditableWarning
            onBlur={handleContentEdit}
            onKeyDown={handleKeyDown}
            className="w-full h-full outline-none cursor-text text-editing"
            style={{ 
              minHeight: 'inherit',
              padding: '4px',
              width: '100%',
              height: '100%',
              boxSizing: 'border-box'
            }}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
            autoFocus
          />
        );
      } else {
        return (
          <div
            onDoubleClick={(e) => {
              e.stopPropagation();
              // Enable text editing without changing tool
              setIsEditing(true);
            }}
            className="w-full h-full outline-none cursor-pointer text-element"
            style={{ 
              minHeight: 'inherit',
              padding: '4px',
              width: '100%',
              height: '100%',
              boxSizing: 'border-box'
            }}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        );
      }
    }
    
    if (element.type === 'heading') {
      const isTextEditable = isSelected && (selectedTool === 'text' || isEditing);
      const headingLevel = element.headingLevel || 1;

      const HeadingTag = `h${headingLevel}` as keyof JSX.IntrinsicElements;
      
      const processedContent = element.content || 'Edit this heading';

      if (isTextEditable) {
        return (
          <div
            ref={textEditRef}
            contentEditable={true}
            suppressContentEditableWarning
            onBlur={handleContentEdit}
            onKeyDown={handleKeyDown}
            className="w-full h-full outline-none cursor-text text-editing"
            style={{ 
              minHeight: 'inherit',
              padding: '4px',
              width: '100%',
              height: '100%',
              boxSizing: 'border-box'
            }}
            dangerouslySetInnerHTML={{ __html: processedContent }}
            autoFocus
          />
        );
      } else {
        return (
          <HeadingTag
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="w-full h-full outline-none cursor-pointer text-element"
            style={{ 
              minHeight: 'inherit',
              padding: '4px',
              width: '100%',
              height: '100%',
              boxSizing: 'border-box',
              margin: 0
            }}
            dangerouslySetInnerHTML={{ __html: processedContent }}
          />
        );
      }
    }
    
    if (element.type === 'list') {
      const isTextEditable = isSelected && (selectedTool === 'text' || isEditing);
      const listType = element.listType || 'unordered';
      const ListTag = listType === 'ordered' ? 'ol' : 'ul';
      const listItems = element.listItems || ['List item 1', 'List item 2', 'List item 3'];
      
      const listHTML = listItems.map(item => `<li>${item}</li>`).join('');

      if (isTextEditable) {
        return (
          <div
            ref={textEditRef}
            contentEditable={true}
            suppressContentEditableWarning
            onBlur={handleListContentEdit}
            onKeyDown={handleKeyDown}
            className="w-full h-full outline-none cursor-text text-editing"
            style={{ 
              minHeight: 'inherit',
              padding: '4px',
              width: '100%',
              height: '100%',
              boxSizing: 'border-box'
            }}
            dangerouslySetInnerHTML={{ __html: `<${ListTag}>${listHTML}</${ListTag}>` }}
            autoFocus
          />
        );
      } else {
        return (
          <ListTag
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="w-full h-full outline-none cursor-pointer text-element"
            style={{ 
              minHeight: 'inherit',
              padding: '4px',
              width: '100%',
              height: '100%',
              boxSizing: 'border-box',
              margin: 0
            }}
            dangerouslySetInnerHTML={{ __html: listHTML }}
          />
        );
      }
    }

    if (element.type === 'button') {
      return (
        <ButtonElement
          element={element}
          isSelected={isSelected}
          onSelect={() => dispatch(selectElement(element.id))}
          onUpdate={(updates) => dispatch(updateElement({ id: element.id, updates }))}
        />
      );
    }

    if (element.type === 'image') {
      const imageSource = element.imageBase64 || element.imageUrl;
      
      if (imageSource) {
        return (
          <img
            src={imageSource}
            alt={element.imageAlt || 'Image'}
            title={element.imageTitle}
            className="w-full h-full"
            style={{
              objectFit: element.objectFit || 'contain',
              objectPosition: element.objectPosition || 'center'
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              // Focus on image source input in properties panel
            }}
          />
        );
      } else {
        return (
          <div 
            className="w-full h-full flex items-center justify-center text-gray-500 bg-gray-100 rounded border-2 border-dashed overflow-hidden cursor-pointer hover:bg-gray-200 transition-colors"
            onDoubleClick={(e) => {
              e.stopPropagation();
              // Focus on the image upload section in properties panel
              const imageUploadSection = document.querySelector('[data-testid="property-imageSource"]');
              if (imageUploadSection) {
                imageUploadSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Try to focus the file input or URL input
                const fileButton = document.querySelector('[data-testid="button-select-file"]') as HTMLElement;
                if (fileButton) {
                  fileButton.focus();
                }
              }
            }}
          >
            <div className="text-center p-2 max-w-full max-h-full flex flex-col items-center justify-center">
              <div className="mb-2" style={{ fontSize: 'min(3rem, max(24px, 40%))' }}>🖼️</div>
              <span className="text-sm font-medium" style={{ fontSize: 'max(12px, min(0.875rem, 12%))' }}>Image Placeholder</span>
              <div className="text-xs mt-1 opacity-75" style={{ fontSize: 'max(10px, min(0.75rem, 10%))' }}>
                Double-click to add image
              </div>
            </div>
          </div>
        );
      }
    }

    if ((element.type === 'container' || element.type === 'rectangle' || element.isContainer) && element.children) {
      return (
        <>
          {element.children.map(childId => {
            const child = project.elements[childId];
            return child ? (
              <CanvasElement 
                key={child.id} 
                element={child}
                isSelected={child.id === project.selectedElementId}
                isHovered={child.id === actualHoveredElementId}
                hoveredZone={child.id === actualHoveredElementId ? actualHoveredZone : null}
                hoveredElementId={actualHoveredElementId}
                expandedContainerId={expandedContainerId}
              />
            ) : null;
          })}
        </>
      );
    }
    
    // Handle generic HTML element type
    if (element.type === 'element') {
      const isTextEditable = isSelected && (selectedTool === 'text' || isEditing);
      const htmlTag = element.htmlTag || 'div';
      const content = element.content || '';
      
      // Define void HTML elements that cannot have children
      const voidElements = new Set([
        'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 
        'link', 'meta', 'param', 'source', 'track', 'wbr'
      ]);
      
      const isVoidElement = voidElements.has(htmlTag);
      
      // Void elements cannot be edited and cannot have content
      if (isVoidElement) {
        return React.createElement(htmlTag, {
          className: 'outline-none',
          style: { 
            minHeight: 'inherit',
            width: '100%',
            height: isVoidElement ? 'auto' : '100%',
            boxSizing: 'border-box',
            display: 'block'
          }
        });
      }
      
      // Use React.createElement to render the original HTML tag for non-void elements
      if (isTextEditable && content) {
        return (
          <div
            ref={textEditRef}
            contentEditable={true}
            suppressContentEditableWarning
            onBlur={handleContentEdit}
            onKeyDown={handleKeyDown}
            className="w-full h-full outline-none cursor-text text-editing"
            style={{ 
              minHeight: 'inherit',
              padding: '4px',
              width: '100%',
              height: '100%',
              boxSizing: 'border-box'
            }}
            dangerouslySetInnerHTML={{ __html: content }}
            autoFocus
          />
        );
      } else {
        // Render the original HTML element with its content
        const elementProps: any = {
          className: `w-full h-full outline-none ${content ? 'cursor-pointer' : ''}`,
          style: { 
            minHeight: 'inherit',
            width: '100%',
            height: '100%',
            boxSizing: 'border-box',
            padding: content ? '4px' : '8px',
            display: element.isContainer ? 'flex' : 'block',
            flexDirection: element.flexDirection || 'column',
            justifyContent: element.justifyContent || 'flex-start',
            alignItems: element.alignItems || 'stretch'
          },
          onDoubleClick: content ? (e: React.MouseEvent) => {
            e.stopPropagation();
            setIsEditing(true);
          } : undefined
        };
        
        // Only add innerHTML for non-void elements with content
        if (content && !isVoidElement) {
          elementProps.dangerouslySetInnerHTML = { __html: content };
        }
        
        return React.createElement(
          htmlTag,
          elementProps,
          // Only add text content for elements without dangerouslySetInnerHTML
          !content && !isVoidElement ? `<${htmlTag}>` : undefined
        );
      }
    }

    // Handle all other element types with generic rendering
    if (!['text', 'heading', 'list', 'button', 'image', 'container', 'rectangle', 'element'].includes(element.type)) {
      // For form elements and other special types, use generic element rendering
      const htmlTag = element.htmlTag || 'div';
      const content = element.content || '';
      
      return React.createElement(
        htmlTag,
        {
          className: 'w-full h-full outline-none',
          style: { 
            minHeight: 'inherit',
            width: '100%',
            height: '100%',
            boxSizing: 'border-box',
            padding: content ? '4px' : '8px',
            display: element.isContainer ? 'flex' : 'block',
            flexDirection: element.flexDirection || 'column',
            justifyContent: element.justifyContent || 'flex-start',
            alignItems: element.alignItems || 'stretch',
            ...mergedStyles
          },
          dangerouslySetInnerHTML: content ? { __html: content } : undefined,
          placeholder: element.type === 'input' ? 'Entrez votre texte...' : undefined,
          controls: ['video', 'audio'].includes(element.type) ? true : undefined
        },
        !content && `${element.type.charAt(0).toUpperCase() + element.type.slice(1)} Element`
      );
    }

    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400">
        {element.type}
      </div>
    );
  };

  // Check if this element can accept drops (containers, rectangles, and generic container elements)
  const canAcceptDrop = element.type === 'container' || element.type === 'rectangle' || element.isContainer;
  
  // Define visual feedback based on selection, hover, and drag states using outline
  const getOutlineStyle = () => {
    if (isSelected) return '2px solid #3b82f6';
    
    // Drag-drop visual feedback (only show for compatible drop targets)
    if (isDraggingForReorder && isThisElementHovered && canAcceptDrop && thisElementHoveredZone === 'inside') {
      return '4px solid #22c55e'; // Green outline for valid drop zones
    }
    
    // Creation tool hover feedback (purple for inside, blue for before/after)
    if (isThisElementHovered && thisElementHoveredZone === 'inside') return '4px solid #a855f7';
    if (isThisElementHovered && (thisElementHoveredZone === 'before' || thisElementHoveredZone === 'after')) return '2px solid #3b82f6';
    
    return undefined;
  };

  const getBackgroundColor = (mergedBgColor?: string) => {
    // Creation tool hover feedback
    if (isThisElementHovered && thisElementHoveredZone === 'inside') return 'rgba(168, 85, 247, 0.1)';
    
    // Drag-drop feedback (green for valid drop zones, red for invalid)
    if (isDraggingForReorder && isThisElementHovered && thisElementHoveredZone === 'inside') {
      if (canAcceptDrop) {
        return 'rgba(34, 197, 94, 0.1)'; // Green background for valid drops
      } else {
        return 'rgba(239, 68, 68, 0.1)'; // Red background for invalid drops
      }
    }
    
    // Use merged styles (includes custom classes) instead of just element.styles
    return mergedBgColor || mergedStyles.backgroundColor;
  };

  const getBoxShadow = () => {
    if (isSelected) return '0 0 0 1px rgba(59, 130, 246, 0.3)';
    
    // Drag-drop shadow feedback
    if (isDraggingForReorder && isThisElementHovered && thisElementHoveredZone === 'inside') {
      if (canAcceptDrop) {
        return '0 0 0 3px rgba(34, 197, 94, 0.5)'; // Green shadow for valid drops
      } else {
        return '0 0 0 3px rgba(239, 68, 68, 0.5)'; // Red shadow for invalid drops
      }
    }
    
    // Creation tool shadow
    if (isThisElementHovered && thisElementHoveredZone === 'inside') return '0 0 0 2px #a855f7';
    return undefined;
  };

  // Convert kebab-case CSS properties to camelCase for React
  const convertCSSPropertiesToCamelCase = (styles: any): React.CSSProperties => {
    const camelCaseStyles: any = {};
    
    for (const [key, value] of Object.entries(styles)) {
      // Convert kebab-case to camelCase
      const camelKey = key.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
      
      // Handle complex objects that need to be converted to CSS strings
      if (typeof value === 'object' && value !== null) {
        // Convert object to CSS string representation
        if (Array.isArray(value)) {
          camelCaseStyles[camelKey] = value.join(' ');
        } else {
          // For objects like border shorthand, convert to string
          const cssString = Object.entries(value)
            .map(([k, v]) => `${v}`)
            .join(' ');
          camelCaseStyles[camelKey] = cssString || undefined;
        }
      } else {
        camelCaseStyles[camelKey] = value;
      }
    }
    
    return camelCaseStyles;
  };

  // Compute merged styles including custom classes
  const mergedStyles = React.useMemo(() => {
    const baseStyles = { ...element.styles };
    
    // Apply custom class styles
    if (element.classes && element.classes.length > 0) {
      element.classes.forEach((className: string) => {
        const customClass = customClasses[className];
        if (customClass && customClass.styles) {
          // Merge custom class styles with base styles
          Object.assign(baseStyles, customClass.styles);
        }
      });
    }
    
    // Debug: Log border-related styles
    const borderStyles = Object.entries(baseStyles).filter(([key]) => key.includes('border'));
    if (borderStyles.length > 0) {
      console.log(`Element ${element.id} border styles:`, borderStyles);
    }
    
    return baseStyles;
  }, [element.styles, element.classes, customClasses]);

  const combinedStyles: React.CSSProperties = {
    position: mergedStyles.position === 'absolute' ? 'absolute' : 'relative',
    left: mergedStyles.position === 'absolute' ? element.x : undefined,
    top: mergedStyles.position === 'absolute' ? element.y : undefined,
    width: (['text', 'heading', 'list'].includes(element.type)) ? '100%' : (mergedStyles.width || (element.width === 0 ? '100%' : element.width)),
    height: (['text', 'heading', 'list'].includes(element.type)) ? 'auto' : (mergedStyles.minHeight ? undefined : element.height),
    minHeight: (['text', 'heading', 'list'].includes(element.type)) ? '1.2em' : undefined,
    ...convertCSSPropertiesToCamelCase(mergedStyles),
    // Custom class styles are now fully preserved for border
    backgroundColor: getBackgroundColor(mergedStyles.backgroundColor),
    // Use outline for selection/hover feedback instead of border
    outline: getOutlineStyle(),
    boxShadow: getBoxShadow(),
    // Ensure the visual feedback is always visible
    zIndex: isThisElementHovered ? 1000 : (isSelected ? 100 : undefined),
  };

  // Add debug logging for hover state
  if (isThisElementHovered) {
    console.log('Element hover state:', { 
      elementId: element.id, 
      isHovered: isThisElementHovered, 
      hoveredZone: thisElementHoveredZone, 
      outline: getOutlineStyle(),
      backgroundColor: getBackgroundColor(mergedStyles.backgroundColor)
    });
  }

  return (
    <div
      ref={elementRef}
      className={`
        canvas-element
        ${isSelected ? 'selected' : ''}
        ${element.classes?.join(' ') || ''}
        ${getSiblingSpacingClass()}
        ${isDragActive ? 'drag-transition-padding' : ''}
        ${isExpandedContainer ? 'drag-expand-padding' : ''}
      `}

      onClick={handleClick}
      onMouseDown={(e) => {
        // Prevent mouse down from interfering with canvas click detection
        if (!['select', 'hand'].includes(selectedTool)) {
          e.preventDefault();
        }
        // Prevent text selection during drag operations
        if (selectedTool === 'hand') {
          e.preventDefault();
        }
      }}
      onDragStart={(e) => {
        // Prevent default drag behavior that interferes with our custom drag
        e.preventDefault();
      }}
      style={{
        ...combinedStyles,
        userSelect: selectedTool !== 'text' ? 'none' : 'auto',
        WebkitUserSelect: selectedTool !== 'text' ? 'none' : 'auto',
      }}
      data-element-id={element.id}
      data-testid={`canvas-element-${element.id}`}
    >
      {renderContent()}
      
      {/* Resize Handles */}
      {isSelected && (
        <>
          <div className="resize-handle top" data-testid="resize-handle-top" />
          <div className="resize-handle bottom" data-testid="resize-handle-bottom" />
          <div className="resize-handle left" data-testid="resize-handle-left" />
          <div className="resize-handle right" data-testid="resize-handle-right" />
        </>
      )}
    </div>
  );
};

export default CanvasElement;
