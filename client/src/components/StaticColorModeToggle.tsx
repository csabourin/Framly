import React from 'react';
import { Sun, Moon } from 'lucide-react';

// Ultra-simple color mode toggle that doesn't rely on any React state or context
// Uses only DOM APIs to ensure it always works
export function StaticColorModeToggle() {
  const handleClick = () => {
    const isDark = document.documentElement.classList.contains('dark');
    
    if (isDark) {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
  };

  // Check current theme directly from DOM
  const [iconType, setIconType] = React.useState<'sun' | 'moon'>('sun');
  
  React.useEffect(() => {
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setIconType(isDark ? 'moon' : 'sun');
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

  return (
    <button
      onClick={handleClick}
      className="h-8 w-8 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded inline-flex items-center justify-center"
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