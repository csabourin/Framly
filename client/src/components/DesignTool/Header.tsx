import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { switchBreakpoint, undo, redo, updateProjectName } from '../../store/canvasSlice';
import { setExportModalOpen, setCodeModalOpen, zoomIn, zoomOut, fitToScreen } from '../../store/uiSlice';
import { Button } from '@/components/ui/button';
import { Eye, Undo, Redo, Download, Smartphone, Laptop, Monitor, Settings, Plus, Minus, Maximize } from 'lucide-react';

const Header: React.FC = () => {
  const dispatch = useDispatch();
  const { project } = useSelector((state: RootState) => state.canvas);
  const { isExportModalOpen } = useSelector((state: RootState) => state.ui);

  const breakpoints = [
    { name: 'mobile', width: 375, icon: Smartphone, label: 'Mobile' },
    { name: 'desktop', width: 768, icon: Laptop, label: 'Desktop' },
    { name: 'large', width: 1024, icon: Monitor, label: 'Large' },
  ];

  const handleBreakpointChange = (breakpointName: string) => {
    dispatch(switchBreakpoint(breakpointName));
  };

  const handleUndo = () => {
    dispatch(undo());
  };

  const handleRedo = () => {
    dispatch(redo());
  };

  const handlePreview = () => {
    dispatch(setCodeModalOpen(true));
  };

  const handleExport = () => {
    dispatch(setExportModalOpen(true));
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

  return (
    <header 
      className="absolute top-0 left-0 right-0 h-12 bg-white border-b border-gray-200 flex items-center px-4 z-50 gap-4"
      data-testid="header-main"
    >
      {/* Logo */}
      <div className="flex items-center gap-2" data-testid="logo-container">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <Settings className="w-4 h-4 text-white" />
        </div>
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
        <span className="text-green-600 flex items-center gap-1">
          <div className="w-2 h-2 bg-green-600 rounded-full"></div>
          Saved
        </span>
      </div>
      
      {/* Header Actions */}
      <div className="ml-auto flex items-center gap-2" data-testid="header-actions">
        {/* Breakpoint Switcher */}
        <div className="flex bg-gray-100 rounded-lg p-1" data-testid="breakpoint-switcher">
          {breakpoints.map((breakpoint) => {
            const Icon = breakpoint.icon;
            const isActive = project.currentBreakpoint === breakpoint.name;
            
            return (
              <button
                key={breakpoint.name}
                onClick={() => handleBreakpointChange(breakpoint.name)}
                className={`px-3 py-1 text-sm font-medium rounded flex items-center gap-1 transition-colors ${
                  isActive
                    ? 'bg-white shadow-sm border border-gray-200 text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                data-testid={`button-breakpoint-${breakpoint.name}`}
              >
                <Icon className="w-3 h-3" />
                {breakpoint.label}
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

        {/* Action Buttons */}
        <div className="flex items-center gap-2" data-testid="action-buttons">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePreview}
            className="p-2 hover:bg-gray-100"
            data-testid="button-preview"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            className="p-2 hover:bg-gray-100"
            data-testid="button-undo"
          >
            <Undo className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRedo}
            className="p-2 hover:bg-gray-100"
            data-testid="button-redo"
          >
            <Redo className="w-4 h-4" />
          </Button>
          <Button
            onClick={handleExport}
            size="sm"
            className="bg-primary text-white hover:bg-blue-600"
            data-testid="button-export"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
