import React, { useState, useEffect, useCallback } from 'react';
import { IoIosArrowForward, IoIosArrowBack } from "react-icons/io";
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
import apiClient from "../API/apiClient";


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
  }, []);

  const fetchLanguages = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get(`${LANGUAGE_MASTER_API}/getAll/0`);
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

      const response = await apiClient.post(`${LANGUAGE_MASTER_API}/create`, newLanguage, {
        headers: {
          'Content-Type': 'application/json',
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

        const response = await apiClient.put(`${LANGUAGE_MASTER_API}/update/${editingLanguageId}`, updatedLanguage, {
          headers: {
            'Content-Type': 'application/json',
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

        const response = await apiClient.put(
          `${LANGUAGE_MASTER_API}/status/${languageToToggle.id}?isActive=${newStatus}`,
          {},
          {
            headers: {
              'Content-Type': 'application/json',
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
    <div className="px-2-">
      <div className="title">
        <h1><AutoTranslate>Language Master</AutoTranslate></h1>
      </div>

      <div className="card">

        {popupMessage && (
          <Popup
            message={popupMessage.message}
            type={popupMessage.type}
            onClose={popupMessage.onClose}
          />
        )}

        <div className='mb-8'>
          <div className="cardLight">
            <div className="grid grid-col-4 itemEnd">
              <div className="form-group ">
                <label>
                  <AutoTranslate>Language Name</AutoTranslate> <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={translatedPlaceholders.enterLanguageName}
                  name="name" // Changed from languageName to name
                  value={formData.name || ""}
                  maxLength={50}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group ">
                <label>
                  <AutoTranslate>Language Code</AutoTranslate>
                  <span className="text-red-500 text-sm ml-2 align-middle"><AutoTranslate>(Unique)</AutoTranslate></span>
                </label>
                <input
                  type="text"
                  placeholder={translatedPlaceholders.enterLanguageCode}
                  name="code" // Changed from languageCode to code
                  value={formData.code || ""}
                  maxLength={3}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group ">
                {editingLanguageId === null ? (
                  <button
                    onClick={handleAddLanguage}
                    disabled={isSubmitting}
                    className={`btn-primary flex items-center justify-center w-full ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                    className={`btn-primary flex items-center justify-center w-full ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
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
        </div>



        <div className="data-search-wrapper">
          <div className="form-group flex items-center gap-4">
            <label htmlFor="itemsPerPage">
              <AutoTranslate>Show:</AutoTranslate>
            </label>
            <select
              id="itemsPerPage"
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

          <div className="form-group flex items-center gap-4">
            <input
              type="text"
              placeholder={translatedPlaceholders.search}
              className="searchIcon"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="table-wrapper">
          <table className="">
            <thead>
              <tr>
                <th className='text-center'><AutoTranslate>SN</AutoTranslate></th>
                <th><AutoTranslate>Language</AutoTranslate> <AutoTranslate>Name</AutoTranslate></th>
                <th><AutoTranslate>Language</AutoTranslate> <AutoTranslate>Code</AutoTranslate></th>
                <th><AutoTranslate>Created Date</AutoTranslate></th>
                <th><AutoTranslate>Updated Date</AutoTranslate></th>
                <th><AutoTranslate>Status</AutoTranslate></th>
                <th className='text-center'><AutoTranslate>Edit</AutoTranslate></th>
                <th className='text-center'><AutoTranslate>Action</AutoTranslate></th>
              </tr>
            </thead>
            <tbody>
              {paginatedLanguages?.map((language, index) => (
                <tr key={language.id}>
                  <td className='text-center'>{index + 1 + (currentPage - 1) * itemsPerPage}</td>
                  <td>{language.name}</td>
                  <td>{language.code}</td>
                  <td>{formatDate(language.createdOn)}</td>
                  <td>{formatDate(language.updatedOn)}</td>
                  <td>
                    {language.isActive ? 'Active' : 'Inactive'}
                  </td>
                  <td className='text-center'>
                    <div className="btn-center">
                      <button
                        onClick={() => handleEditLanguage(language.id)}
                        disabled={!language.isActive}
                        className={`viewBtn ${!language.isActive ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <PencilIcon />
                      </button>
                    </div>
                  </td>
                  <td className='text-center'>
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

        {/* Pagination Controls */}
        <div className="paginationWp">
          <div className="items">
            <div className="paginationText">
              <span className="text-sm text-gray-700">
                <AutoTranslate>
                  {`Showing ${totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0
                    } to ${Math.min(currentPage * itemsPerPage, totalItems)} of ${totalItems} entries.`}
                </AutoTranslate>
              </span>
              {/* Page Count Info */}
              <span className="text-sm text-gray-700 mx-2">
                (<AutoTranslate>Pages</AutoTranslate> {totalPages})
              </span>
            </div>
          </div>
          <div className="items">
            <div className="paginationBtn">
              {/* Previous Button */}
              <button title={`${currentPage === 1 || totalPages === 0 ? "End" : "Previous"}`}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || totalPages === 0}
                className={`${currentPage === 1 || totalPages === 0 ? "cursor-not-allowed" : ""}`}
              >
                {/* <ArrowLeftIcon className="inline h-4 w-4 mr-2 mb-1" /> */}
                {/* <AutoTranslate>Previous</AutoTranslate> */}
                <IoIosArrowBack />
              </button>

              {/* Page Number Buttons */}
              {totalPages > 0 && getPageNumbers().map((page) => (
                <button key={page} onClick={() => setCurrentPage(page)} className={`${currentPage === page ? "active" : ""}`}>
                  {page}
                </button>
              ))}

              {/* Next Button */}
              <button title={`${currentPage === totalPages || totalPages === 0 ? "End" : "Next"}`}
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className={`${currentPage === totalPages || totalPages === 0 ? "cursor-not-allowed" : ""}`}
              >
                {/* <AutoTranslate>Next</AutoTranslate> */}
                {/* <ArrowRightIcon className="inline h-4 w-4 ml-2 mb-1" /> */}
                <IoIosArrowForward />
              </button>
            </div>
          </div>
        </div>
      </div>

      {modalVisible && (

        <div className="overlayModal">
          <div className="document-modal modal-sm">

            {/* Header */}
            <div className="modal-header">
              <div className="modal-title">
                <h2><AutoTranslate>Confirm Status Change</AutoTranslate></h2>
              </div>
            </div>

            {/* Modal body Content */}
            <div className="modal-body">
              <div className="bodyScroller print:overflow-visible print:max-h-none">
                <p className="mb-4">
                  <AutoTranslate>Are you sure you want to</AutoTranslate> {languageToToggle?.isActive ?
                    <AutoTranslate>deactivate</AutoTranslate> :
                    <AutoTranslate>activate</AutoTranslate>} <AutoTranslate>this language</AutoTranslate> <strong>{languageToToggle?.name}</strong>?
                </p>
                <div className="flex justify-end gap-4">
                  <button onClick={() => setModalVisible(false)} className="btn-cancel">
                    <AutoTranslate>Cancel</AutoTranslate>
                  </button>
                  <button
                    onClick={confirmToggleActiveStatus}
                    disabled={isConfirmDisabled}
                    className={`btn-primary ${isConfirmDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    {isConfirmDisabled ? <AutoTranslate>Processing...</AutoTranslate> : <AutoTranslate>Confirm</AutoTranslate>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageMaster;