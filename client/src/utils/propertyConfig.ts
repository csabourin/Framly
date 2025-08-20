// Property configuration for dynamic properties panel
export type ElementType = 'container' | 'rectangle' | 'text' | 'image';

export interface PropertyConfig {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'color' | 'range' | 'toggle' | 'unit' | 'border' | 'compound';
  category: 'layout' | 'appearance' | 'text' | 'spacing' | 'effects' | 'advanced' | 'flex' | 'grid';
  options?: Array<{ value: string; label: string }>;
  units?: string[];
  defaultUnit?: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  description?: string;
  priority: number; // 1 = most important, higher = less important
  condition?: (element: any) => boolean; // Function to determine if property should be shown
  subProperties?: PropertyConfig[]; // For compound properties like border
}

export interface PropertyGroup {
  category: string;
  label: string;
  icon: string;
  properties: PropertyConfig[];
}

// Common layout properties for all elements
const layoutProperties: PropertyConfig[] = [
  {
    key: 'display',
    label: 'Display Type',
    type: 'select',
    category: 'layout',
    priority: 1,
    options: [
      { value: 'block', label: 'Block' },
      { value: 'inline-block', label: 'Inline Block' },
      { value: 'flex', label: 'Flex Container' },
      { value: 'grid', label: 'Grid Container' },
      { value: 'inline', label: 'Inline' },
      { value: 'none', label: 'Hidden' }
    ],
    description: 'How the element is displayed in the layout'
  },
  {
    key: 'position',
    label: 'Position',
    type: 'select',
    category: 'layout',
    priority: 2,
    options: [
      { value: 'static', label: 'Normal Flow' },
      { value: 'relative', label: 'Relative' },
      { value: 'absolute', label: 'Absolute' },
      { value: 'fixed', label: 'Fixed' },
      { value: 'sticky', label: 'Sticky' }
    ],
    description: 'How the element is positioned'
  },
  {
    key: 'width',
    label: 'Width',
    type: 'unit',
    category: 'layout',
    priority: 3,
    units: ['px', '%', 'vw', 'em', 'rem', 'auto'],
    defaultUnit: 'px',
    description: 'Element width'
  },
  {
    key: 'height',
    label: 'Height',
    type: 'unit',
    category: 'layout',
    priority: 4,
    units: ['px', '%', 'vh', 'em', 'rem', 'auto'],
    defaultUnit: 'px',
    description: 'Element height'
  },
  {
    key: 'zIndex',
    label: 'Stack Order',
    type: 'number',
    category: 'layout',
    priority: 8,
    min: -999,
    max: 999,
    description: 'Controls which elements appear in front',
    condition: (element) => element.styles?.position && element.styles.position !== 'static'
  }
];

// Spacing properties
const spacingProperties: PropertyConfig[] = [
  {
    key: 'margin',
    label: 'Outer Spacing',
    type: 'unit',
    category: 'spacing',
    priority: 1,
    units: ['px', '%', 'em', 'rem', 'auto'],
    defaultUnit: 'px',
    description: 'Space outside the element'
  },
  {
    key: 'padding',
    label: 'Inner Spacing',
    type: 'unit',
    category: 'spacing',
    priority: 2,
    units: ['px', '%', 'em', 'rem'],
    defaultUnit: 'px',
    description: 'Space inside the element'
  },
  {
    key: 'gap',
    label: 'Child Spacing',
    type: 'unit',
    category: 'spacing',
    priority: 3,
    units: ['px', '%', 'em', 'rem'],
    defaultUnit: 'px',
    description: 'Space between child elements (flex/grid)',
    condition: (element) => element.styles?.display === 'flex' || element.styles?.display === 'grid'
  }
];

// Appearance properties
const appearanceProperties: PropertyConfig[] = [
  {
    key: 'backgroundColor',
    label: 'Background Color',
    type: 'color',
    category: 'appearance',
    priority: 1,
    description: 'Fill color of the element'
  },
  {
    key: 'borderRadius',
    label: 'Corner Roundness',
    type: 'unit',
    category: 'appearance',
    priority: 2,
    units: ['px', '%', 'em', 'rem'],
    defaultUnit: 'px',
    min: 0,
    max: 50,
    description: 'How rounded the corners are'
  },
  {
    key: 'border',
    label: 'Border',
    type: 'border',
    category: 'appearance',
    priority: 3,
    description: 'Border style and appearance',
    subProperties: [
      {
        key: 'borderWidth',
        label: 'Width',
        type: 'unit',
        category: 'appearance',
        priority: 1,
        units: ['px', 'em', 'rem'],
        defaultUnit: 'px',
        min: 0,
        max: 20,
        description: 'Border thickness'
      },
      {
        key: 'borderStyle',
        label: 'Style',
        type: 'select',
        category: 'appearance',
        priority: 2,
        options: [
          { value: 'none', label: 'None' },
          { value: 'solid', label: 'Solid' },
          { value: 'dashed', label: 'Dashed' },
          { value: 'dotted', label: 'Dotted' },
          { value: 'double', label: 'Double' }
        ],
        description: 'Border line style'
      },
      {
        key: 'borderColor',
        label: 'Color',
        type: 'color',
        category: 'appearance',
        priority: 3,
        description: 'Border color'
      }
    ]
  },
  {
    key: 'opacity',
    label: 'Transparency',
    type: 'range',
    category: 'appearance',
    priority: 4,
    min: 0,
    max: 1,
    step: 0.1,
    description: 'How see-through the element is'
  },
  {
    key: 'boxShadow',
    label: 'Shadow',
    type: 'text',
    category: 'effects',
    priority: 6,
    description: 'Drop shadow effect'
  }
];

// Text properties
const textProperties: PropertyConfig[] = [
  {
    key: 'fontSize',
    label: 'Text Size',
    type: 'unit',
    category: 'text',
    priority: 1,
    units: ['px', 'em', 'rem', '%', 'pt'],
    defaultUnit: 'px',
    min: 8,
    max: 120,
    description: 'Size of the text'
  },
  {
    key: 'fontWeight',
    label: 'Text Weight',
    type: 'select',
    category: 'text',
    priority: 2,
    options: [
      { value: '300', label: 'Light' },
      { value: '400', label: 'Normal' },
      { value: '500', label: 'Medium' },
      { value: '600', label: 'Semi Bold' },
      { value: '700', label: 'Bold' },
      { value: '800', label: 'Extra Bold' }
    ],
    description: 'How thick the text appears'
  },
  {
    key: 'color',
    label: 'Text Color',
    type: 'color',
    category: 'text',
    priority: 3,
    description: 'Color of the text'
  },
  {
    key: 'textAlign',
    label: 'Text Alignment',
    type: 'select',
    category: 'text',
    priority: 4,
    options: [
      { value: 'left', label: 'Left' },
      { value: 'center', label: 'Center' },
      { value: 'right', label: 'Right' },
      { value: 'justify', label: 'Justify' }
    ],
    description: 'How text is aligned'
  },
  {
    key: 'lineHeight',
    label: 'Line Spacing',
    type: 'number',
    category: 'text',
    priority: 5,
    min: 0.8,
    max: 3,
    step: 0.1,
    description: 'Space between lines of text'
  },
  {
    key: 'letterSpacing',
    label: 'Letter Spacing',
    type: 'unit',
    category: 'text',
    priority: 6,
    units: ['px', 'em', 'rem', '%'],
    defaultUnit: 'px',
    min: -2,
    max: 10,
    step: 0.1,
    description: 'Space between letters'
  },
  {
    key: 'textDecoration',
    label: 'Text Style',
    type: 'select',
    category: 'text',
    priority: 7,
    options: [
      { value: 'none', label: 'None' },
      { value: 'underline', label: 'Underline' },
      { value: 'line-through', label: 'Strike Through' },
      { value: 'overline', label: 'Overline' }
    ],
    description: 'Text decoration style'
  },
  {
    key: 'textTransform',
    label: 'Text Case',
    type: 'select',
    category: 'text',
    priority: 8,
    options: [
      { value: 'none', label: 'Normal' },
      { value: 'uppercase', label: 'UPPERCASE' },
      { value: 'lowercase', label: 'lowercase' },
      { value: 'capitalize', label: 'Title Case' }
    ],
    description: 'Text capitalization'
  }
];

// Flex-specific properties
const flexProperties: PropertyConfig[] = [
  {
    key: 'flexDirection',
    label: 'Direction',
    type: 'select',
    category: 'flex',
    priority: 1,
    options: [
      { value: 'row', label: 'Horizontal →' },
      { value: 'column', label: 'Vertical ↓' },
      { value: 'row-reverse', label: 'Horizontal ←' },
      { value: 'column-reverse', label: 'Vertical ↑' }
    ],
    description: 'Direction flex items flow',
    condition: (element) => element.styles?.display === 'flex'
  },
  {
    key: 'justifyContent',
    label: 'Main Axis',
    type: 'select',
    category: 'flex',
    priority: 2,
    options: [
      { value: 'flex-start', label: 'Start' },
      { value: 'center', label: 'Center' },
      { value: 'flex-end', label: 'End' },
      { value: 'space-between', label: 'Space Between' },
      { value: 'space-around', label: 'Space Around' },
      { value: 'space-evenly', label: 'Space Evenly' }
    ],
    description: 'How items are aligned along main axis',
    condition: (element) => element.styles?.display === 'flex'
  },
  {
    key: 'alignItems',
    label: 'Cross Axis',
    type: 'select',
    category: 'flex',
    priority: 3,
    options: [
      { value: 'stretch', label: 'Stretch' },
      { value: 'flex-start', label: 'Start' },
      { value: 'center', label: 'Center' },
      { value: 'flex-end', label: 'End' },
      { value: 'baseline', label: 'Baseline' }
    ],
    description: 'How items are aligned along cross axis',
    condition: (element) => element.styles?.display === 'flex'
  },
  {
    key: 'flexWrap',
    label: 'Wrap Items',
    type: 'select',
    category: 'flex',
    priority: 4,
    options: [
      { value: 'nowrap', label: 'No Wrap' },
      { value: 'wrap', label: 'Wrap' },
      { value: 'wrap-reverse', label: 'Wrap Reverse' }
    ],
    description: 'Whether flex items wrap to new lines',
    condition: (element) => element.styles?.display === 'flex'
  }
];

// Grid-specific properties
const gridProperties: PropertyConfig[] = [
  {
    key: 'gridTemplateColumns',
    label: 'Columns',
    type: 'text',
    category: 'grid',
    priority: 1,
    description: 'Grid column layout (e.g., 1fr 1fr 1fr or repeat(3, 1fr))',
    condition: (element) => element.styles?.display === 'grid'
  },
  {
    key: 'gridTemplateRows',
    label: 'Rows',
    type: 'text',
    category: 'grid',
    priority: 2,
    description: 'Grid row layout (e.g., auto auto or 100px 200px)',
    condition: (element) => element.styles?.display === 'grid'
  },
  {
    key: 'gridGap',
    label: 'Gap',
    type: 'unit',
    category: 'grid',
    priority: 3,
    units: ['px', '%', 'em', 'rem'],
    defaultUnit: 'px',
    description: 'Space between grid items',
    condition: (element) => element.styles?.display === 'grid'
  },
  {
    key: 'justifyItems',
    label: 'Justify Items',
    type: 'select',
    category: 'grid',
    priority: 4,
    options: [
      { value: 'start', label: 'Start' },
      { value: 'center', label: 'Center' },
      { value: 'end', label: 'End' },
      { value: 'stretch', label: 'Stretch' }
    ],
    description: 'How grid items are justified within their cells',
    condition: (element) => element.styles?.display === 'grid'
  },
  {
    key: 'alignItems',
    label: 'Align Items',
    type: 'select',
    category: 'grid',
    priority: 5,
    options: [
      { value: 'start', label: 'Start' },
      { value: 'center', label: 'Center' },
      { value: 'end', label: 'End' },
      { value: 'stretch', label: 'Stretch' }
    ],
    description: 'How grid items are aligned within their cells',
    condition: (element) => element.styles?.display === 'grid'
  }
];

// Advanced properties
const advancedProperties: PropertyConfig[] = [
  {
    key: 'transform',
    label: 'Transform',
    type: 'text',
    category: 'advanced',
    priority: 10,
    description: 'CSS transform functions'
  },
  {
    key: 'transition',
    label: 'Animation',
    type: 'text',
    category: 'advanced',
    priority: 11,
    description: 'Transition effects'
  },
  {
    key: 'overflow',
    label: 'Content Overflow',
    type: 'select',
    category: 'advanced',
    priority: 12,
    options: [
      { value: 'visible', label: 'Visible' },
      { value: 'hidden', label: 'Hidden' },
      { value: 'scroll', label: 'Scrollable' },
      { value: 'auto', label: 'Auto' }
    ],
    description: 'How content that overflows is handled'
  }
];

