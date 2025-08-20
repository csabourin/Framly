export interface CanvasElement {
  id: string;
  type: 'rectangle' | 'text' | 'image' | 'container';
  x: number;
  y: number;
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
  
  // Text-specific properties
  textDisplay?: 'block' | 'inline';
  
  // Image-specific properties
  imageUrl?: string;
  imageRatio?: 'auto' | '16:9' | '4:3' | '1:1' | '3:2';
  imageJustifySelf?: 'flex-start' | 'center' | 'flex-end';
  widthUnit?: 'px' | 'rem' | '%' | 'vw' | 'auto';
  heightUnit?: 'px' | 'rem' | '%' | 'vh' | 'auto';
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

export interface Breakpoint {
  name: string;
  width: number;
  icon: string;
}

export interface Project {
  id: string;
  name: string;
  elements: Record<string, CanvasElement>;
  breakpoints: Record<string, any>;
  selectedElementId?: string;
  currentBreakpoint: string;
}

export type Tool = 'select' | 'hand' | 'rectangle' | 'text' | 'image' | 'split-horizontal' | 'split-vertical' | 'merge' | 'component';

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

export interface ComponentCategory {
  id: string;
  name: string;
  components: CustomComponent[];
}
