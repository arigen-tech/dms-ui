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
    } catch (error) {
      console.error('Error fetching Files Types:', error);
      showPopup('Failed to fetch file types', 'error');
    }
  };

  const handleFileTypeChange = (fileType, isAllArchive = false) => {
    const { selectedTypes, setSelectedTypes, selectAll, setSelectAll } = isAllArchive
      ? {
        selectedTypes: selectedAllArchiveFileTypes,
        setSelectedTypes: setSelectedAllArchiveFileTypes,
        selectAll: selectAllArchiveFileTypes,
        setSelectAll: setSelectAllArchiveFileTypes,
      }
      : {
        selectedTypes: selectedFileTypes,
        setSelectedTypes: setSelectedFileTypes,
        selectAll: selectAllFileTypes,
        setSelectAll: setSelectAllFileTypes,
      };

    let newSelectedTypes;
    if (fileType === 'all') {
      if (!selectAll) {
        newSelectedTypes = fileTypes.map(type => type.extension);
        setSelectAll(true);
      } else {
        newSelectedTypes = [];
        setSelectAll(false);
      }
    } else {
      if (selectedTypes.includes(fileType)) {
        newSelectedTypes = selectedTypes.filter(type => type !== fileType);
        setSelectAll(false);
      } else {
        newSelectedTypes = [...selectedTypes, fileType];
        if (newSelectedTypes.length === fileTypes.length) {
          setSelectAll(true);
        }
      }
    }
    setSelectedTypes(newSelectedTypes);
    if (!isAllArchive) {
      setArchiveCriteria(prev => ({
        ...prev,
        fileTypes: newSelectedTypes
      }));
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
      // Format dates to match backend's expected format (YYYY-MM-DD)
      const formatDate = (date) => {
        if (!date) return null;
        return date.toISOString().split('T')[0];
      };

      const formattedFromDate = formatDate(fromDate);
      const formattedToDate = formatDate(toDate);

      const token = localStorage.getItem('tokenKey');

      // Construct the query parameters
      const params = new URLSearchParams();
      params.append('branchId', archiveCriteria.branchId);
      if (archiveCriteria.departmentId) {
        params.append('departmentId', archiveCriteria.departmentId);
      }
      if (formattedFromDate) {
        params.append('fromDate', formattedFromDate);
      }
      if (formattedToDate) {
        params.append('toDate', formattedToDate);
      }
      params.append('userRole', userRole);

      // Add each file type as a separate query parameter
      selectedFileTypes.forEach(fileType => {
        params.append('fileTypes', fileType);
      });

      const response = await axios.get(`${API_HOST}/archive/download?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        responseType: 'blob',
      });

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

  // Similarly update the handleDownloadAll function
  const handleDownloadAll = async () => {
    setAllArchiveLoading(true);
    try {
      const formatDate = (date) => {
        if (!date) return null;
        return date.toISOString().split('T')[0];
      };

      const formattedFromDate = formatDate(allArchiveFromDate);
      const formattedToDate = formatDate(allArchiveToDate);

      const params = new URLSearchParams();
      if (formattedFromDate) {
        params.append('fromDate', formattedFromDate);
      }
      if (formattedToDate) {
        params.append('toDate', formattedToDate);
      }

      // Add file types to the all archives download request
      selectedFileTypes.forEach(fileType => {
        params.append('fileTypes', fileType);
      });

      const token = localStorage.getItem('tokenKey');
      const response = await axios.get(`${API_HOST}/archive/download/all?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        responseType: 'blob',
      });

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

  // Add this new section to renderArchiveFields
  const renderFileTypeSelection = (isAllArchive = false) => {
    const selectedTypes = isAllArchive ? selectedAllArchiveFileTypes : selectedFileTypes;
    const isSelected = isAllArchive ? selectAllArchiveFileTypes : selectAllFileTypes;
    
    return (
      <div className="mb-6 bg-slate-100 p-8 rounded-xl shadow-sm">
        <label className="block text-lg font-semibold text-gray-800 mb-4">
          File Types
        </label>
        
        <div className="space-y-4">
          <div className="flex items-center bg-white p-3 rounded-lg shadow-sm">
            <input
              type="checkbox"
              id={isAllArchive ? "selectAllArchive" : "selectAll"}
              checked={isSelected}
              onChange={() => handleFileTypeChange('all', isAllArchive)}
              className="h-5 w-5 rounded accent-blue-800 cursor-pointer"
            />
            <label htmlFor={isAllArchive ? "selectAllArchive" : "selectAll"} className="ml-3 text-gray-700 font-medium">
              Select All
            </label>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {fileTypes.map((fileType) => {
              const isTypeSelected = selectedTypes.includes(fileType.extension);
              return (
                <div
                  key={fileType.id}
                  className="bg-white p-4 rounded-lg shadow-sm"
                >
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id={`fileType-${isAllArchive ? 'all-' : ''}${fileType.id}`}
                      checked={isTypeSelected}
                      onChange={() => handleFileTypeChange(fileType.extension, isAllArchive)}
                      className="h-5 w-5 rounded accent-blue-800 cursor-pointer"
                    />
                    <label
                      htmlFor={`fileType-${isAllArchive ? 'all-' : ''}${fileType.id}`}
                      className="ml-3 cursor-pointer flex-grow"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700 font-medium">
                          {fileType.extension}
                        </span>
                        <span className="text-xs text-gray-400">
                          {fileType.id}
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="mt-6 flex items-center justify-between text-sm">
          <span className="text-blue-800">
            Selected: {selectedTypes.length} types
          </span>
          <span className="text-blue-800 font-medium">
            Total: {fileTypes.length} types
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