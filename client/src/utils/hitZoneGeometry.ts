/**
 * Hit Zone Geometry utilities for drag & drop artifact fixes
 * Implements proper zone detection with hysteresis to prevent rapid switching
 */

interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface HitZoneResult {
  zone: 'before' | 'after' | 'inside' | null;
  confidence: number; // 0-1 scale for hysteresis
}

/**
 * Determines drop zone based on cursor position within element bounds
 * Uses 25% top/bottom zones for before/after, 50% middle for inside
 * Includes hysteresis buffer to prevent rapid switching
 */
export function calculateHitZone(
  mouseX: number,
  mouseY: number,
  elementBounds: ElementBounds,
  canAcceptChildren: boolean = true,
  currentZone: string | null = null,
  hysteresisBuffer: number = 8
): HitZoneResult {
  
  const { x, y, width, height } = elementBounds;
  
  // Check if mouse is within element bounds
  if (mouseX < x || mouseX > x + width || mouseY < y || mouseY > y + height) {
    return { zone: null, confidence: 0 };
  }
  
  // Calculate relative position within element (0-1)
  const relativeY = (mouseY - y) / height;
  
  // Define zone boundaries
  const topZoneEnd = 0.25;
  const bottomZoneStart = 0.75;
  
  // Calculate base zones without hysteresis
  let baseZone: 'before' | 'after' | 'inside' | null = null;
  let baseConfidence = 0;
  
  if (relativeY <= topZoneEnd) {
    baseZone = 'before';
    baseConfidence = 1 - (relativeY / topZoneEnd); // Higher confidence closer to top
  } else if (relativeY >= bottomZoneStart) {
    baseZone = 'after';
    baseConfidence = (relativeY - bottomZoneStart) / (1 - bottomZoneStart);
  } else if (canAcceptChildren) {
    baseZone = 'inside';
    // Peak confidence in the center of the inside zone
    const centerDistance = Math.abs(relativeY - 0.5);
    baseConfidence = 1 - (centerDistance / 0.25);
  } else {
    // If can't accept children, favor before/after based on position
    baseZone = relativeY < 0.5 ? 'before' : 'after';
    baseConfidence = 0.3; // Lower confidence for fallback zones
  }
  
  // Apply hysteresis if we're switching zones
  if (currentZone && currentZone !== baseZone) {
    const pixelY = mouseY - y;
    const topThreshold = height * topZoneEnd;
    const bottomThreshold = height * bottomZoneStart;
    
    // Check if we're within hysteresis buffer of current zone
    switch (currentZone) {
      case 'before':
        if (pixelY < topThreshold + hysteresisBuffer) {
          return { zone: 'before', confidence: 0.8 }; // Stay in current zone
        }
        break;
      case 'after':
        if (pixelY > bottomThreshold - hysteresisBuffer) {
          return { zone: 'after', confidence: 0.8 }; // Stay in current zone
        }
        break;
      case 'inside':
        if (pixelY > topThreshold - hysteresisBuffer && pixelY < bottomThreshold + hysteresisBuffer) {
          return { zone: 'inside', confidence: 0.8 }; // Stay in current zone
        }
        break;
    }
  }
  
  return { zone: baseZone, confidence: baseConfidence };
}

/**
 * Clamps coordinates to canvas bounds to prevent ghost growth
 */
export function clampToCanvas(
  x: number,
  y: number,
  canvasWidth: number,
  canvasHeight: number,
  padding: number = 0
): { x: number; y: number; clamped: boolean } {
  
  const originalX = x;
  const originalY = y;
  
  // Allow reasonable working area without being too restrictive
  const clampedX = Math.max(-50, Math.min(x, canvasWidth + 50)); // Allow 50px overflow
  const clampedY = Math.max(-50, Math.min(y, canvasHeight + 50)); // Allow 50px overflow
  
  const clamped = clampedX !== originalX || clampedY !== originalY;
  
  return { x: clampedX, y: clampedY, clamped };
}

/**
 * Calculates proper line anchoring for before/after indicators
 * Always anchors to element edges spanning full parent width
 */
export function calculateLineAnchoring(
  targetElementBounds: ElementBounds,
  parentElementBounds: ElementBounds | null,
  zone: 'before' | 'after'
): { x: number; y: number; width: number } {
  
  // Use parent width if available, otherwise target width
  const lineWidth = parentElementBounds ? parentElementBounds.width : targetElementBounds.width;
  const lineX = parentElementBounds ? parentElementBounds.x : targetElementBounds.x;
  
  // Position line at element edge
  const lineY = zone === 'before' 
    ? targetElementBounds.y 
    : targetElementBounds.y + targetElementBounds.height;
  
  return { x: lineX, y: lineY, width: lineWidth };
}

/**
 * Determines if two zones are mutually exclusive
 * Prevents both inside highlight and before/after lines from showing
 */
export function areZonesMutuallyExclusive(
  zone1: string | null,
  zone2: string | null
): boolean {
  if (!zone1 || !zone2) return false;
  
  // Inside highlights and before/after lines are mutually exclusive
  const insideZones = ['inside'];
  const lineZones = ['before', 'after', 'canvas-top', 'canvas-bottom'];
  
  const zone1IsInside = insideZones.includes(zone1);
  const zone1IsLine = lineZones.includes(zone1);
  const zone2IsInside = insideZones.includes(zone2);
  const zone2IsLine = lineZones.includes(zone2);
  
  return (zone1IsInside && zone2IsLine) || (zone1IsLine && zone2IsInside);
}