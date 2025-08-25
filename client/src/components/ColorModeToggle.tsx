import React from 'react';
import { useColorMode, ColorMode } from '@/contexts/ColorModeContext';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Palette, Sun, Moon, Monitor, Contrast } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function ColorModeToggle() {
  const { mode, resolvedMode, setMode, supportsHighContrast, isColorModeDesignEnabled, setColorModeDesignEnabled } = useColorMode();
  const { t } = useTranslation();
  
  console.log('🔥 ColorMode values:', { mode, resolvedMode, isColorModeDesignEnabled, setColorModeDesignEnabled: typeof setColorModeDesignEnabled });
  
  // Fallback if context is not providing the function
  const handleToggleDesignMode = () => {
    if (typeof setColorModeDesignEnabled === 'function') {
      setColorModeDesignEnabled(!isColorModeDesignEnabled);
    } else {
      console.error('setColorModeDesignEnabled is not a function:', setColorModeDesignEnabled);
    }
  };

  const modeOptions: { value: ColorMode; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
    {
      value: 'light',
      label: t('colorMode.light', 'Light'),
      icon: Sun,
      description: t('colorMode.lightDesc', 'Light color scheme')
    },
    {
      value: 'dark', 
      label: t('colorMode.dark', 'Dark'),
      icon: Moon,
      description: t('colorMode.darkDesc', 'Dark color scheme')
    },
    {
      value: 'auto',
      label: t('colorMode.auto', 'System'),
      icon: Monitor,
      description: t('colorMode.autoDesc', 'Follow system preference')
    },
    ...(supportsHighContrast ? [{
      value: 'high-contrast' as ColorMode,
      label: t('colorMode.highContrast', 'High Contrast'),
      icon: Contrast,
      description: t('colorMode.highContrastDesc', 'Enhanced accessibility')
    }] : [])
  ];

  const getCurrentIcon = () => {
    switch (resolvedMode) {
      case 'dark':
        return Moon;
      case 'high-contrast':
        return Contrast;
      default:
        return Sun;
    }
  };

  const CurrentIcon = getCurrentIcon();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
          title={t('colorMode.toggle', 'Toggle color mode')}
          data-testid="color-mode-toggle"
        >
          <CurrentIcon className="h-4 w-4" />
          <span className="sr-only">{t('colorMode.toggle', 'Toggle color mode')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="px-2 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('colorMode.title', 'Color Mode')}
        </div>
        <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
        {modeOptions.map((option) => {
          const IconComponent = option.icon;
          const isActive = mode === option.value;
          
          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => setMode(option.value)}
              className={`flex items-center gap-2 ${isActive ? 'bg-accent' : ''}`}
              data-testid={`color-mode-${option.value}`}
            >
              <IconComponent className="h-4 w-4" />
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-gray-100">{option.label}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">{option.description}</div>
              </div>
              {isActive && (
                <div className="h-2 w-2 rounded-full bg-primary" />
              )}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
        <DropdownMenuItem
          onClick={handleToggleDesignMode}
          className="flex items-center gap-2"
          data-testid="color-mode-design-toggle"
        >
          <div className="flex items-center gap-2 w-full">
            <Palette className="h-4 w-4" />
            <div className="flex-1">
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {t('colorMode.designMode', 'Design Mode')}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {t('colorMode.designModeDesc', 'Enable color mode support for all properties')}
              </div>
            </div>
            <div className="ml-auto">
              {isColorModeDesignEnabled ? (
                <div className="h-2 w-2 rounded-full bg-blue-500" />
              ) : (
                <div className="h-2 w-2 rounded-full border border-gray-300" />
              )}
            </div>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}