import { CanvasElement, CustomComponent } from '../types/canvas';

export function generateComponentFromElements(
  rootElementId: string,
  elements: Record<string, CanvasElement>,
  name: string,
  category: string = 'custom'
): CustomComponent {
  // Get all elements that should be included (root element + all children)
  const elementsToInclude = getElementsToInclude(rootElementId, elements);
  
  // Generate a simple SVG thumbnail
  const rootElement = elements[rootElementId];
  const thumbnail = generateThumbnail(rootElement);
  
  return {
    id: `component-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    category,
    thumbnail,
    elements: elementsToInclude,
    rootElementId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function getElementsToInclude(
  elementId: string, 
  elements: Record<string, CanvasElement>
): Record<string, CanvasElement> {
  const result: Record<string, CanvasElement> = {};
  const element = elements[elementId];
  
  if (!element) return result;
  
  // Add the element itself
  result[elementId] = element;
  
  // Recursively add all children
  if (element.children) {
    element.children.forEach(childId => {
      const childElements = getElementsToInclude(childId, elements);
      Object.assign(result, childElements);
    });
  }
  
  return result;
}

export function generateThumbnail(element: CanvasElement): string {
  const width = 80;
  const height = 60;
  
  switch (element.type) {
    case 'rectangle':
      return `data:image/svg+xml,${encodeURIComponent(`
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect x="10" y="15" width="60" height="30" fill="${element.styles.backgroundColor || '#f3f4f6'}" stroke="${element.styles.border?.includes('solid') ? element.styles.border.split(' ')[2] || '#d1d5db' : '#d1d5db'}" rx="4"/>
        </svg>
      `)}`;
    case 'text':
      return `data:image/svg+xml,${encodeURIComponent(`
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <text x="10" y="35" font-family="Arial" font-size="12" fill="${element.styles.color || '#000'}">Text</text>
        </svg>
      `)}`;
    case 'container':
      return `data:image/svg+xml,${encodeURIComponent(`
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect x="5" y="10" width="70" height="40" fill="none" stroke="#3b82f6" stroke-width="2" stroke-dasharray="4,2" rx="4"/>
        </svg>
      `)}`;
    case 'image':
      return `data:image/svg+xml,${encodeURIComponent(`
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect x="10" y="15" width="60" height="30" fill="#e5e7eb" stroke="#d1d5db" rx="4"/>
          <circle cx="25" cy="25" r="3" fill="#9ca3af"/>
          <polygon points="35,35 50,20 65,35" fill="#9ca3af"/>
        </svg>
      `)}`;
    default:
      return `data:image/svg+xml,${encodeURIComponent(`
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect x="10" y="15" width="60" height="30" fill="#f3f4f6" stroke="#d1d5db" rx="4"/>
        </svg>
      `)}`;
  }
}

export function instantiateComponent(
  component: CustomComponent,
  insertX: number = 50,
  insertY: number = 50
): { elements: Record<string, CanvasElement>; rootElementId: string } {
  // Generate new IDs for all elements to avoid conflicts
  const elementIdMap = new Map<string, string>();
  const newElements: Record<string, CanvasElement> = {};
  
  // First pass: create new IDs for all elements using crypto.randomUUID for uniqueness
  Object.keys(component.elements).forEach(oldId => {
    const uuid = crypto.randomUUID();
    const newId = `${component.elements[oldId].type}-${uuid}`;
    elementIdMap.set(oldId, newId);
  });
  
  // Second pass: create new elements with updated IDs and references
  Object.entries(component.elements).forEach(([oldId, element]) => {
    const newId = elementIdMap.get(oldId)!;
    const newElement: CanvasElement = {
      ...element,
      id: newId,
      parent: element.parent ? (elementIdMap.get(element.parent) || 'root') : 'root',
      children: element.children?.map(childId => elementIdMap.get(childId)!).filter(Boolean) || []
    };
    
    // If this is the root element, position it at the specified location
    if (oldId === component.rootElementId) {
      newElement.x = isFinite(insertX) ? insertX : 50;
      newElement.y = isFinite(insertY) ? insertY : 50;
      // Don't set parent here - let the caller decide
    }
    
    newElements[newId] = newElement;
  });
  
  return {
    elements: newElements,
    rootElementId: elementIdMap.get(component.rootElementId)!
  };
}