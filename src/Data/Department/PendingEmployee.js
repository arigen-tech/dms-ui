import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API_HOST } from "../../API/apiConfig";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/solid";
import Popup from '../../Components/Popup';
import { useLocation } from 'react-router-dom';
import LoadingComponent from "../../Components/LoadingComponent";
import AutoTranslate from '../../i18n/AutoTranslate';
import { useLanguage } from '../../i18n/LanguageContext';
import { getFallbackTranslation } from '../../i18n/autoTranslator';

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
  const [highlightedUserId, setHighlightedUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [branchData, setBranchData] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");

  const location = useLocation();
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

  useEffect(() => {
    fetchUsers();
    fetchEmployees();
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
      const response = await axios.get(`${API_HOST}/branchmaster/findActiveRole`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBranchData(response.data);
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  };

  const fetchDepartments = async (branchId) => {
    try {
      const token = localStorage.getItem("tokenKey");
      const response = await axios.get(
        `${API_HOST}/DepartmentMaster/findByBranch/${branchId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setDepartmentData(response.data);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  useEffect(() => {
    // Check if there's a user ID passed from notification
    const searchParams = new URLSearchParams(location.search);
    const notificationUserId = searchParams.get('userId');

    if (notificationUserId && users.length > 0) {
      const filteredUsers = users.filter((user) =>
        Object.entries(user).some(([key, value]) => {
          if (key === "id") {
            return value.toString() === notificationUserId;
          }
          return false;
        })
      );

      if (filteredUsers.length > 0) {
        const highlightId = parseInt(notificationUserId);
        setHighlightedUserId(highlightId);

        // Find and set the correct page
        const pageForUser = findPageForUser(highlightId);
        setCurrentPage(pageForUser);
      }
    }
  }, [location.search, users, itemsPerPage]);

  const findPageForUser = (userId) => {
    const userIndex = filteredUsers.findIndex(user => user.id === userId);
    if (userIndex !== -1) {
      return Math.ceil((userIndex + 1) / itemsPerPage);
    }
    return 1;
  };


  const fetchUsers = async () => {
    setIsLoading(true);

    try {
      const response = await axios.get(
        `${API_HOST}/employee/pending-by-department`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setUsers(response.data);
    } catch (error) {
      showPopup("Error fetching users. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      setIsLoading(true);

      const userId = localStorage.getItem("userId");
      const userResponse = await axios.get(
        `${API_HOST}/employee/findById/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setCurrRoleCode(userResponse.data.role.roleCode);
    } catch (error) {
      showPopup("Error fetching employee details.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currRoleCode) {
      fetchRoles();
    }
  }, [currRoleCode]);

  const fetchRoles = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(
        `${API_HOST}/RoleMaster/findActiveRole`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const filteredRoles = response.data.filter((role) => role.roleCode < currRoleCode);
      setRoles(filteredRoles);
    } catch (error) {
      showPopup("Error fetching roles. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = (userId, newRole) => {
    setSelectedUser(userId);
    setSelectedRole(newRole);
    setModalVisible(true);
  };

  const confirmRoleAssignment = async () => {
    setIsSubmitting(true);
    try {
      const response = await axios.put(
        `${API_HOST}/employee/${selectedUser}/role`,
        { roleName: selectedRole },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      showPopup("Role assigned successfully!", "success");
      console.log('Role assignment response:', response.data);
      fetchUsers();
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

  const handlePopupClose = () => {
    setPopupMessage(null);
    // This will refresh the entire page
  };

  const showPopup = (message, type = 'info') => {
    setPopupMessage({
      message,
      type,
      onClose: handlePopupClose // Pass the close handler to the popup
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

  if (isLoading) {
    return <LoadingComponent />;
  }

  return (
    <div className="px-2">
      <h1 className="text-2xl mb-1 font-semibold">
        <AutoTranslate>Pending Users</AutoTranslate>
      </h1>
      <div className="bg-white p-4 rounded-lg shadow-sm">
        {/* Header Controls */}
        <div className="mb-4 bg-slate-100 p-4 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Items Per Page (50%) */}
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

          {/* Branch Filter */}
          <div className="flex items-center bg-blue-500 rounded-lg w-full flex-1 md:w-1/4">
            <label htmlFor="branchFilter" className="mr-2 ml-2 text-white text-sm">
              <AutoTranslate>Branch</AutoTranslate>
            </label>
            <select
              id="branchFilter"
              className="border rounded-r-lg p-1.5 outline-none w-full"
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
          <div className="flex items-center bg-blue-500 rounded-lg w-full flex-1 md:w-1/4">
            <label htmlFor="departmentFilter" className="mr-2 ml-2 text-white text-sm">
              <AutoTranslate>Department</AutoTranslate>
            </label>
            <select
              id="departmentFilter"
              className="border rounded-r-lg p-1.5 outline-none w-full"
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
          <div className="flex items-center w-full md:w-1/4 flex-1">
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

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-slate-100">
                <th className="border p-2 text-left"><AutoTranslate>SN</AutoTranslate></th>
                <th className="border p-2 text-left"><AutoTranslate>Name</AutoTranslate></th>
                <th className="border p-2 text-left"><AutoTranslate>Email</AutoTranslate></th>
                <th className="border p-2 text-left"><AutoTranslate>Mobile No.</AutoTranslate></th>
                <th className="border p-2 text-left"><AutoTranslate>Branch</AutoTranslate></th>
                <th className="border p-2 text-left"><AutoTranslate>Department</AutoTranslate></th>
                <th className="border p-2 text-left"><AutoTranslate>Created Date</AutoTranslate></th>
                <th className="border p-2 text-left"><AutoTranslate>CreatedBy</AutoTranslate></th>
                <th className="border p-2 text-left"><AutoTranslate>Role</AutoTranslate></th>
                <th className="border p-2 text-left"><AutoTranslate>Assign Role</AutoTranslate></th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((user, index) => (
                  <tr
                    key={user.id}
                    className={`${user.id === highlightedUserId ? 'bg-yellow-100' : ''}`}
                  >
                    <td className="border p-2">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td className="border p-2">{user.name}</td>
                    <td className="border p-2">{user.email}</td>
                    <td className="border p-2">{user.mobile}</td>
                    <td className="border p-2">{user.branch?.name || "N/A"}</td>
                    <td className="border p-2">{user.department?.name || "N/A"}</td>
                    <td className="border p-2">{formatDate(user.createdOn)}</td>
                    <td className="border p-2">{user.createdBy.name}</td>
                    <td className="border p-2">{user.employeeType || <AutoTranslate>No Role</AutoTranslate>}</td>
                    <td className="border p-2">
                      <select
                        value={selectedUser === user.id ? selectedRole : ""}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="w-full p-1 border rounded"
                      >
                        <option value="" disabled><AutoTranslate>Select Role</AutoTranslate></option>
                        {roles.map((role) => (
                          <option key={role.id} value={role.role}>
                            {role.role}
                          </option>
                        ))}
                      </select>
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
        <div className="flex items-center mt-4">
          {/* Previous Button */}
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1 || totalPages === 0}
            className={`px-3 py-1 rounded mr-3 ${currentPage === 1 || totalPages === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"
              }`}
          >
            <ArrowLeftIcon className="inline h-4 w-4 mr-2 mb-1" />
            <AutoTranslate>Previous</AutoTranslate>
          </button>

          {/* Page Number Buttons */}
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

          {/* Page Count Info */}
          <span className="text-sm text-gray-700 mx-2">
            <AutoTranslate>of</AutoTranslate> {totalPages} <AutoTranslate>pages</AutoTranslate>
          </span>

          {/* Next Button */}
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
                {`Showing ${totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to ${Math.min(currentPage * itemsPerPage, totalItems)} of ${totalItems} entries`}
              </AutoTranslate>
            </span>
          </div>
        </div>

        {/* Confirmation Modal */}
        {modalVisible && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h2 className="text-lg font-semibold mb-4">
                <AutoTranslate>Confirm Role Assignment</AutoTranslate>
              </h2>
              <p className="mb-4">
                <AutoTranslate>Are you sure you want to assign the role</AutoTranslate>{" "}
                <strong>{selectedRole}</strong> <AutoTranslate>to</AutoTranslate>{" "}
                <strong>{users.find((user) => user.id === selectedUser)?.name}</strong>?
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setModalVisible(false)}
                  className="bg-gray-300 p-2 rounded-lg hover:bg-gray-400"
                  disabled={isSubmitting}
                >
                  <AutoTranslate>Cancel</AutoTranslate>
                </button>
                <button
                  onClick={confirmRoleAssignment}
                  className={`${isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"
                    } text-white p-2 rounded-lg`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <AutoTranslate>Processing...</AutoTranslate> : <AutoTranslate>Confirm</AutoTranslate>}
                </button>
              </div>
            </div>
          </div>
        )}

        {popupMessage && (
          <Popup
            message={popupMessage.message}
            type={popupMessage.type}
            onClose={handlePopupClose}
          />
        )}
      </div>
    </div>
  );
};

export default EmployeeRole;