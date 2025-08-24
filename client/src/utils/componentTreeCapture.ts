import { CanvasElement } from '../types/canvas';
import { nanoid } from 'nanoid';

/**
 * Create a ghost root wrapper for component templates
 * This ensures component instances are selectable as single units
 */
export function createGhostRootWrapper(
  selectedElementId: string,
  allElements: Record<string, CanvasElement>
): CanvasElement {
  const selectedElement = allElements[selectedElementId];
  if (!selectedElement) {
    throw new Error(`Element ${selectedElementId} not found`);
  }

  console.log('Creating ghost root wrapper for component template:', selectedElementId);

  // Calculate bounds for ghost root (could span multiple elements in future)
  const bounds = {
    x: selectedElement.x,
    y: selectedElement.y,
    width: selectedElement.width,
    height: selectedElement.height
  };

  // Create ghost root that wraps the selected element
  const ghostRoot: CanvasElement = {
    id: 'ghost-root',
    type: 'container',
    x: 0, // Template coordinates start at 0,0
    y: 0,
    width: bounds.width,
    height: bounds.height,
    parent: undefined,
    children: [selectedElementId],
    
    // Ghost root is invisible container
    styles: {
      backgroundColor: 'transparent',
      border: 'none',
      padding: '0px',
      margin: '0px',
      display: 'block',
      position: 'relative'
    },
    classes: [],
    content: '',
    
    // Mark as ghost root for special handling
    isGhostRoot: true
  };

  console.log('Ghost root wrapper created:', {
    ghostRootSize: `${bounds.width}x${bounds.height}`,
    wrappedElement: selectedElementId,
    wrappedElementType: selectedElement.type
  });

  return ghostRoot;
}

/**
 * Recursively capture a complete element tree with all children and properties
 * Now creates a ghost root wrapper for proper component boundaries
 */
export function captureElementTree(
  rootElementId: string,
  allElements: Record<string, CanvasElement>
): CanvasElement {
  // CRITICAL: Create ghost root wrapper instead of using selected element directly
  const ghostRoot = createGhostRootWrapper(rootElementId, allElements);
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
      
      // CRITICAL: Preserve all content and text properties
      content: element.content || '',
      buttonText: element.buttonText || '',
      
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
      
      // Preserve parent relationship for proper hierarchy
      parent: element.parent,
      
      // Initialize children array (will store child element objects for tree, converted to IDs later)
      children: [] as any
    };

    // CRITICAL: Recursively process children preserving complete hierarchy
    if (element.children && element.children.length > 0) {
      const childElements: CanvasElement[] = [];
      for (const childId of element.children) {
        const childElement = allElements[childId];
        if (childElement) {
          console.log('Cloning child element for template:', childId, childElement.type);
          const clonedChild = deepCloneElement(childElement);
          // Adjust child position relative to parent (maintain relative positioning)
          clonedChild.x = (childElement.x || 0) - (element.x || 0);
          clonedChild.y = (childElement.y || 0) - (element.y || 0);
          clonedChild.parent = element.id; // Maintain parent relationship
          childElements.push(clonedChild);
        } else {
          console.warn(`Child element ${childId} not found for parent ${element.id}`);
        }
      }
      (clonedElement as any).children = childElements;
      console.log('Element cloned with children:', element.id, 'childCount:', childElements.length);
    }

    return clonedElement;
  }

  // CRITICAL: Clone the complete element tree starting from selected element
  const clonedTemplate = deepCloneElement(rootElement);
  
  // Adjust the cloned template to be positioned relative to ghost root (0,0)
  const adjustedTemplate = {
    ...clonedTemplate,
    x: 0, // Position template at ghost root origin
    y: 0,
    parent: 'ghost-root'
  };
  
  // Create the final ghost root with the cloned template as child
  const ghostRootWithTemplate: CanvasElement = {
    ...ghostRoot,
    children: [adjustedTemplate] as any // Store actual element object for tree processing
  };
  
  console.log('Captured component tree with ghost root:', {
    ghostRootId: 'ghost-root',
    templateId: rootElementId,
    templateType: rootElement.type,
    totalChildren: countElementsInTree(ghostRootWithTemplate),
    ghostRootSize: `${ghostRoot.width}x${ghostRoot.height}`
  });

  return ghostRootWithTemplate;
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