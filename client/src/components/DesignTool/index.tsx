import React from 'react';
import { Provider } from 'react-redux';
import { useSelector } from 'react-redux';
import { store, RootState } from '../../store';
import Header from './Header';
import Toolbar from './Toolbar';
import Canvas from './Canvas';
import PropertiesPanel from './PropertiesPanel';
import ComponentPanel from './ComponentPanel';
import DOMTreePanel from './DOMTreePanel';
import CreateComponentModal from './CreateComponentModal';
import StatusBar from './StatusBar';
import ExportModal from './ExportModal';
import CodeModal from './CodeModal';
import CSSOptimizationModal from './CSSOptimizationModal';

const DesignToolContent: React.FC = () => {
  const { isComponentPanelVisible, isDOMTreePanelVisible } = useSelector((state: RootState) => state.ui);

  return (
    <div className="flex h-screen relative bg-gray-50 font-inter overflow-hidden">
      <Header />
      <Toolbar />
      {isDOMTreePanelVisible && <DOMTreePanel />}
      <Canvas />
      {isComponentPanelVisible && <ComponentPanel />}
      <PropertiesPanel />
      <StatusBar />
      <ExportModal />
      <CodeModal />
      <CSSOptimizationModal />
      <CreateComponentModal />
    </div>
  );
};

const DesignTool: React.FC = () => {
  return (
    <Provider store={store}>
      <DesignToolContent />
    </Provider>
  );
};

export default DesignTool;
