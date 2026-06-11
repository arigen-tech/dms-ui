// frontend/i18n/AutoTranslate.jsx - FIXED: MyMemory warning never rendered
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { translateText, getFallbackTranslation, loadAllTranslations, isWarningText } from '../i18n/autoTranslator';
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
  // FIX: Safe setter — never display warning text
  // All setTranslatedText calls go through this
  // ─────────────────────────────────────────────
  const safeSetTranslated = useCallback((result, fallbackText) => {
    if (!isMounted.current) return;
    if (!result || isWarningText(result)) {
      // Warning detected — silently fall back to original text
      setTranslatedText(fallbackText || '');
    } else {
      setTranslatedText(result);
    }
  }, []);

  // ─────────────────────────────────────────────
  // Core: translate text with fallback → DB → API → save
  // ─────────────────────────────────────────────
  const resolveTranslation = useCallback(async (text) => {
    if (!text || typeof text !== 'string' || text.trim() === '') return text;
    if (!isTranslationNeeded() || currentLanguage === 'en' || skipTranslation) return text;

    const cacheKey = getCacheKey(text, currentLanguage);

    // 1. Check local component cache
    if (translationCache.has(cacheKey)) {
      const cached = translationCache.get(cacheKey);
      // FIX: Evict any warning text that got cached previously
      if (isWarningText(cached)) {
        translationCache.delete(cacheKey);
      } else {
        return cached;
      }
    }

    // 2. Try fallback translations (synchronous, instant)
    const fallback = getFallbackTranslation(text, currentLanguage);
    if (fallback && fallback !== text && !isWarningText(fallback)) {
      translationCache.set(cacheKey, fallback);
      saveToDatabase(text, fallback, currentLanguage);
      return fallback;
    }

    // 3. Try DB via translateText (loads all translations if not loaded)
    try {
      const dbResult = await translateText(text, currentLanguage);
      // FIX: Validate result before caching/returning
      if (dbResult && dbResult !== text && !isWarningText(dbResult)) {
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
        const responseText = await res.text();

        // FIX: Reject warning response before parsing
        if (isWarningText(responseText)) {
          console.debug('MyMemory daily limit reached, using original text');
          pendingTranslations.delete(cacheKey);
          return text;
        }

        const json = JSON.parse(responseText);
        const apiResult = json?.responseData?.translatedText;

        // FIX: Also reject warning in the translated field itself
        if (apiResult
          && apiResult.trim() !== ''
          && apiResult.toLowerCase() !== text.toLowerCase()
          && !isWarningText(apiResult)) {  // ← NEW guard

          let clean = apiResult;
          try { clean = decodeURIComponent(apiResult); } catch (e) {}

          // FIX: Check once more after decode
          if (!isWarningText(clean)) {
            translationCache.set(cacheKey, clean);
            saveToDatabase(text, clean, currentLanguage);
            pendingTranslations.delete(cacheKey);
            return clean;
          }
        }
      } catch (e) {
        console.debug('Translation API error (silent):', e.message);
      }
      pendingTranslations.delete(cacheKey);
    }

    // 5. Nothing worked — return original
    return text;
  }, [currentLanguage, isTranslationNeeded, skipTranslation, getCacheKey]);

  // ─────────────────────────────────────────────
  // Save to DB (silent, background) — never saves warning text
  // ─────────────────────────────────────────────
  const saveToDatabase = async (sourceText, translatedText, languageCode) => {
    // FIX: Guard before saving
    if (isWarningText(translatedText) || isWarningText(sourceText)) return;
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
        const cached = translationCache.get(cacheKey);
        if (!isWarningText(cached)) {
          if (isMounted.current) setTranslatedText(cached);
          return;
        } else {
          // Evict stale warning from cache
          translationCache.delete(cacheKey);
        }
      }

      // Resolve translation (fallback → DB → API → save)
      const result = await resolveTranslation(text);
      // FIX: Use safeSetTranslated so warning can never slip through
      safeSetTranslated(result, text);
    };

    processTranslation();

    return () => {
      isMounted.current = false;
    };
  }, [children, currentLanguage, isTranslationNeeded, skipTranslation, resolveTranslation, getCacheKey, safeSetTranslated]);

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
        const cached = translationCache.get(cacheKey);
        if (!isWarningText(cached)) {
          if (isMounted.current) setTranslatedText(cached);
          return;
        } else {
          translationCache.delete(cacheKey);
        }
      }

      // Otherwise resolve fresh
      const resolve = async () => {
        const result = await resolveTranslation(text);
        safeSetTranslated(result, text);
      };
      resolve();
    }
  }, [currentLanguage, children, isTranslationNeeded, resolveTranslation, getCacheKey, safeSetTranslated]);

  const originalText = typeof children === 'string' ? children : String(children || '');

  // FIX: Final safety net — if translatedText is somehow a warning, show original
  const textToDisplay = (translatedText && !isWarningText(translatedText))
    ? translatedText
    : originalText;

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