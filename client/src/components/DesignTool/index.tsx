import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { useSelector, useDispatch } from 'react-redux';
import { store, RootState } from '../../store';
import { setClassEditorOpen, setComponentEditorOpen, setEditingComponent, setButtonDesignerOpen } from '../../store/uiSlice';
import { historyManager } from '../../utils/historyManager';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
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
import ButtonDesigner from './ButtonDesigner';

const DesignToolContent: React.FC = () => {
  // Initialize keyboard shortcuts
  useKeyboardShortcuts();
  
  // Initialize history manager and tracking
  useEffect(() => {
    historyManager.init();
    
    // Initialize history tracking
    import('../../utils/historyIntegration').then(({ addHistoryMiddleware }) => {
      addHistoryMiddleware();
    });
  }, []);
  const dispatch = useDispatch();
  const { 
    isComponentPanelVisible, 
    isDOMTreePanelVisible, 
    isClassEditorOpen, 
    isComponentEditorOpen, 
    editingComponentId,
    isButtonDesignerOpen
  } = useSelector((state: RootState) => state.ui);

  const handleCloseClassEditor = () => {
    dispatch(setClassEditorOpen(false));
  };

  const handleCloseComponentEditor = () => {
    dispatch(setComponentEditorOpen(false));
    dispatch(setEditingComponent(null));
  };

  const handleCloseButtonDesigner = () => {
    dispatch(setButtonDesignerOpen(false));
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
      
      {/* Button Designer */}
      <ButtonDesigner 
        isOpen={isButtonDesignerOpen}
        onClose={handleCloseButtonDesigner}
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
