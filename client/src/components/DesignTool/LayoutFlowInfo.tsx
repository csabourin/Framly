import { useLayoutEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import type { RootState } from '../../store';
import type { CanvasElement } from '../../types/canvas';
import { readLayoutFlow, type LayoutFlow } from '../../utils/layoutFlow';

export default function LayoutFlowInfo({ element, onInspect }: {
  element: CanvasElement;
  onInspect: (id: string, property: string) => void;
}) {
  const { t } = useTranslation();
  const [flow, setFlow] = useState<LayoutFlow | null>(null);
  const context = useSelector((state: RootState) => `${state.canvas.project.activeTabId}:${state.canvas.project.currentBreakpoint}`);

  useLayoutEffect(() => {
    const root = document.querySelector<HTMLElement>('[data-testid="canvas-root"]');
    if (!root) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const node = element.id === 'root' ? root : root.querySelector<HTMLElement>(`[data-element-id="${CSS.escape(element.id)}"]`);
        const next = node ? readLayoutFlow(node, root) : null;
        setFlow((previous) => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
      });
    };
    measure();
    // Style/class changes include shared rules, breakpoint rerenders and previews.
    const observer = new MutationObserver(measure);
    observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['style', 'class'] });
    const styles = new MutationObserver(measure);
    styles.observe(document.head, { subtree: true, childList: true, characterData: true });
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); styles.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [element.id, context]);

  if (!flow) return null;
  const flex = /flex/.test(flow.parentDisplay);
  const grid = /grid/.test(flow.parentDisplay);
  const parentProperty = flex ? 'flexDirection' : grid ? 'gridTemplateColumns' : 'display';
  const parentDescription = flex ? t(flow.flexDirection.startsWith('row') ? 'flow.parentRow' : 'flow.parentColumn')
    : grid ? t(flow.gridAutoFlow.startsWith('column') ? 'flow.parentGridColumns' : 'flow.parentGridRows')
    : /^(block|flow-root|inline-block)$/.test(flow.parentDisplay) ? t('flow.parentBlock') : t('flow.parentOther', { display: flow.parentDisplay });
  const arrows = { left: '←', right: '→', up: '↑', down: '↓' };
  const normal = flow.kind === 'normal';
  const property = flow.kind === 'hidden' || flow.kind === 'contents' ? 'display' : flow.kind === 'float' ? 'float' : 'position';

  return <section className="layout-flow-info" aria-label={t('flow.title')} data-testid="layout-flow-info">
    <h3>{t('flow.title')}</h3>
    <button type="button" className="flow-explanation" data-testid="flow-position"
      onClick={() => onInspect(flow.hiddenById || element.id, property)}>
      <span>{t(`flow.${flow.kind}`)}</span>
      <code>{flow.kind === 'hidden' || flow.kind === 'contents' ? `display: ${flow.kind === 'hidden' ? 'none' : 'contents'}` : flow.kind === 'float' ? `float: ${flow.float}` : `position: ${flow.position}`}</code>
      <span className="flow-action">{t('flow.inspectPosition')}</span>
    </button>
    {normal && flow.position === 'sticky' && <p>{t('flow.sticky')}</p>}
    {normal && flow.position === 'relative' && flow.offset && <p>{t('flow.relative')}</p>}
    {normal && flow.transformed && <p>{t('flow.transformed')}</p>}
    {flow.parentId && <button type="button" className="flow-explanation" data-testid="flow-parent"
      onClick={() => onInspect(flow.parentId!, parentProperty)}>
      <span>{parentDescription}</span>
      {flex && flow.arrow && <span>{arrows[flow.arrow]} {t(`flow.${flow.arrow}`)}</span>}
      <code>{flex ? `display: ${flow.parentDisplay}; flex-direction: ${flow.flexDirection}`
        : grid ? `display: ${flow.parentDisplay}; grid-auto-flow: ${flow.gridAutoFlow}` : `display: ${flow.parentDisplay}`}</code>
      <span className="flow-action">{t('flow.selectParent')}</span>
    </button>}
    {flow.parentId && !normal && flow.kind !== 'contents' && <p>{t('flow.parentDoesNotPlace')}</p>}
    {normal && flex && <p>{t(flow.flexWrap === 'nowrap' ? 'flow.noWrap' : 'flow.wrap')}</p>}
    {normal && (flex || grid) && flow.order !== '0' && <p>{t('flow.order', { order: flow.order })}</p>}
    {normal && grid && flow.gridPlacement && <p>{t('flow.gridPlacement')}</p>}
    <p className="flow-scope">{t('flow.scope')}</p>
  </section>;
}
