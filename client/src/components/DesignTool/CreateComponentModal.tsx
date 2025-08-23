import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { selectComponentsState, selectCanvasProject, selectCurrentElements, selectSelectedElementId } from '../../store/selectors';
import { addComponent, setCreatingComponent } from '../../store/componentSlice';
import { addComponentDefinition, addComponentCategory } from '../../store/componentDefinitionsSlice';
import { saveComponentDefinition, saveComponentCategory } from '../../utils/componentPersistence';
import { selectElement, updateElement, addElement } from '../../store/canvasSlice';
import { CustomComponent, CanvasElement, ComponentDef, ComponentCategory } from '../../types/canvas';
import { nanoid } from 'nanoid';
import { generateComponentFromElements } from '../../utils/componentGenerator';
import { saveComponent } from '../../utils/persistence';
import { containsComponentInstances, createComponentInstance } from '../../utils/componentInstances';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Package, AlertCircle } from 'lucide-react';

const CreateComponentModal: React.FC = () => {
  const dispatch = useDispatch();
  const { isCreatingComponent, categories } = useSelector(selectComponentsState);
  const project = useSelector(selectCanvasProject);
  const currentElements = useSelector(selectCurrentElements);
  const selectedElementId = useSelector(selectSelectedElementId);
  const [componentName, setComponentName] = useState('');
  const [componentCategory, setComponentCategory] = useState('custom');
  const [description, setDescription] = useState('');
  const [isValid, setIsValid] = useState(false);

  const selectedElement = selectedElementId ? currentElements[selectedElementId] : null;

  useEffect(() => {
    setIsValid(componentName.trim().length > 0 && selectedElement !== null);
  }, [componentName, selectedElement]);

  // Moved to componentGenerator.ts

  // Moved to componentGenerator.ts

  const handleSave = async () => {
    if (!selectedElement || !componentName.trim()) return;

    // Check if the selected element contains component instances
    // This is informational - components can contain other components
    const { hasInstances, instanceIds } = containsComponentInstances(selectedElement.id, currentElements);
    
    if (hasInstances) {
      const shouldContinue = window.confirm(
        `The selected element contains ${instanceIds.length} component instance(s). Creating a component from this element will include these instances. Continue?`
      );
      
      if (!shouldContinue) return;
    }

    // Create the legacy component for backward compatibility
    const newComponent = generateComponentFromElements(
      selectedElement.id,
      currentElements,
      componentName.trim(),
      componentCategory
    );

    // Create spec-compliant ComponentDef
    const componentDef: ComponentDef = {
      id: nanoid(),
      name: componentName.trim(),
      categoryId: componentCategory === 'custom' ? null : componentCategory,
      template: currentElements[selectedElement.id], // Use the full element as template
      version: 1,
      updatedAt: Date.now()
    };
    
    console.log('Creating component with category:', componentCategory, 'categoryId:', componentDef.categoryId);

    // Create or get category if needed
    if (componentCategory !== 'custom') {
      const existingCategories = categories.find(cat => cat.id === componentCategory);
      if (!existingCategories) {
        const newCategory: ComponentCategory = {
          id: componentCategory,
          name: componentCategory.charAt(0).toUpperCase() + componentCategory.slice(1),
          sortIndex: categories.length,
          createdAt: Date.now(),
          components: [] // Legacy field
        };
        
        dispatch(addComponentCategory(newCategory));
        
        try {
          await saveComponentCategory(newCategory);
          console.log('Component category saved:', newCategory.name);
        } catch (error) {
          console.error('Failed to save component category:', error);
        }
      }
    }

    // Add to Redux stores (both legacy and new)
    dispatch(addComponent(newComponent));
    dispatch(addComponentDefinition(componentDef));
    
    // CRITICAL: Create a new instance at the original location
    const componentInstance = createComponentInstance(
      selectedElement, 
      componentDef.id, 
      componentDef.version
    );
    
    // Replace the original element with the component instance
    dispatch(updateElement({
      id: selectedElement.id,
      updates: componentInstance
    }));
    
    // Save to IndexedDB
    try {
      await saveComponent(newComponent);
      await saveComponentDefinition(componentDef);
      console.log('Component saved to IndexedDB:', newComponent.name, 'v' + componentDef.version);
      console.log('Component instance created at original location:', selectedElement.id);
    } catch (error) {
      console.error('Failed to save component to IndexedDB:', error);
    }
    
    dispatch(setCreatingComponent(false));
    
    // Reset form
    setComponentName('');
    setComponentCategory('custom');
    setDescription('');
    
    // Keep the element selected
    dispatch(selectElement(selectedElement.id));
  };

  const handleCancel = () => {
    dispatch(setCreatingComponent(false));
    setComponentName('');
    setComponentCategory('custom');
    setDescription('');
  };

  return (
    <Dialog open={isCreatingComponent} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package size={20} />
            Create Component
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {!selectedElement ? (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <AlertCircle size={16} className="text-amber-600" />
              <span className="text-sm text-amber-800">
                Please select an element on the canvas to create a component
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <Package size={16} className="text-blue-600" />
              <span className="text-sm text-blue-800">
                Creating component from: <strong>{selectedElement.type}</strong> element
              </span>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="component-name">Component Name</Label>
            <Input
              id="component-name"
              placeholder="Enter component name..."
              value={componentName}
              onChange={(e) => setComponentName(e.target.value)}
              data-testid="input-component-name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="component-category">Category</Label>
            <Select value={componentCategory} onValueChange={setComponentCategory}>
              <SelectTrigger data-testid="select-component-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="component-description">Description (Optional)</Label>
            <Textarea
              id="component-description"
              placeholder="Describe what this component does..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              data-testid="textarea-component-description"
            />
          </div>
        </div>
        
        <DialogFooter className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            data-testid="button-cancel-component"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!isValid}
            data-testid="button-save-component"
          >
            Create Component
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateComponentModal;