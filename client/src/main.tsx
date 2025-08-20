import { createRoot } from "react-dom/client";
import { Provider } from 'react-redux';
import App from "./App";
import "./index.css";
import { store } from './store';
import { initializePersistence } from './utils/persistence';

// Initialize persistence system
initializePersistence().catch(console.error);

createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <App />
  </Provider>
);
