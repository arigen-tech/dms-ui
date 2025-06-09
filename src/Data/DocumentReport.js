import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_HOST, DOCUMENTHEADER_API, USER } from "../API/apiConfig";
import "jspdf-autotable";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FaFilePdf, FaFileExcel } from "react-icons/fa";
import Popup from '../Components/Popup';


const DocumentReport = () => {
  const initialFormData = {
    branch: "",
    department: "",
    status: "",
    category: "",
    startDate: null,
    endDate: null,
  };
  const [searchCriteria, setSearchCriteria] = React.useState(initialFormData);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [branchOptions, setBranchOptions] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userBranch, setUserBranch] = useState(null);
  const [userDepartment, setUserDepartment] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [error, setError] = useState("");
  const [selectedFormat, setSelectedFormat] = useState("PDF");
  const [modalMessage, setModalMessage] = useState(""); // Message to display in the modal
  const [modalType, setModalType] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [popupMessage, setPopupMessage] = useState(null);


  // const match = contentDisposition.match(/filename="(.+)"/);
  // if (match && match[1]) {
  //   filename = match[1];
  // }

  const role = localStorage.getItem("role");
  const userId = localStorage.getItem("userId");


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
    fetchCategories();
    fetchBranches();
    fetchUserDetails();
  }, []);

  useEffect(() => {
    if (searchCriteria.branch) {
      fetchDepartments(searchCriteria.branch);
    } else {
      setDepartmentOptions([]);
    }
  }, [searchCriteria.branch]);

  useEffect(() => {
    // Pre-fill searchCriteria with userBranch and userDepartment
    setSearchCriteria((prev) => ({
      ...prev,
      branch: userBranch?.id || "",
      branchName: userBranch?.name || "",
      department: userDepartment?.id || "",
      departmentName: userDepartment?.name || "",
    }));
  }, [userBranch, userDepartment]);

  useEffect(() => {
    if (role === "BRANCH ADMIN" && userBranch?.id) {
      setSearchCriteria((prev) => ({
        ...prev,
        branch: userBranch.id,
      }));
      fetchDepartments(userBranch.id);
    }
  }, [role, userBranch]);

  useEffect(() => {
    if (role === "DEPARTMENT ADMIN" || role === "USER") {
      if (userBranch?.id) {
        setSearchCriteria((prev) => ({
          ...prev,
          branch: userBranch.id,
          department: userDepartment?.id || "",
        }));
        fetchDepartments(userBranch.id);
      }
    }
  }, [role, userBranch, userDepartment]);

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

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem("tokenKey");
      const response = await axios.get(`${API_HOST}/CategoryMaster/findAll`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCategoryOptions(response.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
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

      setUserBranch(response.data.branch);
      setUserDepartment(response.data.department);
      setUserRole(response.data.role);
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSearchCriteria((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "branch" && { department: "" }),
    }));
  };

  const handleDownload = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const errorMsg = validateForm();
      if (errorMsg) {
        showPopup(errorMsg, "warning");
        return;
      }

      const token = localStorage.getItem("tokenKey");

      const formattedFromDate = new Date(fromDate);
      formattedFromDate.setHours(0, 0, 0, 0);

      const formattedToDate = new Date(toDate);
      formattedToDate.setHours(23, 59, 59, 999);

      const requestBody = {
        ...(searchCriteria.category && { categoryId: searchCriteria.category }),
        ...(searchCriteria.status && { approvalStatus: searchCriteria.status }),
        ...(searchCriteria.branch && { branchId: searchCriteria.branch }),
        ...(searchCriteria.department && {
          departmentId: searchCriteria.department,
          ...(role === "USER" && { employeeId: userId }),
        }),
        startDate: formattedFromDate,
        endDate: formattedToDate,
        docType: selectedFormat,
      };

      // Choose API endpoint based on role
      const apiUrl =
        role === "USER"
          ? `${DOCUMENTHEADER_API}/export/ById`
          : `${DOCUMENTHEADER_API}/export`;

      const response = await axios.post(apiUrl, requestBody, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        responseType: "blob", // Handle binary file
      });

      // Extract the Content-Disposition header

      let filename = "downloaded-file"; // Default fallback name

      const contentDisposition = response.headers["content-disposition"]; // Now it won't be undefined
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match && match[1]) {
          filename = match[1];
        }
      }

      // Create a blob and downloadable link
      const blob = new Blob([response.data], {
        type: response.headers["content-type"],
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename; // Use extracted filename
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showModalAlert("Download successful!", "success");
    } catch (error) {
      console.error("Error exporting documents:", error);
      showModalAlert("Failed to export documents. Please try again.", "error");
    }finally {
      setIsProcessing(false);
    }
  };

  const showModalAlert = (message, type) => {
    setModalMessage(message);
    setModalType(type);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetFields();
  };

  const validateForm = () => {
    if (!searchCriteria.branch) return "Branch is required.";
    if (!searchCriteria.department) return "Department is required.";
    if (!fromDate) return "Start date is required.";
    if (!toDate) return "End date is required.";
    if (!selectedFormat) return "Document format is required.";
    return null;
  };

  const resetFields = () => {
    setFromDate(null);
    setToDate(null);
    setSearchCriteria(initialFormData);
  };

  const handleFormatChange = (event) => {
    setSelectedFormat(event.target.value);
  };

  return (
    <div className="p-4">
      <h1 className="text-xl mb-4 font-semibold">Document Reports</h1>
      <div className="bg-white p-4 rounded-lg shadow-md">
        {popupMessage && (
          <Popup
            message={popupMessage.message}
            type={popupMessage.type}
            onClose={popupMessage.onClose}
          />
        )}
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
                  value={searchCriteria.branch}
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
                  value={searchCriteria.branch}
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
                  value={searchCriteria.department}
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
                  value={searchCriteria.branch}
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
                  value={searchCriteria.department}
                  onChange={handleInputChange}
                  className="p-2 border rounded-md outline-none"
                  disabled={!searchCriteria.branch}
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

          <div className="flex flex-col">
            <label className="mb-1" htmlFor="category">
              Category
            </label>
            <select
              id="category"
              name="category"
              value={searchCriteria.category}
              onChange={handleInputChange}
              className="p-2 border rounded-md outline-none"
            >
              <option value="">All Category</option>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="mb-1" htmlFor="status">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={searchCriteria.status}
              onChange={handleInputChange}
              className="p-2 border rounded-md outline-none"
            >
              <option value="">All Status</option>
              <option value="PENDING">PENDING</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label className="mb-1" htmlFor="startDate">
              Start Date <span className="text-red-700">*</span>
            </label>
            <DatePicker
              id="startDate"
              selected={fromDate}
              onChange={(date) => setFromDate(date)}
              selectsStart
              startDate={fromDate}
              endDate={toDate}
              dateFormat="dd-MM-yyyy"
              placeholderText="Start Date"
              maxDate={new Date()}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div className="flex flex-col">
            <label className="mb-1" htmlFor="endDate">
              End Date <span className="text-red-700">*</span>
            </label>
            <DatePicker
              id="endDate"
              selected={toDate}
              onChange={(date) => setToDate(date)}
              selectsEnd
              startDate={fromDate}
              endDate={toDate}
              minDate={fromDate}
              dateFormat="dd-MM-yyyy"
              placeholderText="End Date"
              maxDate={new Date()}
              className="w-full px-3 py-2 border rounded-md"
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
              value="EXCEL"
              checked={selectedFormat === "EXCEL"}
              onChange={handleFormatChange}
              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              disabled={isProcessing}
            />
            <FaFileExcel className="h-5 w-5 text-gray-700" />
            <span className="text-gray-700">Excel</span>
          </label>
        </div>

        {error && <p className="text-red-500">{error}</p>}

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

export default DocumentReport;
