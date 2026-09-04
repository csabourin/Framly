import React from 'react';
import { useSelector } from 'react-redux';
import { Button } from '../ui/button';
import { Undo, Redo } from 'lucide-react';
import { selectCanUndo, selectCanRedo } from '../../store/historySlice';
import { historyManager } from '../../utils/historyManager';

const UndoRedoControls: React.FC = () => {
  const canUndo = useSelector(selectCanUndo);
  const canRedo = useSelector(selectCanRedo);

  const handleUndo = () => {
    historyManager.performUndo();
  };

  const handleRedo = () => {
    historyManager.performRedo();
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleUndo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
        className="framly-icon-button"
        data-testid="button-undo"
      >
        <Undo className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRedo}
        disabled={!canRedo}
        title="Redo (Ctrl+Shift+Z or Ctrl+Y)"
        className="framly-icon-button"
        data-testid="button-redo"
      >
        <Redo className="h-4 w-4" />
      </Button>
      
    </div>
  );
};

export default UndoRedoControls;
