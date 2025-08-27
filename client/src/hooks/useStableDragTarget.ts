import { useRef, useCallback } from 'react';

interface StableDragTargetConfig {
  bufferX: number;
  bufferY: number;
  hysteresisBuffer: number;
}

interface DragTarget {
  elementId: string | null;
  zone: 'before' | 'after' | 'inside' | null;
  bounds?: { x: number; y: number; width: number; height: number };
}

/**
 * Hook for stabilizing drag target resolution to prevent flicker and artifacts
 * Implements caching, buffer zones, and hysteresis for smooth drag feedback
 */
export function useStableDragTarget(config: StableDragTargetConfig = {
  bufferX: 5,
  bufferY: 8,
  hysteresisBuffer: 8
}) {
  const { bufferX, bufferY, hysteresisBuffer } = config;
  
  const lastTarget = useRef<DragTarget | null>(null);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const frameId = useRef<number | null>(null);
  const pendingUpdate = useRef<(() => void) | null>(null);
  
  const shouldUpdateTarget = useCallback((newX: number, newY: number): boolean => {
    const { x: lastX, y: lastY } = lastMousePos.current;
    
    // Check if mouse has moved beyond buffer threshold
    const deltaX = Math.abs(newX - lastX);
    const deltaY = Math.abs(newY - lastY);
    
    return deltaX > bufferX || deltaY > bufferY;
  }, [bufferX, bufferY]);
  
  const shouldSwitchZone = useCallback((
    currentZone: string | null, 
    newZone: string | null, 
    mouseY: number,
    elementBounds?: { y: number; height: number }
  ): boolean => {
    if (!currentZone || !elementBounds) return true;
    
    // Apply hysteresis - require movement beyond threshold to switch zones
    const elementTop = elementBounds.y;
    const elementBottom = elementBounds.y + elementBounds.height;
    const topThird = elementTop + elementBounds.height * 0.25;
    const bottomThird = elementBottom - elementBounds.height * 0.25;
    
    // If we're in the same zone and within hysteresis buffer, don't switch
    if (currentZone === newZone) return false;
    
    // Check hysteresis boundaries
    if (currentZone === 'before' && mouseY < topThird + hysteresisBuffer) return false;
    if (currentZone === 'after' && mouseY > bottomThird - hysteresisBuffer) return false;
    if (currentZone === 'inside' && mouseY > topThird - hysteresisBuffer && mouseY < bottomThird + hysteresisBuffer) return false;
    
    return true;
  }, [hysteresisBuffer]);
  
  const updateTarget = useCallback((
    newTarget: DragTarget,
    mouseX: number,
    mouseY: number,
    onUpdate: (target: DragTarget) => void
  ) => {
    // Cancel any pending frame
    if (frameId.current) {
      cancelAnimationFrame(frameId.current);
    }
    
    // Store the update function
    pendingUpdate.current = () => {
      // Check if we should update based on movement threshold
      if (!shouldUpdateTarget(mouseX, mouseY)) {
        return;
      }
      
      // Check zone switching hysteresis
      if (lastTarget.current && newTarget.elementId === lastTarget.current.elementId) {
        if (!shouldSwitchZone(lastTarget.current.zone, newTarget.zone, mouseY, newTarget.bounds)) {
          return;
        }
      }
      
      // Update target and mouse position
      lastTarget.current = newTarget;
      lastMousePos.current = { x: mouseX, y: mouseY };
      
      onUpdate(newTarget);
    };
    
    // Schedule update for next frame
    frameId.current = requestAnimationFrame(() => {
      if (pendingUpdate.current) {
        pendingUpdate.current();
        pendingUpdate.current = null;
      }
      frameId.current = null;
    });
  }, [shouldUpdateTarget, shouldSwitchZone]);
  
  const clearTarget = useCallback(() => {
    if (frameId.current) {
      cancelAnimationFrame(frameId.current);
      frameId.current = null;
    }
    lastTarget.current = null;
    pendingUpdate.current = null;
  }, []);
  
  const getCurrentTarget = useCallback(() => lastTarget.current, []);
  
  return {
    updateTarget,
    clearTarget,
    getCurrentTarget
  };
}