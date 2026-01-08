import { createRoot } from "react-dom/client";
import { Provider } from 'react-redux';
import App from "./App";
import "./index.css";
import { store } from './store';
import { initializePersistence } from './utils/persistence';
import { indexedDBManager } from './utils/indexedDB';
import './i18n'; // Initialize i18n

// Register Service Worker for PWA functionality
async function registerServiceWorker() {
  if (import.meta.env.DEV) {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        console.log('Unregistered Service Worker in development mode');
      }
    }
    return null;
  }

  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Could show a user notification here about updates
            }
          });
        }
      });

      return registration;
    } catch (error) {
      // Service Worker registration failed
    }
  }
}

// Initialize theme from IndexedDB before React renders
async function initializeTheme() {
  try {
    await indexedDBManager.init();
    const savedTheme = await indexedDBManager.loadSetting('theme');
    const theme = savedTheme || 'light';
    document.documentElement.classList.add(theme);
  } catch (error) {
    // Fallback to light theme
    document.documentElement.classList.add('light');
  }
}

// Initialize theme, persistence, and PWA functionality before rendering
// Add a race condition to prevent the app from hanging if IDB fails or is blocked
const activeInit = Promise.all([
  initializeTheme().catch(e => console.error('Theme init failed', e)),
  initializePersistence().catch(e => console.error('Persistence init failed', e)),
  registerServiceWorker().catch(e => console.error('SW register failed', e))
]);

const timeoutFallback = new Promise<void>((resolve) => {
  setTimeout(() => {
    console.warn('Initialization taking longer than 3s, proceeding to render...');
    resolve();
  }, 3000); // Force render after 3s
});

Promise.race([activeInit, timeoutFallback]).finally(() => {
  createRoot(document.getElementById("root")!).render(
    <Provider store={store}>
      <App />
    </Provider>
  );
});
