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
  const colorModeContext = useColorMode();
  const { t } = useTranslation();
  
  // Add safety check for context
  if (!colorModeContext) {
    console.warn('ColorModeToggle: ColorModeContext not found');
    return null;
  }
  
  const { mode, resolvedMode, setMode, supportsHighContrast } = colorModeContext;

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

  console.log('ColorModeToggle rendering:', { mode, resolvedMode });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 border border-red-500"
          title={t('colorMode.toggle', 'Toggle color mode')}
          data-testid="color-mode-toggle"
          style={{ backgroundColor: 'red', opacity: 0.5 }}
        >
          <CurrentIcon className="h-4 w-4" />
          <span className="sr-only">{t('colorMode.toggle', 'Toggle color mode')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
          {t('colorMode.title', 'Color Mode')}
        </div>
        <DropdownMenuSeparator />
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
                <div className="font-medium">{option.label}</div>
                <div className="text-xs text-muted-foreground">{option.description}</div>
              </div>
              {isActive && (
                <div className="h-2 w-2 rounded-full bg-primary" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}