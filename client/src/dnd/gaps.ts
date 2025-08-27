/**
 * Gap Generation for Drag & Drop
 * Creates insertion points between siblings along main axis
 */

import { mainAxis, Axis } from './layout';

export interface Gap {
  index: number;           // insertion index
  rect: DOMRect;          // visual bounds of gap
  axis: Axis;             // main axis direction
}

/**
 * Generate gaps for insertion between siblings
 * Ignores slivers < 6px wide/high
 */
export function generateGaps(container: HTMLElement): Gap[] {
  const gaps: Gap[] = [];
  const axis = mainAxis(container);
  const children = Array.from(container.children) as HTMLElement[];
  
  if (children.length === 0) {
    // Empty container - single gap at end
    const containerRect = container.getBoundingClientRect();
    gaps.push({
      index: 0,
      rect: containerRect,
      axis
    });
    return gaps;
  }
  
  // Get visible children rects
  const childRects = children
    .map(child => ({
      element: child,
      rect: child.getBoundingClientRect(),
      index: Array.from(container.children).indexOf(child)
    }))
    .filter(({ rect }) => {
      // Filter out slivers
      return (axis === "x" ? rect.width : rect.height) >= 6;
    });
  
  if (childRects.length === 0) return gaps;
  
  // Sort by position along main axis
  if (axis === "x") {
    childRects.sort((a, b) => a.rect.left - b.rect.left);
  } else {
    childRects.sort((a, b) => a.rect.top - b.rect.top);
  }
  
  const containerRect = container.getBoundingClientRect();
  
  // Gap before first child
  const firstRect = childRects[0].rect;
  if (axis === "x") {
    const gapWidth = firstRect.left - containerRect.left;
    if (gapWidth >= 6) {
      gaps.push({
        index: 0,
        rect: new DOMRect(
          containerRect.left,
          firstRect.top,
          gapWidth,
          firstRect.height
        ),
        axis
      });
    }
  } else {
    const gapHeight = firstRect.top - containerRect.top;
    if (gapHeight >= 6) {
      gaps.push({
        index: 0,
        rect: new DOMRect(
          firstRect.left,
          containerRect.top,
          firstRect.width,
          gapHeight
        ),
        axis
      });
    }
  }
  
  // Gaps between children
  for (let i = 0; i < childRects.length - 1; i++) {
    const currentRect = childRects[i].rect;
    const nextRect = childRects[i + 1].rect;
    const insertIndex = childRects[i].index + 1;
    
    if (axis === "x") {
      const gapLeft = currentRect.right;
      const gapWidth = nextRect.left - currentRect.right;
      
      if (gapWidth >= 6) {
        gaps.push({
          index: insertIndex,
          rect: new DOMRect(
            gapLeft,
            Math.min(currentRect.top, nextRect.top),
            gapWidth,
            Math.max(currentRect.bottom, nextRect.bottom) - Math.min(currentRect.top, nextRect.top)
          ),
          axis
        });
      }
    } else {
      const gapTop = currentRect.bottom;
      const gapHeight = nextRect.top - currentRect.bottom;
      
      if (gapHeight >= 6) {
        gaps.push({
          index: insertIndex,
          rect: new DOMRect(
            Math.min(currentRect.left, nextRect.left),
            gapTop,
            Math.max(currentRect.right, nextRect.right) - Math.min(currentRect.left, nextRect.left),
            gapHeight
          ),
          axis
        });
      }
    }
  }
  
  // Gap after last child
  const lastRect = childRects[childRects.length - 1].rect;
  const lastIndex = childRects[childRects.length - 1].index + 1;
  
  if (axis === "x") {
    const gapWidth = containerRect.right - lastRect.right;
    if (gapWidth >= 6) {
      gaps.push({
        index: lastIndex,
        rect: new DOMRect(
          lastRect.right,
          lastRect.top,
          gapWidth,
          lastRect.height
        ),
        axis
      });
    }
  } else {
    const gapHeight = containerRect.bottom - lastRect.bottom;
    if (gapHeight >= 6) {
      gaps.push({
        index: lastIndex,
        rect: new DOMRect(
          lastRect.left,
          lastRect.bottom,
          lastRect.width,
          gapHeight
        ),
        axis
      });
    }
  }
  
  return gaps;
}

/**
 * Find gap at point
 */
export function findGapAtPoint(gaps: Gap[], point: { x: number; y: number }): Gap | null {
  return gaps.find(gap => {
    const { rect } = gap;
    return point.x >= rect.left && 
           point.x <= rect.right && 
           point.y >= rect.top && 
           point.y <= rect.bottom;
  }) || null;
}