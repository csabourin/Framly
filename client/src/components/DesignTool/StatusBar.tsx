import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { RootState } from '../../store';
import { selectCanvasProject, selectUIState, selectCurrentElements } from '../../store/selectors';
import { switchBreakpoint } from '../../store/canvasSlice';
import { MousePointer, Layers, Smartphone, Tablet, Monitor, MonitorSpeaker } from 'lucide-react';
import PersistenceStatus from '../PersistenceStatus';
import { ServiceWorkerStatus } from '../ServiceWorkerStatus';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const StatusBar: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const project = useSelector(selectCanvasProject);
  const { selectedTool } = useSelector(selectUIState);

  // Use memoized selector for current elements
  const currentElements = useSelector(selectCurrentElements);

  // Count only non-root elements to give users a meaningful count
  const elementCount = Object.keys(currentElements).filter(id => id !== 'root').length;
  const rootElement = currentElements.root;
  const currentBreakpoint = project.breakpoints[project.currentBreakpoint];

  // Icon mapping for breakpoints
  const breakpointIcons: Record<string, React.ComponentType<any>> = {
    mobile: Smartphone,
    tablet: Tablet,
    desktop: Monitor,
    large: MonitorSpeaker,
  };

  // Ensure all 4 breakpoints are present with proper defaults
  const defaultBreakpoints = {
    mobile: { name: 'mobile', label: t('breakpoints.mobile'), width: 375 },
    tablet: { name: 'tablet', label: t('breakpoints.tablet'), width: 768 },
    desktop: { name: 'desktop', label: t('breakpoints.desktop'), width: 1024 },
    large: { name: 'large', label: t('breakpoints.largeDesktop'), width: 1440 }
  };

  // Merge existing breakpoints with defaults
  const breakpoints = Object.entries(defaultBreakpoints).map(([key, defaultBp]) => {
    const existingBp = project.breakpoints[key];
    return {
      ...defaultBp,
      ...(existingBp || {}),
      name: key,
      label: defaultBp.label
    };
  });

  const handleBreakpointChange = (breakpointName: string) => {
    dispatch(switchBreakpoint(breakpointName));
  };

  const CurrentBreakpointIcon = breakpointIcons[project.currentBreakpoint] || Smartphone;

  const getToolDisplay = () => {
    switch (selectedTool) {
      case 'pointer':
        return t('statusBar.selectionTool');
      case 'hand':
        return t('statusBar.handTool');
      case 'rectangle':
        return t('statusBar.rectangleTool');
      case 'text':
        return t('statusBar.textTool');
      case 'image':
        return t('statusBar.imageTool');
      case 'split-horizontal':
        return t('statusBar.splitHorizontal');
      case 'split-vertical':
        return t('statusBar.splitVertical');
      case 'merge':
        return t('statusBar.mergeTool');
      case 'select-dropdown':
        return t('elements.selectDropdown');
      default:
        return t('statusBar.unknownTool');
    }
  };

  return (
    <footer
      className="h-8 bg-background border-t border-border flex items-center px-4 text-xs text-muted-foreground gap-4 flex-shrink-0"
      data-testid="status-bar"
    >
      {/* Current Tool */}
      <div className="flex items-center gap-1" data-testid="status-tool">
        <MousePointer className="w-3 h-3" />
        <span>{getToolDisplay()}</span>
      </div>

      {/* Canvas Dimensions */}
      <div className="flex items-center gap-1" data-testid="status-dimensions">
        <Smartphone className="w-3 h-3" />
        <span>
          {rootElement?.width || 0}px × {rootElement?.height || 0}px
        </span>
      </div>

      {/* Element Count */}
      <div className="flex items-center gap-1" data-testid="status-elements">
        <Layers className="w-3 h-3" />
        <span>{t('statusBar.elementCount', { count: elementCount })}</span>
      </div>

      {/* Breakpoint Selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
            data-testid="status-breakpoint"
          >
            <CurrentBreakpointIcon className="w-3 h-3" />
            <span className="font-medium">
              {currentBreakpoint?.label || t('statusBar.mobile')} ({currentBreakpoint?.width || 0}px)
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {breakpoints.map((breakpoint) => {
            const Icon = breakpointIcons[breakpoint.name] || Monitor;
            const isActive = project.currentBreakpoint === breakpoint.name;

            return (
              <DropdownMenuItem
                key={breakpoint.name}
                onClick={() => handleBreakpointChange(breakpoint.name)}
                className={isActive ? 'bg-accent' : ''}
              >
                <Icon className="w-4 h-4 mr-2" />
                <span className="flex-1">{breakpoint.label}</span>
                <span className="text-xs text-muted-foreground ml-2">{breakpoint.width}px</span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Service Worker Status */}
      <ServiceWorkerStatus />

      {/* Persistence Status */}
      <div className="ml-auto" data-testid="status-persistence">
        <PersistenceStatus />
      </div>
    </footer>
  );
};

export default StatusBar;
