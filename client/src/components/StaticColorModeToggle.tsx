import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { indexedDBManager } from '../utils/indexedDB';

// Robust color mode toggle that works in Replit's preview environment
export function StaticColorModeToggle() {
  const [iconType, setIconType] = React.useState<'sun' | 'moon'>('sun');
  const [mounted, setMounted] = React.useState(false);
  
  const handleClick = async () => {
    const isDark = document.documentElement.classList.contains('dark');
    const newTheme = isDark ? 'light' : 'dark';
    
    // Update DOM immediately for responsive feedback
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(newTheme);
    
    // Update icon immediately
    setIconType(newTheme === 'dark' ? 'moon' : 'sun');
    
    // Save to IndexedDB asynchronously
    try {
      await indexedDBManager.init();
      await indexedDBManager.saveSetting('theme', newTheme);
    } catch (error) {
      // Silent fail - don't break UI for storage issues
    }
  };
  
  React.useEffect(() => {
    // Initialize component after mount
    const initTheme = async () => {
      try {
        // Try to load theme from IndexedDB first
        await indexedDBManager.init();
        const savedTheme = await indexedDBManager.loadSetting('theme');
        
        if (savedTheme) {
          document.documentElement.classList.remove('light', 'dark');
          document.documentElement.classList.add(savedTheme);
          setIconType(savedTheme === 'dark' ? 'moon' : 'sun');
        } else {
          // Check current DOM state
          const isDark = document.documentElement.classList.contains('dark');
          setIconType(isDark ? 'moon' : 'sun');
        }
      } catch (error) {
        // Fallback to DOM state if IndexedDB fails
        const isDark = document.documentElement.classList.contains('dark');
        setIconType(isDark ? 'moon' : 'sun');
      }
      
      setMounted(true);
    };
    
    initTheme();
    
    // Listen for theme changes from other sources
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark');
      setIconType(isDark ? 'moon' : 'sun');
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);

  // Don't render until mounted to prevent hydration issues
  if (!mounted) {
    return (
      <div className="h-8 w-8 p-1 bg-gray-200 border border-gray-300 rounded animate-pulse" />
    );
  }
  
  return (
    <button
      onClick={handleClick}
      className="h-8 w-8 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded inline-flex items-center justify-center transition-colors"
      title="Toggle color mode"
      data-testid="static-color-mode-toggle"
    >
      {iconType === 'moon' ? (
        <Moon className="h-4 w-4 text-gray-900 dark:text-gray-100" />
      ) : (
        <Sun className="h-4 w-4 text-gray-900 dark:text-gray-100" />
      )}
    </button>
  );
}