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
      
      // Create the component instance root element
      const instanceRoot: CanvasElement = {
        ...instance,
        parent: parentId || instance.parent,
        children: [] // Will be populated with template children
      };
      
      expandedElements[instance.id] = instanceRoot;
      
      // Expand template children if they exist
      const template = componentDef.template;
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
        
        instanceRoot.children = expandedChildIds;
      }
      
      console.log('Expanded component instance with ghost root:', {
        componentName: componentDef.name,
        instanceId: instance.id,
        childrenCount: instanceRoot.children?.length || 0,
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
      
      // Create the expanded element with position relative to root instance
      const expandedElement: CanvasElement = {
        ...templateElement,
        id: expandedId,
        parent: parentId,
        
        // Adjust position relative to component instance
        x: rootInstance.x + (templateElement.x || 0),
        y: rootInstance.y + (templateElement.y || 0),
        
        // Preserve all template properties
        styles: templateElement.styles ? { ...templateElement.styles } : {},
        classes: templateElement.classes ? [...templateElement.classes] : [],
        children: [],
        
        // CRITICAL: Mark as component child (non-interactive)
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