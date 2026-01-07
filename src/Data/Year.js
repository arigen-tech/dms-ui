import { YEAR_API } from '../API/apiConfig';
import {
  ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, PencilIcon,
  PlusCircleIcon, LockClosedIcon, LockOpenIcon, MagnifyingGlassIcon
} from '@heroicons/react/24/solid';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import Popup from '../Components/Popup';
import LoadingComponent from '../Components/LoadingComponent';
import AutoTranslate from '../i18n/AutoTranslate';
import { useLanguage } from '../i18n/LanguageContext';

const tokenKey = 'tokenKey';

const Year = () => {
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
    enterYear: 'Enter Year',
    yearRange: '2000 - 2050'
  });

  const [years, setYears] = useState([]);
  const [formData, setFormData] = useState({ year: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [yearToToggle, setYearToToggle] = useState(null);
  const [popupMessage, setPopupMessage] = useState(null);
  const [isConfirmDisabled, setIsConfirmDisabled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Create a ref for the form section
  const formRef = useRef(null);

  // Debug log
  useEffect(() => {
    console.log('🔍 Year Component - Language Status:', {
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
          enterYear: 'Enter Year',
          yearRange: '2000 - 2050'
        });
        return;
      }

      // Only update if language changed
      const searchPlaceholder = await translatePlaceholder('Search...');
      const showPlaceholder = await translatePlaceholder('Show:');
      const enterYearPlaceholder = await translatePlaceholder('Enter Year');
      const yearRangePlaceholder = await translatePlaceholder('2000 - 2050');

      setTranslatedPlaceholders({
        search: searchPlaceholder,
        show: showPlaceholder,
        enterYear: enterYearPlaceholder,
        yearRange: yearRangePlaceholder
      });
    };
    
    updatePlaceholders();
  }, [currentLanguage, translatePlaceholder, isTranslationNeeded]);

  // Fetch years - runs only once on mount
  useEffect(() => {
    fetchYears();
  }, []);

  const fetchYears = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem(tokenKey);
      const response = await axios.get(`${YEAR_API}/findAll`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setYears(response.data);
      console.log('✅ Years loaded');
    } catch (error) {
      console.error('Error fetching years:', error);
      showPopup('Failed to load years', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToForm = () => {
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'year') {
      if (/^\d{0,4}$/.test(value)) {
        setFormData((prevData) => ({
          ...prevData,
          [name]: value,
        }));
      }
    } else {
      setFormData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    }
  };

  const handleAddYear = async () => {
    if (!formData.year.trim()) {
      showPopup("Please enter a year!", "warning");
      return;
    }

    setIsSubmitting(true);
    if (formData.year) {
      const newYear = { name: formData.year };

      try {
        const token = localStorage.getItem(tokenKey);
        const response = await axios.post(`${YEAR_API}/save`, newYear, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setYears([...years, response.data]);
        setFormData({ year: '' });
        showPopup("Year added successfully!", "success");
      } catch (error) {
        const message = error.response?.data?.message || "Failed to add year.";
        showPopup(message, "error");
        console.error('Error adding year:', message);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleEditYear = (selectedYear) => {
    const indexInOriginal = years.findIndex(y => y.id === selectedYear.id);
    if (indexInOriginal !== -1) {
      setEditingIndex(indexInOriginal);
      setFormData({ year: selectedYear.name });
      // Scroll to form after setting the edit state
      scrollToForm();
    }
  };

  const handleSaveEdit = async () => {
    if (!formData.year.trim()) {
      showPopup("Please enter a year!", "warning");
      return;
    }

    setIsSubmitting(true);
    if (formData.year && editingIndex !== null) {
      try {
        const updatedYear = {
          ...years[editingIndex],
          name: formData.year,
          updatedOn: new Date().toISOString(),
        };
        const token = localStorage.getItem(tokenKey);
        await axios.put(`${YEAR_API}/update/${updatedYear.id}`, updatedYear, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setYears(years.map((year, index) =>
          index === editingIndex ? updatedYear : year
        ));
        setFormData({ year: '' });
        setEditingIndex(null);
        showPopup('Year updated successfully!', "success");
      } catch (error) {
        const message = error.response?.data?.message || "Failed to update year.";
        showPopup(message, "error");
        console.error('Error updating year:', message);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleToggleActiveStatus = (year) => {
    setYearToToggle(year);
    setModalVisible(true);
  };

  const confirmToggleActiveStatus = async () => {
    setIsConfirmDisabled(true);

    if (yearToToggle) {
      try {
        const updatedYear = {
          ...yearToToggle,
          isActive: yearToToggle.isActive === 1 ? 0 : 1, // Toggle between 1 and 0
          updatedOn: new Date().toISOString(),
        };

        const token = localStorage.getItem(tokenKey);
        const response = await axios.put(
          `${YEAR_API}/updatestatus/${updatedYear.id}`,
          updatedYear,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const updatedYears = years.map(year =>
          year.id === updatedYear.id ? response.data : year
        );
        setYears(updatedYears);
        setModalVisible(false);
        setIsConfirmDisabled(false);
        setYearToToggle(null);
        showPopup('Status Changed successfully!', 'success');
      } catch (error) {
        console.error('Error toggling Year status:', error.response ? error.response.data : error.message);
        showPopup('Failed to changing the status. Please try again.', 'error');
      }
    } else {
      console.error('No Year selected for status toggle');
      showPopup('No year selected for status toggle!', 'error');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    return date.toLocaleString('en-GB', options).replace(',', '');
  };

  const showPopup = (message, type = 'info') => {
    setPopupMessage({ 
      message, 
      type,
      onClose: () => setPopupMessage(null)
    });
  };

  const filteredYears = years.filter(year => {
    const statusText = year.isActive ? 'Active' : 'Inactive';
    const createdOnText = formatDate(year.createdOn);
    const updatedOnText = formatDate(year.updatedOn);

    return (
      (year.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      statusText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      createdOnText.includes(searchTerm.toLowerCase()) ||
      updatedOnText.includes(searchTerm.toLowerCase())
    );
  });

  const sortedYears = filteredYears.sort((a, b) => b.isActive - a.isActive);

  const totalItems = sortedYears.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedYears = sortedYears.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
        <AutoTranslate>Years</AutoTranslate>
      </h1>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        {popupMessage && (
          <Popup
            message={popupMessage.message}
            type={popupMessage.type}
            onClose={popupMessage.onClose}
          />
        )}
        
        {/* Add ref to the form section */}
        <div ref={formRef} className="mb-4 bg-slate-100 p-2 rounded-lg">
          <div className="flex gap-6">
            <div className="w-4/5 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <label className="block text-md font-medium text-gray-700">
                <AutoTranslate>Year</AutoTranslate> <span className="text-red-500">*</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder={translatedPlaceholders.yearRange}
                  name="year"
                  value={formData.year}
                  onChange={handleInputChange}
                  maxLength={4}
                  className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
            </div>

            <div className="w-1/5 flex items-end">
              {editingIndex === null ? (
                <button 
                  onClick={handleAddYear}
                  disabled={isSubmitting}
                  className={`bg-blue-900 text-white rounded-2xl p-2 w-full text-sm flex items-center justify-center ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isSubmitting ? (
                    <AutoTranslate>Adding...</AutoTranslate>
                  ) : (
                    <>
                      <PlusCircleIcon className="h-5 w-5 mr-1" /> <AutoTranslate>Add Year</AutoTranslate>
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
            <label htmlFor="itemsPerPage" className="mr-2 ml-2 text-white text-sm">
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
                <th className="border p-2 text-left"><AutoTranslate>Year</AutoTranslate></th>
                <th className="border p-2 text-left"><AutoTranslate>Created Date</AutoTranslate></th>
                <th className="border p-2 text-left"><AutoTranslate>Updated Date</AutoTranslate></th>
                <th className="border p-2 text-left"><AutoTranslate>Status</AutoTranslate></th>
                <th className="border p-2 text-left"><AutoTranslate>Edit</AutoTranslate></th>
                <th className="border p-2 text-left"><AutoTranslate>Action</AutoTranslate></th>
              </tr>
            </thead>
            <tbody>
              {paginatedYears.map((year, index) => (
                <tr key={year.id}>
                  <td className="border p-2">{index + 1 + (currentPage - 1) * itemsPerPage}</td>
                  <td className="border p-2">{year.name}</td>
                  <td className="border p-2">{formatDate(year.createdOn)}</td>
                  <td className="border p-2">{formatDate(year.updatedOn)}</td>
                  <td className="border p-2">
                    {year.isActive ? 'Active' : 'Inactive'}
                  </td>
                  <td className="border p-2 text-center">
                    <button
                      onClick={() => handleEditYear(year)}
                      disabled={!year.isActive}
                      className={`${!year.isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <PencilIcon className="h-6 w-6 text-white bg-yellow-400 rounded-xl p-1" />
                    </button>
                  </td>
                  <td className="border p-2 text-center">
                    <button
                      onClick={() => handleToggleActiveStatus(year)}
                      className={`p-1 rounded-full ${year.isActive ? 'bg-green-500' : 'bg-red-500'}`}
                    >
                      {year.isActive ? (
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
              <AutoTranslate>Are you sure you want to</AutoTranslate> {yearToToggle?.isActive ?
                <AutoTranslate>deactivate</AutoTranslate> :
                <AutoTranslate>activate</AutoTranslate>} <AutoTranslate>this year</AutoTranslate> <strong>{yearToToggle?.name}</strong>?
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

export default Year;