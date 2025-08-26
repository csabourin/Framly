import { useState, useEffect } from 'react';

interface ServiceWorkerState {
  isRegistered: boolean;
  isControlled: boolean;
  updateAvailable: boolean;
  isOffline: boolean;
}

export function useServiceWorker() {
  const [state, setState] = useState<ServiceWorkerState>({
    isRegistered: false,
    isControlled: false,
    updateAvailable: false,
    isOffline: !navigator.onLine
  });

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    // Check if service worker is already registered and controlling
    const updateState = () => {
      setState(prev => ({
        ...prev,
        isRegistered: !!navigator.serviceWorker.controller,
        isControlled: !!navigator.serviceWorker.controller
      }));
    };

    // Initial state check
    updateState();

    // Listen for service worker controller changes
    const handleControllerChange = () => {
      console.log('🔄 Service Worker controller changed');
      updateState();
      window.location.reload(); // Refresh to get the latest version
    };

    // Listen for updates
    const handleUpdateFound = (registration: ServiceWorkerRegistration) => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setState(prev => ({ ...prev, updateAvailable: true }));
            console.log('🔄 Service Worker update available');
          }
        });
      }
    };

    // Listen for online/offline changes
    const handleOnline = () => setState(prev => ({ ...prev, isOffline: false }));
    const handleOffline = () => setState(prev => ({ ...prev, isOffline: true }));

    // Add event listeners
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check for existing registration
    navigator.serviceWorker.getRegistration().then(registration => {
      if (registration) {
        setState(prev => ({ ...prev, isRegistered: true }));
        handleUpdateFound(registration);
      }
    });

    // Cleanup
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const activateUpdate = async () => {
    if (!navigator.serviceWorker.controller) return;

    // Send a message to the service worker to skip waiting
    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
  };

  const checkForUpdates = async () => {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        console.log('🔍 Checked for service worker updates');
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
    }
  };

  return {
    ...state,
    activateUpdate,
    checkForUpdates
  };
}