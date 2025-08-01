import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_HOST, ROLE_API, BRANCH_ADMIN } from "../API/apiConfig";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
  LockClosedIcon,
  LockOpenIcon,
  PencilIcon,
} from "@heroicons/react/24/solid";
import Popup from "../Components/Popup";
import LoadingComponent from '../Components/LoadingComponent';


const ManageUserRole = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [empId, setEmpId] = useState(null); // For editing role
  const [role, setRole] = useState(""); // Role input field
  const [newRole, setNewRole] = useState("");
  const [availableRoles, setAvailableRoles] = useState([]);
  const [allRoles, setAllRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [showAvailableRoles, setShowAvailableRoles] = useState(false); // State to show dropdown
  const [roleByEmp, setRoleByEmp] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [roleToToggle, setRoleToToggle] = useState(null);
  const [popupMessage, setPopupMessage] = useState(null);
  const [roles, setRoles] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(false);
  const [currBranchId, setCurrBranchId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmDisabled, setIsConfirmDisabled] = useState(false);
  const token = localStorage.getItem("tokenKey");
  const [loading, setLoading] = useState(false);
  const employeId = localStorage.getItem("userId");
  const loginEmpRole = localStorage.getItem("role");


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



  useEffect(() => {
    fetchLoginEmployees();
  }, []);

  useEffect(() => {
    if (selectedUser && selectedUser.employeeRoles) {
      setRoleByEmp(selectedUser.employeeRoles);
    }
  }, [selectedUser]);

  useEffect(() => {
    const matchedRoleIds = new Set(roleByEmp.map((role) => role.roleId));
    const remainingRoles = allRoles.filter(
      (role) => !matchedRoleIds.has(role.id)
    );

    setAvailableRoles(remainingRoles);
  }, [allRoles, roleByEmp, refreshTrigger]);

  const fetchLoginEmployees = async () => {
    try {
      // Fetch user details by employee ID
      const userResponse = await axios.get(
        `${API_HOST}/employee/findById/${employeId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Log the fetched data
      console.log("User response:", userResponse.data);

      if (userResponse.data?.role?.roleCode) {
        fetchAvailableRolesForUser(userResponse.data?.role?.roleCode);
        console.log("Available roles fetched for user:", userResponse.data?.role?.roleCode);
      }
      // Set current branch ID if available
      if (userResponse.data?.branch?.id) {
        setCurrBranchId(userResponse.data.branch.id);
      } else {
        console.error("Branch ID not found in user data.");
      }
    } catch (error) {
      console.error(
        "Error fetching user details:",
        error.response?.data || error.message
      );
    }
  };



  const fetchUsers = async () => {
    console.log("currBranchId:", currBranchId);

    setLoading(true);
    try {
      let response; // Declare response variable here

      if (loginEmpRole === BRANCH_ADMIN && currBranchId) {
        // Fetch branch-specific users
        response = await axios.get(
          `${API_HOST}/api/EmpRole/branch/${currBranchId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        // Fetch all employees
        response = await axios.get(`${API_HOST}/api/EmpRole/employees`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      // Check the response status
      if (response?.status === 200) {

        setUsers(response.data); // Store the users in the state
        console.log("Fetched users:", response.data);
      } else {
        console.log("Failed to fetch users. Please try again later.");
      }
    } catch (error) {
      console.log(
        "Error fetching users. Check your connection or contact support."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loginEmpRole === BRANCH_ADMIN) {
      fetchLoginEmployees().then(() => {
        if (currBranchId) fetchUsers();
      });
    } else {
      fetchUsers();
    }
  }, [loginEmpRole, currBranchId]);

  const fetchAvailableRolesForUser = async (userRoleCode) => {

    try {
      const rolesResponse = await axios.get(`${ROLE_API}/findAll`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const filteredRoles = rolesResponse.data.filter(
        (role) => role.roleCode < userRoleCode
      );

      setAllRoles(filteredRoles);
    } catch (error) {
      console.error("Error fetching available roles for user:", error);
    }
  };



  const HandleEditRole = async (user) => {
    console.log("USer Name being sent:", user);

    setSelectedUser(user);
    setRole(user.roleName || "");
    setEmpId(user.employeeId);
  };

  const handleAddButtonClick = () => {
    // fetchAvailableRolesForUser();
    setShowAvailableRoles(true);
  };

  const addSelectedRole = async () => {
    if (!selectedRole) {
      showPopup("Please select a role before adding.");
      return;
    }

    if (!selectedUser) {
      showPopup("Please select a user before adding.");
      return;
    }

    console.log("Selected Role:", selectedRole);

    try {
      if (!token) {
        showPopup("User is not authenticated. Please log in again.");
        return;
      }

      setIsLoading(true); // Disable button when action starts

      // Send API request to add the selected role
      const response = await axios.put(
        `${API_HOST}/employee/${selectedUser.employeeId}/role`, // API endpoint
        { roleName: selectedRole }, // Request payload
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200) {
        const updatedEmployeeRoles = response.data.employeeRoles;

        setSelectedUser((prevUser) => ({
          ...prevUser,
          employeeRoles: updatedEmployeeRoles,
        }));

        setSelectedRole("");
        setShowAvailableRoles(false);
        showPopup("Role added successfully!", "success");
        fetchUsers();
      } else {
        showPopup("Failed to add the role. Please try again.");
      }
    } catch (error) {
      console.error(
        "Error adding selected role:",
        error.response ? error.response.data : error.message
      );

      // Check if backend error contains more details
      if (error.response && error.response.data) {
        console.error("Backend Error:", error.response.data);
        showPopup(
          `Backend Error: ${error.response.data.message || "Unknown error"}`
        );
      } else {
        showPopup("An error occurred while adding the role. Please try again.");
      }
    } finally {
      setIsLoading(false); // Re-enable button when action completes
    }
  };

  const handleToggleActiveStatus = (role) => {
    setRoleToToggle(role); // Set the role to be toggled
    setModalVisible(true); // Show the confirmation modal
  };

  const confirmToggleActiveStatus = async () => {
    setIsConfirmDisabled(true);

    if (!roleToToggle) {
      showPopup("No role selected for status change.");
      return;
    }

    try {
      const updatedRoleRequest = {
        status: !roleToToggle.active,
        roleId: roleToToggle.roleId,
        empId: empId,
      };

      const response = await axios.put(
        `${API_HOST}/api/EmpRole/changeRoleStatus`,
        updatedRoleRequest,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200) {
        const updatedRoles = roles.map((role) =>
          role.id === roleToToggle.id
            ? { ...role, active: updatedRoleRequest.status }
            : role
        );
        setRoles(updatedRoles);
        setModalVisible(false);
        setIsConfirmDisabled(false);
        setRoleToToggle(null);
        showPopup("Role status updated successfully!", "success"); // Change here
        fetchUsers();
      } else {
        showPopup("Failed to update the role status. Please try again.");
      }
    } catch (error) {
      console.error(
        "Error toggling role status:",
        error.response ? error.response.data : error.message
      );
      showPopup(
        error.response?.data?.message || "An error occurred. Please try again."
      );
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
    Object.values(user)
      .some((value) =>
        value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
  );

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

  if (loading) {
    return <LoadingComponent />;
  }

  return (
    <div className="px-2 ">
      <h1 className="text-2xl mb-1 font-semibold">Manage Employee Roles</h1>
      <div className="bg-white p-4 rounded-lg shadow-sm">
        {popupMessage && (
          <Popup
            message={popupMessage.message}
            type={popupMessage.type}
            onClose={popupMessage.onClose}
          />
        )}
        <div className="mb-4 bg-slate-100 p-4 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Items Per Page (50%) */}
          <div className="flex items-center bg-blue-500 rounded-lg w-full flex-1 md:w-1/2">
            <label
              htmlFor="itemsPerPage"
              className="mr-2 ml-2 text-white text-sm"
            >
              Show:
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

          {/* Search Input (Remaining Space) */}
          <div className="flex items-center w-full md:w-auto flex-1">
            <input
              type="text"
              placeholder="Search..."
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
                <th className="border p-2 text-left">SR.</th>
                <th className="border p-2 text-left">Name</th>
                <th className="border p-2 text-left">Email</th>
                <th className="border p-2 text-left">Mobile No.</th>
                <th className="border p-2 text-left">Branch</th>
                <th className="border p-2 text-left">Department</th>
                <th className="border p-2 text-left">Created By</th>
                <th className="border p-2 text-left">Updated By</th>
                <th className="border p-2 text-left">Created Date</th>
                <th className="border p-2 text-left">Updated Date</th>
                <th className="border p-2 text-left">Role</th>
                <th className="border p-2 text-left">Manage Role</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((user, index) => (
                  <tr key={user.id}>
                    <td className="border p-2">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="border p-2">{user?.name || "N/A"}</td>
                    <td className="border p-2">{user?.email || "N/A"}</td>
                    <td className="border p-2">{user?.mobile || "N/A"}</td>
                    <td className="border p-2">{user.branchName || "N/A"}</td>
                    <td className="border p-2">
                      {user.departmentName || "N/A"}
                    </td>
                    <td className="border p-2">
                      {user.createdByName || "N/A"}
                    </td>
                    <td className="border p-2">
                      {user.updatedByName || "N/A"}
                    </td>
                    <td className="border p-2">
                      {user?.createdOn ? formatDate(user.createdOn) : "N/A"}
                    </td>
                    <td className="border p-2">
                      {user?.updatedOn ? formatDate(user.updatedOn) : "N/A"}
                    </td>
                    <td className="border p-2">{user.roleName || "No Role"}</td>
                    <td className="border p-2">
                      <button onClick={() => HandleEditRole(user)}>
                        <PencilIcon className="h-6 w-6 text-white bg-yellow-400 rounded-xl p-1" />
                      </button>
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
        <div className="flex items-center mt-4">
          {/* Previous Button */}
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1 || totalPages === 0}
            className={`px-3 py-1 rounded mr-3 ${currentPage === 1 || totalPages === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"
              }`}
          >
            <ArrowLeftIcon className="inline h-4 w-4 mr-2 mb-1" />
            Previous
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
          <span className="text-sm text-gray-700 mx-2">of {totalPages} pages</span>

          {/* Next Button */}
          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages || totalPages === 0}
            className={`px-3 py-1 rounded ml-3 ${currentPage === totalPages || totalPages === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"
              }`}
          >
            Next
            <ArrowRightIcon className="inline h-4 w-4 ml-2 mb-1" />
          </button>
          <div className="ml-4">
            <span className="text-sm text-gray-700">
              Showing {totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{" "}
              {Math.min(currentPage * itemsPerPage, totalItems)} of{" "}
              {totalItems} entries
            </span>
          </div>
        </div>
      </div>

      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center ">
          <div className="bg-white rounded-xl shadow-lg p-6 w-[95%] max-w-md max-h-[90vh] overflow-y-auto">
            
            <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Update User Roles</h2>

            {/* User Info */}
            <div className="space-y-1 text-md text-gray-800 mb-4">
              <p>Name: <strong>{selectedUser?.name || "N/A"}</strong></p>
              <p>Email: <strong>{selectedUser?.email || "N/A"}</strong></p>
              <p>Mobile: <strong>+91 {selectedUser?.mobile || "N/A"}</strong></p>
              <p>Branch: <strong>{selectedUser?.branchName || "N/A"}</strong></p>
              <p>Department: <strong>{selectedUser?.departmentName || "N/A"}</strong></p>
              <p>Status: <strong>{selectedUser?.status || "N/A"}</strong></p>
            </div>

            {/* Current Roles */}
            <h3 className="text-md font-semibold text-gray-800 mb-2 border-b pb-1">Assigned Roles</h3>
            <ul className="space-y-2 mb-4">
              {roleByEmp.map((role, index) => (
                <li key={index} className="flex justify-between items-center border p-2 rounded">
                  <span>{role.roleName || "Unnamed Role"}</span>
                  <button
                    onClick={() => handleToggleActiveStatus(role)}
                    className={`p-1.5 rounded-full transition ${role.active ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
                      }`}
                  >
                    {role.active ? (
                      <LockOpenIcon className="h-5 w-5 text-white" />
                    ) : (
                      <LockClosedIcon className="h-5 w-5 text-white" />
                    )}
                  </button>
                </li>
              ))}
            </ul>

            {/* Add Role Section */}
            <div className="space-y-2">
              {!showAvailableRoles && (
                <button
                  onClick={handleAddButtonClick}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded transition"
                >
                  + Add Role
                </button>
              )}

              {showAvailableRoles && (
                <div>
                  {availableRoles.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                      <select
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="border rounded px-3 py-2"
                      >
                        <option value="">Select a role</option>
                        {availableRoles.map((role) => (
                          <option key={role.id} value={role.role}>
                            {role.role}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={addSelectedRole}
                        disabled={isLoading}
                        className={`text-white px-4 py-2 rounded transition ${isLoading
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-green-600 hover:bg-green-700"
                          }`}
                      >
                        {isLoading ? "Assigning..." : "Assign Role"}
                      </button>
                    </div>
                  ) : (
                    <p className="text-gray-500 mt-2">All roles are already assigned.</p>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end mt-6 space-x-2">
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setShowAvailableRoles(false);
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

      )}

      {modalVisible && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-gray-500 bg-opacity-50"
          role="dialog"
          aria-labelledby="modal-title"
          aria-describedby="modal-description"
        >
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2
              id="modal-title"
              className="text-xl font-semibold mb-4 text-gray-800"
            >
              Confirm Status Change
            </h2>
            <p id="modal-description" className="text-gray-600 mb-6">
              Are you sure you want to{" "}
              <span className="font-medium">
                {roleToToggle?.active === true ? "Deactivate" : "Activate"}
              </span>{" "}
              the role <strong>{roleToToggle?.roleName}</strong>?
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setModalVisible(false)}
                className="bg-gray-300 text-gray-800 hover:bg-gray-400 rounded-lg px-4 py-2 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmToggleActiveStatus}
                disabled={isConfirmDisabled}
                className={`bg-blue-500 text-white rounded-md px-4 py-2 ${isConfirmDisabled ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
              >
                {isConfirmDisabled ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageUserRole;
