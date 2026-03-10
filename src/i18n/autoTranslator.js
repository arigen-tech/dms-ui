// frontend/i18n/autoTranslator.js - COMPLETE FIXED VERSION WITH DATABASE FIRST
import { API_HOST } from '../API/apiConfig';
import apiClient from "../API/apiClient";

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
    'Category': 'श्रेणी',
    'Email': 'ईमेल',
    'Select Department': 'विभाग चुनें',
    'CreatedBy': 'निर्माता',
    'Mobile Number': 'मोबाइल नंबर',
    'Mobile No.': 'मोबाइल नंबर',
    'Name': 'नाम',
    'UpdatedBy': 'अपडेटकर्ता',
    'Updated Date': 'अपडेट तारीख',
    'Assign Role': 'भूमिका सौंपें',
    'Start Date': 'प्रारंभ तिथि',
    'End Date': 'समाप्ति तिथि',
    'Search Query': 'खोज शब्द',
    'Import Data & File': 'डेटा और फ़ाइल इम्पोर्ट करें',
    'Export Data & File': 'डेटा और फ़ाइल एक्सपोर्ट करें',
    'Mange Users Roles': 'यूज़र रोल प्रबंधन',
    'User Report': 'यूज़र रिपोर्ट',
    'Rejected Documents': 'अस्वीकृत दस्तावेज़',
    'Branch wise (OCR) Search': 'शाखा के अनुसार (OCR) खोजें',
    'Department wise (OCR)Search': 'विभाग के अनुसार (OCR) खोजें',
    'Enable': 'सक्षम करें',
    'Disable': 'अक्षम करें',
    'Document Management System': 'दस्तावेज़ प्रबंधन प्रणाली',
    'Captcha': 'कैप्चा',
    'Department Name': 'विभाग का नाम',

    'Access': 'पहुँच',
    'Audit & Reports': 'ऑडिट और रिपोर्ट',
    'OCR & Search': 'OCR और खोज',
    'Add Forms and Reports': 'फॉर्म और रिपोर्ट जोड़ें',
    'Form ': 'फॉर्म ',
    'APP': 'एपीपी',
    'Parent ID': 'मूल आईडी',
    'Menu ID': 'मेनू आईडी',
    'Subject': 'विषय',
    'Title': 'शीर्षक',
    'File No': 'फ़ाइल संख्या',
    "Generate I'D Card": 'आईडी कार्ड बनाएं',
    "User's Role": "यूज़र की भूमिका",
    'User Details': 'यूज़र विवरण',
    'Trash/Untrash': 'ट्रैश/अनट्रैश',
    "User's Details": "यूज़र के विवरण",
    "Branch:": "शाखा:",
    "Department:": "विभाग:",
    "Role:": "भूमिका:",
    "(Unique)": "(अद्वितीय)",
    "Status = Access Denied ": "स्थिति = पहुंच अस्वीकृत",
    '&': 'और',
    "Status = Access Allowed": "स्थिति = पहुँच अनुमत",
    "Access Allowed": "पहुँच अनुमत",
    "Access Denied": "पहुँच अस्वीकृत",
    'Manage Role & Functionality Access': "भूमिका और कार्यक्षमता पहुंच प्रबंधन",
    'Archive Date & Time': 'आर्काइव तिथि और समय',
    'Enter Department Name': 'विभाग का नाम दर्ज करें',
    '(optional)': '(वैकल्पिक)',
    'Drag & drop ,files, here, or choose from your device.': 'फाइलें यहाँ ड्रैग और ड्रॉप करें, या अपने डिवाइस से चुनें।',
    'Upload ,Files': 'फाइलें अपलोड करें',



    // Placeholders
    'Enter Mobile Number': 'मोबाइल नंबर दर्ज करें',
    'Enter Email': 'ईमेल दर्ज करें',
    'Select Start Date': 'प्रारंभ तिथि चुनें',
    'Select End Date': 'समाप्ति तिथि चुनें',
    'Enter exact text to search in documents': 'दस्तावेज़ों में खोजने के लिए सटीक पाठ दर्ज करें',
    'Search by title, subject, or file no': 'शीर्षक, विषय, या फ़ाइल संख्या से खोजें',
    'Enter Version': 'संस्करण दर्ज करें',
    'Enter Subject': 'विषय दर्ज करें',
    'Enter Title': 'शीर्षक दर्ज करें',
    'Enter File No.': 'फ़ाइल संख्या दर्ज करें',
    'Enter your username': 'अपना उपयोगकर्ता नाम दर्ज करें',
    'Enter your password': 'अपना पासवर्ड दर्ज करें',
    'Please sign in to your account': 'कृपया अपने खाते में साइन इन करें',
    'Enter captcha': 'कैप्चा दर्ज करें',
    'Select Year:': 'वर्ष चुनें:',
    "Data Management & Backup": "डेटा प्रबंधन और बैकअप",
    "Documents Backup": "दस्तावेज़ बैकअप",
    "Start ,Database, Backup": "शुरू ,डेटाबेस, बैकअप",
    "Start ,Documents, Backup": "शुरू ,दस्तावेज़, बैकअप",
    "Start ,Full System, Backup": "शुरू ,पूर्ण सिस्टम, बैकअप",




  },
  'or': {
    'Captcha': 'କ୍ୟାପ୍ଚା',
    'SN': 'କ୍ରମିକ ସଂଖ୍ୟା',
    'Address': 'ଠିକଣା',
    'Action': 'କାର୍ଯ୍ୟ',
    'Department': 'ବିଭାଗ',
    'Branch': 'ଶାଖା',
    'Email': 'ଇମେଲ',
    'Mobile Number': 'ମୋବାଇଲ ନମ୍ବର',
    'Mobile No.': 'ମୋବାଇଲ ନମ୍ବର',
    'Name': 'ନାମ',
    'Category': 'ବର୍ଗ',
    'Select Branch': 'ଶାଖା ଚୟନ କରନ୍ତୁ',
    'Select Department': 'ବିଭାଗ ଚୟନ କରନ୍ତୁ',
    'CreatedBy': 'ସୃଷ୍ଟିକର୍ତ୍ତା',
    'UpdatedBy': 'ଅପଡେଟ୍‌କର୍ତ୍ତା',
    'Updated Date': 'ଅପଡେଟ୍ ତାରିଖ',
    'Start Date': 'ଆରମ୍ଭ ତାରିଖ',
    'End Date': 'ଶେଷ ତାରିଖ',
    'Enable': 'ସକ୍ଷମ କରନ୍ତୁ',
    'Disable': 'ଅକ୍ଷମ କରନ୍ତୁ',
    'Document Management System': 'ଦସ୍ତାବେଜ ପରିଚାଳନା ପ୍ରଣାଳୀ',
  },
  'mr': {
    'Captcha': 'कॅप्चा',
    'Address': 'पत्ता',
    'Action': 'क्रिया',
    'Department': 'विभाग',
    'Branch': 'शाखा',
    'Email': 'ईमेल',
    'Mobile Number': 'मोबाइल क्रमांक',
    'Mobile No.': 'मोबाइल क्रमांक',
    'Name': 'नाव',
    'Category': 'वर्ग',
    'Select Branch': 'शाखा निवडा',
    'Select Department': 'विभाग निवडा',
    'CreatedBy': 'निर्माता',
    'UpdatedBy': 'अद्यतनकर्ता',
    'Updated Date': 'अद्यतन तारीख',
    'Start Date': 'प्रारंभ तारीख',
    'End Date': 'शेवटची तारीख',
    'Enable': 'सक्षम करा',
    'Disable': 'अक्षम करा',
    'Document Management System': 'दस्तऐवज व्यवस्थापन प्रणाली',
  }
};

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

    const response = await apiClient.get(`${API_HOST}/languageMaster/getAll/1`);

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
      supportedLanguages = {};

      languages.forEach(lang => {
        if (lang.code) { // Ensure code exists
          supportedLanguages[lang.code] = {
            name: lang.name || lang.code,
            code: lang.code,
            isActive: lang.isActive === true,
            nativeName: lang.nativeName || lang.name || lang.code
          };
        }
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
 * Get translation from database via backend API
 */
const getDatabaseTranslation = async (text, targetLanguageCode) => {
  try {
    // Call your backend translate endpoint which checks database first
    const response = await apiClient.post(`${API_HOST}/translate`, {
      text: text,
      target: targetLanguageCode
    });

    // Handle different response structures
    let translatedText = null;
    if (response?.data?.translatedText) {
      translatedText = response.data.translatedText;
    } else if (response?.translatedText) {
      translatedText = response.translatedText;
    }

    return translatedText;
  } catch (error) {
    console.log('Database translation error (may be offline):', error.message);
    return null;
  }
};

/**
 * Check if we're online
 */
const isOnline = () => {
  return navigator.onLine;
};

/**
 * Translate text using database first, then fallback, then API
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

  // STEP 1: Try database FIRST (your backend checks the translations table)
  // This works even without internet because your backend is local
  console.log(`🔍 Checking database for: "${text}" (${targetLanguageCode})`);
  const dbTranslation = await getDatabaseTranslation(text, targetLanguageCode);

  if (dbTranslation && dbTranslation !== text) {
    // Save to cache
    translationCache[cacheKey] = dbTranslation;
    saveCacheToStorage();
    console.log(`✓ [Database] "${text}" -> "${dbTranslation}"`);
    return dbTranslation;
  }

  // STEP 2: Try fallback translation (UI hardcoded)
  const fallbackResult = getFallbackTranslation(text, targetLanguageCode);
  if (fallbackResult) {
    // Save to cache
    translationCache[cacheKey] = fallbackResult;
    saveCacheToStorage();

    // Try to save fallback in database for future use (if online)
    if (isOnline()) {
      try {
        apiClient.post("/translate/saveFallback", {
          sourceText: text,
          translatedText: fallbackResult,
          languageCode: targetLanguageCode
        }).catch(e => console.log("Fallback save failed (non-critical)"));
      } catch (e) {
        // Ignore errors
      }
    }

    console.log(`✓ [Fallback] "${text}" -> "${fallbackResult}"`);
    return fallbackResult;
  }

  // STEP 3: If online, try MyMemory API via your backend
  if (isOnline()) {
    try {
      console.log(`🔄 Translating via API: "${text}" to ${targetLanguageCode}`);

      const response = await apiClient.post(`${API_HOST}/translate`, {
        text: text,
        target: targetLanguageCode
      });

      // Handle different response structures
      let translatedText = null;
      if (response?.data?.translatedText) {
        translatedText = response.data.translatedText;
      } else if (response?.translatedText) {
        translatedText = response.translatedText;
      }

      if (translatedText && translatedText.trim() !== '' && translatedText !== text) {
        translationCache[cacheKey] = translatedText;
        saveCacheToStorage();
        console.log(`✓ [API] Translated: "${text}" -> "${translatedText}"`);
        return translatedText;
      }
    } catch (error) {
      console.error('Translation API error:', error);
    }
  } else {
    console.log('📴 Offline: No translation found in database or fallback');
  }

  // If all else fails, return original text
  translationCache[cacheKey] = text;
  saveCacheToStorage();
  return text;
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
  return supportedLanguages || {};
};

/**
 * Get language name by code
 */
export const getLanguageName = async (languageCode) => {
  const langs = await getSupportedLanguages();
  const lang = langs[languageCode];
  return lang ? lang.name : languageCode;
};

/**
 * Check if a language is active
 */
export const isLanguageActive = async (languageCode) => {
  const langs = await getSupportedLanguages();
  const lang = langs[languageCode];
  return lang ? lang.isActive : false;
};

/**
 * Add custom fallback translations (UI only)
 */
export const addFallbackTranslations = (languageCode, translations) => {
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
 * Instant translation for placeholders, titles, aria-labels
 * (NO async, NO API call)
 */
export const translateInstant = (text, targetLanguageCode = 'en') => {
  if (!text || targetLanguageCode === 'en') {
    return text;
  }

  // Try fallback first
  const fallback = getFallbackTranslation(text, targetLanguageCode);
  if (fallback) {
    return fallback;
  }

  // Try cache (if already translated earlier)
  const cacheKey = `${text}_${targetLanguageCode}`;
  if (translationCache[cacheKey]) {
    return translationCache[cacheKey];
  }

  // Otherwise return original text
  return text;
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

/**
 * Save a translation to database manually
 */
export const saveTranslationToDatabase = async (sourceText, translatedText, languageCode) => {
  if (!sourceText || !translatedText || !languageCode) return;

  try {
    await apiClient.post("/translate/saveFallback", {
      sourceText: sourceText,
      translatedText: translatedText,
      languageCode: languageCode
    });
    console.log(`✓ Saved to database: "${sourceText}" -> "${translatedText}" (${languageCode})`);
  } catch (error) {
    console.error('Error saving to database:', error);
  }
};