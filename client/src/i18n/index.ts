import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Translation resources
import enTranslations from './locales/en.json';
import frTranslations from './locales/fr.json';

// Settings persistence
const LANGUAGE_STORAGE_KEY = 'design-tool-language';

// Custom language detector that integrates with IndexedDB settings
const customLanguageDetector = {
  name: 'customDetector',
  
  async: true,
  
  detect: async (callback: (lng: string) => void) => {
    try {
      // Try to get language from IndexedDB settings first
      const request = indexedDB.open('design-tool-settings', 1);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['settings'], 'readonly');
        const store = transaction.objectStore('settings');
        const getRequest = store.get('language');
        
        getRequest.onsuccess = () => {
          if (getRequest.result?.value) {
            callback(getRequest.result.value);
          } else {
            // Fallback to browser language detection
            const browserLang = navigator.language.split('-')[0];
            const supportedLang = ['en', 'fr'].includes(browserLang) ? browserLang : 'en';
            callback(supportedLang);
          }
        };
        
        getRequest.onerror = () => {
          // Fallback to browser language
          const browserLang = navigator.language.split('-')[0];
          const supportedLang = ['en', 'fr'].includes(browserLang) ? browserLang : 'en';
          callback(supportedLang);
        };
      };
      
      request.onerror = () => {
        // Fallback to browser language
        const browserLang = navigator.language.split('-')[0];
        const supportedLang = ['en', 'fr'].includes(browserLang) ? browserLang : 'en';
        callback(supportedLang);
      };
      
      // Setup IndexedDB structure if it doesn't exist
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    } catch (error) {
      console.error('Language detection error:', error);
      callback('en');
    }
  },
  
  cacheUserLanguage: async (lng: string) => {
    try {
      const request = indexedDB.open('design-tool-settings', 1);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['settings'], 'readwrite');
        const store = transaction.objectStore('settings');
        store.put({ key: 'language', value: lng });
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('settings')) {
          const settingsStore = db.createObjectStore('settings', { keyPath: 'key' });
          settingsStore.put({ key: 'language', value: lng });
        }
      };
    } catch (error) {
      console.error('Language caching error:', error);
    }
  }
};

// Initialize i18n
i18n
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    resources: {
      en: {
        translation: enTranslations
      },
      fr: {
        translation: frTranslations
      }
    },
    
    // Language detection
    detection: {
      order: ['customDetector', 'navigator'],
      caches: ['customDetector']
    },
    
    fallbackLng: 'en',
    debug: false,
    
    interpolation: {
      escapeValue: false // React already does escaping
    },
    
    // Custom detector
    lng: undefined // Let detector determine initial language
  });

// Add custom detector
i18n.services.languageDetector?.addDetector(customLanguageDetector);

export default i18n;

// Helper function to change language
export const changeLanguage = (lng: string) => {
  return i18n.changeLanguage(lng);
};

// Helper function to get current language
export const getCurrentLanguage = () => {
  return i18n.language || 'en';
};

// Helper function to get available languages
export const getAvailableLanguages = () => {
  return [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' }
  ];
};