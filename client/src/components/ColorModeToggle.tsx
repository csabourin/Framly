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
  
  // Simple toggle handler
  const handleToggleDesignMode = () => {
    console.log('🎯 handleToggleDesignMode called!');
    console.log('🎯 Design Mode clicked. Current state:', isColorModeDesignEnabled);
    console.log('🎯 Function available:', typeof setColorModeDesignEnabled);
    
    if (typeof setColorModeDesignEnabled === 'function') {
      console.log('🎯 About to toggle...');
      setColorModeDesignEnabled(!isColorModeDesignEnabled);
      console.log('🎯 Toggled to:', !isColorModeDesignEnabled);
    } else {
      console.log('🎯 Function not available');
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
          variant="outline"
          size="sm"
          className="h-10 w-10 p-2 border-2 border-blue-500 bg-white hover:bg-blue-50 shadow-lg"
          title={t('colorMode.toggle', 'Toggle color mode')}
          data-testid="color-mode-toggle"
          style={{ 
            minWidth: '40px', 
            minHeight: '40px',
            backgroundColor: '#ffffff',
            borderColor: '#3b82f6',
            borderWidth: '2px',
            borderStyle: 'solid',
            position: 'relative',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <CurrentIcon 
            className="h-5 w-5" 
            style={{ 
              color: '#1f2937',
              strokeWidth: 2,
              filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.5))',
              width: '20px',
              height: '20px'
            }}
          />
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
          onClick={(e) => {
            console.log('Dropdown item clicked!');
            e.preventDefault();
            e.stopPropagation();
            handleToggleDesignMode();
          }}
          className="flex items-center gap-2 cursor-pointer"
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