import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { CanvasElement, ComponentDef } from '../types/canvas';
import { selectComponentDefinitions } from '../store/selectors';
import { nanoid } from 'nanoid';

/**
 * Hook that expands component instances to include their template children
 * This creates a flattened element structure where component instances show their full hierarchy
 */
export function useExpandedElements(elements: Record<string, CanvasElement>): Record<string, CanvasElement> {
  const componentDefinitionsState = useSelector(selectComponentDefinitions);
  const componentDefinitions = Array.isArray(componentDefinitionsState) ? componentDefinitionsState : Object.values(componentDefinitionsState || {});
  
  return useMemo(() => {
    const expandedElements: Record<string, CanvasElement> = {};
    const processedComponents = new Set<string>();
    
    /**
     * Recursively expand a component instance template
     */
    function expandComponentInstance(
      instance: CanvasElement, 
      componentDef: ComponentDef,
      parentId: string | null = null
    ): void {
      // Avoid infinite recursion for already processed components
      if (processedComponents.has(instance.id)) {
        return;
      }
      processedComponents.add(instance.id);
      
      const template = componentDef.template;
      let expandedInstance: CanvasElement;
      
      // CRITICAL: Handle ghost root properly - preserve hierarchy structure
      if (template?.isGhostRoot) {
        console.log('Expanding ghost root component:', instance.id, componentDef.name);
        
        // Instance becomes the ghost root container (invisible wrapper)
        expandedInstance = {
          ...instance,
          parent: parentId || instance.parent,
          children: [], // Will contain template children
          
          // CRITICAL: Ghost root should act like a container for proper layout
          isContainer: true,
          type: 'container',
          
          // CRITICAL: Default dimensions for ghost container
          width: instance.width || template?.width || 200,
          height: instance.height || template?.height || 100,
          
          // CRITICAL: Default styles for ghost container - inherit from instance but add container defaults
          styles: {
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'visible',
            minWidth: '100px',
            minHeight: '50px',
            backgroundColor: 'transparent',
            border: 'none',
            ...instance.styles, // Apply any custom styles from the instance
          },
          
          // CRITICAL: Inherit classes from instance  
          classes: instance.classes || [],
          
          // Mark as component root
          isComponentRoot: true,
          isGhostRoot: true
        };
        
        expandedElements[instance.id] = expandedInstance;
        
        // Expand ghost root's children (the actual template content)
        if ((template as any).children && Array.isArray((template as any).children)) {
          const expandedChildIds: string[] = [];
          
          // CRITICAL: Expand the template's root element which contains the hierarchy  
          for (const templateChild of (template as any).children) {
            if (typeof templateChild === 'object' && templateChild.id) {
              console.log('Expanding ghost root child:', templateChild.id, templateChild.type);
              // Position template root relative to component instance
              const expandedChild = expandTemplateElement(templateChild, instance.id, instance, true);
              if (expandedChild) {
                expandedChildIds.push(expandedChild.id);
              }
            }
          }
          
          expandedInstance.children = expandedChildIds;
        }
        
      } else {
        // Legacy template without ghost root
        expandedInstance = {
          ...instance,
          parent: parentId || instance.parent,
          children: [],
          isComponentRoot: true
        };
        
        expandedElements[instance.id] = expandedInstance;
        
        // Expand template children if they exist
        if ((template as any).children && Array.isArray((template as any).children)) {
          const expandedChildIds: string[] = [];
          
          for (const templateChild of (template as any).children) {
            if (typeof templateChild === 'object' && templateChild.id) {
              const expandedChild = expandTemplateElement(templateChild, instance.id, instance);
              if (expandedChild) {
                expandedChildIds.push(expandedChild.id);
              }
            }
          }
          
          expandedInstance.children = expandedChildIds;
        }
      }
      
      console.log('Expanded component instance with ghost root:', {
        componentName: componentDef.name,
        instanceId: instance.id,
        childrenCount: expandedInstance.children?.length || 0,
        hasTemplate: !!(template as any).children,
        isGhostRoot: template?.isGhostRoot
      });
    }
    
    /**
     * Recursively expand a template element and its children
     */
    function expandTemplateElement(
      templateElement: any,
      parentId: string,
      rootInstance: CanvasElement,
      isRootTemplateElement: boolean = false
    ): CanvasElement | null {
      if (!templateElement || typeof templateElement !== 'object') {
        return null;
      }
      
      // Generate a unique ID for the expanded element
      const expandedId = `${rootInstance.id}-${templateElement.id}-${nanoid()}`;
      
      // CRITICAL: Component children inherit properties from ghost root and template
      const expandedElement: CanvasElement = {
        ...templateElement,
        id: expandedId,
        parent: parentId,
        
        // CRITICAL: All component children use original template positions (relative positioning)
        x: templateElement.x || 0,
        y: templateElement.y || 0,
        
        // CRITICAL: Preserve ALL template properties and styling exactly
        styles: templateElement.styles ? { ...templateElement.styles } : {},
        classes: templateElement.classes ? [...templateElement.classes] : [],
        children: [],
        
        // CRITICAL: Preserve all content and text properties exactly
        content: templateElement.content || '',
        buttonText: templateElement.buttonText || '',
        imageUrl: templateElement.imageUrl,
        imageBase64: templateElement.imageBase64,
        imageAlt: templateElement.imageAlt,
        imageTitle: templateElement.imageTitle,
        objectFit: templateElement.objectFit,
        objectPosition: templateElement.objectPosition,
        
        // Layout properties
        flexDirection: templateElement.flexDirection,
        justifyContent: templateElement.justifyContent,
        alignItems: templateElement.alignItems,
        gap: templateElement.gap,
        
        // All other properties
        type: templateElement.type,
        width: templateElement.width,
        height: templateElement.height,
        
        // CRITICAL: Mark as component child (non-interactive) but preserve hierarchy
        isComponentChild: true,
        componentRootId: rootInstance.id
      };
      
      // Add to expanded elements
      expandedElements[expandedId] = expandedElement;
      
      // CRITICAL: Recursively expand children while preserving hierarchy
      if (templateElement.children && Array.isArray(templateElement.children)) {
        const childIds: string[] = [];
        
        for (const child of templateElement.children) {
          if (typeof child === 'object' && child.id) {
            console.log('Expanding template child:', child.id, 'parent:', expandedId);
            const expandedChild = expandTemplateElement(child, expandedId, rootInstance);
            if (expandedChild) {
              childIds.push(expandedChild.id);
            }
          }
        }
        
        expandedElement.children = childIds;
        console.log('Template element expanded with children:', expandedElement.id, 'childCount:', childIds.length);
      }
      
      return expandedElement;
    }
    
    // First pass: copy all non-component elements - CRITICAL: Ensure they keep their regular properties
    for (const [id, element] of Object.entries(elements)) {
      if (!element.componentRef) {
        expandedElements[id] = { 
          ...element,
          // CRITICAL: Ensure regular elements are NOT marked as component children
          isComponentChild: false,
          isComponentRoot: false,
          isGhostRoot: false
        };
      }
    }
    
    // Second pass: expand component instances
    for (const [id, element] of Object.entries(elements)) {
      if (element.componentRef?.componentId) {
        const componentDef = componentDefinitions.find((def: ComponentDef) => def.id === element.componentRef?.componentId);
        if (componentDef) {
          expandComponentInstance(element, componentDef);
        } else {
          // If component definition not found, keep the instance as-is
          expandedElements[id] = { ...element };
        }
      }
    }
    
    // Third pass: update parent-child relationships for non-component elements
    for (const [id, element] of Object.entries(expandedElements)) {
      if (!element.componentRef && element.children) {
        // Filter children to only include existing elements
        element.children = element.children.filter(childId => expandedElements[childId]);
      }
    }
    
    console.log('Element expansion complete:', {
      original: Object.keys(elements).length,
      expanded: Object.keys(expandedElements).length,
      componentInstances: Object.values(elements).filter(e => e.componentRef).length
    });
    
    return expandedElements;
  }, [elements, componentDefinitions]);
}