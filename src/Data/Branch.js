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
import Popup from '../Components/Popup';
import LoadingComponent from '../Components/LoadingComponent';

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
  const [message, setMessage] = useState(null); // For the success message
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
  const [popupMessage, setPopupMessage] = useState(null);
  const [isConfirmDisabled, setIsConfirmDisabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Retrieve token from localStorage
  const token = localStorage.getItem('tokenKey');

  useEffect(() => {
    fetchBranches();
  }, []); // Adding an empty dependency array to avoid infinite loop

  const fetchBranches = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${BRANCH_API}/findAll`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      setBranches(response.data);
    } catch (error) {
      console.error('Error fetching branches:', error);
    } finally {
      setIsLoading(false);
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

        const response = await axios.post(`${BRANCH_API}/save`, newBranch, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        setBranches([...branches, response.data]);
        setFormData({ name: '', address: '', isActive: true });

        // Set success message
        showPopup('Branch added successfully!', "success");
      } catch (error) {
        console.error('Error adding branch:', error.response ? error.response.data : error.message);

        // Set error message
        showPopup('Failed to add the Branch. Please try again.!', "error");

      }
    } else {
      // Set warning message
      showPopup('Please fill in all required fields.!', "warning");

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
          setMessage('Branch not found!');
          setMessageType('error');
          setTimeout(() => setMessage(null), 3000);
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

        // Show success message
        showPopup('Branch updated successfully!', "success");
      } catch (error) {
        console.error('Error updating branch:', error.response ? error.response.data : error.message);

        // Show error message
        showPopup('Failed to update the branch. Please try again.!', "error");

      }


    }
  };



  const handleToggleActiveStatus = (branch) => {
    setBranchToToggle(branch);
    setModalVisible(true);
  };

  const confirmToggleActiveStatus = async () => {
    setIsConfirmDisabled(true);

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
              'Content-Type': 'application/json',
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
        setIsConfirmDisabled(false);

        // Show success message
        showPopup('Status changed successfully!', "success");

      } catch (error) {
        console.error('Error toggling branch status:', error.response ? error.response.data : error.message);

        // Show error message
        showPopup('Failed to change the status. Please try again!', "error");

      }

      // Clear the message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } else {
      console.error('No Branch selected for status toggle');
      showPopup('No branch selected for status toggle.!', "error");
    }
  };


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

  // Calculate the paginated branches
  const paginatedBranches = sortedBranches.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Generate page numbers
  const getPageNumbers = () => {
    const maxPageNumbers = 5; // Number of page buttons to show
    const startPage = Math.floor((currentPage - 1) / maxPageNumbers) * maxPageNumbers + 1;
    const endPage = Math.min(startPage + maxPageNumbers - 1, totalPages);
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prevPage) => prevPage + 1);
    }
  };

  if (isLoading) {
    return <LoadingComponent />;
  }

  return (
    <div className="px-2">
      <h1 className="text-2xl mb-1 mb-2 font-semibold">Branches</h1>
      <div className="bg-white p-1 rounded-lg shadow-sm">


        {/* Popup Messages */}
        {popupMessage && (
          <Popup
            message={popupMessage.message}
            type={popupMessage.type}
            onClose={popupMessage.onClose}
          />
        )}

        {/* Form Section */}
        <div className="mb-4 bg-slate-100 p-2 rounded-lg">
          <div className="flex gap-6">
            <div className="w-4/5 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Name Input */}
              <label className="block text-md font-medium text-gray-700">
                Name
                <input
                  type="text"
                  placeholder="Enter name"
                  name="name"
                  value={formData.name || ""}
                  onChange={handleInputChange}
                  className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>

              {/* Address Input */}
              <label className="block text-md font-medium text-gray-700">
                Address
                <input
                  type="text"
                  placeholder="Enter address"
                  name="address"
                  value={formData.address || ""}
                  onChange={handleInputChange}
                  className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
            </div>

            <div className="w-1/5 flex items-end">
              {editingBranchId === null ? (
                <button
                  onClick={handleAddBranch}
                  className="bg-blue-900 text-white rounded-2xl p-2 w-full text-sm flex items-center justify-center"
                >
                  <PlusCircleIcon className="h-5 w-5 mr-1" /> Add Branch
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


        {/* Search and Items Per Page Section */}
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
                    <button onClick={() => handleEditBranch(branch.id)} disabled={branch.isActive === 0}
                      className={`${branch.isActive === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}>
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

      {/* Toggle Active Modal */}
      {modalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Confirm Status Change</h2>
            <p className="mb-4">Are you sure you want to {branchToToggle.isActive ? 'deactivate' : 'activate'} this branch<strong>{branchToToggle.name}</strong>?</p>
            <div className="flex justify-end gap-4">
              <button onClick={() => setModalVisible(false)} className="bg-gray-300 p-2 rounded-lg">Cancel</button>
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

export default Branch;
