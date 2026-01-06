import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  LockClosedIcon,
  LockOpenIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PlusCircleIcon
} from '@heroicons/react/24/solid';
import { LANGUAGE_MASTER_API } from '../API/apiConfig';
import Popup from '../Components/Popup';
import LoadingComponent from '../Components/LoadingComponent';
import AutoTranslate from '../i18n/AutoTranslate';
import { useLanguage } from '../i18n/LanguageContext';

const tokenKey = 'tokenKey';

const LanguageMaster = () => {
  // Get language context
  const {
    currentLanguage,
    defaultLanguage,
    translationStatus,
    isTranslationNeeded,
    availableLanguages,
    changeLanguage,
    translate,
    preloadTranslationsForTerms
  } = useLanguage();

  // State for tracking data loading only
  const [isLoading, setIsLoading] = useState(true);
 
  
  // State for translated placeholders
  const [translatedPlaceholders, setTranslatedPlaceholders] = useState({
    search: 'Search...',
    show: 'Show:',
    enterLanguageName: 'Enter Language Name',
    enterLanguageCode: 'Enter Language Code (e.g., en, fr, es)',
  });

  const [languages, setLanguages] = useState([]);
  const [formData, setFormData] = useState({
    name: '', // Changed from languageName to name
    code: '', // Changed from languageCode to code
    isActive: true,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [languageToToggle, setLanguageToToggle] = useState(null);
  const [editingLanguageId, setEditingLanguageId] = useState(null);
  const [popupMessage, setPopupMessage] = useState(null);
  const [isConfirmDisabled, setIsConfirmDisabled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = localStorage.getItem('tokenKey');

  // Debug log
  useEffect(() => {
    console.log('🔍 LanguageMaster Component - Language Status:', {
      currentLanguage,
      defaultLanguage,
      isTranslationNeeded: isTranslationNeeded(),
      translationStatus,
      availableLanguagesCount: availableLanguages.length,
      pathname: window.location.pathname
    });
  }, [currentLanguage, defaultLanguage, translationStatus, isTranslationNeeded, availableLanguages]);

  // Function to translate placeholder text
  const translatePlaceholder = useCallback(async (text) => {
    if (isTranslationNeeded()) {
      try {
        return await translate(text);
      } catch (error) {
        console.error('Error translating placeholder:', error);
        return text;
      }
    }
    return text;
  }, [isTranslationNeeded, translate]);

  // Update placeholders when language changes - optimized
  useEffect(() => {
    const updatePlaceholders = async () => {
      // Don't translate if English
      if (!isTranslationNeeded()) {
        setTranslatedPlaceholders({
          search: 'Search...',
          show: 'Show:',
          enterLanguageName: 'Enter Language Name',
          enterLanguageCode: 'Enter Language Code (e.g., en, fr, es)',
        });
        return;
      }

      // Only update if language changed
      const searchPlaceholder = await translatePlaceholder('Search...');
      const showPlaceholder = await translatePlaceholder('Show:');
      const enterLanguageNamePlaceholder = await translatePlaceholder('Enter Language Name');
      const enterLanguageCodePlaceholder = await translatePlaceholder('Enter Language Code (e.g., en, fr, es)');

      setTranslatedPlaceholders({
        search: searchPlaceholder,
        show: showPlaceholder,
        enterLanguageName: enterLanguageNamePlaceholder,
        enterLanguageCode: enterLanguageCodePlaceholder,
      });
    };
    
    updatePlaceholders();
  }, [currentLanguage, translatePlaceholder, isTranslationNeeded]);

  // Fetch languages - runs on mount and when flag changes
  useEffect(() => {
    fetchLanguages();
  },[] );

  const fetchLanguages = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${LANGUAGE_MASTER_API}/getAll/0`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      setLanguages(response?.data || []);
     
    } catch (error) {
      console.error('Error fetching Languages:', error);
      showPopup('Failed to load languages', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // For code field, convert to lowercase and remove spaces
    if (name === 'code') {
      let processedValue = value.trim().toLowerCase();
      
      // Remove any spaces
      processedValue = processedValue.replace(/\s/g, '');
      
      // Limit to 2-3 characters for language codes
      if (processedValue.length > 3) {
        processedValue = processedValue.substring(0, 3);
      }
      
      setFormData({ ...formData, [name]: processedValue });
    } else if (type === 'checkbox') {
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const validateLanguageCode = (code) => {
    // Language code should be 2-3 letters, lowercase
    return code.match(/^[a-z]{2,3}$/);
  };

  const isDuplicateLanguage = (name, code) => {
    return languages.some(lang => 
      (lang.name?.toLowerCase() === name?.toLowerCase() || 
       lang.code?.toLowerCase() === code?.toLowerCase()) &&
      lang.id !== editingLanguageId
    );
  };

  const handleAddLanguage = async () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      showPopup('Please fill in all required fields!', "warning");
      return;
    }

    if (!validateLanguageCode(formData.code)) {
      showPopup(
        'Language code must be 2-3 lowercase letters (e.g., en, fr, es)',
        "error"
      );
      return;
    }

    if (isDuplicateLanguage(formData.name, formData.code)) {
      showPopup('Language name or code already exists!', "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const newLanguage = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        isActive: formData.isActive,
      };

      console.log('Sending new language:', newLanguage);

      const response = await axios.post(`${LANGUAGE_MASTER_API}/create`, newLanguage, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('Response from API:', response.data);

      setLanguages([...languages, response.data]);
      setFormData({ name: '', code: '', isActive: true });

      showPopup('Language added successfully!', "success");
      fetchLanguages();

    } catch (error) {
      console.error('Error adding Language:', error.response ? error.response.data : error.message);

      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Failed to add Language';

      showPopup(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditLanguage = (languageId) => {
    setEditingLanguageId(languageId);

    const languageToEdit = languages.find(language => language.id === languageId);

    if (languageToEdit) {
      setFormData({
        name: languageToEdit.name,
        code: languageToEdit.code,
        isActive: languageToEdit.isActive,
        id: languageToEdit.id,
      });
    } else {
      console.error('Language not found for ID:', languageId);
      showPopup('Language not found!', 'error');
    }
  };

  const handleSaveEdit = async () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      showPopup('Please fill in all required fields!', "warning");
      return;
    }

    if (!validateLanguageCode(formData.code)) {
      showPopup('Language code must be 2-3 lowercase letters (e.g., en, fr, es)', "error");
      return;
    }

    if (isDuplicateLanguage(formData.name, formData.code)) {
      showPopup('Language name or code already exists!', "error");
      return;
    }

    if (editingLanguageId !== null) {
      setIsSubmitting(true);
      try {
        const updatedLanguage = {
          name: formData.name.trim(),
          code: formData.code.trim(),
          isActive: formData.isActive,
        };

        console.log('Updating language:', updatedLanguage);

        const response = await axios.put(`${LANGUAGE_MASTER_API}/update/${editingLanguageId}`, updatedLanguage, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        console.log('Update response:', response.data);

        const updatedLanguages = languages.map(language =>
          language.id === editingLanguageId ? response.data : language
        );

        setLanguages(updatedLanguages);
        setFormData({ name: '', code: '', isActive: true });
        setEditingLanguageId(null);
        showPopup('Language updated successfully!', "success");
        fetchLanguages();
      } catch (error) {
        console.error('Error updating Language:', error.response ? error.response.data : error.message);
        showPopup('Failed to update the Language. Please try again!', "error");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleToggleActiveStatus = (language) => {
    setLanguageToToggle(language);
    setModalVisible(true);
  };

  const confirmToggleActiveStatus = async () => {
    setIsConfirmDisabled(true);

    if (languageToToggle) {
      try {
        const newStatus = !languageToToggle.isActive;

        const response = await axios.put(
          `${LANGUAGE_MASTER_API}/status/${languageToToggle.id}?isActive=${newStatus}`,
          {},
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        const updatedLanguages = languages.map(lang =>
          lang.id === languageToToggle.id ? response.data : lang
        );

        setLanguages(updatedLanguages);
        setModalVisible(false);
        setLanguageToToggle(null);
        showPopup('Status changed successfully!', "success");
        fetchLanguages();

      } catch (error) {
        console.error('Error toggling language status:', error.response ? error.response.data : error.message);
        showPopup('Failed to change the status. Please try again!', "error");
      } finally {
        setIsConfirmDisabled(false);
      }
    } else {
      console.error('No language selected for status toggle');
      showPopup('No language selected for status toggle!', "error");
    }
  };

  const showPopup = (message, type = 'info') => {
    setPopupMessage({
      message,
      type,
      onClose: () => {
        setPopupMessage(null);
      }
    });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    const options = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    };
    return date.toLocaleString('en-GB', options).replace(',', '');
  };

  const filteredLanguages = languages?.filter(language => {
    const statusText = language?.isActive ? 'Active' : 'Inactive';
    const createdOnText = formatDate(language.createdOn);
    const updatedOnText = formatDate(language.updatedOn);

    return (
      language?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      language?.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      statusText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      createdOnText.includes(searchTerm) ||
      updatedOnText.includes(searchTerm)
    );
  });

  const sortedLanguages = filteredLanguages?.sort((a, b) => b.isActive - a.isActive);

  const totalItems = sortedLanguages?.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const paginatedLanguages = sortedLanguages?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getPageNumbers = () => {
    const maxPageNumbers = 5;
    const startPage = Math.floor((currentPage - 1) / maxPageNumbers) * maxPageNumbers + 1;
    const endPage = Math.min(startPage + maxPageNumbers - 1, totalPages);
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  };

  // Show loading only if initial data is loading
  if (isLoading) {
    return <LoadingComponent />;
  }

  return (
    <div className="px-2">
      <h1 className="text-2xl mb-1 font-semibold">
        <AutoTranslate>Language</AutoTranslate> <AutoTranslate>Master</AutoTranslate>
      </h1>

      <div className="bg-white p-4 rounded-lg shadow-sm">

        {popupMessage && (
          <Popup
            message={popupMessage.message}
            type={popupMessage.type}
            onClose={popupMessage.onClose}
          />
        )}

        <div className="mb-4 bg-slate-100 p-2 rounded-lg">
          <div className="flex gap-6">
            <div className="w-4/5 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <label className="block text-md font-medium text-gray-700">
                <AutoTranslate>Language</AutoTranslate> <AutoTranslate>Name</AutoTranslate> <span className="text-red-500">*</span>
                <input
                  type="text"
                  placeholder={translatedPlaceholders.enterLanguageName}
                  name="name" // Changed from languageName to name
                  value={formData.name || ""}
                  maxLength={50}
                  onChange={handleInputChange}
                  className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>

              <label className="block text-md font-medium text-gray-700">
                <AutoTranslate>Language</AutoTranslate> <AutoTranslate>Code</AutoTranslate>
                <span className="text-red-500 text-sm ml-2 align-middle"><AutoTranslate>(Unique)</AutoTranslate></span>
                <input
                  type="text"
                  placeholder={translatedPlaceholders.enterLanguageCode}
                  name="code" // Changed from languageCode to code
                  value={formData.code || ""}
                  maxLength={3}
                  onChange={handleInputChange}
                  className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
            </div>

            <div className="w-1/5 flex items-end">
              {editingLanguageId === null ? (
                <button 
                  onClick={handleAddLanguage}
                  disabled={isSubmitting}
                  className={`bg-blue-900 text-white rounded-2xl p-2 w-full text-sm flex items-center justify-center ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isSubmitting ? (
                    <AutoTranslate>Adding...</AutoTranslate>
                  ) : (
                    <>
                      <PlusCircleIcon className="h-5 w-5 mr-1" /> <AutoTranslate>Add Language</AutoTranslate>
                    </>
                  )}
                </button>
              ) : (
                <button 
                  onClick={handleSaveEdit}
                  disabled={isSubmitting}
                  className={`bg-blue-900 text-white rounded-2xl p-2 w-full text-sm flex items-center justify-center ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isSubmitting ? (
                    <AutoTranslate>Updating...</AutoTranslate>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-5 w-5 mr-1" /> <AutoTranslate>Update</AutoTranslate>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mb-4 bg-slate-100 p-4 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center bg-blue-500 rounded-lg w-full flex-1 md:w-1/2">
            <label
              htmlFor="itemsPerPage"
              className="mr-2 ml-2 text-white text-sm"
            >
              <AutoTranslate>Show:</AutoTranslate>
            </label>
            <select
              id="itemsPerPage"
              className="border rounded-r-lg p-1.5 outline-none w-full"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              {[5, 10, 15, 20].map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center w-full md:w-auto flex-1">
            <input
              type="text"
              placeholder={translatedPlaceholders.search}
              className="border rounded-l-md p-1 outline-none w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <MagnifyingGlassIcon className="text-white bg-blue-500 rounded-r-lg h-8 w-8 border p-1.5" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-slate-100">
                <th className="border p-2 text-left"><AutoTranslate>SN</AutoTranslate></th>
                <th className="border p-2 text-left"><AutoTranslate>Language</AutoTranslate> <AutoTranslate>Name</AutoTranslate></th>
                <th className="border p-2 text-left"><AutoTranslate>Language</AutoTranslate> <AutoTranslate>Code</AutoTranslate></th>
                <th className="border p-2 text-left"><AutoTranslate>Created Date</AutoTranslate></th>
                <th className="border p-2 text-left"><AutoTranslate>Updated Date</AutoTranslate></th>
                <th className="border p-2 text-left"><AutoTranslate>Status</AutoTranslate></th>
                <th className="border p-2 text-left"><AutoTranslate>Edit</AutoTranslate></th>
                <th className="border p-2 text-left"><AutoTranslate>Action</AutoTranslate></th>
              </tr>
            </thead>
            <tbody>
              {paginatedLanguages?.map((language, index) => (
                <tr key={language.id}>
                  <td className="border p-2">{index + 1 + (currentPage - 1) * itemsPerPage}</td>
                  <td className="border p-2">{language.name}</td>
                  <td className="border p-2">{language.code}</td>
                  <td className="border p-2">{formatDate(language.createdOn)}</td>
                  <td className="border p-2">{formatDate(language.updatedOn)}</td>
                  <td className="border p-2">
                    {language.isActive ? 'Active' : 'Inactive'}
                  </td>
                  <td className="border p-2 text-center">
                    <button 
                      onClick={() => handleEditLanguage(language.id)} 
                      disabled={!language.isActive}
                      className={`${!language.isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <PencilIcon className="h-6 w-6 text-white bg-yellow-400 rounded-xl p-1" />
                    </button>
                  </td>
                  <td className="border p-2 text-center">
                    <button
                      onClick={() => handleToggleActiveStatus(language)}
                      className={`p-1 rounded-full ${language.isActive ? 'bg-green-500' : 'bg-red-500'}`}
                    >
                      {language.isActive ? (
                        <LockOpenIcon className="h-5 w-5 text-white p-0.5" />
                      ) : (
                        <LockClosedIcon className="h-5 w-5 text-white p-0.5" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center mt-4">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1 || totalPages === 0}
            className={`px-3 py-1 rounded mr-3 ${currentPage === 1 || totalPages === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"
              }`}
          >
            <ArrowLeftIcon className="inline h-4 w-4 mr-2 mb-1" />
            <AutoTranslate>Previous</AutoTranslate>
          </button>

          {totalPages > 0 && getPageNumbers().map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1 rounded mx-1 ${currentPage === page ? "bg-blue-500 text-white" : "bg-slate-200 hover:bg-blue-100"
                }`}
            >
              {page}
            </button>
          ))}

          <span className="text-sm text-gray-700 mx-2">
            <AutoTranslate>of</AutoTranslate> {totalPages} <AutoTranslate>pages</AutoTranslate>
          </span>

          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages || totalPages === 0}
            className={`px-3 py-1 rounded ml-3 ${currentPage === totalPages || totalPages === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"
              }`}
          >
            <AutoTranslate>Next</AutoTranslate>
            <ArrowRightIcon className="inline h-4 w-4 ml-2 mb-1" />
          </button>
          <div className="ml-4">
            <span className="text-sm text-gray-700">
              <AutoTranslate>
                {`Here are items ${totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to ${Math.min(currentPage * itemsPerPage, totalItems)} out of ${totalItems}.`}
              </AutoTranslate>
            </span>
          </div>
        </div>
      </div>

      {modalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-lg font-semibold mb-4">
              <AutoTranslate>Confirm Status Change</AutoTranslate>
            </h2>
            <p className="mb-4">
              <AutoTranslate>Are you sure you want to</AutoTranslate> {languageToToggle?.isActive ?
                <AutoTranslate>deactivate</AutoTranslate> :
                <AutoTranslate>activate</AutoTranslate>} <AutoTranslate>this language</AutoTranslate> <strong>{languageToToggle?.name}</strong>?
            </p>
            <div className="flex justify-end gap-4">
              <button onClick={() => setModalVisible(false)} className="bg-gray-300 p-2 rounded-lg">
                <AutoTranslate>Cancel</AutoTranslate>
              </button>
              <button
                onClick={confirmToggleActiveStatus}
                disabled={isConfirmDisabled}
                className={`bg-blue-500 text-white rounded-md px-4 py-2 ${isConfirmDisabled ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
              >
                {isConfirmDisabled ? <AutoTranslate>Processing...</AutoTranslate> : <AutoTranslate>Confirm</AutoTranslate>}
              </button>
            </div>
          </div>
        </div> 
      )}
    </div>
  );
};

export default LanguageMaster;