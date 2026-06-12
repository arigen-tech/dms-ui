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
import { BRANCH_API } from '../API/apiConfig';
import Popup from '../Components/Popup';
import LoadingComponent from '../Components/LoadingComponent';
import AutoTranslate from '../i18n/AutoTranslate';
import { useLanguage } from '../i18n/LanguageContext';
import apiClient from "../API/apiClient";


const tokenKey = 'tokenKey';

const Branch = () => {
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
    enterAddress: 'Enter address',
    search: 'Search...'
  });

  // Debug log
  useEffect(() => {
    console.log('🔍 Branch Component - Language Status:', {
      currentLanguage,
      defaultLanguage,
      isTranslationNeeded: isTranslationNeeded(),
      translationStatus,
      availableLanguagesCount: availableLanguages.length,
      pathname: window.location.pathname
    });
  }, [currentLanguage, defaultLanguage, translationStatus, isTranslationNeeded, availableLanguages]);

  const [branches, setBranches] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    isActive: true,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [branchToToggle, setBranchToToggle] = useState(null);
  const [editingBranchId, setEditingBranchId] = useState(null);
  const [popupMessage, setPopupMessage] = useState(null);
  const [isConfirmDisabled, setIsConfirmDisabled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formSectionRef = useRef(null);

  const token = localStorage.getItem('tokenKey');

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
          enterAddress: 'Enter address',
          search: 'Search...'
        });
        return;
      }

      // Only update if language changed
      const namePlaceholder = await translatePlaceholder('Enter name');
      const addressPlaceholder = await translatePlaceholder('Enter address');
      const searchPlaceholder = await translatePlaceholder('Search...');

      setTranslatedPlaceholders({
        enterName: namePlaceholder,
        enterAddress: addressPlaceholder,
        search: searchPlaceholder
      });
    };

    updatePlaceholders();
  }, [currentLanguage, translatePlaceholder, isTranslationNeeded]);

  // Fetch branches - runs only once on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const response = await apiClient.get(`${BRANCH_API}/findAll`);
        setBranches(response.data);
        console.log('✅ Branches loaded');
      } catch (error) {
        console.error('Error fetching branches:', error);
        showPopup('Failed to load branches', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [token]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'name') {
      if (/\d/.test(value)) {
        showPopup('Branch name cannot contain numbers', 'error');
        return;
      }
      if (value.length > 30) {
        showPopup('Branch name cannot exceed 30 characters', 'error');
        return;
      }
    }

    if (name === 'address' && value.length > 50) {
      showPopup('Address cannot exceed 50 characters', 'error');
      return;
    }

    setFormData({ ...formData, [name]: value });
  };

  const isDuplicateBranch = (name) => {
    return branches.some(branch =>
      branch.name.toLowerCase() === name.toLowerCase() &&
      branch.id !== editingBranchId
    );
  };

  const handleAddBranch = async () => {
    if (!formData.name.trim() || !formData.address.trim()) {
      showPopup('Please fill in all required fields!', 'warning');
      return;
    }

    if (isDuplicateBranch(formData.name)) {
      showPopup('Branch with this name already exists!', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const newBranch = {
        ...formData,
        createdOn: new Date().toISOString(),
        updatedOn: new Date().toISOString(),
        isActive: formData.isActive ? 1 : 0,
      };

      const response = await apiClient.post(`${BRANCH_API}/save`, newBranch, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      setBranches([...branches, response.data]);
      setFormData({ name: '', address: '', isActive: true });
      showPopup('Branch added successfully', "success");
    } catch (error) {
      console.error('Error adding branch:', error.response ? error.response.data : error.message);
      showPopup('Failed to add the Branch. Please try again!', "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditBranch = (branchId) => {
    setEditingBranchId(branchId);
    const branchToEdit = branches.find(branch => branch.id === branchId);

    if (branchToEdit) {
      setFormData({
        name: branchToEdit.name,
        address: branchToEdit.address,
        isActive: branchToEdit.isActive === 1,
        id: branchToEdit.id,
      });

      if (formSectionRef.current) {
        formSectionRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!formData.name.trim() || !formData.address.trim()) {
      showPopup('Please fill in all required fields!', 'warning');
      return;
    }

    if (isDuplicateBranch(formData.name)) {
      showPopup('Branch with this name already exists', 'error');
      return;
    }

    if (editingBranchId !== null) {
      setIsSubmitting(true);
      try {
        const branchIndex = branches.findIndex(branch => branch.id === editingBranchId);

        if (branchIndex === -1) {
          showPopup('Branch not found', 'error');
          return;
        }

        const updatedBranch = {
          ...branches[branchIndex],
          name: formData.name,
          address: formData.address,
          isActive: formData.isActive ? 1 : 0,
          updatedOn: new Date().toISOString(),
        };

        const response = await apiClient.put(`${BRANCH_API}/update/${updatedBranch.id}`, updatedBranch);

        const updatedBranches = branches.map(branch =>
          branch.id === updatedBranch.id ? response.data : branch
        );

        setBranches(updatedBranches);
        setFormData({ name: '', address: '', isActive: true });
        setEditingBranchId(null);
        showPopup('Branch updated successfully', "success");
      } catch (error) {
        console.error('Error updating branch:', error.response ? error.response.data : error.message);
        showPopup('Failed to update the branch. Please try again', "error");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleToggleActiveStatus = (branch) => {
    setBranchToToggle(branch);
    setModalVisible(true);
  };

  const confirmToggleActiveStatus = async () => {
    setIsConfirmDisabled(true);

    if (branchToToggle) {
      try {
        const updatedBranch = {
          ...branchToToggle,
          isActive: branchToToggle.isActive === 1 ? 0 : 1,
          updatedOn: new Date().toISOString(),
        };

        const token = localStorage.getItem(tokenKey);
        const response = await apiClient.put(
          `${BRANCH_API}/updatestatus/${updatedBranch.id}`,
          updatedBranch,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        const updatedBranches = branches.map(branch =>
          branch.id === updatedBranch.id ? response.data : branch
        );

        setBranches(updatedBranches);
        setModalVisible(false);
        setBranchToToggle(null);
        setIsConfirmDisabled(false);
        showPopup('Status changed successfully', "success");
      } catch (error) {
        console.error('Error toggling branch status:', error.response ? error.response.data : error.message);
        showPopup('Failed to change the status. Please try again', "error");
      }
    } else {
      console.error('No Branch selected for status toggle');
      showPopup('No branch selected for status toggle', "error");
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

  const filteredBranches = branches.filter(branch => {
    const statusText = branch.isActive ? 'Active' : 'Inactive';
    const createdOnText = formatDate(branch.createdOn);
    const updatedOnText = formatDate(branch.updatedOn);

    return (
      (branch.name && branch.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (branch.address && branch.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
      statusText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      createdOnText.includes(searchTerm.toLowerCase()) ||
      updatedOnText.includes(searchTerm.toLowerCase())
    );
  });

  const sortedBranches = filteredBranches.sort((a, b) => b.isActive - a.isActive);
  const totalItems = sortedBranches.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedBranches = sortedBranches.slice(
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
        <h1><AutoTranslate>Branches</AutoTranslate></h1>
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
                  value={formData.name || ""}
                  onChange={handleInputChange}
                  maxLength={30}
                  required
                />
              </div>
              <div className="form-group ">
                <label>
                  <AutoTranslate>Address</AutoTranslate> <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={translatedPlaceholders.enterAddress}
                  name="address"
                  value={formData.address || ""}
                  onChange={handleInputChange}
                  maxLength={50}
                  required
                />
              </div>
              <div className="form-group ">
                {editingBranchId === null ? (
                  <button
                    onClick={handleAddBranch}
                    disabled={isSubmitting}
                    className={`btn-primary flex items-center justify-center w-full ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isSubmitting ? (
                      <AutoTranslate>Adding...</AutoTranslate>
                    ) : (
                      <>
                        <PlusCircleIcon className="h-5 w-5 mr-1" /> <AutoTranslate>Add Branch</AutoTranslate>
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
                <th><AutoTranslate>Branches</AutoTranslate></th>
                <th><AutoTranslate>Address</AutoTranslate></th>
                <th><AutoTranslate>Created Date</AutoTranslate></th>
                <th><AutoTranslate>Updated Date</AutoTranslate></th>
                <th><AutoTranslate>Status</AutoTranslate></th>
                <th className='text-center'><AutoTranslate>Edit</AutoTranslate></th>
                <th className='text-center'><AutoTranslate>Action</AutoTranslate></th>
              </tr>
            </thead>
            <tbody>
              {paginatedBranches.map((branch, index) => (
                <tr key={branch.id}>
                  <td className='text-center'>{index + 1 + (currentPage - 1) * itemsPerPage}</td>
                  <td>{branch.name}</td>
                  <td>{branch.address}</td>
                  <td>{formatDate(branch.createdOn)}</td>
                  <td>{formatDate(branch.updatedOn)}</td>
                  <td>
                    {branch.isActive ? 'Active' : 'Inactive'}
                  </td>
                  <td className='text-center'>
                    <div className="btn-center">
                      <button title='Edit' className={`viewBtn ${branch.isActive === 0 ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={() => handleEditBranch(branch.id)} disabled={branch.isActive === 0}>
                        <PencilIcon />
                      </button>
                    </div>
                  </td>
                  <td className='text-center'>
                    <button
                      onClick={() => handleToggleActiveStatus(branch)}
                      className={`p-1 rounded-full ${branch.isActive ? 'bg-green-500' : 'bg-red-500'}`}
                    >
                      {branch.isActive ? (
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
        <>

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
                    <AutoTranslate>Are you sure you want to</AutoTranslate> {branchToToggle?.isActive ?
                      <AutoTranslate>deactivate</AutoTranslate> :
                      <AutoTranslate>activate</AutoTranslate>} <AutoTranslate>this branch</AutoTranslate> <strong>{branchToToggle?.name}</strong>?
                  </p>
                  <div className="flex justify-end gap-4">
                    <button onClick={() => setModalVisible(false)} className="btn-cancel">
                      <AutoTranslate>Cancel</AutoTranslate>
                    </button>
                    <button
                      onClick={confirmToggleActiveStatus}
                      disabled={isConfirmDisabled}
                      className={`btn-primary ${isConfirmDisabled ? 'opacity-50 cursor-not-allowed' : ''}`} >
                      {isConfirmDisabled ? <AutoTranslate>Processing...</AutoTranslate> : <AutoTranslate>Confirm</AutoTranslate>}
                    </button>
                  </div>
                </div>



              </div>
            </div>
          </div>
        </>
      )}


    </div>
  );
};

export default Branch;