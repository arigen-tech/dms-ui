import { ROLE_API } from '../API/apiConfig';
import React, { useState, useEffect } from 'react';
import {
  ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon,
  LockClosedIcon, LockOpenIcon, MagnifyingGlassIcon,
  PencilIcon, PlusCircleIcon
} from '@heroicons/react/24/solid';
import axios from 'axios';

const tokenKey = 'tokenKey'; // Updated token key

const Role = () => {
  const [roles, setRoles] = useState([]);
  const [formData, setFormData] = useState({ role: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [roleToToggle, setRoleToToggle] = useState(null);
  const [editingRoleId, setEditingRoleId] = useState(null); // Define the state for editing role ID


  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const token = localStorage.getItem(tokenKey); // Retrieve token from local storage
        const response = await axios.get(`${ROLE_API}/findAll`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRoles(response.data);
        console.log(response.data);
      } catch (error) {
        console.error('Error fetching roles:', error);
      }
    };
    fetchRoles();
  }, []);

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

  const handleAddRole = async () => {
    if (formData.role) {
      const newRole = {
        role: formData.role,
        isActive: 1 // Use 1 to represent true
      };

      try {
        const token = localStorage.getItem(tokenKey); // Retrieve token from local storage
        const response = await axios.post(`${ROLE_API}/save`, newRole, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRoles([...roles, response.data]);
        setFormData({ role: '' });
        alert('Role added successfully!');
      } catch (error) {
        console.error('Error adding role:', error);
        alert('Failed to adding the role. Please try again.');
      }
    }
  };

// Function to handle role editing
const handleEditRole = (roleId) => {
  // Set the actual ID of the role being edited
  setEditingRoleId(roleId);

  // Find the role in the original list by its ID to populate the form
  const roleToEdit = roles.find(role => role.id === roleId);

  // Populate the form with the role data (if found)
  if (roleToEdit) {
    setFormData({
      role: roleToEdit.role,
      // Add other form fields as needed
    });
  } else {
    console.error('Role not found for ID:', roleId); // Log if the role is not found
  }
};

// Function to handle saving the edited role
const handleSaveEdit = async () => {
  if (formData.role.trim() && editingRoleId !== null) {
    try {
      // Find the role in the original list by its ID
      const roleIndex = roles.findIndex(role => role.id === editingRoleId);

      if (roleIndex === -1) {
        alert('Role not found!');
        return;
      }

      // Create the updated role object
      const updatedRole = {
        ...roles[roleIndex],
        role: formData.role,
        updatedOn: new Date().toISOString(),
      };

      // Send the update request to the server
      const response = await axios.put(`${ROLE_API}/update/${updatedRole.id}`, updatedRole, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem(tokenKey)}`,
        },
      });

      // Update the original roles list with the updated role
      const updatedRoles = roles.map(role =>
        role.id === updatedRole.id ? response.data : role
      );

      // Update the state with the modified roles array
      setRoles(updatedRoles);
      setFormData({ role: '' }); // Reset form data
      setEditingRoleId(null); // Reset the editing state
      alert('Role updated successfully!');
    } catch (error) {
      console.error('Error updating role:', error.response ? error.response.data : error.message);
      alert('Failed to update the role. Please try again.');
    }
  }
};



  const handleToggleActiveStatus = (role) => {
    setRoleToToggle(role);
    setModalVisible(true);
  };

  const confirmToggleActiveStatus = async () => {
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
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );

        // Check the response status and data
        if (response.status === 200) {
          // Update the roles state with the updated role
          const updatedRoles = roles.map(role =>
            role.id === updatedRole.id ? response.data : role
          );
          setRoles(updatedRoles);
          setModalVisible(false); // Close the modal
          setRoleToToggle(null); // Reset the selected role
          alert('Status changed successfully!');
        } else {
          alert('Failed to change the status. Please try again.');
        }
      } catch (error) {
        console.error('Error toggling role status:', error.response ? error.response.data : error.message);
        alert('Failed to change the status. Please try again.');
      }
    } else {
      console.error('No role selected for status toggle');
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
      // hour12: true 
    };
    return date.toLocaleString('en-GB', options).replace(',', '');
  };

  const filteredRoles = roles.filter(role => {
    const statusText = role.isActive === 1 ? 'active' : 'inactive';
    const createdOnText = formatDate(role.createdOn);
    const updatedOnText = formatDate(role.updatedOn);

    return (
      (role.role && role.role.toLowerCase().includes(searchTerm.toLowerCase())) ||
      statusText.includes(searchTerm.toLowerCase()) ||
      createdOnText.includes(searchTerm.toLowerCase()) ||
      updatedOnText.includes(searchTerm.toLowerCase())
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
  const paginatedRoles = sortedRoles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="p-1">
      <h1 className="text-xl mb-4 font-semibold">ROLES</h1>
      <div className="bg-white p-3 rounded-lg shadow-sm">
        <div className="mb-4 bg-slate-100 p-4 rounded-lg">
          <div className="grid grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Role"
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="p-2 border rounded-md outline-none"
            />
          </div>
          <div className="mt-3 flex justify-start">
            {editingRoleId === null ? (
              <button onClick={handleAddRole} className="bg-blue-900 text-white rounded-2xl p-2 flex items-center text-sm justify-center">
                <PlusCircleIcon className="h-5 w-5 mr-1" /> Add Role
              </button>
            ) : (
              <button onClick={handleSaveEdit} className="bg-blue-900 text-white rounded-2xl p-2 flex items-center text-sm justify-center">
                <CheckCircleIcon className="h-5 w-5 mr-1" /> Update
              </button>
            )}
          </div>
        </div>

        <div className="mb-4 bg-slate-100 p-4 rounded-lg flex justify-between items-center">
          <div className="flex items-center bg-blue-500 rounded-lg">
            <label htmlFor="itemsPerPage" className="mr-2 ml-2 text-white text-sm">Show:</label>
            <select
              id="itemsPerPage"
              className="border rounded-r-lg p-1.5 outline-none"
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
            >
              {[5, 10, 15, 20].map(num => (
                <option key={num} value={num}>{num}</option>
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
                <th className="border p-2 text-left">Role</th>
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
                  <td className="border p-2">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                  <td className="border p-2">{role.role}</td>
                  <td className="border px-4 py-2">{formatDate(role.createdOn)}</td>
                  <td className="border px-4 py-2">{formatDate(role.updatedOn)}</td>
                  <td className="border p-2">{role.isActive === true ? 'Active' : 'Inactive'}</td>
                  <td className="border p-2">
                    <button onClick={() => handleEditRole(role.id)}>
                      <PencilIcon className="h-6 w-6 text-white bg-yellow-400 rounded-xl p-1" />
                    </button>
                  </td>
                  <td className="border p-2">
                    <button
                      onClick={() => handleToggleActiveStatus(role)}
                      className={`p-1 rounded-full ${role.isActive === true ? 'bg-green-500' : 'bg-red-500'}`}
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


        <div className="flex justify-between items-center mt-4">
          <div>
            <span className="text-sm text-gray-700">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
            </span>
          </div>
          <div className="flex items-center">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
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
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="bg-slate-200 px-3 py-1 rounded ml-3"
            >
              Next
              <ArrowRightIcon className="inline h-4 w-4 ml-2 mb-1" />
            </button>
          </div>
        </div>
      </div>


      {modalVisible && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-500 bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Confirm Status Change</h2>
            <p>Are you sure you want to {roleToToggle?.isActive === true ? 'deactivate' : 'activate'} the role <strong>{roleToToggle.role}</strong>?</p>
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

export default Role;
