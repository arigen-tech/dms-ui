import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  LockClosedIcon,
  LockOpenIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PlusCircleIcon
} from '@heroicons/react/24/solid';
import { BRANCH_API } from '../API/apiConfig';

const tokenKey = 'tokenKey';

const Branch = () => {
  const [branches, setBranches] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    isActive: true,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [branchToToggle, setBranchToToggle] = useState(null);
  const [editingBranchId, setEditingBranchId] = useState(null); // Define the state for editing role ID


  // Retrieve token from localStorage
  const token = localStorage.getItem('tokenKey');

  useEffect(() => {
    fetchBranches();
  }, []); // Adding an empty dependency array to avoid infinite loop

  const fetchBranches = async () => {
    try {
      const response = await axios.get(`${BRANCH_API}/findAll`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      setBranches(response.data);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleAddBranch = async () => {
    if (formData.name && formData.address) {
      try {
        const newBranch = {
          ...formData,
          createdOn: new Date().toISOString(),
          updatedOn: new Date().toISOString(),
          isActive: formData.isActive ? 1 : 0,
        };
        console.log('Sending branch data:', newBranch); // Debugging

        const response = await axios.post(`${BRANCH_API}/save`, newBranch, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        console.log('Branch added:', response.data); // Debugging
        setBranches([...branches, response.data]);
        setFormData({ name: '', address: '', isActive: true });
        alert('Branch added successfully!');
      } catch (error) {
        console.error('Error adding branch:', error.response ? error.response.data : error.message);
        alert('Failed to add the Branch. Please try again.');
      }
    } else {
      console.error('Form data is incomplete');
    }
  };


  // Function to handle role editing
  const handleEditBranch = (branchId) => {
    // Set the actual ID of the branch being edited
    setEditingBranchId(branchId);
  
    // Find the branch in the original list by its ID to populate the form
    const branchToEdit = branches.find(branch => branch.id === branchId);
  
    // Populate the form with the branch data (if found)
    if (branchToEdit) {
      setFormData({
        name: branchToEdit.name,
        address: branchToEdit.address,
        isActive: branchToEdit.isActive === 1, // Convert to boolean if needed
        id: branchToEdit.id, // Ensure the ID is also in formData for updates
      });
    } else {
      console.error('Branch not found for ID:', branchId); // Log if the branch is not found
    }
  };
  
  const handleSaveEdit = async () => {
    if (formData.name.trim() && editingBranchId !== null) {
      try {
        // Find the branch in the original list by its ID
        const branchIndex = branches.findIndex(branch => branch.id === editingBranchId);
  
        if (branchIndex === -1) {
          alert('Branch not found!');
          return;
        }
  
        // Create the updated branch object
        const updatedBranch = {
          ...branches[branchIndex],
          name: formData.name,
          address: formData.address,
          isActive: formData.isActive ? 1 : 0,
          updatedOn: new Date().toISOString(),
        };
  
        // Send the update request to the server
        const response = await axios.put(`${BRANCH_API}/update/${updatedBranch.id}`, updatedBranch, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem(tokenKey)}`,
          },
        });
  
        // Update the original branches list with the updated branch
        const updatedBranches = branches.map(branch =>
          branch.id === updatedBranch.id ? response.data : branch
        );
  
        // Update the state with the modified branches array
        setBranches(updatedBranches);
        setFormData({ name: '', address: '', isActive: true }); // Reset form data
        setEditingBranchId(null); // Reset the editing state
        alert('Branch updated successfully!');
      } catch (error) {
        console.error('Error updating branch:', error.response ? error.response.data : error.message);
        alert('Failed to update the branch. Please try again.');
      }
    }
  };
  

  const handleToggleActiveStatus = (branch) => {
    setBranchToToggle(branch);
    setModalVisible(true);
  };

  const confirmToggleActiveStatus = async () => {
    if (branchToToggle) {
      try {
        const updatedBranch = {
          ...branchToToggle,
          isActive: branchToToggle.isActive === 1 ? 0 : 1, // Toggle between 1 and 0
          updatedOn: new Date().toISOString(),
        };

        const token = localStorage.getItem(tokenKey); // Retrieve token from local storage
        const response = await axios.put(
          `${BRANCH_API}/updatestatus/${updatedBranch.id}`, // Update API endpoint
          updatedBranch,
          {
            headers: {
              'Content-Branch': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const updatedBranches = branches.map(branch =>
          branch.id === updatedBranch.id ? response.data : branch
        );
        setBranches(updatedBranches);
        setModalVisible(false);
        setBranchToToggle(null);
        alert('Status Changed successfully!');
      } catch (error) {
        console.error('Error toggling Category status:', error.response ? error.response.data : error.message);
        alert('Failed to changing the status. Please try again.');
      }
    } else {
      console.error('No Branch selected for status toggle');
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

  const filteredBranches = branches.filter(branch => {
    const statusText = branch.isActive ? 'active' : 'inactive'; 
    const createdOnText = formatDate(branch.createdOn);
    const updatedOnText = formatDate(branch.updatedOn);
  
    return (
      (branch.name && branch.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (branch.address && branch.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
      statusText.includes(searchTerm.toLowerCase()) || 
      createdOnText.includes(searchTerm.toLowerCase()) || 
      updatedOnText.includes(searchTerm.toLowerCase()) 
    );
  });
  
  const sortedBranches = filteredBranches.sort((a, b) => b.isActive - a.isActive);

  const totalItems = sortedBranches.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedBranches = sortedBranches.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="p-4">
      <h1 className="text-xl mb-4 font-semibold">Branches</h1>
      <div className="bg-white p-4 rounded-lg shadow-sm">
        {/* Form Section */}
        <div className="mb-4 bg-slate-100 p-4 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="p-2 border rounded-md outline-none"
            />
            <input
              type="text"
              placeholder="Address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              className="p-2 border rounded-md outline-none"
            />
          </div>
          <div className="mt-3 flex justify-start">
            {editingBranchId === null ? (
              <button onClick={handleAddBranch} className="bg-blue-900 text-white rounded-2xl p-2 flex items-center text-sm justify-center">
                <PlusCircleIcon className="h-5 w-5 mr-1" /> Add Branch
              </button>
            ) : (
              <button onClick={handleSaveEdit} className="bg-blue-900 text-white rounded-2xl p-2 flex items-center text-sm justify-center">
                <CheckCircleIcon className="h-5 w-5 mr-1" /> Update
              </button>
            )}
          </div>
        </div>

        {/* Search and Items Per Page Section */}
        <div className="mb-4 bg-slate-100 p-4 rounded-lg flex justify-between items-center">
          <div className="flex items-center bg-blue-500 rounded-lg">
            <label htmlFor="itemsPerPage" className="mr-2 ml-2 text-white text-sm">Show:</label>
            <select
              id="itemsPerPage"
              className="border rounded-r-lg p-1.5 outline-none"
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
            >
              {[5, 10, 15, 20].map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search Branch"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="p-2 border rounded-lg pl-10 outline-none"
            />
            <MagnifyingGlassIcon className="absolute top-2 left-2 h-5 w-5 text-gray-500" />
          </div>
        </div>

        {/* Branches Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-slate-100">
                <th className="border p-2 text-left">SR.</th>
                <th className="border p-2 text-left">Name</th>
                <th className="border p-2 text-left">Address</th>
                <th className="border p-2 text-left">Created On</th>
                <th className="border p-2 text-left">Updated On</th>
                <th className="border p-2 text-left">Status</th>
                <th className="border p-2 text-left">Edit</th>
                <th className="border p-2 text-left">Access</th>
              </tr>
            </thead>
            <tbody>
              {paginatedBranches.map((branch, index) => (
                <tr key={branch.id}>
                  <td className="border p-2">{index + 1 + (currentPage - 1) * itemsPerPage}</td>
                  <td className="border p-2">{branch.name}</td>
                  <td className="border p-2">{branch.address}</td>
                  <td className="border p-2">{formatDate(branch.createdOn)}</td>
                  <td className="border p-2">{formatDate(branch.updatedOn)}</td>
                  <td className="border p-2">{branch.isActive ? 'Active' : 'Inactive'}</td>
                  <td className="border p-2 text-center">
                    <button onClick={() => handleEditBranch(branch.id)}>
                      <PencilIcon className="h-6 w-6 text-white bg-yellow-400 rounded-xl p-1" />
                    </button>
                  </td>
                  <td className="border p-2 text-center">
                    <button
                      onClick={() => handleToggleActiveStatus(branch)}
                      className={`p-1 rounded-full ${branch.isActive ? 'bg-green-500' : 'bg-red-500'}`}
                    >
                      {branch.isActive ? (
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

        {/* Pagination */}
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

      {/* Toggle Active Modal */}
      {modalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Confirm Status Change</h2>
            <p className="mb-4">Are you sure you want to {branchToToggle.isActive ? 'deactivate' : 'activate'} this branch<strong>{branchToToggle.name}</strong>?</p>
            <div className="flex justify-end gap-4">
              <button onClick={() => setModalVisible(false)} className="bg-gray-300 p-2 rounded-lg">Cancel</button>
              <button onClick={confirmToggleActiveStatus} className="bg-blue-500 text-white p-2 rounded-lg">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Branch;
