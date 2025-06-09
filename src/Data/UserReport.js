import React, { useState, useEffect } from "react";
import { API_HOST, EMPLOYEE_API } from "../API/apiConfig";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FaFilePdf, FaFileExcel } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';
import Popup from '../Components/Popup';


const UserReport = () => {
  const initialFormData = {
    branch: "",
    department: "",
    status: "",
    startDate: null,
    endDate: null,
  };

  const navigate = useNavigate();
  const [formData, setFormData] = React.useState(initialFormData);
  const [fromDate, setFromDate] = React.useState(null);
  const [toDate, setToDate] = React.useState(null);
  const [selectedFormat, setSelectedFormat] = React.useState("PDF");
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [branchOptions, setBranchOptions] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [resData, setResData] = useState([]);
  const [fileContent, setFileContent] = useState([]);
  const [fileName, setFileName] = useState([]);
  const [userBranch, setUserBranch] = useState(null);
  const [userDepartment, setUserDepartment] = useState(null);
  const [error, setError] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [popupMessage, setPopupMessage] = useState(null);


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFormatChange = (e) => {
    const { value } = e.target;
    setSelectedFormat(value);
    setFormData({ ...formData, docType: value });
  };

  const role = localStorage.getItem("role");

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

  useEffect(() => {
    fetchBranches();
    fetchUserDetails();
  }, []);

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

      setUserBranch(response.data.branch);
      setUserDepartment(response.data.department);
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  };

  useEffect(() => {
    if (formData.branch) {
      fetchDepartments(formData.branch);
    } else {
      setDepartmentOptions([]);
    }
  }, [formData.branch]);

  useEffect(() => {
    // Pre-fill searchCriteria with userBranch and userDepartment
    setFormData((prev) => ({
      ...prev,
      branch: userBranch?.id || "",
      branchName: userBranch?.name || "",
      department: userDepartment?.id || "",
      departmentName: userDepartment?.name || "",
    }));
  }, [userBranch, userDepartment]);

  useEffect(() => {
    if (role === "BRANCH ADMIN" && userBranch?.id) {
      setFormData((prev) => ({
        ...prev,
        branch: userBranch.id,
      }));
      fetchDepartments(userBranch.id);
    }
  }, [role, userBranch]);

  useEffect(() => {
    if (role === "DEPARTMENT ADMIN" || role === "USER") {
      if (userBranch?.id) {
        setFormData((prev) => ({
          ...prev,
          branch: userBranch.id,
          department: userDepartment?.id || "",
        }));
        fetchDepartments(userBranch.id);
      }
    }
  }, [role, userBranch, userDepartment]);

  useEffect(() => {
    if (formData.branch) {
      fetchDepartments(formData.branch);
    }
  }, [formData.branch]);

  const fetchBranches = async () => {
    try {
      const token = localStorage.getItem("tokenKey");
      const response = await axios.get(`${API_HOST}/branchmaster/findAll`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBranchOptions(response.data);
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  };

  const fetchDepartments = async (branchId) => {
    try {
      const token = localStorage.getItem("tokenKey");
      const response = await axios.get(
        `${API_HOST}/DepartmentMaster/findByBranch/${branchId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setDepartmentOptions(response.data);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const handleDownload = async (e) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      showPopup(validationError, "warning");
      return;
    }

    try {
      setIsProcessing(true);

      // Format the date range
      const formattedFromDate = new Date(fromDate);
      formattedFromDate.setHours(0, 0, 0, 0);

      const formattedToDate = new Date(toDate);
      formattedToDate.setHours(23, 59, 59, 999);

      // Prepare the request payload
      const requestPayload = {
        departmentMasterBranchId: parseInt(formData.branch, 10),
        departmentMasterId: parseInt(formData.department, 10),
        status: formData.status,
        startDate: formattedFromDate,
        endDate: formattedToDate,
        docType: selectedFormat,
      };

      const token = localStorage.getItem("tokenKey");

      const response = await axios.post(
        `${EMPLOYEE_API}/report/filter`,
        requestPayload,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          responseType: "json",
        }
      );

      const { fileName, fileContent } = response.data.response;

      if (!fileContent || !fileName) {
        throw new Error("File content or filename is missing in the response.");
      }

      // Determine MIME type based on file extension in fileName
      let mimeType = "";
      if (fileName.endsWith(".csv")) {
        mimeType =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      } else if (fileName.endsWith(".pdf")) {
        mimeType = "application/pdf";
      } else {
        throw new Error("Unsupported file type.");
      }

      // Decode the base64 file content
      const byteCharacters = atob(fileContent); // Decode base64 content
      const byteArrays = [];

      for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
        const slice = byteCharacters.slice(offset, offset + 1024);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        byteArrays.push(new Uint8Array(byteNumbers));
      }

      // Create a Blob from the byte array
      const blob = new Blob(byteArrays, { type: mimeType });

      // Create an anchor tag to trigger the download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName); // Use the fileName from the response
      document.body.appendChild(link);
      link.click();
      link.remove();

      showModalAlert("Download successful!", "success");
      resetForm();
    } catch (error) {
      showModalAlert("Failed to download file. Please try again.", "error");
      console.error("Error during file download:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setFromDate(null);
    setToDate(null);
  };

  const validateForm = () => {
    if (!formData.branch) return "Branch is required.";
    if (!formData.department) return "Department is required.";
    if (!fromDate) return "Start date is required.";
    if (!toDate) return "End date is required.";
    if (!selectedFormat) return "Document format is required.";
    return null;
  };

  const showModalAlert = (message, type) => {
    setModalMessage(message);
    setModalType(type);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    navigate(0);
  };

  return (
    <div className="p-4">
      <h1 className="text-xl mb-4 font-semibold">User Reports</h1>
      <div className="bg-white p-4 rounded-lg shadow-md">
        {popupMessage && (
          <Popup
            message={popupMessage.message}
            type={popupMessage.type}
            onClose={popupMessage.onClose}
          />
        )}
        <form onSubmit={handleDownload}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 bg-slate-100 p-4 rounded-lg">
            {role === "BRANCH ADMIN" ? (
              <>
                <div className="flex flex-col">
                  <label className="mb-1" htmlFor="branch">
                    Branch <span className="text-red-700">*</span>
                  </label>
                  <select
                    id="branch"
                    name="branch"
                    value={formData.branch}
                    onChange={handleInputChange}
                    className="p-2 border rounded-md outline-none"
                    disabled={true}
                  >
                    <option value={userBranch?.id}>{userBranch?.name}</option>
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="mb-1" htmlFor="department">
                    Department <span className="text-red-700">*</span>
                  </label>
                  <select
                    id="department"
                    name="department"
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
            ) : role === "DEPARTMENT ADMIN" || role === "USER" ? (
              <>
                <div className="flex flex-col">
                  <label className="mb-1" htmlFor="branch">
                    Branch <span className="text-red-700">*</span>
                  </label>
                  <select
                    id="branch"
                    name="branch"
                    value={formData.branch}
                    onChange={handleInputChange}
                    className="p-2 border rounded-md outline-none"
                    disabled={true}
                  >
                    <option value={userBranch?.id}>{userBranch?.name}</option>
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="mb-1" htmlFor="department">
                    Department <span className="text-red-700">*</span>
                  </label>
                  <select
                    id="department"
                    name="department"
                    value={formData.department}
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
                    Branch <span className="text-red-700">*</span>
                  </label>
                  <select
                    id="branch"
                    name="branch"
                    value={formData.branch}
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
                    Department <span className="text-red-700">*</span>
                  </label>
                  <select
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    className="p-2 border rounded-md outline-none"
                    disabled={!formData.branch}
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

            {/* Status Dropdown */}
            <div className="flex flex-col">
              <label className="mb-1" htmlFor="status">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="p-2 border rounded-md outline-none"
              >
                <option value="">All</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>

            {/* From Date Picker */}
            <div className="flex flex-col">
              <label className="mb-1" htmlFor="fromDate">
                From Date <span className="text-red-700">*</span>
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
                className="w-full px-3 py-2 border rounded-md focus:ring-2"
              />
            </div>

            {/* To Date Picker */}
            <div className="flex flex-col">
              <label className="mb-1" htmlFor="toDate">
                To Date <span className="text-red-700">*</span>
              </label>
              <DatePicker
                id="toDate"
                selected={toDate}
                onChange={(date) => setToDate(date)}
                selectsEnd
                startDate={fromDate}
                endDate={toDate}
                minDate={fromDate}
                maxDate={new Date()}
                dateFormat="dd/MM/yyyy"
                placeholderText="Select an end date"
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="format-selection space-y-4 grid grid-cols-12 mb-4">
            <label className="flex items-center space-x-2 mt-4">
              <input
                type="radio"
                value="PDF"
                checked={selectedFormat === "PDF"}
                onChange={handleFormatChange}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                disabled={isProcessing}
              />
              <FaFilePdf className="h-5 w-5 text-gray-700" />
              <span className="text-gray-700">PDF</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="radio"
                value="Excel"
                checked={selectedFormat === "Excel"}
                onChange={handleFormatChange}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                disabled={isProcessing}
              />
              <FaFileExcel className="h-5 w-5 text-gray-700" />
              <span className="text-gray-700">Excel</span>
            </label>
          </div>

          <button
            onClick={handleDownload}
            disabled={isProcessing}
            className={`px-4 py-2 rounded ${isProcessing
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600"
              } text-white`}
          >
            {isProcessing ? "Processing..." : "Download"}
          </button>
        </form>
      </div>
      {showModal && (
        <div className="fixed inset-0 flex justify-center items-center bg-gray-900 bg-opacity-50 z-50">
          <div
            className={`w-96 p-6 rounded-lg ${modalType === "success" ? "bg-white" : "bg-white"
              } text-gray-900 shadow-lg`}
          >
            <h2 className="text-xl font-semibold mb-4">
              {modalType === "success" ? "Success!" : "Error"}
            </h2>
            <p>{modalMessage}</p>
            <div className="mt-4 flex justify-end">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-green-400 text-white p-2 rounded-md"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserReport;
