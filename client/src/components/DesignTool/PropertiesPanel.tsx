import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import type { AppDispatch } from '../../store';
import { RootState } from '../../store';
import { updateElement, updateElementStyles, addCSSClass, removeCSSClass, deleteElement, selectElement } from '../../store/canvasSlice';
import { selectCurrentElements, selectSelectedElementId, selectCustomClasses } from '../../store/selectors';
import { addCustomClass, updateCustomClass, batchUpdateCustomClass, deleteCustomClass } from '../../store/classSlice';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { cssClassGenerator } from '../../utils/cssClassGenerator';
import { getPropertyGroups, getCSSPropertyKey, formatValueWithUnit, PropertyConfig, ElementType } from '../../utils/propertyConfig';
import { PropertyInput } from './PropertyInput';
import CompoundPropertyInput from './CompoundPropertyInput';
import ResponsivePropertyInput from './ResponsivePropertyInput';
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
  Settings as SettingsIcon,
  FileText,
  Edit3,
  Unlink,
  Component
} from 'lucide-react';
import ButtonStateSelector from './ButtonStateSelector';
import FlexLayoutControls from './FlexLayoutControls';

const PropertiesPanel: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const currentElements = useSelector(selectCurrentElements);
  const selectedElementId = useSelector(selectSelectedElementId);
  const selectedElement = selectedElementId ? currentElements[selectedElementId] : null;

  // Check if selected element is a component instance
  const isComponentInstance = selectedElement?.componentRef;
  const [newClassName, setNewClassName] = useState('');
  const [selectedClassForEditing, setSelectedClassForEditing] = useState<string | null>(null);
  const [selectedButtonState, setSelectedButtonState] = useState<string>('default');

  // Auto-select the class for editing if there's only one class
  React.useEffect(() => {
    if (selectedElement?.classes && selectedElement.classes.length === 1) {
      setSelectedClassForEditing(selectedElement.classes[0]);
    } else if (!selectedElement?.classes || selectedElement.classes.length === 0) {
      setSelectedClassForEditing(null);
    }
    // When element changes, reset selection unless there's exactly one class

    // Reset button state when element changes
    if (selectedElement?.type === 'button') {
      setSelectedButtonState('default');
      // Update button's current state on canvas
      dispatch(updateElement({
        id: selectedElement.id,
        updates: { currentButtonState: 'default' }
      }));
    }
  }, [selectedElement?.id, selectedElement?.classes]);
  const customClasses = useSelector(selectCustomClasses);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    content: true,
    layout: true,
    spacing: true,
    appearance: true,
    flex: true,
    grid: true
  });

  if (!selectedElement) {
    return (
      <aside className="absolute right-0 top-16 bottom-0 w-80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-l border-gray-200/60 dark:border-gray-700/60 overflow-y-auto z-40 shadow-lg">
        <div className="p-8 text-center text-gray-500 dark:text-gray-400 h-full flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-xl flex items-center justify-center mb-4 shadow-sm">
            <SettingsIcon className="w-8 h-8 text-blue-500 dark:text-blue-400" />
          </div>
          <div className="font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('properties.clickElement')}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">{t('properties.selectElementToEdit')}</div>
        </div>
      </aside>
    );
  }

  // CRITICAL: Special Properties Panel for Component Instances
  if (isComponentInstance) {
    return (
      <aside className="absolute right-0 top-16 bottom-0 w-80 bg-white/95 backdrop-blur-md border-l border-gray-200/60 overflow-y-auto z-40 shadow-lg" data-testid="properties-panel">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Component className="w-5 h-5 text-blue-600" />
            <h3 className="font-medium text-gray-900">{t('components.componentInstance')}</h3>
          </div>

          <div className="space-y-4">
            {/* Component Info */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">{t('components.componentInfo')}</span>
              </div>
              <p className="text-sm text-blue-700">
                {t('components.instanceDescription')}
              </p>
              <div className="mt-2 text-xs text-blue-600">
                ID: {selectedElement.id}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={() => {
                  // TODO: Open component editor in new tab
                }}
                className="w-full flex items-center gap-2"
                variant="default"
                data-testid="edit-component-button"
              >
                <Edit3 className="w-4 h-4" />
                Edit Component Template
              </Button>

              <Button
                onClick={() => {
                  // TODO: Release from component (create independent elements)
                }}
                className="w-full flex items-center gap-2"
                variant="outline"
                data-testid="release-component-button"
              >
                <Unlink className="w-4 h-4" />
                Release from Component
              </Button>
            </div>

            {/* Instance Properties */}
            <div className="pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Instance Properties</h4>
              <div className="space-y-3">
                {/* Position */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="x-position" className="text-xs">X Position</Label>
                    <Input
                      id="x-position"
                      type="number"
                      value={selectedElement.x || 0}
                      onChange={(e) => {
                        const newX = parseInt(e.target.value) || 0;
                        dispatch(updateElement({ id: selectedElement.id, updates: { x: newX } }));
                      }}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label htmlFor="y-position" className="text-xs">Y Position</Label>
                    <Input
                      id="y-position"
                      type="number"
                      value={selectedElement.y || 0}
                      onChange={(e) => {
                        const newY = parseInt(e.target.value) || 0;
                        dispatch(updateElement({ id: selectedElement.id, updates: { y: newY } }));
                      }}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                {/* Size */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="width" className="text-xs">Width</Label>
                    <Input
                      id="width"
                      type="number"
                      value={selectedElement.width || ''}
                      onChange={(e) => {
                        const newWidth = parseInt(e.target.value) || undefined;
                        dispatch(updateElement({ id: selectedElement.id, updates: { width: newWidth } }));
                      }}
                      className="h-8 text-xs"
                      placeholder="Auto"
                    />
                  </div>
                  <div>
                    <Label htmlFor="height" className="text-xs">Height</Label>
                    <Input
                      id="height"
                      type="number"
                      value={selectedElement.height || ''}
                      onChange={(e) => {
                        const newHeight = parseInt(e.target.value) || undefined;
                        dispatch(updateElement({ id: selectedElement.id, updates: { height: newHeight } }));
                      }}
                      className="h-8 text-xs"
                      placeholder="Auto"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Delete Button */}
            <div className="pt-4 border-t border-gray-200">
              <Button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this component instance?')) {
                    dispatch(deleteElement(selectedElement.id));
                  }
                }}
                variant="destructive"
                size="sm"
                className="w-full flex items-center gap-2"
                data-testid="delete-element-button"
              >
                <Trash2 className="w-4 h-4" />
                Delete Instance
              </Button>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  const propertyGroups = getPropertyGroups(selectedElement.type as ElementType, selectedElement);

  // Batch property change handler for multiple properties at once (e.g., all border sides)
  const handleBatchPropertyChange = (propertyUpdates: Record<string, any>) => {
    if (selectedClassForEditing) {
      // Update the selected class with batch updates
      dispatch(batchUpdateCustomClass({
        name: selectedClassForEditing,
        styleUpdates: propertyUpdates
      }));
    } else if (selectedElement.classes && selectedElement.classes.length > 1) {
      // Multiple classes available, user needs to select one
      return;
    } else {
      // Auto-create a class for batch style updates
      const autoClassName = `${selectedElement.type}-${Date.now().toString(36)}`;

      // Add class to element
      dispatch(addCSSClass({ elementId: selectedElement.id, className: autoClassName }));

      // Create the class with batch styles
      dispatch(addCustomClass({
        name: autoClassName,
        styles: propertyUpdates,
        description: `Auto-generated class for ${selectedElement.type}`,
        category: 'auto-generated'
      }));
    }
  };

  const handlePropertyChange = (propertyKey: string, value: any) => {
    // Removed debug logging to improve performance

    // Handle special element-specific properties (not CSS styles)
    if (['headingLevel', 'listType'].includes(propertyKey)) {
      // Update element-specific properties (not styles)
      const processedValue = propertyKey === 'headingLevel' ? parseInt(value, 10) : value;
      dispatch(updateElement({
        id: selectedElement.id,
        updates: {
          [propertyKey]: processedValue
        }
      }));
      return;
    }

    // Handle width and height as both element properties and styles
    if (['width', 'height'].includes(propertyKey)) {
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
        updates: {
          [propertyKey]: elementValue
        }
      }));
    }

    // Handle flex properties that need both element and style updates
    if (['flexDirection', 'justifyContent', 'alignItems'].includes(propertyKey)) {
      // Update element property for internal logic
      dispatch(updateElement({
        id: selectedElement.id,
        updates: {
          [propertyKey]: value
        }
      }));
    }

    // ALL style properties (including width/height and flex) go through classes
    // This ensures consistent class-based styling for everything
    if (selectedClassForEditing) {
      // For button elements with state selection, store as state-specific property
      let actualPropertyKey = propertyKey;
      if (selectedElement.type === 'button' && selectedButtonState !== 'default') {
        actualPropertyKey = `${selectedButtonState}:${propertyKey}`;
      }

      // Update the selected class styles
      const existingClass = customClasses[selectedClassForEditing];
      if (existingClass) {
        const updatedStyles = { ...existingClass.styles, [actualPropertyKey]: value };
        dispatch(updateCustomClass({
          name: selectedClassForEditing,
          styles: updatedStyles
        }));
      } else {
        // Class doesn't exist in customClasses store - create it first
        dispatch(addCustomClass({
          name: selectedClassForEditing,
          styles: { [actualPropertyKey]: value },
          description: `Auto-generated class for ${selectedElement.type}`,
          category: 'auto-generated'
        }));
      }
    } else if (selectedElement.classes && selectedElement.classes.length > 1) {
      // Multiple classes available, user needs to select one
      return;
    } else {
      // Auto-create a class for any style property
      const autoClassName = `${selectedElement.type}-${Date.now().toString(36)}`;

      // For button elements with state selection, store as state-specific property
      let actualPropertyKey = propertyKey;
      if (selectedElement.type === 'button' && selectedButtonState !== 'default') {
        actualPropertyKey = `${selectedButtonState}:${propertyKey}`;
      }

      // Add class to element
      dispatch(addCSSClass({ elementId: selectedElement.id, className: autoClassName }));

      // Create the class with the new property
      dispatch(addCustomClass({
        name: autoClassName,
        styles: { [actualPropertyKey]: value },
        description: `Auto-generated class for ${selectedElement.type}`,
        category: 'auto-generated'
      }));

      // Select the new class for editing
      setSelectedClassForEditing(autoClassName);
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
    // For button elements, consider the selected button state
    if (selectedElement.type === 'button' && selectedButtonState !== 'default') {
      // First check if we're editing a specific class with state-specific styles
      if (selectedClassForEditing) {
        const customClass = customClasses[selectedClassForEditing];
        if (customClass && customClass.styles) {
          // Look for state-specific property (e.g., 'hover:backgroundColor')
          const stateSpecificKey = `${selectedButtonState}:${property.key}`;
          if (customClass.styles[stateSpecificKey] !== undefined) {
            return customClass.styles[stateSpecificKey];
          }

          // Fall back to the base property for the class
          if (customClass.styles[property.key] !== undefined) {
            return customClass.styles[property.key];
          }
        }
      }

      // Check element's applied classes for state-specific styles
      if (selectedElement.classes && selectedElement.classes.length > 0) {
        for (const className of selectedElement.classes) {
          const customClass = customClasses[className];
          if (customClass && customClass.styles) {
            const stateSpecificKey = `${selectedButtonState}:${property.key}`;
            if (customClass.styles[stateSpecificKey] !== undefined) {
              return customClass.styles[stateSpecificKey];
            }
          }
        }
      }
    }

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
      // For width/height, check styles first (which may have units), then element dimensions
      if (property.key === 'width') {
        // Check if there's a styled width with units first
        if (selectedElement.styles && selectedElement.styles.width !== undefined) {
          return selectedElement.styles.width;
        }
        // Fall back to element width with px
        if (selectedElement.width !== undefined) {
          return property.type === 'unit' ? `${selectedElement.width}px` : selectedElement.width;
        }
      }
      if (property.key === 'height') {
        // Check if there's a styled height with units first
        if (selectedElement.styles && selectedElement.styles.height !== undefined) {
          return selectedElement.styles.height;
        }
        // Fall back to element height with px
        if (selectedElement.height !== undefined) {
          return property.type === 'unit' ? `${selectedElement.height}px` : selectedElement.height;
        }
      }
      // Default to 0 for other numeric fields
      return property.type === 'unit' ? `0${property.defaultUnit || property.units?.[0] || 'px'}` : 0;
    }

    return '';
  };

  // Get merged styles for compound property inputs
  const getMergedStylesForCompound = () => {
    const baseStyles = { ...selectedElement.styles };

    // If editing a specific class, merge its styles
    if (selectedClassForEditing) {
      const customClass = customClasses[selectedClassForEditing];
      if (customClass && customClass.styles) {
        Object.assign(baseStyles, customClass.styles);
      }
    }

    // Also merge all applied custom classes
    if (selectedElement.classes && selectedElement.classes.length > 0) {
      selectedElement.classes.forEach((className: string) => {
        const customClass = customClasses[className];
        if (customClass && customClass.styles) {
          Object.assign(baseStyles, customClass.styles);
        }
      });
    }

    return baseStyles;
  };

  // Determine if a property has advanced compound controls
  const getCompoundPropertyType = (propertyKey: string): 'border' | 'margin' | 'padding' | 'borderRadius' | null => {
    switch (propertyKey) {
      case 'border': return 'border';
      case 'margin': return 'margin';
      case 'padding': return 'padding';
      case 'borderRadius': return 'borderRadius';
      default: return null;
    }
  };

  const getTranslatedGroupLabel = (category: string, fallbackLabel: string) => {
    const translationKey = `propertyGroups.${category}`;
    const translatedText = t(translationKey);
    // If translation key doesn't exist, use fallback
    return translatedText !== translationKey ? translatedText : fallbackLabel;
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, React.ComponentType<any>> = {
      content: FileText,
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
      className="absolute right-0 top-16 bottom-0 w-80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-l border-gray-200/60 dark:border-gray-700/60 overflow-y-auto z-40 shadow-lg"
      data-testid="properties-panel"
    >
      {/* Panel Header */}
      <div className="p-6 border-b border-gray-200/60 dark:border-gray-700/60 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20" data-testid="panel-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
              <SettingsIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{t('propertiesPanel.properties')}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                {selectedElement.type.replace(/([A-Z])/g, ' $1').trim()}
              </p>
            </div>
          </div>
          {selectedElement.id !== 'root' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteElement}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-700 hover:border-red-300 dark:hover:border-red-600 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
              data-testid="delete-element-button"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Class Editing Section - Top Priority */}
      <div className="border-b border-gray-200/60 dark:border-gray-700/60 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/20">
        <div className="p-6">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Palette className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            {t('propertiesPanel.classEditing')}
          </h3>

          {/* Style Editing Status */}
          {!selectedClassForEditing && (!selectedElement.classes || selectedElement.classes.length === 0) && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200/60 dark:border-green-700/60 rounded-xl mb-4 shadow-sm">
              <p className="text-sm text-green-800 dark:text-green-400 leading-relaxed">
                <strong className="block mb-1">{t('propertiesPanel.elementSelectedReady')}</strong>
                {t('propertiesPanel.startEditingHint')}
              </p>
            </div>
          )}

          {!selectedClassForEditing && selectedElement.classes && selectedElement.classes.length > 1 && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200/60 dark:border-blue-700/60 rounded-xl mb-4 shadow-sm">
              <p className="text-sm text-blue-800 dark:text-blue-400 leading-relaxed">
                <strong className="block mb-1">{t('propertiesPanel.clickClassHint')}</strong>
                {t('propertiesPanel.selectClassHint')}
              </p>
            </div>
          )}



          {/* Current Classes with Edit Selection */}
          {selectedElement.classes && selectedElement.classes.length > 0 ? (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-3 block">{t('propertiesPanel.appliedClasses')}</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedElement.classes.map((className) => (
                    <button
                      key={className}
                      onClick={() => setSelectedClassForEditing(className === selectedClassForEditing ? null : className)}
                      className={`flex items-center gap-2 px-4 py-2 border rounded-xl transition-all duration-200 shadow-sm hover:shadow-md ${selectedClassForEditing === className
                        ? 'bg-gradient-to-r from-blue-100 to-blue-200 border-blue-300 text-blue-800 scale-105'
                        : 'bg-white border-gray-200 hover:border-blue-200 hover:bg-blue-50'
                        }`}
                      title={`Click to edit .${className}`}
                    >
                      <span className="text-sm font-mono font-medium">.{className}</span>
                      {selectedClassForEditing === className && (
                        <span className="text-xs text-blue-600 bg-blue-200 px-1.5 py-0.5 rounded-full">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Current Editing Mode Indicator */}
              {selectedClassForEditing && (
                <div className="p-4 bg-white rounded-xl border-l-4 border-blue-400 shadow-sm">
                  <div className="text-sm font-semibold">
                    <span className="text-blue-700">
                      {t('propertiesPanel.editing')} <span className="font-mono bg-blue-100 px-2 py-1 rounded">.{selectedClassForEditing}</span>
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mt-2">
                    {t('propertiesPanel.propertyChangesApply')}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Add New Class */}
          <div className="mt-6 p-4 bg-white rounded-xl border border-gray-200/60 shadow-sm">
            <Label className="text-sm font-semibold text-gray-700 mb-3 block">{t('propertiesPanel.addNewClass')}</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder={t('propertiesPanel.classNamePlaceholder')}
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                className="flex-1 font-mono rounded-xl border-gray-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-200"
                onKeyPress={(e) => e.key === 'Enter' && handleAddClass()}
                data-testid="input-new-class"
              />
              <Button
                onClick={handleAddClass}
                size="sm"
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
                disabled={!newClassName || !cssClassGenerator.validateCSSClassName(newClassName)}
                data-testid="button-add-class"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Class Suggestions */}
            <div className="space-y-3 mt-4">
              <div className="text-xs font-semibold text-gray-600">{t('propertiesPanel.suggestions')}</div>
              <div className="flex flex-wrap gap-1.5">
                {cssClassGenerator.generateCSSClassSuggestions(selectedElement.type).slice(0, 6).map(suggestion => (
                  <Button
                    key={suggestion.name}
                    variant="outline"
                    size="sm"
                    onClick={() => setNewClassName(suggestion.name)}
                    className="text-xs h-7 px-3 rounded-lg border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
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

      {/* Button-Specific Properties */}
      {selectedElement.type === 'button' && (
        <div className="border-b border-gray-200/60 bg-gradient-to-br from-orange-50 to-orange-100/50">
          <div className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Type className="w-5 h-5 text-orange-600" />
              {t('propertiesPanel.buttonProperties')}
            </h3>

            {/* Button Properties */}
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200/60 rounded-xl shadow-sm">
                <p className="text-sm text-blue-700">
                  {t('propertiesPanel.buttonDoubleClickHint')}
                </p>
              </div>

              {/* Button State Selector */}
              <ButtonStateSelector
                currentState={selectedButtonState}
                onStateChange={(state) => {
                  setSelectedButtonState(state);
                  // Update canvas element to show selected state
                  dispatch(updateElement({
                    id: selectedElement.id,
                    updates: { currentButtonState: state as 'default' | 'hover' | 'active' | 'focus' | 'disabled' }
                  }));
                }}
              />

              {/* Make Default Button */}
              <div className="pt-4 border-t border-orange-200/60">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Save current button's applied class styles as default for new buttons
                    if (selectedClassForEditing && customClasses[selectedClassForEditing]) {
                      const classStyles = customClasses[selectedClassForEditing].styles;
                      localStorage.setItem('defaultButtonStyles', JSON.stringify(classStyles));

                      // Visual feedback
                      const button = document.querySelector('[data-testid="make-default-button"]');
                      if (button) {
                        const originalText = button.textContent;
                        button.textContent = t('propertiesPanel.savedAsDefault');
                        button.classList.add('bg-green-50', 'text-green-700', 'border-green-300');
                        setTimeout(() => {
                          button.textContent = originalText;
                          button.classList.remove('bg-green-50', 'text-green-700', 'border-green-300');
                        }, 2000);
                      }
                    } else {
                      // Fallback to element styles
                      const currentStyles = selectedElement.styles;
                      localStorage.setItem('defaultButtonStyles', JSON.stringify(currentStyles));
                    }
                  }}
                  className="w-full text-orange-700 border-orange-300 hover:bg-orange-50 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                  data-testid="make-default-button"
                >
                  {t('propertiesPanel.makeDefaultButton')}
                </Button>
                <p className="text-xs text-orange-600 mt-2 leading-relaxed">
                  {t('propertiesPanel.newButtonsUseDefault')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Layout Controls for Containers */}
      {(selectedElement.isContainer || ['container', 'rectangle', 'section', 'nav', 'header', 'footer', 'article', 'main', 'aside', 'form'].includes(selectedElement.type)) && (
        <div className="border-b border-gray-200/60 dark:border-gray-700/60 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/20">
          <div className="p-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Layout className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              {t('layout.autoLayout')}
            </h3>

            <FlexLayoutControls
              element={selectedElement}
              onUpdate={(updates) => {
                dispatch(updateElement({
                  id: selectedElement.id,
                  updates
                }));
              }}
            />
          </div>
        </div>
      )}

      {/* Dynamic Property Groups */}
      <div className="flex-1">
        {propertyGroups.map((group) => {
          const isExpanded = expandedGroups[group.category];
          const IconComponent = getCategoryIcon(group.category);

          return (
            <div key={group.category} className="border-b border-gray-200/60 last:border-b-0">
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(group.category)}
                className="w-full p-5 flex items-center justify-between text-left hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100/50 transition-all duration-200"
                data-testid={`group-header-${group.category}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl flex items-center justify-center shadow-sm">
                    <IconComponent className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{getTranslatedGroupLabel(group.category, group.label)}</h3>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full mt-1 inline-block">
                      {group.properties.length} properties
                    </span>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-blue-500 transition-transform duration-200" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400 transition-transform duration-200" />
                )}
              </button>

              {/* Group Properties */}
              {isExpanded && (
                <div className="px-6 pb-6 space-y-4 bg-gradient-to-br from-gray-50/50 to-transparent" data-testid={`group-content-${group.category}`}>
                  {group.properties.map((property) => (
                    <div key={property.key}>
                      {property.responsive ? (
                        <ResponsivePropertyInput
                          config={property}
                          element={selectedElement}
                          value={getPropertyValue(property)}
                          onChange={handlePropertyChange}
                        />
                      ) : (
                        <PropertyInput
                          config={property}
                          value={getPropertyValue(property)}
                          onChange={(value) => handlePropertyChange(property.key, value)}
                          elementId={selectedElement.id}
                          element={selectedElement}
                        />
                      )}
                      {/* Add advanced controls right below their simple counterparts */}
                      {(() => {
                        const compoundType = getCompoundPropertyType(property.key);
                        return compoundType && (
                          <div className="mt-2">
                            <CompoundPropertyInput
                              propertyType={compoundType}
                              values={getMergedStylesForCompound()}
                              onChange={handlePropertyChange}
                              onBatchChange={handleBatchPropertyChange}
                              simpleValue={getPropertyValue(property)}
                            />
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Removed standalone compound property sections - they now appear inline */}

      </div>
    </aside>
  );
};

export default PropertiesPanel;