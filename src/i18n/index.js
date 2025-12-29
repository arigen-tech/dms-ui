import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Function to dynamically load language files
const loadLanguage = async (lang) => {
  try {
    const data = await import(`./locales/${lang}.json`);
    return data.default;
  } catch (error) {
    console.error(`Failed to load language ${lang}:`, error);
    // Fallback to English if language file doesn't exist
    const enData = await import(`./locales/en-IN.json`);
    return enData.default;
  }
};

i18n
  .use(initReactI18next)
  .init({
    lng: "en-IN", // Default language
    fallbackLng: "en-IN",
    resources: {},
    interpolation: {
      escapeValue: false,
    },
  });

// Function to change app language dynamically
export const changeAppLanguage = async (lang) => {
  // If we haven't loaded this language yet
  if (!i18n.hasResourceBundle(lang, "translation")) {
    try {
      const json = await loadLanguage(lang);
      i18n.addResourceBundle(lang, "translation", json, true, true);
    } catch (error) {
      console.error("Error loading language:", error);
      return;
    }
  }
  
  // Change the language
  i18n.changeLanguage(lang);
  localStorage.setItem("uiLanguage", lang);
};

export default i18n;