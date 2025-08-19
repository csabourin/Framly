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
        height: 40,
        content: 'Edit this text',
        textDisplay: 'block',
        styles: {
          fontSize: '16px',
          fontWeight: '400',
          color: '#1f2937',
          padding: '8px',
          display: 'block',
        },
        classes: [`text-${Date.now()}`],
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
      
    default:
      return baseElement;
  }
}

export function isPointInElement(x: number, y: number, element: CanvasElement): boolean {
  return x >= element.x && 
         x <= element.x + element.width && 
         y >= element.y && 
         y <= element.y + element.height;
}

export function getElementAtPoint(x: number, y: number, elements: Record<string, CanvasElement>, zoomLevel: number = 1): CanvasElement | null {
  // Use DOM-based detection for flexbox layouts
  const canvasElement = document.querySelector('[data-testid="canvas-container"]');
  if (!canvasElement) return null;
  
  const canvasRect = canvasElement.getBoundingClientRect();
  // Convert canvas coordinates to page coordinates accounting for zoom
  const pageX = canvasRect.left + (x * zoomLevel);
  const pageY = canvasRect.top + (y * zoomLevel);
  
  // Get the element at this point using DOM
  const elementAtPoint = document.elementFromPoint(pageX, pageY);
  if (!elementAtPoint) return null;
  
  console.log('Element detection:', { pageX, pageY, elementAtPoint, canvasElement });
  
  // Find the closest element with data-element-id, excluding insertion indicators
  let current: Element | null = elementAtPoint;
  while (current && current !== canvasElement) {
    // Skip insertion indicators
    if (current.hasAttribute('data-testid') && current.getAttribute('data-testid') === 'insertion-indicator') {
      current = current.parentElement;
      continue;
    }
    
    const elementId = current.getAttribute('data-element-id');
    console.log('Checking element:', current, 'elementId:', elementId);
    if (elementId && elements[elementId] && elementId !== 'root') {
      console.log('Found specific element:', elementId);
      return elements[elementId];
    }
    current = current.parentElement;
  }
  
  // If no specific element found, return root
  console.log('Defaulting to root');
  return elements.root || null;
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
