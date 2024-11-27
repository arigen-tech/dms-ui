import { CATEGORI_API } from '../API/apiConfig';
import { ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, PencilIcon, PlusCircleIcon, LockClosedIcon, LockOpenIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import React, { useState, useEffect } from 'react';
import axios from 'axios';

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

  useEffect(() => {
    const fetchCategories = async () => {
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
      }
    };
    fetchCategories();
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

  const handleAddCategory = async () => {
    if (formData.name.trim()) {
      try {
        const response = await axios.post(`${CATEGORI_API}/save`, formData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem(tokenKey)}`,
          },
        });
        setCategories([...categories, response.data]);
        setFormData({ name: '' });
        alert('Categories added successfully!');
      } catch (error) {
        console.error('Error adding category:', error.response ? error.response.data : error.message);
        alert('Failed to adding the Categories. Please try again.');
      }
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
        // Add other form fields as needed
      });
    }
  };
  const handleSaveEdit = async () => {
    if (formData.name.trim() && editingCategoryId !== null) {
      try {
        // Find the category in the original list by its ID
        const categoryIndex = categories.findIndex(category => category.id === editingCategoryId);

        if (categoryIndex === -1) {
          alert('Category not found!');
          return;
        }

        // Create the updated category object
        const updatedCategory = {
          ...categories[categoryIndex],
          name: formData.name,
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
        alert('Category updated successfully!');
      } catch (error) {
        console.error('Error updating category:', error.response ? error.response.data : error.message);
        alert('Failed to update the category. Please try again.');
      }
    }
  };


  const handleToggleActiveStatus = (category) => {
    setCategoryToToggle(category);
    setModalVisible(true);
  };

  const confirmToggleActiveStatus = async () => {
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
              'Content-Category': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const updatedCategories = categories.map(category =>
          category.id === updatedCategory.id ? response.data : category
        );
        setCategories(updatedCategories);
        setModalVisible(false);
        setCategoryToToggle(null);
        alert('Status Changed successfully!');
      } catch (error) {
        console.error('Error toggling Category status:', error.response ? error.response.data : error.message);
        alert('Failed to changing the status. Please try again.');
      }
    } else {
      console.error('No Category selected for status toggle');
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

  return (
    <div className="p-1">
      <h1 className="text-xl mb-4 font-semibold">CATEGORIES</h1>
      <div className="bg-white p-3 rounded-lg shadow-sm">
        <div className="mb-4 bg-slate-100 p-4 rounded-lg">
          <div className="grid grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="p-2 border rounded-md outline-none"
            />
          </div>
          <div className="mt-3 flex justify-start">
            {editingCategoryId === null ? (
              // Button to add a new category
              <button
                onClick={handleAddCategory}
                className="bg-blue-900 text-white rounded-2xl p-2 flex items-center text-sm justify-center"
              >
                <PlusCircleIcon className="h-5 w-5 mr-1" /> Add Category
              </button>
            ) : (
              // Button to update an existing category
              <button
                onClick={handleSaveEdit}
                className="bg-blue-900 text-white rounded-2xl p-2 flex items-center text-sm justify-center"
              >
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
                    <button onClick={() => handleEditCategory(category.id)}>
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

export default Category;
