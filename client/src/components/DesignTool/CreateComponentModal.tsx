import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
import { captureElementTree } from '../../utils/componentTreeCapture';
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
  const { t } = useTranslation();
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
t('components.containsInstancesConfirm', { count: instanceIds.length })
      );
      
      if (!shouldContinue) return;
    }

    // CRITICAL: Create component with ghost root that preserves element hierarchy
    const completeTemplate = captureElementTree(selectedElement.id, currentElements);
    
    // Create spec-compliant ComponentDef with COMPLETE TREE
    const componentDef: ComponentDef = {
      id: nanoid(),
      name: componentName.trim(),
      categoryId: componentCategory === 'custom' ? null : componentCategory,
      template: completeTemplate, // COMPLETE tree with all children preserved
      version: 1,
      updatedAt: Date.now()
    };
    


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
        } catch (error) {
          // Failed to save component category
        }
      }
    }

    // Add to NEW component definitions store ONLY
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
    
    // Save to IndexedDB (NEW system only)
    try {
      await saveComponentDefinition(componentDef);
    } catch (error) {
      // Failed to save component to IndexedDB
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
      <DialogContent className="sm:max-w-lg bg-white/95 backdrop-blur-md border-gray-200/60 shadow-2xl rounded-2xl">
        <DialogHeader className="pb-6 border-b border-gray-200/60">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-gray-900">Create Component</DialogTitle>
              <p className="text-gray-600 text-sm mt-1">Turn selected elements into a reusable component</p>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-6 py-6">
          {!selectedElement ? (
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200/60 rounded-xl shadow-sm">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-sm text-amber-800 font-medium">
                {t('components.selectElementFirst')}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60 rounded-xl shadow-sm">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm text-blue-800 font-medium">
                {t('components.creatingFromElement', { type: selectedElement.type })}
              </span>
            </div>
          )}
          
          <div className="space-y-3">
            <Label htmlFor="component-name" className="text-sm font-semibold text-gray-700">{t('components.componentName')}</Label>
            <Input
              id="component-name"
              placeholder={t('components.enterComponentName')}
              value={componentName}
              onChange={(e) => setComponentName(e.target.value)}
              data-testid="input-component-name"
              className="rounded-xl border-gray-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-200 h-12"
            />
          </div>
          
          <div className="space-y-3">
            <Label htmlFor="component-category" className="text-sm font-semibold text-gray-700">{t('components.componentCategory')}</Label>
            <Select value={componentCategory} onValueChange={setComponentCategory}>
              <SelectTrigger data-testid="select-component-category" className="rounded-xl border-gray-200 h-12">
                <SelectValue placeholder={t('components.selectCategory')} />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-gray-200/60 shadow-2xl">
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id} className="rounded-lg">
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-3">
            <Label htmlFor="component-description" className="text-sm font-semibold text-gray-700">{t('components.descriptionOptional')}</Label>
            <Textarea
              id="component-description"
              placeholder={t('components.describeComponent')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              data-testid="textarea-component-description"
              className="rounded-xl border-gray-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-200 resize-none"
            />
          </div>
        </div>
        
        <DialogFooter className="flex gap-4 pt-6 border-t border-gray-200/60">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            data-testid="button-cancel-component"
            className="flex-1 h-12 rounded-xl border-gray-300 hover:bg-gray-100 transition-all duration-200 font-semibold"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!isValid}
            data-testid="button-save-component"
            className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
          >
            Create Component
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateComponentModal;