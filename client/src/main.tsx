import { createRoot } from "react-dom/client";
import { Provider } from 'react-redux';
import App from "./App";
import "./index.css";
import { store } from './store';
import { initializePersistence } from './utils/persistence';
import { indexedDBManager } from './utils/indexedDB';
import i18n from './i18n';

// Register Service Worker for PWA functionality
async function registerServiceWorker() {
  if (import.meta.env.DEV) {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
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

// Do not expose an editable blank document while a saved project is still
// loading: a late restore would overwrite the user's new edits.
const root = createRoot(document.getElementById('root')!);
async function startApp() {
  root.render(<main className="p-6" role="status">{i18n.t('persistence.loading')}</main>);
  try {
    await initializePersistence();
    await initializeTheme();
    root.render(<Provider store={store}><App /></Provider>);
    void registerServiceWorker();
  } catch {
    root.render(<main className="p-6 space-y-3">
      <p role="alert">{i18n.t('persistence.loadError')}</p>
      <button className="underline" onClick={() => void startApp()}>{i18n.t('persistence.retry')}</button>
    </main>);
  }
}
void startApp();
