import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API_HOST } from "../API/apiConfig";
import { IoIosArrowForward, IoIosArrowBack } from "react-icons/io";
import { MdRemoveRedEye, MdOutlineClose } from "react-icons/md";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/solid";
import Popup from '../Components/Popup';
import LoadingComponent from '../Components/LoadingComponent';
import AutoTranslate from '../i18n/AutoTranslate';
import { useLanguage } from '../i18n/LanguageContext';
import { getFallbackTranslation } from '../i18n/autoTranslator';
import apiClient from "../API/apiClient";


const EmployeeRole = () => {
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
    branch: 'Branch:',
    department: 'Department:',
    selectRole: 'Select Role'
  });

  // State Management
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [currRoleCode, setCurrRoleCode] = useState("");
  const [popupMessage, setPopupMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [branchData, setBranchData] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");

  const token = localStorage.getItem("tokenKey");

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
          branch: 'Branch:',
          department: 'Department:',
          selectRole: 'Select Role'
        });
        return;
      }

      const searchPlaceholder = await translatePlaceholder('Search...');
      const showPlaceholder = await translatePlaceholder('Show:');
      const branchPlaceholder = await translatePlaceholder('Branch:');
      const departmentPlaceholder = await translatePlaceholder('Department:');
      const selectRolePlaceholder = await translatePlaceholder('Select Role');

      setTranslatedPlaceholders({
        search: searchPlaceholder,
        show: showPlaceholder,
        branch: branchPlaceholder,
        department: departmentPlaceholder,
        selectRole: selectRolePlaceholder
      });
    };

    updatePlaceholders();
  }, [currentLanguage, isTranslationNeeded, translatePlaceholder]);

  // Initial Data Fetching
  useEffect(() => {
    fetchInitialData();
    fetchBranches();
  }, []);

  useEffect(() => {
    if (selectedBranch) {
      fetchDepartments(selectedBranch);
    } else {
      setDepartmentData([]);
    }
  }, [selectedBranch]);

  const fetchBranches = async () => {
    try {
      const token = localStorage.getItem("tokenKey");
      const response = await apiClient.get(`${API_HOST}/branchmaster/findActiveRole`);
      setBranchData(response.data);
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  };

  const fetchDepartments = async (branchId) => {
    try {
      const token = localStorage.getItem("tokenKey");
      const response = await apiClient.get(`${API_HOST}/DepartmentMaster/findByBranch/${branchId}`);
      setDepartmentData(response.data);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const fetchInitialData = async () => {
    await Promise.all([fetchUsers(), fetchEmployees()]);
  };

  const fetchUsers = async () => {
    setIsLoading(true);

    try {
      const response = await apiClient.get(`${API_HOST}/employee/pending-by-branch`);
      setUsers(response.data);
    } catch (error) {
      showPopup("Error fetching users. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmployees = async () => {
    setIsLoading(true);

    try {
      const userId = localStorage.getItem("id");
      const response = await apiClient.get(`${API_HOST}/employee/findById/${userId}`);
      setCurrRoleCode(response.data.role.roleCode);
    } catch (error) {
      showPopup("Error fetching employee details.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch roles when currRoleCode is available
  useEffect(() => {
    if (currRoleCode) {
      fetchRoles();
    }
  }, [currRoleCode]);

  const fetchRoles = async () => {
    try {
      const response = await apiClient.get(`${API_HOST}/RoleMaster/findActiveRole`);
      const filteredRoles = response.data.filter(role => role.roleCode < currRoleCode);
      setRoles(filteredRoles);
    } catch (error) {
      showPopup("Error fetching roles. Please try again.", "error");
    }
  };

  // Event Handlers
  const handleRoleChange = (userId, newRole) => {
    setSelectedUser(userId);
    setSelectedRole(newRole);
    setModalVisible(true);
  };

  const confirmRoleAssignment = async () => {
    setIsSubmitting(true);
    try {
      await apiClient.put(
        `${API_HOST}/employee/${selectedUser}/role`,
        { roleName: selectedRole },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      showPopup("Role assigned successfully!", "success");
      await fetchUsers();
      setModalVisible(false);
      setSelectedUser(null);
      setSelectedRole("");
    } catch (error) {
      let errorMessage = "An unexpected error occurred while updating the role.";
      if (error.response?.data) {
        if (error.response.data.includes("Employee with ID")) {
          errorMessage = "Employee Not Found";
        } else if (error.response.data.includes("Role with ID")) {
          errorMessage = "Role Not Found";
        } else if (error.response.data.includes("already an admin")) {
          errorMessage = "There is already an admin assigned to this department.";
        } else {
          errorMessage = error.response.data;
        }
      }
      showPopup(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingComponent />;
  }

  // Utility Functions
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
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Filtering and Pagination
  const filteredUsers = users.filter((user) => {
    // --- Apply Branch Filter ---
    if (selectedBranch && String(user.branch?.id) !== String(selectedBranch)) {
      return false;
    }

    // --- Apply Department Filter ---
    if (selectedDepartment && String(user.department?.id) !== String(selectedDepartment)) {
      return false;
    }

    // --- Apply Search Filter ---
    const searchFields = {
      name: user.name?.toLowerCase() || "",
      email: user.email?.toLowerCase() || "",
      mobile: user.mobile?.toLowerCase() || "",
      branch: user.branch?.name?.toLowerCase() || "",
      department: user.department?.name?.toLowerCase() || "",
      createdBy: user.createdBy?.name?.toLowerCase() || "",
      role: user.role?.toLowerCase() || "",
      createdOn: user.createdOn ? formatDate(user.createdOn).toLowerCase() : ""
    };

    const lowerSearchTerm = searchTerm.toLowerCase();
    return Object.values(searchFields).some((value) =>
      value.includes(lowerSearchTerm)
    );
  });

  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
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
        <h1><AutoTranslate>Pending Users</AutoTranslate></h1>
      </div>

      <div className="card">

        {/* Search and Items Per Page Controls */}
        <div className="grid grid-col-4 mb-6">
          {/* Items Per Page */}
          <div className="form-group ">
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

          {/* Branch Filter */}
          <div className="form-group ">
            <label htmlFor="branchFilter">
              <AutoTranslate>Branch</AutoTranslate>
            </label>
            <select
              id="branchFilter"
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                setSelectedDepartment(""); // reset department when branch changes
                setCurrentPage(1);
              }}
            >
              <option value=""><AutoTranslate>All</AutoTranslate></option>
              {branchData.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div className="form-group ">
            <label htmlFor="departmentFilter">
              <AutoTranslate>Department</AutoTranslate>
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => {
                setSelectedDepartment(e.target.value);
                setCurrentPage(1);
              }}
              disabled={!selectedBranch}
            >
              <option value=""><AutoTranslate>All</AutoTranslate></option>
              {departmentData.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="form-group ">
            <label htmlFor="searchId">
              <AutoTranslate>Search</AutoTranslate>
            </label>
            <input
              type="text"
              id="searchId"
              placeholder={translatedPlaceholders.search}
              className="searchIcon"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="table-wrapper">
          <table className="">
            <thead>
              <tr>
                <th className="text-center"><AutoTranslate>SN</AutoTranslate></th>
                <th><AutoTranslate>Name</AutoTranslate></th>
                <th><AutoTranslate>Email</AutoTranslate></th>
                <th><AutoTranslate>Mobile No.</AutoTranslate></th>
                <th><AutoTranslate>Branch</AutoTranslate></th>
                <th><AutoTranslate>Department</AutoTranslate></th>
                <th><AutoTranslate>Created Date</AutoTranslate></th>
                <th><AutoTranslate>CreatedBy</AutoTranslate></th>
                <th><AutoTranslate>Role</AutoTranslate></th>
                <th className="text-center"><AutoTranslate>Assign Role</AutoTranslate></th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((user, index) => (
                  <tr key={user.id}>
                    <td className="text-center">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.mobile}</td>
                    <td>{user.branch?.name || "N/A"}</td>
                    <td>{user.department?.name || "N/A"}</td>
                    <td>{formatDate(user.createdOn)}</td>
                    <td>{user.createdBy.name}</td>
                    <td>{user.employeeType || <AutoTranslate>No Role</AutoTranslate>}</td>
                    <td>
                      <div className="form-group flex justify-center">
                        <select value={selectedUser === user.id ? selectedRole : ""} onChange={(e) => handleRoleChange(user.id, e.target.value)}>
                          <option value="" disabled><AutoTranslate>Select Role</AutoTranslate></option>
                          {roles.map((role) => (
                            <option key={role.id} value={role.role}>
                              {role.role}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="border p-2 text-center">
                    <AutoTranslate>No users found.</AutoTranslate>
                  </td>
                </tr>
              )}
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


        {/* Confirmation Modal */}
        {modalVisible && (
          <div className="overlayModal">
            <div className="document-modal modal-sm">
              {/* Header */}
              <div className="modal-header">
                <div className="modal-title">
                  <h2><AutoTranslate>Confirm Role Assignment</AutoTranslate></h2>
                </div>
                <div className="headerRight">
                  {/* Close Button */}
                  <button className="closeBtn" onClick={() => setModalVisible(false)} disabled={isSubmitting} title="Close">
                    <MdOutlineClose />
                  </button>
                </div>
              </div>
              <div className="modal-body">
                <div className="bodyScroller print:overflow-visible print:max-h-none">
                  <p className="mb-4">
                    <AutoTranslate>
                      Are you sure you want to assign the role {selectedRole} to {users.find((user) => user.id === selectedUser)?.name}?
                    </AutoTranslate>
                  </p>
                  <div className="flex justify-end gap-4">
                    <button
                      onClick={() => setModalVisible(false)}
                      className="btn-cancel"
                      disabled={isSubmitting}
                    >
                      <AutoTranslate>Cancel</AutoTranslate>
                    </button>
                    <button
                      onClick={confirmRoleAssignment}
                      className={`btn-primary ${isSubmitting ? "bg-gray-400 cursor-not-allowed" : ""}`}
                      disabled={isSubmitting}>
                      {isSubmitting ? <AutoTranslate>Processing...</AutoTranslate> : <AutoTranslate>Confirm</AutoTranslate>}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Popup Messages */}
        {popupMessage && (
          <Popup
            message={popupMessage.message}
            type={popupMessage.type}
            onClose={popupMessage.onClose}
          />
        )}
      </div>
    </div>
  );
};

export default EmployeeRole;