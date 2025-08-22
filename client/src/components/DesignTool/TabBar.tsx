import React, { useState, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { 
  switchTab, 
  createTab, 
  duplicateTab, 
  deleteTab, 
  renameTab, 
  setTabColor, 
  reorderTabs 
} from '../../store/canvasSlice';
import { Plus, MoreHorizontal, X, Edit2, Copy, Trash2 } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

interface TabItemProps {
  tabId: string;
  tab: {
    id: string;
    name: string;
    color?: string;
    updatedAt: number;
  };
  isActive: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
  onSetColor: (color?: string) => void;
}

const TAB_COLORS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#10b981' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Orange', value: '#f59e0b' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Pink', value: '#ec4899' },
];

const TabItem: React.FC<TabItemProps> = ({ 
  tabId, 
  tab, 
  isActive, 
  onSelect, 
  onDuplicate, 
  onDelete, 
  onRename, 
  onSetColor 
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renamingValue, setRenamingValue] = useState(tab.name);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const handleStartRename = () => {
    setIsRenaming(true);
    setRenamingValue(tab.name);
    setTimeout(() => renameInputRef.current?.focus(), 0);
  };

  const handleFinishRename = () => {
    if (renamingValue.trim() && renamingValue !== tab.name) {
      onRename(renamingValue.trim());
    }
    setIsRenaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFinishRename();
    } else if (e.key === 'Escape') {
      setIsRenaming(false);
      setRenamingValue(tab.name);
    }
  };

  return (
    <div
      className={`
        flex items-center gap-1 px-3 py-2 rounded-t-lg border border-b-0 cursor-pointer
        transition-all duration-200 group relative max-w-48
        ${isActive 
          ? 'bg-white border-gray-300 shadow-sm z-10' 
          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
        }
      `}
      onClick={onSelect}
      style={{
        borderBottomColor: isActive ? 'white' : 'transparent',
      }}
    >
      {/* Tab color indicator */}
      {tab.color && (
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: tab.color }}
        />
      )}
      
      {/* Tab name */}
      <div className="flex-1 min-w-0">
        {isRenaming ? (
          <input
            ref={renameInputRef}
            type="text"
            value={renamingValue}
            onChange={(e) => setRenamingValue(e.target.value)}
            onBlur={handleFinishRename}
            onKeyDown={handleKeyDown}
            className="w-full px-1 py-0 text-sm bg-transparent border-none outline-none"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="text-sm font-medium truncate block">
            {tab.name}
          </span>
        )}
      </div>

      {/* Close button - only show on active tab or hover */}
      {(isActive || dropdownOpen) && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-opacity"
          data-testid={`button-close-tab-${tabId}`}
        >
          <X size={12} />
        </button>
      )}

      {/* Actions dropdown */}
      <DropdownMenu.Root open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenu.Trigger asChild>
          <button
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-opacity"
            onClick={(e) => e.stopPropagation()}
            data-testid={`button-tab-actions-${tabId}`}
          >
            <MoreHorizontal size={12} />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content 
            className="bg-white rounded-lg shadow-lg border border-gray-200 p-1 z-50 min-w-48"
            side="bottom"
            align="end"
          >
            <DropdownMenu.Item
              className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer rounded hover:bg-gray-50"
              onClick={handleStartRename}
              data-testid={`menu-rename-tab-${tabId}`}
            >
              <Edit2 size={14} />
              Rename Tab
            </DropdownMenu.Item>

            <DropdownMenu.Item
              className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer rounded hover:bg-gray-50"
              onClick={onDuplicate}
              data-testid={`menu-duplicate-tab-${tabId}`}
            >
              <Copy size={14} />
              Duplicate Tab
            </DropdownMenu.Item>

            <DropdownMenu.Separator className="h-px bg-gray-200 my-1" />

            <DropdownMenu.Sub>
              <DropdownMenu.SubTrigger className="flex items-center justify-between px-3 py-2 text-sm cursor-pointer rounded hover:bg-gray-50">
                Set Color
                <div className="flex items-center gap-1">
                  {tab.color && (
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tab.color }}
                    />
                  )}
                </div>
              </DropdownMenu.SubTrigger>
              <DropdownMenu.Portal>
                <DropdownMenu.SubContent 
                  className="bg-white rounded-lg shadow-lg border border-gray-200 p-1 z-50"
                  sideOffset={8}
                >
                  <DropdownMenu.Item
                    className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer rounded hover:bg-gray-50"
                    onClick={() => onSetColor(undefined)}
                  >
                    No Color
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="h-px bg-gray-200 my-1" />
                  {TAB_COLORS.map((color) => (
                    <DropdownMenu.Item
                      key={color.value}
                      className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer rounded hover:bg-gray-50"
                      onClick={() => onSetColor(color.value)}
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: color.value }}
                      />
                      {color.name}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.SubContent>
              </DropdownMenu.Portal>
            </DropdownMenu.Sub>

            <DropdownMenu.Separator className="h-px bg-gray-200 my-1" />

            <DropdownMenu.Item
              className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer rounded hover:bg-red-50 text-red-600"
              onClick={onDelete}
              data-testid={`menu-delete-tab-${tabId}`}
            >
              <Trash2 size={14} />
              Delete Tab
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
};

const TabBar: React.FC = () => {
  const dispatch = useDispatch();
  const { project } = useSelector((state: RootState) => state.canvas);

  const handleCreateTab = useCallback(() => {
    dispatch(createTab({ name: 'New Tab' }));
  }, [dispatch]);

  const handleSwitchTab = useCallback((tabId: string) => {
    dispatch(switchTab(tabId));
  }, [dispatch]);

  const handleDuplicateTab = useCallback((tabId: string) => {
    dispatch(duplicateTab(tabId));
  }, [dispatch]);

  const handleDeleteTab = useCallback((tabId: string) => {
    if (Object.keys(project.tabs).length > 1) {
      dispatch(deleteTab(tabId));
    }
  }, [dispatch, project.tabs]);

  const handleRenameTab = useCallback((tabId: string, name: string) => {
    dispatch(renameTab({ tabId, name }));
  }, [dispatch]);

  const handleSetTabColor = useCallback((tabId: string, color?: string) => {
    dispatch(setTabColor({ tabId, color }));
  }, [dispatch]);

  // Always show at least one tab - if none exist, create one
  if (!project.tabs || Object.keys(project.tabs).length === 0) {
    // Create default tab if none exist
    const defaultTabId = 'main-tab';
    dispatch(createTab({ name: 'Main' }));
    return null; // Will re-render after dispatch
  }

  return (
    <div className="flex items-end gap-1 bg-gray-100 px-4 pt-2 pb-0 border-b border-gray-200 min-h-[40px]">
      {/* Tab items */}
      {project.tabOrder.map((tabId) => {
        const tab = project.tabs[tabId];
        if (!tab) return null;

        return (
          <TabItem
            key={tabId}
            tabId={tabId}
            tab={tab}
            isActive={project.activeTabId === tabId}
            onSelect={() => handleSwitchTab(tabId)}
            onDuplicate={() => handleDuplicateTab(tabId)}
            onDelete={() => handleDeleteTab(tabId)}
            onRename={(name) => handleRenameTab(tabId, name)}
            onSetColor={(color) => handleSetTabColor(tabId, color)}
          />
        );
      })}

      {/* Add new tab button */}
      <button
        onClick={handleCreateTab}
        className="flex items-center justify-center w-8 h-8 rounded-t-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 border-b-0 transition-colors"
        data-testid="button-create-tab"
        title="Create New Tab"
      >
        <Plus size={14} />
      </button>
    </div>
  );
};

export default TabBar;