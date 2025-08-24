import { CanvasElement } from '../types/canvas';
import { nanoid } from 'nanoid';

/**
 * Recursively capture a complete element tree with all children and properties
 */
export function captureElementTree(
  rootElementId: string,
  allElements: Record<string, CanvasElement>
): CanvasElement {
  const rootElement = allElements[rootElementId];
  if (!rootElement) {
    throw new Error(`Element ${rootElementId} not found`);
  }

  /**
   * Recursively clone an element and all its children with complete properties
   */
  function deepCloneElement(element: CanvasElement): CanvasElement {
    // Create a complete deep copy of the element with ALL properties
    const clonedElement: CanvasElement = {
      ...element,
      // Preserve ID structure for template (will be remapped during instantiation)
      id: element.id,
      
      // Deep copy all style properties
      styles: element.styles ? { ...element.styles } : {},
      
      // Preserve all element-specific properties
      content: element.content,
      buttonText: element.buttonText,
      
      // Image properties
      imageUrl: element.imageUrl,
      imageBase64: element.imageBase64,
      imageAlt: element.imageAlt,
      imageTitle: element.imageTitle,
      objectFit: element.objectFit,
      objectPosition: element.objectPosition,
      
      // Layout properties
      flexDirection: element.flexDirection,
      justifyContent: element.justifyContent,
      alignItems: element.alignItems,
      
      // Container properties
      isContainer: element.isContainer,
      
      // Classes and styling
      classes: element.classes ? [...element.classes] : [],
      
      // Position and size (will be template-relative)
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
      
      // Reset parent - will be set during instantiation
      parent: element.parent,
      
      // Initialize children array (will store child element objects for tree, converted to IDs later)
      children: [] as any
    };

    // Recursively process children if they exist
    if (element.children && element.children.length > 0) {
      const childElements: CanvasElement[] = [];
      for (const childId of element.children) {
        const childElement = allElements[childId];
        if (childElement) {
          childElements.push(deepCloneElement(childElement));
        } else {
          console.warn(`Child element ${childId} not found for parent ${element.id}`);
        }
      }
      (clonedElement as any).children = childElements;
    }

    return clonedElement;
  }

  // Start the recursive cloning from the root element
  const clonedTree = deepCloneElement(rootElement);
  
  console.log('Captured complete element tree:', {
    rootId: rootElementId,
    rootType: rootElement.type,
    totalChildren: countElementsInTree(clonedTree),
    hasStyles: Object.keys(clonedTree.styles || {}).length > 0,
    hasContent: !!(clonedTree.content || clonedTree.buttonText)
  });

  return clonedTree;
}

/**
 * Count the total number of elements in a tree (including root)
 */
function countElementsInTree(element: CanvasElement): number {
  let count = 1; // Count the current element
  
  if ((element as any).children && (element as any).children.length > 0) {
    count += (element as any).children.reduce((sum: number, child: any) => {
      if (typeof child === 'object' && child.id) {
        return sum + countElementsInTree(child);
      }
      return sum;
    }, 0);
  }
  
  return count;
}

/**
 * Flatten a component template tree for storage in ComponentDef
 * This converts the nested structure to a flat structure for compatibility
 */
export function flattenComponentTemplate(
  templateTree: CanvasElement
): { template: CanvasElement; elementMap: Record<string, CanvasElement> } {
  const elementMap: Record<string, CanvasElement> = {};
  
  function flattenElement(element: CanvasElement): CanvasElement {
    // Create a flat version with child IDs only
    const flatElement: CanvasElement = {
      ...element,
      children: (element as any).children?.map((child: any) => {
        if (typeof child === 'object' && child.id) {
          // Process child and store in map
          const flatChild = flattenElement(child);
          elementMap[flatChild.id] = flatChild;
          return flatChild.id;
        }
        return child;
      }) as string[] || []
    };
    
    elementMap[flatElement.id] = flatElement;
    return flatElement;
  }
  
  const flatTemplate = flattenElement(templateTree);
  
  return {
    template: flatTemplate,
    elementMap
  };
}

/**
 * Reconstruct a tree from flat template data
 */
export function reconstructTreeFromTemplate(
  template: CanvasElement,
  elementMap: Record<string, CanvasElement>
): CanvasElement {
  function reconstructElement(elementId: string): CanvasElement {
    const element = elementMap[elementId];
    if (!element) {
      console.warn(`Element ${elementId} not found in element map`);
      return template; // Fallback to template
    }
    
    return {
      ...element,
      children: element.children?.map(childId => {
        if (typeof childId === 'string' && elementMap[childId]) {
          return reconstructElement(childId);
        }
        return childId;
      }) as any || []
    };
  }
  
  return reconstructElement(template.id);
}