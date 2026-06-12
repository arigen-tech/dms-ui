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
import { DEPAETMENT_API } from '../../API/apiConfig';
import { API_HOST } from "../../API/apiConfig";
import Popup from '../../Components/Popup';
import LoadingComponent from '../../Components/LoadingComponent';
import AutoTranslate from '../../i18n/AutoTranslate';
import { useLanguage } from '../../i18n/LanguageContext';
import { getFallbackTranslation } from '../../i18n/autoTranslator';
import apiClient from "../../API/apiClient"


const BranchDepartments = () => {
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

  // State for translated placeholders
  const [translatedPlaceholders, setTranslatedPlaceholders] = useState({
    search: 'Search...',
    show: 'Show:',
    departmentName: 'Enter Department Name (max 30 chars)',
    branch: 'Branch'
  });

  const [departments, setDepartments] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    isActive: true,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [userBranch, setUserBranch] = useState(null);
  const [toggleDepartment, setToggleDepartment] = useState(null);
  const [popupMessage, setPopupMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
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

  // Update placeholders when language changes
  useEffect(() => {
    const updatePlaceholders = async () => {
      if (!isTranslationNeeded()) {
        setTranslatedPlaceholders({
          search: 'Search...',
          show: 'Show:',
          departmentName: 'Enter Department Name (max 30 chars)',
          branch: 'Branch'
        });
        return;
      }

      const searchPlaceholder = await translatePlaceholder('Search...');
      const showPlaceholder = await translatePlaceholder('Show:');
      const departmentPlaceholder = await translatePlaceholder('Enter Department Name');
      const branchPlaceholder = await translatePlaceholder('Branch');

      setTranslatedPlaceholders({
        search: searchPlaceholder,
        show: showPlaceholder,
        departmentName: departmentPlaceholder,
        branch: branchPlaceholder
      });
    };

    updatePlaceholders();
  }, [currentLanguage, isTranslationNeeded, translatePlaceholder]);

  useEffect(() => {
    fetchUserBranch();
  }, []);

  useEffect(() => {
    if (userBranch) {
      fetchDepartments();
    }
  }, [userBranch]);

  const fetchUserBranch = async () => {
    setIsLoading(true);
    try {
      const userId = localStorage.getItem("id");
      const response = await apiClient.get(`${API_HOST}/employee/findById/${userId}`);
      setUserBranch(response.data.branch);
      setFormData(prev => ({
        ...prev,
        branch: response.data.branch
      }));
    } catch (error) {
      console.error("Error fetching user branch:", error);
      showPopup('Error fetching user branch', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDepartments = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get(`${DEPAETMENT_API}/findByBranch/${userBranch.id}`);
      setDepartments(response.data);
    } catch (error) {
      showPopup('Error fetching departments', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingComponent />;
  }

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

  const isDuplicateDepartment = (name) => {
    return departments.some(dept => {
      // Exclude current department being edited from duplicate check
      const isEditingCurrent = editingIndex && dept.id === editingIndex;
      return !isEditingCurrent &&
        dept.name.toLowerCase() === name.toLowerCase() &&
        dept.branch?.id === userBranch?.id;
    });
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      showPopup('Please enter a department name', 'warning');
      return false;
    }

    if (isDuplicateDepartment(formData.name)) {
      showPopup('Department with this name already exists in this branch', 'error');
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
        branch: userBranch,
        isActive: formData.isActive ? 1 : 0,
        createdOn: new Date().toISOString(),
        updatedOn: new Date().toISOString(),
      };

      const response = await apiClient.post(`${DEPAETMENT_API}/save`, newDepartment, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      setDepartments([...departments, response.data]);
      setFormData({ name: '', isActive: true });
      showPopup('Department added successfully', "success");
    } catch (error) {
      console.error('Error adding department:', error);
      showPopup('Failed to add the Department. Please try again.', "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditDepartment = (departmentId) => {
    const departmentToEdit = departments.find(dept => dept.id === departmentId);
    if (departmentToEdit) {
      setEditingIndex(departmentId);
      setFormData({
        id: departmentToEdit.id,
        name: departmentToEdit.name,
        isActive: departmentToEdit.isActive === 1,
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
      const updatedDepartment = {
        ...formData,
        branch: userBranch,
        isActive: formData.isActive ? 1 : 0,
        updatedOn: new Date().toISOString(),
      };

      const response = await apiClient.put(
        `${DEPAETMENT_API}/update/${formData.id}`,
        updatedDepartment,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const updatedDepartments = departments.map(dept =>
        dept.id === formData.id ? response.data : dept
      );

      setDepartments(updatedDepartments);
      setFormData({ name: '', isActive: true });
      setEditingIndex(null);
      showPopup('Department updated successfully', "success");
    } catch (error) {
      console.error('Error updating department:', error);
      showPopup('Failed to update the Department. Please try again.', "error");
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

        await apiClient.put(
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
      } catch (error) {
        console.error('Error toggling department status:', error);
        showPopup('Failed to change the status. Please try again.', "error");
      } finally {
        setIsConfirmDisabled(false);
      }
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

    return (
      department.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      statusText.includes(searchTerm.toLowerCase()) ||
      createdOnText.includes(searchTerm.toLowerCase()) ||
      updatedOnText.includes(searchTerm.toLowerCase())
    );
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

  return (
    <div className="px-2-">
      <div className="title">
        <h1><AutoTranslate>Branch Department</AutoTranslate></h1>
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

          <div ref={formSectionRef} className="cardLight">
            <div className="grid grid-col-4 itemEnd">
              <div className="form-group ">
                <label>
                  <AutoTranslate>Department Name</AutoTranslate> <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={translatedPlaceholders.departmentName}
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  maxLength={30}
                />
              </div>

              <div className="form-group ">
                <label>
                  <AutoTranslate>Branch</AutoTranslate>
                </label>
                <input
                  type="text"
                  placeholder={translatedPlaceholders.branch}
                  value={userBranch ? userBranch.name : "Loading..."}
                  disabled
                />
              </div>
              <div className="form-group">
                {editingIndex === null ? (
                  <button
                    onClick={handleAddDepartment}
                    disabled={isSubmitting}
                    className={`btn-primary flex items-center justify-center w-full ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
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
                    className={`btn-primary flex items-center justify-center w-full ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
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
                <th className='text-center'><AutoTranslate>SR.</AutoTranslate></th>
                <th><AutoTranslate>Department</AutoTranslate></th>
                <th><AutoTranslate>Branch</AutoTranslate></th>
                <th><AutoTranslate>Created On</AutoTranslate></th>
                <th><AutoTranslate>Updated On</AutoTranslate></th>
                <th><AutoTranslate>Status</AutoTranslate></th>
                <th className='text-center'><AutoTranslate>Edit</AutoTranslate></th>
                <th className='text-center'><AutoTranslate>Access</AutoTranslate></th>
              </tr>
            </thead>
            <tbody>
              {paginatedDepartments.map((department, index) => (
                <tr key={department.id}>
                  <td className='text-center'>{index + 1 + (currentPage - 1) * itemsPerPage}</td>
                  <td>{department.name}</td>
                  <td>{userBranch ? userBranch.name : 'N/A'}</td>
                  <td>{formatDate(department.createdOn)}</td>
                  <td>{formatDate(department.updatedOn)}</td>
                  <td>{department.isActive === 1 ? 'Active' : 'Inactive'}</td>
                  <td className='text-center'>
                    <div className='btn-center'>
                      <button
                        onClick={() => handleEditDepartment(department.id)}
                        disabled={department.isActive === 0}
                        className={`viewBtn ${department.isActive === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <PencilIcon />
                      </button>
                    </div>
                  </td>
                  <td className='text-center'>
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
                <p>
            <AutoTranslate>Are you sure you want to</AutoTranslate> {toggleDepartment?.isActive === 1 ? <AutoTranslate>deactivate</AutoTranslate> : <AutoTranslate>activate</AutoTranslate>} <AutoTranslate>the department</AutoTranslate> <strong>{toggleDepartment?.name}</strong>?
          </p>
          <div className="mt-6 flex justify-end gap-4">
            <button
              onClick={() => setModalVisible(false)}
              className="btn-cancel"
            >
              <AutoTranslate>Cancel</AutoTranslate>
            </button>
            <button
              onClick={confirmToggleActiveStatus}
              disabled={isConfirmDisabled}
              className={`bg-blue-500 text-white rounded-md px-4 py-2 ${isConfirmDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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

export default BranchDepartments;