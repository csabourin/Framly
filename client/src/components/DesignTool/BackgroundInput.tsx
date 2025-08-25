import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ImageIcon, Palette, Zap, Upload, Link, Plus, Minus, RotateCcw } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { updateElementStyles } from '@/store/canvasSlice';
import { indexedDBManager } from '@/utils/indexedDB';
import { ColorModePropertyInput } from '../ColorModePropertyInput';

interface GradientStop {
  color: string;
  position: number; // 0-100
}

interface BackgroundInputProps {
  elementId: string;
  value?: {
    backgroundColor?: string;
    backgroundImage?: string;
    backgroundRepeat?: string;
    backgroundSize?: string;
    backgroundPosition?: string;
    backgroundAttachment?: string;
    backgroundClip?: string;
    backgroundOrigin?: string;
  };
  onChange: (value: any) => void;
}

export const BackgroundInput: React.FC<BackgroundInputProps> = ({
  elementId,
  value = {},
  onChange
}) => {
  const dispatch = useDispatch();
  
  // Current background values
  const [backgroundType, setBackgroundType] = useState<'color' | 'image' | 'gradient'>('color');
  const [backgroundColor, setBackgroundColor] = useState(value.backgroundColor || '#ffffff');
  const [backgroundImage, setBackgroundImage] = useState(value.backgroundImage || '');
  const [backgroundRepeat, setBackgroundRepeat] = useState(value.backgroundRepeat || 'repeat');
  const [backgroundSize, setBackgroundSize] = useState(value.backgroundSize || 'auto');
  const [backgroundPosition, setBackgroundPosition] = useState(value.backgroundPosition || 'center');
  const [backgroundAttachment, setBackgroundAttachment] = useState(value.backgroundAttachment || 'scroll');
  const [backgroundClip, setBackgroundClip] = useState(value.backgroundClip || 'border-box');
  const [backgroundOrigin, setBackgroundOrigin] = useState(value.backgroundOrigin || 'padding-box');
  
  // Gradient state
  const [gradientType, setGradientType] = useState<'linear' | 'radial'>('linear');
  const [gradientAngle, setGradientAngle] = useState(90);
  const [gradientStops, setGradientStops] = useState<GradientStop[]>([
    { color: '#ff0000', position: 0 },
    { color: '#0000ff', position: 100 }
  ]);
  
  // Image upload state  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Determine current background type - use string comparison to avoid unnecessary re-renders
  useEffect(() => {
    if (value.backgroundImage) {
      if (value.backgroundImage.includes('gradient')) {
        setBackgroundType('gradient');
        // Parse existing gradient
        parseExistingGradient(value.backgroundImage);
      } else {
        setBackgroundType('image');
        setBackgroundImage(value.backgroundImage);
      }
    } else if (value.backgroundColor) {
      setBackgroundType('color');
      setBackgroundColor(value.backgroundColor);
    }
  }, [value?.backgroundImage, value?.backgroundColor]);

  const parseExistingGradient = (gradientString: string) => {
    try {
      // Parse linear-gradient or radial-gradient
      const isRadial = gradientString.includes('radial-gradient');
      setGradientType(isRadial ? 'radial' : 'linear');
      
      if (!isRadial) {
        // Extract angle from linear-gradient
        const angleMatch = gradientString.match(/linear-gradient\((\d+)deg/);
        if (angleMatch) {
          setGradientAngle(parseInt(angleMatch[1]));
        }
      }
      
      // Extract color stops
      const colorStopsRegex = /(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|rgb\([^)]+\)|rgba\([^)]+\)|[a-z]+)\s+(\d+)%/g;
      const stops: GradientStop[] = [];
      let match;
      
      while ((match = colorStopsRegex.exec(gradientString)) !== null) {
        stops.push({
          color: match[1],
          position: parseInt(match[2])
        });
      }
      
      if (stops.length > 0) {
        setGradientStops(stops);
      }
    } catch (error) {
      console.warn('Failed to parse existing gradient:', error);
    }
  };

  const generateGradientCSS = useCallback(() => {
    const sortedStops = [...gradientStops].sort((a, b) => a.position - b.position);
    const stopStrings = sortedStops.map(stop => `${stop.color} ${stop.position}%`);
    
    if (gradientType === 'linear') {
      return `linear-gradient(${gradientAngle}deg, ${stopStrings.join(', ')})`;
    } else {
      return `radial-gradient(circle, ${stopStrings.join(', ')})`;
    }
  }, [gradientType, gradientAngle, gradientStops]);

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      alert('Image size must be less than 2MB');
      return;
    }

    setIsUploading(true);
    try {
      // Convert to base64 and store in IndexedDB
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      // Store image in IndexedDB
      const imageId = `bg-${elementId}-${Date.now()}`;
      await indexedDBManager.saveImage({
        id: imageId,
        data: base64,
        filename: file.name,
        mimeType: file.type,
        size: file.size
      });

      const imageUrl = `data:${file.type};base64,${base64.split(',')[1]}`;
      setBackgroundImage(`url(${imageUrl})`);
      updateBackgroundProperty('backgroundImage', `url(${imageUrl})`);
      
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const updateBackgroundProperty = (property: string, propertyValue: string) => {
    const updates = { [property]: propertyValue };
    onChange(updates);
    
    // Also dispatch to Redux for immediate UI update
    dispatch(updateElementStyles({
      id: elementId,
      styles: updates
    }));
  };

  const applyBackgroundType = (type: 'color' | 'image' | 'gradient') => {
    setBackgroundType(type);
    
    // Clear other background properties
    const updates: any = {
      backgroundColor: undefined,
      backgroundImage: undefined
    };
    
    switch (type) {
      case 'color':
        updates.backgroundColor = backgroundColor;
        break;
      case 'image':
        updates.backgroundImage = backgroundImage;
        break;
      case 'gradient':
        updates.backgroundImage = generateGradientCSS();
        break;
    }
    
    onChange(updates);
    dispatch(updateElementStyles({ id: elementId, styles: updates }));
  };

  const addGradientStop = () => {
    const newPosition = gradientStops.length > 0 
      ? Math.min(100, Math.max(...gradientStops.map(s => s.position)) + 20)
      : 50;
    
    setGradientStops([...gradientStops, {
      color: '#808080',
      position: newPosition
    }]);
  };

  const removeGradientStop = (index: number) => {
    if (gradientStops.length > 2) {
      setGradientStops(gradientStops.filter((_, i) => i !== index));
    }
  };

  const updateGradientStop = (index: number, updates: Partial<GradientStop>) => {
    const newStops = [...gradientStops];
    newStops[index] = { ...newStops[index], ...updates };
    setGradientStops(newStops);
    
    // Update background immediately if gradient is active
    if (backgroundType === 'gradient') {
      const gradientCSS = gradientType === 'linear' 
        ? `linear-gradient(${gradientAngle}deg, ${newStops.sort((a, b) => a.position - b.position).map(s => `${s.color} ${s.position}%`).join(', ')})`
        : `radial-gradient(circle, ${newStops.sort((a, b) => a.position - b.position).map(s => `${s.color} ${s.position}%`).join(', ')})`;
      
      updateBackgroundProperty('backgroundImage', gradientCSS);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Palette className="w-4 h-4" />
          Background
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Background Type Tabs */}
        <Tabs value={backgroundType} onValueChange={(value) => applyBackgroundType(value as any)}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="color" className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-current"></div>
              Color
            </TabsTrigger>
            <TabsTrigger value="image" className="flex items-center gap-1">
              <ImageIcon className="w-3 h-3" />
              Image
            </TabsTrigger>
            <TabsTrigger value="gradient" className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Gradient
            </TabsTrigger>
          </TabsList>

          {/* Color Tab */}
          <TabsContent value="color" className="space-y-3">
            <ColorModePropertyInput
              config={{
                key: 'backgroundColor',
                label: 'Background Color',
                type: 'color',
                category: 'appearance',
                priority: 1
              }}
              value={backgroundColor}
              onChange={(newValue) => {
                setBackgroundColor(newValue as any);
                updateBackgroundProperty('backgroundColor', newValue);
              }}
            />
          </TabsContent>

          {/* Image Tab */}
          <TabsContent value="image" className="space-y-4">
            <Tabs defaultValue="upload">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="upload">
                  <Upload className="w-3 h-3 mr-1" />
                  Upload
                </TabsTrigger>
                <TabsTrigger value="url">
                  <Link className="w-3 h-3 mr-1" />
                  URL
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="upload" className="space-y-3">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setImageFile(file);
                        handleImageUpload(file);
                      }
                    }}
                    className="hidden"
                    id="bg-image-upload"
                    disabled={isUploading}
                  />
                  <label
                    htmlFor="bg-image-upload"
                    className="cursor-pointer block"
                  >
                    {isUploading ? (
                      <div className="text-blue-600">Uploading...</div>
                    ) : (
                      <>
                        <ImageIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <div className="text-sm text-gray-600">
                          Click to upload image
                        </div>
                        <div className="text-xs text-gray-400">
                          PNG, JPG up to 2MB
                        </div>
                      </>
                    )}
                  </label>
                </div>
              </TabsContent>
              
              <TabsContent value="url" className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="flex-1"
                  />
                  <Button
                    onClick={() => {
                      if (imageUrl) {
                        const cssUrl = `url(${imageUrl})`;
                        setBackgroundImage(cssUrl);
                        updateBackgroundProperty('backgroundImage', cssUrl);
                      }
                    }}
                    size="sm"
                  >
                    Apply
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Gradient Tab */}
          <TabsContent value="gradient" className="space-y-4">
            {/* Gradient Type */}
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={gradientType} onValueChange={(value: 'linear' | 'radial') => {
                setGradientType(value);
                if (backgroundType === 'gradient') {
                  setTimeout(() => updateBackgroundProperty('backgroundImage', generateGradientCSS()), 0);
                }
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linear">Linear</SelectItem>
                  <SelectItem value="radial">Radial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Gradient Angle (Linear only) */}
            {gradientType === 'linear' && (
              <div className="space-y-2">
                <Label>Angle: {gradientAngle}°</Label>
                <Input
                  type="range"
                  min="0"
                  max="360"
                  value={gradientAngle}
                  onChange={(e) => {
                    const angle = parseInt(e.target.value);
                    setGradientAngle(angle);
                    if (backgroundType === 'gradient') {
                      updateBackgroundProperty('backgroundImage', generateGradientCSS());
                    }
                  }}
                  className="w-full"
                />
              </div>
            )}

            {/* Gradient Stops */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Color Stops</Label>
                <Button
                  onClick={addGradientStop}
                  size="sm"
                  variant="outline"
                  className="h-7"
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              
              {gradientStops.map((stop, index) => (
                <div key={index} className="flex items-center gap-2 p-2 border rounded">
                  <Input
                    type="color"
                    value={stop.color}
                    onChange={(e) => updateGradientStop(index, { color: e.target.value })}
                    className="w-8 h-8 p-1 border rounded"
                  />
                  <Input
                    type="number"
                    value={stop.position}
                    onChange={(e) => updateGradientStop(index, { position: parseInt(e.target.value) || 0 })}
                    min="0"
                    max="100"
                    className="w-16 text-sm"
                  />
                  <span className="text-xs text-gray-500">%</span>
                  {gradientStops.length > 2 && (
                    <Button
                      onClick={() => removeGradientStop(index)}
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-red-500"
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <Separator />

        {/* Advanced Properties */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Advanced Properties</Label>
          
          <div className="grid grid-cols-2 gap-3">
            {/* Background Repeat */}
            <div className="space-y-1">
              <Label className="text-xs text-gray-600">Repeat</Label>
              <Select
                value={backgroundRepeat}
                onValueChange={(value) => {
                  setBackgroundRepeat(value);
                  updateBackgroundProperty('backgroundRepeat', value);
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="repeat">Repeat</SelectItem>
                  <SelectItem value="no-repeat">No Repeat</SelectItem>
                  <SelectItem value="repeat-x">Repeat X</SelectItem>
                  <SelectItem value="repeat-y">Repeat Y</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Background Size */}
            <div className="space-y-1">
              <Label className="text-xs text-gray-600">Size</Label>
              <Select
                value={backgroundSize}
                onValueChange={(value) => {
                  setBackgroundSize(value);
                  updateBackgroundProperty('backgroundSize', value);
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="cover">Cover</SelectItem>
                  <SelectItem value="contain">Contain</SelectItem>
                  <SelectItem value="100% 100%">Stretch</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Background Position */}
            <div className="space-y-1">
              <Label className="text-xs text-gray-600">Position</Label>
              <Select
                value={backgroundPosition}
                onValueChange={(value) => {
                  setBackgroundPosition(value);
                  updateBackgroundProperty('backgroundPosition', value);
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="top">Top</SelectItem>
                  <SelectItem value="bottom">Bottom</SelectItem>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                  <SelectItem value="top left">Top Left</SelectItem>
                  <SelectItem value="top right">Top Right</SelectItem>
                  <SelectItem value="bottom left">Bottom Left</SelectItem>
                  <SelectItem value="bottom right">Bottom Right</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Background Attachment */}
            <div className="space-y-1">
              <Label className="text-xs text-gray-600">Attachment</Label>
              <Select
                value={backgroundAttachment}
                onValueChange={(value) => {
                  setBackgroundAttachment(value);
                  updateBackgroundProperty('backgroundAttachment', value);
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scroll">Scroll</SelectItem>
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="local">Local</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Reset Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const resetValues = {
              backgroundColor: 'transparent',
              backgroundImage: 'none',
              backgroundRepeat: 'repeat',
              backgroundSize: 'auto',
              backgroundPosition: 'center',
              backgroundAttachment: 'scroll'
            };
            
            Object.entries(resetValues).forEach(([key, value]) => {
              updateBackgroundProperty(key, value);
            });
            
            setBackgroundType('color');
            setBackgroundColor('transparent');
            setBackgroundImage('');
          }}
          className="w-full"
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Reset Background
        </Button>
      </CardContent>
    </Card>
  );
};