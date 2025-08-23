import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { selectOpenComponentTabs, selectActiveComponentTab } from '../../store/selectors';
import { setActiveComponentTab, closeComponentTab } from '../../store/componentDefinitionsSlice';
import ComponentEditorTab from './ComponentEditorTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { X } from 'lucide-react';

/**
 * Tabbed interface for editing multiple components simultaneously
 */
const ComponentTabbedEditor: React.FC = () => {
  const dispatch = useDispatch();
  const openTabs = useSelector(selectOpenComponentTabs);
  const activeTab = useSelector(selectActiveComponentTab);

  if (openTabs.length === 0) {
    return null;
  }

  const handleTabChange = (componentId: string) => {
    dispatch(setActiveComponentTab(componentId));
  };

  const handleCloseTab = (componentId: string) => {
    dispatch(closeComponentTab(componentId));
  };

  return (
    <div className="component-tabbed-editor fixed inset-0 z-50 bg-white flex flex-col">
      {/* Tab Bar */}
      <div className="component-tab-bar flex items-center border-b bg-gray-50 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Component Editor</span>
          <div className="w-px h-4 bg-gray-300" />
        </div>
        
        <Tabs 
          value={activeTab || openTabs[0]} 
          onValueChange={handleTabChange}
          className="flex-1"
        >
          <TabsList className="h-auto bg-transparent p-0 gap-1">
            {openTabs.map((componentId) => (
              <div key={componentId} className="flex items-center bg-white border rounded-lg">
                <TabsTrigger
                  value={componentId}
                  className="px-3 py-1.5 text-xs data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 border-none"
                  data-testid={`component-tab-${componentId}`}
                >
                  Component {componentId.slice(0, 8)}...
                </TabsTrigger>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseTab(componentId);
                  }}
                  className="h-6 w-6 p-0 ml-1 mr-1 hover:bg-gray-100"
                  data-testid={`close-tab-${componentId}`}
                >
                  <X size={10} />
                </Button>
              </div>
            ))}
          </TabsList>

          {/* Tab Content */}
          <div className="flex-1 mt-0">
            {openTabs.map((componentId) => (
              <TabsContent
                key={componentId}
                value={componentId}
                className="mt-0 h-full data-[state=inactive]:hidden"
              >
                <ComponentEditorTab
                  componentId={componentId}
                  isActive={activeTab === componentId}
                  onClose={handleCloseTab}
                />
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default ComponentTabbedEditor;