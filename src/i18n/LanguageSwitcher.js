// frontend/i18n/LanguageSwitcher.js - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import { useLanguage } from './LanguageContext';
import { GlobeAltIcon } from '@heroicons/react/24/outline';

const LanguageSwitcher = ({ className = '' }) => {
  const { 
    currentLanguage, 
    availableLanguages, 
    isLoadingLanguages, 
    changeLanguage 
  } = useLanguage();
  
  const [selectedLang, setSelectedLang] = useState(currentLanguage);

  useEffect(() => {
    setSelectedLang(currentLanguage);
  }, [currentLanguage]);

  const handleLanguageChange = async (e) => {
    const newLangCode = e.target.value;
    setSelectedLang(newLangCode);
    await changeLanguage(newLangCode);
  };

  if (isLoadingLanguages) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
        <span className="text-sm text-gray-600">Loading languages...</span>
      </div>
    );
  }

  // If no languages available, show disabled state
  if (!availableLanguages || availableLanguages.length === 0) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <GlobeAltIcon className="h-5 w-5 text-gray-400" />
        <select
          disabled
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-gray-100 text-gray-500 cursor-not-allowed"
        >
          <option>No languages</option>
        </select>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <GlobeAltIcon className="h-5 w-5 text-gray-600" />
      <select
        value={selectedLang}
        onChange={handleLanguageChange}
        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white 
                 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                 transition-all duration-200 cursor-pointer hover:border-gray-400"
        aria-label="Select language"
      >
        {availableLanguages.map((lang) => (
          <option key={lang.id || lang.code} value={lang.code}>
            {lang.nativeName || lang.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSwitcher;