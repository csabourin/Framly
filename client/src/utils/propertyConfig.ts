// Property configuration for dynamic properties panel
export type ElementType = 'container' | 'rectangle' | 'text' | 'image';

export interface PropertyConfig {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'color' | 'range' | 'toggle' | 'unit';
  category: 'layout' | 'appearance' | 'text' | 'spacing' | 'effects' | 'advanced';
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  description?: string;
  priority: number; // 1 = most important, higher = less important
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
    unit: 'px',
    description: 'Element width'
  },
  {
    key: 'height',
    label: 'Height',
    type: 'unit',
    category: 'layout',
    priority: 4,
    unit: 'px',
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
    description: 'Controls which elements appear in front'
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
    unit: 'px',
    description: 'Space outside the element'
  },
  {
    key: 'padding',
    label: 'Inner Spacing',
    type: 'unit',
    category: 'spacing',
    priority: 2,
    unit: 'px',
    description: 'Space inside the element'
  },
  {
    key: 'gap',
    label: 'Child Spacing',
    type: 'unit',
    category: 'spacing',
    priority: 3,
    unit: 'px',
    description: 'Space between child elements (flex/grid)'
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
    unit: 'px',
    min: 0,
    max: 50,
    description: 'How rounded the corners are'
  },
  {
    key: 'border',
    label: 'Border',
    type: 'text',
    category: 'appearance',
    priority: 3,
    description: 'Border style (e.g., 1px solid #000)'
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
    unit: 'px',
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
    unit: 'px',
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
    label: 'Flex Direction',
    type: 'select',
    category: 'layout',
    priority: 5,
    options: [
      { value: 'row', label: 'Left to Right' },
      { value: 'column', label: 'Top to Bottom' },
      { value: 'row-reverse', label: 'Right to Left' },
      { value: 'column-reverse', label: 'Bottom to Top' }
    ],
    description: 'Direction of flex items'
  },
  {
    key: 'justifyContent',
    label: 'Main Alignment',
    type: 'select',
    category: 'layout',
    priority: 6,
    options: [
      { value: 'flex-start', label: 'Start' },
      { value: 'center', label: 'Center' },
      { value: 'flex-end', label: 'End' },
      { value: 'space-between', label: 'Space Between' },
      { value: 'space-around', label: 'Space Around' },
      { value: 'space-evenly', label: 'Space Evenly' }
    ],
    description: 'How items are aligned along main axis'
  },
  {
    key: 'alignItems',
    label: 'Cross Alignment',
    type: 'select',
    category: 'layout',
    priority: 7,
    options: [
      { value: 'stretch', label: 'Stretch' },
      { value: 'flex-start', label: 'Start' },
      { value: 'center', label: 'Center' },
      { value: 'flex-end', label: 'End' },
      { value: 'baseline', label: 'Baseline' }
    ],
    description: 'How items are aligned along cross axis'
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
export function getPropertyGroups(elementType: ElementType): PropertyGroup[] {
  const properties = elementPropertyMap[elementType] || [];
  const groups: Record<string, PropertyConfig[]> = {};
  
  // Group properties by category
  properties.forEach(prop => {
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
    effects: { label: 'Effects', icon: '✨', order: 5 },
    advanced: { label: 'Advanced', icon: '⚙️', order: 6 }
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
  if (strValue.match(/\d+(px|%|em|rem|vh|vw)$/)) {
    return strValue;
  }
  
  return `${value}${unit}`;
}