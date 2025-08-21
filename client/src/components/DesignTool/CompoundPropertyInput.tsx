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
    const shortcut = config.shortcuts.find(s => s.key === shortcutKey);
    if (!shortcut) return;

    // Apply value to all sides in the shortcut
    shortcut.sides.forEach(sideKey => {
      const side = config.sides.find(s => s.key === sideKey);
      if (side) {
        onChange(side.prop, value);
      }
    });
  };

  const handleSideChange = (sideKey: string, value: string) => {
    const side = config.sides.find(s => s.key === sideKey);
    if (side) {
      console.log(`handleSideChange: ${sideKey} -> ${side.prop} = ${value}`);
      onChange(side.prop, value);
    }
  };

  const getValue = (sideKey: string): string => {
    const side = config.sides.find(s => s.key === sideKey);
    if (!side) return '';
    
    // Check if there's a specific side value first
    const sideValue = values[side.prop];
    if (sideValue !== undefined && sideValue !== null) {
      const stringValue = String(sideValue);
      console.log(`getValue for ${sideKey}: found sideValue:`, sideValue, 'converted to:', stringValue);
      return stringValue;
    }
    
    // If no side-specific value but there's a simple value, use it as default
    if (simpleValue && !hasAnyAdvancedValues()) {
      const stringValue = String(simpleValue);
      console.log(`getValue for ${sideKey}: using simpleValue:`, simpleValue, 'converted to:', stringValue);
      return stringValue;
    }
    
    console.log(`getValue for ${sideKey}: returning empty string`);
    return '';
  };

  // Check if any advanced (side-specific) values are present
  const hasAnyAdvancedValues = (): boolean => {
    return config.sides.some(side => values[side.prop]);
  };

  // Store border components separately for each side
  const [borderComponents, setBorderComponents] = React.useState<{[key: string]: {width: string, style: string, color: string}}>({});

  const getBorderComponents = (sideKey: string) => {
    if (borderComponents[sideKey]) {
      return borderComponents[sideKey];
    }
    
    const value = getValue(sideKey);
    const valueStr = String(value || '').trim();
    
    // Simple parsing - split on spaces and take first 3 parts
    const parts = valueStr.split(' ');
    return {
      width: parts[0] || '',
      style: parts[1] || 'solid',
      color: parts[2] || '#000000'
    };
  };

  const updateBorderComponent = (sideKey: string, component: 'width' | 'style' | 'color', value: string) => {
    const current = getBorderComponents(sideKey);
    const updated = { ...current, [component]: value };
    
    // Update local state
    setBorderComponents(prev => ({ ...prev, [sideKey]: updated }));
    
    // Build new border value
    const newValue = `${updated.width} ${updated.style} ${updated.color}`.trim();
    console.log(`updateBorderComponent ${sideKey} ${component}=${value} -> ${newValue}`);
    handleSideChange(sideKey, newValue);
  };

  const renderBorderInput = (sideKey: string, label: string) => {
    const components = getBorderComponents(sideKey);
    
    console.log(`renderBorderInput ${sideKey}:`, components);

    return (
      <div className="space-y-1">
        <Label className="text-xs text-gray-500">{label}</Label>
        <div className="flex gap-1">
          <Input
            type="text"
            placeholder="0px"
            value={components.width}
            onChange={(e) => {
              console.log(`Border width change for ${sideKey}:`, e.target.value);
              updateBorderComponent(sideKey, 'width', e.target.value);
            }}
            onFocus={(e) => {
              console.log(`Border input focused for ${sideKey}`);
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="flex-1 text-xs h-7"
            data-testid={`input-border-width-${sideKey}`}
          />
          <Select
            value={components.style}
            onValueChange={(newStyle) => {
              updateBorderComponent(sideKey, 'style', newStyle);
            }}
          >
            <SelectTrigger className="w-16 text-xs h-7">
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
            value={components.color}
            onChange={(e) => {
              updateBorderComponent(sideKey, 'color', e.target.value);
            }}
            className="w-7 h-7 rounded border cursor-pointer"
          />
        </div>
      </div>
    );
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
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
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
                    renderBorderInput(side.key, side.label)
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
                    <Input
                      type="text"
                      placeholder="0px"
                      onChange={(e) => handleShortcutChange(shortcut.key, e.target.value)}
                      className="text-xs h-7"
                    />
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