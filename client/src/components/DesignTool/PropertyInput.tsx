import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { PropertyConfig, formatValueWithUnit } from '../../utils/propertyConfig';
import { Info } from 'lucide-react';

interface PropertyInputProps {
  config: PropertyConfig;
  value: any;
  onChange: (value: any) => void;
}

export const PropertyInput: React.FC<PropertyInputProps> = ({ config, value, onChange }) => {
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
            value={value || ''}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            min={config.min}
            max={config.max}
            step={config.step}
            className="w-full"
            data-testid={`input-${config.key}`}
          />
        );

      case 'unit':
        return (
          <div className="flex gap-2">
            <Input
              type="number"
              value={typeof value === 'string' ? parseFloat(value) || 0 : value || 0}
              onChange={(e) => {
                const numValue = parseFloat(e.target.value) || 0;
                onChange(formatValueWithUnit(numValue, config.unit));
              }}
              min={config.min}
              max={config.max}
              step={config.step}
              className="flex-1"
              data-testid={`input-${config.key}`}
            />
            {config.unit && (
              <div className="flex items-center px-3 bg-gray-50 border rounded text-sm text-gray-600 min-w-[40px] justify-center">
                {config.unit}
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
              value={value || '#000000'}
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