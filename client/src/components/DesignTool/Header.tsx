import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  ChevronDown, Download, Eye, Keyboard, Maximize, Minus, MoreHorizontal,
  Plus, Settings, SlidersHorizontal, Smartphone, Tablet, Monitor, MonitorUp, Zap,
} from 'lucide-react';
import { RootState } from '../../store';
import { selectCanvasProject, selectUIState } from '../../store/selectors';
import { switchBreakpoint, updateProjectName } from '../../store/canvasSlice';
import {
  fitToScreen, setButtonDesignerOpen, setClassEditorOpen, setCodeModalOpen,
  setComponentEditorOpen, setCSSOptimizationModalOpen, setExportModalOpen,
  setSettingsMenuOpen, setZoomLevel, zoomIn, zoomOut,
} from '../../store/uiSlice';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import UndoRedoControls from './UndoRedoControls';
import SettingsMenu from './SettingsMenu';
import TabBar from './TabBar';
import LanguageSwitcher from '@/components/ui/language-switcher';
import { ColorModeToggle } from '../ColorModeToggle';
import PersistenceStatus from '../PersistenceStatus';
import { ServiceWorkerStatus } from '../ServiceWorkerStatus';

interface HeaderProps {
  onShowKeyboardShortcuts: () => void;
}

const breakpointIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  mobile: Smartphone,
  tablet: Tablet,
  desktop: Monitor,
  large: MonitorUp,
};

const Header: React.FC<HeaderProps> = ({ onShowKeyboardShortcuts }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const project = useSelector(selectCanvasProject);
  const zoomLevel = useSelector((state: RootState) => selectUIState(state).zoomLevel);

  const defaultBreakpoints = {
    mobile: { name: 'mobile', label: t('breakpoints.mobile'), width: 375 },
    tablet: { name: 'tablet', label: t('breakpoints.tablet'), width: 768 },
    desktop: { name: 'desktop', label: t('breakpoints.desktop'), width: 1024 },
    large: { name: 'large', label: t('breakpoints.largeDesktop'), width: 1440 },
  };
  const breakpoints = Object.entries(defaultBreakpoints).map(([name, fallback]) => ({
    ...fallback,
    ...project.breakpoints[name],
    name,
    label: fallback.label,
  }));
  const currentBreakpoint = breakpoints.find(({ name }) => name === project.currentBreakpoint) ?? breakpoints[0];
  const BreakpointIcon = breakpointIcons[currentBreakpoint.name] ?? Monitor;

  return (
    <header className="framly-top-rail" data-testid="header-main">
      <div className="framly-brand" aria-label="Framly">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <rect x="2.5" y="2.5" width="19" height="19" fill="none" stroke="currentColor" />
          <rect x="7.5" y="7.5" width="9" height="9" fill="none" stroke="currentColor" />
        </svg>
        <span>Framly</span>
      </div>

      <div className="framly-rail-divider" />
      <input
        value={project.name}
        onChange={(event) => dispatch(updateProjectName(event.target.value))}
        className="framly-project-name"
        data-testid="input-project-name"
        aria-label="Project name"
        placeholder="Untitled project"
      />
      <TabBar />

      <div className="ml-auto flex min-w-0 items-center gap-1">
        <UndoRedoControls />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="framly-rail-control" data-testid="status-breakpoint">
              <BreakpointIcon className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">{currentBreakpoint.label}</span>
              <span className="framly-mono text-[11px] text-[var(--ink-2)]">{currentBreakpoint.width}px</span>
              <ChevronDown className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="framly-menu w-52">
            {breakpoints.map((breakpoint) => {
              const Icon = breakpointIcons[breakpoint.name] ?? Monitor;
              return (
                <DropdownMenuItem
                  key={breakpoint.name}
                  onClick={() => dispatch(switchBreakpoint(breakpoint.name))}
                  className={project.currentBreakpoint === breakpoint.name ? 'bg-accent' : ''}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  <span className="flex-1">{breakpoint.label}</span>
                  <span className="framly-mono text-xs text-muted-foreground">{breakpoint.width}px</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="framly-rail-control framly-zoom" data-testid="zoom-control">
              <span className="framly-mono">{Math.round(zoomLevel * 100)}%</span>
              <ChevronDown className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="framly-menu w-44">
            <DropdownMenuItem onClick={() => dispatch(zoomOut())} data-testid="menu-zoom-out"><Minus className="mr-2 h-4 w-4" />Zoom out</DropdownMenuItem>
            <DropdownMenuItem onClick={() => dispatch(zoomIn())} data-testid="menu-zoom-in"><Plus className="mr-2 h-4 w-4" />Zoom in</DropdownMenuItem>
            <DropdownMenuItem onClick={() => dispatch(fitToScreen())} data-testid="menu-fit-screen"><Maximize className="mr-2 h-4 w-4" />Fit to screen</DropdownMenuItem>
            <DropdownMenuSeparator />
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((level) => (
              <DropdownMenuItem key={level} onClick={() => dispatch(setZoomLevel(level))}>
                <span className="framly-mono ml-6">{level * 100}%</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <button className="framly-rail-control hidden 2xl:flex" disabled aria-label="Checks are not available yet">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--ink-3)]" />
          Checks —
        </button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => dispatch(setCodeModalOpen(true))}
          className="framly-action-button"
          data-testid="button-preview"
        >
          <Eye className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">{t('common.preview')}</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="framly-icon-button" data-testid="more-menu" aria-label="More tools">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="framly-menu w-56">
            <DropdownMenuItem onClick={() => dispatch(setClassEditorOpen(true))} data-testid="menu-class-editor"><SlidersHorizontal className="mr-2 h-4 w-4" />Class editor</DropdownMenuItem>
            <DropdownMenuItem onClick={() => dispatch(setComponentEditorOpen(true))} data-testid="menu-component-editor">Component editor</DropdownMenuItem>
            <DropdownMenuItem onClick={() => dispatch(setButtonDesignerOpen(true))} data-testid="menu-button-designer">Button designer</DropdownMenuItem>
            <DropdownMenuItem onClick={() => dispatch(setCSSOptimizationModalOpen(true))} data-testid="menu-css-optimization"><Zap className="mr-2 h-4 w-4" />CSS optimization</DropdownMenuItem>
            <DropdownMenuItem onClick={onShowKeyboardShortcuts}><Keyboard className="mr-2 h-4 w-4" />Keyboard shortcuts</DropdownMenuItem>
            <DropdownMenuItem onClick={() => dispatch(setSettingsMenuOpen(true))}><Settings className="mr-2 h-4 w-4" />Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="flex items-center justify-between px-2 py-1">
              <ColorModeToggle />
              <LanguageSwitcher />
            </div>
            <div className="border-t border-[var(--rule)] px-1 pt-1"><PersistenceStatus /></div>
            <div className="px-2 py-1"><ServiceWorkerStatus /></div>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          onClick={() => dispatch(setExportModalOpen(true))}
          size="sm"
          className="framly-export-button"
          data-testid="button-export"
        >
          <Download className="h-3.5 w-3.5" />
          {t('common.export')}
        </Button>
      </div>
      <SettingsMenu />
    </header>
  );
};

export default Header;
