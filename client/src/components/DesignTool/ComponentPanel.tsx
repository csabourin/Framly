import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { selectComponentsState, selectCanvasProject, selectCurrentElements, selectSelectedElementId } from '../../store/selectors';
import { 
  selectComponent, 
  deleteComponent, 
  setCreatingComponent,
  addCategory 
} from '../../store/componentSlice';
import { deleteComponent as deleteComponentFromDB } from '../../utils/persistence';
import { 
  selectElement, 
  addElement 
} from '../../store/canvasSlice';
import { setSelectedTool } from '../../store/uiSlice';
import { CustomComponent, CanvasElement } from '../../types/canvas';
import { instantiateComponent } from '../../utils/componentGenerator';
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
  const { 
    categories, 
    selectedComponent, 
    isCreatingComponent 
  } = useSelector(selectComponentsState);
  const project = useSelector(selectCanvasProject);
  const currentElements = useSelector(selectCurrentElements);
  const selectedElementId = useSelector(selectSelectedElementId);
  const [searchTerm, setSearchTerm] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  const filteredCategories = categories.map(category => ({
    ...category,
    components: category.components.filter(comp =>
      comp.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.components.length > 0 || searchTerm === '');

  const handleComponentClick = (component: CustomComponent) => {
    dispatch(selectComponent(component));
  };

  const handleAddToCanvas = (component: CustomComponent) => {
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
    
    // Use the componentGenerator utility
    const { elements: newElements, rootElementId } = instantiateComponent(component, insertX, insertY);
    
    // Add the root element with proper positioning
    const rootElement = newElements[rootElementId];
    if (rootElement) {
      dispatch(addElement({ 
        element: { ...rootElement, parent: parentId },
        parentId,
        insertPosition,
        referenceElementId: insertPosition !== 'inside' ? currentSelectedElementId : undefined
      }));
      
      // Add child elements
      Object.values(newElements).forEach(element => {
        if (element.id !== rootElementId) {
          dispatch(addElement({ 
            element, 
            parentId: element.parent || rootElementId,
            insertPosition: 'inside'
          }));
        }
      });
    }
    
    // Select the root element
    dispatch(selectElement(rootElementId));
  };

  const handleDragStart = (e: React.DragEvent, component: CustomComponent) => {
    console.log('Component drag start:', component.id);
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'component',
      componentId: component.id,
      component: component // Include full component data
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDeleteComponent = async (componentId: string) => {
    // Delete from Redux store
    dispatch(deleteComponent(componentId));
    
    // Delete from IndexedDB
    try {
      await deleteComponentFromDB(componentId);
      console.log('Component deleted from IndexedDB:', componentId);
    } catch (error) {
      console.error('Failed to delete component from IndexedDB:', error);
    }
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
    if (newCategoryName.trim()) {
      const categoryId = newCategoryName.toLowerCase().replace(/\s+/g, '-');
      dispatch(addCategory({ id: categoryId, name: newCategoryName }));
      setNewCategoryName('');
      setIsAddingCategory(false);
    }
  };

  const ComponentThumbnail: React.FC<{ component: CustomComponent }> = ({ component }) => {
    return (
      <div className="w-full h-16 bg-gray-100 rounded border flex items-center justify-center text-xs text-gray-500 mb-2">
        {component.thumbnail ? (
          <img 
            src={component.thumbnail} 
            alt={component.name}
            className="w-full h-full object-cover rounded"
          />
        ) : (
          <Package size={20} />
        )}
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
        {categories.some(cat => cat.components.length > 0) && (
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
        <Accordion type="multiple" defaultValue={['custom', 'ui']} className="px-2">
          {filteredCategories.map((category) => (
            <AccordionItem key={category.id} value={category.id} className="border-b-0">
              <AccordionTrigger className="py-2 px-2 text-sm hover:no-underline">
                <div className="flex items-center gap-2">
                  <Folder size={14} />
                  {category.name}
                  <span className="text-xs text-gray-500">({category.components.length})</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-2">
                <div className="space-y-2 px-2">
                  {category.components.map((component) => (
                    <ComponentContextMenu key={component.id} component={component}>
                      <Card 
                        className="cursor-pointer hover:shadow-md transition-shadow group"
                        onClick={() => handleComponentClick(component)}
                        draggable
                        onDragStart={(e) => handleDragStart(e, component)}
                        data-testid={`card-component-${component.id}`}
                      >
                      <CardContent className="p-3">
                        <ComponentThumbnail component={component} />
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-medium text-gray-900 truncate" title={component.name}>
                              {component.name}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1">
                              {Object.keys(component.elements).length} elements
                            </p>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddToCanvas(component);
                              }}
                              className="h-6 w-6 p-0"
                              title="Add to canvas"
                              data-testid={`button-add-component-${component.id}`}
                            >
                              <Plus size={10} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteComponent(component.id);
                              }}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                              title="Delete component"
                              data-testid={`button-delete-component-${component.id}`}
                            >
                              <Trash2 size={10} />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    </ComponentContextMenu>
                  ))}
                  
                  {category.components.length === 0 && searchTerm === '' && (
                    <div className="text-xs text-gray-500 text-center py-4">
                      No components yet
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        
        {/* Add Category Button */}
        <div className="p-2 border-t border-gray-100">
          <Dialog open={isAddingCategory} onOpenChange={setIsAddingCategory}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs"
                data-testid="button-add-category"
              >
                <FolderPlus size={14} className="mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Category</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <Input
                  placeholder="Category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                  data-testid="input-category-name"
                />
              </div>
              <DialogFooter className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsAddingCategory(false)}
                  data-testid="button-cancel-category"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddCategory}
                  disabled={!newCategoryName.trim()}
                  data-testid="button-save-category"
                >
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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