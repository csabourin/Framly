import React, { useRef, useCallback, memo, useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { selectUIState, selectHoverState, selectSelectedElementId, selectCustomClasses } from '../../store/selectors';
import { selectElement, updateElement } from '../../store/canvasSlice';
import { setSelectedTool } from '../../store/uiSlice';
import { CanvasElement as CanvasElementType } from '../../types/canvas';
import ButtonElement from './CanvasElements/ButtonElement';
import { isValidDropTarget } from '../../utils/canvas';
import { selectCurrentElements } from '../../store/selectors';
import { isComponentInstance } from '../../utils/componentInstances';
import ComponentInstanceElement from './ComponentInstanceElement';
import ElementContextMenu from './ElementContextMenu';


interface CanvasElementProps {
  element: CanvasElementType;
  isSelected: boolean;
  isHovered?: boolean;
  hoveredZone?: 'before' | 'after' | 'inside' | null;
  hoveredElementId?: string | null;
  expandedContainerId?: string | null;
  currentElements?: Record<string, CanvasElementType>; // Pass expanded elements from Canvas
}

// REMOVED: useHoverState hook - now using memoized selector

const CanvasElement: React.FC<CanvasElementProps> = ({ 
  element, 
  isSelected, 
  isHovered = false, 
  hoveredZone = null,
  hoveredElementId,
  expandedContainerId = null,
  currentElements: passedCurrentElements
}) => {
  const dispatch = useDispatch();
  
  // CRITICAL: All hooks must be called FIRST for consistent hook order
  const rawCurrentElements = useSelector(selectCurrentElements);
  // Use passed expanded elements if available, otherwise use raw elements
  const currentElements = passedCurrentElements || rawCurrentElements;
  const selectedElementId = useSelector(selectSelectedElementId);
  const { selectedTool, isDraggingForReorder, draggedElementId, insertionIndicator, settings } = useSelector(selectUIState);
  const customClasses = useSelector(selectCustomClasses);
  const reduxHoverState = useSelector(selectHoverState);
  const elementRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = React.useState(false);
  const textEditRef = useRef<HTMLDivElement>(null);
  const buttonEditRef = useRef<HTMLButtonElement>(null);
  const preEditRef = useRef<HTMLPreElement>(null);
  const textareaEditRef = useRef<HTMLTextAreaElement>(null);
  
  // Get hover state from Redux if not provided via props (already called above)
  const actualHoveredElementId = hoveredElementId !== undefined ? hoveredElementId : reduxHoverState.hoveredElementId;
  const actualHoveredZone = hoveredZone !== undefined ? hoveredZone : reduxHoverState.hoveredZone;
  
  // CRITICAL: Component instances are now expanded - check for component children and roots
  const isComponentChild = element.isComponentChild;
  const isComponentRoot = element.isComponentRoot || isComponentInstance(element);
  const isGhostRoot = element.isGhostRoot;
  
  // Component children are non-interactive (but still render normally)
  // Component roots get special chrome but children render as normal elements
  
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
      const container = currentElements[indicator.elementId];
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
  }, [isDraggingForReorder, insertionIndicator, draggedElementId, element.id, currentElements]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    console.log('CanvasElement click - selectedTool:', selectedTool, 'elementId:', element.id, 'isComponentChild:', isComponentChild);
    
    // CRITICAL: Component children are not selectable - redirect to component root
    if (isComponentChild && element.componentRootId) {
      console.log('Component child clicked - selecting component root:', element.componentRootId);
      e.stopPropagation();
      dispatch(selectElement(element.componentRootId));
      return;
    }
    
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

  // Generic text edit handler for different content properties
  const handleTextPropertyEdit = useCallback((property: string) => {
    return (e: React.FormEvent<HTMLDivElement>) => {
      const newContent = e.currentTarget.textContent || '';
      dispatch(updateElement({
        id: element.id,
        updates: { [property]: newContent }
      }));
      setIsEditing(false);
    };
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
            className="h-full outline-none cursor-text text-editing"
            style={{ 
              minHeight: 'inherit',
              padding: '4px',
              width: getElementWidth(),
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
            className="h-full outline-none cursor-pointer text-element"
            style={{ 
              minHeight: 'inherit',
              padding: '4px',
              width: getElementWidth(),
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
            className="h-full outline-none cursor-text text-editing"
            style={{ 
              minHeight: 'inherit',
              padding: '4px',
              width: getElementWidth(),
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
            className="h-full outline-none cursor-pointer text-element"
            style={{ 
              minHeight: 'inherit',
              padding: '4px',
              width: getElementWidth(),
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
            className="h-full outline-none cursor-text text-editing"
            style={{ 
              minHeight: 'inherit',
              padding: '4px',
              width: getElementWidth(),
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
            className="h-full outline-none cursor-pointer text-element"
            style={{ 
              minHeight: 'inherit',
              padding: '4px',
              width: getElementWidth(),
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
      // Check if button is in text editing mode
      if (isSelected && isEditing) {
        const buttonText = element.buttonText || 'Button';
        return (
          <button
            ref={buttonEditRef}
            className="w-full h-full outline-none cursor-text"
            style={mergedStyles}
          >
            <span
              contentEditable={true}
              suppressContentEditableWarning
              onBlur={(e) => handleTextPropertyEdit('buttonText')(e as any)}
              onKeyDown={handleKeyDown as any}
              className="outline-none"
              autoFocus
            >
              {buttonText}
            </span>
          </button>
        );
      }
      
      return (
        <div className="w-full h-full">
          <ButtonElement
            element={element}
            isSelected={isSelected}
            onSelect={() => dispatch(selectElement(element.id))}
            onUpdate={(updates) => dispatch(updateElement({ id: element.id, updates }))}
          />
        </div>
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
            className="h-full"
            style={{
              objectFit: element.objectFit || 'contain',
              objectPosition: element.objectPosition || 'center',
              width: 'auto',
              maxWidth: '100%'
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
            className="h-full flex items-center justify-center text-gray-500 bg-gray-100 rounded border-2 border-dashed overflow-hidden cursor-pointer hover:bg-gray-200 transition-colors"
            style={{ 
              width: 'auto',
              maxWidth: '100%',
              minWidth: '120px'
            }}
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

    // CRITICAL: This is handled in the main render return - don't return children here
    
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
            width: getElementWidth(),
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
            className="h-full outline-none cursor-text text-editing"
            style={{ 
              minHeight: 'inherit',
              padding: '4px',
              width: getElementWidth(),
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
          className: `h-full outline-none ${content ? 'cursor-pointer' : ''}`,
          style: { 
            minHeight: 'inherit',
            width: getElementWidth(),
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
      // Special handling for form elements that need different structure
      if (element.type === 'checkbox' || element.type === 'radio') {
        const inputType = element.type;
        const labelText = element.content || 'Option';
        const isTextEditable = isSelected && isEditing;
        
        if (isTextEditable) {
          return (
            <label className="w-full h-full outline-none flex items-center gap-2" style={mergedStyles}>
              <input 
                type={inputType} 
                className="flex-shrink-0"
                name={element.type === 'radio' ? `radio-group-${element.id}` : undefined}
              />
              <span
                contentEditable={true}
                suppressContentEditableWarning
                onBlur={(e) => handleTextPropertyEdit('content')(e as any)}
                onKeyDown={handleKeyDown as any}
                className="text-sm outline-none cursor-text flex-1"
                autoFocus
              >
                {labelText}
              </span>
            </label>
          );
        }
        
        return (
          <label className="w-full h-full outline-none flex items-center gap-2 cursor-pointer" style={mergedStyles}>
            <input 
              type={inputType} 
              className="flex-shrink-0"
              name={element.type === 'radio' ? `radio-group-${element.id}` : undefined}
            />
            <span 
              className="text-sm"
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
            >
              {labelText}
            </span>
          </label>
        );
      }

      // Special handling for link elements
      if (element.type === 'link') {
        const linkText = element.content || 'Lien';
        const isTextEditable = isSelected && isEditing;
        
        if (isTextEditable) {
          return (
            <span
              contentEditable={true}
              suppressContentEditableWarning
              onBlur={(e) => handleTextPropertyEdit('content')(e as any)}
              onKeyDown={handleKeyDown as any}
              className="h-full outline-none cursor-text"
              style={{...mergedStyles, width: getElementWidth()}}
              autoFocus
            >
              {linkText}
            </span>
          );
        }
        
        return (
          <a
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="h-full outline-none cursor-pointer"
            style={{...mergedStyles, width: getElementWidth()}}
          >
            {linkText}
          </a>
        );
      }

      // Special handling for code elements
      if (element.type === 'code') {
        const codeContent = element.content || '// Votre code ici';
        const isTextEditable = isSelected && isEditing;
        
        if (isTextEditable) {
          return (
            <pre
              ref={preEditRef}
              contentEditable={true}
              suppressContentEditableWarning
              onBlur={(e) => handleTextPropertyEdit('content')(e as any)}
              onKeyDown={handleKeyDown as any}
              className="h-full outline-none cursor-text"
              style={{...mergedStyles, width: getElementWidth()}}
              autoFocus
            >
              {codeContent}
            </pre>
          );
        }
        
        return (
          <pre
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="h-full outline-none cursor-pointer"
            style={{...mergedStyles, width: getElementWidth()}}
          >
            {codeContent}
          </pre>
        );
      }
      
      // For other form elements and special types
      const htmlTag = element.htmlTag || 'div';
      const content = element.content || '';
      
      // Check if this element type can have editable text
      const canEditText = ['input', 'textarea'].includes(element.type) && content;
      const isTextEditable = isSelected && isEditing && canEditText;
      
      if (isTextEditable && element.type === 'textarea') {
        return (
          <textarea
            ref={textareaEditRef}
            value={content}
            onChange={(e) => {
              dispatch(updateElement({
                id: element.id,
                updates: { content: e.target.value }
              }));
            }}
            onBlur={() => setIsEditing(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsEditing(false);
              }
            }}
            className="h-full outline-none cursor-text resize-none"
            style={{...mergedStyles, width: getElementWidth()}}
            autoFocus
            placeholder="Entrez votre texte..."
          />
        );
      }
      
      const elementProps: any = {
        className: 'h-full outline-none',
        style: { 
          minHeight: 'inherit',
          width: getElementWidth(),
          height: '100%',
          boxSizing: 'border-box',
          padding: content ? '4px' : '8px',
          display: element.isContainer ? 'flex' : 'block',
          flexDirection: element.flexDirection || 'column',
          justifyContent: element.justifyContent || 'flex-start',
          alignItems: element.alignItems || 'stretch',
          ...mergedStyles
        }
      };

      // Add special attributes for specific elements
      if (element.type === 'input') {
        elementProps.placeholder = 'Entrez votre texte...';
        elementProps.type = 'text';
      } else if (['video', 'audio'].includes(element.type)) {
        elementProps.controls = true;
      }

      // Add double-click handler for elements with content
      if (content && !element.isContainer && !['video', 'audio', 'input'].includes(element.type)) {
        elementProps.onDoubleClick = (e: React.MouseEvent) => {
          e.stopPropagation();
          setIsEditing(true);
        };
        elementProps.className += ' cursor-pointer';
      }

      // Only set innerHTML OR children, never both
      if (content) {
        elementProps.dangerouslySetInnerHTML = { __html: content };
        return React.createElement(htmlTag, elementProps);
      } else {
        return React.createElement(htmlTag, elementProps);
      }
    }

    return <div className="h-full" style={{width: getElementWidth()}} />;
  };

  // Check if this element can accept drops using centralized logic
  const canAcceptDrop = isValidDropTarget(element);
  
  // Clean professional feedback - only show selection outlines
  const getOutlineStyle = () => {
    if (isSelected) return '2px solid #3b82f6';
    return undefined;
  };

  const getBackgroundColor = (mergedBgColor?: string) => {
    // Clean hover experience - no background overlays
    return mergedBgColor || mergedStyles.backgroundColor;
  };

  const getBoxShadow = () => {
    // Clean selection shadow only
    if (isSelected) return '0 0 0 1px rgba(59, 130, 246, 0.3)';
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
      
    }
    
    return baseStyles;
  }, [element.styles, element.classes, customClasses]);

  // CRITICAL: FIXED HTML positioning logic - exactly like real HTML
  // Elements follow normal document flow unless explicitly positioned by dragging
  
  let basePosition: string;
  let baseLeft: number | undefined;
  let baseTop: number | undefined;
  
  if (isComponentChild || isComponentRoot) {
    // Component elements use relative positioning within containers
    basePosition = 'relative';
    baseLeft = undefined;
    baseTop = undefined;
  } else if (element.isExplicitlyPositioned && element.x !== undefined && element.y !== undefined) {
    // Only use absolute positioning for elements that were explicitly dragged
    basePosition = 'absolute';
    baseLeft = element.x;
    baseTop = element.y;
    // console.log('POSITIONING DEBUG - Explicitly positioned element:', {
    //   id: element.id.substring(0, 15) + '...',
    //   x: element.x,
    //   y: element.y,
    //   left: baseLeft,
    //   top: baseTop
    // });
  } else {
    // ALL other elements follow normal document flow
    basePosition = element.parent && element.parent !== 'root' ? 'static' : 'relative';
    baseLeft = undefined;
    baseTop = undefined;
  }

  // Check if element is inside a flex container to determine width behavior
  const parentElement = element.parent && element.parent !== 'root' ? currentElements[element.parent] : null;
  const isInFlexContainer = parentElement?.styles?.display === 'flex' || parentElement?.isContainer;
  
  // Determine width based on element type and flex context
  const getElementWidth = () => {
    if (['text', 'heading', 'list'].includes(element.type)) {
      // For text-based elements, use auto width in flex containers to respect justification
      return isInFlexContainer ? 'auto' : '100%';
    }
    if (element.type === 'image') {
      // Images already handled with auto width in their specific rendering
      return mergedStyles.width || element.width;
    }
    // For other elements, use specified width or 100% if width is 0
    return mergedStyles.width || (element.width === 0 ? '100%' : element.width);
  };

  const combinedStyles: React.CSSProperties = {
    position: basePosition as any,
    left: baseLeft,
    top: baseTop,
    width: getElementWidth(),
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

  // Clean professional hover system - no debug logging needed

  // Determine professional selection state
  const getSelectionState = () => {
    if (isDraggingForReorder && draggedElementId === element.id) return 'dragging';
    if (isEditing) return 'editing';
    if (isSelected) return 'selected';
    if (isThisElementHovered) return 'hover';
    return 'idle';
  };

  const selectionState = getSelectionState();

  return (
    <ElementContextMenu elementId={element.id}>
      <div
        ref={elementRef}
        className={`
          selectable-block
          canvas-element
          ${element.classes?.join(' ') || ''}
          ${getSiblingSpacingClass()}
          ${isDragActive ? 'drag-transition-padding' : ''}
          ${isExpandedContainer ? 'drag-expand-padding' : ''}
        `}
        data-state={selectionState}
        data-locked="false"
        data-invalid="false"
        aria-selected={isSelected}
        tabIndex={0}
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
          // CRITICAL: No additional positioning needed - combinedStyles handles it correctly
        }}
        data-element-id={element.id}
        data-container={element.isContainer ? 'true' : 'false'}
        data-accepts={element.isContainer ? 'text,image,button,rectangle,heading,container' : ''}
        data-element-type={element.type}
        data-testid={`canvas-element-${element.id}`}
      >
      {/* Professional Selection/Drag Handle - Always visible when selected */}
      {isSelected && (
        <div 
          className="selection-handle" 
          data-testid="selection-handle"
          onClick={(e) => {
            e.stopPropagation();
            dispatch(setSelectedTool('hand'));
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            // console.log('DRAG HANDLE DEBUG - Mouse down on selection handle for:', element.id);
            
            // Auto-switch to hand tool and initiate drag
            dispatch(setSelectedTool('hand'));
            
            // Trigger drag from handle
            const dragEvent = new CustomEvent('dragHandleMouseDown', {
              detail: { elementId: element.id, originalEvent: e }
            });
            window.dispatchEvent(dragEvent);
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M2 2h2v2H2V2zm3 0h2v2H5V2zm3 0h2v2H8V2zM2 5h2v2H2V5zm3 0h2v2H5V5zm3 0h2v2H8V5zM2 8h2v2H2V8zm3 0h2v2H5V8zm3 0h2v2H8V8z"/>
          </svg>
        </div>
      )}

      {renderContent()}
      
      {/* CRITICAL: Render container children inside the container */}
      {((element.type === 'container' || element.type === 'rectangle' || element.isContainer || isComponentRoot) && element.children) && (
        element.children.map(childId => {
          const child = currentElements[childId];
          if (!child) {
            // console.log('Child not found in currentElements:', childId, 'available:', Object.keys(currentElements).length);
            return null;
          }
          return (
            <CanvasElement 
              key={child.id} 
              element={child}
              isSelected={child.id === selectedElementId}
              isHovered={child.id === actualHoveredElementId}
              hoveredZone={child.id === actualHoveredElementId ? actualHoveredZone : null}
              hoveredElementId={actualHoveredElementId}
              expandedContainerId={expandedContainerId}
              currentElements={currentElements}
            />
          );
        })
      )}
      
      {/* Professional Resize Handles for Editing Mode */}
      {selectionState === 'editing' && (
        <>
          <div className="resizer tl" data-testid="resize-handle-tl" />
          <div className="resizer tr" data-testid="resize-handle-tr" />
          <div className="resizer bl" data-testid="resize-handle-bl" />
          <div className="resizer br" data-testid="resize-handle-br" />
        </>
      )}
    </div>
    </ElementContextMenu>
  );
};

// Export with memo to prevent unnecessary re-renders
export default memo(CanvasElement);
