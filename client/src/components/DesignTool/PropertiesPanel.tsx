import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { updateElement, updateElementStyles, addCSSClass, removeCSSClass, deleteElement, selectElement } from '../../store/canvasSlice';
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
  const dispatch = useDispatch();
  const { project } = useSelector((state: RootState) => state.canvas);
  const selectedElement = project.selectedElementId ? project.elements[project.selectedElementId] : null;
  const [newClassName, setNewClassName] = useState('');
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
      // Regular style update - use camelCase for React style properties
      dispatch(updateElementStyles({
        id: selectedElement.id,
        styles: { [propertyKey]: value }
      }));
    }
  };

  const handleAddClass = () => {
    if (newClassName && cssClassGenerator.validateCSSClassName(newClassName)) {
      dispatch(addCSSClass({ elementId: selectedElement.id, className: newClassName }));
      setNewClassName('');
    }
  };

  const handleRemoveClass = (className: string) => {
    dispatch(removeCSSClass({ elementId: selectedElement.id, className }));
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

        {/* CSS Classes Section */}
        <div className="border-b border-gray-200">
          <div className="p-4">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <X className="w-4 h-4 text-gray-600" />
              CSS Classes
            </h3>
            
            {/* Existing Classes */}
            {selectedElement.classes && selectedElement.classes.length > 0 && (
              <div className="mb-4">
                <Label className="text-sm font-medium text-gray-700 mb-2">Current Classes</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedElement.classes.map((className) => (
                    <div key={className} className="flex items-center gap-1 bg-blue-50 border border-blue-200 rounded px-2 py-1">
                      <span className="text-sm font-mono text-blue-800">{className}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveClass(className)}
                        className="p-0 h-4 w-4 text-blue-600 hover:text-red-600"
                        data-testid={`remove-class-${className}`}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Add New Class */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2">Add Class</Label>
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
                  className="bg-primary text-white hover:bg-blue-600"
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
                  {cssClassGenerator.generateCSSClassSuggestions(selectedElement.type).slice(0, 8).map(suggestion => (
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
      </div>
    </aside>
  );
};

export default PropertiesPanel;