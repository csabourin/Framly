export interface LayoutFlow {
  kind: 'root' | 'normal' | 'absolute' | 'fixed' | 'float' | 'hidden' | 'contents';
  position: string;
  display: string;
  float: string;
  parentId: string | null;
  parentDisplay: string;
  flexDirection: string;
  flexWrap: string;
  gridAutoFlow: string;
  direction: string;
  writingMode: string;
  arrow: 'left' | 'right' | 'up' | 'down' | null;
  order: string;
  transformed: boolean;
  gridPlacement: boolean;
  offset: boolean;
  hiddenById: string | null;
}

/** CSS axes, including reversed flex directions and vertical writing. */
export function flowDirection(writingMode: string, direction: string, flexDirection = 'column'): LayoutFlow['arrow'] {
  const rtl = direction === 'rtl';
  let inline: LayoutFlow['arrow'];
  let block: LayoutFlow['arrow'];
  if (writingMode === 'horizontal-tb') {
    inline = rtl ? 'left' : 'right'; block = 'down';
  } else if (['vertical-rl', 'sideways-rl', 'vertical-lr', 'sideways-lr'].includes(writingMode)) {
    inline = (rtl !== (writingMode === 'sideways-lr')) ? 'up' : 'down';
    block = writingMode.endsWith('-rl') ? 'left' : 'right';
  } else return null;
  const axis = flexDirection.startsWith('row') ? inline : block;
  return flexDirection.endsWith('reverse') ? ({ left: 'right', right: 'left', up: 'down', down: 'up' } as const)[axis] : axis;
}

/** Read actual boxes, skipping display:contents ancestors that generate none. */
export function readLayoutFlow(node: HTMLElement, root: HTMLElement): LayoutFlow {
  const own = getComputedStyle(node);
  let hidden = own.display === 'none';
  let hiddenById = hidden ? (node === root ? 'root' : node.dataset.elementId || null) : null;
  for (let ancestor = node.parentElement; ancestor && root.contains(ancestor); ancestor = ancestor.parentElement) {
    if (getComputedStyle(ancestor).display === 'none') {
      hidden = true;
      hiddenById = ancestor === root ? 'root' : ancestor.dataset.elementId || null;
    }
  }
  let parent = node === root ? null : node.parentElement;
  while (parent && root.contains(parent) && getComputedStyle(parent).display === 'contents') parent = parent.parentElement;
  if (parent && !root.contains(parent)) parent = null;
  const layout = parent ? getComputedStyle(parent) : null;
  const parentId = parent === root ? 'root' : parent?.dataset.elementId || null;
  const flexOrGrid = !!layout && /flex|grid/.test(layout.display);
  return {
    kind: hidden ? 'hidden' : own.display === 'contents' ? 'contents' : node === root ? 'root'
      : own.position === 'absolute' ? 'absolute' : own.position === 'fixed' ? 'fixed'
      : own.cssFloat !== 'none' && !flexOrGrid ? 'float' : 'normal',
    position: own.position, display: own.display, float: own.cssFloat,
    parentId, parentDisplay: layout?.display || '',
    flexDirection: layout?.flexDirection || '', flexWrap: layout?.flexWrap || '',
    gridAutoFlow: layout?.gridAutoFlow || '', direction: layout?.direction || '',
    writingMode: layout?.writingMode || '',
    arrow: layout ? flowDirection(layout.writingMode, layout.direction, /flex/.test(layout.display) ? layout.flexDirection : 'column') : null,
    order: own.order,
    transformed: own.transform !== 'none' && !new DOMMatrixReadOnly(own.transform).isIdentity,
    gridPlacement: [own.gridColumnStart, own.gridColumnEnd, own.gridRowStart, own.gridRowEnd].some((value) => value !== 'auto'),
    offset: [own.top, own.right, own.bottom, own.left].some((value) => Number.isFinite(parseFloat(value)) && parseFloat(value) !== 0),
    hiddenById,
  };
}
