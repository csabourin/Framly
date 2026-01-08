import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { RootState } from '../../store';
import { updateElement } from '../../store/canvasSlice';
import { switchBreakpoint } from '../../store/canvasSlice';
import { Button } from '@/components/ui/button';
import { Smartphone, Monitor, Laptop, TabletSmartphone } from 'lucide-react';
import { PropertyConfig } from '../../utils/propertyConfig';
import { PropertyInput } from './PropertyInput';
import { CanvasElement } from '../../types/canvas';

interface ResponsivePropertyInputProps {
  config: PropertyConfig;
  element: CanvasElement;
  value: any;
  onChange: (propertyKey: string, value: any, breakpoint?: string) => void;
}

const ResponsivePropertyInput: React.FC<ResponsivePropertyInputProps> = ({
  config,
  element,
  value,
  onChange
}) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const project = useSelector((state: RootState) => state.canvas.project);
  const currentBreakpoint = project.currentBreakpoint;
  const [showResponsiveControls, setShowResponsiveControls] = useState(false);

  // Get breakpoint icons
  const breakpointIcons: Record<string, React.ComponentType<any>> = {
    mobile: Smartphone,
    tablet: TabletSmartphone,
    desktop: Laptop,
    large: Monitor,
  };

  // Get responsive value for a specific breakpoint with mobile-first inheritance
  const getResponsiveValue = (targetBreakpoint: string) => {
    const breakpointOrder = ['mobile', 'tablet', 'desktop', 'large'];
    const targetIndex = breakpointOrder.indexOf(targetBreakpoint);

    if (targetIndex === -1) return undefined;

    let resolvedValue = undefined;

    // Start with base styles (mobile)
    resolvedValue = element.styles?.[config.key as keyof typeof element.styles] || value;

    // Check responsiveStyles for each breakpoint up to targetBreakpoint
    if (element.responsiveStyles) {
      for (let i = 0; i <= targetIndex; i++) {
        const bp = breakpointOrder[i];
        const bpStyles = element.responsiveStyles[bp as keyof typeof element.responsiveStyles];
        const bpValue = bpStyles?.[config.key as keyof typeof bpStyles];

        if (bpValue !== undefined && bpValue !== null) {
          resolvedValue = bpValue;
        }
      }
    }

    return resolvedValue;
  };

  // Helper to check if a value is explicitly set for a breakpoint
  const isExplicitlySet = (breakpoint: string) => {
    if (breakpoint === 'mobile') return true; // Mobile is always base
    const bpStyles = element.responsiveStyles?.[breakpoint as keyof typeof element.responsiveStyles];
    return bpStyles?.[config.key as keyof typeof bpStyles] !== undefined;
  };

  // Update responsive value
  const handleResponsiveChange = (breakpoint: string, newValue: any) => {
    const currentResponsiveStyles = element.responsiveStyles || {};
    const currentBreakpointStyles = currentResponsiveStyles[breakpoint as keyof typeof currentResponsiveStyles] || {};

    const updatedResponsiveStyles = {
      ...currentResponsiveStyles,
      [breakpoint]: {
        ...currentBreakpointStyles,
        [config.key]: newValue
      }
    };

    // If setting mobile value, also update base styles (mobile-first)
    const updates: any = {
      responsiveStyles: updatedResponsiveStyles
    };

    if (breakpoint === 'mobile') {
      updates.styles = {
        ...element.styles,
        [config.key]: newValue
      };
    }

    dispatch(updateElement({
      id: element.id,
      updates
    }));

    onChange(config.key, newValue, breakpoint);
  };

  // Switch to a breakpoint for preview
  const handleBreakpointPreview = (breakpoint: string) => {
    dispatch(switchBreakpoint(breakpoint));
  };

  if (!config.responsive) {
    // Non-responsive property - use standard input
    return (
      <PropertyInput
        config={config}
        value={value}
        onChange={(newValue) => onChange(config.key, newValue)}
        elementId={element.id}
        element={element}
      />
    );
  }

  const breakpointOrder = ['mobile', 'tablet', 'desktop', 'large'];
  const availableBreakpoints = breakpointOrder.filter(bp => project.breakpoints[bp]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          {config.label}
          {config.responsive && (
            <span className="ml-1 text-xs text-blue-600 bg-blue-100 px-1 py-0.5 rounded">
              Responsive
            </span>
          )}
        </label>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowResponsiveControls(!showResponsiveControls)}
          className="h-6 px-2 text-xs"
          data-testid={`button-responsive-toggle-${config.key}`}
        >
          {showResponsiveControls ? t('breakpoints.hideBreakpoints') : t('breakpoints.showBreakpoints')}
        </Button>
      </div>

      {/* Current breakpoint input */}
      <PropertyInput
        config={config}
        value={getResponsiveValue(currentBreakpoint) ?? value}
        onChange={(newValue) => handleResponsiveChange(currentBreakpoint, newValue)}
        elementId={element.id}
        element={{
          ...element,
          // Pass a modified element that preserves unit preferences by not including parsed values
          styles: config.type === 'unit' ? {} : element.styles
        }}
        className={!isExplicitlySet(currentBreakpoint) && currentBreakpoint !== 'mobile' ? "opacity-60" : ""}
      />

      {/* Responsive controls */}
      {showResponsiveControls && (
        <div className="space-y-2 pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            {t('breakpoints.mobileFirst')}
          </p>

          {availableBreakpoints.map((breakpoint) => {
            const Icon = breakpointIcons[breakpoint] || Monitor;
            const breakpointConfig = project.breakpoints[breakpoint];
            const breakpointValue = getResponsiveValue(breakpoint);
            const isExplicit = isExplicitlySet(breakpoint);
            const isCurrentBreakpoint = breakpoint === currentBreakpoint;

            return (
              <div key={breakpoint} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Button
                    variant={isCurrentBreakpoint ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleBreakpointPreview(breakpoint)}
                    className="h-8 px-3 flex items-center space-x-1 min-w-0"
                    data-testid={`button-preview-${breakpoint}`}
                  >
                    <Icon className="w-3 h-3 flex-shrink-0" />
                    <span className="text-xs truncate">{breakpointConfig.label}</span>
                    <span className="text-xs text-gray-500 flex-shrink-0">({breakpointConfig.width}px)</span>
                    {!isExplicit && breakpoint !== 'mobile' && (
                      <span className="text-[10px] text-blue-500 ml-1 italic">{t('breakpoints.inherited')}</span>
                    )}
                  </Button>
                  {isExplicit && breakpoint !== 'mobile' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResponsiveChange(breakpoint, undefined)}
                      className="h-6 w-6 p-0 text-gray-400 hover:text-red-600 flex-shrink-0"
                      data-testid={`button-clear-${breakpoint}-${config.key}`}
                      title={t('breakpoints.clearValue', { breakpoint })}
                    >
                      ×
                    </Button>
                  )}
                </div>
                <div className="w-full">
                  <PropertyInput
                    config={{
                      ...config,
                      placeholder: breakpoint === 'mobile' ? t('breakpoints.baseValue') : t('breakpoints.inherited')
                    }}
                    value={breakpointValue ?? ''}
                    onChange={(newValue) => handleResponsiveChange(breakpoint, newValue)}
                    elementId={element.id}
                    element={{
                      ...element,
                      // Pass a modified element that preserves unit preferences by not including parsed values
                      styles: config.type === 'unit' ? {} : element.styles
                    }}
                    className={!isExplicit && breakpoint !== 'mobile' ? "opacity-60" : ""}
                  />
                </div>
              </div>
            );
          })}

          <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
            <strong>Mobile-first:</strong> Set mobile as your base design.
            Larger screens inherit mobile values unless overridden.
          </div>
        </div>
      )}
    </div>
  );
};

export default ResponsivePropertyInput;