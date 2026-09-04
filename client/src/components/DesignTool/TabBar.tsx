import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ChevronDown, Copy, Layers3, Plus, Trash2 } from 'lucide-react';
import { createTab, deleteTab, duplicateTab, switchTab } from '../../store/canvasSlice';
import { selectCanvasProject } from '../../store/selectors';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const TabBar: React.FC = () => {
  const dispatch = useDispatch();
  const project = useSelector(selectCanvasProject);
  const activeTab = project.tabs?.[project.activeTabId];

  const handleCreate = useCallback(() => {
    dispatch(createTab({ name: 'New page' }));
  }, [dispatch]);

  if (!project.tabs || Object.keys(project.tabs).length === 0) return null;

  return (
    <div className="framly-page-controls">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="framly-page-switcher" data-testid="page-switcher">
          <Layers3 className="h-3.5 w-3.5" />
          <span className="max-w-28 truncate">{activeTab?.name ?? 'Page'}</span>
          <ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="framly-menu w-56">
        <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Pages</div>
        {project.tabOrder.map((tabId) => {
          const tab = project.tabs[tabId];
          if (!tab) return null;
          return (
            <DropdownMenuItem
              key={tabId}
              onClick={() => dispatch(switchTab(tabId))}
              className={project.activeTabId === tabId ? 'bg-accent' : ''}
            >
              <span className="flex-1 truncate">{tab.name}</span>
              {project.activeTabId === tabId && <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Current</span>}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCreate} data-testid="menu-create-tab"><Plus className="mr-2 h-4 w-4" />New page</DropdownMenuItem>
        {activeTab && (
          <DropdownMenuItem onClick={() => dispatch(duplicateTab(activeTab.id))} data-testid={`menu-duplicate-tab-${activeTab.id}`}>
            <Copy className="mr-2 h-4 w-4" />Duplicate page
          </DropdownMenuItem>
        )}
        {activeTab && project.tabOrder.length > 1 && (
          <DropdownMenuItem onClick={() => dispatch(deleteTab(activeTab.id))} data-testid={`menu-delete-tab-${activeTab.id}`} className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />Delete page
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
    <button className="framly-add-page" onClick={handleCreate} data-testid="button-create-tab" aria-label="Create new page">
      <Plus className="h-3.5 w-3.5" />
    </button>
    </div>
  );
};

export default TabBar;
