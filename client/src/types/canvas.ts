export interface CanvasElement {
  id: string;
  type: 'rectangle' | 'text' | 'image' | 'container' | 'heading' | 'list' | 'component' | 'button' | 'element' |
        // Form elements
        'input' | 'textarea' | 'checkbox' | 'radio' | 'select' |
        // Structural elements
        'section' | 'nav' | 'header' | 'footer' | 'article' |
        // Media elements
        'video' | 'audio' |
        // Content elements
        'link' | 'code' | 'divider';
  x?: number; // Optional for document flow elements
  y?: number; // Optional for document flow elements
  width: number;
  height: number;
  styles: CSSProperties;
  children?: string[];
  parent?: string;
  content?: string;
  isContainer?: boolean;
  flexDirection?: 'row' | 'column';
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  classes?: string[];
  
  // HTML import properties
  htmlTag?: string; // Original HTML tag name for imported elements
  
  // Component-specific properties
  componentId?: string;
  instanceData?: Record<string, any>;
  
  // Text-specific properties
  textDisplay?: 'block' | 'inline';
  
  // Heading-specific properties
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  
  // List-specific properties
  listType?: 'ordered' | 'unordered';
  listItems?: string[];
  
  // Image-specific properties
  imageUrl?: string;
  imageBase64?: string; // For uploaded images stored locally
  imageAlt?: string;
  imageTitle?: string;
  imageRatio?: 'auto' | '16:9' | '4:3' | '1:1' | '3:2';
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  objectPosition?: string;
  imageJustifySelf?: 'flex-start' | 'center' | 'flex-end';
  widthUnit?: 'px' | 'rem' | '%' | 'vw' | 'auto';
  heightUnit?: 'px' | 'rem' | '%' | 'vh' | 'auto';
  
  // Button-specific properties
  buttonText?: string;
  buttonDesignId?: string; // Links to component design
  currentButtonState?: 'default' | 'hover' | 'active' | 'focus' | 'disabled';
  
  // Component instance properties (spec-compliant)
  componentRef?: {
    componentId: string;
    version: number; // Track component version for updates
    overrides?: Record<string, any>; // Future: per-instance prop overrides
  };
  
  // Component child markers (for expanded template children)
  isComponentChild?: boolean;
  componentRootId?: string;
  
  // Ghost root marker (for component template boundaries)
  isGhostRoot?: boolean;
  
  // Component root marker (for expanded instances)
  isComponentRoot?: boolean;
  
  // Positioning flag - true when element has been explicitly dragged/positioned
  isExplicitlyPositioned?: boolean;
}

export interface CSSProperties {
  backgroundColor?: string;
  color?: string;
  fontSize?: string;
  fontWeight?: string;
  fontFamily?: string;
  padding?: string;
  margin?: string;
  borderRadius?: string;
  border?: string;
  display?: string;
  gap?: string;
  position?: 'static' | 'relative' | 'absolute' | 'fixed';
  zIndex?: number;
  [key: string]: any;
}

export interface TabViewSettings {
  zoom: number;
  panX: number;
  panY: number;
  selectedElementId: string;
}

export interface DesignTab {
  id: string;
  name: string;
  color?: string;
  elements: Record<string, CanvasElement>;
  viewSettings: TabViewSettings;
  createdAt: number;
  updatedAt: number;
  // Component editing specific fields
  isComponentTab?: boolean;
  componentId?: ComponentId;
}

export interface Breakpoint {
  name: string;
  width: number;
  icon: string;
}

export interface Project {
  id: string;
  name: string;
  tabs: Record<string, DesignTab>;
  activeTabId: string;
  tabOrder: string[];
  breakpoints: Record<string, any>;
  currentBreakpoint: string;
}

export type Tool = 'select' | 'hand' | 'rectangle' | 'text' | 'heading' | 'list' | 'image' | 'container' | 'button' | 
  // Form elements
  'input' | 'textarea' | 'checkbox' | 'radio' | 'select' |
  // Structural elements  
  'section' | 'nav' | 'header' | 'footer' | 'article' |
  // Media elements
  'video' | 'audio' |
  // Interactive elements
  'link' |
  // Content elements
  'code' | 'divider' |
  // Legacy tools (for backwards compatibility)
  'split-horizontal' | 'split-vertical' | 'merge';

// Legacy interface for backward compatibility
export interface CustomComponent {
  id: string;
  name: string;
  category: string;
  thumbnail?: string;
  elements: Record<string, CanvasElement>;
  rootElementId: string;
  createdAt?: string;
  updatedAt?: string;
}

// Spec-compliant types
export type NodeId = string;
export type ComponentId = string;
export type CategoryId = string;

export interface ComponentDef {
  id: ComponentId;
  name: string;
  categoryId: CategoryId | null;
  template: CanvasElement; // normalized root node (full subtree)
  version: number;
  updatedAt: number;
}

export interface ComponentCategory {
  id: CategoryId;
  name: string;
  sortIndex: number;
  createdAt: number;
  components: CustomComponent[]; // For backward compatibility
}
