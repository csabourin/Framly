import { CanvasElement, ComponentDef, ComponentId } from '../types/canvas';
import { nanoid } from 'nanoid';

// Component instance management utilities

/**
 * Check if an element is a component instance
 */
export function isComponentInstance(element: CanvasElement): boolean {
  return !!element.componentRef;
}

/**
 * Create a component instance from a selected element
 */
export function createComponentInstance(
  element: CanvasElement, 
  componentId: ComponentId
): CanvasElement {
  return {
    ...element,
    componentRef: {
      componentId,
      overrides: {}
    },
    children: [], // Instances don't own real children; rendering expands from template
  };
}

/**
 * Detach a component instance, converting it back to regular elements
 */
export function detachComponentInstance(
  instance: CanvasElement,
  componentDef: ComponentDef,
  generateNewIds: boolean = true
): { rootElement: CanvasElement; allElements: Record<string, CanvasElement> } {
  if (!instance.componentRef) {
    throw new Error('Element is not a component instance');
  }

  // Deep clone the template
  const clonedElements = deepCloneTemplate(componentDef.template, generateNewIds);
  const rootElement = Object.values(clonedElements)[0];

  // Apply position and size from instance
  if (rootElement) {
    rootElement.x = instance.x;
    rootElement.y = instance.y;
    rootElement.width = instance.width;
    rootElement.height = instance.height;
    rootElement.parent = instance.parent;
    
    // Remove componentRef to make it a regular element
    delete rootElement.componentRef;
  }

  return {
    rootElement,
    allElements: clonedElements
  };
}

/**
 * Deep clone a template with optional new ID generation
 */
function deepCloneTemplate(
  template: CanvasElement, 
  generateNewIds: boolean = true,
  idMap: Map<string, string> = new Map()
): Record<string, CanvasElement> {
  const elements: Record<string, CanvasElement> = {};
  
  function cloneElement(element: CanvasElement): CanvasElement {
    const newId = generateNewIds ? nanoid() : element.id;
    if (generateNewIds) {
      idMap.set(element.id, newId);
    }
    
    const cloned: CanvasElement = {
      ...element,
      id: newId,
      children: element.children ? [] : undefined,
      // Preserve all properties including image-specific ones
      imageBase64: element.imageBase64,
      imageUrl: element.imageUrl,
      imageAlt: element.imageAlt,
      imageTitle: element.imageTitle,
      objectFit: element.objectFit,
      objectPosition: element.objectPosition,
      styles: element.styles ? { ...element.styles } : {},
      classes: element.classes ? [...element.classes] : undefined
    };
    
    elements[newId] = cloned;
    return cloned;
  }

  // Start with the root element
  const rootClone = cloneElement(template);
  
  // Clone children recursively
  if (template.children) {
    rootClone.children = template.children.map(childId => {
      // This would need access to the full element tree
      // For now, return the child ID as-is
      // In practice, this should be called with the full template subtree
      return generateNewIds ? idMap.get(childId) || childId : childId;
    });
  }
  
  return elements;
}

/**
 * Render a component instance by expanding its template
 */
export function renderComponentInstance(
  instance: CanvasElement,
  componentDef: ComponentDef
): CanvasElement {
  if (!instance.componentRef) {
    return instance;
  }

  // Create a virtual rendered version
  const rendered: CanvasElement = {
    ...componentDef.template,
    id: instance.id,
    x: instance.x,
    y: instance.y,
    width: instance.width,
    height: instance.height,
    parent: instance.parent,
    componentRef: instance.componentRef
  };

  // Apply any overrides if implemented
  if (instance.componentRef.overrides) {
    Object.assign(rendered, instance.componentRef.overrides);
  }

  return rendered;
}

/**
 * Check for circular dependencies when using components
 * This checks if targetComponentId is used anywhere within the elementId subtree
 */
export function hasCircularDependency(
  elementId: string,
  elements: Record<string, CanvasElement>,
  targetComponentId: ComponentId
): boolean {
  const visited = new Set<string>();
  
  function checkElement(id: string): boolean {
    if (visited.has(id)) return false;
    visited.add(id);
    
    const element = elements[id];
    if (!element) return false;
    
    // If this element is a component instance of the target component, it's circular
    if (element.componentRef?.componentId === targetComponentId) {
      return true;
    }
    
    // Check children recursively
    if (element.children) {
      return element.children.some(childId => checkElement(childId));
    }
    
    return false;
  }
  
  return checkElement(elementId);
}

/**
 * Check if an element tree contains any component instances
 * Used when creating new components to warn about nested components
 */
export function containsComponentInstances(
  elementId: string,
  elements: Record<string, CanvasElement>
): { hasInstances: boolean; instanceIds: string[] } {
  const instanceIds: string[] = [];
  const visited = new Set<string>();
  
  function checkElement(id: string): void {
    if (visited.has(id)) return;
    visited.add(id);
    
    const element = elements[id];
    if (!element) return;
    
    // Check if this element is a component instance
    if (element.componentRef?.componentId) {
      instanceIds.push(id);
    }
    
    // Check children recursively
    if (element.children) {
      element.children.forEach(childId => checkElement(childId));
    }
  }
  
  checkElement(elementId);
  
  return {
    hasInstances: instanceIds.length > 0,
    instanceIds
  };
}