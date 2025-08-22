import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../store';
import { setPreviewState } from '../../../store/buttonSlice';
import { Button } from '../../ui/button';
import { Eye, Code } from 'lucide-react';

const ButtonPreview: React.FC = () => {
  const dispatch = useDispatch();
  const { currentDesignId, designs, previewState } = useSelector((state: RootState) => state.button);
  const [showCode, setShowCode] = useState(false);

  if (!currentDesignId || !designs[currentDesignId]) {
    return null;
  }

  const design = designs[currentDesignId];
  const currentStateData = design.states[previewState];

  // Combine base styles with state-specific styles
  const combinedStyles = {
    ...design.baseStyles,
    ...currentStateData.styles,
  };

  const generateCSS = () => {
    const cssRules = Object.entries(combinedStyles)
      .filter(([_, value]) => value)
      .map(([property, value]) => {
        // Convert camelCase to kebab-case
        const kebabProperty = property.replace(/([A-Z])/g, '-$1').toLowerCase();
        return `  ${kebabProperty}: ${value};`;
      })
      .join('\n');

    return `.button-${design.name.toLowerCase().replace(/\s+/g, '-')}:${previewState === 'default' ? '' : previewState} {\n${cssRules}\n}`;
  };

  const stateButtons = [
    { key: 'default', label: 'Default' },
    { key: 'hover', label: 'Hover' },
    { key: 'active', label: 'Active' },
    { key: 'focus', label: 'Focus' },
    { key: 'disabled', label: 'Disabled' },
  ] as const;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900">Preview</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCode(!showCode)}
            className="text-xs"
            data-testid="button-toggle-code"
          >
            {showCode ? <Eye className="w-4 h-4 mr-1" /> : <Code className="w-4 h-4 mr-1" />}
            {showCode ? 'Preview' : 'Code'}
          </Button>
        </div>

        {/* State Selector for Preview */}
        <div className="space-y-2">
          <label className="text-xs text-gray-600">Preview State:</label>
          <div className="grid grid-cols-2 gap-1 text-xs">
            {stateButtons.map(({ key, label }) => (
              <Button
                key={key}
                variant={previewState === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => dispatch(setPreviewState(key))}
                className="text-xs h-7"
                data-testid={`preview-state-${key}`}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 p-4">
        {showCode ? (
          <div className="h-full">
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-auto h-full font-mono">
              {generateCSS()}
            </pre>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Main Preview */}
            <div className="bg-gray-50 p-8 rounded-lg flex items-center justify-center min-h-32">
              <button
                style={combinedStyles as React.CSSProperties}
                className="font-medium focus:outline-none"
                disabled={previewState === 'disabled'}
                data-testid="preview-button"
              >
                {design.previewText}
              </button>
            </div>

            {/* State Info */}
            <div className="bg-blue-50 p-3 rounded border border-blue-200">
              <h4 className="text-sm font-medium text-blue-900 mb-1">
                {currentStateData.label} State
              </h4>
              <p className="text-xs text-blue-700">
                {currentStateData.description}
              </p>
            </div>

            {/* All States Quick View */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900">All States</h4>
              <div className="grid grid-cols-1 gap-2">
                {stateButtons.map(({ key, label }) => {
                  const stateStyles = {
                    ...design.baseStyles,
                    ...design.states[key].styles,
                  };
                  
                  return (
                    <div key={key} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                      <span className="text-xs text-gray-600 w-16">{label}:</span>
                      <button
                        style={stateStyles as React.CSSProperties}
                        className="text-xs px-3 py-1 font-medium focus:outline-none"
                        disabled={key === 'disabled'}
                        data-testid={`quick-preview-${key}`}
                      >
                        {design.previewText}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ButtonPreview;