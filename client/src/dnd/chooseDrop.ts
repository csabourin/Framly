/**
 * Drop Choice Algorithm
 * Determines where to drop based on pointer position
 */

import { generateGaps, findGapAtPoint } from './gaps';
import { mainAxis } from './layout';

export type TentativeDrop =
  | { kind: "into"; parentId: string; index: "end" }
  | { kind: "between"; parentId: string; index: number };

/**
 * Choose drop target for pointer position within container
 */
export function chooseDrop(
  point: { x: number; y: number },
  container: HTMLElement
): TentativeDrop | null {
  const containerRect = container.getBoundingClientRect();
  
  // Check if point is within container bounds
  if (point.x < containerRect.left || 
      point.x > containerRect.right || 
      point.y < containerRect.top || 
      point.y > containerRect.bottom) {
    return null;
  }
  
  // Compute Inside Band = inner 70% box (inset 15% each side)
  const insetX = containerRect.width * 0.15;
  const insetY = containerRect.height * 0.15;
  
  const insideBand = {
    left: containerRect.left + insetX,
    right: containerRect.right - insetX,
    top: containerRect.top + insetY,
    bottom: containerRect.bottom - insetY
  };
  
  // Generate gaps for between placement
  const gaps = generateGaps(container);
  
  // Check if pointer hits a gap first (higher priority)
  const gap = findGapAtPoint(gaps, point);
  if (gap) {
    const containerId = container.dataset.elementId || container.id;
    return {
      kind: "between",
      parentId: containerId,
      index: gap.index
    };
  }
  
  // Check if pointer is in Inside Band
  if (point.x >= insideBand.left && 
      point.x <= insideBand.right && 
      point.y >= insideBand.top && 
      point.y <= insideBand.bottom) {
    
    const containerId = container.dataset.elementId || container.id;
    return {
      kind: "into",
      parentId: containerId,
      index: "end"
    };
  }
  
  return null;
}

/**
 * Get candidate containers from deepest to ancestors
 */
export function getCandidateContainers(point: { x: number; y: number }): HTMLElement[] {
  const elements = document.elementsFromPoint(point.x, point.y);
  const candidates: HTMLElement[] = [];
  
  for (const el of elements) {
    if (el instanceof HTMLElement) {
      // Check if element can accept children (has container data attributes)
      const canAccept = el.dataset.container === 'true' || 
                       el.dataset.accepts || 
                       el.classList.contains('canvas-element');
      
      if (canAccept) {
        candidates.push(el);
      }
    }
  }
  
  return candidates;
}

/**
 * Choose drop with candidate container fallback
 */
export function chooseDropWithFallback(
  point: { x: number; y: number }
): TentativeDrop {
  const candidates = getCandidateContainers(point);
  
  for (const container of candidates) {
    const drop = chooseDrop(point, container);
    if (drop) {
      return drop;
    }
  }
  
  // Fallback to root
  return {
    kind: "between",
    parentId: "root",
    index: "end" as any
  };
}