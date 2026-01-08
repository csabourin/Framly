import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { RootState } from '../../store';
import { selectCanvasProject, selectExportModalState, selectUIState } from '../../store/selectors';
import { switchBreakpoint, undo, redo, updateProjectName } from '../../store/canvasSlice';
import {
  setExportModalOpen,
  setCodeModalOpen,
  setCSSOptimizationModalOpen,
  zoomIn,
  zoomOut,
  fitToScreen,
  setClassEditorOpen,
  setComponentEditorOpen,
  setButtonDesignerOpen,
  setSettingsMenuOpen,
  toggleDOMTreePanel
} from '../../store/uiSlice';
import { Button } from '@/components/ui/button';
import { Eye, Undo, Redo, Download, Smartphone, Tablet, Monitor, Settings, Plus, Minus, Maximize, Zap, List, Palette, Component, MousePointer2, MonitorSpeaker } from 'lucide-react';
import UndoRedoControls from './UndoRedoControls';
import WebsiteImport from './WebsiteImport';
import SettingsMenu from './SettingsMenu';
import LanguageSwitcher from '@/components/ui/language-switcher';
import { ColorModeToggle } from '../../components/ColorModeToggle';
import { useColorMode } from '../../contexts/ColorModeContext';

const Header: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  // Safely use ColorMode context with fallback
  let isColorModeDesignEnabled = false;
  let setColorModeDesignEnabled: any = () => { };
  try {
    const colorModeContext = useColorMode();
    isColorModeDesignEnabled = colorModeContext.isColorModeDesignEnabled;
    setColorModeDesignEnabled = colorModeContext.setColorModeDesignEnabled;
  } catch (error) {
    // Silent fallback if context not available
  }
  const project = useSelector(selectCanvasProject);
  const { isExportModalOpen, isDOMTreePanelVisible } = useSelector((state: RootState) => ({
    ...selectExportModalState(state),
    isDOMTreePanelVisible: selectUIState(state).isDOMTreePanelVisible
  }));

  // Icon mapping for breakpoints with distinct icons
  const breakpointIcons: Record<string, React.ComponentType<any>> = {
    mobile: Smartphone,
    tablet: Tablet,
    desktop: Monitor,
    large: MonitorSpeaker,  // Distinct icon for large screens
  };

  // Ensure all 4 breakpoints are present with proper defaults
  const defaultBreakpoints = {
    mobile: { name: 'mobile', label: t('breakpoints.mobile'), width: 375 },
    tablet: { name: 'tablet', label: t('breakpoints.tablet'), width: 768 },
    desktop: { name: 'desktop', label: t('breakpoints.desktop'), width: 1024 },
    large: { name: 'large', label: t('breakpoints.largeDesktop'), width: 1440 }
  };

  // Merge existing breakpoints with defaults, ensuring all properties are present
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

  // Note: handleUndo and handleRedo removed - now using UndoRedoControls component

  const handlePreview = () => {
    dispatch(setCodeModalOpen(true));
  };

  const handleExport = () => {
    dispatch(setExportModalOpen(true));
  };

  const handleCSSOptimization = () => {
    dispatch(setCSSOptimizationModalOpen(true));
  };

  const handleZoomIn = () => {
    dispatch(zoomIn());
  };

  const handleZoomOut = () => {
    dispatch(zoomOut());
  };

  const handleFitToScreen = () => {
    dispatch(fitToScreen());
  };


  const handleOpenClassEditor = () => {
    dispatch(setClassEditorOpen(true));
  };

  const handleOpenComponentEditor = () => {
    dispatch(setComponentEditorOpen(true));
    // Could also set a specific component ID if editing existing component
  };

  const handleOpenButtonDesigner = () => {
    dispatch(setButtonDesignerOpen(true));
  };

  const handleOpenSettings = () => {
    dispatch(setSettingsMenuOpen(true));
  };

  const handleDOMTreeToggle = () => {
    dispatch(toggleDOMTreePanel());
  };

  return (
    <header
      className="absolute top-0 left-0 right-0 h-16 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200/60 dark:border-gray-700/60 flex items-center px-6 z-50 gap-6 shadow-sm"
      data-testid="header-main"
    >
      {/* Logo */}
      <div className="flex items-center gap-4" data-testid="logo-container">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <Component className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl text-gray-900 dark:text-gray-100 tracking-tight">Framly</span>
        </div>
        <button
          onClick={handleOpenSettings}
          className="w-8 h-8 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors"
          data-testid="settings-button"
        >
          <Settings className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
        <button
          onClick={handleDOMTreeToggle}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${isDOMTreePanelVisible
              ? 'bg-blue-500 text-white shadow-md'
              : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          data-testid="header-toggle-dom-tree"
          title={t('toolbar.elementTree')}
        >
          <List className="w-4 h-4" />
        </button>
      </div>

      {/* Project Info */}
      <div className="flex items-center gap-3" data-testid="project-info">
        <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
        <input
          type="text"
          value={project.name}
          onChange={(e) => dispatch(updateProjectName(e.target.value))}
          className="bg-transparent border-none outline-none font-semibold text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 px-3 py-2 rounded-lg transition-colors focus:bg-gray-50 dark:focus:bg-gray-800 focus:ring-2 focus:ring-blue-500/20"
          data-testid="input-project-name"
          placeholder="Project Name"
        />
      </div>

      {/* Header Actions */}
      <div className="ml-auto flex items-center gap-2" data-testid="header-actions">
        {/* Breakpoint Switcher */}
        <div className="flex bg-gray-50 dark:bg-gray-800 rounded-xl p-1 shadow-inner border border-gray-200/50 dark:border-gray-700/50" data-testid="breakpoint-switcher">
          {breakpoints.map((breakpoint) => {
            const Icon = breakpointIcons[breakpoint.name] || Monitor;
            const isActive = project.currentBreakpoint === breakpoint.name;

            return (
              <button
                key={breakpoint.name}
                onClick={() => handleBreakpointChange(breakpoint.name)}
                className={`px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all duration-200 ${isActive
                    ? 'bg-white dark:bg-gray-700 shadow-md border border-gray-200/80 dark:border-gray-600/80 text-blue-600 dark:text-blue-400 scale-105'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-700/60'
                  }`}
                data-testid={`button-breakpoint-${breakpoint.name}`}
                title={`${breakpoint.label} (${breakpoint.width}px)`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden lg:inline text-xs">{breakpoint.label}</span>
              </button>
            );
          })}
        </div>


        {/* Zoom Controls */}
        <div className="flex items-center gap-0.5 bg-gray-50 dark:bg-gray-800 rounded-xl p-1 shadow-inner border border-gray-200/50 dark:border-gray-700/50" data-testid="zoom-controls">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            className="p-2 hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm rounded-lg transition-all duration-200"
            data-testid="button-zoom-out"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFitToScreen}
            className="p-2 hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm rounded-lg transition-all duration-200"
            data-testid="button-fit-screen"
            title="Fit to Screen"
          >
            <Maximize className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            className="p-2 hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm rounded-lg transition-all duration-200"
            data-testid="button-zoom-in"
            title="Zoom In"
          >
            <Plus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </Button>
        </div>

        {/* Import Tools - Hidden for now */}
        {/* <WebsiteImport /> */}

        {/* Advanced Tools */}
        <div className="flex items-center gap-0.5 bg-gray-50 dark:bg-gray-800 rounded-xl p-1 shadow-inner border border-gray-200/50 dark:border-gray-700/50" data-testid="advanced-tools">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenClassEditor}
            className="p-2 hover:bg-white dark:hover:bg-gray-700 hover:shadow-md rounded-lg transition-all duration-200 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            data-testid="button-open-class-editor"
            title="Open Class Editor"
          >
            <Palette className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenComponentEditor}
            className="p-2 hover:bg-white dark:hover:bg-gray-700 hover:shadow-md rounded-lg transition-all duration-200 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            data-testid="button-open-component-editor"
            title="Open Component Editor"
          >
            <Component className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenButtonDesigner}
            className="p-2 hover:bg-white dark:hover:bg-gray-700 hover:shadow-md rounded-lg transition-all duration-200 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            data-testid="button-open-button-designer"
            title="Button Designer & States"
          >
            <MousePointer2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3" data-testid="action-buttons">
          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

          <Button
            variant="ghost"
            size="sm"
            onClick={handlePreview}
            className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            data-testid="button-preview"
            title={t('canvas.preview')}
          >
            <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </Button>

          {/* Undo/Redo Controls with History Management */}
          <UndoRedoControls />

          {/* Color Mode Toggle with contextual menu */}
          <ColorModeToggle />

          <Button
            variant="ghost"
            size="sm"
            onClick={handleCSSOptimization}
            className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            data-testid="button-css-optimization"
            title="CSS Optimization"
          >
            <Zap className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </Button>

          {/* Language Switcher */}
          <LanguageSwitcher />

          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

          <Button
            onClick={handleExport}
            size="sm"
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 px-4 py-2"
            data-testid="button-export"
            title={t('common.export')}
          >
            <Download className="w-4 h-4 mr-2" />
            <span className="font-semibold">{t('common.export')}</span>
          </Button>
        </div>
      </div>

      {/* Settings Menu */}
      <SettingsMenu />
    </header>
  );
};

export default Header;
