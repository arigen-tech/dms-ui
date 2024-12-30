import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { CalendarIcon } from '@heroicons/react/24/outline';
import { API_HOST } from '../API/apiConfig';
import Popup from '../Components/Popup';

const ArchiveDownload = () => {
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const initialFormData = {
    branchId: '',
    departmentId: '',
    startDate: null,
    endDate: null,
  };
  const [archiveCriteria, setArchiveCriteria] = React.useState(initialFormData);
  const [userRole, setUserRole] = useState('');
  const [branchOptions, setBranchOptions] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [popupMessage, setPopupMessage] = useState(null);
  const [userBranch, setUserBranch] = useState(null);
  const [userDepartment, setUserDepartment] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUserDetails();
    fetchBranches();
  }, []);

  // useEffect(() => {
  //   setArchiveCriteria(prev => ({
  //     ...prev,
  //     fromDate: fromDate ? fromDate.toISOString().split('T')[0] : '',
  //     toDate: toDate ? toDate.toISOString().split('T')[0] : ''
  //   }));
  // }, [fromDate, toDate]);

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
      // Set start time for fromDate
      const startDate = new Date(fromDate);
      startDate.setHours(0, 0, 0, 0); // Start of the day in local time
  
      // Set end time for toDate
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999); // End of the day in local time
  
      // Format dates as 'yyyy-MM-dd HH:mm:ss' or similar
      const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      };
  
      const formattedFromDate = formatDate(startDate); // Local start date
      const formattedToDate = formatDate(endDate); // Local end date
  
      const token = localStorage.getItem('tokenKey');
      const response = await axios.get(`${API_HOST}/archive/download`, {
        params: {
          branchId: archiveCriteria.branchId,
          departmentId: archiveCriteria.departmentId,
          startDate: formattedFromDate,
          endDate: formattedToDate,
          userRole: userRole.role,
        },
        headers: { Authorization: `Bearer ${token}` },
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
  
  

  const showPopup = (message, type = 'info') => {
    setPopupMessage({ message, type });
  };

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
            maxDate={new Date()} // Prevents selecting dates later than today
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl mb-6 font-semibold text-gray-800">Download Archive</h1>
      <div className="bg-white p-6 rounded-xl shadow-md">
        {popupMessage && (
          <Popup
            message={popupMessage.message}
            type={popupMessage.type}
            onClose={() => setPopupMessage(null)}
          />
        )}

        {renderArchiveFields()}

        <button
          onClick={handleDownload}
          disabled={loading}
          className={`bg-blue-900 text-white rounded-lg py-3 px-6 hover:bg-blue-800 transition duration-300 shadow-md hover:shadow-lg flex items-center justify-center w-full md:w-auto ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {loading ? 'Downloading...' : 'Download Archive'}
        </button>
      </div>
    </div>
  );
};

export default ArchiveDownload;