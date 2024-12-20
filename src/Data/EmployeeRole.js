import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_HOST } from "../API/apiConfig";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/solid";
import Popup from '../Components/Popup';

const EmployeeRole = () => {
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

  const token = localStorage.getItem("tokenKey");

  // Initial Data Fetching
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    await Promise.all([fetchUsers(), fetchEmployees()]);
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_HOST}/employee/pending-by-department`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(response.data);
    } catch (error) {
      showPopup("Error fetching users. Please try again.", "error");
    }
  };

  const fetchEmployees = async () => {
    try {
      const userId = localStorage.getItem("userId");
      const response = await axios.get(`${API_HOST}/employee/findById/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCurrRoleCode(response.data.role.roleCode);
    } catch (error) {
      showPopup("Error fetching employee details.", "error");
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
      const response = await axios.get(`${API_HOST}/RoleMaster/findActiveRole`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
      await axios.put(
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

  // Utility Functions
  const showPopup = (message, type = 'info') => {
    setPopupMessage({
      message,
      type,
      onClose: () => {
        setPopupMessage(null);
        window.location.reload();
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
    const searchFields = {
      name: user.name?.toLowerCase() || "",
      email: user.email?.toLowerCase() || "",
      mobile: user.mobile?.toLowerCase() || "",
      branch: user.branch?.name?.toLowerCase() || "n/a",
      department: user.department?.name?.toLowerCase() || "n/a",
      createdBy: user.createdBy?.name?.toLowerCase() || "unknown",
      role: user.employeeType?.toLowerCase() || "no role",
      createdOn: user.createdOn ? formatDate(user.createdOn).toLowerCase() : ""
    };

    const lowerSearchTerm = searchTerm.toLowerCase();
    return Object.values(searchFields).some(value => value.includes(lowerSearchTerm));
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
    <div className="p-1">
      <h1 className="text-xl mb-4 font-semibold">Pending Users</h1>
      <div className="bg-white p-3 rounded-lg shadow-sm">
        {/* Search and Items Per Page Controls */}
        <div className="mb-4 bg-slate-100 p-4 rounded-lg flex justify-between items-center">
          <div className="flex items-center bg-blue-500 rounded-lg">
            <label htmlFor="itemsPerPage" className="mr-2 ml-2 text-white text-sm">
              Show:
            </label>
            <select
              id="itemsPerPage"
              className="border rounded-r-lg p-1.5 outline-none"
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
          <div className="flex items-center">
            <input
              type="text"
              placeholder="Search..."
              className="border rounded-l-md p-1 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <MagnifyingGlassIcon className="text-white bg-blue-500 rounded-r-lg h-8 w-8 border p-1.5" />
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-slate-100">
                <th className="border p-2 text-left">SR.</th>
                <th className="border p-2 text-left">Name</th>
                <th className="border p-2 text-left">Email</th>
                <th className="border p-2 text-left">Mobile No.</th>
                <th className="border p-2 text-left">Branch</th>
                <th className="border p-2 text-left">Department</th>
                <th className="border p-2 text-left">Created Date</th>
                <th className="border p-2 text-left">Created By</th>
                <th className="border p-2 text-left">Role</th>
                <th className="border p-2 text-left">Assign Role</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((user, index) => (
                  <tr key={user.id}>
                    <td className="border p-2">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td className="border p-2">{user.name}</td>
                    <td className="border p-2">{user.email}</td>
                    <td className="border p-2">{user.mobile}</td>
                    <td className="border p-2">{user.branch?.name || "N/A"}</td>
                    <td className="border p-2">{user.department?.name || "N/A"}</td>
                    <td className="border p-2">{formatDate(user.createdOn)}</td>
                    <td className="border p-2">{user.createdBy.name}</td>
                    <td className="border p-2">{user.employeeType || "No Role"}</td>
                    <td className="border p-2">
                      <select
                        value={selectedUser === user.id ? selectedRole : ""}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="w-full p-1 border rounded"
                      >
                        <option value="" disabled>Select Role</option>
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
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex justify-between items-center mt-4">
          <div>
            <span className="text-sm text-gray-700">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
            </span>
          </div>
          <div className="flex items-center">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded mr-3 ${currentPage === 1
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-slate-200 hover:bg-slate-300"
                }`}
            >
              <ArrowLeftIcon className="inline h-4 w-4 mr-2 mb-1" />
              Previous
            </button>

            {getPageNumbers().map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 rounded mx-1 ${currentPage === page
                  ? "bg-blue-500 text-white"
                  : "bg-slate-200 hover:bg-blue-100"
                  }`}
              >
                {page}
              </button>
            ))}

            <span className="text-sm text-gray-700 mx-2">
              of {totalPages} pages
            </span>

            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 rounded ml-3 ${currentPage === totalPages
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-slate-200 hover:bg-slate-300"
                }`}
            >
              Next
              <ArrowRightIcon className="inline h-4 w-4 ml-2 mb-1" />
            </button>
          </div>
        </div>

        {/* Confirmation Modal */}
        {modalVisible && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h2 className="text-lg font-semibold mb-4">Confirm Role Assignment</h2>
              <p className="mb-4">
                Are you sure you want to assign the role <strong>{selectedRole}</strong> to{" "}
                <strong>{users.find((user) => user.id === selectedUser)?.name}</strong>?
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setModalVisible(false)}
                  className="bg-gray-300 p-2 rounded-lg hover:bg-gray-400"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRoleAssignment}
                  className={`${isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"
                    } text-white p-2 rounded-lg`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Processing..." : "Confirm"}
                </button>
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