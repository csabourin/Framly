import React from 'react';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { ButtonStyles } from '../../../types/button';

interface PropertyItem {
  key: keyof ButtonStyles;
  label: string;
  value: string;
  type?: 'text' | 'color';
  placeholder?: string;
}

interface PropertyInputGroupProps {
  title: string;
  properties: PropertyItem[];
  onUpdate: (property: keyof ButtonStyles, value: string) => void;
}

const PropertyInputGroup: React.FC<PropertyInputGroupProps> = ({ 
  title, 
  properties, 
  onUpdate 
}) => {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-900">{title}</h4>
      <div className="grid grid-cols-1 gap-3">
        {properties.map((property) => (
          <div key={property.key} className="space-y-1">
            <Label htmlFor={property.key} className="text-xs text-gray-600">
              {property.label}
            </Label>
            <div className="flex gap-2">
              {property.type === 'color' && (
                <input
                  type="color"
                  value={property.value || '#000000'}
                  onChange={(e) => onUpdate(property.key, e.target.value)}
                  className="w-8 h-8 rounded border border-gray-300"
                  data-testid={`color-${property.key}`}
                />
              )}
              <Input
                id={property.key}
                value={property.value}
                onChange={(e) => onUpdate(property.key, e.target.value)}
                placeholder={property.placeholder || ''}
                className="text-sm h-8"
                data-testid={`input-${property.key}`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PropertyInputGroup;