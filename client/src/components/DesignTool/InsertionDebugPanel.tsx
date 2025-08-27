import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';

/**
 * Debug panel to verify insertion feedback matches actual behavior
 * Shows the current insertion zone and validates the predictable insertion logic
 */
const InsertionDebugPanel: React.FC = () => {
  const hoveredElementId = useSelector((state: RootState) => state.canvas.ui.hoveredElementId);
  const hoveredZone = useSelector((state: RootState) => state.canvas.ui.hoveredZone);
  
  if (!hoveredElementId || !hoveredZone) {
    return null;
  }
  
  return (
    <div className="fixed top-16 left-4 bg-black/80 text-white p-3 rounded-lg font-mono text-sm z-[9999] max-w-xs">
      <div className="text-green-400 font-semibold mb-2">Insertion Preview</div>
      <div className="space-y-1">
        <div>
          <span className="text-gray-400">Target:</span> {hoveredElementId}
        </div>
        <div>
          <span className="text-gray-400">Zone:</span> 
          <span className={`ml-1 px-1 rounded ${
            hoveredZone === 'inside' ? 'bg-blue-600' :
            hoveredZone === 'before' ? 'bg-green-600' :
            hoveredZone === 'after' ? 'bg-green-600' :
            'bg-gray-600'
          }`}>
            {hoveredZone}
          </span>
        </div>
        <div className="text-xs text-gray-400 mt-2">
          {hoveredZone === 'inside' && '🔵 Blue highlight = Insert inside container'}
          {hoveredZone === 'before' && '🟢 Green line = Insert before element'}
          {hoveredZone === 'after' && '🟢 Green line = Insert after element'}
        </div>
      </div>
    </div>
  );
};

export default InsertionDebugPanel;