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
  PlusCircleIcon,
} from '@heroicons/react/24/solid';
import { DEPAETMENT_API, BRANCH_API } from '../API/apiConfig';
import Popup from '../Components/Popup';
import LoadingComponent from '../Components/LoadingComponent';
import AutoTranslate from '../i18n/AutoTranslate';
import { useLanguage } from '../i18n/LanguageContext';
import apiClient from "../API/apiClient";


const tokenKey = 'tokenKey';

const Department = () => {
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
    enterName: 'Enter department name',
    selectBranche: 'Select branch',
    search: 'Search...',
    allBranches: 'All Branch'
  });

  // Debug log
  useEffect(() => {
    console.log('🔍 Department Component - Language Status:', {
      currentLanguage,
      defaultLanguage,
      isTranslationNeeded: isTranslationNeeded(),
      translationStatus,
      availableLanguagesCount: availableLanguages.length,
      pathname: window.location.pathname
    });
  }, [currentLanguage, defaultLanguage, translationStatus, isTranslationNeeded, availableLanguages]);

  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    branch: null,
    isActive: true,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [toggleDepartment, setToggleDepartment] = useState(null);
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
          enterName: 'Enter department name',
          selectBranch: 'Select Branch',
          search: 'Search...',
          allBranches: 'All Branches'
        });
        return;
      }

      // Only update if language changed
      const namePlaceholder = await translatePlaceholder('Enter department name');
      const branchPlaceholder = await translatePlaceholder('Select Branch');
      const searchPlaceholder = await translatePlaceholder('Search...');
      const allBranchesPlaceholder = await translatePlaceholder('All Branches');

      setTranslatedPlaceholders({
        enterName: namePlaceholder,
        selectBranch: branchPlaceholder,
        search: searchPlaceholder,
        allBranches: allBranchesPlaceholder
      });
    };

    updatePlaceholders();
  }, [currentLanguage, translatePlaceholder, isTranslationNeeded]);

  // Fetch branches and departments - runs only once on mount
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        // Fetch branches
        const branchesResponse = await apiClient.get(`${BRANCH_API}/findActiveRole`);
        setBranches(branchesResponse.data);
        console.log('✅ Branches loaded');

        // Fetch departments
        const departmentsResponse = await apiClient.get(`${DEPAETMENT_API}/findAll`);
        setDepartments(departmentsResponse.data);
        console.log('✅ Departments loaded');
      } catch (error) {
        console.error('Error fetching data:', error);
        showPopup('Failed to load data', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [token]);

  const showPopup = (message, type = 'info') => {
    setPopupMessage({
      message,
      type,
      onClose: () => {
        setPopupMessage(null);
      }
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Allow only letters and spaces, max 30 chars
    const regex = /^[A-Za-z\s]*$/;
    if ((regex.test(value) || value === "") && value.length <= 30) {
      setFormData(prev => ({ ...prev, [name]: value }));
    } else if (value.length > 30) {
      showPopup('Department name cannot exceed 30 characters', 'error');
    }
  };

  const handleBranchChange = (e) => {
    const selectedBranch = branches.find(branch => branch.id === parseInt(e.target.value));
    setFormData(prev => ({ ...prev, branch: selectedBranch }));
  };

  const isDuplicateDepartment = (name, branchId) => {
    return departments.some(dept => {
      // Exclude current department being edited from duplicate check
      const isEditingCurrent = editingIndex && dept.id === editingIndex;
      return !isEditingCurrent &&
        dept.name.toLowerCase() === name.toLowerCase() &&
        dept.branch?.id === branchId;
    });
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      showPopup('Please enter a department name', 'warning');
      return false;
    }

    if (!formData.branch) {
      showPopup('Please select a branch', 'warning');
      return false;
    }

    if (isDuplicateDepartment(formData.name, formData.branch.id)) {
      showPopup('Department with this name already exists in the selected branch', 'error');
      return false;
    }

    return true;
  };

  const handleAddDepartment = async () => {
    if (!validateForm() || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const newDepartment = {
        name: formData.name,
        branch: formData.branch,
        createdOn: new Date().toISOString(),
        updatedOn: new Date().toISOString(),
        isActive: formData.isActive ? 1 : 0,
      };

      const response = await apiClient.post(`${DEPAETMENT_API}/save`, newDepartment, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      setDepartments([...departments, response.data]);
      setFormData({ name: '', branch: null, isActive: true });
      showPopup('Department added successfully', "success");
    } catch (error) {
      console.error('Error adding department:', error.response ? error.response.data : error.message);
      showPopup('Failed to add the Department. Please try again.', "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditDepartment = (departmentId) => {
    setEditingIndex(departmentId);
    const departmentToEdit = departments.find(department => department.id === departmentId);

    if (departmentToEdit) {
      setFormData({
        name: departmentToEdit.name,
        branch: departmentToEdit.branch,
        isActive: departmentToEdit.isActive === 1,
        id: departmentToEdit.id,
      });

      // Scroll to form section
      if (formSectionRef.current) {
        formSectionRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!validateForm() || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const departmentIndex = departments.findIndex(department => department.id === formData.id);

      if (departmentIndex === -1) {
        showPopup('Department not found', 'error');
        return;
      }

      const updatedDepartment = {
        ...departments[departmentIndex],
        name: formData.name,
        branch: formData.branch,
        isActive: formData.isActive ? 1 : 0,
        updatedOn: new Date().toISOString(),
      };

      const response = await apiClient.put(`${DEPAETMENT_API}/update/${updatedDepartment.id}`, updatedDepartment, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const updatedDepartments = departments.map(department =>
        department.id === updatedDepartment.id ? response.data : department
      );

      setDepartments(updatedDepartments);
      setFormData({ name: '', branch: null, isActive: true });
      setEditingIndex(null);
      showPopup('Department updated successfully', "success");
    } catch (error) {
      console.error('Error updating department:', error.response ? error.response.data : error.message);
      showPopup('Failed to update the department. Please try again.', "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = (department) => {
    setToggleDepartment(department);
    setModalVisible(true);
  };

  const confirmToggleActiveStatus = async () => {
    setIsConfirmDisabled(true);
    if (toggleDepartment) {
      try {
        const isActive = toggleDepartment.isActive === 1 ? 0 : 1;

        const response = await apiClient.put(
          `${DEPAETMENT_API}/updateDeptStatus/${toggleDepartment.id}`,
          isActive,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        const updatedDepartments = departments.map(dept =>
          dept.id === toggleDepartment.id ? { ...dept, isActive } : dept
        );

        setDepartments(updatedDepartments);
        setModalVisible(false);
        setToggleDepartment(null);
        showPopup('Status changed successfully', "success");
        console.log('Status change response:', response.data);
      } catch (error) {
        console.error('Error toggling department status:', error.response ? error.response.data : error.message);
        showPopup('Failed to change the status. Please try again.', "error");
      } finally {
        setIsConfirmDisabled(false);
      }
    } else {
      showPopup('No department selected for status toggle.', "warning");
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

  const filteredDepartments = departments.filter(department => {
    const statusText = department.isActive === 1 ? 'active' : 'inactive';
    const createdOnText = formatDate(department.createdOn);
    const updatedOnText = formatDate(department.updatedOn);

    const matchesBranchFilter = branchFilter === "" || department.branch?.id === Number.parseInt(branchFilter);
    const matchesSearchTerm =
      department.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (department.branch?.name && department.branch.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      statusText.includes(searchTerm.toLowerCase()) ||
      createdOnText.includes(searchTerm.toLowerCase()) ||
      updatedOnText.includes(searchTerm.toLowerCase());

    return matchesBranchFilter && matchesSearchTerm;
  });

  const sortedDepartments = filteredDepartments.sort((a, b) => b.isActive - a.isActive);

  const totalItems = sortedDepartments.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedDepartments = sortedDepartments.slice(
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
        <h1><AutoTranslate>Department</AutoTranslate></h1>
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
                  <AutoTranslate>Branch</AutoTranslate> <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.branch?.id || ''}
                  onChange={handleBranchChange}
                >
                  <option value=""><AutoTranslate>Select Branch</AutoTranslate></option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className='form-group'>

                {editingIndex === null ? (
                  <button
                    onClick={handleAddDepartment}
                    disabled={isSubmitting}
                    className={`btn-primary flex items-center justify-center w-full ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isSubmitting ? (
                      <AutoTranslate>Adding...</AutoTranslate>
                    ) : (
                      <>
                        <PlusCircleIcon className="h-5 w-5 mr-1" /> <AutoTranslate>Add Department</AutoTranslate>
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


        {/* Search and Items Per Page Section */}
        <div className="data-search-wrapper">
          <div className="flex items-center gap-8">
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
              <label htmlFor="branchFilter">
                <AutoTranslate>Branch:</AutoTranslate>
              </label>
              <select
                id="branchFilter"
                value={branchFilter}
                onChange={(e) => {
                  setBranchFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value=""><AutoTranslate>All Branches</AutoTranslate></option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
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

        {/* Departments Table */}
        <div className="table-wrapper">
          <table className="">
            <thead>
              <tr>
                <th className="text-center">
                  <AutoTranslate>SN</AutoTranslate>
                </th>
                <th><AutoTranslate>Department</AutoTranslate></th>
                <th><AutoTranslate>Branch</AutoTranslate></th>
                <th><AutoTranslate>Created Date</AutoTranslate></th>
                <th><AutoTranslate>Updated Date</AutoTranslate></th>
                <th><AutoTranslate>Status</AutoTranslate></th>
                <th className="text-center"><AutoTranslate>Edit</AutoTranslate></th>
                <th className="text-center"><AutoTranslate>Action</AutoTranslate></th>
              </tr>
            </thead>
            <tbody>
              {paginatedDepartments.map((department, index) => (
                <tr key={department.id}>
                  <td className="text-center">{index + 1 + (currentPage - 1) * itemsPerPage}</td>
                  <td>{department.name}</td>
                  <td>{department.branch?.name || ''}</td>
                  <td>{formatDate(department.createdOn)}</td>
                  <td>{formatDate(department.updatedOn)}</td>
                  <td>
                    {department.isActive === 1 ? 'Active' : 'Inactive'}
                  </td>
                  <td>
                    <div className="btn-center">
                      <button
                        onClick={() => handleEditDepartment(department.id)}
                        disabled={department.isActive === 0}
                        className={`viewBtn ${department.isActive === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <PencilIcon />
                      </button>
                    </div>
                  </td>
                  <td className="text-center">
                    <button
                      onClick={() => handleToggleActive(department)}
                      className={`p-1 rounded-full ${department.isActive === 1 ? 'bg-green-500' : 'bg-red-500'}`}
                    >
                      {department.isActive === 1 ? (
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

      {/* Modal for Confirming Status Change */}
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
                  <AutoTranslate>Are you sure you want to</AutoTranslate> {toggleDepartment?.isActive === 1 ?
                    <AutoTranslate>deactivate</AutoTranslate> :
                    <AutoTranslate>activate</AutoTranslate>} <AutoTranslate>the department</AutoTranslate> <strong>{toggleDepartment?.name}</strong>?
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

export default Department;