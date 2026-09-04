import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectUIState } from '../../store/selectors';
import { setRightPanelTab } from '../../store/uiSlice';
import { SlidersHorizontal, Package } from 'lucide-react';
import PropertiesPanel from './PropertiesPanel';
import ComponentPanel from './ComponentPanel';

type RightPanelTab = 'properties' | 'components';

const RightPanel: React.FC = () => {
  const dispatch = useDispatch();
  const { rightPanelTab = 'properties' } = useSelector(selectUIState);

  const tabs: Array<{ id: RightPanelTab; icon: React.ComponentType<any>; label: string; shortcut: string }> = [
    { id: 'properties', icon: SlidersHorizontal, label: 'Inspect', shortcut: 'P' },
    { id: 'components', icon: Package, label: 'Components', shortcut: 'C' },
  ];

  return (
    <aside
      className="framly-right-panel"
      data-testid="right-panel"
      aria-label="Right panel"
    >
      {/* Tab Bar */}
      <div className="framly-panel-tabs" role="tablist">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = rightPanelTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => dispatch(setRightPanelTab(tab.id))}
              className={isActive ? 'is-active' : ''}
              data-testid={`tab-${tab.id}`}
              title={`${tab.label} (${tab.shortcut})`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
            >
              <Icon className="w-3.5 h-3.5" />
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
