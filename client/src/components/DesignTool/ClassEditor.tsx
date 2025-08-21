import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { updateElementStyles, addCSSClass, removeCSSClass } from '../../store/canvasSlice';
import { addCustomClass, updateCustomClass, deleteCustomClass } from '../../store/classSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, X, Edit3, Save, Trash2, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PropertyInput } from './PropertyInput';
import { getPropertyGroups, PropertyConfig, ElementType } from '../../utils/propertyConfig';

interface ClassEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ClassEditor: React.FC<ClassEditorProps> = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const { project } = useSelector((state: RootState) => state.canvas);
  const { customClasses } = useSelector((state: RootState) => state.classes);
  const selectedElement = project.selectedElementId ? project.elements[project.selectedElementId] : null;
  
  const [newClassName, setNewClassName] = useState('');
  const [editingClass, setEditingClass] = useState<string | null>(null);
  const [classStyles, setClassStyles] = useState<Record<string, any>>({});

  // Extract styles from selected element into a new class
  const extractStylesToClass = () => {
    if (!selectedElement || !newClassName.trim()) return;
    
    const className = newClassName.trim();
    const elementStyles = { ...selectedElement.styles };
    
    // Remove default/inherited styles to keep class clean and ensure all values are strings
    const cleanStyles = Object.entries(elementStyles).reduce((acc, [key, value]) => {
      if (value && value !== 'initial' && value !== 'inherit') {
        // Convert objects to strings if needed (e.g., {borderWidth: '1px'} -> '1px')
        if (typeof value === 'object' && value !== null) {
          // If it's an object with properties, try to extract the main value
          if (value.borderWidth) acc[key] = String(value.borderWidth);
          else if (value.width) acc[key] = String(value.width);
          else if (value.color) acc[key] = String(value.color);
          else acc[key] = JSON.stringify(value);
        } else {
          acc[key] = String(value);
        }
      }
      return acc;
    }, {} as Record<string, any>);

    // Add the custom class
    dispatch(addCustomClass({
      name: className,
      styles: cleanStyles,
      description: `Extracted from ${selectedElement.type} element`
    }));

    // Apply the class to the current element
    dispatch(addCSSClass({ elementId: selectedElement.id, className }));
    
    // Clear the element's inline styles since they're now in the class
    dispatch(updateElementStyles({
      id: selectedElement.id,
      styles: {}
    }));

    setNewClassName('');
  };

  // Apply an existing class to the selected element
  const applyClassToElement = (className: string) => {
    if (!selectedElement) return;
    
    dispatch(addCSSClass({ elementId: selectedElement.id, className }));
  };

  // Remove a class from the selected element
  const removeClassFromElement = (className: string) => {
    if (!selectedElement) return;
    
    dispatch(removeCSSClass({ elementId: selectedElement.id, className }));
  };

  // Start editing a class
  const startEditingClass = (className: string) => {
    const classData = customClasses[className] as { styles: Record<string, any> };
    if (classData) {
      setEditingClass(className);
      setClassStyles({ ...classData.styles });
    }
  };

  // Save class changes
  const saveClassChanges = () => {
    if (!editingClass) return;
    
    dispatch(updateCustomClass({
      name: editingClass,
      styles: classStyles
    }));
    
    setEditingClass(null);
    setClassStyles({});
  };

  // Delete a custom class
  const deleteClass = (className: string) => {
    dispatch(deleteCustomClass(className));
  };

  // Generate CSS for export
  const generateCSS = () => {
    let css = '/* Custom Classes */\n\n';
    
    Object.entries(customClasses).forEach(([name, classData]) => {
      const typedClassData = classData as { styles: Record<string, any> };
      css += `.${name} {\n`;
      Object.entries(typedClassData.styles).forEach(([property, value]) => {
        // Convert camelCase to kebab-case
        const cssProperty = property.replace(/([A-Z])/g, '-$1').toLowerCase();
        // Ensure value is a string
        const cssValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        css += `  ${cssProperty}: ${cssValue};\n`;
      });
      css += '}\n\n';
    });
    
    return css;
  };

  // Copy CSS to clipboard
  const exportCSS = async () => {
    const css = generateCSS();
    try {
      await navigator.clipboard.writeText(css);
      // Could add toast notification here
    } catch (err) {
      console.error('Failed to copy CSS:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Class Editor</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSS}>
              <Download className="w-4 h-4 mr-2" />
              Export CSS
            </Button>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Extract Styles Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Create New Class</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedElement ? (
                  <>
                    <div className="text-sm text-gray-600">
                      Selected: {selectedElement.type} element
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Class Name</Label>
                      <Input
                        placeholder="my-custom-class"
                        value={newClassName}
                        onChange={(e) => setNewClassName(e.target.value)}
                        data-testid="new-class-name-input"
                      />
                    </div>
                    
                    <Button 
                      onClick={extractStylesToClass}
                      disabled={!newClassName.trim()}
                      className="w-full"
                      data-testid="extract-styles-button"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Class from Current Styles
                    </Button>
                    
                    {/* Current Element Classes */}
                    {selectedElement.classes && selectedElement.classes.length > 0 && (
                      <div className="space-y-2">
                        <Label>Applied Classes</Label>
                        <div className="flex flex-wrap gap-2">
                          {selectedElement.classes.map((className) => (
                            <Badge key={className} variant="secondary" className="flex items-center gap-1">
                              {className}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0 hover:bg-red-100"
                                onClick={() => removeClassFromElement(className)}
                                data-testid={`remove-class-${className}`}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-gray-500">
                    Select an element to create or apply classes
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Custom Classes Management */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Custom Classes ({Object.keys(customClasses).length})</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(customClasses).length === 0 ? (
                  <div className="text-sm text-gray-500">No custom classes created yet</div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(customClasses).map(([name, classData]) => {
                      const typedClassData = classData as { description?: string; styles: Record<string, any> };
                      return (
                        <div key={name} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium">.{name}</div>
                            <div className="flex gap-1">
                              {selectedElement && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => applyClassToElement(name)}
                                  data-testid={`apply-class-${name}`}
                                >
                                  Apply
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEditingClass(name)}
                                data-testid={`edit-class-${name}`}
                              >
                                <Edit3 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteClass(name)}
                                data-testid={`delete-class-${name}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          {typedClassData.description && (
                            <div className="text-xs text-gray-500 mb-2">{typedClassData.description}</div>
                          )}
                          <div className="text-xs font-mono bg-gray-50 p-2 rounded">
                            {Object.entries(typedClassData.styles).map(([prop, value]) => (
                              <div key={prop}>{prop}: {String(value)};</div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Class Editing Dialog */}
      {editingClass && (
        <Dialog open={!!editingClass} onOpenChange={() => setEditingClass(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Class: .{editingClass}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Edit the styles for this class. Changes will apply to all elements using this class.
              </div>
              
              {/* Style Properties */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Common style properties */}
                {[
                  { key: 'backgroundColor', label: 'Background Color', type: 'color' },
                  { key: 'color', label: 'Text Color', type: 'color' },
                  { key: 'fontSize', label: 'Font Size', type: 'unit', units: ['px', 'rem', 'em'] },
                  { key: 'fontWeight', label: 'Font Weight', type: 'select', options: [
                    { value: '400', label: 'Normal' },
                    { value: '600', label: 'Semi Bold' },
                    { value: '700', label: 'Bold' }
                  ]},
                  { key: 'padding', label: 'Padding', type: 'unit', units: ['px', 'rem', 'em'] },
                  { key: 'margin', label: 'Margin', type: 'unit', units: ['px', 'rem', 'em'] },
                  { key: 'borderRadius', label: 'Border Radius', type: 'unit', units: ['px', 'rem'] },
                  { key: 'border', label: 'Border', type: 'text' }
                ].map((config) => (
                  <div key={config.key} className="space-y-1">
                    <Label>{config.label}</Label>
                    <PropertyInput
                      config={config as PropertyConfig}
                      value={classStyles[config.key] || ''}
                      onChange={(value) => setClassStyles(prev => ({ ...prev, [config.key]: value }))}
                    />
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingClass(null)}>
                  Cancel
                </Button>
                <Button onClick={saveClassChanges}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ClassEditor;