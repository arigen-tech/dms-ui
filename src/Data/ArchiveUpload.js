import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_HOST } from '../API/apiConfig';
import Popup from '../Components/Popup';
import { CloudArrowUpIcon } from '@heroicons/react/24/outline';
import LoadingComponent from '../Components/LoadingComponent';

const ArchiveUpload = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [popupMessage, setPopupMessage] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [branchOptions, setBranchOptions] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  let [userRole, setUserRole] = useState(null);
  const [userBranch, setUserBranch] = useState(null);
  const [userDepartment, setUserDepartment] = useState(null);
  const [isLoading, setIsLoading] = useState(false);


  const initialFormData = {
    branchId: '',
    departmentId: '',
  };
  const [archiveCriteria, setArchiveCriteria] = useState(initialFormData);

  useEffect(() => {
    fetchUserDetails();
    fetchBranches();
  }, []);

  useEffect(() => {
    if (archiveCriteria.branchId) {
      fetchDepartments(archiveCriteria.branchId);
    }
  }, [archiveCriteria.branchId]);

  const fetchUserDetails = async () => {
    setIsLoading(true);

    try {
      const userId = localStorage.getItem("userId");
      const token = localStorage.getItem("tokenKey");
      const response = await axios.get(
        `${API_HOST}/employee/findById/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setUserRole(response.data.role);
      setUserBranch(response.data.branch);
      setUserDepartment(response.data.department);

      setArchiveCriteria(prev => ({
        ...prev,
        branchId: response.data.branch?.id || '',
        departmentId: response.data.department?.id || ''
      }));

      if (response.data.branch?.id) {
        fetchDepartments(response.data.branch.id);
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
      showPopup("Failed to fetch user details", "error");
    }finally{
    setIsLoading(false);

    }
  };

  const fetchBranches = async () => {
    setIsLoading(true);

    try {
      const token = localStorage.getItem('tokenKey');
      const response = await axios.get(`${API_HOST}/branchmaster/findAll`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBranchOptions(response.data);
    } catch (error) {
      console.error('Error fetching branches:', error);
      showPopup('Failed to fetch branches', 'error');
    }finally{
    setIsLoading(false);

    }
  };
  if (isLoading) {
    return <LoadingComponent />;
  }

  const fetchDepartments = async (branchId) => {
    try {
      const token = localStorage.getItem('tokenKey');
      const response = await axios.get(
        `${API_HOST}/DepartmentMaster/findByBranch/${branchId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setDepartmentOptions(response.data);
    } catch (error) {
      console.error('Error fetching departments:', error);
      showPopup('Failed to fetch departments', 'error');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setArchiveCriteria(prev => ({
      ...prev,
      [name]: value,
      ...(name === "branchId" && { departmentId: "" }),
    }));
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const fileName = file.name.toLowerCase();
      const isValidZip = fileName.endsWith('.zip');
      if (isValidZip) {
        setSelectedFile(file);
      } else {
        showPopup('Please select a valid ZIP file', 'error');
      }
    } else {
      showPopup('No file selected', 'error');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      showPopup('Please select a file to upload', 'error');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    // Determine which endpoint to use based on admin's selections
    const isAdmin = userRole === 'ADMIN';
    const hasSelectedBranchDept = archiveCriteria.branchId && archiveCriteria.departmentId;
    const endpoint = isAdmin && !hasSelectedBranchDept ? '/restore/all' : '/restore/upload';

    // Add parameters based on endpoint
    if (endpoint === '/restore/upload') {
      formData.append('branchId', archiveCriteria.branchId);
      formData.append('departmentId', archiveCriteria.departmentId);
      formData.append('userRole', userRole);
    }

    try {
      const token = localStorage.getItem('tokenKey');
      await axios.post(`${API_HOST}${endpoint}`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        }
      });

      showPopup('Archive restored successfully', 'success');
      setSelectedFile(null);
      setUploadProgress(0);
    } catch (error) {
      console.error('Error restoring archive:', error);
      showPopup(error.response?.data?.message || 'Failed to restore archive', 'error');
    } finally {
      setUploading(false);
    }
  };

  const showPopup = (message, type = 'info') => {
    setPopupMessage({ message, type });
  };

  userRole = localStorage.getItem('role');
  const renderArchiveFields = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 bg-slate-100 p-6 rounded-lg">
        {userRole === "BRANCH ADMIN" ? (
          <>
            <div className="flex flex-col">
              <label className="mb-1" htmlFor="branch">
                Branch
              </label>
              <select
                id="branchId"
                name="branchId"
                value={archiveCriteria.branchId}
                onChange={handleInputChange}
                className="p-2 border rounded-md outline-none"
                disabled={true}
              >
                <option value={userBranch?.id}>{userBranch?.name}</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label className="mb-1" htmlFor="department">
                Department
              </label>
              <select
                id="departmentId"
                name="departmentId"
                onChange={handleInputChange}
                className="p-2 border rounded-md outline-none"
              >
                <option value="">Select Department</option>
                {departmentOptions.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : userRole === "DEPARTMENT ADMIN" || userRole === "USER" ? (
          <>
            <div className="flex flex-col">
              <label className="mb-1" htmlFor="branch">
                Branch
              </label>
              <select
                id="branchId"
                name="branchId"
                value={archiveCriteria.branchId}
                onChange={handleInputChange}
                className="p-2 border rounded-md outline-none"
                disabled={true}
              >
                <option value={userBranch?.id}>{userBranch?.name}</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label className="mb-1" htmlFor="department">
                Department
              </label>
              <select
                id="departmentId"
                name="departmentId"
                value={archiveCriteria.departmentId}
                onChange={handleInputChange}
                className="p-2 border rounded-md outline-none"
                disabled={true}
              >
                <option value={userDepartment?.id}>
                  {userDepartment?.name}
                </option>
              </select>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col">
              <label className="mb-1" htmlFor="branch">
                Branch
              </label>
              <select
                id="branchId"
                name="branchId"
                value={archiveCriteria.branchId}
                onChange={handleInputChange}
                className="p-2 border rounded-md outline-none"
              >
                <option value="">Select Branch</option>
                {branchOptions.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="mb-1" htmlFor="department">
                Department
              </label>
              <select
                id="departmentId"
                name="departmentId"
                value={archiveCriteria.departmentId}
                onChange={handleInputChange}
                className="p-2 border rounded-md outline-none"
                disabled={!archiveCriteria.branchId}
              >
                <option value="">Select Department</option>
                {departmentOptions.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    
      <div className="px-2">
      <h1 className="text-2xl mb-1 font-semibold">Upload Archive</h1>
      <div className="bg-white p-1 rounded-lg shadow-sm">

        {popupMessage && (
          <Popup
            message={popupMessage.message}
            type={popupMessage.type}
            onClose={() => setPopupMessage(null)}
          />
        )}

        <div className="mb-6">
          {renderArchiveFields()}

          <div className="max-w-xl bg-slate-100 p-6 rounded-lg mt-6">
            <div className="flex items-center justify-center w-full">

              <label
                className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-gray-50"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.classList.add('border-blue-500', 'bg-blue-50');
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');

                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    const file = e.dataTransfer.files[0];
                    if (file.name.toLowerCase().endsWith('.zip')) {
                      setSelectedFile(file);
                    } else {
                      showPopup('Please select a valid ZIP file', 'error');
                    }
                  }
                }}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <CloudArrowUpIcon className="w-10 h-10 mb-3 text-gray-400" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">ZIP file only</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".zip"
                  onChange={handleFileSelect}
                  disabled={uploading}
                />
              </label>
            </div>
            {selectedFile && (
              <div className="mt-4">
                <p className="text-sm text-gray-600">Selected file: {selectedFile.name}</p>
              </div>
            )}
            {uploadProgress > 0 && (
              <div className="w-full mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-2">{uploadProgress}% uploaded</p>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleUpload}
          disabled={uploading || !selectedFile}
          className={`bg-blue-900 text-white rounded-lg py-3 px-6 hover:bg-blue-800 transition duration-300 shadow-md hover:shadow-lg flex items-center justify-center w-full md:w-auto ${(uploading || !selectedFile) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
        >
          {uploading ? 'Restoring...' : 'Restore Archive'}
        </button>
      </div>
    </div>
  );
};

export default ArchiveUpload;