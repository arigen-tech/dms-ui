import { ROLE_API } from "../API/apiConfig";
import React, { useState, useEffect } from "react";
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


const tokenKey = "tokenKey"; // Updated token key

const Role = () => {
  const [roles, setRoles] = useState([]);
  const [formData, setFormData] = useState({ role: "", roleCode: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [state, setState] = useState("");
  const [popupMessage, setPopupMessage] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [roleToToggle, setRoleToToggle] = useState(null);
  const [editingRoleId, setEditingRoleId] = useState(null); // Define the state for editing role ID
  const [message, setMessage] = useState(null); // For the success message
  const [messageType, setMessageType] = useState("");
  const [isConfirmDisabled, setIsConfirmDisabled] = useState(false); // State to manage confirmation button state
  const [isLoading, setIsLoading] = useState(false);


  useEffect(() => {
    const fetchRoles = async () => {
    setIsLoading(true);
      try {
        const token = localStorage.getItem(tokenKey); // Retrieve token from local storage
        const response = await axios.get(`${ROLE_API}/findAll`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRoles(response.data);
        console.log(response.data);
      } catch (error) {
        console.error("Error fetching roles:", error);
      setIsLoading(false);

      }finally{
        setIsLoading(false);
      }
    };
    fetchRoles();
  }, []);


  if (isLoading) {
    return <LoadingComponent />;
  }

  const showPopup = (message, type = "info") => {
    setPopupMessage({ message, type });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Allow only letters and spaces
    const regex = /^[A-Za-z\s]*$/;

    if (regex.test(value) || value === "") {
      setFormData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    }
  };

  const handleInputsChange = (event) => {
    const { name, value } = event.target;
    const numericValue = value.replace(/[^0-9]/g, "");

    // Update form data state with the numeric value
    setFormData((prevState) => ({
      ...prevState,
      [name]: numericValue,
    }));
  };

  const handleAddRole = async () => {
    if (formData.role) {
      const newRole = {
        role: formData.role,
        roleCode: formData.roleCode,
        isActive: 1, // Use 1 to represent true
      };

      try {
        const token = localStorage.getItem(tokenKey); // Retrieve token from local storage
        const response = await axios.post(`${ROLE_API}/save`, newRole, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Update roles list with new role
        setRoles([...roles, response.data]);
        setFormData({ role: "", roleCode: "" });

        // Set success message
        showPopup("Role added successfully!", "success");
      } catch (error) {
        console.error(
          "Error adding role:",
          error.response ? error.response.data : error.message
        );

        // Set error message
        showPopup("Failed to add the role. Please Cheack Unique.");
      }
    } else {
      // Set warning message if role is not provided
      showPopup("Please fill in the role field.");
    }

    // Clear the message after 3 seconds
    setTimeout(() => setMessage(null), 3000);
  };

  // Function to handle role editing
  const handleEditRole = (roleId) => {
    // Set the actual ID of the role being edited
    setEditingRoleId(roleId);

    // Find the role in the original list by its ID to populate the form
    const roleToEdit = roles.find((role) => role.id === roleId);

    // Populate the form with the role data (if found)
    if (roleToEdit) {
      setFormData({
        role: roleToEdit.role,
        roleCode: roleToEdit.roleCode,
        // Add other form fields as needed
      });
    } else {
      console.error("Role not found for ID:", roleId); // Log if the role is not found
    }
  };

  // Function to handle saving the edited role
  const handleSaveEdit = async () => {
    // Ensure that roleCode is a valid number and role is non-empty
    if (
      formData.role.trim() &&
      formData.roleCode && // Ensure roleCode is not empty or undefined
      !isNaN(formData.roleCode) && // Ensure roleCode is a number
      editingRoleId !== null
    ) {
      try {
        // Find the role in the original list by its ID
        const roleIndex = roles.findIndex((role) => role.id === editingRoleId);

        if (roleIndex === -1) {
          setMessage("Role not found!");
          setMessageType("error");
          return;
        }

        // Create the updated role object
        const updatedRole = {
          ...roles[roleIndex],
          role: formData.role,
          roleCode: formData.roleCode,
          updatedOn: new Date().toISOString(),
        };

        // Send the update request to the server
        const response = await axios.put(
          `${ROLE_API}/update/${updatedRole.id}`,
          updatedRole,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem(tokenKey)}`,
            },
          }
        );

        // Update the original roles list with the updated role
        const updatedRoles = roles.map((role) =>
          role.id === updatedRole.id ? response.data : role
        );

        // Update the state with the modified roles array
        setRoles(updatedRoles);
        setFormData({ role: "", roleCode: "" }); // Reset form data
        setEditingRoleId(null); // Reset the editing state

        // Set success message
        showPopup("Role updated successfully!", "success");
      } catch (error) {
        console.error(
          "Error updating role:",
          error.response ? error.response.data : error.message
        );

        // Set error message
        showPopup("Failed to update the role. Please Cheack Unique.");
      }
    } else {
      // Set warning message if form data is incomplete or invalid roleCode
      if (!formData.role.trim()) {
        showPopup("Please provide a valid role.");
      } else if (isNaN(formData.roleCode)) {
        showPopup("Please provide a valid role code.");
      }
    }

    // Clear the message after 3 seconds
    setTimeout(() => setMessage(null), 3000);
  };


  const handleToggleActiveStatus = (role) => {
    setRoleToToggle(role);
    setModalVisible(true);
  };

  const confirmToggleActiveStatus = async () => {
    setIsConfirmDisabled(true);

    if (roleToToggle) {
      try {
        // Prepare the updated role object
        const updatedRole = {
          ...roleToToggle,
          isActive: roleToToggle.isActive === true ? false : true, // Toggle between true and false
          updatedOn: new Date().toISOString(), // Ensure this field is formatted correctly for your backend
        };

        const token = localStorage.getItem(tokenKey); // Retrieve token from local storage
        const response = await axios.put(
          `${ROLE_API}/updatestatus/${updatedRole.id}`, // Update API endpoint
          updatedRole,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        // Check the response status and data
        if (response.status === 200) {
          // Update the roles state with the updated role
          const updatedRoles = roles.map((role) =>
            role.id === updatedRole.id ? response.data : role
          );
          setRoles(updatedRoles);
          setModalVisible(false); // Close the modal
          setRoleToToggle(null); // Reset the selected role
          setIsConfirmDisabled(false); // Reset the confirmation button state

          // Set success message
          showPopup("Role status changed successfully!", "success");
        } else {
          // Set error message if response status is not 200
          showPopup("Failed to change the status. Please try again.", "error");
        }
      } catch (error) {
        console.error(
          "Error toggling role status:",
          error.response ? error.response.data : error.message
        );

        // Set error message in case of an exception
        showPopup("Failed to change the status. Please try again.", "error");
      }
    } else {
      console.error("No role selected for status toggle");

      // Set warning message if no role is selected
      showPopup("Please select a role to change its status.", "warning");
    }

    // Clear the message after 3 seconds
    setTimeout(() => setMessage(null), 3000);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      // hour12: true
    };
    return date.toLocaleString("en-GB", options).replace(",", "");
  };

  const filteredRoles = roles.filter((role) => {
    // Explicitly convert status to text representation
    const statusText = role.isActive === true ? "active" : "inactive";

    // Format creation date to searchable text
    const createdOnText = formatDate(role.createdOn);

    // Format update date to searchable text
    const updatedOnText = formatDate(role.updatedOn);

    // Improved search logic with multiple matching strategies
    return (
      // Role name search
      (role.role &&
        (role.role.toLowerCase().includes(searchTerm.toLowerCase()))) ||

      // Role code search
      (role.roleCode &&
        role.roleCode.toString().toLowerCase().includes(searchTerm.toLowerCase())) ||

      // Enhanced status search with multiple matching approaches
      (statusText.toLowerCase() === searchTerm.toLowerCase() ||
        statusText.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (searchTerm.toLowerCase() === 'active' && role.isActive === true) ||
        (searchTerm.toLowerCase() === 'inactive' && role.isActive === false)) ||

      // Creation date search
      (createdOnText.toLowerCase().includes(searchTerm.toLowerCase())) ||

      // Update date search
      (updatedOnText.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  // Sorting the filtered categories by 'active' status
  const sortedRoles = filteredRoles.sort((a, b) => {
    if (b.isActive === a.isActive) {
      return 0; // Maintain original order if same status
    }
    return b.isActive ? 1 : -1; // Active categories come first
  });

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


  return (
    <div className="px-2">
      <h1 className="text-lg mb-1 font-semibold">Roles</h1>
      <div className="bg-white p-1 rounded-lg shadow-sm">
        {popupMessage && (
          <Popup
            message={popupMessage.message}
            type={popupMessage.type}
            onClose={() => setPopupMessage(null)}
          />
        )}
        <div className="mb-4 bg-slate-100 p-2 rounded-lg">
          <div className="flex gap-6">
            <div className="w-4/5 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <label
                htmlFor="role"
               
                className="block text-md font-medium text-gray-700"
              >
                Role <span className="text-red-800 text-xs">(Unique)</span>
                <input
                  type="text"
                  id="role"
                  name="role"
                  placeholder="Enter Role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"


                />
              </label>

              <label
                htmlFor="role"
               className="block text-md font-medium text-gray-700"
              >
                Role Code <span className="text-red-800 text-xs">(Unique)</span>
                <input
                  type="text"
                  id="roleCode"
                  maxLength={3}
                  minLength={3}
                  name="roleCode"
                  placeholder="Enter Role Code"
                  value={formData.roleCode}
                  onChange={handleInputsChange}
                  className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>

            </div>

            <div className="w-1/5 flex items-end">

              {editingRoleId === null ? (
                <button
                  onClick={handleAddRole}
                  className="bg-blue-900 text-white rounded-2xl p-2 w-full text-sm flex items-center justify-center"
                >
                  <PlusCircleIcon className="h-5 w-5 mr-1" /> Add Role
                </button>
              ) : (
                <button
                  onClick={handleSaveEdit}
                  className="bg-blue-900 text-white rounded-2xl p-2 w-full text-sm flex items-center justify-center"
                >
                  <CheckCircleIcon className="h-5 w-5 mr-1" /> Update
                </button>
              )}
            </div>
          </div>
        </div>


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
                <th className="border p-2 text-left">Role</th>
                <th className="border p-2 text-left">Role Code</th>
                <th className="border p-2 text-left">Created On</th>
                <th className="border p-2 text-left">Updated On</th>
                <th className="border p-2 text-left">Status</th>
                <th className="border p-2 text-left">Edit</th>
                <th className="border p-2 text-left">Access</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRoles.map((role, index) => (
                <tr key={role.id}>
                  <td className="border p-2">
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </td>
                  <td className="border p-2">{role.role}</td>
                  <td className="border p-2">{role.roleCode}</td>
                  <td className="border px-4 py-2">
                    {formatDate(role.createdOn)}
                  </td>
                  <td className="border px-4 py-2">
                    {formatDate(role.updatedOn)}
                  </td>
                  <td className="border p-2">
                    {role.isActive === true ? "Active" : "Inactive"}
                  </td>
                  <td className="border p-2">
                    <button onClick={() => handleEditRole(role.id)} disabled={role.isActive === false}
                      className={`${role.isActive === false ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      <PencilIcon className="h-6 w-6 text-white bg-yellow-400 rounded-xl p-1" />
                    </button>
                  </td>
                  <td className="border p-2">
                    <button
                      onClick={() => handleToggleActiveStatus(role)}
                      className={`p-1 rounded-full ${role.isActive === true ? "bg-green-500" : "bg-red-500"
                        }`}
                    >
                      {role.isActive === true ? (
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
          {/* Previous Button */}
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className={`px-3 py-1 rounded mr-3 ${currentPage === 1 ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"
              }`}
          >
            <ArrowLeftIcon className="inline h-4 w-4 mr-2 mb-1" />
            Previous
          </button>

          {/* Page Number Buttons */}
          {getPageNumbers().map((page) => (
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
            disabled={currentPage === totalPages}
            className={`px-3 py-1 rounded ml-3 ${currentPage === totalPages ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"
              }`}
          >
            Next
            <ArrowRightIcon className="inline h-4 w-4 ml-2 mb-1" />
          </button>
          <div className="ml-4">
            <span className="text-sm text-gray-700">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, totalItems)} of{" "}
              {totalItems} entries
            </span>
          </div>
        </div>
      </div>

      {modalVisible && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-500 bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4">
              Confirm Status Change
            </h2>
            <p>
              Are you sure you want to{" "}
              {roleToToggle?.isActive === true ? "deactivate" : "activate"} the
              role <strong>{roleToToggle.role}</strong>?
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

export default Role;
