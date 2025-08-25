import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { PropertyConfig, formatValueWithUnit, parseValueAndUnit } from '../../utils/propertyConfig';
import { Info } from 'lucide-react';
import { ImageUpload } from './ImageUpload';
import { BackgroundInput } from './BackgroundInput';

interface PropertyInputProps {
  config: PropertyConfig;
  value: any;
  onChange: (value: any) => void;
  elementId?: string;
  element?: any;
}

export const PropertyInput: React.FC<PropertyInputProps> = ({ config, value, onChange, elementId, element }) => {
  const [selectedUnit, setSelectedUnit] = useState(() => {
    if (config.units && config.units.length > 0) {
      const parsed = parseValueAndUnit(value);
      return parsed.unit || config.defaultUnit || config.units[0];
    }
    return config.unit || 'px';
  });

  const renderInput = () => {
    switch (config.type) {
      case 'text':
        return (
          <Input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter ${config.label.toLowerCase()}`}
            className="w-full"
            data-testid={`input-${config.key}`}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value === null || value === undefined ? '' : value}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            min={config.min}
            max={config.max}
            step={config.step}
            className="w-full"
            data-testid={`input-${config.key}`}
          />
        );

      case 'unit':
        const parsed = parseValueAndUnit(value);
        const numValue = parsed.value !== undefined && parsed.value !== null ? parseFloat(parsed.value) : 0;
        
        return (
          <div className="flex gap-2">
            <Input
              type="number"
              value={numValue === null || numValue === undefined || isNaN(numValue) ? '' : numValue}
              onChange={(e) => {
                const newValue = parseFloat(e.target.value) || 0;
                onChange(formatValueWithUnit(newValue, selectedUnit));
              }}
              min={config.min}
              max={config.max}
              step={config.step}
              className="flex-1"
              data-testid={`input-${config.key}`}
            />
            {config.units && config.units.length > 1 ? (
              <Select
                value={selectedUnit}
                onValueChange={(unit) => {
                  setSelectedUnit(unit);
                  // Always apply the unit change, even if numValue is 0
                  onChange(formatValueWithUnit(numValue, unit));
                }}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {config.units.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center px-3 bg-gray-50 border rounded text-sm text-gray-600 min-w-[40px] justify-center">
                {selectedUnit}
              </div>
            )}
          </div>
        );

      case 'select':
        return (
          <Select 
            value={value || config.options?.[0]?.value || ''}
            onValueChange={onChange}
          >
            <SelectTrigger data-testid={`select-${config.key}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {config.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'color':
        return (
          <div className="flex gap-2">
            <Input
              type="color"
              value={value === 'transparent' ? '#000000' : (value || '#000000')}
              onChange={(e) => onChange(e.target.value)}
              className="w-12 h-9 p-1 border rounded"
              data-testid={`color-${config.key}`}
            />
            <Input
              type="text"
              value={value || '#000000'}
              onChange={(e) => onChange(e.target.value)}
              placeholder="#000000"
              className="flex-1 font-mono text-sm"
              data-testid={`input-${config.key}`}
            />
            <button
              onClick={() => onChange('transparent')}
              className={`px-2 py-1 text-xs rounded border transition-colors ${
                value === 'transparent' 
                  ? 'bg-blue-100 border-blue-300 text-blue-700' 
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
              data-testid={`transparent-${config.key}`}
              title="Set to transparent"
            >
              Clear
            </button>
          </div>
        );

      case 'range':
        return (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>{config.min}</span>
              <span className="font-medium">{value || config.min || 0}</span>
              <span>{config.max}</span>
            </div>
            <Slider
              value={[value || config.min || 0]}
              onValueChange={(values) => onChange(values[0])}
              min={config.min}
              max={config.max}
              step={config.step}
              className="w-full"
              data-testid={`slider-${config.key}`}
            />
          </div>
        );

      case 'toggle':
        return (
          <Button
            variant={value ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChange(!value)}
            className="w-full"
            data-testid={`toggle-${config.key}`}
          >
            {value ? 'On' : 'Off'}
          </Button>
        );

      case 'border':
        return (
          <div className="space-y-3">
            {config.subProperties?.map((subProp) => (
              <div key={subProp.key} className="space-y-1">
                <Label className="text-xs font-medium text-gray-600">
                  {subProp.label}
                </Label>
                <PropertyInput
                  config={subProp}
                  value={value?.[subProp.key] || ''}
                  onChange={(subValue) => {
                    const newValue = { ...value };
                    newValue[subProp.key] = subValue;
                    onChange(newValue);
                  }}
                  elementId={elementId}
                  element={element}
                />
              </div>
            ))}
          </div>
        );

      case 'imageUpload':
        if (!elementId || !element) {
          return <div className="text-xs text-red-500">Element context required for image upload</div>;
        }
        return (
          <ImageUpload
            elementId={elementId}
            currentImageUrl={element.imageUrl}
            currentImageBase64={element.imageBase64}
            currentImageAlt={element.imageAlt}
            onImageChange={(updates) => {
              // Updates are handled directly by the ImageUpload component via dispatch
              // The onChange callback here is for UI synchronization if needed
            }}
          />
        );

      case 'background':
        if (!elementId) {
          return <div className="text-xs text-red-500">Element ID required for background</div>;
        }
        return (
          <BackgroundInput
            elementId={elementId}
            value={value}
            onChange={(backgroundStyles) => {
              // Apply all background styles
              onChange(backgroundStyles);
            }}
          />
        );

      default:
        return (
          <Input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full"
            data-testid={`input-${config.key}`}
          />
        );
    }
  };

  return (
    <div className="space-y-2" data-testid={`property-${config.key}`}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-gray-700 flex-1">
          {config.label}
        </Label>
        {config.description && (
          <div 
            className="ml-2 text-gray-400 hover:text-gray-600 cursor-help"
            title={config.description}
          >
            <Info className="w-3 h-3" />
          </div>
        )}
      </div>
      {renderInput()}
    </div>
  );
};