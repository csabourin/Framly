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
  if ('serviceWorker' in navigator) {
    try {
      console.log('🔧 Registering service worker...');
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      console.log('✅ Service Worker registered successfully:', registration.scope);
      
      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🔄 New service worker available');
              // Could show a user notification here about updates
            }
          });
        }
      });
      
      return registration;
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
    }
  } else {
    console.log('ℹ️ Service Worker not supported');
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
    console.error('Failed to load theme from IndexedDB:', error);
    // Fallback to light theme
    document.documentElement.classList.add('light');
  }
}

// Initialize theme, persistence, and PWA functionality before rendering
Promise.all([
  initializeTheme(),
  initializePersistence(),
  registerServiceWorker()
]).then(() => {
  createRoot(document.getElementById("root")!).render(
    <Provider store={store}>
      <App />
    </Provider>
  );
}).catch(error => {
  console.error('Initialization error:', error);
  // Still render the app even if initialization fails
  createRoot(document.getElementById("root")!).render(
    <Provider store={store}>
      <App />
    </Provider>
  );
});
