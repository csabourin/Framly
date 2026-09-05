import type { CanvasElement } from '../types/canvas';

/**
 * Heading structure, as a page's outline rather than a list of font sizes.
 *
 * A heading level is meaning, not size: `h2` says "this starts a section of
 * the h1 above me". Screen-reader users navigate by that outline, so a page
 * that jumps from `h2` to `h4` reads as if a section went missing, and a page
 * whose first heading is `h3` reads as if it began halfway through.
 *
 * This module is deliberately DOM-free — same reason as `codeGenerator.ts`.
 * It works on the element record alone, so both the reducer that picks a level
 * at insert time and the panel that explains one run the identical rules.
 */

export type HeadingElements = Record<string, CanvasElement>;

export interface OutlineEntry {
  id: string;
  level: number;
  text: string;
  /** Container the heading sits in — how "deeper" and "peer" are decided. */
  parentId: string;
}

/** Where a not-yet-inserted heading would land. */
export interface Placement {
  parentId: string;
  insertPosition?: 'before' | 'after' | 'inside' | 'canvas-start' | 'canvas-end';
  referenceElementId?: string;
}

export type HeadingProblem = 'skipped' | 'startsBelowH1' | 'secondH1';

export interface HeadingIssue {
  id: string;
  problem: HeadingProblem;
  /** The level the heading has now. */
  level: number;
  /** The level that would fix it. */
  suggested: number;
  /** Level of the heading before it in the outline, 0 if it is the first. */
  previousLevel: number;
}

const MAX_LEVEL = 6;

export const headingLevelOf = (element: CanvasElement): number =>
  Math.min(Math.max(element.headingLevel || 1, 1), MAX_LEVEL);

/**
 * Every heading in the document, in the order a browser reads them.
 *
 * Depth-first over `children`, which is the same walk the code generator makes,
 * so the outline shown in the panel is the outline the exported page has.
 */
export function headingOutline(elements: HeadingElements, rootId = 'root'): OutlineEntry[] {
  const found: OutlineEntry[] = [];
  const visited = new Set<string>();

  const walk = (id: string, parentId: string) => {
    if (visited.has(id)) return; // A malformed tree must not hang the panel.
    visited.add(id);
    const element = elements[id];
    if (!element) return;
    if (element.type === 'heading') {
      found.push({ id, level: headingLevelOf(element), text: (element.content || '').trim(), parentId });
    }
    for (const child of element.children ?? []) walk(child, id);
  };

  walk(rootId, rootId);
  return found;
}

/** Container chain of an existing element, root first, excluding itself. */
function ancestorsOf(elements: HeadingElements, id: string, rootId: string): string[] {
  const chain: string[] = [];
  const seen = new Set<string>([id]);
  let current = elements[id]?.parent;
  while (current && !seen.has(current)) {
    seen.add(current);
    chain.unshift(current);
    if (current === rootId) break;
    current = elements[current]?.parent;
  }
  return chain;
}

/** Every element id in the order a browser would meet it, with its depth. */
function documentOrder(elements: HeadingElements, rootId: string): Array<{ id: string; depth: number }> {
  const order: Array<{ id: string; depth: number }> = [];
  const visited = new Set<string>();
  const walk = (id: string, depth: number) => {
    if (visited.has(id) || !elements[id]) return;
    visited.add(id);
    order.push({ id, depth });
    for (const child of elements[id].children ?? []) walk(child, depth + 1);
  };
  walk(rootId, 0);
  return order;
}

/**
 * The headings that come before this placement, in document order.
 *
 * Worked out on the real reading order rather than on the parent's child list:
 * a heading three containers deep in an earlier sibling still precedes what we
 * are inserting, and an outline that missed it would suggest the wrong level.
 */
function precedingHeadings(elements: HeadingElements, placement: Placement, rootId: string): OutlineEntry[] {
  const outline = headingOutline(elements, rootId);
  const { parentId, insertPosition = 'inside', referenceElementId } = placement;
  const children = elements[parentId]?.children ?? [];

  // Index within the parent the new element would take.
  let index = children.length;
  if (insertPosition === 'canvas-start') index = 0;
  else if (referenceElementId && (insertPosition === 'before' || insertPosition === 'after')) {
    const reference = children.indexOf(referenceElementId);
    if (reference !== -1) index = insertPosition === 'before' ? reference : reference + 1;
  }

  const order = documentOrder(elements, rootId);
  const positionOf = (id: string) => order.findIndex((entry) => entry.id === id);

  // Where the new element lands in reading order: just before the child it
  // pushes down, or — appending — past everything already inside the parent.
  let cut: number;
  if (index < children.length) {
    cut = positionOf(children[index]);
  } else {
    const parentPosition = positionOf(parentId);
    if (parentPosition === -1) return outline;
    const depth = order[parentPosition].depth;
    cut = order.findIndex((entry, at) => at > parentPosition && entry.depth <= depth);
    if (cut === -1) cut = order.length;
  }
  if (cut === -1) return outline;
  return outline.filter((entry) => positionOf(entry.id) < cut);
}

