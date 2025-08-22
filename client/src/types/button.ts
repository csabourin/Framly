export interface ButtonStyles {
  // Layout & Sizing
  width?: string;
  height?: string;
  padding?: string;
  margin?: string;
  
  // Typography
  fontSize?: string;
  fontWeight?: string;
  fontFamily?: string;
  textAlign?: string;
  textDecoration?: string;
  textTransform?: string;
  letterSpacing?: string;
  lineHeight?: string;
  
  // Colors
  color?: string;
  backgroundColor?: string;
  
  // Borders
  border?: string;
  borderRadius?: string;
  borderWidth?: string;
  borderStyle?: string;
  borderColor?: string;
  
  // Shadows & Effects
  boxShadow?: string;
  textShadow?: string;
  
  // Gradients
  backgroundImage?: string;
  
  // Transitions
  transition?: string;
  
  // Position & Transform
  transform?: string;
  cursor?: string;
  
  // Opacity & Filters
  opacity?: string;
  filter?: string;
}

export interface ButtonState {
  name: string;
  label: string;
  styles: ButtonStyles;
  description?: string;
}

export interface ButtonDesign {
  id: string;
  name: string;
  description?: string;
  baseStyles: ButtonStyles;
  states: {
    default: ButtonState;
    hover: ButtonState;
    active: ButtonState;
    focus: ButtonState;
    disabled: ButtonState;
  };
  variants?: {
    primary: ButtonStyles;
    secondary: ButtonStyles;
    ghost: ButtonStyles;
    destructive: ButtonStyles;
  };
  previewText: string;
  createdAt: number;
  updatedAt: number;
}

export interface ButtonDesignState {
  designs: Record<string, ButtonDesign>;
  currentDesignId: string | null;
  currentState: keyof ButtonDesign['states'];
  currentVariant: keyof ButtonDesign['variants'] | null;
  previewState: keyof ButtonDesign['states'];
  isPreviewMode: boolean;
  isTestingMode: boolean;
}

export const defaultButtonStyles: ButtonStyles = {
  padding: '12px 24px',
  fontSize: '14px',
  fontWeight: '500',
  borderRadius: '6px',
  border: '1px solid transparent',
  backgroundColor: '#3b82f6',
  color: '#ffffff',
  cursor: 'pointer',
  transition: 'all 0.2s ease-in-out',
  textAlign: 'center',
  textDecoration: 'none',
  fontFamily: 'inherit',
  lineHeight: '1.2',
};

export const defaultButtonStates: ButtonDesign['states'] = {
  default: {
    name: 'default',
    label: 'Default',
    styles: { ...defaultButtonStyles },
    description: 'Default button appearance'
  },
  hover: {
    name: 'hover',
    label: 'Hover',
    styles: {
      backgroundColor: '#2563eb',
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)'
    },
    description: 'When user hovers over button'
  },
  active: {
    name: 'active',
    label: 'Active/Pressed',
    styles: {
      backgroundColor: '#1d4ed8',
      transform: 'translateY(0px)',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
    },
    description: 'When button is clicked/pressed'
  },
  focus: {
    name: 'focus',
    label: 'Focus',
    styles: {
      boxShadow: '0 0 0 2px #3b82f6'
    },
    description: 'When button has keyboard focus'
  },
  disabled: {
    name: 'disabled',
    label: 'Disabled',
    styles: {
      backgroundColor: '#9ca3af',
      color: '#6b7280',
      cursor: 'not-allowed',
      opacity: '0.6'
    },
    description: 'When button is disabled'
  }
};