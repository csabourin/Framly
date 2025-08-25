// Unit persistence utilities for CSS properties
import { CanvasElement } from '../types/canvas';
import { CustomClass } from '../store/classSlice';

/**
 * Enhanced CSS value storage that includes unit information
 */
export interface CSSValueWithUnit {
  value: string | number;
  unit: string;
  rawValue?: string; // The full CSS value (e.g., "100px")
}

/**
 * Per-element, per-property unit preferences
 */
export interface ElementUnitPreferences {
  [elementId: string]: {
    [propertyName: string]: string; // e.g., { "width": "rem", "height": "vh" }
  };
}

/**
 * Global unit preferences per property type
 */
export interface GlobalUnitPreferences {
  [propertyName: string]: string;
}

// Default unit preferences for different property types
const DEFAULT_UNITS: GlobalUnitPreferences = {
  // Layout units
  width: 'px',
  height: 'px',
  top: 'px',
  right: 'px',
  bottom: 'px',
  left: 'px',
  
  // Typography units
  fontSize: 'px',
  lineHeight: 'px',
  letterSpacing: 'px',
  
  // Spacing units
  margin: 'px',
  marginTop: 'px',
  marginRight: 'px',
  marginBottom: 'px',
  marginLeft: 'px',
  padding: 'px',
  paddingTop: 'px',
  paddingRight: 'px',
  paddingBottom: 'px',
  paddingLeft: 'px',
  
  // Border units
  borderWidth: 'px',
  borderTopWidth: 'px',
  borderRightWidth: 'px',
  borderBottomWidth: 'px',
  borderLeftWidth: 'px',
  borderRadius: 'px',
  borderTopLeftRadius: 'px',
  borderTopRightRadius: 'px',
  borderBottomLeftRadius: 'px',
  borderBottomRightRadius: 'px',
  
  // Grid/Flex units
  gap: 'px',
  gridGap: 'px',
  rowGap: 'px',
  columnGap: 'px',
  
  // Other layout units
  minWidth: 'px',
  maxWidth: 'px',
  minHeight: 'px',
  maxHeight: 'px',
};

// In-memory storage for unit preferences (will be enhanced with IndexedDB persistence)
let elementUnitPreferences: ElementUnitPreferences = {};
let globalUnitPreferences: GlobalUnitPreferences = { ...DEFAULT_UNITS };

/**
 * Parse a CSS value into its numeric value and unit
 */
export function parseValueAndUnit(cssValue: string | number | null | undefined): { value: string; unit: string } {
  if (!cssValue && cssValue !== 0) return { value: '', unit: 'px' };
  
  const strValue = String(cssValue);
  const match = strValue.match(/^([+-]?\d*\.?\d*)(.*)/);
  
  if (match) {
    const [, value, unit] = match;
    return {
      value: value || '',
      unit: unit || 'px'
    };
  }
  
  return { value: strValue, unit: '' };
}

/**
 * Format a value with a unit, avoiding duplicate units
 */
export function formatValueWithUnit(value: string | number, unit?: string): string {
  if (!value && value !== 0) return '';
  if (!unit) return String(value);
  
  // Don't add unit if value already has one
  const strValue = String(value);
  if (strValue.match(/\d+(px|%|em|rem|vh|vw|pt|auto|fr)$/)) {
    return strValue;
  }
  
  return `${value}${unit}`;
}

/**
 * Get the active unit for a property on a specific element
 * Resolution order:
 * 1. Stored value's unit (if value has explicit unit)
 * 2. Element-specific unit preference 
 * 3. Class-specific unit preference
 * 4. Global unit preference for property type
 * 5. Default fallback (px)
 */
