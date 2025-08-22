import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { MousePointer2 } from 'lucide-react';

const ButtonTestingMode: React.FC = () => {
  const { designs } = useSelector((state: RootState) => state.button);
  const [testText, setTestText] = useState('Button');

  const designsArray = Object.values(designs);

  // Real-time interactive button preview

  const renderButton = (design: any, stateName: string, isActive: boolean = false) => {
    const stateStyles = {
      ...design.baseStyles,
      ...design.states[stateName].styles,
    };

    return (
      <button
        key={`${design.id}-${stateName}`}
        style={stateStyles}
        className={`font-medium focus:outline-none transition-all ${
          isActive ? 'ring-2 ring-blue-500 ring-offset-2' : ''
        }`}
        disabled={stateName === 'disabled'}
        data-testid={`test-button-${design.id}-${stateName}`}
      >
        {testText}
      </button>
    );
  };

  if (designsArray.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Play className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Buttons to Test</h3>
          <p className="text-gray-500">
            Create some button designs first to use the testing mode
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Testing Controls */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900">Interactive Testing Mode</h3>
          <div className="flex items-center gap-2">
            <Input
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder="Button text..."
              className="w-32 h-8 text-sm"
              data-testid="input-test-text"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPlaying(!isPlaying)}
              className="text-xs"
              data-testid="button-toggle-auto-cycle"
            >
              {isPlaying ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
              {isPlaying ? 'Pause' : 'Auto Cycle'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentStateIndex(0)}
              className="text-xs"
              data-testid="button-reset-state"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </Button>
          </div>
        </div>

        {/* State Indicator */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Current State:</span>
          <div className="flex gap-1">
            {states.map((state, index) => (
              <button
                key={state}
                onClick={() => setCurrentStateIndex(index)}
                className={`px-3 py-1 text-xs rounded transition-all ${
                  currentStateIndex === index
                    ? 'bg-blue-500 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
                data-testid={`state-indicator-${state}`}
              >
                {state.charAt(0).toUpperCase() + state.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Testing Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {designsArray.map((design) => (
            <div key={design.id} className="space-y-4">
              {/* Design Info */}
              <div className="text-center">
                <h4 className="font-medium text-gray-900">{design.name}</h4>
                {design.description && (
                  <p className="text-sm text-gray-500 mt-1">{design.description}</p>
                )}
              </div>

              {/* Current State Button */}
              <div className="bg-white p-6 rounded-lg border border-gray-200 flex items-center justify-center min-h-24">
                {renderButton(design, states[currentStateIndex], true)}
              </div>

              {/* All States */}
              <div className="space-y-2">
                <h5 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                  All States
                </h5>
                <div className="grid grid-cols-2 gap-2">
                  {states.map((stateName) => (
                    <div key={stateName} className="text-center">
                      <div className="bg-gray-50 p-3 rounded border">
                        {renderButton(design, stateName)}
                      </div>
                      <span className="text-xs text-gray-500 mt-1 block">
                        {stateName}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ButtonTestingMode;