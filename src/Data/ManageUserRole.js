import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_HOST, ROLE_API } from "../API/apiConfig";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
  LockClosedIcon,
  LockOpenIcon,
  PencilIcon,
} from "@heroicons/react/24/solid";
import Popup from "../Components/Popup";

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

  const token = localStorage.getItem("tokenKey");
  const [loading, setLoading] = useState(false);

  const employeId = localStorage.getItem("userId");

  const showPopup = (message, type = "info") => {
    setPopupMessage({ message, type });
  };

  useEffect(() => {
    fetchUsers();
    fetchAvailableRolesForUser();
  }, []);

  useEffect(() => {
    if (selectedUser && selectedUser.employeeRoles) {
      setRoleByEmp(selectedUser.employeeRoles);
    }
  }, [selectedUser]);

  useEffect(() => {
    // Compute available roles
    const matchedRoleIds = new Set(roleByEmp.map((role) => role.roleId)); // Extract roleIds from roleByEmp
    const remainingRoles = allRoles.filter(
      (role) => !matchedRoleIds.has(role.id)
    ); // Filter roles not in matchedRoleIds

    setAvailableRoles(remainingRoles); // Update state with available roles
  }, [allRoles, roleByEmp]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_HOST}/api/EmpRole/employees`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 200) {
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

  const fetchAvailableRolesForUser = async (id) => {
    try {
      const rolesResponse = await axios.get(`${ROLE_API}/findAll`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setAllRoles(rolesResponse.data);
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

  console.log("USer22 Name being sent:", selectedUser);

  const handleAddButtonClick = () => {
    fetchAvailableRolesForUser();
    setShowAvailableRoles(true);
  };

  console.log("Role Name being sent1:", selectedRole);

  const addSelectedRole = async () => {
    if (!selectedRole) {
      showPopup("Please select a role before adding.");
      return;
    }

    if (!selectedUser){
      showPopup("Please select a user before adding.");
      return;
    }
  
    console.log("Selected Role:", selectedRole);
  
    try {
      if (!token) {
        showPopup("User is not authenticated. Please log in again.");
        return;
      }
  
      // Debugging log to check payload and endpoint
      console.log("API Endpoint:", `${API_HOST}/employee/${selectedUser.employeeId}/role`);
      console.log("Payload:", { roleName: selectedRole });
  
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
        showPopup("Role added successfully!");
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
    }
  };
  

  const handleToggleActiveStatus = (role) => {
    setRoleToToggle(role); // Set the role to be toggled
    setModalVisible(true); // Show the confirmation modal
  };

  const confirmToggleActiveStatus = async () => {
    if (roleToToggle) {
      try {
       
        const updatedRole = {
          status :roleToToggle.isActive === true ? false : true,
          roleId: roleToToggle.id,
          empId: empId,
        };
        const response = await axios.put(
          `${API_HOST}/api/EmpRole/changeRoleStatus`, 
          updatedRole,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`, 
            },
          }
        );

        if (response.status === 200) {
          
          const updatedRoles = roles.map((role) =>
            role.id === updatedRole.id
              ? { ...role, isActive: updatedRole.isActive }
              : role
          );
          setRoles(updatedRoles); // Update the state
          setModalVisible(false); // Close the modal
          setRoleToToggle(null); // Reset the selected role
          showPopup("Role status changed successfully!");
        } else {
          showPopup("Failed to change the status. Please try again.");
        }
      } catch (error) {
        console.error(
          "Error toggling role status:",
          error.response ? error.response.data : error.message
        );
        showPopup("An error occurred. Please try again.");
      }
    } else {
      showPopup("No role selected for status change.");
    }
  };

  const handleRoleUpdate = async () => {
    if (!role.trim()) {
      alert("Role cannot be empty");
      return;
    }
    const updatedUser = { ...selectedUser, roleName: role };
    console.log("Updating role:", updatedUser);

    // Close modal
    setSelectedUser(null);
    setRole("");
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
      <h1 className="text-xl mb-4 font-semibold">Manage Employee Roles</h1>
      {popupMessage && (
          <Popup
            message={popupMessage.message}
            type={popupMessage.type}
            onClose={() => setPopupMessage(null)}
          />
        )}
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

        <div className="flex justify-between items-center mt-4">
          <div>
            <span className="text-sm text-gray-700">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}{" "}
              entries
            </span>
          </div>
          <div className="flex items-center">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
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
      </div>

      {selectedUser && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center">
          <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-auto">
            <h2 className="text-lg font-semibold mb-4">Edit User Details</h2>

            {/* User Info */}
            <div className="mb-4">
              <p>
                <strong>Name:</strong> {selectedUser.name || "N/A"}
              </p>
              <p>
                <strong>Email:</strong> {selectedUser.email || "N/A"}
              </p>
              <p>
                <strong>Mobile:</strong> {selectedUser.mobile || "N/A"}
              </p>
              <p>
                <strong>Branch:</strong> {selectedUser.branchName || "N/A"}
              </p>
              <p>
                <strong>Department:</strong>{" "}
                {selectedUser.departmentName || "N/A"}
              </p>
              <p>
                <strong>Status:</strong> {selectedUser.status || "N/A"}
              </p>
            </div>

            {/* Employee Roles List */}
            <h3 className="text-md font-semibold mb-2">Employee Roles:</h3>
            <ul className="space-y-2">
              {roleByEmp.map((role, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between border-b pb-2"
                >
                  <span>{role.roleName || "Unnamed Role"}</span>
                  <button
                    onClick={() => handleToggleActiveStatus(role)}
                    className={`p-1 rounded-full ${
                      role.active ? "bg-green-500" : "bg-red-500"
                    }`}
                  >
                    {role.active ? (
                      <LockOpenIcon className="h-5 w-5 text-white p-0.5" />
                    ) : (
                      <LockClosedIcon className="h-5 w-5 text-white p-0.5" />
                    )}
                  </button>
                </li>
              ))}
            </ul>

            {/* Add Role Section */}
            <div className="flex flex-col gap-2">
              {!showAvailableRoles && (
                <button
                  onClick={handleAddButtonClick}
                  className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                  Add Role
                </button>
              )}
              {showAvailableRoles && (
                <div className="mt-2">
                  {availableRoles.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4 items-center">
                      <select
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="w-full border p-2 rounded"
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
                        className="bg-green-500 text-white px-4 py-2 rounded"
                      >
                        Add Role
                      </button>
                    </div>
                  ) : (
                    <p className="text-gray-500 mt-2">All Roles Are Assigned</p>
                  )}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setSelectedUser(null)}
                className="bg-red-500 text-white px-4 py-2 rounded mr-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {modalVisible && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-500 bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4">
              Confirm Status Change
            </h2>
            <p>
              Are you sure you want to{" "}
              {/* {roleToToggle?.isActive ? "Active" : "Inactive"} the role{" "} */}
              {roleToToggle?.isActive === true ? "Inactive" : "Active"} the role{" "}

              <strong>{roleToToggle?.roleName}</strong>?
            </p>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setModalVisible(false)}
                className="bg-gray-300 text-gray-800 rounded-lg px-4 py-2 mr-2"
              >
                Cancel
              </button>
              <button
                onClick={confirmToggleActiveStatus}
                className="bg-blue-500 text-white rounded-lg px-4 py-2"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageUserRole;
