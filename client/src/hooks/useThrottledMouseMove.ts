import { useCallback, useRef } from 'react';

/**
 * Creates a throttled mouse move handler to improve performance
 */
export function useThrottledMouseMove<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 16 // ~60fps
): T {
  const lastCall = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastCall.current >= delay) {
      // Execute immediately if enough time has passed
      lastCall.current = now;
      callback(...args);
    } else {
      // Schedule for later execution if we're within the throttle window
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        lastCall.current = Date.now();
        callback(...args);
        timeoutRef.current = null;
      }, delay - (now - lastCall.current));
    }
  }, [callback, delay]) as T;
}