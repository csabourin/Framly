import React from 'react';
import { useSelector } from 'react-redux';
import { Button } from '../ui/button';
import { Undo, Redo } from 'lucide-react';
import { RootState } from '../../store';
import { selectCanUndo, selectCanRedo, selectHistoryStats } from '../../store/historySlice';
import { historyManager } from '../../utils/historyManager';

const UndoRedoControls: React.FC = () => {
  const canUndo = useSelector(selectCanUndo);
  const canRedo = useSelector(selectCanRedo);
  const historyStats = useSelector(selectHistoryStats);

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
        title={`Undo (Ctrl+Z) - ${historyStats.totalEntries} actions in history`}
        className="h-8 w-8 p-0"
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
        className="h-8 w-8 p-0"
        data-testid="button-redo"
      >
        <Redo className="h-4 w-4" />
      </Button>
      
      {/* History stats for debugging */}
      {import.meta.env.DEV && (
        <span className="text-xs text-gray-500 ml-2">
          {historyStats.currentIndex + 1}/{historyStats.totalEntries}
        </span>
      )}
    </div>
  );
};

export default UndoRedoControls;