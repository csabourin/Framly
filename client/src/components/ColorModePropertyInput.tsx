import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useColorMode, ColorMode } from '@/contexts/ColorModeContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Sun, Moon, Contrast, Palette, Eye, EyeOff } from 'lucide-react';
import { PropertyConfig } from '@/utils/propertyConfig';

export interface ColorModeValues {
  light?: string;
  dark?: string;
  'high-contrast'?: string;
}

export interface ColorModePropertyInputProps {
  config: PropertyConfig;
  value: string | ColorModeValues | undefined;
  onChange: (value: string | ColorModeValues) => void;
}

export function ColorModePropertyInput({ config, value, onChange }: ColorModePropertyInputProps) {
  const { t } = useTranslation();
  const { resolvedMode } = useColorMode();
  const [previewMode, setPreviewMode] = useState<'light' | 'dark' | 'high-contrast' | null>(null);
  const [showModeSelector, setShowModeSelector] = useState(false);

  // Determine if we're working with mode-specific values
  const isModeSpecific = typeof value === 'object' && value !== null;
  const modeValues = isModeSpecific ? value as ColorModeValues : { light: value as string };
  
  // Get the current value for the active/preview mode
  const activeMode = previewMode || resolvedMode;
  const currentValue = modeValues[activeMode] || modeValues.light || '#000000';

  const getModeIcon = (mode: 'light' | 'dark' | 'high-contrast') => {
    switch (mode) {
      case 'dark': return Moon;
      case 'high-contrast': return Contrast;
      default: return Sun;
    }
  };

  const handleColorChange = (newColor: string) => {
    if (isModeSpecific || showModeSelector) {
      const updatedValues = {
        ...modeValues,
        [activeMode]: newColor
      };
      onChange(updatedValues);
    } else {
      onChange(newColor);
    }
  };

  const handleEnableModeSpecific = () => {
    const currentSimpleValue = (value as string) || currentValue;
    onChange({
      light: currentSimpleValue,
      dark: currentSimpleValue,
      'high-contrast': currentSimpleValue
    });
    setShowModeSelector(true);
  };

  const handleDisableModeSpecific = () => {
    onChange(currentValue);
    setShowModeSelector(false);
    setPreviewMode(null);
  };

  const handleClearMode = (mode: 'light' | 'dark' | 'high-contrast') => {
    if (isModeSpecific) {
      const updatedValues = { ...modeValues };
      delete updatedValues[mode];
      
      // If only one mode left, convert back to simple value
      const remainingModes = Object.keys(updatedValues);
      if (remainingModes.length === 1) {
        onChange(updatedValues[remainingModes[0] as keyof ColorModeValues] || '#000000');
        setShowModeSelector(false);
      } else {
        onChange(updatedValues);
      }
    }
  };

  const modes: { key: 'light' | 'dark' | 'high-contrast', label: string }[] = [
    { key: 'light', label: t('colorMode.light', 'Light') },
    { key: 'dark', label: t('colorMode.dark', 'Dark') },
    { key: 'high-contrast', label: t('colorMode.highContrast', 'High Contrast') }
  ];

  return (
    <div className="space-y-2">
      {/* Mode selector header */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {isModeSpecific || showModeSelector ? (
            <div className="flex items-center gap-1">
              <Palette className="w-3 h-3" />
              Mode-specific colors
            </div>
          ) : (
            config.label
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Preview mode toggle */}
          {(isModeSpecific || showModeSelector) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                  <Eye className="w-3 h-3 mr-1" />
                  {previewMode ? t(`colorMode.${previewMode}`) : 'Live'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Preview Mode</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setPreviewMode(null)}>
                  <Eye className="w-4 h-4 mr-2" />
                  Live Preview
                </DropdownMenuItem>
                {modes.map(({ key, label }) => {
                  const IconComponent = getModeIcon(key);
                  return (
                    <DropdownMenuItem key={key} onClick={() => setPreviewMode(key)}>
                      <IconComponent className="w-4 h-4 mr-2" />
                      {label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {/* Enable/disable mode-specific colors */}
          <Button
            variant="ghost"
            size="sm"
            onClick={isModeSpecific || showModeSelector ? handleDisableModeSpecific : handleEnableModeSpecific}
            className="h-6 px-2 text-xs"
          >
            {isModeSpecific || showModeSelector ? (
              <EyeOff className="w-3 h-3" />
            ) : (
              <Palette className="w-3 h-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Color input */}
      <div className="flex gap-2">
        <Input
          type="color"
          value={currentValue === 'transparent' ? '#000000' : (currentValue || '#000000')}
          onChange={(e) => handleColorChange(e.target.value)}
          className="w-12 h-9 p-1 border rounded"
          data-testid={`color-${config.key}-${activeMode}`}
        />
        <Input
          type="text"
          value={currentValue || '#000000'}
          onChange={(e) => handleColorChange(e.target.value)}
          placeholder={t('breakpoints.colorPlaceholder')}
          className="flex-1 font-mono text-sm"
          data-testid={`input-${config.key}-${activeMode}`}
        />
        <button
          onClick={() => handleColorChange('transparent')}
          className={`px-2 py-1 text-xs rounded border transition-colors ${
            currentValue === 'transparent' 
              ? 'bg-blue-100 border-blue-300 text-blue-700' 
              : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
          }`}
          data-testid={`transparent-${config.key}-${activeMode}`}
          title={t('properties.setTransparent')}
        >
          {t('common.clear')}
        </button>
      </div>

      {/* Mode status indicators */}
      {(isModeSpecific || showModeSelector) && (
        <div className="flex flex-wrap gap-1">
          {modes.map(({ key, label }) => {
            const IconComponent = getModeIcon(key);
            const hasValue = modeValues[key];
            const isActive = activeMode === key;
            
            return (
              <div
                key={key}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                  isActive 
                    ? 'bg-primary/10 text-primary border border-primary/20' 
                    : hasValue 
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-gray-50 text-gray-500 border border-gray-200'
                }`}
              >
                <IconComponent className="w-3 h-3" />
                <span>{label}</span>
                {hasValue && (
                  <div
                    className="w-3 h-3 rounded-full border border-gray-300"
                    style={{ backgroundColor: modeValues[key] === 'transparent' ? 'transparent' : modeValues[key] }}
                  />
                )}
                {hasValue && key !== 'light' && (
                  <button
                    onClick={() => handleClearMode(key)}
                    className="ml-1 text-red-500 hover:text-red-700"
                    title={`Clear ${label} mode`}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}