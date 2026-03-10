// frontend/i18n/LanguageContext.js - COMPLETE FIXED VERSION
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import {
  translateText,
  fetchSupportedLanguages,
  reloadSupportedLanguages,
  preloadTranslations,
  getSupportedLanguages
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
      
      // FIX: apiClient returns data directly
      const response = await apiClient.get(`${API_HOST}/languageMaster/getAll/1`);
      
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
        // Filter active languages and format them
        const formattedLanguages = languages
          .filter(lang => lang && lang.code) // Ensure language has code
          .map(lang => ({
            id: lang.id || lang.code,
            code: lang.code,
            name: lang.name || lang.code,
            nativeName: lang.nativeName || lang.name || lang.code,
            isActive: lang.isActive === true
          }));

        setAvailableLanguages(formattedLanguages);
        
        // Find first active language as default
        const activeLang = formattedLanguages.find(l => l.isActive) || formattedLanguages[0];
        if (activeLang) {
          setDefaultLanguage(activeLang.code);
        }

        // Load into translation module
        await fetchSupportedLanguages();
      } else {
        console.warn('No languages returned from API');
        // Add default English as fallback
        setAvailableLanguages([{
          id: 'en',
          code: 'en',
          name: 'English',
          nativeName: 'English',
          isActive: true
        }]);
      }

    } catch (error) {
      console.error("Error loading languages:", error);
      // Add default English as fallback on error
      setAvailableLanguages([{
        id: 'en',
        code: 'en',
        name: 'English',
        nativeName: 'English',
        isActive: true
      }]);
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

    // Save to localStorage
    localStorage.setItem('uilanguage', languageCode);
    setCurrentLanguage(languageCode);

    // Dispatch event for components to react
    window.dispatchEvent(new CustomEvent('languageChanged', {
      detail: { languageCode, timestamp: Date.now() }
    }));

    // Update status after a delay
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
    } catch (error) {
      console.error('Translation error:', error);
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

  // Load languages on mount
  useEffect(() => {
    loadLanguages();
  }, []);

  // Check saved language after languages are loaded
  useEffect(() => {
    if (!isLoadingLanguages && availableLanguages.length > 0) {
      const savedLang = localStorage.getItem('uilanguage');
      if (savedLang && savedLang !== currentLanguage) {
        // Check if saved language exists in available languages
        const langExists = availableLanguages.some(l => l.code === savedLang);
        if (langExists) {
          changeLanguage(savedLang);
        }
      }
    }
  }, [isLoadingLanguages, availableLanguages, currentLanguage, changeLanguage]);

  // Update translation status when language changes to English
  useEffect(() => {
    if (currentLanguage === 'en') {
      setTranslationStatus({
        isTranslating: false,
        hasTranslations: false,
        language: 'en'
      });
    }
  }, [currentLanguage]);

  const value = {
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
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};