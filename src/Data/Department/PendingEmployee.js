import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_HOST } from "../../API/apiConfig";
import {
  ArrowLeftIcon,
  ArrowRightIcon,

  MagnifyingGlassIcon,

} from "@heroicons/react/24/solid";

const EmployeeRole = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);

 const [currRoleCode, setCurrRoleCode] = useState("");

  const token = localStorage.getItem("tokenKey");



  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
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
      console.error("Error fetching users:", error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const userId = localStorage.getItem("userId");

      // Fetch user details
      const userResponse = await axios.get(
        `${API_HOST}/employee/findById/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("user response",userResponse.data);

      setCurrRoleCode(userResponse.data.role.roleCode);

    } catch (error) {
      
    }
  };
  useEffect(() => {
    if (currRoleCode) {
      fetchRoles();
    }
  }, [currRoleCode]);

  const fetchRoles = async () => {
    try {
      const response = await axios.get(
        `${API_HOST}/RoleMaster/findActiveRole`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log( "befor filter role",response.data);
  
      // Filter roles based on roleCode
      const filteredRoles = response.data.filter((role) => role.roleCode < currRoleCode);
      setRoles(filteredRoles);
      console.log("Filtered roles:", filteredRoles);
      
    } catch (error) {
      console.error("Error fetching roles:", error);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

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
      setSuccessMessage(response.data);
      fetchUsers();
      setModalVisible(false);
      setSelectedUser(null);
      setSelectedRole("");
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (error) {
      if (error.response && error.response.data) {
        const backendMessage = error.response.data;
        if (backendMessage.includes("Employee with ID")) {
          setErrorMessage("Employee Not Found");
        } else if (backendMessage.includes("Role with ID")) {
          setErrorMessage("Role Not Found");
        } else if (backendMessage.includes("already an admin")) {
          setErrorMessage("There is already an admin assigned to this department.");
        } else {
          setErrorMessage(`Error: ${backendMessage}`);
        }
      } else {
        setErrorMessage(
          "An unexpected error occurred while updating the role. Please try again."
        );
      }
      setTimeout(() => setErrorMessage(""), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    };
    return date.toLocaleDateString("en-GB", options);
  };

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="p-1">
      <h1 className="text-xl mb-4 font-semibold">Pending Users</h1>
      <div className="bg-white p-3 rounded-lg shadow-sm">
      <div className="mb-4 bg-slate-100 p-4 rounded-lg flex justify-between items-center">


          <div className="flex items-center bg-blue-500 rounded-lg">
            <label
              htmlFor="itemsPerPage"
              className="mr-2 ml-2 text-white text-sm"
            >
              Show:
            </label>
            <select
              id="itemsPerPage"
              className="border rounded-r-lg p-1.5 outline-none"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value)); // Update items per page
                setCurrentPage(1); // Reset to the first page
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
              {users.length > 0 ? (
                users.map((user, index) => (
                  <tr key={user.id}>
                    <td className="border p-2">{index + 1}</td>
                    <td className="border p-2">{user.name}</td>
                    <td className="border p-2">{user.email}</td>
                    <td className="border p-2">{user.mobile}</td>
                    <td className="border p-2">{user.branch?.name || "N/A"}</td>
                    <td className="border p-2">
                      {user.department?.name || "N/A"}
                    </td>
                    <td className="border p-2">{formatDate(user.createdOn)}</td>
                    <td className="border p-2">
                      {user.createdBy.name}
                    </td>
                    <td className="border p-2">
                      {user.employeeType || "No Role"}
                    </td>
                    <td className="border p-2">
                      <select
                        value={selectedUser === user.id ? selectedRole : ""}
                        onChange={(e) =>
                          handleRoleChange(user.id, e.target.value)
                        }
                      >
                        <option value="" disabled>
                          Select Role
                        </option>
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
        <div className="flex justify-between items-center mt-4">
          <div>
            <span className="text-sm text-gray-700">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, totalItems)} of{" "}
              {totalItems} entries
            </span>
          </div>
          <div className="flex items-center">
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.max(prev - 1, 1))
              }
              disabled={currentPage === 1}
              className="bg-slate-200 px-3 py-1 rounded mr-3"
            >
              <ArrowLeftIcon className="inline h-4 w-4 mr-2 mb-1" />
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="bg-slate-200 px-3 py-1 rounded ml-3"
            >
              Next
              <ArrowRightIcon className="inline h-4 w-4 ml-2 mb-1" />
            </button>
          </div>
        </div>

        {modalVisible && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h2 className="text-lg font-semibold mb-4">Confirm Role Assignment</h2>
              {successMessage && (
                <p className="text-green-600 mb-4">{successMessage}</p>
              )}
              {errorMessage && (
                <p className="text-red-600 mb-4">{errorMessage}</p>
              )}
              <p className="mb-4">
                Are you sure you want to assign the role{" "}
                <strong>{selectedRole}</strong> to{" "}
                <strong>
                  {users.find((user) => user.id === selectedUser)?.name}
                </strong>
                ?
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => {
                    setModalVisible(false);
                    setErrorMessage("");
                    setSuccessMessage("");
                  }}
                  className="bg-gray-300 p-2 rounded-lg"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRoleAssignment}
                  className={`${isSubmitting
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-500"
                    } text-white p-2 rounded-lg`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Processing..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeRole;
