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
import { FILETYPE_API } from '../API/apiConfig';
import Popup from '../Components/Popup';
import LoadingComponent from '../Components/LoadingComponent';
import AutoTranslate from '../i18n/AutoTranslate';
import { useLanguage } from '../i18n/LanguageContext';
import apiClient from "../API/apiClient";


const tokenKey = 'tokenKey';

const FilesType = () => {
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
    enterFileTypes: 'Enter File Types',
    enterExtension: 'Enter extension (e.g., .pdf)',
  });

  const [filesType, setFilesType] = useState([]);
  const [formData, setFormData] = useState({
    filetype: '',
    extension: '',
    isActive: 1,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [fileTypeToToggle, setFileTypeToToggle] = useState(null);
  const [editingFileTypeId, seteditingFileTypeId] = useState(null);
  const [popupMessage, setPopupMessage] = useState(null);
  const [isConfirmDisabled, setIsConfirmDisabled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = localStorage.getItem('tokenKey');

  // Debug log
  useEffect(() => {
    console.log('🔍 FilesType Component - Language Status:', {
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
          enterFileTypes: 'Enter File Types',
          enterExtension: 'Enter extension (e.g., .pdf)',
        });
        return;
      }

      // Only update if language changed
      const searchPlaceholder = await translatePlaceholder('Search...');
      const showPlaceholder = await translatePlaceholder('Show:');
      const enterFileTypesPlaceholder = await translatePlaceholder('Enter File Types');
      const enterExtensionPlaceholder = await translatePlaceholder('Enter extension (e.g., .pdf)');

      setTranslatedPlaceholders({
        search: searchPlaceholder,
        show: showPlaceholder,
        enterFileTypes: enterFileTypesPlaceholder,
        enterExtension: enterExtensionPlaceholder,
      });
    };

    updatePlaceholders();
  }, [currentLanguage, translatePlaceholder, isTranslationNeeded]);

  // Fetch files type - runs only once on mount
  useEffect(() => {
    fetchFilesType();
  }, []);

  const fetchFilesType = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get(`${FILETYPE_API}/getAll`);
      setFilesType(response?.data?.response || []);
      console.log('✅ File types loaded');
    } catch (error) {
      console.error('Error fetching Files Types:', error);
      showPopup('Failed to load file types', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // For extension field, ensure it starts with a dot and has no spaces
    if (name === 'extension') {
      let processedValue = value.trim();

      // If the value doesn't start with a dot and isn't empty, add one
      if (processedValue && !processedValue.startsWith('.')) {
        processedValue = '.' + processedValue;
      }

      // Remove any additional dots the user might try to add
      processedValue = processedValue.replace(/\.+/g, '.');

      // Remove any spaces
      processedValue = processedValue.replace(/\s/g, '');

      setFormData({ ...formData, [name]: processedValue });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const validateExtension = (extension) => {
    // Extension must start with a dot and have at least one character after it
    return extension.match(/^\.[a-zA-Z0-9]+$/);
  };

  const isDuplicateFileType = (filetype, extension) => {
    return filesType.some(ft =>
      (ft.filetype.toLowerCase() === filetype.toLowerCase() ||
        ft.extension.toLowerCase() === extension.toLowerCase()) &&
      ft.id !== editingFileTypeId
    );
  };

  const handleAddFileType = async () => {
    if (!formData.filetype.trim() || !formData.extension.trim()) {
      showPopup('Please fill in all required fields!', "warning");
      return;
    }

    if (!validateExtension(formData.extension)) {
      showPopup(
        'Extension must start with a dot (.) and contain only letters/numbers (e.g., .pdf, .docx)',
        "error"
      );
      return;
    }

    if (isDuplicateFileType(formData.filetype, formData.extension)) {
      showPopup('File type or extension already exists!', "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const newFileType = {
        ...formData,
        createdOn: new Date().toISOString(),
        updatedOn: new Date().toISOString(),
        isActive: formData.isActive ? 1 : 0,
      };

      const response = await apiClient.post(`${FILETYPE_API}/create`, newFileType, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      setFilesType([...filesType, response.data.data]);
      setFormData({ filetype: '', extension: '', isActive: 1 });

      showPopup('FileType added successfully!', "success");
      fetchFilesType();

    } catch (error) {
      console.error('Error adding FileType:', error.response ? error.response.data : error.message);

      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Failed to add FileType';

      showPopup(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditFileType = (fileTypeId) => {
    seteditingFileTypeId(fileTypeId);

    const fileTypeToEdit = filesType.find(fileType => fileType.id === fileTypeId);

    if (fileTypeToEdit) {
      setFormData({
        filetype: fileTypeToEdit.filetype,
        extension: fileTypeToEdit.extension,
        isActive: fileTypeToEdit.isActive === 1,
        id: fileTypeToEdit.id,
      });
    } else {
      console.error('FileType not found for ID:', fileTypeId);
      showPopup('File type not found!', 'error');
    }
  };

  const handleSaveEdit = async () => {
    if (!formData.filetype.trim() || !formData.extension.trim()) {
      showPopup('Please fill in all required fields!', "warning");
      return;
    }

    if (!validateExtension(formData.extension)) {
      showPopup('Extension must start with a dot (.) and contain only letters/numbers (e.g., .pdf, .docx)', "error");
      return;
    }

    if (isDuplicateFileType(formData.filetype, formData.extension)) {
      showPopup('File type or extension already exists!', "error");
      return;
    }

    if (editingFileTypeId !== null) {
      setIsSubmitting(true);
      try {
        const fileTypeIndex = filesType.findIndex(fileType => fileType.id === editingFileTypeId);

        if (fileTypeIndex === -1) {
          showPopup('File type not found!', 'error');
          return;
        }

        const updatedFileType = {
          ...filesType[fileTypeIndex],
          filetype: formData.filetype,
          extension: formData.extension,
          isActive: formData.isActive ? 1 : 0,
          updatedOn: new Date().toISOString(),
        };

        const response = await apiClient.put(`${FILETYPE_API}/updateById/${updatedFileType.id}`, updatedFileType);

        const updatedFileTypes = filesType?.map(branch =>
          branch.id === updatedFileType.id ? response.data : branch
        );

        setFilesType(updatedFileTypes);
        setFormData({ filetype: '', extension: '', isActive: 1 });
        seteditingFileTypeId(null);
        showPopup('File Type updated successfully!', "success");
        fetchFilesType();
      } catch (error) {
        console.error('Error updating File Type:', error.response ? error.response.data : error.message);
        showPopup('Failed to update the File Type. Please try again!', "error");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleToggleActiveStatus = (fileType) => {
    setFileTypeToToggle(fileType);
    setModalVisible(true);
  };

  const confirmToggleActiveStatus = async () => {
    setIsConfirmDisabled(true);

    if (fileTypeToToggle) {
      try {
        const updatedFilesType = {
          ...fileTypeToToggle,
          status: fileTypeToToggle.isActive === 1 ? 0 : 1,
          updatedOn: new Date().toISOString(),
        };

        const response = await apiClient.put(
          `${FILETYPE_API}/update/status/${updatedFilesType.id}?status=${updatedFilesType.status}`,
          {},
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        const updatedFilesTypes = filesType?.map(filesTypes =>
          filesTypes.id === updatedFilesType.id ? response.data : filesTypes
        );

        setFilesType(updatedFilesTypes);
        setModalVisible(false);
        setFileTypeToToggle(null);
        showPopup('Status changed successfully!', "success");
        fetchFilesType();

      } catch (error) {
        console.error('Error toggling file type status:', error.response ? error.response.data : error.message);
        showPopup('Failed to change the status. Please try again!', "error");
      } finally {
        setIsConfirmDisabled(false);
      }
    } else {
      console.error('No file type selected for status toggle');
      showPopup('No file type selected for status toggle!', "error");
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

  const filteredFilesType = filesType?.filter(fileTypes => {
    const statusText = fileTypes?.isActive ? 'Active' : 'Inactive';
    const createdOnText = formatDate(fileTypes.createdOn);
    const updatedOnText = formatDate(fileTypes.updatedOn);

    return (
      fileTypes?.filetype?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fileTypes?.extension?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      statusText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      createdOnText.includes(searchTerm.toLowerCase()) ||
      updatedOnText.includes(searchTerm.toLowerCase())
    );
  });

  const sortedfile = filteredFilesType?.sort((a, b) => b.isActive - a.isActive);

  const totalItems = sortedfile?.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const paginatedFiles = sortedfile?.slice(
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
        <h1><AutoTranslate>File Types</AutoTranslate></h1>
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
                  <AutoTranslate>File</AutoTranslate> <AutoTranslate>Types</AutoTranslate>  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={translatedPlaceholders.enterFileTypes}
                  name="filetype"
                  value={formData.filetype || ""}
                  maxLength={15}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group ">
                <label>
                  <AutoTranslate>Extension</AutoTranslate>
                  <span className="text-red-500 text-sm ml-2 align-middle"><AutoTranslate>(Unique)</AutoTranslate></span>
                </label>
                <input
                  type="text"
                  placeholder={translatedPlaceholders.enterExtension}
                  name="extension"
                  value={formData.extension || ""}
                  maxLength={7}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group ">
                {editingFileTypeId === null ? (
                  <button
                    onClick={handleAddFileType}
                    disabled={isSubmitting}
                    className={`btn-primary flex items-center justify-center w-full ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isSubmitting ? (
                      <AutoTranslate>Adding...</AutoTranslate>
                    ) : (
                      <>
                        <PlusCircleIcon className="h-5 w-5 mr-1" /> <AutoTranslate>Add File Type</AutoTranslate>
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
                <th className='text-center'><AutoTranslate>SN</AutoTranslate></th>
                <th><AutoTranslate>File</AutoTranslate> <AutoTranslate>Types</AutoTranslate></th>
                <th><AutoTranslate>Extension</AutoTranslate></th>
                <th><AutoTranslate>Created Date</AutoTranslate></th>
                <th><AutoTranslate>Updated Date</AutoTranslate></th>
                <th><AutoTranslate>Status</AutoTranslate></th>
                <th className='text-center'><AutoTranslate>Edit</AutoTranslate></th>
                <th className='text-center'><AutoTranslate>Action</AutoTranslate></th>
              </tr>
            </thead>
            <tbody>
              {paginatedFiles?.map((fileType, index) => (
                <tr key={fileType.id}>
                  <td className='text-center'>{index + 1 + (currentPage - 1) * itemsPerPage}</td>
                  <td>{fileType.filetype}</td>
                  <td>{fileType.extension}</td>
                  <td>{formatDate(fileType.createdOn)}</td>
                  <td>{formatDate(fileType.updatedOn)}</td>
                  <td>
                    {fileType.isActive ? 'Active' : 'Inactive'}
                  </td>
                  <td className='text-center'>
                    <div className="btn-center">
                      <button
                        onClick={() => handleEditFileType(fileType.id)}
                        disabled={!fileType.isActive}
                        className={`viewBtn ${!fileType.isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <PencilIcon />
                      </button>
                    </div>
                  </td>
                  <td className='text-center'>
                    <button
                      onClick={() => handleToggleActiveStatus(fileType)}
                      className={`p-1 rounded-full ${fileType.isActive ? 'bg-green-500' : 'bg-red-500'}`}
                    >
                      {fileType.isActive ? (
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
                  <AutoTranslate>Are you sure you want to</AutoTranslate> {fileTypeToToggle?.isActive ?
                    <AutoTranslate>deactivate</AutoTranslate> :
                    <AutoTranslate>activate</AutoTranslate>} <AutoTranslate>this file type</AutoTranslate> <strong>{fileTypeToToggle?.filetype}</strong>?
                </p>
                <div className="flex justify-end gap-4">
                  <button onClick={() => setModalVisible(false)} className="btn-cancel">
                    <AutoTranslate>Cancel</AutoTranslate>
                  </button>
                  <button
                    onClick={confirmToggleActiveStatus}
                    disabled={isConfirmDisabled}
                    className={`btn-primary ${isConfirmDisabled ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                  >
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

export default FilesType;