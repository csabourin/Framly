import { useState } from 'react';
import { usePWA } from '@/hooks/usePWA';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';

export function PWAInstallPrompt() {
  const { canInstall, isInstalled, installPWA } = usePWA();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if already installed, can't install, or has been dismissed
  if (isInstalled || !canInstall || dismissed) {
    return null;
  }

  const handleInstall = async () => {
    const success = await installPWA();
    if (!success) {
      setDismissed(true); // Hide if installation failed or was dismissed
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 max-w-sm">
      <div className="flex items-start gap-3">
        <Download className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Install Design Tool
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Install this app for a better experience and offline access
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              onClick={handleInstall}
              size="sm"
              className="text-xs px-3 py-1 h-7"
            >
              Install
            </Button>
            <Button
              onClick={() => setDismissed(true)}
              variant="ghost"
              size="sm"
              className="text-xs px-3 py-1 h-7"
            >
              Not now
            </Button>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-1 -m-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}