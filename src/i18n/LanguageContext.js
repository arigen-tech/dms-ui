import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { 
  translateText, 
  fetchSupportedLanguages,
  reloadSupportedLanguages,
  preloadTranslations
} from '../i18n/autoTranslator';
import { API_HOST } from '../API/apiConfig';

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
    console.log('📱 Loading saved language:', savedLang || 'en (default)');
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
      const response = await fetch(
        `${API_HOST}/languageMaster/getAll/1`,
        {
          headers: {
            "Accept": "application/json"
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        setAvailableLanguages(data);
        console.log('✓ Languages loaded:', data.map(l => ({ code: l.code, name: l.name, isActive: l.isActive })));

        // Find active language or default to first one
        const activeLang = data.find(l => l.isActive === true) || data[0];
        if (activeLang) {
          setDefaultLanguage(activeLang.code);
          console.log('📌 Default language set to:', activeLang.code);
        }

        // Also load into translation module
        await fetchSupportedLanguages();
      } else {
        console.warn('⚠️ No languages returned from API');
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
    console.log(`🔤 Requested language change to: ${languageCode}`);
    
    // Don't change if already on this language
    if (languageCode === currentLanguage) {
      console.log('✅ Already on this language');
      return;
    }
    
    // Verify language is in available languages
    const isAvailable = availableLanguages.some(l => l.code === languageCode);
    if (!isAvailable && languageCode !== 'en') {
      console.warn(`⚠️ Language ${languageCode} not available in loaded languages`);
      return;
    }

    // Update translation status
    setTranslationStatus({
      isTranslating: languageCode !== 'en',
      hasTranslations: false,
      language: languageCode
    });

    // Save preference
    localStorage.setItem('uilanguage', languageCode);
    
    // Update state
    setCurrentLanguage(languageCode);
    
    // Dispatch event for AutoTranslate components
    window.dispatchEvent(new CustomEvent('languageChanged', {
      detail: { 
        languageCode,
        timestamp: Date.now()
      }
    }));
    
    // Mark translations as loaded after a short delay
    setTimeout(() => {
      setTranslationStatus({
        isTranslating: false,
        hasTranslations: languageCode !== 'en',
        language: languageCode
      });
    }, languageCode !== 'en' ? 300 : 0);
    
    console.log(`✅ Language changed successfully to: ${languageCode}`);
  }, [currentLanguage, availableLanguages]);

  // Check if translation is needed
  const isTranslationNeeded = useCallback(() => {
    const needsTranslation = currentLanguage && currentLanguage !== 'en';
    return needsTranslation;
  }, [currentLanguage]);

  // Translate function (wrapper around the auto translator)
  const translate = useCallback(async (text) => {
    if (currentLanguage === 'en' || !text) {
      return text;
    }

    try {
      return await translateText(text, currentLanguage);
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  }, [currentLanguage]);

  // Get language name by code
  const getLanguageName = useCallback((languageCode) => {
    const language = availableLanguages.find(lang => lang.code === languageCode);
    return language ? language.name : languageCode;
  }, [availableLanguages]);

  // Get language native name by code
  const getLanguageNativeName = useCallback((languageCode) => {
    const language = availableLanguages.find(lang => lang.code === languageCode);
    return language ? (language.nativeName || language.name) : languageCode;
  }, [availableLanguages]);

  // Check if language is active
  const isLanguageActive = useCallback((languageCode) => {
    const language = availableLanguages.find(lang => lang.code === languageCode);
    return language ? language.isActive : false;
  }, [availableLanguages]);

  // Function to preload translations for specific terms
  const preloadTranslationsForTerms = useCallback(async (terms) => {
    if (currentLanguage === 'en' || !terms || terms.length === 0) {
      return;
    }

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

  // Update language from localStorage on mount
  useEffect(() => {
    const savedLang = localStorage.getItem('uilanguage');
    if (savedLang && savedLang !== currentLanguage) {
      console.log(`🔄 Found saved language ${savedLang}, updating...`);
      // Use setTimeout to ensure context is fully initialized
      setTimeout(() => {
        changeLanguage(savedLang);
      }, 100);
    }
  }, [changeLanguage, currentLanguage]);

  // Clear translation status when language is English
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
      preloadTranslationsForTerms // Add this new function
    }}>
      {children}
    </LanguageContext.Provider>
  );
};