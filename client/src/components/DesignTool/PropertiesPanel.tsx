import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { updateElement, updateElementStyles, addCSSClass, removeCSSClass } from '../../store/canvasSlice';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { validateCSSClassName, generateCSSClassSuggestions } from '../../utils/canvas';
import { AlignLeft, AlignCenter, AlignRight, Plus, X, GripVertical } from 'lucide-react';

const PropertiesPanel: React.FC = () => {
  const dispatch = useDispatch();
  const { project } = useSelector((state: RootState) => state.canvas);
  const selectedElement = project.selectedElementId ? project.elements[project.selectedElementId] : null;
  const [newClassName, setNewClassName] = useState('');

  if (!selectedElement) {
    return (
      <aside className="absolute right-0 top-12 bottom-8 w-80 bg-white border-l border-gray-200 overflow-y-auto z-40">
        <div className="p-4 text-center text-gray-500">
          Select an element to edit properties
        </div>
      </aside>
    );
  }

  const handleStyleUpdate = (property: string, value: any) => {
    dispatch(updateElementStyles({
      id: selectedElement.id,
      styles: { [property]: value }
    }));
  };

  const handleElementUpdate = (property: string, value: any) => {
    dispatch(updateElement({
      id: selectedElement.id,
      updates: { [property]: value }
    }));
  };

  const handleAddClass = () => {
    if (newClassName && validateCSSClassName(newClassName)) {
      dispatch(addCSSClass({ elementId: selectedElement.id, className: newClassName }));
      setNewClassName('');
    }
  };

  const handleRemoveClass = (className: string) => {
    dispatch(removeCSSClass({ elementId: selectedElement.id, className }));
  };

  return (
    <aside 
      className="absolute right-0 top-12 bottom-8 w-80 bg-white border-l border-gray-200 overflow-y-auto z-40"
      data-testid="properties-panel"
    >
      {/* Panel Header */}
      <div className="p-4 border-b border-gray-200" data-testid="panel-header">
        <h2 className="font-semibold text-gray-900">Properties</h2>
        <p className="text-sm text-gray-600 mt-1">
          {selectedElement.type} · {selectedElement.id}
        </p>
      </div>
      
      {/* Layout Properties */}
      <div className="p-4 border-b border-gray-200" data-testid="layout-properties">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Layout</h3>
        
        {/* Display Type */}
        <div className="mb-4">
          <Label className="text-sm font-medium text-gray-700 mb-2">Display</Label>
          <Select 
            value={selectedElement.styles.display || 'block'}
            onValueChange={(value) => handleStyleUpdate('display', value)}
          >
            <SelectTrigger data-testid="select-display">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="block">Block</SelectItem>
              <SelectItem value="flex">Flex</SelectItem>
              <SelectItem value="grid">Grid</SelectItem>
              <SelectItem value="inline">Inline</SelectItem>
              <SelectItem value="inline-block">Inline Block</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Flex Direction */}
        {selectedElement.styles.display === 'flex' && (
          <div className="mb-4">
            <Label className="text-sm font-medium text-gray-700 mb-2">Direction</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={(selectedElement.styles.flexDirection || selectedElement.flexDirection) === 'row' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  handleElementUpdate('flexDirection', 'row');
                  handleStyleUpdate('flexDirection', 'row');
                }}
                className="justify-start"
                data-testid="button-flex-row"
              >
                Row
              </Button>
              <Button
                variant={(selectedElement.styles.flexDirection || selectedElement.flexDirection) === 'column' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  handleElementUpdate('flexDirection', 'column');
                  handleStyleUpdate('flexDirection', 'column');
                }}
                className="justify-start"
                data-testid="button-flex-column"
              >
                Column
              </Button>
            </div>
          </div>
        )}
        
        {/* Justify Content */}
        {selectedElement.styles.display === 'flex' && (
          <div className="mb-4">
            <Label className="text-sm font-medium text-gray-700 mb-2">Justify</Label>
            <div className="grid grid-cols-3 gap-1">
              <Button
                variant={(selectedElement.styles.justifyContent || selectedElement.justifyContent) === 'flex-start' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  handleElementUpdate('justifyContent', 'flex-start');
                  handleStyleUpdate('justifyContent', 'flex-start');
                }}
                data-testid="button-justify-start"
              >
                <AlignLeft className="w-4 h-4" />
              </Button>
              <Button
                variant={(selectedElement.styles.justifyContent || selectedElement.justifyContent) === 'center' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  handleElementUpdate('justifyContent', 'center');
                  handleStyleUpdate('justifyContent', 'center');
                }}
                data-testid="button-justify-center"
              >
                <AlignCenter className="w-4 h-4" />
              </Button>
              <Button
                variant={(selectedElement.styles.justifyContent || selectedElement.justifyContent) === 'flex-end' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  handleElementUpdate('justifyContent', 'flex-end');
                  handleStyleUpdate('justifyContent', 'flex-end');
                }}
                data-testid="button-justify-end"
              >
                <AlignRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Spacing Properties */}
      <div className="p-4 border-b border-gray-200" data-testid="spacing-properties">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Spacing</h3>
        
        {/* Padding */}
        <div className="mb-4">
          <Label className="text-sm font-medium text-gray-700 mb-2">Padding</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="All"
              value={selectedElement.styles.padding?.replace('px', '') || ''}
              onChange={(e) => handleStyleUpdate('padding', `${e.target.value}px`)}
              data-testid="input-padding"
            />
            <Select defaultValue="px">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="px">px</SelectItem>
                <SelectItem value="rem">rem</SelectItem>
                <SelectItem value="%">%</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Margin */}
        <div className="mb-4">
          <Label className="text-sm font-medium text-gray-700 mb-2">Margin</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="All"
              value={selectedElement.styles.margin?.replace('px', '') || ''}
              onChange={(e) => handleStyleUpdate('margin', `${e.target.value}px`)}
              data-testid="input-margin"
            />
            <Select defaultValue="px">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="px">px</SelectItem>
                <SelectItem value="rem">rem</SelectItem>
                <SelectItem value="%">%</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      {/* Style Properties */}
      <div className="p-4 border-b border-gray-200" data-testid="style-properties">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Appearance</h3>
        
        {/* Background Color */}
        <div className="mb-4">
          <Label className="text-sm font-medium text-gray-700 mb-2">Background</Label>
          <div className="flex gap-2">
            <div 
              className="w-10 h-10 rounded-lg border-2 border-white shadow-sm cursor-pointer"
              style={{ backgroundColor: selectedElement.styles.backgroundColor || '#ffffff' }}
              title={selectedElement.styles.backgroundColor || '#ffffff'}
            />
            <Input
              type="text"
              value={selectedElement.styles.backgroundColor || ''}
              onChange={(e) => handleStyleUpdate('backgroundColor', e.target.value)}
              placeholder="#ffffff"
              className="flex-1 font-mono"
              data-testid="input-background-color"
            />
          </div>
        </div>
        
        {/* Border Radius */}
        <div className="mb-4">
          <Label className="text-sm font-medium text-gray-700 mb-2">Border Radius</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="Radius"
              value={selectedElement.styles.borderRadius?.replace('px', '') || ''}
              onChange={(e) => handleStyleUpdate('borderRadius', `${e.target.value}px`)}
              data-testid="input-border-radius"
            />
            <Select defaultValue="px">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="px">px</SelectItem>
                <SelectItem value="rem">rem</SelectItem>
                <SelectItem value="%">%</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      {/* Typography Properties */}
      {selectedElement.type === 'text' && (
        <div className="p-4 border-b border-gray-200" data-testid="typography-properties">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Typography</h3>
          
          {/* Font Family */}
          <div className="mb-4">
            <Label className="text-sm font-medium text-gray-700 mb-2">Font Family</Label>
            <Select
              value={selectedElement.styles.fontFamily || 'Inter'}
              onValueChange={(value) => handleStyleUpdate('fontFamily', value)}
            >
              <SelectTrigger data-testid="select-font-family">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Inter">Inter</SelectItem>
                <SelectItem value="Roboto">Roboto</SelectItem>
                <SelectItem value="Open Sans">Open Sans</SelectItem>
                <SelectItem value="Helvetica">Helvetica</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Font Size & Weight */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2">Size</Label>
              <Input
                type="number"
                value={selectedElement.styles.fontSize?.replace('px', '') || '16'}
                onChange={(e) => handleStyleUpdate('fontSize', `${e.target.value}px`)}
                data-testid="input-font-size"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2">Weight</Label>
              <Select
                value={selectedElement.styles.fontWeight || '400'}
                onValueChange={(value) => handleStyleUpdate('fontWeight', value)}
              >
                <SelectTrigger data-testid="select-font-weight">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="300">300</SelectItem>
                  <SelectItem value="400">400</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                  <SelectItem value="600">600</SelectItem>
                  <SelectItem value="700">700</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Text Color */}
          <div className="mb-4">
            <Label className="text-sm font-medium text-gray-700 mb-2">Color</Label>
            <div className="flex gap-2">
              <div 
                className="w-10 h-10 rounded-lg border-2 border-white shadow-sm cursor-pointer"
                style={{ backgroundColor: selectedElement.styles.color || '#1f2937' }}
                title={selectedElement.styles.color || '#1f2937'}
              />
              <Input
                type="text"
                value={selectedElement.styles.color || ''}
                onChange={(e) => handleStyleUpdate('color', e.target.value)}
                placeholder="#1f2937"
                className="flex-1 font-mono"
                data-testid="input-text-color"
              />
            </div>
          </div>
        </div>
      )}
      
      {/* CSS Classes */}
      <div className="p-4" data-testid="css-classes">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">CSS Classes</h3>
        
        {/* Applied Classes */}
        <div className="mb-4">
          <Label className="text-sm font-medium text-gray-700 mb-2">Applied Classes</Label>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {selectedElement.classes?.map((className, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <GripVertical className="w-3 h-3 text-gray-400" />
                  <Badge variant="secondary" className="font-mono text-xs">
                    .{className}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveClass(className)}
                  className="p-1 h-auto text-gray-400 hover:text-red-600"
                  data-testid={`button-remove-class-${className}`}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
        
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
              disabled={!newClassName || !validateCSSClassName(newClassName)}
              data-testid="button-add-class"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Class Suggestions */}
          <div className="flex flex-wrap gap-1 mt-2">
            {generateCSSClassSuggestions(selectedElement.type).map(suggestion => (
              <Button
                key={suggestion}
                variant="outline"
                size="sm"
                onClick={() => setNewClassName(suggestion)}
                className="text-xs h-6 px-2"
                data-testid={`button-suggestion-${suggestion}`}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default PropertiesPanel;
