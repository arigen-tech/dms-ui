// frontend/i18n/autoTranslator.js - FIXED VERSION
import { API_HOST } from '../API/apiConfig';

const translationCache = {};
let supportedLanguages = null;
let cacheLoaded = false;

// Load cached translations from localStorage on module load
const loadCacheFromStorage = () => {
  if (!cacheLoaded) {
    try {
      const cached = localStorage.getItem('translationCache');
      if (cached) {
        const parsed = JSON.parse(cached);
        Object.assign(translationCache, parsed);
        console.log('📦 Loaded cached translations from localStorage');
      }
      cacheLoaded = true;
    } catch (error) {
      console.error('Error loading translation cache:', error);
    }
  }
};

// Save cache to localStorage
const saveCacheToStorage = () => {
  try {
    localStorage.setItem('translationCache', JSON.stringify(translationCache));
  } catch (error) {
    console.error('Error saving translation cache:', error);
  }
};

// COMPLETE Fallback translations for Hindi, Odia, and Marathi (UI ONLY)
const fallbackTranslations = {
  'hi': {
    // Table Headers & Common UI
    'Address': 'पता',
    'SN': 'क्र.सं.',
    'Action': 'कार्रवाई',
    'Department': 'विभाग',
    'All Branches': 'सभी शाखाएँ',
    'Select Branch': 'शाखा चुनें',
    'Branch': 'शाखा',
    'Category': 'वर्ग',
    'Email': 'ईमेल',
    'Select Department': 'विभाग चुनें',
    'CreatedBy': 'निर्माता',
    'Mobile Number': 'मोबाइल नंबर',
    'UpdatedBy': 'अपडेटकर्ता',
    'Updated Date': 'अपडेट तारीख',
    'Assign Role': 'भूमिका सौंपें',



    // Placeholders
    'Enter Mobile Number': 'मोबाइल नंबर दर्ज करें',
    'Enter Email': 'ईमेल दर्ज करें',
    



  },
  'or': {

    'Captcha': 'କ୍ୟାପ୍ଚା',
    'SN': 'କ୍ରମିକ ସଂଖ୍ୟା',



  },
  'mr': {

  }
};

const MYMEMORY_API = 'https://api.mymemory.translated.net/get';

/**
 * Get fallback translation IMMEDIATELY (synchronous)
 */
export const getFallbackTranslation = (text, targetLanguageCode) => {
  if (!text || !targetLanguageCode || targetLanguageCode === 'en') {
    return null;
  }

  if (!fallbackTranslations[targetLanguageCode]) {
    return null;
  }

  const fallbacks = fallbackTranslations[targetLanguageCode];

  // Exact match (case-sensitive first)
  if (fallbacks[text]) {
    return fallbacks[text];
  }

  // Case-insensitive match
  const lowerText = text.toLowerCase();
  for (const [key, value] of Object.entries(fallbacks)) {
    if (key.toLowerCase() === lowerText) {
      return value;
    }
  }

  return null;
};

/**
 * Fetch supported languages from your Language Master API
 */
export const fetchSupportedLanguages = async () => {
  if (supportedLanguages) {
    return supportedLanguages;
  }

  try {
    console.log('📡 Fetching supported languages from Language Master API...');

    const response = await fetch(`${API_HOST}/languageMaster/getAll/1`, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      supportedLanguages = {};

      data.forEach(lang => {
        supportedLanguages[lang.code] = {
          name: lang.name,
          code: lang.code,
          isActive: lang.isActive,
          nativeName: lang.nativeName || lang.name
        };
      });

      console.log('✓ Languages loaded:', Object.keys(supportedLanguages));
      return supportedLanguages;
    }

    console.warn('⚠️ No languages found in API response');
    return {};

  } catch (error) {
    console.error('Error fetching languages:', error);
    return {};
  }
};

/**
 * Try fallback translation first (immediate), then MyMemory for UI elements only
 * Messages are NOT translated
 */
