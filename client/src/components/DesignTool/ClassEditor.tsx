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
import { Plus, X, Edit3, Save, Trash2, Download, Edit } from 'lucide-react';
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
  const [newPropertyKey, setNewPropertyKey] = useState('');
  const [newPropertyValue, setNewPropertyValue] = useState('');
  const [renamingClass, setRenamingClass] = useState<string | null>(null);
  const [renameClassName, setRenameClassName] = useState('');

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

  // Start editing a class (either custom or applied)
  const startEditingClass = (className: string) => {
    const classData = customClasses[className] as { styles: Record<string, any> };
    if (classData) {
      setEditingClass(className);
      setClassStyles({ ...classData.styles });
    }
  };

  // Start editing an applied class (create custom class if doesn't exist)
  const startEditingAppliedClass = (className: string) => {
    const classData = customClasses[className] as { styles: Record<string, any> };
    if (classData) {
      // Edit existing custom class
      setEditingClass(className);
      setClassStyles({ ...classData.styles });
    } else {
      // For non-custom classes, try to extract styles from the current element
      setEditingClass(className);
      
      if (selectedElement) {
        // Get the element's current styles as a starting point
        const elementStyles = { ...selectedElement.styles };
        
        // Clean up the styles (remove defaults/inherited values)
        const cleanStyles = Object.entries(elementStyles).reduce((acc, [key, value]) => {
          if (value && value !== 'initial' && value !== 'inherit') {
            // Convert objects to strings if needed
            if (typeof value === 'object' && value !== null) {
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
        
        setClassStyles(cleanStyles);
      } else {
        // No element selected, start with empty styles
        setClassStyles({});
      }
    }
  };

  // Add a new property to the class being edited
  const addNewProperty = () => {
    if (!newPropertyKey.trim() || !newPropertyValue.trim()) return;
    
    setClassStyles(prev => ({
      ...prev,
      [newPropertyKey.trim()]: newPropertyValue.trim()
    }));
    
    setNewPropertyKey('');
    setNewPropertyValue('');
  };

  // Remove a property from the class being edited
  const removeProperty = (propertyKey: string) => {
    setClassStyles(prev => {
      const newStyles = { ...prev };
      delete newStyles[propertyKey];
      return newStyles;
    });
  };

  // Save class changes
  const saveClassChanges = () => {
    if (!editingClass) return;
    
    // Check if this class exists, if not create it
    if (customClasses[editingClass]) {
      dispatch(updateCustomClass({
        name: editingClass,
        styles: classStyles
      }));
    } else {
      // Create new custom class
      dispatch(addCustomClass({
        name: editingClass,
        styles: classStyles,
        description: `Custom class for ${editingClass}`
      }));
    }
    
    setEditingClass(null);
    setClassStyles({});
    setNewPropertyKey('');
    setNewPropertyValue('');
  };

  // Delete a custom class
  const deleteClass = (className: string) => {
    dispatch(deleteCustomClass(className));
  };

  // Start renaming a class
  const startRenamingClass = (className: string) => {
    setRenamingClass(className);
    setRenameClassName(className);
  };

  // Rename a class
  const renameClass = () => {
    if (!renamingClass || !renameClassName.trim() || renameClassName.trim() === renamingClass) {
      setRenamingClass(null);
      setRenameClassName('');
      return;
    }

    const trimmedNewName = renameClassName.trim();
    
    // Check if new name already exists
    if (customClasses[trimmedNewName]) {
      alert('A class with that name already exists');
      return;
    }

    // Get the old class data
    const oldClassData = customClasses[renamingClass] as { styles: Record<string, any>; description?: string };
    if (!oldClassData) return;

    // Create the new class with the same properties
    dispatch(addCustomClass({
      name: trimmedNewName,
      styles: oldClassData.styles,
      description: oldClassData.description || `Renamed from ${renamingClass}`
    }));

    // Update all elements that use the old class name
    Object.values(project.elements).forEach((element: any) => {
      if (element.classes && element.classes.includes(renamingClass)) {
        // Remove old class and add new class
        dispatch(removeCSSClass({ elementId: element.id, className: renamingClass }));
        dispatch(addCSSClass({ elementId: element.id, className: trimmedNewName }));
      }
    });

    // Delete the old class
    dispatch(deleteCustomClass(renamingClass));

    // Clean up state
    setRenamingClass(null);
    setRenameClassName('');
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
                            <div key={className} className="flex items-center gap-1 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full">
                              <span className="text-sm font-mono text-blue-800">.{className}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0 hover:bg-blue-100"
                                onClick={() => startEditingAppliedClass(className)}
                                data-testid={`edit-class-${className}`}
                                title="Edit this class"
                              >
                                <Edit3 className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0 hover:bg-red-100"
                                onClick={() => removeClassFromElement(className)}
                                data-testid={`remove-class-${className}`}
                                title="Remove from element"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
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
                                  title="Apply to selected element"
                                >
                                  Apply
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEditingClass(name)}
                                data-testid={`edit-class-${name}`}
                                title="Edit class properties"
                              >
                                <Edit3 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startRenamingClass(name)}
                                data-testid={`rename-class-${name}`}
                                title="Rename class"
                              >
                                <Edit className="w-4 h-4 text-blue-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteClass(name)}
                                data-testid={`delete-class-${name}`}
                                title="Delete class"
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
              {editingClass && !customClasses[editingClass] && (
                <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                  This class will be created as a new custom class. Starting with current element styles.
                </div>
              )}
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Edit the styles for this class. Changes will apply to all elements using this class.
              </div>
              
              {/* Existing Properties */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-gray-800">Current Properties</h4>
                {Object.keys(classStyles).length === 0 ? (
                  <div className="text-sm text-gray-500">No properties defined</div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(classStyles).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1 grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-gray-600">Property</Label>
                            <div className="font-mono text-sm">{key}</div>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-600">Value</Label>
                            <Input
                              value={String(value)}
                              onChange={(e) => setClassStyles(prev => ({ ...prev, [key]: e.target.value }))}
                              className="font-mono text-sm"
                            />
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeProperty(key)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add New Property */}
              <div className="space-y-3 p-4 border border-dashed border-gray-300 rounded-lg">
                <h4 className="font-medium text-sm text-gray-800">Add New Property</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>CSS Property</Label>
                    <Input
                      placeholder="e.g., margin-top, transform, opacity"
                      value={newPropertyKey}
                      onChange={(e) => setNewPropertyKey(e.target.value)}
                      className="font-mono"
                    />
                  </div>
                  <div>
                    <Label>Value</Label>
                    <Input
                      placeholder="e.g., 10px, center, 0.5"
                      value={newPropertyValue}
                      onChange={(e) => setNewPropertyValue(e.target.value)}
                      className="font-mono"
                    />
                  </div>
                </div>
                <Button 
                  onClick={addNewProperty}
                  disabled={!newPropertyKey.trim() || !newPropertyValue.trim()}
                  size="sm"
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Property
                </Button>
              </div>
              
              <div className="flex justify-between">
                <div className="text-xs text-gray-500">
                  {Object.keys(classStyles).length} properties
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => {
                    setEditingClass(null);
                    setClassStyles({});
                    setNewPropertyKey('');
                    setNewPropertyValue('');
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={saveClassChanges}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Class Rename Dialog */}
      {renamingClass && (
        <Dialog open={!!renamingClass} onOpenChange={() => setRenamingClass(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Rename Class</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Renaming class: <span className="font-mono">.{renamingClass}</span>
              </div>
              
              <div className="space-y-2">
                <Label>New Class Name</Label>
                <Input
                  placeholder="Enter new class name..."
                  value={renameClassName}
                  onChange={(e) => setRenameClassName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && renameClass()}
                  className="font-mono"
                />
              </div>
              
              <div className="text-xs text-gray-500">
                This will update all elements using this class
              </div>
              
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setRenamingClass(null);
                    setRenameClassName('');
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={renameClass}
                  disabled={!renameClassName.trim() || renameClassName.trim() === renamingClass}
                >
                  Rename Class
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