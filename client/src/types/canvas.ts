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

export type Tool = 'select' | 'hand' | 'rectangle' | 'text' | 'image' | 'split-horizontal' | 'split-vertical' | 'merge';
