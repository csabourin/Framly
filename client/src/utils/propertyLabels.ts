import type { TFunction } from 'i18next';
import type { PropertyConfig } from './propertyConfig';

/** Presentation only: property keys and the style-writing path stay unchanged. */
export function propertyPresentation(config: Pick<PropertyConfig, 'key' | 'label' | 'category'>, t: TFunction) {
  const hasTerm = ['layout', 'spacing', 'flex', 'grid'].includes(config.category) || config.key === 'float';
  const labelKey = config.category === 'grid' && config.key === 'alignItems' ? 'gridAlignItems' : config.key;
  return {
    label: hasTerm ? t(`propertyLabels.${labelKey}`, { defaultValue: config.label }) : config.label,
    term: hasTerm ? config.key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`) : undefined,
  };
}
