// frontend/i18n/AutoTranslate.jsx - FIXED VERSION WITH AUTO-SAVE
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { translateText, getFallbackTranslation, loadAllTranslations } from '../i18n/autoTranslator';
import { useLanguage } from '../i18n/LanguageContext';
import apiClient from '../API/apiClient';
import { API_HOST } from '../API/apiConfig';

// Global cache — persists across renders, survives re-mounts
const translationCache = new Map();

// Track which texts are currently being translated (prevent duplicate API calls)
const pendingTranslations = new Set();

const AutoTranslate = ({
  children,
  className = '',
  showOriginalOnHover = false,
  skipTranslation = false
}) => {
  const [translatedText, setTranslatedText] = useState('');
  const { currentLanguage, isTranslationNeeded } = useLanguage();
  const isMounted = useRef(true);
  const lastLanguage = useRef(currentLanguage);

  const getCacheKey = useCallback((text, lang) => `${text}_${lang}`, []);

  // ─────────────────────────────────────────────
  // Core: translate text with fallback → DB → API → save
  // ─────────────────────────────────────────────
  const resolveTranslation = useCallback(async (text) => {
    if (!text || typeof text !== 'string' || text.trim() === '') return text;
    if (!isTranslationNeeded() || currentLanguage === 'en' || skipTranslation) return text;

    const cacheKey = getCacheKey(text, currentLanguage);

    // 1. Check local component cache
    if (translationCache.has(cacheKey)) {
      return translationCache.get(cacheKey);
    }

    // 2. Try fallback translations (synchronous, instant)
    const fallback = getFallbackTranslation(text, currentLanguage);
    if (fallback && fallback !== text) {
      translationCache.set(cacheKey, fallback);
      // Save fallback to DB in background
      saveToDatabase(text, fallback, currentLanguage);
      return fallback;
    }

    // 3. Try DB via translateText (loads all translations if not loaded)
    try {
      const dbResult = await translateText(text, currentLanguage);
      if (dbResult && dbResult !== text) {
        translationCache.set(cacheKey, dbResult);
        return dbResult;
      }
    } catch (e) {}

    // 4. Not in DB — call MyMemory API directly and save to DB
    if (navigator.onLine && !pendingTranslations.has(cacheKey)) {
      pendingTranslations.add(cacheKey);
      try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${currentLanguage}`;
        const res = await fetch(url);
        const json = await res.json();
        const apiResult = json?.responseData?.translatedText;

        if (apiResult
          && apiResult.trim() !== ''
          && apiResult.toLowerCase() !== text.toLowerCase()) {

          let clean = apiResult;
          try { clean = decodeURIComponent(apiResult); } catch (e) {}

          translationCache.set(cacheKey, clean);
          // Save to DB so next time it comes from DB
          saveToDatabase(text, clean, currentLanguage);
          pendingTranslations.delete(cacheKey);
          return clean;
        }
      } catch (e) {
        // Silent fail
      }
      pendingTranslations.delete(cacheKey);
    }

    // 5. Nothing worked — return original
    return text;
  }, [currentLanguage, isTranslationNeeded, skipTranslation, getCacheKey]);

  // ─────────────────────────────────────────────
  // Save to DB (silent, background)
  // ─────────────────────────────────────────────
  const saveToDatabase = async (sourceText, translatedText, languageCode) => {
    try {
      await apiClient.post(`${API_HOST}/translate/saveFallback`, {
        sourceText,
        translatedText,
        languageCode
      });
      console.log(`💾 [AutoTranslate] Saved: "${sourceText}" → "${translatedText}" (${languageCode})`);
    } catch (e) {
      // Silent fail
    }
  };

  // ─────────────────────────────────────────────
  // Main effect — runs on mount and when text/language changes
  // ─────────────────────────────────────────────
  useEffect(() => {
    isMounted.current = true;

    const processTranslation = async () => {
      if (!children) {
        if (isMounted.current) setTranslatedText('');
        return;
      }

      const text = typeof children === 'string' ? children : String(children);

      if (!isTranslationNeeded() || currentLanguage === 'en' || skipTranslation) {
        if (isMounted.current) setTranslatedText(text);
        return;
      }

      // Show original immediately while translating
      if (isMounted.current) setTranslatedText(text);

      // Check component cache for instant display
      const cacheKey = getCacheKey(text, currentLanguage);
      if (translationCache.has(cacheKey)) {
        if (isMounted.current) setTranslatedText(translationCache.get(cacheKey));
        return;
      }

      // Resolve translation (fallback → DB → API → save)
      const result = await resolveTranslation(text);
      if (isMounted.current && result) {
        setTranslatedText(result);
      }
    };

    processTranslation();

    return () => {
      isMounted.current = false;
    };
  }, [children, currentLanguage, isTranslationNeeded, skipTranslation, resolveTranslation, getCacheKey]);

  // ─────────────────────────────────────────────
  // Language change effect
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (lastLanguage.current !== currentLanguage) {
      lastLanguage.current = currentLanguage;

      if (!children || !isTranslationNeeded() || currentLanguage === 'en') return;

      const text = typeof children === 'string' ? children : String(children);
      const cacheKey = getCacheKey(text, currentLanguage);

      // Clear old language cache entry so fresh translation happens
      if (translationCache.has(getCacheKey(text, lastLanguage.current))) {
        translationCache.delete(getCacheKey(text, lastLanguage.current));
      }

      // Show instantly from cache if available
      if (translationCache.has(cacheKey)) {
        if (isMounted.current) setTranslatedText(translationCache.get(cacheKey));
        return;
      }

      // Otherwise resolve fresh
      const resolve = async () => {
        const result = await resolveTranslation(text);
        if (isMounted.current && result) setTranslatedText(result);
      };
      resolve();
    }
  }, [currentLanguage, children, isTranslationNeeded, resolveTranslation, getCacheKey]);

  const textToDisplay = translatedText || (typeof children === 'string' ? children : String(children || ''));
  const originalText = typeof children === 'string' ? children : String(children || '');

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