export const translateText = async (text, targetLanguageCode = 'en') => {
  // Skip translation if not needed
  if (!text || typeof text !== 'string' || text.trim() === '' || targetLanguageCode === 'en') {
    return text;
  }

  // Load cache if not loaded
  if (!cacheLoaded) {
    loadCacheFromStorage();
  }

  const cacheKey = `${text}_${targetLanguageCode}`;

  // Check cache first (includes localStorage cache)
  if (translationCache[cacheKey]) {
    return translationCache[cacheKey];
  }

  // Try fallback translation FIRST (immediate, no API call)
  const fallbackResult = getFallbackTranslation(text, targetLanguageCode);
  if (fallbackResult) {
    translationCache[cacheKey] = fallbackResult;
    saveCacheToStorage();
    console.log(`✓ [Fallback] Translated: "${text}" -> "${fallbackResult}"`);
    return fallbackResult;
  }

  // Only call MyMemory API if no fallback found
  try {
    console.log(`🔄 [MyMemory] Translating: "${text}" to ${targetLanguageCode}`);

    const langPair = `en|${targetLanguageCode}`;

    const response = await fetch(
      `${MYMEMORY_API}?q=${encodeURIComponent(text)}&langpair=${langPair}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();

    if (data.responseData && data.responseData.translatedText) {
      const translatedText = data.responseData.translatedText;

      if (translatedText && translatedText.trim() !== '' && translatedText !== text) {
        translationCache[cacheKey] = translatedText;
        saveCacheToStorage();
        console.log(`✓ [MyMemory] Translated: "${text}" -> "${translatedText}"`);
        return translatedText;
      }
    }

    // If translation failed, cache the original text to prevent retries
    translationCache[cacheKey] = text;
    saveCacheToStorage();
    return text;

  } catch (error) {
    console.error('MyMemory Translation error:', error.message);

    // Cache the original text on error
    translationCache[cacheKey] = text;
    saveCacheToStorage();
    return text;
  }
};

/**
 * Translate multiple texts at once (batch)
 */
export const translateBatch = async (texts, targetLanguageCode = 'en') => {
  if (!Array.isArray(texts) || texts.length === 0 || targetLanguageCode === 'en') {
    return texts;
  }

  try {
    console.log(`🔄 Batch translating ${texts.length} items to ${targetLanguageCode}`);

    const translations = await Promise.all(
      texts.map(text => translateText(text, targetLanguageCode))
    );

    console.log(`✓ Batch translated ${translations.length} items`);
    return translations;

  } catch (error) {
    console.error('Batch translation error:', error);
    return texts;
  }
};

/**
 * Get all supported languages from your API
 */
export const getSupportedLanguages = async () => {
  if (!supportedLanguages) {
    await fetchSupportedLanguages();
  }
  return supportedLanguages;
};

/**
 * Get language name by code
 */
export const getLanguageName = async (languageCode) => {
  if (!supportedLanguages) {
    await fetchSupportedLanguages();
  }

  const lang = supportedLanguages[languageCode];
  return lang ? lang.name : languageCode;
};

/**
 * Check if a language is active
 */
export const isLanguageActive = async (languageCode) => {
  if (!supportedLanguages) {
    await fetchSupportedLanguages();
  }

  const lang = supportedLanguages[languageCode];
  return lang ? lang.isActive : false;
};

/**
 * Add custom fallback translations (UI only)
 */
export const addFallbackTranslations = (languageCode, translations) => {
  if (!['hi', 'or', 'mr'].includes(languageCode)) {
    console.warn(`⚠️ Only hi, or, mr languages are supported for fallback`);
    return;
  }

  if (!fallbackTranslations[languageCode]) {
    fallbackTranslations[languageCode] = {};
  }

  Object.assign(fallbackTranslations[languageCode], translations);
  console.log(`✓ Added fallback translations for ${languageCode}`);
};

/**
 * Clear translation cache for specific language
 */
export const clearLanguageCache = (languageCode) => {
  let cleared = 0;
  Object.keys(translationCache).forEach(key => {
    if (key.endsWith(`_${languageCode}`)) {
      delete translationCache[key];
      cleared++;
    }
  });
  saveCacheToStorage();
  console.log(`🗑️ Cleared ${cleared} cached translations for language: ${languageCode}`);
};

/**
 * Clear all translation cache
 */
export const clearTranslationCache = () => {
  const size = Object.keys(translationCache).length;
  Object.keys(translationCache).forEach(key => {
    delete translationCache[key];
  });
  saveCacheToStorage();
  console.log(`🗑️ Cleared ${size} cached translations`);
};

/**
 * Reload supported languages
 */
export const reloadSupportedLanguages = async () => {
  supportedLanguages = null;
  return await fetchSupportedLanguages();
};

/**
 * Get cache info
 */
export const getCacheInfo = () => {
  return {
    size: Object.keys(translationCache).length,
    keys: Object.keys(translationCache),
    languages: supportedLanguages
  };
};

/**
 * Translate all strings in an object recursively
 */
export const translateObject = async (obj, targetLanguageCode = 'en') => {
  if (targetLanguageCode === 'en' || !obj) {
    return obj;
  }

  const translatedObj = { ...obj };

  for (const key in translatedObj) {
    if (typeof translatedObj[key] === 'string') {
      translatedObj[key] = await translateText(translatedObj[key], targetLanguageCode);
    } else if (typeof translatedObj[key] === 'object' && translatedObj[key] !== null) {
      translatedObj[key] = await translateObject(translatedObj[key], targetLanguageCode);
    }
  }

  return translatedObj;
};

/**
 * Preload translations for specific terms
 */
export const preloadTranslations = async (terms, languageCode) => {
  if (languageCode === 'en' || !terms || !Array.isArray(terms) || terms.length === 0) {
    return;
  }

  console.log(`🔄 Preloading ${terms.length} terms for ${languageCode}`);

  // Filter out already cached terms
  const termsToTranslate = terms.filter(term => {
    const cacheKey = `${term}_${languageCode}`;
    return !translationCache[cacheKey];
  });

  if (termsToTranslate.length === 0) {
    console.log(`✅ All ${terms.length} terms already cached for ${languageCode}`);
    return;
  }

  // Translate in batches of 5 to avoid rate limiting
  const batchSize = 5;
  for (let i = 0; i < termsToTranslate.length; i += batchSize) {
    const batch = termsToTranslate.slice(i, i + batchSize);
    await Promise.all(
      batch.map(term => translateText(term, languageCode))
    );
  }

  console.log(`✅ Preloaded ${termsToTranslate.length} terms for ${languageCode}`);
};