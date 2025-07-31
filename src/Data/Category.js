import { CATEGORI_API } from '../API/apiConfig';
import { ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, PencilIcon, PlusCircleIcon, LockClosedIcon, LockOpenIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Popup from '../Components/Popup';
import LoadingComponent from '../Components/LoadingComponent';


const tokenKey = 'tokenKey'; // Correct token key name

const Category = () => {
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({ name: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [categoryToToggle, setCategoryToToggle] = useState(null);
  const [message, setMessage] = useState(null); // For the success message
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
  const [popupMessage, setPopupMessage] = useState(null);
  const [isConfirmDisabled, setIsConfirmDisabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);


  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoading(true);
      try {

        const response = await axios.get(`${CATEGORI_API}/findAll`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem(tokenKey)}`,
          },
        });
        setCategories(response.data);
        console.log(response.data);

      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally{
      setIsLoading(false);

      }
    };
    fetchCategories();
  }, []);

  if (isLoading) {
    return <LoadingComponent />;
  }

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

  const handleAddCategory = async () => {
    if (formData.name.trim()) {
      try {
        const response = await axios.post(`${CATEGORI_API}/save`, formData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem(tokenKey)}`,
          },
        });

        // Update categories state with the new category
        setCategories([...categories, response.data]);
        setFormData({ name: '' }); // Reset form data

        // Set success message
        showPopup('Category added successfully!', "success");

      } catch (error) {
        console.error('Error adding category:', error.response ? error.response.data : error.message);

        // Set error message if request fails
        setMessage('Failed to add the category. Please try again.!', "error");

      }
    } else {
      // Set warning message if name is not provided
      setMessage('Please enter a category name.!', "warning");

    }


  };


  const handleEditCategory = (categoryId) => {
    // Set the actual ID of the category being edited
    setEditingCategoryId(categoryId);

    // Find the category in the original list by its ID to populate the form
    const categoryToEdit = categories.find(category => category.id === categoryId);

    // Populate the form with the category data (if found)
    if (categoryToEdit) {
      setFormData({
        name: categoryToEdit.name,
        isActive: true, // Set status to true by default
      });

      // Set success message
      // showPopup('Category loaded successfully for editing!',"success");

    } else {
      // Set error message if category not found
      // showPopup('Category not found. Please try again.!',"error");

    }


  };


  const handleSaveEdit = async () => {
    if (formData.name.trim() && editingCategoryId !== null) {
      try {
        // Find the category in the original list by its ID
        const categoryIndex = categories.findIndex(category => category.id === editingCategoryId);

        if (categoryIndex === -1) {
          // Set error message if category is not found
          showPopup('Category not found! Please try again.!', "error");

          return;
        }

        // Create the updated category object
        const updatedCategory = {
          ...categories[categoryIndex],
          name: formData.name,
          isActive: true, // Set status to true by default
          updatedOn: new Date().toISOString(),
        };

        // Send the update request to the server
        const response = await axios.put(`${CATEGORI_API}/update/${updatedCategory.id}`, updatedCategory, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem(tokenKey)}`,
          },
        });

        // Update the original categories list with the updated category
        const updatedCategories = categories.map(category =>
          category.id === updatedCategory.id ? response.data : category
        );

        // Update the state with the modified categories array
        setCategories(updatedCategories);
        setFormData({ name: '' });
        setEditingCategoryId(null); // Reset the editing state

        // Set success message
        showPopup('Category updated successfully!', "success");

      } catch (error) {
        console.error('Error updating category:', error.response ? error.response.data : error.message);
        // Set error message if update fails
        showPopup('Failed to update the category. Please try again.!', "error");

      }


    }
  };



  const handleToggleActiveStatus = (category) => {
    setCategoryToToggle(category);
    setModalVisible(true);
  };

  const confirmToggleActiveStatus = async () => {
    setIsConfirmDisabled(true);

    if (categoryToToggle) {
      try {
        const updatedCategory = {
          ...categoryToToggle,
          active: categoryToToggle.active === true ? 0 : 1, // Toggle between 1 and 0
          updatedOn: new Date().toISOString(),
        };

        const token = localStorage.getItem(tokenKey); // Retrieve token from local storage
        const response = await axios.put(
          `${CATEGORI_API}/updatestatus/${updatedCategory.id}`, // Update API endpoint
          updatedCategory,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.status === 200) {
          const updatedCategories = categories.map(category =>
            category.id === updatedCategory.id ? response.data : category
          );

          setCategories(updatedCategories);
          setModalVisible(false);
          setCategoryToToggle(null);
          setIsConfirmDisabled(false);

          // Set success message
          showPopup('Category status changed successfully!', "success");

        } else {
          // Set error message for unexpected response
          showPopup('Failed to change the category status. Please try again.', "error");

        }
      } catch (error) {
        console.error('Error toggling Category status:', error.response ? error.response.data : error.message);

        // Set error message for failed API request
        showPopup('Failed to change the category status. Please try again.', "error");

      }

      // Clear the message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } else {
      console.error('No Category selected for status toggle');

      // Set error message if no category is selected
      showPopup('No category selected for status toggle.!', "error");

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

  const filteredCategories = categories.filter(category => {
    const statusText = category.active === true ? 'active' : 'inactive';
    const createdOnText = formatDate(category.createdOn);
    const updatedOnText = formatDate(category.updatedOn);

    return (
      (category.name && category.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      statusText.includes(searchTerm.toLowerCase()) ||
      createdOnText.includes(searchTerm.toLowerCase()) ||
      updatedOnText.includes(searchTerm.toLowerCase())
    );
  });

  // Sorting the filtered categories by 'active' status
  const sortedCategories = filteredCategories.sort((a, b) => {
    if (b.active === a.active) {
      return 0; // Maintain original order if same status
    }
    return b.active ? 1 : -1; // Active categories come first
  });

  // Pagination logic
  const totalItems = sortedCategories.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedCategories = sortedCategories.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);


  const getPageNumbers = () => {
    const maxPageNumbers = 5;
    const startPage = Math.floor((currentPage - 1) / maxPageNumbers) * maxPageNumbers + 1;
    const endPage = Math.min(startPage + maxPageNumbers - 1, totalPages);
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  };



  return (
    <div className="px-2">
      <h1 className="text-lg mb-1 font-semibold">Categories</h1>
      <div className="bg-white p-4 rounded-lg shadow-sm">
        {/* Popup Messages */}
        {popupMessage && (
          <Popup
            message={popupMessage.message}
            type={popupMessage.type}
            onClose={popupMessage.onClose}
          />
        )}
        <div className="mb-4 bg-slate-100 p-2 rounded-lg">
          <div className="flex gap-2">
            <div className="w-4/5 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex gap-2">
                <label htmlFor="name" className="block text-md font-medium text-gray-700 flex-1">
                  Name
                  <input
                    type="text"
                    id="name"
                    name="name"
                    placeholder="Enter Name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>
                <div className="flex items-end">
                  {editingCategoryId === null ? (
                    <button
                      onClick={handleAddCategory}
                      className="bg-blue-900 text-white rounded-2xl p-2 text-sm flex items-center justify-center"
                    >
                      <PlusCircleIcon className="h-5 w-5 mr-1" /> Add Category
                    </button>
                  ) : (
                    <button
                      onClick={handleSaveEdit}
                      className="bg-blue-900 text-white rounded-2xl p-2 text-sm flex items-center justify-center"
                    >
                      <CheckCircleIcon className="h-5 w-5 mr-1" /> Update
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-3 bg-slate-100 px-3 py-2 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4">
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
                <th className="border p-2 text-left">Sr</th>
                <th className="border p-2 text-left">Category</th>
                <th className="border p-2 text-left">Created On</th>
                <th className="border p-2 text-left">Updated On</th>
                <th className="border p-2 text-left">Status</th>
                <th className="border p-2 text-left">Edit</th>
                <th className="border p-2 text-left">Access</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCategories.map((category, index) => (
                <tr key={category.id}>
                  <td className="border p-2">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                  <td className="border p-2">{category.name}</td>
                  <td className="border p-2">{formatDate(category.createdOn)}</td>
                  <td className="border p-2">{formatDate(category.updatedOn)}</td>
                  <td className="border p-2">{category.active === true ? 'Active' : 'Inactive'}</td>
                  <td className="border p-2">
                    <button onClick={() => handleEditCategory(category.id)} disabled={category.active === false}
                      className={`${category.active === false ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      <PencilIcon className="h-6 w-6 text-white bg-yellow-400 rounded-xl p-1" />
                    </button>
                  </td>
                  <td className="border p-2">
                    <button
                      onClick={() => handleToggleActiveStatus(category)}
                      className={`p-1 rounded-full ${category.active === true ? 'bg-green-500' : 'bg-red-500'}`}
                    >
                      {category.active === true ? (
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

      {modalVisible && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-500 bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Confirm Status Change</h2>
            <p>Are you sure you want to {categoryToToggle?.active === true ? 'inactivate' : 'activate'} the category <strong>{categoryToToggle.name}</strong>?</p>
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

export default Category;
