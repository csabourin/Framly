import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { RootState } from '../../store';
import { selectCanvasProject, selectExportModalState, selectUIState } from '../../store/selectors';
import { switchBreakpoint, undo, redo, updateProjectName } from '../../store/canvasSlice';
import { setExportModalOpen, setCodeModalOpen, setCSSOptimizationModalOpen, zoomIn, zoomOut, fitToScreen, setClassEditorOpen, setComponentEditorOpen, setButtonDesignerOpen, setSettingsMenuOpen } from '../../store/uiSlice';
import { Button } from '@/components/ui/button';
import { Eye, Undo, Redo, Download, Smartphone, Tablet, Monitor, Settings, Plus, Minus, Maximize, Zap, List, Palette, Component, MousePointer2, MonitorSpeaker } from 'lucide-react';
import UndoRedoControls from './UndoRedoControls';
import WebsiteImport from './WebsiteImport';
import SettingsMenu from './SettingsMenu';
import LanguageSwitcher from '@/components/ui/language-switcher';
import { ColorModeToggle } from '@/components/ColorModeToggle';

const Header: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const project = useSelector(selectCanvasProject);
  const { isExportModalOpen } = useSelector(selectExportModalState);

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

  return (
    <header 
      className="absolute top-0 left-0 right-0 h-12 bg-white border-b border-gray-200 flex items-center px-4 z-50 gap-4"
      data-testid="header-main"
    >
      {/* Logo */}
      <div className="flex items-center gap-2" data-testid="logo-container">
        <button
          onClick={handleOpenSettings}
          className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
          data-testid="settings-button"
        >
          <Settings className="w-4 h-4 text-white" />
        </button>
        <span className="font-bold text-lg text-primary">DesignLab</span>
      </div>
      
      {/* Project Info */}
      <div className="flex items-center gap-2 text-sm text-gray-600" data-testid="project-info">
        <input
          type="text"
          value={project.name}
          onChange={(e) => dispatch(updateProjectName(e.target.value))}
          className="bg-transparent border-none outline-none font-medium"
          data-testid="input-project-name"
        />
        <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
      </div>
      
      {/* Header Actions */}
      <div className="ml-auto flex items-center gap-2" data-testid="header-actions">
        {/* Breakpoint Switcher */}
        <div className="flex bg-gray-100 rounded-lg p-1" data-testid="breakpoint-switcher">
          {breakpoints.map((breakpoint) => {
            const Icon = breakpointIcons[breakpoint.name] || Monitor;
            const isActive = project.currentBreakpoint === breakpoint.name;
            
            return (
              <button
                key={breakpoint.name}
                onClick={() => handleBreakpointChange(breakpoint.name)}
                className={`px-2 py-1 text-xs font-medium rounded flex items-center gap-1 transition-colors ${
                  isActive
                    ? 'bg-white shadow-sm border border-gray-200 text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                data-testid={`button-breakpoint-${breakpoint.name}`}
                title={`${breakpoint.label} (${breakpoint.width}px)`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden md:inline text-xs">{breakpoint.label}</span>
              </button>
            );
          })}
        </div>
        

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1" data-testid="zoom-controls">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            className="p-2 hover:bg-white hover:shadow-sm"
            data-testid="button-zoom-out"
            title="Zoom Out"
          >
            <Minus className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFitToScreen}
            className="p-2 hover:bg-white hover:shadow-sm"
            data-testid="button-fit-screen"
            title="Fit to Screen"
          >
            <Maximize className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            className="p-2 hover:bg-white hover:shadow-sm"
            data-testid="button-zoom-in"
            title="Zoom In"
          >
            <Plus className="w-3 h-3" />
          </Button>
        </div>

        {/* Import Tools - Hidden for now */}
        {/* <WebsiteImport /> */}

        {/* Advanced Tools */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1" data-testid="advanced-tools">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenClassEditor}
            className="p-2 hover:bg-white hover:shadow-sm text-gray-600"
            data-testid="button-open-class-editor"
            title="Open Class Editor"
          >
            <Palette className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenComponentEditor}
            className="p-2 hover:bg-white hover:shadow-sm text-gray-600"
            data-testid="button-open-component-editor"
            title="Open Component Editor"
          >
            <Component className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenButtonDesigner}
            className="p-2 hover:bg-white hover:shadow-sm text-gray-600"
            data-testid="button-open-button-designer"
            title="Button Designer & States"
          >
            <MousePointer2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2" data-testid="action-buttons">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePreview}
            className="p-2 hover:bg-gray-100"
            data-testid="button-preview"
            title={t('canvas.preview')}
          >
            <Eye className="w-4 h-4" />
          </Button>
          
          {/* Undo/Redo Controls with History Management */}
          <UndoRedoControls />
          
          {/* Color Mode Toggle */}
          <ColorModeToggle />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCSSOptimization}
            className="p-2 hover:bg-gray-100"
            data-testid="button-css-optimization"
            title="CSS Optimization"
          >
            <Zap className="w-4 h-4" />
          </Button>
          
          {/* Language Switcher */}
          <LanguageSwitcher />
          
          <Button
            onClick={handleExport}
            size="sm"
            className="bg-primary text-white hover:bg-blue-600"
            data-testid="button-export"
            title={t('common.export')}
          >
            <Download className="w-4 h-4 mr-2" />
            {t('common.export')}
          </Button>
        </div>
      </div>
      
      {/* Settings Menu */}
      <SettingsMenu />
    </header>
  );
};

export default Header;
