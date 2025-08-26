import { CanvasElement } from '../types/canvas';
import { ColorModeValues } from '../components/ColorModePropertyInput';

/**
 * Utility to check if an element has color mode properties that need updating
 */
export function hasColorModeProperties(element: CanvasElement): boolean {
  if (!element.styles) return false;
  
  // Check if any style property is a ColorModeValues object
  return Object.values(element.styles).some(value => isColorModeValue(value));
}

/**
 * Check if a value is a ColorModeValues object
 */
export function isColorModeValue(value: any): value is ColorModeValues {
  if (!value || typeof value !== 'object') return false;
  
  // Must have at least one of the color mode properties
  return (
    value.hasOwnProperty('light') ||
    value.hasOwnProperty('dark') ||
    value.hasOwnProperty('high-contrast')
  );
}

/**
 * Get all elements with color mode properties from a collection
 */
export function getElementsWithColorModeProperties(elements: Record<string, CanvasElement>): CanvasElement[] {
  return Object.values(elements).filter(hasColorModeProperties);
}

/**
 * Resolve color mode value to actual CSS value based on current mode
 */
export function resolveColorModeValue(value: ColorModeValues, resolvedMode: string): string {
  if (resolvedMode === 'dark' && value.dark) return value.dark;
  if (resolvedMode === 'high-contrast' && value['high-contrast']) return value['high-contrast'];
  return value.light || value.dark || value['high-contrast'] || '';
}

/**
 * Get a summary of color mode properties in the current project
 */
export function getColorModePropertySummary(elements: Record<string, CanvasElement>) {
  const elementsWithColorModeProps = getElementsWithColorModeProperties(elements);
  const propertyTypes = new Set<string>();
  
  elementsWithColorModeProps.forEach(element => {
    Object.entries(element.styles || {}).forEach(([key, value]) => {
      if (isColorModeValue(value)) {
        propertyTypes.add(key);
      }
    });
  });
  
  return {
    totalElements: Object.keys(elements).length,
    elementsWithColorModeProps: elementsWithColorModeProps.length,
    colorModePropertyTypes: Array.from(propertyTypes),
    elementIds: elementsWithColorModeProps.map(el => el.id)
  };
}