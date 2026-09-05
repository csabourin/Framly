import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { store, type RootState } from '../../../store';
import { selectCurrentElements, selectSelectedElement } from '../../../store/selectors';
import { updateElement } from '../../../store/canvasSlice';
import { updateCustomClass } from '../../../store/classSlice';
import { flushPendingHistory } from '../../../utils/historyIntegration';
import { breakpointStyleUpdate } from '../../../utils/styleEditing';
import type { CanvasElement } from '../../../types/canvas';
import type { BoxMetrics } from './SelectionOverlay';

const sides = ['top', 'right', 'bottom', 'left'] as const;
type Side = typeof sides[number];
type Kind = 'padding' | 'margin';
const propertyName = (kind: Kind, side: Side) => `${kind}${side[0].toUpperCase()}${side.slice(1)}`;
const cssName = (property: string) => property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

/** Ask CSS which declaration supplies this physical side, including shorthands. */
function sourceFor(element: CanvasElement, property: string, state: RootState) {
  let source = { className: '', value: '' };
  const probe = document.createElement('div').style;
  const layers = [
    { className: '', styles: element.styles },
    ...(element.classes || []).map((className) => ({ className, styles: state.classes.customClasses[className]?.styles })),
  ];
  for (const layer of layers) {
    probe.cssText = '';
    for (const [key, value] of Object.entries(layer.styles || {})) {
      if (typeof value === 'string' || typeof value === 'number') probe.setProperty(cssName(key), typeof value === 'number' ? `${value}px` : value);
    }
    const value = probe.getPropertyValue(cssName(property));
    if (value) source = { className: layer.className, value };
  }
  const order = ['mobile', 'tablet', 'desktop', 'large'];
  for (const breakpoint of order.slice(0, order.indexOf(state.canvas.project.currentBreakpoint) + 1)) {
    probe.cssText = '';
    for (const [key, value] of Object.entries(element.responsiveStyles?.[breakpoint as keyof typeof element.responsiveStyles] || {})) {
      if (typeof value === 'string' || typeof value === 'number') probe.setProperty(cssName(key), typeof value === 'number' ? `${value}px` : value);
    }
    const value = probe.getPropertyValue(cssName(property));
    if (value) source = { className: '', value };
  }
  return source;
}

interface Gesture {
  pointerId: number;
  start: number;
  initial: number;
  value: number;
  property: string;
  kind: Kind;
  side: Side;
  className: string;
  preview: HTMLStyleElement;
  selector: string;
  frame: number;
}

