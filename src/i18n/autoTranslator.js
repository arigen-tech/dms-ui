// frontend/i18n/autoTranslator.js - BULK LOAD VERSION
import { API_HOST } from '../API/apiConfig';
import apiClient from "../API/apiClient";

// In-memory DB translations store
const dbTranslations = {};
const loadedLanguages = new Set();
let supportedLanguages = null;

// COMPLETE Fallback translations for Hindi, Odia, and Marathi (UI ONLY)
const fallbackTranslations = {
  'hi': {
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
    'DASHBOARD': 'डैशबोर्ड',
    // 'Confirm Password': 'पासवर्ड पुष्टि करें',
    // 'New Password': 'नया पासवर्ड',
    // 'Current Password': 'वर्तमान पासवर्ड',
    // 'Employee Profile': 'कर्मचारी प्रोफ़ाइल',




















    
    'Drag & drop ,files, here, or choose from your device.': 'फाइलें यहाँ ड्रैग और ड्रॉप करें, या अपने डिवाइस से चुनें।',
    'Upload ,Files': 'फाइलें अपलोड करें',
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

// ─────────────────────────────────────────────
// NEW: Load ALL translations in one API call
// ─────────────────────────────────────────────
export const loadAllTranslations = async (languageCode) => {
  if (!languageCode || languageCode === 'en') return;
  if (loadedLanguages.has(languageCode)) {
    console.log(`✅ Translations already loaded for: ${languageCode}`);
    return;
  }

  try {
    console.log(`📡 Loading ALL translations for: ${languageCode}`);
    const response = await apiClient.get(`${API_HOST}/translate/all/${languageCode}`);
    const data = response?.data || response;

    if (data && typeof data === 'object') {
      dbTranslations[languageCode] = data;
      loadedLanguages.add(languageCode);
      // Also clear old localStorage cache so stale data is gone
      localStorage.removeItem('translationCache');
      console.log(`✅ Loaded ${Object.keys(data).length} translations for ${languageCode}`);
    }
  } catch (error) {
    console.error(`❌ Failed to load translations for ${languageCode}:`, error.message);
    dbTranslations[languageCode] = {};
    loadedLanguages.add(languageCode);
  }
};

// ─────────────────────────────────────────────
// NEW: Auto-translate missing words and save to DB (when online)
// ─────────────────────────────────────────────
const autoSaveTranslation = async (text, languageCode) => {
  if (!text || !languageCode || languageCode === 'en') return;
  if (!navigator.onLine) return;

  // Don't call API if already in DB
  const langData = dbTranslations[languageCode] || {};
  if (langData[text]) return;

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${languageCode}`;
    const res = await fetch(url);
    const json = await res.json();
    const translated = json?.responseData?.translatedText;

    if (!translated
      || translated.trim() === ''
      || translated.toLowerCase() === text.toLowerCase()) {
      return;
    }

    // Decode any URL encoding
    let cleanTranslated = translated;
    try { cleanTranslated = decodeURIComponent(translated); } catch (e) {}

    // Save to backend DB
    await apiClient.post(`${API_HOST}/translate/saveFallback`, {
      sourceText: text,
      translatedText: cleanTranslated,
      languageCode: languageCode
    });

    // Also update in-memory so it shows on next render
    if (!dbTranslations[languageCode]) dbTranslations[languageCode] = {};
    dbTranslations[languageCode][text] = cleanTranslated;

    console.log(`💾 [AUTO-SAVED] "${text}" → "${cleanTranslated}" (${languageCode})`);

  } catch (error) {
    // Silent fail — don't break the UI
  }
};

// ─────────────────────────────────────────────
// Get fallback translation IMMEDIATELY (synchronous) — UNCHANGED
// ─────────────────────────────────────────────
export const getFallbackTranslation = (text, targetLanguageCode) => {
  if (!text || !targetLanguageCode || targetLanguageCode === 'en') {
    return null;
  }

  if (!fallbackTranslations[targetLanguageCode]) {
    return null;
  }

  const fallbacks = fallbackTranslations[targetLanguageCode];

  if (fallbacks[text]) {
    return fallbacks[text];
  }

  const lowerText = text.toLowerCase();
  for (const [key, value] of Object.entries(fallbacks)) {
    if (key.toLowerCase() === lowerText) {
      return value;
    }
  }

  return null;
};

// ─────────────────────────────────────────────
// Fetch supported languages — UNCHANGED
// ─────────────────────────────────────────────
export const fetchSupportedLanguages = async () => {
  if (supportedLanguages) {
    return supportedLanguages;
  }

  try {
    console.log('📡 Fetching supported languages from Language Master API...');
    const response = await apiClient.get(`${API_HOST}/languageMaster/getAll/1`);

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
        if (lang.code) {
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

// ─────────────────────────────────────────────
// CHANGED: translateText now uses in-memory DB data + autoSaveTranslation
// ─────────────────────────────────────────────
export const translateText = async (text, targetLanguageCode = 'en') => {
  if (!text || typeof text !== 'string' || text.trim() === '' || targetLanguageCode === 'en') {
    return text;
  }

  // Load all translations for this language if not loaded yet
  if (!loadedLanguages.has(targetLanguageCode)) {
    await loadAllTranslations(targetLanguageCode);
  }

  // STEP 1: Check in-memory DB translations
  const langData = dbTranslations[targetLanguageCode] || {};
  if (langData[text] && langData[text] !== text) {
    return langData[text];
  }

  // STEP 2: Fallback
  const fallbackResult = getFallbackTranslation(text, targetLanguageCode);
  if (fallbackResult) {
    // Save fallback to DB in background if online (so DB grows over time)
    autoSaveTranslation(text, targetLanguageCode);
    return fallbackResult;
  }

  // STEP 3: Auto-translate via API and save to DB (when online)
  if (navigator.onLine) {
    autoSaveTranslation(text, targetLanguageCode);
  }

  // Return original while auto-save happens in background
  return text;
};

// ─────────────────────────────────────────────
// CHANGED: translateBatch uses in-memory data (no per-word API calls)
// ─────────────────────────────────────────────
export const translateBatch = async (texts, targetLanguageCode = 'en') => {
  if (!Array.isArray(texts) || texts.length === 0 || targetLanguageCode === 'en') {
    return texts;
  }

  if (!loadedLanguages.has(targetLanguageCode)) {
    await loadAllTranslations(targetLanguageCode);
  }

  return texts.map(text => {
    const langData = dbTranslations[targetLanguageCode] || {};
    if (langData[text] && langData[text] !== text) return langData[text];
    return getFallbackTranslation(text, targetLanguageCode) || text;
  });
};

// ─────────────────────────────────────────────
// All below functions UNCHANGED
// ─────────────────────────────────────────────
export const getSupportedLanguages = async () => {
  if (!supportedLanguages) {
    await fetchSupportedLanguages();
  }
  return supportedLanguages || {};
};

export const getLanguageName = async (languageCode) => {
  const langs = await getSupportedLanguages();
  const lang = langs[languageCode];
  return lang ? lang.name : languageCode;
};

export const isLanguageActive = async (languageCode) => {
  const langs = await getSupportedLanguages();
  const lang = langs[languageCode];
  return lang ? lang.isActive : false;
};

export const addFallbackTranslations = (languageCode, translations) => {
  if (!fallbackTranslations[languageCode]) {
    fallbackTranslations[languageCode] = {};
  }
  Object.assign(fallbackTranslations[languageCode], translations);
  console.log(`✓ Added fallback translations for ${languageCode}`);
};

// CHANGED: clearLanguageCache now clears in-memory store
export const clearLanguageCache = (languageCode) => {
  delete dbTranslations[languageCode];
  loadedLanguages.delete(languageCode);
  console.log(`🗑️ Cleared translations for language: ${languageCode}`);
};

// CHANGED: clearTranslationCache now clears in-memory store
export const clearTranslationCache = () => {
  Object.keys(dbTranslations).forEach(k => delete dbTranslations[k]);
  loadedLanguages.clear();
  localStorage.removeItem('translationCache');
  console.log('🗑️ Cleared all translations');
};

export const reloadSupportedLanguages = async () => {
  supportedLanguages = null;
  return await fetchSupportedLanguages();
};

export const getCacheInfo = () => {
  return {
    loadedLanguages: [...loadedLanguages],
    translationCounts: Object.fromEntries(
      Object.entries(dbTranslations).map(([k, v]) => [k, Object.keys(v).length])
    )
  };
};

// CHANGED: translateInstant also checks in-memory DB data
export const translateInstant = (text, targetLanguageCode = 'en') => {
  if (!text || targetLanguageCode === 'en') {
    return text;
  }

  // Check in-memory DB translations first
  const langData = dbTranslations[targetLanguageCode] || {};
  if (langData[text] && langData[text] !== text) {
    return langData[text];
  }

  // Then fallback
  const fallback = getFallbackTranslation(text, targetLanguageCode);
  if (fallback) {
    return fallback;
  }

  return text;
};

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

// CHANGED: preloadTranslations now just calls loadAllTranslations
export const preloadTranslations = async (terms, languageCode) => {
  if (languageCode === 'en' || !languageCode) return;
  await loadAllTranslations(languageCode);
};

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