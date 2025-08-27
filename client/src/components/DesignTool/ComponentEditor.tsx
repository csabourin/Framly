import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { selectCanvasProject, selectSelectedTool } from '../../store/selectors';
import { updateComponent, selectElement } from '../../store/canvasSlice';
import { setComponentEditorOpen, setEditingComponent } from '../../store/uiSlice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, X, Eye, EyeOff } from 'lucide-react';
import CanvasElement from './CanvasElement';
import PropertiesPanel from './PropertiesPanel';
import { CanvasElement as CanvasElementType } from '../../types/canvas';

interface ComponentEditorProps {
  isOpen: boolean;
  componentId: string | null;
  onClose: () => void;
}

export const ComponentEditor: React.FC<ComponentEditorProps> = ({ isOpen, componentId, onClose }) => {
  const dispatch = useDispatch();
  const project = useSelector(selectCanvasProject);
  const selectedTool = useSelector(selectSelectedTool);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Get the component data
  const component = componentId ? components[componentId] : null;
  
  // Create a mock project structure for the component editor
  const componentProject = component ? {
    ...project,
    elements: {
      root: {
        id: 'root',
        type: 'container' as const,
        x: 0,
        y: 0,
        width: 800,
        height: 600,
        styles: {
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          minHeight: '600px',
          padding: '20px',
          border: '2px dashed #e5e7eb',
        },
        isContainer: true,
        flexDirection: 'column' as const,
        justifyContent: 'flex-start' as const,
        alignItems: 'stretch' as const,
        children: [component.rootElementId],
        classes: [],
      },
      ...component.elements,
    },
    selectedElementId: component.rootElementId,
  } : null;

  // Handle component updates
  const handleComponentUpdate = (updatedElements: Record<string, CanvasElementType>) => {
    if (!component || !componentId) return;

    // Remove the root container we added for editing
    const { root, ...componentElements } = updatedElements;
    
    dispatch(updateComponent({
      id: componentId,
      updates: {
        elements: componentElements,
        updatedAt: Date.now(),
      }
    }));
    
    setHasUnsavedChanges(true);
  };

  // Save changes and propagate to all instances
  const saveChanges = () => {
    setHasUnsavedChanges(false);
    // The updateComponent action already handles propagation to instances
  };

  // Close with unsaved changes warning
  const handleClose = () => {
    if (hasUnsavedChanges) {
      const confirmClose = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirmClose) return;
    }
    
    dispatch(setComponentEditorOpen(false));
    dispatch(setEditingComponent(null));
    onClose();
  };

  // Find all instances of this component in the main project
  const findComponentInstances = () => {
    if (!componentId) return [];
    
    return Object.values(project.elements).filter(
      element => element.type === 'component' && element.componentId === componentId
    );
  };

  const instances = findComponentInstances();

  if (!isOpen || !component || !componentProject) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={handleClose} data-testid="close-component-editor">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Main Editor
            </Button>
            
            <div>
              <h1 className="text-lg font-semibold">Component Editor</h1>
              <p className="text-sm text-gray-600">{component.name}</p>
            </div>
            
            {instances.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {instances.length} instance{instances.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              data-testid="toggle-preview-mode"
            >
              {isPreviewMode ? (
                <>
                  <EyeOff className="w-4 h-4 mr-2" />
                  Exit Preview
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </>
              )}
            </Button>
            
            {hasUnsavedChanges && (
              <Button onClick={saveChanges} data-testid="save-component-changes">
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            )}
            
            <Button variant="ghost" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Component Info */}
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm">
            <div className="font-medium text-blue-800">Editing Component</div>
            <div className="text-blue-600 mt-1">
              Changes made here will automatically update all {instances.length} instance{instances.length !== 1 ? 's' : ''} of this component in your project.
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas Area */}
        <div className="flex-1 relative">
          <div className="absolute inset-0 overflow-auto bg-gray-100">
            <div className="flex items-center justify-center min-h-full p-8">
              <div 
                className="bg-white shadow-lg rounded-lg overflow-hidden"
                style={{ 
                  minWidth: '800px', 
                  minHeight: '600px',
                  opacity: isPreviewMode ? 1 : 0.95
                }}
              >
                {/* Component Root Element */}
                <CanvasElement
                  element={componentProject.elements.root}
                  isSelected={componentProject.selectedElementId === 'root'}
                  isHovered={false}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Properties Panel */}
        {!isPreviewMode && (
          <div className="w-80 bg-white border-l border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-medium">Component Properties</h3>
              <p className="text-sm text-gray-600">
                Edit the selected element within this component
              </p>
            </div>
            
            {/* Custom Properties Panel for Component Editor */}
            <div className="overflow-y-auto h-full">
              <PropertiesPanel />
            </div>
          </div>
        )}
      </div>

      {/* Footer with Instance Info */}
      <div className="bg-gray-50 border-t border-gray-200 p-3">
        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-600">
            Component instances will update automatically when you make changes
          </div>
          
          {instances.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Instances:</span>
              {instances.slice(0, 3).map((instance) => (
                <Badge key={instance.id} variant="outline" className="text-xs">
                  {instance.id.split('-')[0]}...
                </Badge>
              ))}
              {instances.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{instances.length - 3} more
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComponentEditor;