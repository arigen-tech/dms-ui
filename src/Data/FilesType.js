import React, { useState, useEffect, useCallback } from 'react';
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
import {
  getRequest,
  postRequest,
  putRequest
} from '../API/apiService';
import Popup from '../Components/Popup';
import LoadingComponent from '../Components/LoadingComponent';
import AutoTranslate from '../i18n/AutoTranslate';
import { useLanguage } from '../i18n/LanguageContext';

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
      const response = await getRequest(`${FILETYPE_API}/getAll`);
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

      const response = await postRequest(`${FILETYPE_API}/create`, newFileType);
      setFilesType([...filesType, response.data.data]);
      setFormData({ filetype: '', extension: '', isActive: 1 });
      showPopup('FileType added successfully!', "success");
      fetchFilesType();

    } catch (error) {
      console.error('Error adding FileType:', error);
      const errorMessage = error.response?.data?.message ||
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

        const response = await putRequest(
          `${FILETYPE_API}/updateById/${updatedFileType.id}`,
          updatedFileType
        );

        const updatedFileTypes = filesType?.map(branch =>
          branch.id === updatedFileType.id ? response.data : branch
        );

        setFilesType(updatedFileTypes);
        setFormData({ filetype: '', extension: '', isActive: 1 });
        seteditingFileTypeId(null);
        showPopup('File Type updated successfully!', "success");
        fetchFilesType();
      } catch (error) {
        console.error('Error updating File Type:', error);
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

        const response = await putRequest(
          `${FILETYPE_API}/update/status/${updatedFilesType.id}?status=${updatedFilesType.status}`,
          {}
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
        console.error('Error toggling file type status:', error);
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
    <div className="px-2">
      <h1 className="text-2xl mb-1 font-semibold">
       <AutoTranslate>File</AutoTranslate> <AutoTranslate>Types</AutoTranslate>
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
                <AutoTranslate>File</AutoTranslate> <AutoTranslate>Types</AutoTranslate>  <span className="text-red-500">*</span>
                <input
                  type="text"
                  placeholder={translatedPlaceholders.enterFileTypes}
                  name="filetype"
                  value={formData.filetype || ""}
                  maxLength={15}
                  onChange={handleInputChange}
                  className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>

              <label className="block text-md font-medium text-gray-700">
                <AutoTranslate>Extension</AutoTranslate>
                <span className="text-red-500 text-sm ml-2 align-middle"><AutoTranslate>(Unique)</AutoTranslate></span>
                <input
                  type="text"
                  placeholder={translatedPlaceholders.enterExtension}
                  name="extension"
                  value={formData.extension || ""}
                  maxLength={7}
                  onChange={handleInputChange}
                  className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
            </div>

            <div className="w-1/5 flex items-end">
              {editingFileTypeId === null ? (
                <button 
                  onClick={handleAddFileType}
                  disabled={isSubmitting}
                  className={`bg-blue-900 text-white rounded-2xl p-2 w-full text-sm flex items-center justify-center ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                <th className="border p-2 text-left"><AutoTranslate>File</AutoTranslate> <AutoTranslate>Types</AutoTranslate></th>
                <th className="border p-2 text-left"><AutoTranslate>Extension</AutoTranslate></th>
                <th className="border p-2 text-left"><AutoTranslate>Created Date</AutoTranslate></th>
                <th className="border p-2 text-left"><AutoTranslate>Updated Date</AutoTranslate></th>
                <th className="border p-2 text-left"><AutoTranslate>Status</AutoTranslate></th>
                <th className="border p-2 text-left"><AutoTranslate>Edit</AutoTranslate></th>
                <th className="border p-2 text-left"><AutoTranslate>Action</AutoTranslate></th>
              </tr>
            </thead>
            <tbody>
              {paginatedFiles?.map((fileType, index) => (
                <tr key={fileType.id}>
                  <td className="border p-2">{index + 1 + (currentPage - 1) * itemsPerPage}</td>
                  <td className="border p-2">{fileType.filetype}</td>
                  <td className="border p-2">{fileType.extension}</td>
                  <td className="border p-2">{formatDate(fileType.createdOn)}</td>
                  <td className="border p-2">{formatDate(fileType.updatedOn)}</td>
                  <td className="border p-2">
                   {fileType.isActive ? 'Active' : 'Inactive'}
                  </td>
                  <td className="border p-2 text-center">
                    <button 
                      onClick={() => handleEditFileType(fileType.id)} 
                      disabled={!fileType.isActive}
                      className={`${!fileType.isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <PencilIcon className="h-6 w-6 text-white bg-yellow-400 rounded-xl p-1" />
                    </button>
                  </td>
                  <td className="border p-2 text-center">
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
              <AutoTranslate>Are you sure you want to</AutoTranslate> {fileTypeToToggle?.isActive ?
                <AutoTranslate>deactivate</AutoTranslate> :
                <AutoTranslate>activate</AutoTranslate>} <AutoTranslate>this file type</AutoTranslate> <strong>{fileTypeToToggle?.filetype}</strong>?
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

export default FilesType;