import { CATEGORI_API } from '../API/apiConfig';
import { ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, PencilIcon, PlusCircleIcon, LockClosedIcon, LockOpenIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Popup from '../Components/Popup';
import LoadingComponent from '../Components/LoadingComponent';

const tokenKey = 'tokenKey';

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
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState('');
  const [popupMessage, setPopupMessage] = useState(null);
  const [isConfirmDisabled, setIsConfirmDisabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const formSectionRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCategories();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Allow only letters and spaces, max 30 characters
    const regex = /^[A-Za-z\s]*$/;
    if ((regex.test(value) || value === "") && value.length <= 30) {
      setFormData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    } else if (value.length > 30) {
      showPopup('Category name cannot exceed 30 characters', 'error');
    }
  };

  const isDuplicateCategory = (name) => {
    return categories.some(category => 
      category.name.toLowerCase() === name.toLowerCase() && 
      category.id !== editingCategoryId
    );
  };

  const handleAddCategory = async () => {
    if (!formData.name.trim()) {
      showPopup('Please enter a category name!', 'warning');
      return;
    }

    if (isDuplicateCategory(formData.name)) {
      showPopup('Category with this name already exists!', 'error');
      return;
    }

    try {
      const response = await axios.post(`${CATEGORI_API}/save`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem(tokenKey)}`,
        },
      });

      setCategories([...categories, response.data]);
      setFormData({ name: '' });
      showPopup('Category added successfully!', "success");
    } catch (error) {
      console.error('Error adding category:', error.response ? error.response.data : error.message);
      showPopup('Failed to add the category. Please try again!', "error");
    }
  };

  const handleEditCategory = (categoryId) => {
    setEditingCategoryId(categoryId);
    const categoryToEdit = categories.find(category => category.id === categoryId);

    if (categoryToEdit) {
      setFormData({
        name: categoryToEdit.name,
      });
      
      // Scroll to form section
      if (formSectionRef.current) {
        formSectionRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!formData.name.trim()) {
      showPopup('Please enter a category name', 'warning');
      return;
    }

    if (isDuplicateCategory(formData.name)) {
      showPopup('Category with this name already exists!', 'error');
      return;
    }

    if (editingCategoryId !== null) {
      try {
        const categoryIndex = categories.findIndex(category => category.id === editingCategoryId);

        if (categoryIndex === -1) {
          showPopup('Category not found! Please try again!', "error");
          return;
        }

        const updatedCategory = {
          ...categories[categoryIndex],
          name: formData.name,
          updatedOn: new Date().toISOString(),
        };

        const response = await axios.put(`${CATEGORI_API}/update/${updatedCategory.id}`, updatedCategory, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem(tokenKey)}`,
          },
        });

        const updatedCategories = categories.map(category =>
          category.id === updatedCategory.id ? response.data : category
        );

        setCategories(updatedCategories);
        setFormData({ name: '' });
        setEditingCategoryId(null);
        showPopup('Category updated successfully!', "success");
      } catch (error) {
        console.error('Error updating category:', error.response ? error.response.data : error.message);
        showPopup('Failed to update the category. Please try again!', "error");
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
          active: categoryToToggle.active === true ? 0 : 1,
          updatedOn: new Date().toISOString(),
        };

        const token = localStorage.getItem(tokenKey);
        const response = await axios.put(
          `${CATEGORI_API}/updatestatus/${updatedCategory.id}`,
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
          showPopup('Category status changed successfully!', "success");
        } else {
          showPopup('Failed to change the category status. Please try again.', "error");
        }
      } catch (error) {
        console.error('Error toggling Category status:', error.response ? error.response.data : error.message);
        showPopup('Failed to change the category status. Please try again.', "error");
      }
    } else {
      console.error('No Category selected for status toggle');
      showPopup('No category selected for status toggle!', "error");
    }
  };

  const showPopup = (message, type = 'info') => {
    setPopupMessage({
      message,
      type,
      onClose: () => {
        setPopupMessage(null);
        
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

  const sortedCategories = filteredCategories.sort((a, b) => {
    if (b.active === a.active) {
      return 0;
    }
    return b.active ? 1 : -1;
  });

  const totalItems = sortedCategories.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedCategories = sortedCategories.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getPageNumbers = () => {
    const maxPageNumbers = 5;
    const startPage = Math.floor((currentPage - 1) / maxPageNumbers) * maxPageNumbers + 1;
    const endPage = Math.min(startPage + maxPageNumbers - 1, totalPages);
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  };

  if (isLoading) {
    return <LoadingComponent />;
  }

  return (
    <div className="px-2">
      <h1 className="text-lg mb-1 font-semibold">Categories</h1>
      <div className="bg-white p-4 rounded-lg shadow-sm">
        {popupMessage && (
          <Popup
            message={popupMessage.message}
            type={popupMessage.type}
            onClose={popupMessage.onClose}
          />
        )}

        {/* Form Section with ref */}
        <div ref={formSectionRef} className="mb-4 bg-slate-100 p-2 rounded-lg">
          <div className="flex gap-2">
            <div className="w-4/5 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex gap-2">
                <label htmlFor="name" className="block text-md font-medium text-gray-700 flex-1">
                  Name <span className="text-red-500">*</span>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    placeholder="Enter Name "
                    value={formData.name}
                    onChange={handleInputChange}
                    maxLength={30}
                    className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>
                <div className="flex items-end">
                  {editingCategoryId === null ? (
                     <button
                  onClick={handleAddCategory}
                  disabled={isSubmitting}
                  className={`bg-blue-900 text-white rounded-2xl p-2 w-full text-sm flex items-center justify-center ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isSubmitting ? (
                    'Adding...'
                  ) : (
                    <>
                      <PlusCircleIcon className="h-5 w-5 mr-1" /> Add
                    </>
                  )}
                </button>
                  ) : (
                    <button
                  onClick={handleSaveEdit}
                  disabled={isSubmitting}
                  className={`bg-blue-900 text-white rounded-2xl p-2 w-full text-sm flex items-center justify-center ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isSubmitting ? (
                    'Updating...'
                  ) : (
                    <>
                      <CheckCircleIcon className="h-5 w-5 mr-1" /> Update
                    </>
                  )}
                </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-3 bg-slate-100 px-3 py-2 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center bg-blue-500 rounded-lg w-full flex-1 md:w-1/2">
            <label htmlFor="itemsPerPage" className="mr-2 ml-2 text-white text-sm">
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
                    <button 
                      onClick={() => handleEditCategory(category.id)} 
                      disabled={category.active === false}
                      className={`${category.active === false ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
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

        <div className="flex items-center mt-4">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1 || totalPages === 0}
            className={`px-3 py-1 rounded mr-3 ${currentPage === 1 || totalPages === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"
              }`}
          >
            <ArrowLeftIcon className="inline h-4 w-4 mr-2 mb-1" />
            Previous
          </button>

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

          <span className="text-sm text-gray-700 mx-2">of {totalPages} pages</span>

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
            <p>Are you sure you want to {categoryToToggle?.active === true ? 'inactivate' : 'activate'} the category <strong>{categoryToToggle?.name}</strong>?</p>
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