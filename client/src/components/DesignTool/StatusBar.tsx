import React from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { RootState } from '../../store';
import { selectCanvasProject, selectUIState, selectCurrentElements } from '../../store/selectors';
import { MousePointer, Layers, Smartphone } from 'lucide-react';
import PersistenceStatus from '../PersistenceStatus';
import { ServiceWorkerStatus } from '../ServiceWorkerStatus';

const StatusBar: React.FC = () => {
  const { t } = useTranslation();
  const project = useSelector(selectCanvasProject);
  const { selectedTool } = useSelector(selectUIState);

  // Use memoized selector for current elements
  const currentElements = useSelector(selectCurrentElements);

  // Count only non-root elements to give users a meaningful count
  const elementCount = Object.keys(currentElements).filter(id => id !== 'root').length;
  const rootElement = currentElements.root;
  const currentBreakpoint = project.breakpoints[project.currentBreakpoint];

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

      {/* Current Breakpoint */}
      <div className="flex items-center gap-1" data-testid="status-breakpoint">
        <span>
          {project.currentBreakpoint ? (
            project.currentBreakpoint.charAt(0).toUpperCase() + project.currentBreakpoint.slice(1)
          ) : t('statusBar.mobile')}
          ({currentBreakpoint?.width || 0}px)
        </span>
      </div>

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
