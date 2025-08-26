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
    <div className="flex items-center gap-2">
      {/* Offline/Online Status */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {isOffline ? (
          <>
            <WifiOff className="w-3 h-3 text-destructive" />
            <span>Offline</span>
          </>
        ) : (
          <>
            <Wifi className="w-3 h-3 text-green-500" />
            <span>Online</span>
          </>
        )}
      </div>

      {/* Service Worker Status */}
      {isControlled && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          <span>PWA Active</span>
        </div>
      )}

      {/* Update Available */}
      {updateAvailable && (
        <div className="flex items-center gap-1">
          <Button
            onClick={activateUpdate}
            size="sm"
            variant="ghost"
            className="text-xs px-2 py-1 h-6 text-blue-600 hover:text-blue-700"
          >
            <Download className="w-3 h-3 mr-1" />
            Update Available
          </Button>
        </div>
      )}
    </div>
  );
}