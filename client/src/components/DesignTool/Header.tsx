import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { RootState } from '../../store';
import { selectCanvasProject, selectExportModalState, selectUIState } from '../../store/selectors';
import { updateProjectName } from '../../store/canvasSlice';
import {
  setExportModalOpen,
  setCodeModalOpen,
  setCSSOptimizationModalOpen,
  zoomIn,
  zoomOut,
  fitToScreen,
  setZoomLevel,
  setClassEditorOpen,
  setComponentEditorOpen,
  setButtonDesignerOpen,
  setSettingsMenuOpen,
  toggleDOMTreePanel,
  setWorkspaceLayout
} from '../../store/uiSlice';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Eye, Undo, Redo, Download, Settings, Plus, Minus, Maximize, Zap, List, Palette, Component, MousePointer2, Wrench, MoreHorizontal, LayoutGrid, Minimize2, Code2, Layers } from 'lucide-react';
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
  const { isExportModalOpen, isDOMTreePanelVisible, zoomLevel, workspaceLayout } = useSelector((state: RootState) => ({
    ...selectExportModalState(state),
    isDOMTreePanelVisible: selectUIState(state).isDOMTreePanelVisible,
    zoomLevel: selectUIState(state).zoomLevel,
    workspaceLayout: selectUIState(state).workspaceLayout
  }));


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

  const handleWorkspaceLayoutChange = (layout: 'minimal' | 'designer' | 'developer') => {
    dispatch(setWorkspaceLayout(layout));
  };

  return (
    <header
      className="absolute top-0 left-0 right-0 h-12 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200/60 dark:border-gray-700/60 flex items-center px-4 z-50 gap-3 shadow-sm"
      data-testid="header-main"
    >
      {/* Logo & Core Controls */}
      <div className="flex items-center gap-2" data-testid="logo-container">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
            <Component className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg text-gray-900 dark:text-gray-100 tracking-tight">Framly</span>
        </div>
        <button
          onClick={handleOpenSettings}
          className="w-8 h-8 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors"
          data-testid="settings-button"
          title="Settings"
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

        {/* Workspace Layout Presets */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${workspaceLayout !== 'custom'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              data-testid="workspace-layout-menu"
              title="Workspace Layout"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem
              onClick={() => handleWorkspaceLayoutChange('minimal')}
              className={workspaceLayout === 'minimal' ? 'bg-accent text-accent-foreground font-medium' : ''}
              data-testid="layout-minimal"
            >
              <Minimize2 className="w-4 h-4 mr-2" />
              <div className="flex flex-col">
                <span>Minimal</span>
                <span className="text-xs text-muted-foreground">Focus on canvas</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleWorkspaceLayoutChange('designer')}
              className={workspaceLayout === 'designer' ? 'bg-accent text-accent-foreground font-medium' : ''}
              data-testid="layout-designer"
            >
              <Palette className="w-4 h-4 mr-2" />
              <div className="flex flex-col">
                <span>Designer</span>
                <span className="text-xs text-muted-foreground">Properties panel</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleWorkspaceLayoutChange('developer')}
              className={workspaceLayout === 'developer' ? 'bg-accent text-accent-foreground font-medium' : ''}
              data-testid="layout-developer"
            >
              <Code2 className="w-4 h-4 mr-2" />
              <div className="flex flex-col">
                <span>Developer</span>
                <span className="text-xs text-muted-foreground">All panels</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Project Info */}
      <div className="flex items-center gap-2" data-testid="project-info">
        <div className="h-4 w-px bg-gray-300/50 dark:bg-gray-600/50" />
        <input
          type="text"
          value={project.name}
          onChange={(e) => dispatch(updateProjectName(e.target.value))}
          className="bg-transparent border-none outline-none font-semibold text-gray-800 dark:text-gray-200 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 px-2 py-1 rounded-md transition-colors focus:bg-gray-50 dark:focus:bg-gray-800 focus:ring-2 focus:ring-blue-500/30"
          data-testid="input-project-name"
          placeholder="Untitled Project"
        />
      </div>

      {/* Header Actions */}
      <div className="ml-auto flex items-center gap-2" data-testid="header-actions">
        {/* Zoom Control */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors min-w-[70px]"
              data-testid="zoom-control"
              title="Zoom Level"
            >
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {Math.round(zoomLevel * 100)}%
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={handleZoomOut} data-testid="menu-zoom-out">
              <Minus className="w-4 h-4 mr-2" />
              <span>Zoom Out</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleZoomIn} data-testid="menu-zoom-in">
              <Plus className="w-4 h-4 mr-2" />
              <span>Zoom In</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleFitToScreen} data-testid="menu-fit-screen">
              <Maximize className="w-4 h-4 mr-2" />
              <span>Fit to Screen</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => dispatch(setZoomLevel(0.5))}>
              <span className="ml-6">50%</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => dispatch(setZoomLevel(0.75))}>
              <span className="ml-6">75%</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => dispatch(setZoomLevel(1))}>
              <span className="ml-6">100%</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => dispatch(setZoomLevel(1.25))}>
              <span className="ml-6">125%</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => dispatch(setZoomLevel(1.5))}>
              <span className="ml-6">150%</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => dispatch(setZoomLevel(2))}>
              <span className="ml-6">200%</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Advanced Tools Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              data-testid="advanced-tools-menu"
              title="Advanced Tools"
            >
              <Wrench className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={handleOpenClassEditor} data-testid="menu-class-editor">
              <Palette className="w-4 h-4 mr-2" />
              <span>Class Editor</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleOpenComponentEditor} data-testid="menu-component-editor">
              <Component className="w-4 h-4 mr-2" />
              <span>Component Editor</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleOpenButtonDesigner} data-testid="menu-button-designer">
              <MousePointer2 className="w-4 h-4 mr-2" />
              <span>Button Designer</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5" data-testid="action-buttons">
          <div className="h-4 w-px bg-gray-300/50 dark:bg-gray-600/50 mx-1" />

          <Button
            variant="ghost"
            size="sm"
            onClick={handlePreview}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            data-testid="button-preview"
            title={t('canvas.preview')}
          >
            <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </Button>

          {/* Undo/Redo Controls with History Management */}
          <UndoRedoControls />

          {/* More Menu - Secondary Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                data-testid="more-menu"
                title="More Options"
              >
                <MoreHorizontal className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handleCSSOptimization} data-testid="menu-css-optimization">
                <Zap className="w-4 h-4 mr-2" />
                <span>CSS Optimization</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-4 w-px bg-gray-300/50 dark:bg-gray-600/50 mx-0.5" />

          {/* Color Mode Toggle */}
          <ColorModeToggle />

          {/* Language Switcher */}
          <LanguageSwitcher />

          <div className="h-4 w-px bg-gray-300/50 dark:bg-gray-600/50 mx-1" />

          <Button
            onClick={handleExport}
            size="sm"
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-md hover:shadow-lg transition-all duration-200 px-3 py-1.5 h-8"
            data-testid="button-export"
            title={t('common.export')}
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            <span className="font-medium text-sm">{t('common.export')}</span>
          </Button>
        </div>
      </div>

      {/* Settings Menu */}
      <SettingsMenu />
    </header>
  );
};

export default Header;
