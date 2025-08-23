import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { selectComponentDefinition } from '../../store/selectors';
import { updateComponentDefinition, closeComponentTab } from '../../store/componentDefinitionsSlice';
import { ComponentId, CanvasElement } from '../../types/canvas';
import { Button } from '../ui/button';
import { Save, X, AlertCircle } from 'lucide-react';

interface ComponentEditorTabProps {
  componentId: ComponentId;
  isActive: boolean;
  onClose: (componentId: ComponentId) => void;
}

/**
 * Tabbed component editor that provides an isolated editing environment
 * for component definitions
 */
const ComponentEditorTab: React.FC<ComponentEditorTabProps> = ({
  componentId,
  isActive,
  onClose
}) => {
  const dispatch = useDispatch();
  const componentDef = useSelector((state: RootState) => 
    selectComponentDefinition(state, componentId)
  );
  
  const [editingTemplate, setEditingTemplate] = useState<CanvasElement | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isModified, setIsModified] = useState(false);

  // Initialize editing template when component changes
  useEffect(() => {
    if (componentDef && !editingTemplate) {
      setEditingTemplate({ ...componentDef.template });
    }
  }, [componentDef, editingTemplate]);

  // Track modifications
  useEffect(() => {
    if (editingTemplate && componentDef) {
      const hasChanges = JSON.stringify(editingTemplate) !== JSON.stringify(componentDef.template);
      setHasUnsavedChanges(hasChanges);
      setIsModified(hasChanges);
    }
  }, [editingTemplate, componentDef]);

  const handleSave = useCallback(() => {
    if (!componentDef || !editingTemplate) return;

    const updatedDef = {
      ...componentDef,
      template: editingTemplate,
      version: componentDef.version + 1,
      updatedAt: Date.now()
    };

    dispatch(updateComponentDefinition(updatedDef));
    setHasUnsavedChanges(false);
    setIsModified(false);
    
    console.log('Component saved:', updatedDef.name, 'v' + updatedDef.version);
  }, [componentDef, editingTemplate, dispatch]);

  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      const shouldClose = confirm(
        'You have unsaved changes. Are you sure you want to close this component editor?'
      );
      if (!shouldClose) return;
    }

    onClose(componentId);
  }, [componentId, onClose, hasUnsavedChanges]);

  const handleTemplateUpdate = useCallback((updates: Partial<CanvasElement>) => {
    if (!editingTemplate) return;
    
    setEditingTemplate({
      ...editingTemplate,
      ...updates
    });
  }, [editingTemplate]);

  if (!componentDef) {
    return (
      <div className="component-editor-tab-error p-4 bg-red-50 border border-red-200">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle size={16} />
          <span className="text-sm">Component definition not found</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`component-editor-tab flex flex-col h-full ${
        isActive ? 'block' : 'hidden'
      }`}
      data-testid={`component-editor-${componentId}`}
    >
      {/* Tab Header */}
      <div className="flex items-center justify-between p-3 border-b bg-white">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-gray-900">
            {componentDef.name}
            {isModified && <span className="text-orange-500 ml-1">*</span>}
          </h3>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            v{componentDef.version}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="default"
            onClick={handleSave}
            disabled={!hasUnsavedChanges}
            className="text-xs"
            data-testid={`button-save-component-${componentId}`}
          >
            <Save size={12} className="mr-1" />
            Save
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={handleClose}
            className="text-xs"
            data-testid={`button-close-component-${componentId}`}
          >
            <X size={12} />
          </Button>
        </div>
      </div>

      {/* Isolated Editing Canvas */}
      <div className="component-editor-canvas flex-1 bg-gray-50 relative overflow-auto">
        <div className="absolute inset-4">
          <div className="w-full h-full bg-white rounded border shadow-sm p-4">
            {/* Component Template Editor */}
            <div 
              className="component-template-editor w-full h-full relative"
              style={{
                minHeight: '200px'
              }}
            >
              {editingTemplate && (
                <div
                  className="template-element"
                  style={{
                    ...editingTemplate.styles,
                    width: editingTemplate.width,
                    height: editingTemplate.height,
                    position: 'relative'
                  }}
                  data-testid={`template-element-${editingTemplate.id}`}
                >
                  {/* Render template content based on type */}
                  {editingTemplate.type === 'text' && (
                    <div
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => handleTemplateUpdate({ content: e.currentTarget.textContent || '' })}
                      className="w-full h-full outline-none"
                      dangerouslySetInnerHTML={{ __html: editingTemplate.content || 'Text' }}
                    />
                  )}
                  
                  {editingTemplate.type === 'button' && (
                    <button
                      className="w-full h-full"
                      onDoubleClick={(e) => {
                        const newText = prompt('Enter button text:', editingTemplate.buttonText || 'Button');
                        if (newText !== null) {
                          handleTemplateUpdate({ buttonText: newText });
                        }
                      }}
                    >
                      {editingTemplate.buttonText || editingTemplate.content || 'Button'}
                    </button>
                  )}
                  
                  {editingTemplate.type === 'rectangle' && (
                    <div className="w-full h-full border border-gray-300" />
                  )}
                  
                  {editingTemplate.type === 'container' && (
                    <div className="w-full h-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-500 text-sm">
                      Container Template
                      <br />
                      <small>Add child elements here</small>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="component-editor-status border-t p-2 bg-gray-50 text-xs text-gray-600">
        <div className="flex justify-between items-center">
          <span>
            Editing: {componentDef.name} 
            {componentDef.categoryId && ` • Category: ${componentDef.categoryId}`}
          </span>
          <span>
            {hasUnsavedChanges ? 'Unsaved changes' : 'All changes saved'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ComponentEditorTab;