// Define which properties are relevant for each element type
export const elementPropertyMap: Record<ElementType, PropertyConfig[]> = {
  container: [
    ...layoutProperties,
    ...spacingProperties,
    ...appearanceProperties,
    ...flexProperties,
    ...gridProperties,
    ...advancedProperties
  ],
  rectangle: [
    ...layoutProperties.filter(p => !['display'].includes(p.key)),
    ...spacingProperties,
    ...appearanceProperties,
    ...advancedProperties.filter(p => !['overflow'].includes(p.key))
  ],
  text: [
    ...layoutProperties.filter(p => !['display', 'width', 'height'].includes(p.key)),
    ...spacingProperties.filter(p => p.key !== 'gap'),
    ...textProperties,
    ...appearanceProperties.filter(p => !['backgroundColor'].includes(p.key)),
    ...advancedProperties.filter(p => !['overflow'].includes(p.key))
  ],
  image: [
    ...layoutProperties.filter(p => !['display'].includes(p.key)),
    ...spacingProperties.filter(p => p.key !== 'gap'),
    ...appearanceProperties,
    {
      key: 'objectFit',
      label: 'Image Fit',
      type: 'select',
      category: 'appearance',
      priority: 5,
      options: [
        { value: 'fill', label: 'Fill' },
        { value: 'contain', label: 'Contain' },
        { value: 'cover', label: 'Cover' },
        { value: 'none', label: 'None' },
        { value: 'scale-down', label: 'Scale Down' }
      ],
      description: 'How image fits in its container'
    },
    ...advancedProperties.filter(p => !['overflow'].includes(p.key))
  ]
};

// Group properties by category for better organization
export function getPropertyGroups(elementType: ElementType, element?: any): PropertyGroup[] {
  const properties = elementPropertyMap[elementType] || [];
  const groups: Record<string, PropertyConfig[]> = {};
  
  // Filter properties based on conditions and group by category
  properties.forEach(prop => {
    // Check if property should be shown based on condition
    if (prop.condition && element && !prop.condition(element)) {
      return;
    }
    
    if (!groups[prop.category]) {
      groups[prop.category] = [];
    }
    groups[prop.category].push(prop);
  });
  
  // Sort properties within each group by priority
  Object.keys(groups).forEach(category => {
    groups[category].sort((a, b) => a.priority - b.priority);
  });
  
  // Define category metadata
  const categoryInfo: Record<string, { label: string; icon: string; order: number }> = {
    layout: { label: 'Layout & Position', icon: '📐', order: 1 },
    spacing: { label: 'Spacing', icon: '📏', order: 2 },
    appearance: { label: 'Appearance', icon: '🎨', order: 3 },
    text: { label: 'Typography', icon: '🔤', order: 4 },
    flex: { label: 'Flexbox', icon: '📦', order: 5 },
    grid: { label: 'Grid Layout', icon: '⚏', order: 6 },
    effects: { label: 'Effects', icon: '✨', order: 7 },
    advanced: { label: 'Advanced', icon: '⚙️', order: 8 }
  };
  
  // Convert to ordered array
  return Object.entries(groups)
    .map(([category, properties]) => ({
      category,
      label: categoryInfo[category]?.label || category,
      icon: categoryInfo[category]?.icon || '📋',
      properties
    }))
    .sort((a, b) => (categoryInfo[a.category]?.order || 99) - (categoryInfo[b.category]?.order || 99));
}

// Helper function to get CSS property key from our friendly key
export function getCSSPropertyKey(key: string): string {
  const cssKeyMap: Record<string, string> = {
    'borderRadius': 'border-radius',
    'backgroundColor': 'background-color',
    'fontSize': 'font-size',
    'fontWeight': 'font-weight',
    'textAlign': 'text-align',
    'lineHeight': 'line-height',
    'letterSpacing': 'letter-spacing',
    'textDecoration': 'text-decoration',
    'textTransform': 'text-transform',
    'flexDirection': 'flex-direction',
    'justifyContent': 'justify-content',
    'alignItems': 'align-items',
    'boxShadow': 'box-shadow',
    'zIndex': 'z-index',
    'objectFit': 'object-fit'
  };
  
  return cssKeyMap[key] || key;
}

// Helper function to format value with unit
export function formatValueWithUnit(value: string | number, unit?: string): string {
  if (!value && value !== 0) return '';
  if (!unit) return String(value);
  
  // Don't add unit if value already has one
  const strValue = String(value);
  if (strValue.match(/\d+(px|%|em|rem|vh|vw|pt|auto)$/)) {
    return strValue;
  }
  
  return `${value}${unit}`;
}

// Helper function to parse value and unit from a CSS value
export function parseValueAndUnit(cssValue: string): { value: string; unit: string } {
  if (!cssValue) return { value: '', unit: 'px' };
  
  const match = String(cssValue).match(/^([+-]?\d*\.?\d*)(.*)/);
  if (match) {
    const [, value, unit] = match;
    return {
      value: value || '',
      unit: unit || 'px'
    };
  }
  
  return { value: String(cssValue), unit: '' };
}