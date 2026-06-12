import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { CATEGORI_API } from '../API/apiConfig';
import Popup from '../Components/Popup';
import LoadingComponent from '../Components/LoadingComponent';
import AutoTranslate from '../i18n/AutoTranslate';
import { useLanguage } from '../i18n/LanguageContext';
import apiClient from "../API/apiClient";


const tokenKey = 'tokenKey';

const Category = () => {
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
    enterName: 'Enter name',
    search: 'Search...'
  });

  // Debug log
  useEffect(() => {
    console.log('🔍 Category Component - Language Status:', {
      currentLanguage,
      defaultLanguage,
      isTranslationNeeded: isTranslationNeeded(),
      translationStatus,
      availableLanguagesCount: availableLanguages.length,
      pathname: window.location.pathname
    });
  }, [currentLanguage, defaultLanguage, translationStatus, isTranslationNeeded, availableLanguages]);

  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({ name: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [categoryToToggle, setCategoryToToggle] = useState(null);
  const [popupMessage, setPopupMessage] = useState(null);
  const [isConfirmDisabled, setIsConfirmDisabled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formSectionRef = useRef(null);

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
          enterName: 'Enter name',
          search: 'Search...'
        });
        return;
      }

      // Only update if language changed
      const namePlaceholder = await translatePlaceholder('Enter name');
      const searchPlaceholder = await translatePlaceholder('Search...');

      setTranslatedPlaceholders({
        enterName: namePlaceholder,
        search: searchPlaceholder
      });
    };

    updatePlaceholders();
  }, [currentLanguage, translatePlaceholder, isTranslationNeeded]);

  // Fetch categories - runs only once on mount
  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get(`${CATEGORI_API}/findAll`);
        setCategories(response.data);
        console.log('✅ Categories loaded');
      } catch (error) {
        console.error('Error fetching categories:', error);
        showPopup('Failed to load categories', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchCategories();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Allow only letters and spaces, max 30 characters
    const regex = /^[A-Za-z\s]*$/;
    if ((regex.test(value) || value === "") && value.length <= 30) {
      setFormData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    } else if (value.length > 30) {
      showPopup('Category name cannot exceed 30 characters', 'error');
    }
  };

  const isDuplicateCategory = (name) => {
    return categories.some(category =>
      category.name.toLowerCase() === name.toLowerCase() &&
      category.id !== editingCategoryId
    );
  };

  const handleAddCategory = async () => {
    if (!formData.name.trim()) {
      showPopup('Please enter a category name!', 'warning');
      return;
    }

    if (isDuplicateCategory(formData.name)) {
      showPopup('Category with this name already exists!', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await apiClient.post(`${CATEGORI_API}/save`, formData);

      setCategories([...categories, response.data]);
      setFormData({ name: '' });
      showPopup('Category added successfully!', "success");
    } catch (error) {
      console.error('Error adding category:', error.response ? error.response.data : error.message);
      showPopup('Failed to add the category. Please try again!', "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditCategory = (categoryId) => {
    setEditingCategoryId(categoryId);
    const categoryToEdit = categories.find(category => category.id === categoryId);

    if (categoryToEdit) {
      setFormData({
        name: categoryToEdit.name,
      });

      // Scroll to form section
      if (formSectionRef.current) {
        formSectionRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!formData.name.trim()) {
      showPopup('Please enter a category name', 'warning');
      return;
    }

    if (isDuplicateCategory(formData.name)) {
      showPopup('Category with this name already exists!', 'error');
      return;
    }

    if (editingCategoryId !== null) {
      setIsSubmitting(true);
      try {
        const categoryIndex = categories.findIndex(category => category.id === editingCategoryId);

        if (categoryIndex === -1) {
          showPopup('Category not found! Please try again!', "error");
          return;
        }

        const updatedCategory = {
          ...categories[categoryIndex],
          name: formData.name,
          updatedOn: new Date().toISOString(),
        };

        const response = await apiClient.put(`${CATEGORI_API}/update/${updatedCategory.id}`, updatedCategory);

        const updatedCategories = categories.map(category =>
          category.id === updatedCategory.id ? response.data : category
        );

        setCategories(updatedCategories);
        setFormData({ name: '' });
        setEditingCategoryId(null);
        showPopup('Category updated successfully!', "success");
      } catch (error) {
        console.error('Error updating category:', error.response ? error.response.data : error.message);
        showPopup('Failed to update the category. Please try again!', "error");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleToggleActiveStatus = (category) => {
    setCategoryToToggle(category);
    setModalVisible(true);
  };

  const confirmToggleActiveStatus = async () => {
    setIsConfirmDisabled(true);

    if (categoryToToggle) {
      try {
        const updatedCategory = {
          ...categoryToToggle,
          active: categoryToToggle.active === true ? 0 : 1,
          updatedOn: new Date().toISOString(),
        };

        const token = localStorage.getItem(tokenKey);
        const response = await apiClient.put(
          `${CATEGORI_API}/updatestatus/${updatedCategory.id}`,
          updatedCategory,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.status === 200) {
          const updatedCategories = categories.map(category =>
            category.id === updatedCategory.id ? response.data : category
          );

          setCategories(updatedCategories);
          setModalVisible(false);
          setCategoryToToggle(null);
          setIsConfirmDisabled(false);
          showPopup('Category status changed successfully!', "success");
        } else {
          showPopup('Failed to change the category status. Please try again.', "error");
        }
      } catch (error) {
        console.error('Error toggling Category status:', error.response ? error.response.data : error.message);
        showPopup('Failed to change the category status. Please try again.', "error");
      }
    } else {
      console.error('No Category selected for status toggle');
      showPopup('No category selected for status toggle!', "error");
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

  const filteredCategories = categories.filter(category => {
    const statusText = category.active === true ? 'Active' : 'Inactive';
    const createdOnText = formatDate(category.createdOn);
    const updatedOnText = formatDate(category.updatedOn);

    return (
      (category.name && category.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      statusText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      createdOnText.includes(searchTerm.toLowerCase()) ||
      updatedOnText.includes(searchTerm.toLowerCase())
    );
  });

  const sortedCategories = filteredCategories.sort((a, b) => {
    if (b.active === a.active) {
      return 0;
    }
    return b.active ? 1 : -1;
  });

  const totalItems = sortedCategories.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedCategories = sortedCategories.slice(
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
        <h1><AutoTranslate>Categories</AutoTranslate></h1>
      </div>

      <div className="card">

        {popupMessage && (
          <Popup
            message={popupMessage.message}
            type={popupMessage.type}
            onClose={popupMessage.onClose}
          />
        )}

        {/* Form Section with ref */}
        <div className='mb-8'>
          <div ref={formSectionRef} className="cardLight">
            <div className="grid grid-col-4 itemEnd">
              <div className="form-group ">
                <label>
                  <AutoTranslate>Name</AutoTranslate> <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={translatedPlaceholders.enterName}
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  maxLength={30}
                />
              </div>

              <div className="form-group ">
                {editingCategoryId === null ? (
                  <button
                    onClick={handleAddCategory}
                    disabled={isSubmitting}
                    className={`btn-primary flex items-center justify-center w-full ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isSubmitting ? (
                      <AutoTranslate>Adding...</AutoTranslate>
                    ) : (
                      <>
                        <PlusCircleIcon className="h-5 w-5 mr-1" /> <AutoTranslate>Add</AutoTranslate>
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

          <div className="form-group">
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
                <th className='text-center'>
                  <AutoTranslate>SN</AutoTranslate>
                </th>
                <th><AutoTranslate>Category</AutoTranslate></th>
                <th><AutoTranslate>Created Date</AutoTranslate></th>
                <th><AutoTranslate>Updated Date</AutoTranslate></th>
                <th><AutoTranslate>Status</AutoTranslate></th>
                <th className='text-center'><AutoTranslate>Edit</AutoTranslate></th>
                <th className='text-center'><AutoTranslate>Action</AutoTranslate></th>
              </tr>
            </thead>
            <tbody>
              {paginatedCategories.map((category, index) => (
                <tr key={category.id}>
                  <td className='text-center'>{index + 1 + (currentPage - 1) * itemsPerPage}</td>
                  <td>{category.name}</td>
                  <td>{formatDate(category.createdOn)}</td>
                  <td>{formatDate(category.updatedOn)}</td>
                  <td>
                    {category.active === true ? 'Active' : 'Inactive'}
                  </td>
                  <td>
                  <div className="btn-center">
                    <button
                      onClick={() => handleEditCategory(category.id)}
                      disabled={category.active === false}
                      className={`viewBtn ${category.active === false ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title='Edit'
                    >
                      <PencilIcon />
                    </button>
                  </div>
                  </td>
                  <td className='text-center'>
                    <button
                      onClick={() => handleToggleActiveStatus(category)}
                      className={`p-1 rounded-full ${category.active === true ? 'bg-green-500' : 'bg-red-500'}`}
                    >
                      {category.active === true ? (
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
                  <AutoTranslate>Are you sure you want to</AutoTranslate> {categoryToToggle?.active === true ?
                    <AutoTranslate>deactivate</AutoTranslate> :
                    <AutoTranslate>activate</AutoTranslate>} <AutoTranslate>this category</AutoTranslate> <strong>{categoryToToggle?.name}</strong>?
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

export default Category;