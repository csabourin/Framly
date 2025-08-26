import React from 'react';
import { useServiceWorker } from '../hooks/useServiceWorker';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, RefreshCw, Download } from 'lucide-react';

export function ServiceWorkerStatus() {
  const { isRegistered, isControlled, updateAvailable, isOffline, activateUpdate, checkForUpdates } = useServiceWorker();

  if (!isRegistered) {
    return null; // Don't show anything if service worker isn't registered
  }

  return (
    <div className="fixed bottom-4 left-4 z-40">
      <div className="flex flex-col gap-2">
        {/* Offline/Online Status */}
        <Badge 
          variant={isOffline ? "destructive" : "default"}
          className="flex items-center gap-1 text-xs"
        >
          {isOffline ? (
            <>
              <WifiOff className="w-3 h-3" />
              Offline
            </>
          ) : (
            <>
              <Wifi className="w-3 h-3" />
              Online
            </>
          )}
        </Badge>

        {/* Service Worker Status */}
        {isControlled && (
          <Badge variant="secondary" className="flex items-center gap-1 text-xs">
            PWA Active
          </Badge>
        )}

        {/* Update Available */}
        {updateAvailable && (
          <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-3 max-w-xs">
            <div className="flex items-start gap-2">
              <Download className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-blue-800 dark:text-blue-200 font-medium">
                  Update Available
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                  A new version is ready
                </p>
                <div className="flex gap-2 mt-2">
                  <Button
                    onClick={activateUpdate}
                    size="sm"
                    className="text-xs px-2 py-1 h-6 bg-blue-600 hover:bg-blue-700"
                  >
                    Update
                  </Button>
                  <Button
                    onClick={checkForUpdates}
                    variant="ghost"
                    size="sm" 
                    className="text-xs px-2 py-1 h-6 text-blue-600"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}