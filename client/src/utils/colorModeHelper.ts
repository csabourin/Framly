import { ColorModeValues } from '../components/ColorModePropertyInput';

export interface ColorModeCSS {
  baseCSS: string;
  lightModeCSS: string;
  darkModeCSS: string;
  highContrastCSS: string;
}

/**
 * Checks if a value is a color mode values object
 */
export function isColorModeValues(value: any): value is ColorModeValues {
  return (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    (value.light !== undefined || value.dark !== undefined || value['high-contrast'] !== undefined)
  );
}

/**
 * Generates CSS for mode-specific color properties
 */
export function generateColorModeCSS(
  selector: string,
  properties: Record<string, any>
): ColorModeCSS {
  const baseCSS: string[] = [];
  const lightModeCSS: string[] = [];
  const darkModeCSS: string[] = [];
  const highContrastCSS: string[] = [];

  Object.entries(properties).forEach(([property, value]) => {
    if (isColorModeValues(value)) {
      const colorModeValue = value as ColorModeValues;
      
      // Use light mode as base, fallback to first available value
      const baseValue = colorModeValue.light || 
                       colorModeValue.dark || 
                       colorModeValue['high-contrast'];
      
      if (baseValue) {
        baseCSS.push(`  ${property}: ${baseValue};`);
      }
      
      // Add mode-specific overrides
      if (colorModeValue.light && colorModeValue.light !== baseValue) {
        lightModeCSS.push(`    ${property}: ${colorModeValue.light};`);
      }
      
      if (colorModeValue.dark) {
        darkModeCSS.push(`    ${property}: ${colorModeValue.dark};`);
      }
      
      if (colorModeValue['high-contrast']) {
        highContrastCSS.push(`    ${property}: ${colorModeValue['high-contrast']};`);
      }
    } else {
      // Regular property - add to base CSS
      if (value !== undefined && value !== null && value !== '') {
        baseCSS.push(`  ${property}: ${value};`);
      }
    }
  });

  return {
    baseCSS: baseCSS.length > 0 ? `${selector} {\n${baseCSS.join('\n')}\n}` : '',
    lightModeCSS: lightModeCSS.length > 0 ? `  ${selector} {\n${lightModeCSS.join('\n')}\n  }` : '',
    darkModeCSS: darkModeCSS.length > 0 ? `  ${selector} {\n${darkModeCSS.join('\n')}\n  }` : '',
    highContrastCSS: highContrastCSS.length > 0 ? `  ${selector} {\n${highContrastCSS.join('\n')}\n  }` : '',
  };
}

/**
 * Combines multiple ColorModeCSS objects and generates final CSS with media queries
 */
export function combineColorModeCSS(cssObjects: ColorModeCSS[]): string {
  const sections: string[] = [];
  
  // Base CSS
  const baseCSSRules = cssObjects.map(css => css.baseCSS).filter(Boolean);
  if (baseCSSRules.length > 0) {
    sections.push(...baseCSSRules);
  }
  
  // Light mode CSS
  const lightModeRules = cssObjects.map(css => css.lightModeCSS).filter(Boolean);
  if (lightModeRules.length > 0) {
    sections.push(
      '@media (prefers-color-scheme: light) {',
      ...lightModeRules,
      '}'
    );
  }
  
  // Dark mode CSS
  const darkModeRules = cssObjects.map(css => css.darkModeCSS).filter(Boolean);
  if (darkModeRules.length > 0) {
    sections.push(
      '@media (prefers-color-scheme: dark) {',
      ...darkModeRules,
      '}'
    );
    
    // Also add explicit .dark class support
    sections.push(
      '.dark {',
      ...darkModeRules.map(rule => rule.replace(/^  /, '')),
      '}'
    );
  }
  
  // High contrast CSS
  const highContrastRules = cssObjects.map(css => css.highContrastCSS).filter(Boolean);
  if (highContrastRules.length > 0) {
    sections.push(
      '@media (prefers-contrast: more) {',
      ...highContrastRules,
      '}'
    );
    
    // Also add explicit .high-contrast class support
    sections.push(
      '.high-contrast {',
      ...highContrastRules.map(rule => rule.replace(/^  /, '')),
      '}'
    );
  }
  
  return sections.join('\n\n');
}

/**
 * Generates CSS property string from element properties, handling mode-specific colors
 */
export function generateCSSPropertiesWithColorModes(properties: Record<string, any>): string {
  const cssProperties: string[] = [];
  const modeSpecificProperties: Record<string, any> = {};
  
  Object.entries(properties).forEach(([property, value]) => {
    if (isColorModeValues(value)) {
      modeSpecificProperties[property] = value;
    } else if (value !== undefined && value !== null && value !== '') {
      // Handle standard CSS properties
      const cssProperty = convertToCSSProperty(property);
      cssProperties.push(`    ${cssProperty}: ${value};`);
    }
  });
  
  // If we have mode-specific properties, we'll need special handling
  if (Object.keys(modeSpecificProperties).length > 0) {
    // For now, just use the light mode or first available value for inline styles
    // The full media query generation will be handled by the parent function
    Object.entries(modeSpecificProperties).forEach(([property, colorModeValue]) => {
      const value = colorModeValue.light || colorModeValue.dark || colorModeValue['high-contrast'];
      if (value) {
        const cssProperty = convertToCSSProperty(property);
        cssProperties.push(`    ${cssProperty}: ${value};`);
      }
    });
  }
  
  return cssProperties.join('\n');
}

/**
 * Convert camelCase property names to kebab-case CSS properties
 */
function convertToCSSProperty(property: string): string {
  return property.replace(/([A-Z])/g, '-$1').toLowerCase();
}