// frontend/i18n/LanguageContext.js
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import {
  translateText,
  fetchSupportedLanguages,
  reloadSupportedLanguages,
  preloadTranslations
} from './autoTranslator';
import { API_HOST } from '../API/apiConfig';
import apiClient from "../API/apiClient";

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  // Load language preference from localStorage
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    const savedLang = localStorage.getItem('uilanguage');
    return savedLang || 'en';
  });

  const [availableLanguages, setAvailableLanguages] = useState([]);
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(true);
  const [defaultLanguage, setDefaultLanguage] = useState('en');
  const [translationStatus, setTranslationStatus] = useState({
    isTranslating: false,
    hasTranslations: false,
    language: 'en'
  });

  // Load available languages from your Language Master API
  const loadLanguages = async () => {
    setIsLoadingLanguages(true);

    try {
      console.log('📡 Loading languages from Language Master API...');
      
      // FIX: apiClient returns data directly, not a Response object
      const response = await apiClient.get(`${API_HOST}/languageMaster/getAll/1`);
      
      // Log the response to debug
      console.log('API Response:', response);

      // Handle different response structures
      let languages = [];
      
      if (Array.isArray(response)) {
        languages = response;
      } else if (response?.data && Array.isArray(response.data)) {
        languages = response.data;
      } else if (response?.data?.data && Array.isArray(response.data.data)) {
        languages = response.data.data;
      }

      if (languages.length > 0) {
        setAvailableLanguages(languages);
        
        // Find active language or default to first one
        const activeLang = languages.find(l => l.isActive === true) || languages[0];
        if (activeLang) {
          setDefaultLanguage(activeLang.code);
        }

        // Load into translation module
        await fetchSupportedLanguages();
      } else {
        console.warn('No languages returned from API');
        setAvailableLanguages([]);
      }

    } catch (error) {
      console.error("Error loading languages:", error);
      setAvailableLanguages([]);
    } finally {
      setIsLoadingLanguages(false);
    }
  };

  // Change language and save preference
  const changeLanguage = useCallback(async (languageCode) => {
    if (languageCode === currentLanguage) return;

    // Verify language is in available languages
    const isAvailable = availableLanguages.some(l => l.code === languageCode);
    if (!isAvailable && languageCode !== 'en') {
      console.warn(`Language ${languageCode} not available`);
      return;
    }

    setTranslationStatus({
      isTranslating: languageCode !== 'en',
      hasTranslations: false,
      language: languageCode
    });

    localStorage.setItem('uilanguage', languageCode);
    setCurrentLanguage(languageCode);

    window.dispatchEvent(new CustomEvent('languageChanged', {
      detail: { languageCode, timestamp: Date.now() }
    }));

    setTimeout(() => {
      setTranslationStatus({
        isTranslating: false,
        hasTranslations: languageCode !== 'en',
        language: languageCode
      });
    }, languageCode !== 'en' ? 300 : 0);
  }, [currentLanguage, availableLanguages]);

  const isTranslationNeeded = useCallback(() => {
    return currentLanguage && currentLanguage !== 'en';
  }, [currentLanguage]);

  const translate = useCallback(async (text) => {
    if (currentLanguage === 'en' || !text) return text;
    try {
      return await translateText(text, currentLanguage);
    } catch {
      return text;
    }
  }, [currentLanguage]);

  const getLanguageName = useCallback((languageCode) => {
    const language = availableLanguages.find(lang => lang.code === languageCode);
    return language ? language.name : languageCode;
  }, [availableLanguages]);

  const getLanguageNativeName = useCallback((languageCode) => {
    const language = availableLanguages.find(lang => lang.code === languageCode);
    return language ? (language.nativeName || language.name) : languageCode;
  }, [availableLanguages]);

  const isLanguageActive = useCallback((languageCode) => {
    const language = availableLanguages.find(lang => lang.code === languageCode);
    return language ? language.isActive : false;
  }, [availableLanguages]);

  const preloadTranslationsForTerms = useCallback(async (terms) => {
    if (currentLanguage === 'en' || !terms?.length) return;
    try {
      await preloadTranslations(terms, currentLanguage);
    } catch (error) {
      console.error('Error preloading translations:', error);
    }
  }, [currentLanguage]);

  useEffect(() => {
    loadLanguages();
  }, []);

  useEffect(() => {
    const savedLang = localStorage.getItem('uilanguage');
    if (savedLang && savedLang !== currentLanguage) {
      setTimeout(() => changeLanguage(savedLang), 100);
    }
  }, [changeLanguage, currentLanguage]);

  useEffect(() => {
    if (currentLanguage === 'en') {
      setTranslationStatus({
        isTranslating: false,
        hasTranslations: false,
        language: 'en'
      });
    }
  }, [currentLanguage]);

  return (
    <LanguageContext.Provider value={{
      currentLanguage,
      availableLanguages,
      isLoadingLanguages,
      defaultLanguage,
      translationStatus,
      changeLanguage,
      translate,
      loadLanguages,
      reloadLanguages: reloadSupportedLanguages,
      isTranslationNeeded,
      getLanguageName,
      getLanguageNativeName,
      isLanguageActive,
      preloadTranslationsForTerms
    }}>
      {children}
    </LanguageContext.Provider>
  );
};