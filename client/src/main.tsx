import { createRoot } from "react-dom/client";
import { Provider } from 'react-redux';
import App from "./App";
import "./index.css";
import { store } from './store';
import { initializePersistence } from './utils/persistence';
import { indexedDBManager } from './utils/indexedDB';
import './i18n'; // Initialize i18n

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

// Initialize theme and persistence system before rendering
Promise.all([
  initializeTheme(),
  initializePersistence()
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
