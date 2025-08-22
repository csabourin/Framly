import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../store';
import { 
  updateButtonState, 
  setCurrentState, 
  updatePreviewText 
} from '../../../store/buttonSlice';
import { ButtonStyles } from '../../../types/button';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import PropertyInputGroup from './PropertyInputGroup';

const ButtonStateEditor: React.FC = () => {
  const dispatch = useDispatch();
  const { currentDesignId, currentState, designs } = useSelector((state: RootState) => state.button);

  if (!currentDesignId || !designs[currentDesignId]) {
    return null;
  }

  const design = designs[currentDesignId];
  const currentStateData = design.states[currentState];

  const handleStateChange = (stateName: keyof typeof design.states) => {
    dispatch(setCurrentState(stateName));
  };

  const handleStyleUpdate = (property: keyof ButtonStyles, value: string) => {
    dispatch(updateButtonState({
      designId: currentDesignId,
      stateName: currentState,
      styles: { [property]: value }
    }));
  };

  const handlePreviewTextChange = (text: string) => {
    dispatch(updatePreviewText({ designId: currentDesignId, text }));
  };

  const stateButtons = [
    { key: 'default', label: 'Default', color: 'bg-blue-500' },
    { key: 'hover', label: 'Hover', color: 'bg-purple-500' },
    { key: 'active', label: 'Active', color: 'bg-red-500' },
    { key: 'focus', label: 'Focus', color: 'bg-green-500' },
    { key: 'disabled', label: 'Disabled', color: 'bg-gray-500' },
  ] as const;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900">{design.name}</h3>
          <div className="flex items-center gap-2">
            <Label htmlFor="preview-text" className="text-sm text-gray-600">Preview Text:</Label>
            <Input
              id="preview-text"
              value={design.previewText}
              onChange={(e) => handlePreviewTextChange(e.target.value)}
              className="w-24 h-7 text-sm"
              data-testid="input-preview-text"
            />
          </div>
        </div>

        {/* State Selector */}
        <div className="flex gap-2">
          {stateButtons.map(({ key, label, color }) => (
            <Button
              key={key}
              variant={currentState === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleStateChange(key)}
              className={`text-xs ${currentState === key ? color : ''}`}
              data-testid={`state-${key}`}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Property Editor */}
      <div className="flex-1 overflow-y-auto p-4">
        <Tabs defaultValue="layout" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="layout">Layout</TabsTrigger>
            <TabsTrigger value="typography">Typography</TabsTrigger>
            <TabsTrigger value="colors">Colors</TabsTrigger>
            <TabsTrigger value="effects">Effects</TabsTrigger>
          </TabsList>

          <TabsContent value="layout" className="space-y-4">
            <PropertyInputGroup
              title="Dimensions"
              properties={[
                { key: 'width', label: 'Width', value: currentStateData.styles.width || '' },
                { key: 'height', label: 'Height', value: currentStateData.styles.height || '' },
              ]}
              onUpdate={handleStyleUpdate}
            />
            
            <PropertyInputGroup
              title="Spacing"
              properties={[
                { key: 'padding', label: 'Padding', value: currentStateData.styles.padding || '' },
                { key: 'margin', label: 'Margin', value: currentStateData.styles.margin || '' },
              ]}
              onUpdate={handleStyleUpdate}
            />

            <PropertyInputGroup
              title="Border"
              properties={[
                { key: 'border', label: 'Border', value: currentStateData.styles.border || '' },
                { key: 'borderRadius', label: 'Border Radius', value: currentStateData.styles.borderRadius || '' },
              ]}
              onUpdate={handleStyleUpdate}
            />
          </TabsContent>

          <TabsContent value="typography" className="space-y-4">
            <PropertyInputGroup
              title="Font"
              properties={[
                { key: 'fontSize', label: 'Font Size', value: currentStateData.styles.fontSize || '' },
                { key: 'fontWeight', label: 'Font Weight', value: currentStateData.styles.fontWeight || '' },
                { key: 'fontFamily', label: 'Font Family', value: currentStateData.styles.fontFamily || '' },
              ]}
              onUpdate={handleStyleUpdate}
            />

            <PropertyInputGroup
              title="Text Style"
              properties={[
                { key: 'textAlign', label: 'Text Align', value: currentStateData.styles.textAlign || '' },
                { key: 'textDecoration', label: 'Text Decoration', value: currentStateData.styles.textDecoration || '' },
                { key: 'textTransform', label: 'Text Transform', value: currentStateData.styles.textTransform || '' },
                { key: 'letterSpacing', label: 'Letter Spacing', value: currentStateData.styles.letterSpacing || '' },
                { key: 'lineHeight', label: 'Line Height', value: currentStateData.styles.lineHeight || '' },
              ]}
              onUpdate={handleStyleUpdate}
            />
          </TabsContent>

          <TabsContent value="colors" className="space-y-4">
            <PropertyInputGroup
              title="Colors"
              properties={[
                { key: 'color', label: 'Text Color', value: currentStateData.styles.color || '', type: 'color' },
                { key: 'backgroundColor', label: 'Background', value: currentStateData.styles.backgroundColor || '', type: 'color' },
                { key: 'borderColor', label: 'Border Color', value: currentStateData.styles.borderColor || '', type: 'color' },
              ]}
              onUpdate={handleStyleUpdate}
            />

            <PropertyInputGroup
              title="Gradient"
              properties={[
                { key: 'backgroundImage', label: 'Background Image', value: currentStateData.styles.backgroundImage || '' },
              ]}
              onUpdate={handleStyleUpdate}
            />
          </TabsContent>

          <TabsContent value="effects" className="space-y-4">
            <PropertyInputGroup
              title="Shadows"
              properties={[
                { key: 'boxShadow', label: 'Box Shadow', value: currentStateData.styles.boxShadow || '' },
                { key: 'textShadow', label: 'Text Shadow', value: currentStateData.styles.textShadow || '' },
              ]}
              onUpdate={handleStyleUpdate}
            />

            <PropertyInputGroup
              title="Transform & Effects"
              properties={[
                { key: 'transform', label: 'Transform', value: currentStateData.styles.transform || '' },
                { key: 'opacity', label: 'Opacity', value: currentStateData.styles.opacity || '' },
                { key: 'filter', label: 'Filter', value: currentStateData.styles.filter || '' },
                { key: 'transition', label: 'Transition', value: currentStateData.styles.transition || '' },
              ]}
              onUpdate={handleStyleUpdate}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ButtonStateEditor;