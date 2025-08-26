import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { indexedDBManager } from '../utils/indexedDB';

// Ultra-simple color mode toggle that uses IndexedDB for persistence
export function StaticColorModeToggle() {
  console.log('[StaticColorModeToggle] Rendering component');
  
  const handleClick = async () => {
    const isDark = document.documentElement.classList.contains('dark');
    const newTheme = isDark ? 'light' : 'dark';
    console.log('[StaticColorModeToggle] Toggling theme from', isDark ? 'dark' : 'light', 'to', newTheme);
    
    // Update DOM immediately
    if (isDark) {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
    
    // Save to IndexedDB
    try {
      await indexedDBManager.init(); // Ensure DB is initialized
      await indexedDBManager.saveSetting('theme', newTheme);
      console.log('[StaticColorModeToggle] Theme saved to IndexedDB:', newTheme);
    } catch (error) {
      console.error('[StaticColorModeToggle] Failed to save theme to IndexedDB:', error);
    }
  };

  // Check current theme directly from DOM
  const [iconType, setIconType] = React.useState<'sun' | 'moon'>('sun');
  
  React.useEffect(() => {
    console.log('[StaticColorModeToggle] useEffect running');
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setIconType(isDark ? 'moon' : 'sun');
      console.log('[StaticColorModeToggle] Theme checked, isDark:', isDark);
    };
    
    checkTheme();
    
    // Listen for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);

  console.log('[StaticColorModeToggle] Rendering button with icon:', iconType);
  
  return (
    <button
      onClick={handleClick}
      className="h-8 w-8 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded inline-flex items-center justify-center"
      title="Toggle color mode"
      data-testid="static-color-mode-toggle"
      style={{ visibility: 'visible' }} // Force visibility
    >
      {iconType === 'moon' ? (
        <Moon className="h-4 w-4 text-gray-900 dark:text-gray-100" />
      ) : (
        <Sun className="h-4 w-4 text-gray-900 dark:text-gray-100" />
      )}
    </button>
  );
}