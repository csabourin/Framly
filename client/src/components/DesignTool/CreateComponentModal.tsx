import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { addComponent, setCreatingComponent } from '../../store/componentSlice';
import { selectElement } from '../../store/canvasSlice';
import { CustomComponent, CanvasElement } from '../../types/canvas';
import { generateComponentFromElements } from '../../utils/componentGenerator';
import { saveComponent } from '../../utils/persistence';
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
  const { isCreatingComponent, categories } = useSelector((state: RootState) => state.components);
  const { project } = useSelector((state: RootState) => state.canvas);
  const [componentName, setComponentName] = useState('');
  const [componentCategory, setComponentCategory] = useState('custom');
  const [description, setDescription] = useState('');
  const [isValid, setIsValid] = useState(false);

  const selectedElement = project.selectedElementId ? project.elements[project.selectedElementId] : null;

  useEffect(() => {
    setIsValid(componentName.trim().length > 0 && selectedElement !== null);
  }, [componentName, selectedElement]);

  // Moved to componentGenerator.ts

  // Moved to componentGenerator.ts

  const handleSave = async () => {
    if (!selectedElement || !componentName.trim()) return;

    // Create the component using the utility function
    const newComponent = generateComponentFromElements(
      selectedElement.id,
      project.elements,
      componentName.trim(),
      componentCategory
    );

    // Add to Redux store
    dispatch(addComponent(newComponent));
    
    // Save to IndexedDB
    try {
      await saveComponent(newComponent);
      console.log('Component saved to IndexedDB:', newComponent.name);
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