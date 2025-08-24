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
          
          // Ghost root styling - invisible container
          styles: {
            ...instance.styles,
            backgroundColor: 'transparent',
            border: 'none',
            position: 'relative',
            overflow: 'visible'
          },
          
          // Mark as component root
          isComponentRoot: true,
          isGhostRoot: true
        };
        
        expandedElements[instance.id] = expandedInstance;
        
        // Expand ghost root's children (the actual template content)
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
      rootInstance: CanvasElement
    ): CanvasElement | null {
      if (!templateElement || typeof templateElement !== 'object') {
        return null;
      }
      
      // Generate a unique ID for the expanded element
      const expandedId = `${rootInstance.id}-${templateElement.id}-${nanoid()}`;
      
      // CRITICAL: Preserve hierarchical positioning - don't stack elements
      const expandedElement: CanvasElement = {
        ...templateElement,
        id: expandedId,
        parent: parentId,
        
        // CRITICAL: Position relative to root instance, maintaining hierarchy
        x: rootInstance.x + (templateElement.x || 0),
        y: rootInstance.y + (templateElement.y || 0),
        
        // Preserve all template properties exactly
        styles: templateElement.styles ? { ...templateElement.styles } : {},
        classes: templateElement.classes ? [...templateElement.classes] : [],
        children: [],
        
        // Template properties
        content: templateElement.content,
        buttonText: templateElement.buttonText,
        imageUrl: templateElement.imageUrl,
        imageBase64: templateElement.imageBase64,
        imageAlt: templateElement.imageAlt,
        objectFit: templateElement.objectFit,
        objectPosition: templateElement.objectPosition,
        
        // CRITICAL: Mark as component child (non-interactive) but preserve hierarchy
        isComponentChild: true,
        componentRootId: rootInstance.id
      };
      
      // Add to expanded elements
      expandedElements[expandedId] = expandedElement;
      
      // Recursively expand children
      if (templateElement.children && Array.isArray(templateElement.children)) {
        const childIds: string[] = [];
        
        for (const child of templateElement.children) {
          const expandedChild = expandTemplateElement(child, expandedId, rootInstance);
          if (expandedChild) {
            childIds.push(expandedChild.id);
          }
        }
        
        expandedElement.children = childIds;
      }
      
      return expandedElement;
    }
    
    // First pass: copy all non-component elements
    for (const [id, element] of Object.entries(elements)) {
      if (!element.componentRef) {
        expandedElements[id] = { ...element };
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