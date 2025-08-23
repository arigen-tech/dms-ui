import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  LockClosedIcon,
  LockOpenIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PlusCircleIcon,
} from '@heroicons/react/24/solid';
import { DEPAETMENT_API, BRANCH_API } from '../API/apiConfig';
import Popup from '../Components/Popup';
import LoadingComponent from '../Components/LoadingComponent';

const Department = () => {
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    branch: null,
    isActive: true,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [toggleDepartment, setToggleDepartment] = useState(null);
  const [popupMessage, setPopupMessage] = useState(null);
  const [isConfirmDisabled, setIsConfirmDisabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // For button disabling
  const formSectionRef = useRef(null);

  // Retrieve token from localStorage
  const token = localStorage.getItem('tokenKey');

  useEffect(() => {
    fetchBranches();
    fetchDepartments();
  }, []);

  const fetchBranches = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${BRANCH_API}/findActiveRole`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      setBranches(response.data);
    } catch (error) {
      console.error('Error fetching branches:', error);
      showPopup('Failed to fetch branches', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDepartments = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${DEPAETMENT_API}/findAll`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      setDepartments(response.data);
    } catch (error) {
      console.error('Error fetching departments:', error);
      showPopup('Failed to fetch departments', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingComponent />;
  }

  const showPopup = (message, type = 'info') => {
    setPopupMessage({
      message,
      type,
      onClose: () => {
        setPopupMessage(null);
        
      }
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Allow only letters and spaces, max 30 chars
    const regex = /^[A-Za-z\s]*$/;
    if ((regex.test(value) || value === "") && value.length <= 30) {
      setFormData(prev => ({ ...prev, [name]: value }));
    } else if (value.length > 30) {
      showPopup('Department name cannot exceed 30 characters', 'error');
    }
  };

  const handleBranchChange = (e) => {
    const selectedBranch = branches.find(branch => branch.id === parseInt(e.target.value));
    setFormData(prev => ({ ...prev, branch: selectedBranch }));
  };

  const isDuplicateDepartment = (name, branchId) => {
    return departments.some(dept => {
      // Exclude current department being edited from duplicate check
      const isEditingCurrent = editingIndex && dept.id === editingIndex;
      return !isEditingCurrent && 
             dept.name.toLowerCase() === name.toLowerCase() && 
             dept.branch?.id === branchId;
    });
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      showPopup('Please enter a department name', 'warning');
      return false;
    }

    if (!formData.branch) {
      showPopup('Please select a branch', 'warning');
      return false;
    }

    if (isDuplicateDepartment(formData.name, formData.branch.id)) {
      showPopup('Department with this name already exists in the selected branch', 'error');
      return false;
    }

    return true;
  };

  const handleAddDepartment = async () => {
    if (!validateForm() || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const newDepartment = {
        name: formData.name,
        branch: formData.branch,
        createdOn: new Date().toISOString(),
        updatedOn: new Date().toISOString(),
        isActive: formData.isActive ? 1 : 0,
      };

      const response = await axios.post(`${DEPAETMENT_API}/save`, newDepartment, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      setDepartments([...departments, response.data]);
      setFormData({ name: '', branch: null, isActive: true });
      showPopup('Department added successfully!', "success");
    } catch (error) {
      console.error('Error adding department:', error.response ? error.response.data : error.message);
      showPopup('Failed to add the Department. Please try again.', "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditDepartment = (departmentId) => {
    setEditingIndex(departmentId);
    const departmentToEdit = departments.find(department => department.id === departmentId);

    if (departmentToEdit) {
      setFormData({
        name: departmentToEdit.name,
        branch: departmentToEdit.branch,
        isActive: departmentToEdit.isActive === 1,
        id: departmentToEdit.id,
      });
      
      // Scroll to form section
      if (formSectionRef.current) {
        formSectionRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!validateForm() || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const departmentIndex = departments.findIndex(department => department.id === formData.id);

      if (departmentIndex === -1) {
        showPopup('Department not found!', 'error');
        return;
      }

      const updatedDepartment = {
        ...departments[departmentIndex],
        name: formData.name,
        branch: formData.branch,
        isActive: formData.isActive ? 1 : 0,
        updatedOn: new Date().toISOString(),
      };

      const response = await axios.put(`${DEPAETMENT_API}/update/${updatedDepartment.id}`, updatedDepartment, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const updatedDepartments = departments.map(department =>
        department.id === updatedDepartment.id ? response.data : department
      );

      setDepartments(updatedDepartments);
      setFormData({ name: '', branch: null, isActive: true });
      setEditingIndex(null);
      showPopup('Department updated successfully!', "success");
    } catch (error) {
      console.error('Error updating department:', error.response ? error.response.data : error.message);
      showPopup('Failed to update the department. Please try again.', "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = (department) => {
    setToggleDepartment(department);
    setModalVisible(true);
  };

  const confirmToggleActiveStatus = async () => {
    setIsConfirmDisabled(true);
    if (toggleDepartment) {
      try {
        const isActive = toggleDepartment.isActive === 1 ? 0 : 1;

        const response = await axios.put(
          `${DEPAETMENT_API}/updateDeptStatus/${toggleDepartment.id}`,
          isActive,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        const updatedDepartments = departments.map(dept =>
          dept.id === toggleDepartment.id ? { ...dept, isActive } : dept
        );

        setDepartments(updatedDepartments);
        setModalVisible(false);
        setToggleDepartment(null);
        showPopup('Status changed successfully!', "success");
      } catch (error) {
        console.error('Error toggling department status:', error.response ? error.response.data : error.message);
        showPopup('Failed to change the status. Please try again.', "error");
      } finally {
        setIsConfirmDisabled(false);
      }
    } else {
      showPopup('No department selected for status toggle.', "warning");
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
    };
    return date.toLocaleString('en-GB', options).replace(',', '');
  };

  const filteredDepartments = departments.filter(department => {
    const statusText = department.isActive === 1 ? 'active' : 'inactive';
    const createdOnText = formatDate(department.createdOn);
    const updatedOnText = formatDate(department.updatedOn);

    return (
      department.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      department.branch?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      statusText.includes(searchTerm.toLowerCase()) ||
      createdOnText.includes(searchTerm.toLowerCase()) ||
      updatedOnText.includes(searchTerm.toLowerCase())
    );
  });

  const sortedDepartments = filteredDepartments.sort((a, b) => b.isActive - a.isActive);

  const totalItems = sortedDepartments.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedDepartments = sortedDepartments.slice(
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
      <h1 className="text-lg mb-1 font-semibold">DEPARTMENTS</h1>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        {popupMessage && (
          <Popup
            message={popupMessage.message}
            type={popupMessage.type}
            onClose={popupMessage.onClose}
          />
        )}

        {/* Form Section */}
        <div ref={formSectionRef} className="mb-4 bg-slate-100 p-2 rounded-lg">
          <div className="flex gap-6">
            <div className="w-4/5 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <label htmlFor="name" className="block text-md font-medium text-gray-700 flex-1">
                Name <span className="text-red-500">*</span>
                <input
                  type="text"
                  id="name"
                  name="name"
                  placeholder="Enter department name"
                  value={formData.name}
                  onChange={handleInputChange}
                  maxLength={30}
                  className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>

              <label htmlFor="branch" className="block text-md font-medium text-gray-700">
                Branch <span className="text-red-500">*</span>
                <select
                  id="branch"
                  name="branch"
                  value={formData.branch?.id || ''}
                  onChange={handleBranchChange}
                  className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Branch</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex items-end">
              {editingIndex === null ? (
                <button 
                  onClick={handleAddDepartment} 
                  disabled={isSubmitting}
                  className={`bg-blue-900 text-white rounded-2xl p-2 w-full text-sm flex items-center justify-center ${
                    isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isSubmitting ? (
                    'Adding...'
                  ) : (
                    <>
                      <PlusCircleIcon className="h-5 w-5 mr-1" /> Add Department
                    </>
                  )}
                </button>
              ) : (
                <button 
                  onClick={handleSaveEdit} 
                  disabled={isSubmitting}
                  className={`bg-blue-900 text-white rounded-2xl p-2 text-sm flex items-center justify-center ${
                    isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
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

        {/* Search and Items Per Page Section */}
        <div className="mb-4 bg-slate-100 p-4 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4">
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

        {/* Departments Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-slate-100">
                <th className="border p-2 text-left">SR.</th>
                <th className="border p-2 text-left">Department</th>
                <th className="border p-2 text-left">Branch</th>
                <th className="border p-2 text-left">Created On</th>
                <th className="border p-2 text-left">Updated On</th>
                <th className="border p-2 text-left">Status</th>
                <th className="border p-2 text-left">Edit</th>
                <th className="border p-2 text-left">Access</th>
              </tr>
            </thead>
            <tbody>
              {paginatedDepartments.map((department, index) => (
                <tr key={department.id}>
                  <td className="border p-2">{index + 1 + (currentPage - 1) * itemsPerPage}</td>
                  <td className="border p-2">{department.name}</td>
                  <td className="border p-2">{department.branch?.name || ''}</td>
                  <td className="border px-4 py-2">{formatDate(department.createdOn)}</td>
                  <td className="border px-4 py-2">{formatDate(department.updatedOn)}</td>
                  <td className="border p-2">{department.isActive === 1 ? 'Active' : 'Inactive'}</td>
                  <td className="border p-2">
                    <button 
                      onClick={() => handleEditDepartment(department.id)} 
                      disabled={department.isActive === 0}
                      className={`${department.isActive === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <PencilIcon className="h-6 w-6 text-white bg-yellow-400 rounded-xl p-1" />
                    </button>
                  </td>
                  <td className="border p-2">
                    <button
                      onClick={() => handleToggleActive(department)}
                      className={`p-1 rounded-full ${department.isActive === 1 ? 'bg-green-500' : 'bg-red-500'}`}
                    >
                      {department.isActive === 1 ? (
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
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1 || totalPages === 0}
            className={`px-3 py-1 rounded mr-3 ${currentPage === 1 || totalPages === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"}`}
          >
            <ArrowLeftIcon className="inline h-4 w-4 mr-2 mb-1" />
            Previous
          </button>

          {totalPages > 0 && getPageNumbers().map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1 rounded mx-1 ${currentPage === page ? "bg-blue-500 text-white" : "bg-slate-200 hover:bg-blue-100"}`}
            >
              {page}
            </button>
          ))}

          <span className="text-sm text-gray-700 mx-2">of {totalPages} pages</span>

          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages || totalPages === 0}
            className={`px-3 py-1 rounded ml-3 ${currentPage === totalPages || totalPages === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"}`}
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

      {/* Modal for Confirming Status Change */}
      {modalVisible && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-500 bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Confirm Status Change</h2>
            <p>Are you sure you want to {toggleDepartment?.isActive === 1 ? 'deactivate' : 'activate'} the department <strong>{toggleDepartment?.name}</strong>?</p>
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
                className={`bg-blue-500 text-white rounded-md px-4 py-2 ${isConfirmDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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

export default Department;