/** Why a suggested level is what it is — the panel says this in words. */
export interface LevelSuggestion {
  level: number;
  /** The heading the suggestion was read from, if there was one. */
  after: OutlineEntry | null;
  reason: 'firstHeading' | 'peer' | 'subsection' | 'onlyTitleTaken';
}

/**
 * The level a heading inserted here should have.
 *
 * Three rules, in this order:
 *
 * 1. Nothing precedes it — this is the page title, so `h1`. That is what stops
 *    a page starting at `h3` by accident.
 * 2. The heading before it shares its container — they are peers, so the same
 *    level. A second section heading is not a subsection of the first.
 * 3. The heading before it is in a container that encloses this one — we have
 *    moved inward, so one level deeper, capped at `h6`.
 *
 * Then one override: never suggest a second `h1`. A page has one title, and
 * two of them is the mistake this whole module exists to prevent.
 */
export function suggestHeadingLevel(
  elements: HeadingElements,
  placement: Placement,
  rootId = 'root',
  /** A heading being re-levelled does not count as the page's existing title. */
  ignoreId?: string,
): LevelSuggestion {
  const outline = headingOutline(elements, rootId).filter((entry) => entry.id !== ignoreId);
  const preceding = precedingHeadings(elements, placement, rootId).filter((entry) => entry.id !== ignoreId);
  const parentChain = [...ancestorsOf(elements, placement.parentId, rootId), placement.parentId];

  // The nearest preceding heading that is a peer or an enclosing one. A
  // heading buried in an earlier sibling container says nothing about the
  // level here — it is behind us and further in.
  const enclosing = [...preceding].reverse().find((entry) => parentChain.includes(entry.parentId)) ?? null;
  const hasH1 = outline.some((entry) => entry.level === 1);

  if (!enclosing) {
    return hasH1
      ? { level: 2, after: null, reason: 'onlyTitleTaken' }
      : { level: 1, after: null, reason: 'firstHeading' };
  }
  if (enclosing.parentId === placement.parentId) {
    return enclosing.level === 1 && hasH1
      ? { level: 2, after: enclosing, reason: 'onlyTitleTaken' }
      : { level: enclosing.level, after: enclosing, reason: 'peer' };
  }
  return { level: Math.min(enclosing.level + 1, MAX_LEVEL), after: enclosing, reason: 'subsection' };
}

/** The same suggestion, for a heading already on the canvas. */
export function suggestLevelForExisting(
  elements: HeadingElements,
  id: string,
  rootId = 'root',
): LevelSuggestion {
  const element = elements[id];
  const parentId = element?.parent ?? rootId;
  return suggestHeadingLevel(elements, { parentId, insertPosition: 'before', referenceElementId: id }, rootId, id);
}

/**
 * Everything wrong with the page's outline, in document order.
 *
 * One entry per heading at most, because a heading with two problems only
 * needs one fix and two messages would just be noise.
 *
 * The offered fix is the level the outline calls for — the same suggestion the
 * panel explains in words, so the sentence and the button can never disagree.
 * Stepping one below the heading above would be enough to make the document
 * *valid*, but it can be wrong: on `h1 → h2 → h1`, the third heading is a
 * second section, and nesting it under the first as an `h3` says something the
 * author did not mean. The one exception is a page whose first heading is not
 * `h1`: that message names the page title, so the fix has to be `h1`.
 */
export function headingIssues(elements: HeadingElements, rootId = 'root'): HeadingIssue[] {
  const outline = headingOutline(elements, rootId);
  const issues: HeadingIssue[] = [];
  const fixFor = (id: string) => suggestLevelForExisting(elements, id, rootId).level;
  let previousLevel = 0;
  let seenH1 = false;

  for (const entry of outline) {
    const shared = { id: entry.id, level: entry.level, previousLevel };
    if (entry.level === 1 && seenH1) {
      issues.push({ ...shared, problem: 'secondH1', suggested: fixFor(entry.id) });
    } else if (previousLevel === 0 && entry.level > 1) {
      issues.push({ ...shared, problem: 'startsBelowH1', suggested: 1 });
    } else if (entry.level > previousLevel + 1) {
      issues.push({ ...shared, problem: 'skipped', suggested: fixFor(entry.id) });
    }
    if (entry.level === 1) seenH1 = true;
    previousLevel = entry.level;
  }
  // A page with no h1 needs no separate case: its first heading is above level
  // 1, which `startsBelowH1` already names, and fixing that heading gives the
  // page its title.
  return issues;
}

export const issueFor = (issues: HeadingIssue[], id: string): HeadingIssue | undefined =>
  issues.find((issue) => issue.id === id);
