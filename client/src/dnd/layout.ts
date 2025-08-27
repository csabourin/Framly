/**
 * Layout Axis Detection for Drag & Drop
 * Determines main layout axis for gap placement
 */

export type Axis = "x" | "y";

export function mainAxis(el: HTMLElement): Axis {
  const cs = getComputedStyle(el);
  
  if (cs.display.startsWith("flex")) {
    return cs.flexDirection.includes("row") ? "x" : "y";
  }
  
  if (cs.display.startsWith("grid")) {
    return "x"; // treat as row-major for gaps
  }
  
  return "y"; // block flow
}

/**
 * Get layout direction for axis-aware positioning
 */
export function getLayoutDirection(el: HTMLElement): {
  mainAxis: Axis;
  crossAxis: Axis;
  direction: "ltr" | "rtl" | "normal" | "reverse";
} {
  const cs = getComputedStyle(el);
  const main = mainAxis(el);
  const cross: Axis = main === "x" ? "y" : "x";
  
  let direction: "ltr" | "rtl" | "normal" | "reverse" = "normal";
  
  if (cs.display.startsWith("flex")) {
    if (cs.flexDirection.includes("reverse")) {
      direction = "reverse";
    } else if (main === "x" && cs.direction === "rtl") {
      direction = "rtl";
    }
  }
  
  return { mainAxis: main, crossAxis: cross, direction };
}

/**
 * Check if element uses flexbox layout
 */
export function isFlexContainer(el: HTMLElement): boolean {
  return getComputedStyle(el).display.startsWith("flex");
}

/**
 * Check if element uses grid layout
 */
export function isGridContainer(el: HTMLElement): boolean {
  return getComputedStyle(el).display.startsWith("grid");
}