import React from 'react';
import { Provider } from 'react-redux';
import { useSelector, useDispatch } from 'react-redux';
import { store, RootState } from '../../store';
import { setClassEditorOpen, setComponentEditorOpen, setEditingComponent } from '../../store/uiSlice';
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
import ClassEditor from './ClassEditor';
import ComponentEditor from './ComponentEditor';

const DesignToolContent: React.FC = () => {
  const dispatch = useDispatch();
  const { 
    isComponentPanelVisible, 
    isDOMTreePanelVisible, 
    isClassEditorOpen, 
    isComponentEditorOpen, 
    editingComponentId 
  } = useSelector((state: RootState) => state.ui);

  const handleCloseClassEditor = () => {
    dispatch(setClassEditorOpen(false));
  };

  const handleCloseComponentEditor = () => {
    dispatch(setComponentEditorOpen(false));
    dispatch(setEditingComponent(null));
  };

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
      
      {/* Class Editor */}
      <ClassEditor 
        isOpen={isClassEditorOpen}
        onClose={handleCloseClassEditor}
      />
      
      {/* Component Editor */}
      <ComponentEditor 
        isOpen={isComponentEditorOpen}
        componentId={editingComponentId}
        onClose={handleCloseComponentEditor}
      />
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
