import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from '../locales/translations';
import { STORAGE_KEYS } from '../constants/config';

const LanguageContext = createContext(null);

export const LANGUAGES = [
  { code: 'vi', label: 'Tiếng Việt', shortLabel: 'VI', flag: '🇻🇳' },
  { code: 'en', label: 'English', shortLabel: 'EN', flag: '🇬🇧' },
];

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('vi');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE).then((saved) => {
      if (saved && (saved === 'vi' || saved === 'en')) {
        setLanguageState(saved);
      }
    }).catch(() => {});
  }, []);

  const setLanguage = async (langCode) => {
    setLanguageState(langCode);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, langCode);
    } catch {
      // ignore
    }
  };

  /**
   * Helper dịch theo dot-notation: t('common.appName')
   */
  const t = (path, fallback = '') => {
    if (!path) return fallback;
    const keys = path.split('.');
    let current = translations[language];
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        // Fallback sang tiếng Việt hoặc key
        let fb = translations['vi'];
        for (const k of keys) {
          if (fb && typeof fb === 'object' && k in fb) fb = fb[k];
          else return fallback || path;
        }
        return fb || fallback || path;
      }
    }
    return current ?? fallback ?? path;
  };

  const value = {
    language,
    setLanguage,
    t,
    currentLangObj: LANGUAGES.find((l) => l.code === language) || LANGUAGES[0],
    isVietnamese: language === 'vi',
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

