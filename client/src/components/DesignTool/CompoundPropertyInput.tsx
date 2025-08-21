import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ChevronDown, ChevronRight, Link, Unlink } from 'lucide-react';

interface CompoundPropertyInputProps {
  propertyType: 'border' | 'margin' | 'padding' | 'borderRadius';
  values: Record<string, any>;
  onChange: (property: string, value: any) => void;
  simpleValue?: any;
}

interface SideConfig {
  key: string;
  label: string;
  sides: string[];
}

// Enhanced border input component with unit dropdown and value persistence
const BorderInput = React.memo(({ 
  sideKey, 
  label, 
  currentValue,
  onSideChange
}: { 
  sideKey: string; 
  label: string; 
  currentValue: any;
  onSideChange: (sideKey: string, value: string) => void;
}) => {
  // Parse current value to preserve state
  const parseBorderValue = (borderValue: any) => {
    // Handle empty, null, or undefined values
    if (!borderValue || borderValue === '') return { width: '', unit: 'px', style: 'solid', color: '#000000' };
    
    // Convert to string if it's not already
    const borderStr = typeof borderValue === 'string' ? borderValue : String(borderValue);
    
    const parts = borderStr.trim().split(/\s+/);
    const widthWithUnit = parts[0] || '';
    
    // Extract numeric value and unit
    const match = widthWithUnit.match(/^(\d*\.?\d*)(.*)$/);
    const numericWidth = match ? match[1] : '';
    const unit = match && match[2] ? match[2] : 'px';
    
    return {
      width: numericWidth,
      unit: unit || 'px',
      style: parts[1] || 'solid',
      color: parts[2] || '#000000'
    };
  };

  const parsedValue = parseBorderValue(currentValue);
  const [width, setWidth] = React.useState(parsedValue.width);
  const [unit, setUnit] = React.useState(parsedValue.unit);
  const [style, setStyle] = React.useState(parsedValue.style);
  const [color, setColor] = React.useState(parsedValue.color);

  // Update local state when currentValue changes (for persistence)
  React.useEffect(() => {
    const newParsed = parseBorderValue(currentValue);
    setWidth(newParsed.width);
    setUnit(newParsed.unit);
    setStyle(newParsed.style);
    setColor(newParsed.color);
  }, [currentValue]);

  const updateValue = React.useCallback((newWidth: string, newUnit: string, newStyle: string, newColor: string) => {
    const fullWidth = newWidth.trim() && newWidth !== '0' ? `${newWidth.trim()}${newUnit}` : '';
    const newValue = fullWidth ? `${fullWidth} ${newStyle} ${newColor}` : '';
    onSideChange(sideKey, newValue);
  }, [sideKey, onSideChange]);

  const handleWidthChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newWidth = e.target.value;
    setWidth(newWidth);
    updateValue(newWidth, unit, style, color);
  }, [unit, style, color, updateValue]);

  const handleUnitChange = React.useCallback((newUnit: string) => {
    setUnit(newUnit);
    updateValue(width, newUnit, style, color);
  }, [width, style, color, updateValue]);

  const handleStyleChange = React.useCallback((newStyle: string) => {
    setStyle(newStyle);
    updateValue(width, unit, newStyle, color);
  }, [width, unit, color, updateValue]);

  const handleColorChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setColor(newColor);
    updateValue(width, unit, style, newColor);
  }, [width, unit, style, updateValue]);

  return (
    <div className="space-y-1">
      <Label className="text-xs text-gray-500">{label}</Label>
      {/* Compact grid layout to prevent scrolling */}
      <div className="grid grid-cols-12 gap-1 items-center">
        <input
          type="number"
          placeholder="0"
          value={width}
          onChange={handleWidthChange}
          onFocus={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="col-span-4 text-xs h-7 px-2 rounded border text-center"
          data-testid={`input-border-width-${sideKey}`}
          style={{
            color: '#000000',
            backgroundColor: '#ffffff',
            border: '1px solid #ccc',
            fontSize: '11px'
          }}
        />
        <Select value={unit} onValueChange={handleUnitChange}>
          <SelectTrigger className="col-span-2 w-full text-xs h-7 px-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="px">px</SelectItem>
            <SelectItem value="em">em</SelectItem>
            <SelectItem value="rem">rem</SelectItem>
            <SelectItem value="%">%</SelectItem>
            <SelectItem value="vh">vh</SelectItem>
            <SelectItem value="vw">vw</SelectItem>
          </SelectContent>
        </Select>
        <Select value={style} onValueChange={handleStyleChange}>
          <SelectTrigger className="col-span-4 w-full text-xs h-7 px-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="solid">Solid</SelectItem>
            <SelectItem value="dashed">Dashed</SelectItem>
            <SelectItem value="dotted">Dotted</SelectItem>
            <SelectItem value="double">Double</SelectItem>
            <SelectItem value="none">None</SelectItem>
          </SelectContent>
        </Select>
        <input
          type="color"
          value={color}
          onChange={handleColorChange}
          className="col-span-2 w-full h-7 rounded border cursor-pointer"
        />
      </div>
    </div>
  );
});

