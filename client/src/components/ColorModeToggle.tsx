import React from 'react';
import { useColorMode, ColorMode } from '../contexts/ColorModeContext';
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
  console.log('🔧 ColorModeToggle rendering at', new Date().toISOString());
  
  try {
    const contextValue = useColorMode();
    const { mode, resolvedMode, setMode, supportsHighContrast, isColorModeDesignEnabled, setColorModeDesignEnabled } = contextValue;
    console.log('🔧 ColorModeToggle: useColorMode hook called successfully');
    console.log('🔧 ColorModeToggle: Context functions check:', {
      setMode: typeof setMode,
      setColorModeDesignEnabled: typeof setColorModeDesignEnabled,
      contextValue: !!contextValue
    });
    
    const { t, ready } = useTranslation();
    console.log('🔧 ColorModeToggle: useTranslation ready:', ready, 'mode:', mode, 'resolved:', resolvedMode);
    
    // If translation is not ready, don't render yet (prevents crashes during async i18n initialization)
    if (!ready) {
      console.log('🔧 ColorModeToggle: i18n not ready, returning loading state');
      return (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-1 opacity-50"
          disabled
          data-testid="color-mode-toggle-loading"
        >
          <Sun className="h-4 w-4 animate-pulse" />
        </Button>
      );
    }
    
    // Simple toggle handler with safety check
    const handleToggleDesignMode = () => {
      if (typeof setColorModeDesignEnabled === 'function') {
        setColorModeDesignEnabled(!isColorModeDesignEnabled);
      } else {
        console.error('🔧 ColorModeToggle: setColorModeDesignEnabled is not a function:', typeof setColorModeDesignEnabled);
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
            className="h-8 w-8 p-1 hover:bg-accent hover:text-accent-foreground bg-card border border-border"
            title={t('colorMode.toggle', 'Toggle color mode')}
            data-testid="color-mode-toggle"
          >
            <CurrentIcon className="h-4 w-4 text-foreground" />
            <span className="sr-only">{t('colorMode.toggle', 'Toggle color mode')}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5 text-sm font-medium text-foreground">
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
                  <div className="font-medium text-foreground">{option.label}</div>
                  <div className="text-xs text-muted-foreground">{option.description}</div>
                </div>
                {isActive && (
                  <div className="h-2 w-2 rounded-full bg-primary" />
                )}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
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
                <div className="font-medium text-foreground">
                  {t('colorMode.designMode', 'Design Mode')}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t('colorMode.designModeDesc', 'Enable color mode support for all properties')}
                </div>
              </div>
              <div className="ml-auto">
                {isColorModeDesignEnabled ? (
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                ) : (
                  <div className="h-2 w-2 rounded-full border border-border" />
                )}
              </div>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  } catch (error) {
    console.error('🔧 ColorModeToggle ERROR:', error);
    // Fallback component when there's an error
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-1 hover:bg-accent hover:text-accent-foreground bg-card border border-border"
        title="Color Mode Toggle (Error)"
        data-testid="color-mode-toggle-fallback"
        onClick={() => console.log('ColorModeToggle fallback clicked')}
      >
        <Sun className="h-4 w-4" />
        <span className="sr-only">Color Mode Toggle (Error)</span>
      </Button>
    );
  }
}