import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { selectCanvasProject, selectCurrentElements, selectSelectedElementId, selectComponentDefinitions, selectComponentCategories } from '../../store/selectors';
import { setCreatingComponent } from '../../store/componentSlice';
import { 
  selectElement, 
  addElement 
} from '../../store/canvasSlice';
import { setSelectedTool } from '../../store/uiSlice';
import { ComponentDef, ComponentCategory, CanvasElement } from '../../types/canvas';
import { createComponentInstance } from '../../utils/componentInstances';
import { createDefaultElement } from '../../utils/canvas';
import { 
  Package, 
  Plus, 
  Trash2, 
  Edit3, 
  Copy,
  Search,
  Folder,
  FolderPlus
} from 'lucide-react';
import ComponentContextMenu from './ComponentContextMenu';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '../ui/dialog';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';

const ComponentPanel: React.FC = () => {
  const dispatch = useDispatch();
  const { isCreatingComponent } = useSelector((state: RootState) => state.components);
  const componentDefinitions = useSelector(selectComponentDefinitions);
  const componentCategories = useSelector(selectComponentCategories);
  const project = useSelector(selectCanvasProject);
  const currentElements = useSelector(selectCurrentElements);
  const selectedElementId = useSelector(selectSelectedElementId);
  const [searchTerm, setSearchTerm] = useState('');

  // Group components by category
  const groupedComponents = React.useMemo(() => {
    const groups: Record<string, ComponentDef[]> = {
      'uncategorized': []
    };

    // Initialize category groups
    Object.values(componentCategories).forEach(cat => {
      groups[cat.id] = [];
    });

    // Group components
    Object.values(componentDefinitions).forEach(comp => {
      const categoryId = comp.categoryId || 'uncategorized';
      if (!groups[categoryId]) groups[categoryId] = [];
      groups[categoryId].push(comp);
    });

    return groups;
  }, [componentDefinitions, componentCategories]);

  // Filter by search term
  const filteredComponents = React.useMemo(() => {
    if (!searchTerm) return groupedComponents;

    const filtered: Record<string, ComponentDef[]> = {};
    Object.entries(groupedComponents).forEach(([categoryId, components]) => {
      const matchingComponents = components.filter(comp =>
        comp.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (matchingComponents.length > 0) {
        filtered[categoryId] = matchingComponents;
      }
    });

    return filtered;
  }, [groupedComponents, searchTerm]);

  const handleComponentClick = (component: ComponentDef) => {
    console.log('Component selected:', component.name);
  };

  const handleAddToCanvas = (component: ComponentDef) => {
    const currentSelectedElementId = selectedElementId || 'root';
    const selectedElement = currentElements[currentSelectedElementId];
    
    // Determine insertion position based on selected element
    let insertX = 50;
    let insertY = 50;
    let parentId = 'root';
    let insertPosition: 'before' | 'after' | 'inside' = 'inside';
    
    if (selectedElement && currentSelectedElementId !== 'root') {
      // If a container/rectangle is selected, add inside it
      if (selectedElement.type === 'container' || selectedElement.type === 'rectangle') {
        parentId = currentSelectedElementId;
        insertX = selectedElement.x + 20;
        insertY = selectedElement.y + 20;
        insertPosition = 'inside';
      } else {
        // For other elements, add after them in the same parent
        parentId = selectedElement.parent || 'root';
        insertX = selectedElement.x;
        insertY = selectedElement.y + (selectedElement.height || 40) + 10;
        insertPosition = 'after';
      }
    }
    
    // Create a component instance from the component definition
    const instanceElement = createComponentInstance(
      {
        ...component.template,
        id: `instance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        x: insertX,
        y: insertY,
        parent: parentId
      },
      component.id,
      component.version
    );
    
    // Add the component instance to canvas
    dispatch(addElement({ 
      element: instanceElement,
      parentId,
      insertPosition,
      referenceElementId: insertPosition !== 'inside' ? currentSelectedElementId : undefined
    }));
    
    // Select the instance element
    dispatch(selectElement(instanceElement.id));
  };

  const handleDragStart = (e: React.DragEvent, component: ComponentDef) => {
    console.log('Component drag start:', component.id);
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'component',
      componentId: component.id,
      component: component // Include full component data
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDeleteComponent = async (componentId: string) => {
    // TODO: Implement proper component definition deletion
    console.log('Delete component:', componentId);
  };

  const handleCreateComponent = () => {
    if (selectedElementId && selectedElementId !== 'root') {
      dispatch(setCreatingComponent(true));
    } else {
      // Show a message that they need to select an element first
      alert('Please select an element on the canvas first');
    }
  };

  const handleAddCategory = () => {
    // TODO: Implement new category creation
    console.log('Add category functionality not implemented yet');
  };

  const ComponentThumbnail: React.FC<{ component: ComponentDef }> = ({ component }) => {
    return (
      <div className="w-full h-16 bg-gray-100 rounded border flex items-center justify-center text-xs text-gray-500 mb-2">
        <Package size={20} />
      </div>
    );
  };

  return (
    <aside className="absolute right-80 top-12 bottom-8 w-64 bg-white border-l border-gray-200 flex flex-col"
      data-testid="component-panel-main"
    >
      {/* Header */}
      <div className="components-header relative overflow-visible p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Package size={16} />
            Components
          </h2>
          <Button
            size="sm"
            onClick={handleCreateComponent}
            disabled={!selectedElementId || selectedElementId === 'root'}
            className="create-component-btn absolute right-3 top-2 z-10 text-xs"
            data-testid="button-create-component"
            title={!selectedElementId || selectedElementId === 'root' 
              ? 'Select an element to create a component' 
              : 'Create component from selected element'}
          >
            <Plus size={12} className="mr-1" />
            Create
          </Button>
        </div>
        
        {/* Instructions for users when components exist */}
        {Object.values(componentDefinitions).length > 0 && (
          <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
            💡 Drag components to canvas or click the + button to add them
          </div>
        )}
        
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search components..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-7 h-8 text-sm"
            data-testid="input-search-components"
          />
        </div>
      </div>

      {/* Component Categories */}
      <div className="flex-1 overflow-y-auto">
        {Object.keys(filteredComponents).length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            {searchTerm ? 'No components match your search.' : 'No components yet. Create your first component by selecting an element and clicking "Create".'}
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={Object.keys(filteredComponents)} className="px-2">
            {Object.entries(filteredComponents).map(([categoryId, components]) => {
              const categoryList = Object.values(componentCategories);
              const category = categoryList.find(cat => cat.id === categoryId) || { id: categoryId, name: 'Uncategorized', sortIndex: 999 };
              
              return (
                <AccordionItem key={categoryId} value={categoryId} className="border-b-0">
                  <AccordionTrigger className="py-2 px-2 text-sm hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Folder size={14} />
                      {category.name}
                      <span className="text-xs text-gray-500">({components.length})</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-2">
                    <div className="space-y-2 px-2">
                      {components.map((component) => (
                        <Card 
                          key={component.id}
                          className="cursor-pointer hover:shadow-md transition-shadow group"
                          onClick={() => handleComponentClick(component)}
                          draggable
                          onDragStart={(e) => handleDragStart(e, component)}
                          data-testid={`card-component-${component.id}`}
                        >
                          <CardContent className="p-3">
                            <ComponentThumbnail component={component} />
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-medium text-sm text-gray-900 truncate mb-1">
                                  {component.name}
                                </h3>
                                <p className="text-xs text-gray-500">
                                  v{component.version} • {component.template.type}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddToCanvas(component);
                                  }}
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title={`Add ${component.name} to canvas`}
                                  data-testid={`button-add-${component.id}`}
                                >
                                  <Plus size={12} />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteComponent(component.id);
                                  }}
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
                                  title={`Delete ${component.name}`}
                                  data-testid={`button-delete-${component.id}`}
                                >
                                  <Trash2 size={12} />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>
      
      {/* Component system status */}
      <div className="p-2 border-t border-gray-100">
        <div className="text-xs text-gray-400 text-center">
          Component system ready
        </div>
      </div>
      
      {/* Creating Component Notice */}
      {isCreatingComponent && (
        <div className="p-4 bg-blue-50 border-t border-blue-200">
          <div className="text-sm text-blue-700">
            <p className="font-medium">Creating Component</p>
            <p className="text-xs mt-1">Select elements on canvas and save them as a reusable component</p>
          </div>
        </div>
      )}
    </aside>
  );
};

export default ComponentPanel;