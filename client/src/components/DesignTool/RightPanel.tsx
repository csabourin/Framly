import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectUIState } from '../../store/selectors';
import { setRightPanelTab } from '../../store/uiSlice';
import { Settings, Package } from 'lucide-react';
import PropertiesPanel from './PropertiesPanel';
import ComponentPanel from './ComponentPanel';

type RightPanelTab = 'properties' | 'components';

const RightPanel: React.FC = () => {
  const dispatch = useDispatch();
  const { rightPanelTab = 'properties' } = useSelector(selectUIState);

  const tabs: Array<{ id: RightPanelTab; icon: React.ComponentType<any>; label: string; shortcut: string }> = [
    { id: 'properties', icon: Settings, label: 'Properties', shortcut: 'P' },
    { id: 'components', icon: Package, label: 'Components', shortcut: 'C' },
  ];

  return (
    <aside
      className="absolute right-0 top-12 bottom-0 w-80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-l border-gray-200/60 dark:border-gray-700/60 z-40 shadow-lg flex flex-col"
      data-testid="right-panel"
      aria-label="Right panel"
    >
      {/* Tab Bar */}
      <div className="flex border-b border-gray-200/60 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/50" role="tablist">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = rightPanelTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => dispatch(setRightPanelTab(tab.id))}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100/50 dark:hover:bg-gray-800/50'
              }`}
              data-testid={`tab-${tab.id}`}
              title={`${tab.label} (${tab.shortcut})`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div
        className="flex-1 overflow-y-auto relative"
        role="tabpanel"
        id={`panel-${rightPanelTab}`}
        aria-labelledby={`tab-${rightPanelTab}`}
      >
        {rightPanelTab === 'properties' ? (
          <PropertiesPanel />
        ) : (
          <ComponentPanel />
        )}
      </div>
    </aside>
  );
};

export default RightPanel;