export function getActiveUnit(
  propertyName: string, 
  elementId: string, 
  element?: CanvasElement,
  customClasses?: Record<string, CustomClass>,
  availableUnits?: string[]
): string {
  // 1. Check if current value has an explicit unit
  if (element) {
    // Check element's direct styles first
    const elementValue = element.styles?.[propertyName];
    if (elementValue) {
      const parsed = parseValueAndUnit(elementValue);
      if (parsed.unit && parsed.unit !== '') {
        return parsed.unit;
      }
    }
    
    // Check custom class styles
    if (element.classes && customClasses) {
      for (const className of element.classes) {
        const customClass = customClasses[className];
        if (customClass?.styles?.[propertyName]) {
          const parsed = parseValueAndUnit(customClass.styles[propertyName]);
          if (parsed.unit && parsed.unit !== '') {
            return parsed.unit;
          }
        }
      }
    }
  }
  
  // 2. Check element-specific unit preference
  const elementPrefs = elementUnitPreferences[elementId];
  if (elementPrefs?.[propertyName]) {
    const unit = elementPrefs[propertyName];
    // Validate unit is in available units list
    if (!availableUnits || availableUnits.includes(unit)) {
      return unit;
    }
  }
  
  // 3. Check global unit preference for this property type
  const globalPref = globalUnitPreferences[propertyName];
  if (globalPref) {
    // Validate unit is in available units list
    if (!availableUnits || availableUnits.includes(globalPref)) {
      return globalPref;
    }
  }
  
  // 4. Check default units lookup
  const defaultUnit = DEFAULT_UNITS[propertyName];
  if (defaultUnit) {
    // Validate unit is in available units list
    if (!availableUnits || availableUnits.includes(defaultUnit)) {
      return defaultUnit;
    }
  }
  
  // 5. Fallback to first available unit or 'px'
  if (availableUnits && availableUnits.length > 0) {
    return availableUnits[0];
  }
  
  return 'px';
}

/**
 * Set unit preference for a specific element and property
 */
export function setElementUnitPreference(elementId: string, propertyName: string, unit: string): void {
  if (!elementUnitPreferences[elementId]) {
    elementUnitPreferences[elementId] = {};
  }
  elementUnitPreferences[elementId][propertyName] = unit;
  
  // TODO: Persist to IndexedDB
  persistUnitPreferences();
}

/**
 * Set global unit preference for a property type
 */
export function setGlobalUnitPreference(propertyName: string, unit: string): void {
  globalUnitPreferences[propertyName] = unit;
  
  // TODO: Persist to IndexedDB
  persistUnitPreferences();
}

/**
 * Get all unit preferences for an element
 */
export function getElementUnitPreferences(elementId: string): Record<string, string> {
  return elementUnitPreferences[elementId] || {};
}

/**
 * Remove unit preferences for a deleted element
 */
export function removeElementUnitPreferences(elementId: string): void {
  delete elementUnitPreferences[elementId];
  persistUnitPreferences();
}

/**
 * Load unit preferences from storage
 */
export function loadUnitPreferences(data: {
  elementPrefs?: ElementUnitPreferences;
  globalPrefs?: GlobalUnitPreferences;
}): void {
  if (data.elementPrefs) {
    elementUnitPreferences = data.elementPrefs;
  }
  if (data.globalPrefs) {
    globalUnitPreferences = { ...DEFAULT_UNITS, ...data.globalPrefs };
  }
}

/**
 * Get all unit preferences for export/backup
 */
export function exportUnitPreferences(): {
  elementPrefs: ElementUnitPreferences;
  globalPrefs: GlobalUnitPreferences;
} {
  return {
    elementPrefs: elementUnitPreferences,
    globalPrefs: globalUnitPreferences
  };
}

/**
 * Persist unit preferences to storage (placeholder for IndexedDB implementation)
 */
async function persistUnitPreferences(): Promise<void> {
  // This will be implemented when we add IndexedDB persistence
  // For now, preferences are stored in memory only
  console.log('Unit preferences updated:', {
    elementPrefs: Object.keys(elementUnitPreferences).length,
    globalPrefs: Object.keys(globalUnitPreferences).length
  });
}

/**
 * Create a CSS value with unit information that can be stored in classes
 */
export function createValueWithUnit(value: string | number, unit: string): CSSValueWithUnit {
  return {
    value: value,
    unit: unit,
    rawValue: formatValueWithUnit(value, unit)
  };
}

/**
 * Extract the raw CSS value from a value with unit object
 */
export function extractRawValue(valueWithUnit: CSSValueWithUnit | string | number): string {
  if (typeof valueWithUnit === 'object' && valueWithUnit !== null && 'rawValue' in valueWithUnit) {
    return valueWithUnit.rawValue || formatValueWithUnit(valueWithUnit.value, valueWithUnit.unit);
  }
  return String(valueWithUnit);
}

/**
 * Check if a value is a CSSValueWithUnit object
 */
export function isValueWithUnit(value: any): value is CSSValueWithUnit {
  return value && typeof value === 'object' && 'value' in value && 'unit' in value;
}