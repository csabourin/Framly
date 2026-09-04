import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { withHistoryGroup } from '../../utils/historyIntegration';

const VALUES = [0, 4, 8, 12, 16, 24, 32, 48];
export const isSpacingProperty = (property: string) => /^(padding|margin)(Top|Right|Bottom|Left)?$/.test(property) || ['gap', 'rowGap', 'columnGap'].includes(property);

/** Presets never rewrite an existing custom value until the user selects one. */
export default function SpacingScale({ property, label, value, onChange, describedBy, children }: {
  property: string;
  label: string;
  value: unknown;
  onChange: (value: string) => void;
  describedBy?: string;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const [custom, setCustom] = useState(false);
  const current = typeof value === 'number' ? `${value}px` : String(value ?? '');
  const parts = current.trim().split(/\s+/);
  const uniform = parts.every((part) => part === parts[0]) ? parts[0] : current;
  const preset = VALUES.find((number) => uniform === `${number}px` || (number === 0 && uniform === '0'));
  return <div className="spacing-scale" role="group" aria-label={t('spacingScale.label', { label })}
    aria-describedby={describedBy} data-testid={`spacing-scale-${property}`}>
    <div className="spacing-scale-options">
      {VALUES.map((number) => <button key={number} type="button" aria-pressed={preset === number}
        aria-label={`${label} · ${number}px`} aria-describedby={describedBy}
        data-testid={`spacing-preset-${property}-${number}`}
        onClick={() => {
          if (preset !== number) withHistoryGroup(`${label}: ${number}px`, () => onChange(`${number}px`));
          setCustom(false);
        }}>{number}</button>)}
    </div>
    <button type="button" className="spacing-custom-toggle" aria-expanded={custom}
      data-testid={`spacing-custom-${property}`} onClick={() => setCustom(!custom)}>
      {t('spacingScale.custom')}{preset === undefined && current ? ` · ${current}` : ''}
    </button>
    {custom && children}
  </div>;
}
