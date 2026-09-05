import React, { useCallback, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import SpacingHandles from './SpacingHandles';

interface SelectionOverlayProps {
  selectedElementId: string | null;
  hoveredElementId: string | null;
  zoomLevel: number;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Edges {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface BoxMetrics {
  canvasWidth: number;
  canvasHeight: number;
  marginBox: Rect;
  borderBox: Rect;
  paddingBox: Rect;
  contentBox: Rect;
  margin: Edges;
  border: Edges;
  padding: Edges;
}

const px = (value: string) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const rounded = (value: number) => Math.round(value * 10) / 10;
const formatLength = (value: number) => `${rounded(value)}px`;

const formatEdges = ({ top, right, bottom, left }: Edges) => {
  const values = [top, right, bottom, left].map(rounded);
  if (values.every((value) => value === values[0])) return formatLength(values[0]);
  if (values[0] === values[2] && values[1] === values[3]) {
    return `${formatLength(values[0])} ${formatLength(values[1])}`;
  }
  if (values[1] === values[3]) {
    return `${formatLength(values[0])} ${formatLength(values[1])} ${formatLength(values[2])}`;
  }
  return values.map(formatLength).join(' ');
};

const compactEdges = (edges: Edges) => formatEdges(edges).replaceAll('px', '');

const insetRect = (rect: Rect, edges: Edges): Rect => ({
  x: rect.x + edges.left,
  y: rect.y + edges.top,
  width: Math.max(0, rect.width - edges.left - edges.right),
  height: Math.max(0, rect.height - edges.top - edges.bottom),
});

const findCanvasElement = (canvas: HTMLElement, elementId: string | null) => {
  if (!elementId || elementId === 'root') return null;
  return [...canvas.querySelectorAll<HTMLElement>('[data-element-id]')]
    .find((element) => element.dataset.elementId === elementId) ?? null;
};

const readRect = (element: HTMLElement, canvas: HTMLElement, zoomLevel: number): Rect => {
  const rect = element.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  const scale = zoomLevel || 1;
  const originX = canvasRect.left + canvas.clientLeft * scale;
  const originY = canvasRect.top + canvas.clientTop * scale;

  return {
    x: (rect.left - originX) / scale,
    y: (rect.top - originY) / scale,
    width: rect.width / scale,
    height: rect.height / scale,
  };
};

const readBoxMetrics = (element: HTMLElement, canvas: HTMLElement, zoomLevel: number): BoxMetrics => {
  const style = getComputedStyle(element);
  const margin = {
    top: px(style.marginTop),
    right: px(style.marginRight),
    bottom: px(style.marginBottom),
    left: px(style.marginLeft),
  };
  const border = {
    top: px(style.borderTopWidth),
    right: px(style.borderRightWidth),
    bottom: px(style.borderBottomWidth),
    left: px(style.borderLeftWidth),
  };
  const padding = {
    top: px(style.paddingTop),
    right: px(style.paddingRight),
    bottom: px(style.paddingBottom),
    left: px(style.paddingLeft),
  };
  const borderBox = readRect(element, canvas, zoomLevel);
  const positiveMargin: Edges = {
    top: Math.max(0, margin.top),
    right: Math.max(0, margin.right),
    bottom: Math.max(0, margin.bottom),
    left: Math.max(0, margin.left),
  };
  const marginBox = {
    x: borderBox.x - positiveMargin.left,
    y: borderBox.y - positiveMargin.top,
    width: borderBox.width + positiveMargin.left + positiveMargin.right,
    height: borderBox.height + positiveMargin.top + positiveMargin.bottom,
  };
  const paddingBox = insetRect(borderBox, border);
  const contentBox = insetRect(paddingBox, padding);

  return {
    canvasWidth: canvas.clientWidth,
    canvasHeight: canvas.clientHeight,
    marginBox,
    borderBox,
    paddingBox,
    contentBox,
    margin,
    border,
    padding,
  };
};

interface BoxLayerProps {
  name: 'margin' | 'border' | 'padding' | 'content';
  outer: Rect;
  inner?: Rect;
}

const BoxLayer = ({ name, outer, inner }: BoxLayerProps) => {
  const band = (side: string, style: React.CSSProperties) => (
    <span key={side} className="box-model-band" style={style} />
  );
  const bands: React.ReactNode[] = [];

  if (inner) {
    const top = Math.max(0, inner.y - outer.y);
    const right = Math.max(0, outer.x + outer.width - inner.x - inner.width);
    const bottom = Math.max(0, outer.y + outer.height - inner.y - inner.height);
    const left = Math.max(0, inner.x - outer.x);

    if (top > 0) bands.push(band('top', { inset: '0 0 auto 0', height: top }));
    if (right > 0) bands.push(band('right', { inset: `${top}px 0 ${bottom}px auto`, width: right }));
    if (bottom > 0) bands.push(band('bottom', { inset: 'auto 0 0 0', height: bottom }));
    if (left > 0) bands.push(band('left', { inset: `${top}px auto ${bottom}px 0`, width: left }));
  }

  return (
    <div
      className={`box-model-layer box-model-${name}`}
      data-testid={`box-model-${name}`}
      style={{ left: outer.x, top: outer.y, width: outer.width, height: outer.height }}
    >
      {inner ? bands : <span className="box-model-band box-model-content-fill" />}
    </div>
  );
};

/** Draws the browser box model over the selected element in canvas coordinates. */
const SelectionOverlay: React.FC<SelectionOverlayProps> = ({
  selectedElementId,
  hoveredElementId,
  zoomLevel,
}) => {
  const [metrics, setMetrics] = useState<BoxMetrics | null>(null);
  const [hoverBounds, setHoverBounds] = useState<Rect | null>(null);
  const [measurementVersion, setMeasurementVersion] = useState(0);
  const measureSpacing = useCallback(() => setMeasurementVersion((version) => version + 1), []);
  const context = useSelector((state: RootState) => `${state.canvas.project.activeTabId}:${state.canvas.project.currentBreakpoint}`);

  useLayoutEffect(() => {
    const canvas = document.querySelector<HTMLElement>('[data-canvas="true"]');
    if (!canvas) return;

    const selected = findCanvasElement(canvas, selectedElementId);
    const hovered = hoveredElementId !== selectedElementId
      ? findCanvasElement(canvas, hoveredElementId)
      : null;
    let frame = 0;

    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setMetrics(selected ? readBoxMetrics(selected, canvas, zoomLevel) : null);
        setHoverBounds(hovered ? readRect(hovered, canvas, zoomLevel) : null);
      });
    };

    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(canvas);
    if (selected) resizeObserver.observe(selected);
    if (hovered) resizeObserver.observe(hovered);

    const mutationObserver = new MutationObserver(measure);
    mutationObserver.observe(canvas, { attributes: true, attributeFilter: ['style', 'class'] });
    if (selected) mutationObserver.observe(selected, { attributes: true, attributeFilter: ['style', 'class'] });
    if (hovered) mutationObserver.observe(hovered, { attributes: true, attributeFilter: ['style', 'class'] });

    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [selectedElementId, hoveredElementId, zoomLevel, context, measurementVersion]);

  const summary = metrics
    ? `Box model: margin ${formatEdges(metrics.margin)}; border ${formatEdges(metrics.border)}; padding ${formatEdges(metrics.padding)}; content ${formatLength(metrics.contentBox.width)} by ${formatLength(metrics.contentBox.height)}`
    : undefined;
  const labelDock = document.getElementById('canvas-measurement-labels');

  return (
    <>
      {hoverBounds && (
        <div
          className="box-model-hover-outline"
          style={{ left: hoverBounds.x, top: hoverBounds.y, width: hoverBounds.width, height: hoverBounds.height }}
        />
      )}
      {metrics && (
        <div className="box-model-overlay" data-testid="box-model-overlay" role="img" aria-label={summary}>
          <BoxLayer name="margin" outer={metrics.marginBox} inner={metrics.borderBox} />
          <BoxLayer name="border" outer={metrics.borderBox} inner={metrics.paddingBox} />
          <BoxLayer name="padding" outer={metrics.paddingBox} inner={metrics.contentBox} />
          <BoxLayer name="content" outer={metrics.contentBox} />
          <div
            className="box-model-selection-edge"
            style={{
              left: metrics.borderBox.x,
              top: metrics.borderBox.y,
              width: metrics.borderBox.width,
              height: metrics.borderBox.height,
            }}
          />
          {labelDock && createPortal(<div className="box-model-labels" aria-hidden="true">
            <span className="box-model-label-margin" data-testid="box-model-label-margin">margin <b>{compactEdges(metrics.margin)}</b></span>
            <span className="box-model-label-border" data-testid="box-model-label-border">border <b>{compactEdges(metrics.border)}</b></span>
            <span className="box-model-label-padding" data-testid="box-model-label-padding">padding <b>{compactEdges(metrics.padding)}</b></span>
            <span className="box-model-label-content" data-testid="box-model-label-content">content <b>{rounded(metrics.contentBox.width)}×{rounded(metrics.contentBox.height)}</b></span>
          </div>, labelDock)}
        </div>
      )}
      {metrics && <SpacingHandles key={`${context}:${selectedElementId}:${zoomLevel}`} metrics={metrics} zoomLevel={zoomLevel} onMeasure={measureSpacing} />}
    </>
  );
};

export default SelectionOverlay;
