import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { MousePointer, Layers, Smartphone } from 'lucide-react';
import PersistenceStatus from '../PersistenceStatus';

const StatusBar: React.FC = () => {
  const { project } = useSelector((state: RootState) => state.canvas);
  const { selectedTool } = useSelector((state: RootState) => state.ui);

  const elementCount = Object.keys(project.elements).length;
  const rootElement = project.elements.root;
  const currentBreakpoint = project.breakpoints[project.currentBreakpoint];

  const getToolDisplay = () => {
    switch (selectedTool) {
      case 'select':
        return 'Selection Tool';
      case 'hand':
        return 'Hand Tool';
      case 'rectangle':
        return 'Rectangle Tool';
      case 'text':
        return 'Text Tool';
      case 'image':
        return 'Image Tool';
      case 'split-horizontal':
        return 'Split Horizontal';
      case 'split-vertical':
        return 'Split Vertical';
      case 'merge':
        return 'Merge Tool';
      default:
        return 'Unknown Tool';
    }
  };

  return (
    <footer 
      className="absolute bottom-0 left-0 right-0 h-8 bg-white border-t border-gray-200 flex items-center px-4 text-xs text-gray-600 z-50 gap-4"
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
        <span>{elementCount} Elements</span>
      </div>
      
      {/* Current Breakpoint */}
      <div className="flex items-center gap-1" data-testid="status-breakpoint">
        <span>
          {project.currentBreakpoint.charAt(0).toUpperCase() + project.currentBreakpoint.slice(1)} 
          ({currentBreakpoint?.width || 0}px)
        </span>
      </div>
      
      {/* Persistence Status */}
      <div className="ml-auto" data-testid="status-persistence">
        <PersistenceStatus />
      </div>
    </footer>
  );
};

export default StatusBar;
