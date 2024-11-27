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
  PlusCircleIcon,
} from '@heroicons/react/24/solid';
import { DEPAETMENT_API, BRANCH_API } from '../API/apiConfig';

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

  // Retrieve token from localStorage
  const token = localStorage.getItem('tokenKey');

  useEffect(() => {
    fetchBranches();
    fetchDepartments();
  },[]);

  const fetchBranches = async () => {
    try {
      const response = await axios.get(`${BRANCH_API}/findActiveRole`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      setBranches(response.data);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await axios.get(`${DEPAETMENT_API}/findAll`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      setDepartments(response.data);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
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


  const handleBranchChange = (e) => {
    const selectedBranch = branches.find(branch => branch.id === parseInt(e.target.value));
    setFormData({ ...formData, branch: selectedBranch });
  };

  const handleAddDepartment = async () => {
    if (formData.name && formData.branch) {
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
        alert('Department added successfully!');
      } catch (error) {
        console.error('Error adding department:', error);
        alert('Failed to adding the Department. Please try again.');
      }
    } else {
      console.error('Form data is incomplete');
    }
  };

  const handleEditDepartment = (departmentId) => {
    // Set the ID of the department being edited
    setEditingIndex(departmentId);
    
    // Find the department in the original list by its ID to populate the form
    const departmentToEdit = departments.find(department => department.id === departmentId);
    
    // Populate the form with the department data (if found)
    if (departmentToEdit) {
      setFormData({
        name: departmentToEdit.name,
        branch: departmentToEdit.branch, // Ensure this is structured as needed
        isActive: departmentToEdit.isActive === 1, // Convert to boolean if needed
        id: departmentToEdit.id, // Ensure the ID is also in formData for updates
      });
    } else {
      console.error('Department not found for ID:', departmentId); // Log if the department is not found
    }
  };
  
  const handleSaveEdit = async () => {
    if (formData.name.trim() && formData.branch) {
      try {
        // Find the department in the original list by its ID
        const departmentIndex = departments.findIndex(department => department.id === formData.id);
  
        if (departmentIndex === -1) {
          alert('Department not found!');
          return;
        }
  
        // Create the updated department object
        const updatedDepartment = {
          ...departments[departmentIndex],
          name: formData.name,
          branch: formData.branch,
          isActive: formData.isActive ? 1 : 0,
          updatedOn: new Date().toISOString(),
        };
  
        // Send the update request to the server
        const response = await axios.put(`${DEPAETMENT_API}/update/${updatedDepartment.id}`, updatedDepartment, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
  
        // Update the original departments list with the updated department
        const updatedDepartments = departments.map(department =>
          department.id === updatedDepartment.id ? response.data : department
        );
  
        // Update the state with the modified departments array
        setDepartments(updatedDepartments);
        setFormData({ name: '', branch: null, isActive: true }); // Reset form data
        setEditingIndex(null); // Reset the editing state
        alert('Department updated successfully!');
      } catch (error) {
        console.error('Error updating department:', error.response ? error.response.data : error.message);
        alert('Failed to update the department. Please try again.');
      }
    } else {
      console.error('Form data is incomplete');
    }
  };
  


  const handleToggleActive = (department) => {
    setToggleDepartment(department);
    setModalVisible(true);
  };

  const confirmToggleActiveStatus = async () => {
    if (toggleDepartment) {
        try {
            const isActive = toggleDepartment.isActive === 1 ? 0 : 1;
            
            const token = localStorage.getItem('tokenKey');
            const response = await axios.put(
                `${DEPAETMENT_API}/updateDeptStatus/${toggleDepartment.id}`,
                isActive,  // Send only the isActive value
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                }
            );
            
            const updatedDepartments = departments.map(dept =>
                dept.id === toggleDepartment.id ? { ...dept, isActive: isActive } : dept
            );
            
            setDepartments(updatedDepartments);
            setModalVisible(false);
            setToggleDepartment(null);
            alert('Status changed successfully!');
        } catch (error) {
            console.error('Error toggling department status:', error.response ? error.response.data : error.message);
            alert('Failed to change the status. Please try again.');
        }
    } else {
        console.error('No department selected for status toggle');
    }
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
  const paginatedDepartments = sortedDepartments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="p-4">
      <h1 className="text-xl mb-4 font-semibold">DEPARTMENTS</h1>
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
            <select
              name="branch"
              value={formData.branch?.id || ''}
              onChange={handleBranchChange}
              className="p-2 border rounded-md outline-none"
            >
              <option value="">Select Branch</option>
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </div>
          <div className="mt-3 flex justify-start">
            {editingIndex === null ? (
              <button onClick={handleAddDepartment} className="bg-blue-900 text-white rounded-2xl p-2 flex items-center text-sm justify-center">
                <PlusCircleIcon className="h-5 w-5 mr-1" /> Add Department
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
                    <button onClick={() => handleEditDepartment(department.id)}>
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

      {/* Modal for Confirming Status Change */}
      {modalVisible && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-500 bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Confirm Status Change</h2>
            <p>Are you sure you want to {toggleDepartment.isActive === 1 ? 'deactivate' : 'activate'} the department <strong>{toggleDepartment.name}</strong>?</p>
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

export default Department;
