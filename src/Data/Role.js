import { ROLE_API } from "../API/apiConfig";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  LockClosedIcon,
  LockOpenIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/solid";
import axios from "axios";
import Popup from "../Components/Popup";
import LoadingComponent from '../Components/LoadingComponent';
import AutoTranslate from '../i18n/AutoTranslate';
import { useLanguage } from '../i18n/LanguageContext';

const tokenKey = "tokenKey";

const Role = () => {
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
    enterRole: 'Enter Role',
    enterRoleCode: 'Enter 3-digit Role Code',
  });

  // Debug log
  useEffect(() => {
    console.log('🔍 Role Component - Language Status:', {
      currentLanguage,
      defaultLanguage,
      isTranslationNeeded: isTranslationNeeded(),
      translationStatus,
      availableLanguagesCount: availableLanguages.length,
      pathname: window.location.pathname
    });
  }, [currentLanguage, defaultLanguage, translationStatus, isTranslationNeeded, availableLanguages]);

  const [roles, setRoles] = useState([]);
  const [formData, setFormData] = useState({ role: "", roleCode: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [popupMessage, setPopupMessage] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [roleToToggle, setRoleToToggle] = useState(null);
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false); // Track submission state
  const [isConfirmDisabled, setIsConfirmDisabled] = useState(false);
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
          search: 'Search...',
          show: 'Show:',
          enterRole: 'Enter Role',
          enterRoleCode: 'Enter 3-digit Role Code',
        });
        return;
      }

      // Only update if language changed
      const searchPlaceholder = await translatePlaceholder('Search...');
      const showPlaceholder = await translatePlaceholder('Show:');
      const enterRolePlaceholder = await translatePlaceholder('Enter Role');
      const enterRoleCodePlaceholder = await translatePlaceholder('Enter 3-digit Role Code');

      setTranslatedPlaceholders({
        search: searchPlaceholder,
        show: showPlaceholder,
        enterRole: enterRolePlaceholder,
        enterRoleCode: enterRoleCodePlaceholder,
      });
    };
    
    updatePlaceholders();
  }, [currentLanguage, translatePlaceholder, isTranslationNeeded]);

  // Fetch roles - runs only once on mount
  useEffect(() => {
    const fetchRoles = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem(tokenKey);
        const response = await axios.get(`${ROLE_API}/findAll`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRoles(response.data);
        console.log('✅ Roles loaded');
      } catch (error) {
        console.error("Error fetching roles:", error);
        showPopup("Failed to fetch roles. Please try again.", "error");
      } finally {
        setIsLoading(false);
      }
    };
    fetchRoles();
  }, []);

  const showPopup = (message, type = "info") => {
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

    // Allow only letters and spaces, max 30 characters
    const regex = /^[A-Za-z\s]*$/;
    if ((regex.test(value) || value === "") && value.length <= 30) {
      setFormData(prev => ({ ...prev, [name]: value }));
    } else if (value.length > 30) {
      showPopup('Role name cannot exceed 30 characters', 'error');
    }
  };

  const handleInputsChange = (e) => {
    const { name, value } = e.target;
    const numericValue = value.replace(/[^0-9]/g, "").slice(0, 3); // Limit to 3 digits
    
    setFormData(prev => ({ ...prev, [name]: numericValue }));
  };

  const isDuplicateRole = (role, roleCode) => {
    return roles.some(r => {
      // Check if we're editing an existing role (exclude it from duplicate check)
      const isEditingCurrent = editingRoleId && r.id === editingRoleId;
      
      // Check for duplicate name (case-insensitive) or duplicate code
      return !isEditingCurrent && (
        (r.role.toLowerCase() === role.toLowerCase()) || 
        (r.roleCode.toString() === roleCode.toString())
      );
    });
  };

  const validateForm = () => {
    if (!formData.role.trim()) {
      showPopup("Please enter a role name!", "warning");
      return false;
    }

    if (!formData.roleCode || formData.roleCode.length !== 3) {
      showPopup("Please enter a valid 3-digit role code!", "warning");
      return false;
    }

    if (isDuplicateRole(formData.role, formData.roleCode)) {
      showPopup("Role name or code already exists!", "error");
      return false;
    }

    return true;
  };

  const handleAddRole = async () => {
    if (!validateForm() || isSubmitting) return;
    
    setIsSubmitting(true); // Disable button during submission

    try {
      const newRole = {
        role: formData.role,
        roleCode: formData.roleCode,
        isActive: 1,
      };

      const token = localStorage.getItem(tokenKey);
      const response = await axios.post(`${ROLE_API}/save`, newRole, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setRoles([...roles, response.data]);
      setFormData({ role: "", roleCode: "" });
      showPopup("Role added successfully!", "success");
    } catch (error) {
      console.error("Error adding role:", error.response ? error.response.data : error.message);
      showPopup("Failed to add the role. Please try again!", "error");
    } finally {
      setIsSubmitting(false); // Re-enable button after submission
    }
  };

  const handleEditRole = (roleId) => {
    setEditingRoleId(roleId);
    const roleToEdit = roles.find(role => role.id === roleId);

    if (roleToEdit) {
      setFormData({
        role: roleToEdit.role,
        roleCode: roleToEdit.roleCode,
      });
      
      // Scroll to form section
      if (formSectionRef.current) {
        formSectionRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!validateForm() || isSubmitting) return;
    
    setIsSubmitting(true); // Disable button during submission

    try {
      const roleIndex = roles.findIndex(role => role.id === editingRoleId);

      if (roleIndex === -1) {
        showPopup("Role not found!", "error");
        return;
      }

      const updatedRole = {
        ...roles[roleIndex],
        role: formData.role,
        roleCode: formData.roleCode,
        updatedOn: new Date().toISOString(),
      };

      const response = await axios.put(
        `${ROLE_API}/update/${updatedRole.id}`,
        updatedRole,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem(tokenKey)}`,
          },
        }
      );

      const updatedRoles = roles.map(role =>
        role.id === updatedRole.id ? response.data : role
      );

      setRoles(updatedRoles);
      setFormData({ role: "", roleCode: "" });
      setEditingRoleId(null);
      showPopup("Role updated successfully!", "success");
    } catch (error) {
      console.error("Error updating role:", error.response ? error.response.data : error.message);
      showPopup("Failed to update the role. Please try again!", "error");
    } finally {
      setIsSubmitting(false); // Re-enable button after submission
    }
  };

  const handleToggleActiveStatus = (role) => {
    setRoleToToggle(role);
    setModalVisible(true);
  };

  const confirmToggleActiveStatus = async () => {
    setIsConfirmDisabled(true);

    if (roleToToggle) {
      try {
        const updatedRole = {
          ...roleToToggle,
          isActive: roleToToggle.isActive === true ? false : true,
          updatedOn: new Date().toISOString(),
        };

        const token = localStorage.getItem(tokenKey);
        const response = await axios.put(
          `${ROLE_API}/updatestatus/${updatedRole.id}`,
          updatedRole,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const updatedRoles = roles.map(role =>
          role.id === updatedRole.id ? response.data : role
        );

        setRoles(updatedRoles);
        setModalVisible(false);
        setRoleToToggle(null);
        showPopup("Role status changed successfully!", "success");
      } catch (error) {
        console.error("Error toggling role status:", error.response ? error.response.data : error.message);
        showPopup("Failed to change the status. Please try again.", "error");
      } finally {
        setIsConfirmDisabled(false);
      }
    } else {
      showPopup("No role selected for status toggle.", "warning");
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return date.toLocaleString("en-GB", options).replace(",", "");
  };

  const filteredRoles = roles.filter((role) => {
    const statusText = role.isActive ? 'Active' : 'Inactive';
    const createdOnText = formatDate(role.createdOn);
    const updatedOnText = formatDate(role.updatedOn);

    return (
      (role.role && role.role.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (role.roleCode && role.roleCode.toString().includes(searchTerm)) ||
      statusText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      createdOnText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      updatedOnText.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const sortedRoles = filteredRoles.sort((a, b) => b.isActive - a.isActive);

  const totalItems = sortedRoles.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedRoles = sortedRoles.slice(
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
        <AutoTranslate>Roles</AutoTranslate>
      </h1>

      <div className="bg-white p-4 rounded-lg shadow-sm">

        {popupMessage && (
          <Popup
            message={popupMessage.message}
            type={popupMessage.type}
            onClose={popupMessage.onClose}
          />
        )}

        {/* Form Section with ref */}
        <div ref={formSectionRef} className="mb-4 bg-slate-100 p-2 rounded-lg">
          <div className="flex gap-6">
            <div className="w-4/5 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <label className="block text-md font-medium text-gray-700">
                <AutoTranslate>Role</AutoTranslate> <span className="text-red-500">*</span>
                <input
                  type="text"
                  name="role"
                  placeholder={translatedPlaceholders.enterRole}
                  value={formData.role}
                  onChange={handleInputChange}
                  maxLength={30}
                  className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>

              <label className="block text-md font-medium text-gray-700">
                <AutoTranslate>Role Code</AutoTranslate> <span className="text-red-500 text-sm ml-2 align-middle"><AutoTranslate>(Unique)</AutoTranslate></span>
                <input
                  type="text"
                  name="roleCode"
                  placeholder={translatedPlaceholders.enterRoleCode}
                  value={formData.roleCode}
                  onChange={handleInputsChange}
                  maxLength={3}
                  minLength={3}
                  className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
            </div>

            <div className="w-1/5 flex items-end">
              {editingRoleId === null ? (
                <button
                  onClick={handleAddRole}
                  disabled={isSubmitting}
                  className={`bg-blue-900 text-white rounded-2xl p-2 w-full text-sm flex items-center justify-center ${
                    isSubmitting ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {isSubmitting ? (
                    <AutoTranslate>Adding...</AutoTranslate>
                  ) : (
                    <>
                      <PlusCircleIcon className="h-5 w-5 mr-1" /> <AutoTranslate>Add Role</AutoTranslate>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleSaveEdit}
                  disabled={isSubmitting}
                  className={`bg-blue-900 text-white rounded-2xl p-2 w-full text-sm flex items-center justify-center ${
                    isSubmitting ? "opacity-50 cursor-not-allowed" : ""
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
                <th className="border p-2 text-left"><AutoTranslate>Role</AutoTranslate></th>
                <th className="border p-2 text-left"><AutoTranslate>Role Code</AutoTranslate></th>
                <th className="border p-2 text-left"><AutoTranslate>Created Date</AutoTranslate></th>
                <th className="border p-2 text-left"><AutoTranslate>Updated Date</AutoTranslate></th>
                <th className="border p-2 text-left"><AutoTranslate>Status</AutoTranslate></th>
                <th className="border p-2 text-left"><AutoTranslate>Edit</AutoTranslate></th>
                <th className="border p-2 text-left"><AutoTranslate>Action</AutoTranslate></th>
              </tr>
            </thead>
            <tbody>
              {paginatedRoles.map((role, index) => (
                <tr key={role.id}>
                  <td className="border p-2">{index + 1 + (currentPage - 1) * itemsPerPage}</td>
                  <td className="border p-2">{role.role}</td>
                  <td className="border p-2">{role.roleCode}</td>
                  <td className="border p-2">{formatDate(role.createdOn)}</td>
                  <td className="border p-2">{formatDate(role.updatedOn)}</td>
                  <td className="border p-2">
                    {role.isActive ? 'Active' : 'Inactive'}
                  </td>
                  <td className="border p-2 text-center">
                    <button 
                      onClick={() => handleEditRole(role.id)} 
                      disabled={!role.isActive}
                      className={`${!role.isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <PencilIcon className="h-6 w-6 text-white bg-yellow-400 rounded-xl p-1" />
                    </button>
                  </td>
                  <td className="border p-2 text-center">
                    <button
                      onClick={() => handleToggleActiveStatus(role)}
                      className={`p-1 rounded-full ${role.isActive ? "bg-green-500" : "bg-red-500"}`}
                    >
                      {role.isActive ? (
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
            className={`px-3 py-1 rounded mr-3 ${currentPage === 1 || totalPages === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"}`}
          >
            <ArrowLeftIcon className="inline h-4 w-4 mr-2 mb-1" />
            <AutoTranslate>Previous</AutoTranslate>
          </button>

          {totalPages > 0 && getPageNumbers().map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1 rounded mx-1 ${currentPage === page ? "bg-blue-500 text-white" : "bg-slate-200 hover:bg-blue-100"}`}
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
            className={`px-3 py-1 rounded ml-3 ${currentPage === totalPages || totalPages === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"}`}
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
              <AutoTranslate>Are you sure you want to</AutoTranslate> {roleToToggle?.isActive ?
                <AutoTranslate>deactivate</AutoTranslate> :
                <AutoTranslate>activate</AutoTranslate>} <AutoTranslate>this role</AutoTranslate> <strong>{roleToToggle?.role}</strong>?
            </p>
            <div className="flex justify-end gap-4">
              <button onClick={() => setModalVisible(false)} className="bg-gray-300 p-2 rounded-lg">
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
      )}
    </div>
  );
};

export default Role;