import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { AppDispatch } from '../../store';
import { RootState } from '../../store';
import { updateElement, updateElementStyles, addCSSClass, removeCSSClass, deleteElement, selectElement } from '../../store/canvasSlice';
import { addCustomClass, updateCustomClass, deleteCustomClass } from '../../store/classSlice';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { cssClassGenerator } from '../../utils/cssClassGenerator';
import { getPropertyGroups, getCSSPropertyKey, formatValueWithUnit, PropertyConfig, ElementType } from '../../utils/propertyConfig';
import { PropertyInput } from './PropertyInput';
import { 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Plus, 
  X, 
  GripVertical, 
  Trash2, 
  ChevronDown, 
  ChevronRight,
  Info,
  Palette,
  Type,
  Layout,
  Move3D as Spacing,
  Sparkles,
  Settings as SettingsIcon
} from 'lucide-react';

const PropertiesPanel: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { project } = useSelector((state: RootState) => state.canvas);
  const selectedElement = project.selectedElementId ? project.elements[project.selectedElementId] : null;
  const [newClassName, setNewClassName] = useState('');
  const [selectedClassForEditing, setSelectedClassForEditing] = useState<string | null>(null);

  // Auto-select the class for editing if there's only one class
  React.useEffect(() => {
    if (selectedElement?.classes && selectedElement.classes.length === 1) {
      setSelectedClassForEditing(selectedElement.classes[0]);
    } else if (!selectedElement?.classes || selectedElement.classes.length === 0) {
      setSelectedClassForEditing(null);
    }
    // When element changes, reset selection unless there's exactly one class
  }, [selectedElement?.id, selectedElement?.classes]);
  const customClasses = useSelector((state: RootState) => (state as any).classes?.customClasses || {});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    layout: true,
    spacing: true,
    appearance: true,
    flex: true,
    grid: true
  });

  if (!selectedElement) {
    return (
      <aside className="absolute right-0 top-12 bottom-8 w-80 bg-white border-l border-gray-200 overflow-y-auto z-40">
        <div className="p-4 text-center text-gray-500">
          Select an element to edit properties
        </div>
      </aside>
    );
  }

  const propertyGroups = getPropertyGroups(selectedElement.type as ElementType, selectedElement);
  
  const handlePropertyChange = (propertyKey: string, value: any) => {
    // Handle special cases for element properties vs style properties
    if (['flexDirection', 'justifyContent', 'alignItems'].includes(propertyKey)) {
      // Update both element property and style for flex properties
      dispatch(updateElement({
        id: selectedElement.id,
        updates: { [propertyKey]: value }
      }));
      dispatch(updateElementStyles({
        id: selectedElement.id,
        styles: { [propertyKey]: value }
      }));
    } else if (['headingLevel', 'listType'].includes(propertyKey)) {
      // Update element-specific properties (not styles)
      const processedValue = propertyKey === 'headingLevel' ? parseInt(value, 10) : value;
      dispatch(updateElement({
        id: selectedElement.id,
        updates: { [propertyKey]: processedValue }
      }));
    } else if (['width', 'height'].includes(propertyKey)) {
      // Width and height are element properties, not styles
      // Extract numeric value for element property, keep full value for styles
      let elementValue = value;
      
      // If it's a unit string, extract the numeric part for the element property
      if (typeof value === 'string' && value.match(/^\d+(\.\d+)?(px|%|vw|vh|em|rem)$/)) {
        const numericValue = parseFloat(value);
        if (!isNaN(numericValue)) {
          elementValue = numericValue;
        }
      }
      
      // Update element property with the processed value
      dispatch(updateElement({
        id: selectedElement.id,
        updates: { [propertyKey]: elementValue }
      }));
      
      // Update styles with the full value for rendering consistency
      dispatch(updateElementStyles({
        id: selectedElement.id,
        styles: { [propertyKey]: value }
      }));
    } else {
      // Check if we're editing a specific class or allow inline styles
      if (selectedClassForEditing) {
        // Update the selected class styles locally
        const existingClass = customClasses[selectedClassForEditing];
        if (existingClass) {
          const updatedStyles = { ...existingClass.styles, [propertyKey]: value };
          dispatch(updateCustomClass({
            name: selectedClassForEditing,
            styles: updatedStyles
          }));
        }
      } else if (selectedElement.classes && selectedElement.classes.length > 1) {
        // Multiple classes available, user needs to select one
        console.warn('Multiple classes available. Please select a class to edit its styles.');
        return;
      } else {
        // No class selected or no classes - allow inline styles as fallback
        // This allows basic editing while encouraging class-based workflow
        dispatch(updateElementStyles({
          id: selectedElement.id,
          styles: { [propertyKey]: value }
        }));
      }
    }
  };

  const handleAddClass = () => {
    if (newClassName && cssClassGenerator.validateCSSClassName(newClassName)) {
      dispatch(addCSSClass({ elementId: selectedElement.id, className: newClassName }));
      
      // Create the class locally with empty styles initially
      dispatch(addCustomClass({
        name: newClassName,
        styles: {},
        description: `Custom class for ${selectedElement.type}`,
        category: 'custom'
      }));
      
      setNewClassName('');
      // Automatically select the new class for editing
      setSelectedClassForEditing(newClassName);
    }
  };

  const handleRemoveClass = (className: string) => {
    dispatch(removeCSSClass({ elementId: selectedElement.id, className }));
    // If we're editing the class being removed, clear selection
    if (selectedClassForEditing === className) {
      setSelectedClassForEditing(null);
    }
  };

  const handleDeleteElement = () => {
    if (selectedElement.id !== 'root') {
      dispatch(deleteElement(selectedElement.id));
      dispatch(selectElement('root'));
    }
  };

  const toggleGroup = (groupCategory: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupCategory]: !prev[groupCategory]
    }));
  };

  const getPropertyValue = (property: PropertyConfig) => {
    // If editing a specific class, get values from the class
    if (selectedClassForEditing) {
      const customClass = customClasses[selectedClassForEditing];
      if (customClass && customClass.styles && customClass.styles[property.key] !== undefined) {
        return customClass.styles[property.key];
      }
    }
    
    // Check element properties first (for flex properties and specific element properties like headingLevel)
    if (selectedElement[property.key as keyof typeof selectedElement] !== undefined) {
      const value = selectedElement[property.key as keyof typeof selectedElement];
      // Convert numbers to strings for dropdowns
      const result = property.type === 'select' ? String(value) : value;
      if (property.key === 'headingLevel') {
        console.log('Getting headingLevel value:', value, 'returning:', result);
      }
      return result;
    }
    
    // Then check styles using camelCase property names
    if (selectedElement.styles && selectedElement.styles[property.key] !== undefined) {
      return selectedElement.styles[property.key];
    }
    
    // Return appropriate default value based on property type
    if (property.type === 'select' && property.options && property.options.length > 0) {
      return property.options[0].value;
    }
    
    // For numeric and unit fields, check if there are element dimension properties to use as defaults
    if (property.type === 'number' || property.type === 'unit') {
      // For width/height, check element dimensions first
      if (property.key === 'width' && selectedElement.width !== undefined) {
        return property.type === 'unit' ? `${selectedElement.width}px` : selectedElement.width;
      }
      if (property.key === 'height' && selectedElement.height !== undefined) {
        return property.type === 'unit' ? `${selectedElement.height}px` : selectedElement.height;
      }
      // Default to 0 for other numeric fields
      return property.type === 'unit' ? `0${property.defaultUnit || property.units?.[0] || 'px'}` : 0;
    }
    
    return '';
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, React.ComponentType<any>> = {
      layout: Layout,
      spacing: Spacing,
      appearance: Palette,
      text: Type,
      flex: Layout,
      grid: Layout,
      effects: Sparkles,
      advanced: SettingsIcon
    };
    return icons[category] || Layout;
  };

  return (
    <aside 
      className="absolute right-0 top-12 bottom-8 w-80 bg-white border-l border-gray-200 overflow-y-auto z-40"
      data-testid="properties-panel"
    >
      {/* Panel Header */}
      <div className="p-4 border-b border-gray-200" data-testid="panel-header">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Properties</h2>
            <p className="text-sm text-gray-600 mt-1 capitalize">
              {selectedElement.type.replace(/([A-Z])/g, ' $1').trim()}
            </p>
          </div>
          {selectedElement.id !== 'root' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteElement}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              data-testid="delete-element-button"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Class Editing Section - Top Priority */}
      <div className="border-b border-gray-200 bg-blue-50">
        <div className="p-4">
          <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Palette className="w-4 h-4 text-blue-600" />
            Class Editing
          </h3>
          
          {/* Style Editing Status */}
          {!selectedClassForEditing && (!selectedElement.classes || selectedElement.classes.length === 0) && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md mb-3">
              <p className="text-sm text-amber-800">
                <strong>⚠️ Create a class to edit styles</strong><br/>
                Inline styles are disabled. Create or select a class below to customize this element's appearance.
              </p>
            </div>
          )}
          
          {!selectedClassForEditing && selectedElement.classes && selectedElement.classes.length > 1 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md mb-3">
              <p className="text-sm text-blue-800">
                <strong>💡 Click a class below to edit its styles</strong><br/>
                Select a class to customize its appearance, or create a new one.
              </p>
            </div>
          )}
          
          {!selectedClassForEditing && (!selectedElement.classes || selectedElement.classes.length === 0) && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md mb-3">
              <p className="text-sm text-green-800">
                <strong>✏️ Editing inline styles</strong><br/>
                Properties will be applied directly to this element. Consider creating a class for reusable styles.
              </p>
            </div>
          )}

          {/* Current Classes with Edit Selection */}
          {selectedElement.classes && selectedElement.classes.length > 0 ? (
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2">Applied Classes (Click to Edit)</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedElement.classes.map((className) => (
                    <button
                      key={className}
                      onClick={() => setSelectedClassForEditing(className === selectedClassForEditing ? null : className)}
                      className={`flex items-center gap-2 px-3 py-1 border rounded-full transition-colors ${
                        selectedClassForEditing === className
                          ? 'bg-blue-100 border-blue-300 text-blue-800'
                          : 'bg-white border-gray-200 hover:border-blue-200'
                      }`}
                      title={`Click to edit .${className}`}
                    >
                      <span className="text-sm font-mono">.{className}</span>
                      {selectedClassForEditing === className && (
                        <span className="text-xs text-blue-600">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Current Editing Mode Indicator */}
              {selectedClassForEditing && (
                <div className="p-2 bg-white rounded border-l-4 border-blue-400">
                  <div className="text-sm font-medium">
                    <span className="text-blue-700">
                      Editing: <span className="font-mono">.{selectedClassForEditing}</span>
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Property changes will apply to this class
                  </div>
                </div>
              )}
            </div>
          ) : null}
          
          {/* Add New Class */}
          <div className="mt-4 p-3 bg-white rounded border">
            <Label className="text-sm font-medium text-gray-700 mb-2">Add New Class</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="class-name"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                className="flex-1 font-mono"
                onKeyPress={(e) => e.key === 'Enter' && handleAddClass()}
                data-testid="input-new-class"
              />
              <Button
                onClick={handleAddClass}
                size="sm"
                className="bg-blue-600 text-white hover:bg-blue-700"
                disabled={!newClassName || !cssClassGenerator.validateCSSClassName(newClassName)}
                data-testid="button-add-class"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Class Suggestions */}
            <div className="space-y-2 mt-2">
              <div className="text-xs font-medium text-gray-600">Suggestions:</div>
              <div className="flex flex-wrap gap-1">
                {cssClassGenerator.generateCSSClassSuggestions(selectedElement.type).slice(0, 6).map(suggestion => (
                  <Button
                    key={suggestion.name}
                    variant="outline"
                    size="sm"
                    onClick={() => setNewClassName(suggestion.name)}
                    className="text-xs h-6 px-2"
                    title={suggestion.description}
                    data-testid={`button-suggestion-${suggestion.name}`}
                  >
                    {suggestion.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Property Groups */}
      <div className="flex-1">
        {propertyGroups.map((group) => {
          const isExpanded = expandedGroups[group.category];
          const IconComponent = getCategoryIcon(group.category);
          
          return (
            <div key={group.category} className="border-b border-gray-200">
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(group.category)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                data-testid={`group-header-${group.category}`}
              >
                <div className="flex items-center gap-2">
                  <IconComponent className="w-4 h-4 text-gray-600" />
                  <h3 className="font-medium text-gray-900">{group.label}</h3>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {group.properties.length}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {/* Group Properties */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-4" data-testid={`group-content-${group.category}`}>
                  {group.properties.map((property) => (
                    <PropertyInput
                      key={property.key}
                      config={property}
                      value={getPropertyValue(property)}
                      onChange={(value) => handlePropertyChange(property.key, value)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}


      </div>
    </aside>
  );
};

export default PropertiesPanel;