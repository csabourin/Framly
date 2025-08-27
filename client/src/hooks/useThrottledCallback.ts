import { useCallback, useRef } from 'react';

/**
 * Creates a throttled version of a callback that will only execute once per specified delay
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastRun.current >= delay) {
      // Execute immediately if enough time has passed
      lastRun.current = now;
      callback(...args);
    } else {
      // Schedule for later execution
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        lastRun.current = Date.now();
        callback(...args);
        timeoutRef.current = null;
      }, delay - (now - lastRun.current));
    }
  }, [callback, delay]) as T;
}