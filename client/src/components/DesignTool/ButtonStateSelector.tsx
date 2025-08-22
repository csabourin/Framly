import React from 'react';
import { Button } from '../ui/button';

interface ButtonStateSelectorProps {
  currentState: string;
  onStateChange: (state: string) => void;
}

const ButtonStateSelector: React.FC<ButtonStateSelectorProps> = ({ 
  currentState, 
  onStateChange 
}) => {
  const states = [
    { id: 'default', label: 'Default', color: 'bg-blue-500' },
    { id: 'hover', label: 'Hover', color: 'bg-purple-500' },
    { id: 'active', label: 'Active', color: 'bg-green-500' },
    { id: 'focus', label: 'Focus', color: 'bg-yellow-500' },
    { id: 'disabled', label: 'Disabled', color: 'bg-gray-400' }
  ];

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">Button State</label>
      <div className="flex flex-wrap gap-1">
        {states.map((state) => (
          <Button
            key={state.id}
            variant={currentState === state.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => onStateChange(state.id)}
            className={`text-xs ${currentState === state.id ? 'bg-blue-600 text-white' : ''}`}
            data-testid={`button-state-${state.id}`}
          >
            <div className={`w-2 h-2 rounded-full ${state.color} mr-1`} />
            {state.label}
          </Button>
        ))}
      </div>
      <p className="text-xs text-gray-500">
        Select a state to edit its appearance. Changes apply to the current state only.
      </p>
    </div>
  );
};

export default ButtonStateSelector;