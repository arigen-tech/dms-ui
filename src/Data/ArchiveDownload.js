import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { CalendarIcon } from '@heroicons/react/24/outline';
import { API_HOST } from '../API/apiConfig';
import Popup from '../Components/Popup';
import { FILETYPE_API } from '../API/apiConfig';


const ArchiveDownload = () => {
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const initialFormData = {
    branchId: '',
    departmentId: '',
    startDate: null,
    endDate: null,
    fileTypes: [], // Add fileTypes
  };
  const [archiveCriteria, setArchiveCriteria] = React.useState(initialFormData);
  let [userRole, setUserRole] = useState(null);
  const [branchOptions, setBranchOptions] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [popupMessage, setPopupMessage] = useState(null);
  const [userBranch, setUserBranch] = useState(null);
  const [userDepartment, setUserDepartment] = useState(null);
  const [loading, setLoading] = useState(false);

  const [allArchiveFromDate, setAllArchiveFromDate] = useState(null);
  const [allArchiveToDate, setAllArchiveToDate] = useState(null);
  const [allArchiveLoading, setAllArchiveLoading] = useState(false);
  const [fileTypes, setFileTypes] = useState([]);
  const [selectedFileTypes, setSelectedFileTypes] = useState([]);
  const [selectAllFileTypes, setSelectAllFileTypes] = useState(false);
  const [selectedAllArchiveFileTypes, setSelectedAllArchiveFileTypes] = useState([]);
  const [selectAllArchiveFileTypes, setSelectAllArchiveFileTypes] = useState(false);

  const [selectedFileType, setSelectedFileType] = useState('');
  const [availableExtensions, setAvailableExtensions] = useState([]);
  const [selectedRegularFileType, setSelectedRegularFileType] = useState('');
  const [selectedAllArchiveFileType, setSelectedAllArchiveFileType] = useState('');
  const [regularFileTypes, setRegularFileTypes] = useState([]);
  const [allArchiveFileTypes, setAllArchiveFileTypes] = useState([]);
  const [extensionSectionOpen, setExtensionSectionOpen] = useState(false);
  const [allExtensions, setAllExtensions] = useState([]);
  
  


  useEffect(() => {
    fetchUserDetails();
    fetchBranches();
    fetchFileTypes();
  }, []);

  // useEffect(() => {
  //   setArchiveCriteria(prev => ({
  //     ...prev,
  //     fromDate: fromDate ? fromDate.toISOString().split('T')[0] : '',
  //     toDate: toDate ? toDate.toISOString().split('T')[0] : ''
  //   }));
  // }, [fromDate, toDate]);

  const fetchFileTypes = async () => {
    try {
      const token = localStorage.getItem('tokenKey');
      const response = await axios.get(`${FILETYPE_API}/getAllActive`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      setFileTypes(response.data.response);
      
      // Extract all unique extensions
      const extensions = response.data.response.map(item => item.extension);
      setAllExtensions(extensions);
    } catch (error) {
      console.error('Error fetching Files Types:', error);
      showPopup('Failed to fetch file types', 'error');
    }
  };

  const groupedFileTypes = fileTypes.reduce((acc, curr) => {
    if (!acc[curr.filetype]) {
      acc[curr.filetype] = [];
    }
    acc[curr.filetype].push(curr.extension);
    return acc;
  }, {});

  const handleSelectAllExtensions = (fileType, isAllArchive) => {
    if (fileType === 'all') {
      // If selecting all file types, include all extensions
      if (isAllArchive) {
        setAllArchiveFileTypes(prev => 
          prev.length === allExtensions.length ? [] : [...allExtensions]
        );
      } else {
        setRegularFileTypes(prev => 
          prev.length === allExtensions.length ? [] : [...allExtensions]
        );
        setArchiveCriteria(prev => ({
          ...prev,
          fileTypes: prev.fileTypes.length === allExtensions.length ? [] : [...allExtensions]
        }));
      }
    } else {
      // Handle individual file type selection
      const extensions = groupedFileTypes[fileType] || [];
      if (isAllArchive) {
        setAllArchiveFileTypes(prev => 
          prev.length === extensions.length ? [] : extensions
        );
      } else {
        setRegularFileTypes(prev => 
          prev.length === extensions.length ? [] : extensions
        );
        setArchiveCriteria(prev => ({
          ...prev,
          fileTypes: prev.fileTypes.length === extensions.length ? [] : extensions
        }));
      }
    }
  };


  const handleFileTypeSelect = (fileType, isAllArchive) => {
    if (isAllArchive) {
      setSelectedAllArchiveFileType(fileType);
      setAllArchiveFileTypes([]); // Reset selections when changing file type
    } else {
      setSelectedRegularFileType(fileType);
      setRegularFileTypes([]); // Reset selections when changing file type
      setArchiveCriteria(prev => ({
        ...prev,
        fileTypes: []
      }));
    }
  };

  const handleExtensionChange = (extension, isAllArchive) => {
    if (isAllArchive) {
      setAllArchiveFileTypes(prev => 
        prev.includes(extension)
          ? prev.filter(ext => ext !== extension)
          : [...prev, extension]
      );
    } else {
      setRegularFileTypes(prev => 
        prev.includes(extension)
          ? prev.filter(ext => ext !== extension)
          : [...prev, extension]
      );
      setArchiveCriteria(prev => ({
        ...prev,
        fileTypes: prev.fileTypes.includes(extension)
          ? prev.fileTypes.filter(ext => ext !== extension)
          : [...prev.fileTypes, extension]
      }));
    }
  };

  const handleFileTypeClick = (fileType, isAllArchive) => {
    if ((isAllArchive ? selectedAllArchiveFileType : selectedRegularFileType) === fileType) {
      setExtensionSectionOpen(!extensionSectionOpen);
    } else {
      handleFileTypeSelect(fileType, isAllArchive);
      setExtensionSectionOpen(true);
    }
  };

  const fetchUserDetails = async () => {
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
    }
  };

  useEffect(() => {
    // Pre-fill searchCriteria with userBranch and userDepartment
    setArchiveCriteria((prev) => ({
      ...prev,
      branch: userBranch?.id || "",
      branchName: userBranch?.name || "",
      department: userDepartment?.id || "",
      departmentName: userDepartment?.name || "",
    }));
  }, [userBranch, userDepartment]);

  useEffect(() => {
    if (userRole === "BRANCH ADMIN" && userBranch?.id) {
      setArchiveCriteria((prev) => ({
        ...prev,
        branch: userBranch.id,
      }));
      fetchDepartments(userBranch.id);
    }
  }, [userRole, userBranch]);

  useEffect(() => {
    if (userRole === "DEPARTMENT ADMIN" || userRole === "USER") {
      if (userBranch?.id) {
        setArchiveCriteria((prev) => ({
          ...prev,
          branch: userBranch.id,
          department: userDepartment?.id || "",
        }));
        fetchDepartments(userBranch.id);
      }
    }
  }, [userRole, userBranch, userDepartment]);

  useEffect(() => {
    if (archiveCriteria.branchId) {
      fetchDepartments(archiveCriteria.branchId);
    }
  }, [archiveCriteria.branchId]);

  const fetchBranches = async () => {
    try {
      const token = localStorage.getItem('tokenKey');
      const response = await axios.get(`${API_HOST}/branchmaster/findAll`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBranchOptions(response.data);
    } catch (error) {
      console.error('Error fetching branches:', error);
      showPopup('Failed to fetch branches', 'error');
    }
  };

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

  // const handleInputChange = (e) => {
  //   const { name, value } = e.target;
  //   setArchiveCriteria({ ...archiveCriteria, [name]: value });
  // };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setArchiveCriteria((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "branchId" && { department: "" }),
    }));
  };

  const handleDownload = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('tokenKey');
  
      // Create a URLSearchParams instance
      const params = new URLSearchParams();
  
      // Add required parameters
      params.append('branchId', archiveCriteria.branchId);
      params.append('userRole', userRole);
      
      // Add optional departmentId if present
      if (archiveCriteria.departmentId) {
        params.append('departmentId', archiveCriteria.departmentId);
      }
  
      // Add dates if present
      if (fromDate) {
        // Format date as YYYY-MM-DD
        const formattedFromDate = fromDate.toISOString().split('T')[0];
        params.append('fromDate', formattedFromDate);
      }
  
      if (toDate) {
        // Format date as YYYY-MM-DD
        const formattedToDate = toDate.toISOString().split('T')[0];
        params.append('toDate', formattedToDate);
      }
  
      // Add fileTypes - backend expects Set<String>
      regularFileTypes.forEach(fileType => {
        params.append('fileTypes', fileType);
      });
  
      const response = await axios.get(`${API_HOST}/archive/download`, {
        params: params,
        headers: {
          Authorization: `Bearer ${token}`
        },
        responseType: 'blob',
      });
  
      // Handle successful download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `archive_${new Date().toISOString()}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showPopup('Archive downloaded successfully', 'success');
    } catch (error) {
      console.error('Error downloading archive:', error);
      showPopup('Failed to download archive', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDownloadAll = async () => {
    setAllArchiveLoading(true);
    try {
      const token = localStorage.getItem('tokenKey');
  
      // Create a URLSearchParams instance
      const params = new URLSearchParams();
  
      // Add dates if present
      if (allArchiveFromDate) {
        // Format date as YYYY-MM-DD
        const formattedFromDate = allArchiveFromDate.toISOString().split('T')[0];
        params.append('fromDate', formattedFromDate);
      }
  
      if (allArchiveToDate) {
        // Format date as YYYY-MM-DD
        const formattedToDate = allArchiveToDate.toISOString().split('T')[0];
        params.append('toDate', formattedToDate);
      }
  
      // Add fileTypes - backend expects Set<String>
      allArchiveFileTypes.forEach(fileType => {
        params.append('fileTypes', fileType);
      });
  
      const response = await axios.get(`${API_HOST}/archive/download/all`, {
        params: params,
        headers: {
          Authorization: `Bearer ${token}`
        },
        responseType: 'blob',
      });
  
      // Handle successful download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `all_archives_${new Date().toISOString()}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showPopup('All archives downloaded successfully', 'success');
    } catch (error) {
      console.error('Error downloading all archives:', error);
      showPopup('Failed to download all archives', 'error');
    } finally {
      setAllArchiveLoading(false);
    }
  };

  const showPopup = (message, type = 'info') => {
    setPopupMessage({ message, type });
  };

  const CustomInput = React.forwardRef(({ value, onClick, placeholder, disabled }, ref) => (
    <div className="relative">
      <input
        type="text"
        ref={ref}
        onClick={onClick}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        readOnly
        className="block w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm pl-10 cursor-pointer"
      />
      <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 pointer-events-none" />
    </div>
  ));

  const commonInputClasses = "block w-full h-[46px] px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm";
  const commonLabelClasses = "block text-md font-medium text-gray-700 mb-2";
  const commonWrapperClasses = "relative flex flex-col";

  const renderArchiveFields = () => {
    const CustomInput = React.forwardRef(({ value, onClick, placeholder, disabled }, ref) => (
      <div className="relative">
        <input
          type="text"
          ref={ref}
          onClick={onClick}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          readOnly
          className="block w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm pl-10 cursor-pointer"
        />
        <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 pointer-events-none" />
      </div>
    ));
    userRole = localStorage.getItem('role');
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

        <div className={commonWrapperClasses}>
          <label className={commonLabelClasses} htmlFor="fromDate">
            From Date
          </label>
          <DatePicker
            id="fromDate"
            selected={fromDate}
            onChange={(date) => setFromDate(date)}
            selectsStart
            startDate={fromDate}
            endDate={toDate}
            maxDate={new Date()}
            dateFormat="dd/MM/yyyy"
            placeholderText="Select a start date"
            customInput={<CustomInput />}
          />
        </div>

        <div className={commonWrapperClasses}>
          <label className={commonLabelClasses} htmlFor="toDate">
            To Date
          </label>
          <DatePicker
            id="endDate"
            selected={toDate}
            onChange={(date) => setToDate(date)}
            selectsEnd
            startDate={fromDate}
            endDate={toDate}
            dateFormat="dd-MM-yyyy"
            placeholderText="End Date"
            // maxDate={new Date()} // Prevents selecting dates later than today
            // className="w-full px-3 py-2 border rounded-md"
            customInput={<CustomInput />}
          />
        </div>
      </div>
    );
  };

  // Add this new section to renderArchiveFields for file type 
  const renderFileTypeSelection = (isAllArchive = false) => {
    const selectedFileType = isAllArchive ? selectedAllArchiveFileType : selectedRegularFileType;
    const selectedTypes = isAllArchive ? allArchiveFileTypes : regularFileTypes;
    const availableExtensions = selectedFileType === 'all' 
      ? allExtensions 
      : (groupedFileTypes[selectedFileType] || []);
    const areAllSelected = availableExtensions.length > 0 && 
      availableExtensions.every(ext => selectedTypes.includes(ext));
    
    return (
      <div className="mb-6 bg-slate-100 p-4 sm:p-6 lg:p-8 rounded-xl shadow-sm">
        <label className="block text-lg font-semibold text-gray-800 mb-4">
          File Types
        </label>
        
        <div className="space-y-4">
          {/* Enhanced Select All button */}
          <div className="mb-4">
            <button
              onClick={() => {
                handleFileTypeClick('all', isAllArchive);
                // Add a subtle animation class
                const btn = document.getElementById('selectAllBtn');
                btn.classList.add('animate-refresh');
                setTimeout(() => btn.classList.remove('animate-refresh'), 500);
              }}
              id="selectAllBtn"
              className={`
                w-full px-4 py-3 rounded-lg
                font-medium text-sm transition-all duration-200
                shadow-sm hover:shadow-md
                ${selectedFileType === 'all' 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-white text-blue-600 '
                }
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                transform hover:-translate-y-0.5
                flex items-center justify-center gap-2
              `}
            >
              <svg
                className={`w-5 h-5 ${selectedFileType === 'all' ? 'text-white' : 'text-blue-600'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
              <span>Select All File Types</span>
            </button>
          </div>
  
          {/* Rest of the component remains the same */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
            {Object.keys(groupedFileTypes).map((fileType) => (
              <div
                key={fileType}
                onClick={() => handleFileTypeClick(fileType, isAllArchive)}
                className={`bg-white px-3 py-2 rounded-lg shadow-sm cursor-pointer transition-all duration-200
                  hover:-translate-y-0.5 text-center
                  ${selectedFileType === fileType ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
              >
                <span className="text-gray-700 text-sm font-medium">{fileType}</span>
              </div>
            ))}
          </div>
  
          {/* Extensions Section */}
          {selectedFileType && extensionSectionOpen && (
            <div className="mt-4 bg-white rounded-lg p-4">
              <div className="flex flex-wrap justify-between items-center mb-3">
                <h3 className="text-sm font-medium text-gray-700 mb-2 sm:mb-0">
                  {selectedFileType === 'all' ? 'All Available Extensions' : `Available Extensions for ${selectedFileType}`}
                </h3>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id={`select-all-${isAllArchive}`}
                    checked={areAllSelected}
                    onChange={() => handleSelectAllExtensions(selectedFileType, isAllArchive)}
                    className="h-4 w-4 rounded accent-blue-600"
                  />
                  <label
                    htmlFor={`select-all-${isAllArchive}`}
                    className="ml-2 text-sm font-medium text-gray-700 cursor-pointer"
                  >
                    Select All
                  </label>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {availableExtensions.map((extension) => {
                  const isSelected = selectedTypes.includes(extension);
                  return (
                    <div
                      key={extension}
                      className="bg-gray-50 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`ext-${extension}-${isAllArchive}`}
                          checked={isSelected}
                          onChange={() => handleExtensionChange(extension, isAllArchive)}
                          className="h-4 w-4 rounded accent-blue-600"
                        />
                        <label
                          htmlFor={`ext-${extension}-${isAllArchive}`}
                          className="ml-3 cursor-pointer text-sm"
                        >
                          <span className="text-gray-700 font-medium">
                            {extension}
                          </span>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-blue-800 font-medium">
            Selected: {selectedTypes.length} extensions
          </span>
        </div>
      </div>
    );
  };
  
  return (
    <div className="flex flex-col space-y-4">
      <h2 className="text-2xl mb-6 font-semibold text-gray-800">Download Archive</h2>
      <div className="bg-white p-6 rounded-xl shadow-md w-full">

        {popupMessage && (
          <Popup
            message={popupMessage.message}
            type={popupMessage.type}
            onClose={() => setPopupMessage(null)}
          />
        )}

        {renderArchiveFields()}
        {renderFileTypeSelection(false)}

        <button
          onClick={handleDownload}
          disabled={loading}
          className={`bg-blue-900 text-white rounded-lg py-3 px-6 hover:bg-blue-800 transition duration-300 shadow-md hover:shadow-lg flex items-center justify-center w-full md:w-auto ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {loading ? 'Downloading...' : 'Download Archive'}
        </button>
      </div>

      {userRole === 'ADMIN' && (
        <div className="flex flex-col space-y-4">
          <h2 className="text-2xl mb-6 font-semibold text-gray-800">Download All Archives</h2>
          <div className="bg-white p-6 rounded-xl shadow-md w-full">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 bg-slate-100 p-6 rounded-lg">
              <div className={commonWrapperClasses}>
                <label className={commonLabelClasses} htmlFor="fromDate">
                  From Date
                </label>
                <DatePicker
                  id="fromDate"
                  selected={fromDate}
                  onChange={(date) => setFromDate(date)}
                  selectsStart
                  startDate={fromDate}
                  endDate={toDate}
                  maxDate={new Date()}
                  dateFormat="dd/MM/yyyy"
                  placeholderText="Select a start date"
                  customInput={<CustomInput />}
                />
              </div>

              <div className={commonWrapperClasses}>
                <label className={commonLabelClasses} htmlFor="toDate">
                  To Date
                </label>
                <DatePicker
                  id="endDate"
                  selected={toDate}
                  onChange={(date) => setToDate(date)}
                  selectsEnd
                  startDate={fromDate}
                  endDate={toDate}
                  dateFormat="dd-MM-yyyy"
                  placeholderText="End Date"
                  customInput={<CustomInput />}
                />
              </div>
            </div>

            {renderFileTypeSelection(true)}

            <button
              onClick={handleDownloadAll}
              disabled={allArchiveLoading}
              className={`bg-blue-900 text-white rounded-lg py-3 px-6 hover:bg-blue-800 transition duration-300 shadow-md hover:shadow-lg flex items-center justify-center w-full md:w-auto ${allArchiveLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {allArchiveLoading ? 'Downloading All...' : 'Download All Archives'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArchiveDownload;