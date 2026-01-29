import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_HOST, DOCUMENTHEADER_API, SYSTEM_ADMIN, BRANCH_ADMIN, DEPARTMENT_ADMIN, USER } from "../API/apiConfig";
import "jspdf-autotable";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FaFilePdf, FaFileExcel } from "react-icons/fa";
import Popup from '../Components/Popup';
import AutoTranslate from '../i18n/AutoTranslate';
import { useLanguage } from '../i18n/LanguageContext';
import { getFallbackTranslation } from '../i18n/autoTranslator';


const DocumentReport = () => {
  const {
    currentLanguage,
    defaultLanguage,
    translationStatus,
    isTranslationNeeded,
    availableLanguages,
    changeLanguage,
    translate,
    preloadTranslationsForTerms
  } = useLanguage();

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
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState("PDF");
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [popupMessage, setPopupMessage] = useState(null);

  const role = localStorage.getItem("role");
  const userId = localStorage.getItem("userId");

  // Debug log
  useEffect(() => {
    console.log('🔍 DocumentReport Component - Language Status:', {
      currentLanguage,
      defaultLanguage,
      isTranslationNeeded: isTranslationNeeded(),
      translationStatus,
      availableLanguagesCount: availableLanguages.length,
      pathname: window.location.pathname
    });
  }, [currentLanguage, defaultLanguage, translationStatus, isTranslationNeeded, availableLanguages]);

  const showPopup = (message, type = 'info') => {
    setPopupMessage({
      message,
      type,
      onClose: () => {
        setPopupMessage(null);
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
    if (role === BRANCH_ADMIN && userBranch?.id) {
      setSearchCriteria((prev) => ({
        ...prev,
        branch: userBranch.id,
      }));
      fetchDepartments(userBranch.id);
    }
  }, [role, userBranch]);

  useEffect(() => {
    if (role === DEPARTMENT_ADMIN || role === USER) {
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
          ...(role === USER && { employeeId: userId }),
        }),
        startDate: formattedFromDate,
        endDate: formattedToDate,
        docType: selectedFormat,
      };

      // Choose API endpoint based on role
      const apiUrl =
        role === USER
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
      let filename = <AutoTranslate>downloaded-file</AutoTranslate>;

      const contentDisposition = response.headers["content-disposition"];
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
      link.download = filename;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showModalAlert(<AutoTranslate>Download successful!</AutoTranslate>, "success");
    } catch (error) {
      console.error("Error exporting documents:", error);
      showModalAlert(<AutoTranslate>Failed to export documents. Please try again.</AutoTranslate>, "error");
    } finally {
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
    if (!searchCriteria.branch) return <AutoTranslate>Branch is required.</AutoTranslate>;
    if (!searchCriteria.department) return <AutoTranslate>Department is required.</AutoTranslate>;
    if (!fromDate) return <AutoTranslate>Start date is required.</AutoTranslate>;
    if (!toDate) return <AutoTranslate>End date is required.</AutoTranslate>;
    if (!selectedFormat) return <AutoTranslate>Document format is required.</AutoTranslate>;
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
      <h1 className="text-xl mb-4 font-semibold">
        <AutoTranslate>Document Reports</AutoTranslate>
      </h1>
      <div className="bg-white p-4 rounded-lg shadow-md">
        {popupMessage && (
          <Popup
            message={popupMessage.message}
            type={popupMessage.type}
            onClose={popupMessage.onClose}
          />
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 bg-slate-100 p-4 rounded-lg">
          {role === BRANCH_ADMIN ? (
            <>
              <div className="flex flex-col">
                <label className="mb-1" htmlFor="branch">
                  <AutoTranslate>Branch</AutoTranslate> <span className="text-red-700">*</span>
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
                  <AutoTranslate>Department</AutoTranslate> <span className="text-red-700">*</span>
                </label>
                <select
                  id="department"
                  name="department"
                  onChange={handleInputChange}
                  className="p-2 border rounded-md outline-none"
                >
                  <option value=""><AutoTranslate>Select Department</AutoTranslate></option>
                  {departmentOptions.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : role === DEPARTMENT_ADMIN || role === USER ? (
            <>
              <div className="flex flex-col">
                <label className="mb-1" htmlFor="branch">
                  <AutoTranslate>Branch</AutoTranslate> <span className="text-red-700">*</span>
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
                  <AutoTranslate>Department</AutoTranslate> <span className="text-red-700">*</span>
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
                  <AutoTranslate>Branch</AutoTranslate> <span className="text-red-700">*</span>
                </label>
                <select
                  id="branch"
                  name="branch"
                  value={searchCriteria.branch}
                  onChange={handleInputChange}
                  className="p-2 border rounded-md outline-none"
                >
                  <option value=""><AutoTranslate>Select Branch</AutoTranslate></option>
                  {branchOptions.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col">
                <label className="mb-1" htmlFor="department">
                  <AutoTranslate>Department</AutoTranslate> <span className="text-red-700">*</span>
                </label>
                <select
                  id="department"
                  name="department"
                  value={searchCriteria.department}
                  onChange={handleInputChange}
                  className="p-2 border rounded-md outline-none"
                  disabled={!searchCriteria.branch}
                >
                  <option value=""><AutoTranslate>Select Department</AutoTranslate></option>
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
              <AutoTranslate>Category</AutoTranslate>
            </label>
            <select
              id="category"
              name="category"
              value={searchCriteria.category}
              onChange={handleInputChange}
              className="p-2 border rounded-md outline-none"
            >
              <option value=""><AutoTranslate>All Category</AutoTranslate></option>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="mb-1" htmlFor="status">
              <AutoTranslate>Status</AutoTranslate>
            </label>
            <select
              id="status"
              name="status"
              value={searchCriteria.status}
              onChange={handleInputChange}
              className="p-2 border rounded-md outline-none"
            >
              <option value=""><AutoTranslate>All Status</AutoTranslate></option>
              <option value="PENDING"><AutoTranslate>PENDING</AutoTranslate></option>
              <option value="APPROVED"><AutoTranslate>APPROVED</AutoTranslate></option>
              <option value="REJECTED"><AutoTranslate>REJECTED</AutoTranslate></option>
            </select>
          </div>

          <div className="flex flex-col">
            <label className="mb-1" htmlFor="fromDate">
              <AutoTranslate>From Date</AutoTranslate> <span className="text-red-700">*</span>
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
              placeholderText={getFallbackTranslation('Select Start Date', currentLanguage)}
              className="w-full px-3 py-2 border rounded-md focus:ring-2"
            />

          </div>

          {/* To Date Picker */}
          <div className="flex flex-col">
            <label className="mb-1" htmlFor="toDate">
              <AutoTranslate>To Date</AutoTranslate> <span className="text-red-700">*</span>
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
              placeholderText={getFallbackTranslation('Select End Date', currentLanguage)}
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
            <span className="text-gray-700">
              <AutoTranslate>PDF</AutoTranslate>
            </span>
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
            <span className="text-gray-700">
             Excel
            </span>
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
          {isProcessing ? <AutoTranslate>Processing...</AutoTranslate> : <AutoTranslate>Download</AutoTranslate>}
        </button>
      </div>
      {showModal && (
        <div className="fixed inset-0 flex justify-center items-center bg-gray-900 bg-opacity-50 z-50">
          <div
            className={`w-96 p-6 rounded-lg ${modalType === "success" ? "bg-white" : "bg-white"
              } text-gray-900 shadow-lg`}
          >
            <h2 className="text-xl font-semibold mb-4">
              {modalType === "success" ? <AutoTranslate>Success!</AutoTranslate> : <AutoTranslate>Error</AutoTranslate>}
            </h2>
            <p>{modalMessage}</p>
            <div className="mt-4 flex justify-end">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-green-400 text-white p-2 rounded-md"
              >
                <AutoTranslate>OK</AutoTranslate>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentReport;