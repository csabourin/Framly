import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sun, Moon } from 'lucide-react';

export function SimpleColorModeToggle() {
  console.log('[SimpleColorModeToggle] Component rendering at', new Date().toISOString());
  
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    console.log('[SimpleColorModeToggle] useEffect running - mounting');
    setMounted(true);
    // Check initial theme
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
    
    return () => {
      console.log('[SimpleColorModeToggle] Component unmounting');
    };
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    
    if (newIsDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  };

  // Always render something, even if not mounted yet
  if (!mounted) {
    console.log('[SimpleColorModeToggle] Rendering placeholder while mounting');
    return (
      <div className="h-8 w-8 p-1 bg-gray-200 border border-gray-300 rounded" title="Loading...">
        <div className="w-full h-full bg-gray-400 animate-pulse rounded" />
      </div>
    );
  }

  console.log('[SimpleColorModeToggle] Rendering full button, isDark:', isDark);
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="h-8 w-8 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600"
      title="Toggle color mode"
      data-testid="simple-color-mode-toggle"
    >
      {isDark ? (
        <Moon className="h-4 w-4 text-gray-900 dark:text-gray-100" />
      ) : (
        <Sun className="h-4 w-4 text-gray-900 dark:text-gray-100" />
      )}
    </Button>
  );
}