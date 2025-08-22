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

  const renderInteractiveButton = (design: any) => {
    return (
      <button
        key={design.id}
        style={{
          ...design.baseStyles,
          ...design.states.default?.styles,
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          if (design.states.hover?.styles) {
            Object.assign(e.target.style, design.states.hover.styles);
          }
        }}
        onMouseLeave={(e) => {
          Object.assign(e.target.style, design.states.default?.styles || {});
        }}
        onMouseDown={(e) => {
          if (design.states.active?.styles) {
            Object.assign(e.target.style, design.states.active.styles);
          }
        }}
        onMouseUp={(e) => {
          if (design.states.hover?.styles) {
            Object.assign(e.target.style, design.states.hover.styles);
          }
        }}
        onFocus={(e) => {
          if (design.states.focus?.styles) {
            Object.assign(e.target.style, design.states.focus.styles);
          }
        }}
        onBlur={(e) => {
          Object.assign(e.target.style, design.states.default?.styles || {});
        }}
        data-testid={`button-interactive-preview-${design.id}`}
      >
        {testText}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Button Text</label>
        <Input
          value={testText}
          onChange={(e) => setTestText(e.target.value)}
          placeholder="Enter button text..."
          data-testid="button-test-text-input"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <MousePointer2 className="w-4 h-4" />
          <label className="text-sm font-medium">Interactive Preview</label>
        </div>
        <p className="text-xs text-gray-500">
          Hover, click, and focus to test all button states in real-time
        </p>
      </div>

      {designsArray.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No button designs created yet.
          <br />
          Create a design to see the preview.
        </div>
      ) : (
        <div className="space-y-4">
          {designsArray.map((design) => (
            <div key={design.id} className="border rounded-lg p-4 space-y-3">
              <h4 className="font-medium">{design.name}</h4>
              
              <div className="space-y-2">
                <div className="text-sm font-medium">Real-time Preview</div>
                <div className="flex justify-center p-4 bg-gray-50 rounded">
                  {renderInteractiveButton(design)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ButtonTestingMode;