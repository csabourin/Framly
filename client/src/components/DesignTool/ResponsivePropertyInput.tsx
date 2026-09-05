import React, { useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { RootState } from '../../store';
import { switchBreakpoint } from '../../store/canvasSlice';
import { Button } from '@/components/ui/button';
import { Smartphone, Monitor, Laptop, TabletSmartphone } from 'lucide-react';
import { PropertyConfig } from '../../utils/propertyConfig';
import PropertyLabel from './PropertyLabel';
import { propertyPresentation } from '../../utils/propertyLabels';
import { PropertyInput } from './PropertyInput';
import { CanvasElement } from '../../types/canvas';

interface ResponsivePropertyInputProps {
  config: PropertyConfig;
  element: CanvasElement;
  value: any;
  onChange: (propertyKey: string, value: any, breakpoint?: string) => void;
}

/** Mobile-first order. Everything larger inherits from what precedes it. */
const BREAKPOINT_ORDER = ['mobile', 'tablet', 'desktop', 'large'];

const ResponsivePropertyInput: React.FC<ResponsivePropertyInputProps> = ({
  config,
  element,
  value,
  onChange
}) => {
  const { t } = useTranslation();
  const { label, term } = propertyPresentation(config, t);
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

  /** The override written at one breakpoint, if there is one. */
  const overrideAt = (breakpoint: string) => {
    const styles = element.responsiveStyles?.[breakpoint as keyof typeof element.responsiveStyles];
    return styles?.[config.key as keyof typeof styles];
  };

  // Get responsive value for a specific breakpoint with mobile-first inheritance
  const getResponsiveValue = (targetBreakpoint: string) => {
    if (targetBreakpoint === currentBreakpoint && ['padding', 'margin'].includes(config.key)) return value;
    const targetIndex = BREAKPOINT_ORDER.indexOf(targetBreakpoint);
    if (targetIndex === -1) return undefined;

    // Start with base styles (mobile)
    let resolvedValue = element.styles?.[config.key as keyof typeof element.styles] || value;

    for (let i = 0; i <= targetIndex; i++) {
      const bpValue = overrideAt(BREAKPOINT_ORDER[i]);
      if (bpValue !== undefined && bpValue !== null) resolvedValue = bpValue;
    }

    return resolvedValue;
  };

  // Helper to check if a value is explicitly set for a breakpoint
  const isExplicitlySet = (breakpoint: string) => {
    if (breakpoint === 'mobile') return true; // Mobile is always base
    return overrideAt(breakpoint) !== undefined;
  };

  /**
   * Where the value shown at a breakpoint comes from.
   *
   * `base` — mobile, which is the value the page has at every width.
   * `set-here` — an override written at this breakpoint.
   * `inherited` — no override, so it comes from the last breakpoint that has
   * one, or from the base.
   *
   * This is the thing that used to take a click to find out: the only hint was
   * a dimmed input, and a label hidden behind "Show breakpoints".
   */
  const valueOrigin = (breakpoint: string): { kind: 'base' | 'set-here' | 'inherited'; from?: string } => {
    if (breakpoint === 'mobile') return { kind: 'base' };
    if (isExplicitlySet(breakpoint)) return { kind: 'set-here' };

    const targetIndex = BREAKPOINT_ORDER.indexOf(breakpoint);
    for (let i = targetIndex - 1; i > 0; i--) {
      if (isExplicitlySet(BREAKPOINT_ORDER[i])) {
        return { kind: 'inherited', from: BREAKPOINT_ORDER[i] };
      }
    }
    return { kind: 'inherited', from: 'mobile' };
  };

  /** Plain language for where a value comes from — no colour carries this. */
  const originLabel = (breakpoint: string): string => {
    const origin = valueOrigin(breakpoint);
    if (origin.kind === 'base') return t('breakpoints.appliesEverywhere');
    if (origin.kind === 'set-here') return t('breakpoints.setHere');
    return t('breakpoints.inheritedFrom', { breakpoint: t(`breakpoints.${origin.from}`) });
  };

  /**
   * Hand the edit to the panel and let it decide where the value belongs.
   *
   * This used to write `responsiveStyles` here *and* call `onChange`, which
   * wrote the same value to the base as well — so setting a font size at
   * "tablet" changed the base rule too, and the export carried the wide-screen
   * value at every width. One writer, one place.
   */
  const handleResponsiveChange = (breakpoint: string, newValue: any) => {
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

  const availableBreakpoints = BREAKPOINT_ORDER.filter(bp => project.breakpoints[bp]);

  /*
   * `PropertyInput` re-reads the unit preference in an effect keyed on the
   * element it is given. Building a fresh object in the JSX made that effect
   * fire on every render, so every keystroke cost an extra render pass across
   * the panel. Same object in, same object out, unless the styles actually
   * change.
   */
  const elementForInput = useMemo(
    () => ({ ...element, styles: config.type === 'unit' ? {} : element.styles }),
    [element, config.type]
  );
  const originId = `origin-${config.key}`;
  const canClear = currentBreakpoint !== 'mobile' && isExplicitlySet(currentBreakpoint);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
        <div className="text-sm font-medium text-gray-700">
          <PropertyLabel label={label} term={term} />
        </div>
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
        element={elementForInput}
        describedBy={originId}
        hideLabel
      />

      {/*
        Where this value comes from, said in words rather than by dimming the
        input. Mono and grey: `docs/interface.md` reserves colour for the box
        model and for pass/warn/fail, so "inherited" may not borrow a hue.
      */}
      <div
        className="flex items-center justify-between gap-2 min-h-[24px]"
        data-testid={`origin-row-${config.key}`}
      >
        <p
          id={originId}
          className="font-mono text-[11px] text-gray-600 dark:text-gray-400"
          data-testid={`origin-${config.key}`}
        >
          {originLabel(currentBreakpoint)}
        </p>
        {canClear && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleResponsiveChange(currentBreakpoint, undefined)}
            className="h-6 min-w-[24px] px-2 text-[11px] font-mono text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 flex-shrink-0"
            data-testid={`button-clear-override-${config.key}`}
          >
            {t('breakpoints.clearOverride', {
              breakpoint: t(`breakpoints.${currentBreakpoint}`),
            })}
          </Button>
        )}
      </div>

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
            const rowOriginId = `origin-${config.key}-${breakpoint}`;

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
                    <Icon className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                    <span className="text-xs truncate">{breakpointConfig.label}</span>
                    <span className="text-xs flex-shrink-0">({breakpointConfig.width}px)</span>
                  </Button>
                  {isExplicit && breakpoint !== 'mobile' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResponsiveChange(breakpoint, undefined)}
                      className="h-6 min-w-[24px] px-2 text-[11px] font-mono text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 flex-shrink-0"
                      data-testid={`button-clear-${breakpoint}-${config.key}`}
                    >
                      {t('breakpoints.clearOverride', {
                        breakpoint: t(`breakpoints.${breakpoint}`),
                      })}
                    </Button>
                  )}
                </div>
                <div className="w-full">
                  <PropertyInput
                    config={{
                      ...config,
                      placeholder: breakpoint === 'mobile' ? t('breakpoints.baseValue') : undefined
                    }}
                    value={breakpointValue ?? ''}
                    onChange={(newValue) => handleResponsiveChange(breakpoint, newValue)}
                    elementId={element.id}
                    element={elementForInput}
                    describedBy={rowOriginId}
                    hideLabel
                  />
                  <p
                    id={rowOriginId}
                    className="font-mono text-[11px] text-gray-600 dark:text-gray-400 mt-1"
                    data-testid={`origin-${config.key}-${breakpoint}`}
                  >
                    {originLabel(breakpoint)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ResponsivePropertyInput;
