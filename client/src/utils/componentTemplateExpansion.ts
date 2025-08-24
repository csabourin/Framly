import { CanvasElement, ComponentDef } from '../types/canvas';
import { nanoid } from 'nanoid';

/**
 * Expand a component template into a flat element structure for canvas rendering
 * This converts the nested template structure into individual elements with proper IDs
 */
export function expandComponentTemplate(
  instance: CanvasElement,
  componentDef: ComponentDef
): Record<string, CanvasElement> {
  if (!instance.componentRef || !componentDef.template) {
    return {};
  }

  const expandedElements: Record<string, CanvasElement> = {};
  const idMap = new Map<string, string>();

  /**
   * Recursively expand template elements and assign new IDs
   */
  function expandElement(
    templateElement: any, // Template may have nested objects or string IDs
    newParentId: string | null = null
  ): string {
    let element: CanvasElement;
    
    // Handle different template structures
    if (typeof templateElement === 'string') {
      // Template has string ID references (flat structure)
      console.warn('Template has string ID reference, cannot expand:', templateElement);
      return templateElement;
    } else if (typeof templateElement === 'object' && templateElement.id) {
      // Template has nested element objects (tree structure from componentTreeCapture)
      element = templateElement;
    } else {
      console.warn('Invalid template element structure:', templateElement);
      return '';
    }

    // Generate new ID for the expanded element
    const newId = `${instance.id}-child-${nanoid()}`;
    idMap.set(element.id, newId);

    // Create expanded element with position relative to instance
    const expandedElement: CanvasElement = {
      ...element,
      id: newId,
      parent: newParentId || instance.id,
      
      // Adjust position relative to instance
      x: instance.x + (element.x || 0),
      y: instance.y + (element.y || 0),
      
      // Preserve all element properties
      styles: element.styles ? { ...element.styles } : {},
      classes: element.classes ? [...element.classes] : [],
      
      // Initialize children as empty array (will be populated below)
      children: []
    };

    // Store the expanded element
    expandedElements[newId] = expandedElement;

    // Recursively expand children if they exist
    if ((element as any).children && Array.isArray((element as any).children)) {
      const childIds: string[] = [];
      
      for (const child of (element as any).children) {
        const childId = expandElement(child, newId);
        if (childId) {
          childIds.push(childId);
        }
      }
      
      expandedElement.children = childIds;
    }

    return newId;
  }

  // Start expansion from the template root
  const rootElement = componentDef.template;
  
  // Create the root instance element (the component itself)
  const rootInstanceElement: CanvasElement = {
    ...rootElement,
    id: instance.id,
    x: instance.x,
    y: instance.y,
    width: instance.width,
    height: instance.height,
    parent: instance.parent,
    componentRef: instance.componentRef,
    children: []
  };

  expandedElements[instance.id] = rootInstanceElement;

  // Expand template children
  if ((rootElement as any).children && Array.isArray((rootElement as any).children)) {
    const childIds: string[] = [];
    
    for (const child of (rootElement as any).children) {
      const childId = expandElement(child, instance.id);
      if (childId) {
        childIds.push(childId);
      }
    }
    
    rootInstanceElement.children = childIds;
  }

  console.log('Expanded component template:', {
    componentName: componentDef.name,
    instanceId: instance.id,
    totalElements: Object.keys(expandedElements).length,
    rootChildren: rootInstanceElement.children?.length || 0
  });

  return expandedElements;
}

/**
 * Get all element IDs that belong to a component instance
 */
export function getComponentInstanceElementIds(
  instanceId: string,
  allElements: Record<string, CanvasElement>
): string[] {
  const elementIds: string[] = [];
  
  function collectIds(elementId: string) {
    const element = allElements[elementId];
    if (!element) return;
    
    elementIds.push(elementId);
    
    if (element.children) {
      element.children.forEach(childId => collectIds(childId));
    }
  }
  
  collectIds(instanceId);
  return elementIds;
}

/**
 * Check if an element belongs to a component instance
 */
export function isElementInComponentInstance(
  elementId: string,
  allElements: Record<string, CanvasElement>
): { isInInstance: boolean; instanceId: string | null } {
  let currentElement = allElements[elementId];
  
  while (currentElement) {
    if (currentElement.componentRef) {
      return {
        isInInstance: true,
        instanceId: currentElement.id
      };
    }
    
    if (!currentElement.parent || currentElement.parent === 'root') {
      break;
    }
    
    currentElement = allElements[currentElement.parent];
  }
  
  return {
    isInInstance: false,
    instanceId: null
  };
}