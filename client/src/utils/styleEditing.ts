import type { CanvasElement } from '../types/canvas';

/** Later layers must also move a repeated shorthand after earlier longhands. */
export function mergeStyleLayer(target: Record<string, any>, layer: Record<string, any>) {
  for (const [property, value] of Object.entries(layer)) {
    delete target[property];
    target[property] = value;
  }
}

/** The panel and direct canvas controls share this breakpoint writing path. */
export function breakpointStyleUpdate(element: CanvasElement, property: string, value: unknown, breakpoint: string) {
  const existing = element.responsiveStyles || {};
  const styles: Record<string, unknown> = { ...existing[breakpoint as keyof typeof existing] };
  delete styles[property];
  if (value !== undefined && value !== null && value !== '') styles[property] = value;
  return { responsiveStyles: { ...existing, [breakpoint]: styles } };
}
