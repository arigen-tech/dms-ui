// frontend/i18n/AutoTranslate.jsx - FIXED VERSION
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { translateText, getFallbackTranslation } from '../i18n/autoTranslator';
import { useLanguage } from '../i18n/LanguageContext';

// Global cache
const translationCache = new Map();

const AutoTranslate = ({ 
  children, 
  className = '', 
  showOriginalOnHover = false,
  skipTranslation = false 
}) => {
  const [translatedText, setTranslatedText] = useState('');
  const { currentLanguage, isTranslationNeeded } = useLanguage();
  const isMounted = useRef(true);
  const lastText = useRef('');
  const lastLanguage = useRef(currentLanguage);
  const translationAttempted = useRef(false);

  const getCacheKey = useCallback((text, lang) => {
    return `${text}_${lang}`;
  }, []);

  const translate = useCallback(async (text) => {
    if (!text || typeof text !== 'string' || !isTranslationNeeded() || currentLanguage === 'en' || skipTranslation) {
      return text;
    }

    const cacheKey = getCacheKey(text, currentLanguage);
    
    // Check cache first
    if (translationCache.has(cacheKey)) {
      return translationCache.get(cacheKey);
    }

    // Try to translate
    try {
      const result = await translateText(text, currentLanguage);
      translationCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  }, [currentLanguage, isTranslationNeeded, skipTranslation, getCacheKey]);

  useEffect(() => {
    isMounted.current = true;
    translationAttempted.current = false;
    
    const processTranslation = async () => {
      if (!children) {
        if (isMounted.current) {
          setTranslatedText('');
        }
        return;
      }

      const text = typeof children === 'string' ? children : String(children);
      
      // Check if we need to translate
      const shouldTranslate = isTranslationNeeded() && 
                            currentLanguage !== 'en' && 
                            !skipTranslation;

      if (shouldTranslate) {
        // Try fallback FIRST for immediate display
        const fallbackResult = getFallbackTranslation(text, currentLanguage);
        if (fallbackResult && isMounted.current) {
          setTranslatedText(fallbackResult);
          translationCache.set(getCacheKey(text, currentLanguage), fallbackResult);
          console.log(`✓ [Fallback - Immediate] "${text}" -> "${fallbackResult}"`);
          translationAttempted.current = true;
          return;
        }

        // If no fallback, set to original text initially
        if (isMounted.current) {
          setTranslatedText(text);
        }

        // Then try async translation in background
        const result = await translate(text);
        if (isMounted.current && result !== text && translationAttempted.current === false) {
          setTranslatedText(result);
          translationAttempted.current = true;
        }
      } else {
        // English or translation not needed
        if (isMounted.current) {
          setTranslatedText(text);
        }
      }
    };

    processTranslation();

    return () => {
      isMounted.current = false;
    };
  }, [children, currentLanguage, isTranslationNeeded, skipTranslation, translate, getCacheKey]);

  // Handle language changes
  useEffect(() => {
    if (lastLanguage.current !== currentLanguage && children && isTranslationNeeded()) {
      translationAttempted.current = false;
      const text = typeof children === 'string' ? children : String(children);
      
      // Try fallback FIRST
      const fallbackResult = getFallbackTranslation(text, currentLanguage);
      if (fallbackResult && isMounted.current) {
        setTranslatedText(fallbackResult);
        translationCache.set(getCacheKey(text, currentLanguage), fallbackResult);
        console.log(`✓ [Fallback - Language Change] "${text}" -> "${fallbackResult}"`);
        lastLanguage.current = currentLanguage;
        translationAttempted.current = true;
        return;
      }

      // Then try async
      const processLanguageChange = async () => {
        const result = await translate(text);
        if (isMounted.current && result !== text && !translationAttempted.current) {
          setTranslatedText(result);
          translationAttempted.current = true;
        }
        lastLanguage.current = currentLanguage;
      };
      
      processLanguageChange();
    }
  }, [currentLanguage, children, isTranslationNeeded, translate, getCacheKey]);

  const textToDisplay = translatedText || children || '';
  const originalText = typeof children === 'string' ? children : String(children);

  if (showOriginalOnHover && textToDisplay !== originalText) {
    return (
      <span className={className} title={`Original: ${originalText}`}>
        {textToDisplay}
      </span>
    );
  }

  return (
    <span className={className}>
      {textToDisplay}
    </span>
  );
};

export default AutoTranslate;