const CompoundPropertyInput: React.FC<CompoundPropertyInputProps> = ({
  propertyType,
  values,
  onChange,
  simpleValue
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Configuration for different property types
  const getConfig = () => {
    switch (propertyType) {
      case 'border':
        return {
          label: 'Border',
          icon: '🔲',
          sides: [
            { key: 'borderTop', label: 'Top', prop: 'border-top' },
            { key: 'borderRight', label: 'Right', prop: 'border-right' },
            { key: 'borderBottom', label: 'Bottom', prop: 'border-bottom' },
            { key: 'borderLeft', label: 'Left', prop: 'border-left' }
          ],
          shortcuts: [
            { key: 'borderHorizontal', label: 'Horizontal', sides: ['borderTop', 'borderBottom'] },
            { key: 'borderVertical', label: 'Vertical', sides: ['borderLeft', 'borderRight'] },
            { key: 'border', label: 'All Sides', sides: ['borderTop', 'borderRight', 'borderBottom', 'borderLeft'] }
          ]
        };
      case 'margin':
        return {
          label: 'Margin',
          icon: '📦',
          sides: [
            { key: 'marginTop', label: 'Top', prop: 'margin-top' },
            { key: 'marginRight', label: 'Right', prop: 'margin-right' },
            { key: 'marginBottom', label: 'Bottom', prop: 'margin-bottom' },
            { key: 'marginLeft', label: 'Left', prop: 'margin-left' }
          ],
          shortcuts: [
            { key: 'marginHorizontal', label: 'Horizontal', sides: ['marginLeft', 'marginRight'] },
            { key: 'marginVertical', label: 'Vertical', sides: ['marginTop', 'marginBottom'] },
            { key: 'margin', label: 'All Sides', sides: ['marginTop', 'marginRight', 'marginBottom', 'marginLeft'] }
          ]
        };
      case 'padding':
        return {
          label: 'Padding',
          icon: '🔳',
          sides: [
            { key: 'paddingTop', label: 'Top', prop: 'padding-top' },
            { key: 'paddingRight', label: 'Right', prop: 'padding-right' },
            { key: 'paddingBottom', label: 'Bottom', prop: 'padding-bottom' },
            { key: 'paddingLeft', label: 'Left', prop: 'padding-left' }
          ],
          shortcuts: [
            { key: 'paddingHorizontal', label: 'Horizontal', sides: ['paddingLeft', 'paddingRight'] },
            { key: 'paddingVertical', label: 'Vertical', sides: ['paddingTop', 'paddingBottom'] },
            { key: 'padding', label: 'All Sides', sides: ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'] }
          ]
        };
      case 'borderRadius':
        return {
          label: 'Border Radius',
          icon: '⭕',
          sides: [
            { key: 'borderTopLeftRadius', label: 'Top Left', prop: 'border-top-left-radius' },
            { key: 'borderTopRightRadius', label: 'Top Right', prop: 'border-top-right-radius' },
            { key: 'borderBottomRightRadius', label: 'Bottom Right', prop: 'border-bottom-right-radius' },
            { key: 'borderBottomLeftRadius', label: 'Bottom Left', prop: 'border-bottom-left-radius' }
          ],
          shortcuts: [
            { key: 'borderRadiusTop', label: 'Top Corners', sides: ['borderTopLeftRadius', 'borderTopRightRadius'] },
            { key: 'borderRadiusBottom', label: 'Bottom Corners', sides: ['borderBottomLeftRadius', 'borderBottomRightRadius'] },
            { key: 'borderRadius', label: 'All Corners', sides: ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius'] }
          ]
        };
      default:
        return { label: '', icon: '', sides: [], shortcuts: [] };
    }
  };

  const config = getConfig();

  const handleShortcutChange = (shortcutKey: string, value: string) => {
    console.log(`handleShortcutChange: ${shortcutKey} = ${value}`);
    const shortcut = config.shortcuts.find(s => s.key === shortcutKey);
    if (!shortcut) {
      console.log(`No shortcut found for ${shortcutKey}`);
      return;
    }

    // Apply value to all sides in the shortcut
    shortcut.sides.forEach(sideKey => {
      const side = config.sides.find(s => s.key === sideKey);
      if (side) {
        console.log(`Applying ${value} to ${side.prop}`);
        onChange(side.prop, value);
      }
    });
  };

  const handleSideChange = (sideKey: string, value: string) => {
    const side = config.sides.find(s => s.key === sideKey);
    if (side) {
      console.log(`handleSideChange: ${sideKey} -> ${side.prop} = "${value}"`);
      onChange(side.prop, value);
    }
  };

  // Clear all border conflicts when expanding individual sides for borders
  const clearBorderConflicts = () => {
    if (propertyType === 'border') {
      console.log('Clearing all border conflicts');
      // Clear ALL shorthand properties that conflict with individual sides
      onChange('border', '');
      onChange('border-width', '');
      onChange('border-style', '');
      onChange('border-color', '');
      onChange('borderWidth', '');
      onChange('borderStyle', '');
      onChange('borderColor', '');
    }
  };

  const getValue = (sideKey: string): string => {
    const side = config.sides.find(s => s.key === sideKey);
    if (!side) return '';
    
    // Check if there's a specific side value first
    const sideValue = values[side.prop];
    if (sideValue !== undefined && sideValue !== null && sideValue !== '') {
      const stringValue = String(sideValue);
      console.log(`getValue ${sideKey}: found side value:`, stringValue);
      return stringValue;
    }
    
    // For borders, don't use simple value as it conflicts with individual sides
    if (propertyType === 'border') {
      console.log(`getValue ${sideKey}: returning empty for border (no side value)`);
      return '';
    }
    
    // If no side-specific value but there's a simple value, use it as default
    if (simpleValue && !hasAnyAdvancedValues()) {
      const stringValue = String(simpleValue);
      console.log(`getValue ${sideKey}: using simple value:`, stringValue);
      return stringValue;
    }
    
    console.log(`getValue ${sideKey}: returning empty`);
    return '';
  };

  // Check if any advanced (side-specific) values are present
  const hasAnyAdvancedValues = (): boolean => {
    return config.sides.some(side => values[side.prop]);
  };

  const renderSpacingInput = (sideKey: string, label: string) => {
    const value = getValue(sideKey);
    
    return (
      <div className="space-y-1">
        <Label className="text-xs text-gray-500">{label}</Label>
        <Input
          type="text"
          placeholder="0px"
          value={value}
          onChange={(e) => {
            console.log(`Spacing change for ${sideKey}:`, e.target.value);
            handleSideChange(sideKey, e.target.value);
          }}
          onFocus={(e) => {
            console.log(`Spacing input focused for ${sideKey}`);
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="text-xs h-7"
          data-testid={`input-spacing-${sideKey}`}
        />
      </div>
    );
  };

  return (
    <div className="border border-gray-200 rounded-md bg-gray-50">
      {/* Global Border Input (for all sides) */}
      {propertyType === 'border' && (
        <div className="p-2 border-b border-gray-200">
          <BorderInput
            key="global-border"
            sideKey="border"
            label="All Sides"
            currentValue={simpleValue || ''}
            onSideChange={(_, value) => {
              // Apply to all individual sides when using global input
              const config = getConfig();
              config.sides.forEach(side => {
                onChange(side.prop, value);
              });
            }}
          />
        </div>
      )}
      
      {/* Header */}
      <button
        onClick={() => {
          const newExpanded = !isExpanded;
          setIsExpanded(newExpanded);
          // Clear conflicts when expanding border individual sides
          if (newExpanded) {
            clearBorderConflicts();
          }
        }}
        className="w-full p-2 flex items-center justify-between text-left hover:bg-gray-100 transition-colors"
      >
        <span className="text-sm text-gray-600">Individual sides</span>
        {isExpanded ? (
          <ChevronDown className="w-3 h-3 text-gray-400" />
        ) : (
          <ChevronRight className="w-3 h-3 text-gray-400" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div 
          className="px-2 pb-2 space-y-3 border-t border-gray-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Individual Sides */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {config.sides.map((side) => (
                <div key={side.key}>
                  {propertyType === 'border' ? (
                    <BorderInput 
                      key={`${side.key}-stable`}
                      sideKey={side.key} 
                      label={side.label} 
                      currentValue={getValue(side.key)}
                      onSideChange={handleSideChange}
                    />
                  ) : (
                    renderSpacingInput(side.key, side.label)
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Horizontal/Vertical Shortcuts */}
          {config.shortcuts.length > 1 && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-500">Shortcuts</Label>
              <div className="grid grid-cols-2 gap-2">
                {config.shortcuts.slice(0, -1).map((shortcut) => (
                  <div key={shortcut.key} className="space-y-1">
                    <Label className="text-xs text-gray-500">{shortcut.label}</Label>
                    {propertyType === 'border' ? (
                      <Input
                        type="text"
                        placeholder="1px solid #000000"
                        onChange={(e) => handleShortcutChange(shortcut.key, e.target.value)}
                        onFocus={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs h-7"
                      />
                    ) : (
                      <Input
                        type="text"
                        placeholder="0px"
                        onChange={(e) => handleShortcutChange(shortcut.key, e.target.value)}
                        onFocus={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs h-7"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CompoundPropertyInput;