export default function SpacingHandles({ metrics, zoomLevel, onMeasure }: {
  metrics: BoxMetrics;
  zoomLevel: number;
  onMeasure: () => void;
}) {
  const { t } = useTranslation();
  const element = useSelector(selectSelectedElement);
  const elements = useSelector(selectCurrentElements);
  const breakpoint = useSelector((state: RootState) => state.canvas.project.currentBreakpoint);
  const classes = useSelector((state: RootState) => state.classes.customClasses);
  const tabs = useSelector((state: RootState) => state.canvas.project.tabs);
  const gesture = useRef<Gesture | null>(null);
  const [active, setActive] = useState('');
  const [notice, setNotice] = useState('');
  const scope = breakpoint === 'mobile' ? t('spacing.baseScope') : t('spacing.overrideScope', { breakpoint: t(`breakpoints.${breakpoint}`) });
  // Provenance and affected elements depend on the document, not each pointer frame.
  const controls = useMemo(() => element ? (['padding', 'margin'] as const).flatMap((kind) => sides.map((side) => {
    const property = propertyName(kind, side);
    const source = sourceFor(element, property, store.getState());
    const className = breakpoint === 'mobile' ? source.className : '';
    const affected = className ? Object.values(tabs).flatMap((tab) => Object.values(tab.elements))
      .filter((item) => item.classes?.includes(className)).length : 1;
    return { kind, side, property, source, className, affected };
  })) : [], [element, breakpoint, classes, tabs]);

  const cancel = () => {
    if (!gesture.current) return;
    cancelAnimationFrame(gesture.current.frame);
    gesture.current.preview.remove();
    gesture.current = null;
    setActive('');
    onMeasure();
  };

  useLayoutEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && gesture.current) {
        event.preventDefault();
        event.stopImmediatePropagation();
        cancel();
      }
    };
    window.addEventListener('keydown', escape, true);
    window.addEventListener('blur', cancel);
    return () => {
      window.removeEventListener('keydown', escape, true);
      window.removeEventListener('blur', cancel);
      if (gesture.current) {
        cancelAnimationFrame(gesture.current.frame);
        gesture.current.preview.remove();
        gesture.current = null;
      }
    };
  }, [element?.id, breakpoint, zoomLevel]);

  if (!element || element.type === 'component') return null;

  const helpFor = ({ kind, side, source, className, affected }: typeof controls[number]) => {
    const ownership = className ? t('spacing.classScope', { name: className, count: affected }) : t('spacing.elementScope');
    const label = t(`spacing.${kind}`, { side: t(`spacing.${side}`) });
    return `${label} · ${source.value || '0px'} → ${metrics[kind][side]}px. ${ownership}. ${scope}. ${t('spacing.help')}${kind === 'margin' ? ` ${t('spacing.marginNote')}` : ''}`;
  };
  const inspected = controls.find((control) => control.property === (active || notice));
  const helpDock = document.getElementById('canvas-measurement-help');
  const currentValue = (property: string, fallback: number) => {
    const node = document.querySelector<HTMLElement>(`[data-canvas="true"] [data-element-id="${CSS.escape(element.id)}"]`);
    return node ? Number.parseFloat(getComputedStyle(node).getPropertyValue(cssName(property))) || 0 : fallback;
  };

  const commit = (property: string, value: number, className: string) => {
    const state = store.getState();
    const current = selectSelectedElement(state);
    if (!current || current.id !== element.id) return;
    flushPendingHistory();
    if (breakpoint !== 'mobile') {
      store.dispatch(updateElement({ id: current.id, updates: breakpointStyleUpdate(current, property, `${value}px`, breakpoint) }));
    } else if (className) {
      const styles = { ...state.classes.customClasses[className].styles };
      delete styles[property];
      styles[property] = `${value}px`;
      store.dispatch(updateCustomClass({ name: className, styles }));
    } else {
      const styles = { ...current.styles };
      delete styles[property];
      styles[property] = `${value}px`;
      store.dispatch(updateElement({ id: current.id, updates: { styles } }));
    }
    // A completed gesture is a history boundary, independent of its duration.
    flushPendingHistory();
    onMeasure();
  };

  const move = (event: React.PointerEvent) => {
    const drag = gesture.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    const coordinate = drag.side === 'left' || drag.side === 'right' ? event.clientX : event.clientY;
    const direction = (drag.side === 'top' || drag.side === 'left' ? 1 : -1) * (drag.kind === 'padding' ? 1 : -1);
    const next = Math.round(drag.initial + (coordinate - drag.start) / zoomLevel * direction);
    drag.value = drag.kind === 'padding' ? Math.max(0, next) : next;
    if (drag.frame) return;
    drag.frame = requestAnimationFrame(() => {
      drag.frame = 0;
      drag.preview.textContent = `${drag.selector} { ${cssName(drag.property)}: ${drag.value}px !important; }`;
      onMeasure();
    });
  };

  return <div className="spacing-controls" role="group" aria-label={t('spacing.controls')}
    onMouseDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}
    onDoubleClick={(event) => event.stopPropagation()} onKeyDown={(event) => {
      if (event.defaultPrevented || gesture.current) event.stopPropagation();
    }}>
    {controls.map((control) => {
      const { kind, side, property, className } = control;
      const label = t(`spacing.${kind}`, { side: t(`spacing.${side}`) });
      const help = helpFor(control);
      const outer = kind === 'padding' ? metrics.paddingBox : metrics.marginBox;
      const inner = kind === 'padding' ? metrics.contentBox : metrics.borderBox;
      const horizontal = side === 'top' || side === 'bottom';
      const offset = kind === 'padding' ? -1 : 1;
      const x = horizontal ? inner.x + inner.width / 2 + offset * Math.max(inner.width * 0.1, 14 / zoomLevel) : side === 'left' ? (outer.x + inner.x) / 2 : (outer.x + outer.width + inner.x + inner.width) / 2;
      const y = !horizontal ? inner.y + inner.height / 2 + offset * Math.max(inner.height * 0.1, 14 / zoomLevel) : side === 'top' ? (outer.y + inner.y) / 2 : (outer.y + outer.height + inner.y + inner.height) / 2;
      const halfHandle = 12 / zoomLevel;
      return <button key={property} type="button" role="spinbutton"
        className={`spacing-handle spacing-handle-${kind}`} data-testid={`spacing-${kind}-${side}`}
        aria-label={label} aria-valuenow={metrics[kind][side]} aria-valuemin={kind === 'padding' ? 0 : undefined}
        aria-valuetext={`${metrics[kind][side]}px`} aria-describedby="spacing-help"
        style={{ left: Math.max(halfHandle, Math.min(x, metrics.canvasWidth - halfHandle)), top: Math.max(halfHandle, Math.min(y, metrics.canvasHeight - halfHandle)), transform: `translate(-50%, -50%) scale(${1 / zoomLevel})`, cursor: horizontal ? 'ns-resize' : 'ew-resize' }}
        onFocus={() => setNotice(property)} onMouseEnter={() => setNotice(property)}
        onBlur={() => setNotice('')}
        onMouseLeave={(event) => { if (document.activeElement !== event.currentTarget) setNotice(''); }}
        onPointerDown={(event) => {
          if (event.button !== 0 || gesture.current) return;
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.focus({ preventScroll: true });
          event.currentTarget.setPointerCapture(event.pointerId);
          flushPendingHistory();
          const preview = document.createElement('style');
          document.head.append(preview);
          const targets = className ? Object.values(elements).filter((item) => sourceFor(item, property, store.getState()).className === className) : [element];
          const initial = currentValue(property, metrics[kind][side]);
          gesture.current = { pointerId: event.pointerId, start: horizontal ? event.clientY : event.clientX,
            initial, value: initial, property, kind, side, className, preview, frame: 0,
            selector: targets.map((item) => `[data-canvas="true"] [data-element-id="${CSS.escape(item.id)}"]`).join(',') };
          setActive(property);
          setNotice(property);
        }}
        onPointerMove={move}
        onPointerUp={(event) => {
          const drag = gesture.current;
          if (!drag || drag.pointerId !== event.pointerId) return;
          move(event);
          const { value, initial } = drag;
          cancel();
          if (value !== initial) commit(property, value, drag.className);
        }}
        onPointerCancel={cancel} onLostPointerCapture={cancel}
        onKeyDown={(event) => {
          if (gesture.current || event.ctrlKey || event.metaKey || event.altKey || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home'].includes(event.key)) return;
          event.preventDefault();
          const delta = (['ArrowUp', 'ArrowRight'].includes(event.key) ? 1 : -1) * (event.shiftKey ? 10 : 1);
          const initial = currentValue(property, metrics[kind][side]);
          const next = event.key === 'Home' ? 0 : Math.round(initial + delta);
          const value = kind === 'padding' ? Math.max(0, next) : next;
          if (value !== initial) commit(property, value, className);
          setNotice(property);
        }}
      >{kind === 'padding' ? 'P' : 'M'}</button>;
    })}
    {helpDock && createPortal(<div id="spacing-help" className="spacing-help" hidden={!inspected}>
      {inspected ? helpFor(inspected) : `${t('spacing.intro')} ${scope}. ${t('spacing.help')}`}
    </div>, helpDock)}
  </div>;
}
