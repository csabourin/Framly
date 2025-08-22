import { CanvasElement } from '../types/canvas';

export function generateUniqueId(type: string): string {
  return `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function createDefaultElement(type: CanvasElement['type'], x: number = 0, y: number = 0): CanvasElement {
  const id = generateUniqueId(type);
  
  const baseElement: CanvasElement = {
    id,
    type,
    x,
    y,
    width: 200,
    height: 100,
    styles: {},
    classes: [],
  };
  
  switch (type) {
    case 'rectangle':
      return {
        ...baseElement,
        width: 0, // Will be set to 100% in styles
        height: 80, // Reasonable default height
        isContainer: true,
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        children: [],
        styles: {
          backgroundColor: '#f3f4f6',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          padding: '16px',
          width: '100%',
          minHeight: '80px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        },
        classes: [`rectangle-${Date.now()}`],
      };
      
    case 'text':
      return {
        ...baseElement,
        width: 0, // Will be set to 100% in styles
        height: 40,
        content: 'Edit this text',
        textDisplay: 'block',
        styles: {
          fontSize: '16px',
          fontWeight: '400',
          color: '#1f2937',
          padding: '8px',
          display: 'block',
          width: '100%',
        },
        classes: [`text-${Date.now()}`],
      };
      
    case 'heading':
      return {
        ...baseElement,
        width: 0, // Will be set to 100% in styles
        height: 50,
        content: 'Edit this heading',
        headingLevel: 1,
        styles: {
          fontSize: '32px',
          fontWeight: '700',
          color: '#111827',
          padding: '8px',
          display: 'block',
          width: '100%',
          lineHeight: '1.2',
          marginBottom: '16px',
        },
        classes: [`heading-${Date.now()}`],
      };
      
    case 'list':
      return {
        ...baseElement,
        width: 0, // Will be set to 100% in styles
        height: 120,
        listType: 'unordered',
        listItems: ['List item 1', 'List item 2', 'List item 3'],
        styles: {
          fontSize: '16px',
          fontWeight: '400',
          color: '#374151',
          padding: '8px',
          display: 'block',
          width: '100%',
          lineHeight: '1.6',
        },
        classes: [`list-${Date.now()}`],
      };
      
    case 'image':
      return {
        ...baseElement,
        width: 300,
        height: 200,
        imageUrl: '',
        imageRatio: 'auto',
        imageJustifySelf: 'flex-start',
        widthUnit: 'px',
        heightUnit: 'px',
        styles: {
          backgroundColor: '#e5e7eb',
          borderRadius: '6px',
          backgroundImage: 'linear-gradient(45deg, #e5e7eb 25%, transparent 25%, transparent 75%, #e5e7eb 75%, #e5e7eb), linear-gradient(45deg, #e5e7eb 25%, transparent 25%, transparent 75%, #e5e7eb 75%, #e5e7eb)',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 10px 10px',
          objectFit: 'cover',
        },
        classes: [`image-${Date.now()}`],
      };
      
    case 'container':
      return {
        ...baseElement,
        width: 300,
        height: 200,
        isContainer: true,
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        children: [],
        styles: {
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '16px',
          backgroundColor: '#ffffff',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
        },
        classes: [`container-${Date.now()}`],
      };

    case 'button':
      return {
        ...baseElement,
        width: 120,
        height: 40,
        buttonText: 'Button',
        currentButtonState: 'default' as const,
        styles: (() => {
          // Try to load default button styles from localStorage
          const defaultStyles = localStorage.getItem('defaultButtonStyles');
          if (defaultStyles) {
            try {
              return JSON.parse(defaultStyles);
            } catch (e) {
              console.warn('Failed to parse default button styles');
            }
          }
          
          // Default professional button styles
          return {
            backgroundColor: '#3b82f6',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease-in-out',
            textAlign: 'center',
            lineHeight: '1.5',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            minWidth: '100px'
          };
        })(),
        classes: [`button-${Date.now()}`],
      };

    // Form elements
    case 'input':
      return {
        ...baseElement,
        width: 0,
        height: 40,
        content: '',
        styles: {
          width: '100%',
          padding: '8px 12px',
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          fontSize: '14px',
          backgroundColor: '#ffffff',
        },
        htmlTag: 'input',
        classes: [`input-${Date.now()}`],
      };

    case 'textarea':
      return {
        ...baseElement,
        width: 0,
        height: 100,
        content: 'Entrez votre texte...',
        styles: {
          width: '100%',
          padding: '8px 12px',
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          fontSize: '14px',
          backgroundColor: '#ffffff',
          resize: 'vertical',
        },
        htmlTag: 'textarea',
        classes: [`textarea-${Date.now()}`],
      };

    case 'checkbox':
      return {
        ...baseElement,
        width: 100,
        height: 20,
        content: 'Option',
        styles: {
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
        },
        htmlTag: 'label',
        classes: [`checkbox-${Date.now()}`],
      };

    case 'radio':
      return {
        ...baseElement,
        width: 100,
        height: 20,
        content: 'Option',
        styles: {
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
        },
        htmlTag: 'label',
        classes: [`radio-${Date.now()}`],
      };

    case 'select':
      return {
        ...baseElement,
        width: 0,
        height: 40,
        content: '<option>Choisir une option</option>',
        styles: {
          width: '100%',
          padding: '8px 12px',
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          fontSize: '14px',
          backgroundColor: '#ffffff',
        },
        htmlTag: 'select',
        classes: [`select-${Date.now()}`],
      };

    // Structural elements
    case 'section':
      return {
        ...baseElement,
        width: 0,
        height: 200,
        content: '',
        isContainer: true,
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        children: [],
        styles: {
          width: '100%',
          minHeight: '200px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
        },
        htmlTag: 'section',
        classes: [`section-${Date.now()}`],
      };

    case 'nav':
      return {
        ...baseElement,
        width: 0,
        height: 60,
        content: '',
        isContainer: true,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        children: [],
        styles: {
          width: '100%',
          height: '60px',
          padding: '0 24px',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
        },
        htmlTag: 'nav',
        classes: [`nav-${Date.now()}`],
      };

    case 'header':
      return {
        ...baseElement,
        width: 0,
        height: 150,
        content: '',
        isContainer: true,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        children: [],
        styles: {
          width: '100%',
          height: '150px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          textAlign: 'center',
          backgroundColor: '#f1f5f9',
        },
        htmlTag: 'header',
        classes: [`header-${Date.now()}`],
      };

    case 'footer':
      return {
        ...baseElement,
        width: 0,
        height: 100,
        content: '',
        isContainer: true,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        children: [],
        styles: {
          width: '100%',
          height: '100px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'row',
          backgroundColor: '#1f2937',
          color: '#ffffff',
        },
        htmlTag: 'footer',
        classes: [`footer-${Date.now()}`],
      };

    case 'article':
      return {
        ...baseElement,
        width: 0,
        height: 300,
        content: '',
        isContainer: true,
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        children: [],
        styles: {
          width: '100%',
          minHeight: '300px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        },
        htmlTag: 'article',
        classes: [`article-${Date.now()}`],
      };

    // Media elements
    case 'video':
      return {
        ...baseElement,
        width: 0,
        height: 200,
        content: '',
        styles: {
          width: '100%',
          height: '200px',
          backgroundColor: '#000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontSize: '14px',
        },
        htmlTag: 'video',
        classes: [`video-${Date.now()}`],
      };

    case 'audio':
      return {
        ...baseElement,
        width: 0,
        height: 40,
        content: '',
        styles: {
          width: '100%',
          height: '40px',
        },
        htmlTag: 'audio',
        classes: [`audio-${Date.now()}`],
      };

    // Interactive elements
    case 'link':
      return {
        ...baseElement,
        width: 0,
        height: 30,
        content: 'Lien',
        styles: {
          color: '#2563eb',
          textDecoration: 'underline',
          fontSize: '16px',
          padding: '4px',
          display: 'inline-block',
          cursor: 'pointer',
        },
        htmlTag: 'a',
        classes: [`link-${Date.now()}`],
      };

    // Content elements
    case 'code':
      return {
        ...baseElement,
        width: 0,
        height: 100,
        content: '// Votre code ici\nconsole.log("Hello World");',
        styles: {
          width: '100%',
          padding: '16px',
          backgroundColor: '#1f2937',
          color: '#f9fafb',
          fontFamily: 'monospace',
          fontSize: '14px',
          borderRadius: '6px',
          whiteSpace: 'pre-wrap',
          overflow: 'auto',
        },
        htmlTag: 'pre',
        classes: [`code-${Date.now()}`],
      };

    case 'divider':
      return {
        ...baseElement,
        width: 0,
        height: 1,
        content: '',
        styles: {
          width: '100%',
          height: '1px',
          backgroundColor: '#d1d5db',
          border: 'none',
          margin: '16px 0',
        },
        htmlTag: 'hr',
        classes: [`divider-${Date.now()}`],
      };
      
    default:
      return baseElement;
  }
}

export function isPointInElement(x: number, y: number, element: CanvasElement, tolerance: number = 3): boolean {
  return x >= element.x - tolerance && 
         x <= element.x + element.width + tolerance && 
         y >= element.y - tolerance && 
         y <= element.y + element.height + tolerance;
}

export function getElementAtPoint(x: number, y: number, elements: Record<string, CanvasElement>, zoomLevel: number = 1, draggedElementId?: string): CanvasElement | null {
  // Use DOM-based detection for flexbox layouts
  const canvasElement = document.querySelector('[data-testid="canvas-container"]');
  if (!canvasElement) return null;
  
  const canvasRect = canvasElement.getBoundingClientRect();
  // Convert canvas coordinates to page coordinates accounting for zoom
  const pageX = canvasRect.left + (x * zoomLevel);
  const pageY = canvasRect.top + (y * zoomLevel);
  
  // Temporarily hide the dragged element to improve detection
  let draggedElement: HTMLElement | null = null;
  let originalDisplay = '';
  
  if (draggedElementId) {
    draggedElement = document.querySelector(`[data-element-id="${draggedElementId}"]`) as HTMLElement;
    if (draggedElement) {
      originalDisplay = draggedElement.style.display;
      draggedElement.style.display = 'none';
    }
  }
  
  try {
    // Get the element at this point using DOM
    const elementAtPoint = document.elementFromPoint(pageX, pageY);
    if (!elementAtPoint) return null;
    
    // First try DOM-based detection for more accurate flexbox positioning
    let foundElements: { element: CanvasElement; depth: number }[] = [];
    let current: Element | null = elementAtPoint;
    let depth = 0;
    
    while (current && current !== canvasElement) {
      // Skip insertion indicators and dragged elements
      if (current.hasAttribute('data-testid') && current.getAttribute('data-testid') === 'insertion-indicator') {
        current = current.parentElement;
        depth++;
        continue;
      }
      
      const elementId = current.getAttribute('data-element-id');
      if (elementId && elements[elementId] && elementId !== 'root' && elementId !== draggedElementId) {
        foundElements.push({ element: elements[elementId], depth });
      }
      
      current = current.parentElement;
      depth++;
    }
    
    // Return the element with the smallest depth (deepest in DOM)
    if (foundElements.length > 0) {
      foundElements.sort((a, b) => a.depth - b.depth);
      console.log('DOM detection found:', foundElements[0].element.id);
      return foundElements[0].element;
    }
    
    // Fallback to bounds-based detection if DOM detection fails
    const nonRootElements = Object.values(elements).filter(el => el.id !== 'root' && el.id !== draggedElementId);
    
    for (const element of nonRootElements) {
      if (isPointInElement(x, y, element, 4)) {
        console.log('Bounds detection found:', element.id);
        return element;
      }
    }
    
    // Return root as final fallback
    console.log('Falling back to root');
    return elements.root || null;
  } finally {
    // Restore the dragged element
    if (draggedElement) {
      draggedElement.style.display = originalDisplay;
    }
  }
}

export function calculateSnapPosition(x: number, y: number, snapGrid: number = 10): { x: number; y: number } {
  return {
    x: Math.round(x / snapGrid) * snapGrid,
    y: Math.round(y / snapGrid) * snapGrid,
  };
}

export function getBoundingRect(elements: CanvasElement[]): { x: number; y: number; width: number; height: number } {
  if (elements.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  elements.forEach(element => {
    minX = Math.min(minX, element.x);
    minY = Math.min(minY, element.y);
    maxX = Math.max(maxX, element.x + element.width);
    maxY = Math.max(maxY, element.y + element.height);
  });
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function validateCSSClassName(className: string): boolean {
  // CSS class name validation
  const validPattern = /^[a-zA-Z_-][a-zA-Z0-9_-]*$/;
  return validPattern.test(className);
}

export function generateCSSClassSuggestions(type: CanvasElement['type']): string[] {
  const baseSuggestions = ['container', 'wrapper', 'section', 'content'];
  
  switch (type) {
    case 'text':
      return ['heading', 'title', 'subtitle', 'paragraph', 'caption', 'label'];
    case 'image':
      return ['hero-image', 'thumbnail', 'avatar', 'logo', 'icon'];
    case 'container':
      return ['header', 'footer', 'sidebar', 'main', 'card', 'modal'];
    case 'rectangle':
      return ['box', 'panel', 'feature', 'highlight', 'banner'];
    default:
      return baseSuggestions;
  }
}

// Check if an element can be dropped inside another element
export function canDropInside(elementType: string, targetElement: CanvasElement): boolean {
  // Text, headings, lists and images cannot contain other elements
  if (['text', 'heading', 'list', 'image'].includes(targetElement.type)) {
    return false;
  }
  
  // Containers and rectangles can contain other elements
  return targetElement.type === 'container' || targetElement.type === 'rectangle';
}

// Check if a drop operation is valid
export function isValidDropTarget(targetElement: CanvasElement | null): boolean {
  if (!targetElement) return false;
  return targetElement.type === 'container' || targetElement.type === 'rectangle';
}
