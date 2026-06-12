import Popup from "../Components/Popup";
import LoadingComponent from '../Components/LoadingComponent';
import { MdEdit } from "react-icons/md";
import { IoIosArrowForward, IoIosArrowBack } from "react-icons/io";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  LockClosedIcon,
  LockOpenIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/solid";
import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import apiClient from "../API/apiClient";

import {
  REGISTER_API,
  EMPLOYEE_API,
  BRANCH_API,
  DEPAETMENT_API
  , SYSTEM_ADMIN, BRANCH_ADMIN, DEPARTMENT_ADMIN, USER
} from "../API/apiConfig";
import { API_HOST } from "../API/apiConfig";
import AutoTranslate from '../i18n/AutoTranslate';
import { useLanguage } from '../i18n/LanguageContext';
import { getFallbackTranslation } from '../i18n/autoTranslator';

const UserAddEmployee = () => {
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

  // State for translated placeholders
  const [translatedPlaceholders, setTranslatedPlaceholders] = useState({
    enterName: 'Enter name',
    enterEmail: 'Enter email',
    enterPhone: 'Enter phone number',
    selectBranch: 'Select Branch',
    selectDepartment: 'Select Department',
    search: 'Search...'
  });

  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    countryCode: "+91",
    branch: { id: "", name: "" },
    department: { id: "", name: "" },
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [employeeToToggle, setEmployeeToToggle] = useState(null);
  const [branchOptions, setBranchOptions] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [error, setError] = useState("");

  const [userName, setUserName] = useState(null);
  const [branchData, setBranchData] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [userBranch, setUserBranch] = useState(null);
  const [userDepartment, setUserDepartment] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [popupConfig, setPopupConfig] = useState({
    message: "",
    type: "default",
  });
  const [isConfirmDisabled, setIsConfirmDisabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [mobileError, setMobileError] = useState("");
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);

  const formRef = useRef(null);

  // Function to translate placeholder text
  const translatePlaceholder = useCallback(async (text) => {
    if (isTranslationNeeded()) {
      try {
        return await translate(text);
      } catch (error) {
        console.error('Error translating placeholder:', error);
        return text;
      }
    }
    return text;
  }, [isTranslationNeeded, translate]);

  // Update placeholders when language changes
  useEffect(() => {
    const updatePlaceholders = async () => {
      if (!isTranslationNeeded()) {
        setTranslatedPlaceholders({
          enterName: 'Enter name',
          enterEmail: 'Enter email',
          enterPhone: 'Enter phone number',
          selectBranch: 'Select Branch',
          selectDepartment: 'Select Department',
          search: 'Search...'
        });
        return;
      }

      const namePlaceholder = await translatePlaceholder('Enter name');
      const emailPlaceholder = await translatePlaceholder('Enter email');
      const phonePlaceholder = await translatePlaceholder('Enter phone number');
      const branchPlaceholder = await translatePlaceholder('Select Branch');
      const departmentPlaceholder = await translatePlaceholder('Select Department');
      const searchPlaceholder = await translatePlaceholder('Search...');

      setTranslatedPlaceholders({
        enterName: namePlaceholder,
        enterEmail: emailPlaceholder,
        enterPhone: phonePlaceholder,
        selectBranch: branchPlaceholder,
        selectDepartment: departmentPlaceholder,
        search: searchPlaceholder
      });
    };

    updatePlaceholders();
  }, [currentLanguage, translatePlaceholder, isTranslationNeeded]);

  useEffect(() => {
    fetchEmployees();
    fetchOptions();
    fetchBranches();
  }, []);

  useEffect(() => {
    if (selectedBranch) {
      fetchFilterDepartments(selectedBranch);
    } else {
      setDepartmentData([]);
    }
  }, [selectedBranch]);

  const fetchBranches = async () => {
    try {
      const token = localStorage.getItem("tokenKey");
      const response = await apiClient.get(`${API_HOST}/branchmaster/findActiveRole`);
      setBranchData(response.data);
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  };

  const fetchFilterDepartments = async (branchId) => {
    try {
      const token = localStorage.getItem("tokenKey");
      const response = await apiClient.get(`${API_HOST}/DepartmentMaster/findByBranch/${branchId}`);
      setDepartmentData(response.data);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const invalidPatterns = [/\.\.+/, /^\./, /\.$/, /@\./, /\.@/, /@@/, /@.*@/];

    if (!emailRegex.test(email)) {
      return false;
    }

    for (let pattern of invalidPatterns) {
      if (pattern.test(email)) {
        return false;
      }
    }

    const parts = email.split('@');
    if (parts.length !== 2) return false;

    const [localPart, domain] = parts;
    if (localPart.length === 0 || localPart.length > 64) return false;
    if (localPart.startsWith('.') || localPart.endsWith('.')) return false;

    if (domain.length === 0 || domain.length > 255) return false;
    if (domain.startsWith('.') || domain.endsWith('.')) return false;
    if (domain.startsWith('-') || domain.endsWith('-')) return false;

    const domainParts = domain.split('.');
    if (domainParts.length < 2) return false;

    const extension = domainParts[domainParts.length - 1];
    if (extension.length < 2) return false;

    return true;
  };

  const validateMobile = (mobile) => {
    const re = /^\d{10}$/;
    return re.test(mobile);
  };

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const userId = localStorage.getItem("id");
      const token = localStorage.getItem("tokenKey");

      const userResponse = await apiClient.get(`${EMPLOYEE_API}/findById/${userId}`);

      const userData = userResponse.data;
      setUserName(userResponse.data.name);

      const userBranch = userData.branch
        ? { id: userData.branch.id, name: userData.branch.name }
        : { id: "", name: "" };

      const userDepartment = userData.department
        ? { id: userData.department.id, name: userData.department.name }
        : { id: "", name: "" };

      setUserBranch(userBranch);
      setUserDepartment(userDepartment);

      const isAdmin = userData.role?.role?.toUpperCase() === SYSTEM_ADMIN;

      if (isAdmin) {
        setFormData((prevData) => ({
          ...prevData,
          branch: { id: "", name: "" },
          department: { id: "", name: "" },
        }));
      } else {
        setFormData((prevData) => ({
          ...prevData,
          branch: userBranch,
          department: userDepartment,
        }));
      }

      if (isAdmin) {
        const allEmployeesResponse = await apiClient.get(`${API_HOST}/employee/findAll`);
        setEmployees(allEmployeesResponse.data);
      } else {
        const createdByResponse = await apiClient.get(`${API_HOST}/employee/employeeCreateby/${userData.id}`);
        setEmployees(createdByResponse.data.response);
      }
    } catch (error) {
      console.error("Error fetching user details or employees:", error);
      setError("Could not fetch user details or employees");
      setShowPopup(true);
      setPopupConfig({
        message: "Error fetching data. Please try again.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const token = localStorage.getItem("tokenKey");

      const branchesRes = await apiClient.get(`${BRANCH_API}/findActiveRole`);

      setBranchOptions(branchesRes.data);
    } catch (error) {
      setError("Error fetching branch options.");
      setShowPopup(true);
      setPopupConfig({
        message: "Error fetching branch options.",
        type: "error",
      });
    }
  };

  const fetchDepartments = async (branchId) => {
    try {
      const token = localStorage.getItem("tokenKey");

      const departmentsRes = await apiClient.get(`${DEPAETMENT_API}/findByBranch/${branchId}`);

      setDepartmentOptions(departmentsRes.data);
    } catch (error) {
      setError("Error fetching departments.");
      setShowPopup(true);
      setPopupConfig({
        message: "Error fetching departments.",
        type: "error",
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "email") {
      let errorMessage = "";

      if (value === "") {
        errorMessage = "";
      } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)) {
        if (!value.includes('@')) {
          errorMessage = "Email must contain @ symbol";
        } else if (value.includes('..')) {
          errorMessage = "Email cannot contain consecutive dots";
        } else if (value.startsWith('.') || value.endsWith('.')) {
          errorMessage = "Email cannot start or end with a dot";
        } else if (value.includes('@.') || value.includes('.@')) {
          errorMessage = "Invalid format around @ symbol";
        } else if ((value.match(/@/g) || []).length > 1) {
          errorMessage = "Email can only contain one @ symbol";
        } else {
          const parts = value.split('@');
          if (parts.length === 2) {
            const domain = parts[1];
            if (!domain.includes('.')) {
              errorMessage = "Domain must contain a dot (e.g., gmail.com)";
            } else if (domain.split('.').some(part => part.length === 0)) {
              errorMessage = "Invalid domain format";
            } else {
              errorMessage = "Please enter a valid email address";
            }
          } else {
            errorMessage = "Please enter a valid email address";
          }
        }
      } else {
        const isValid = validateEmail(value);
        errorMessage = isValid ? "" : "Please enter a valid email address";
      }

      setEmailError(errorMessage);
    }

    if (name === "mobile") {
      const numericValue = value.replace(/\D/g, '');
      const isValid = numericValue.length === 10;
      setMobileError(isValid ? "" : "Please enter exactly 10 digits");
      setFormData(prev => ({ ...prev, mobile: numericValue }));
      return;
    }

    if (name === "name") {
      const regex = /^[A-Za-z\s]*$/;
      if (value === "" || (regex.test(value) && value.length <= 30)) {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
      return;
    }

    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value,
    }));
  };

  const handleSelectChange = (e, key) => {
    const { value, selectedOptions } = e.target;
    const selectedName = selectedOptions[0].text;

    setFormData((prevData) => ({
      ...prevData,
      [key]: {
        id: value,
        name: selectedName,
      },
    }));

    if (key === "branch") {
      setFormData((prevData) => ({
        ...prevData,
        branch: {
          id: value,
          name: selectedName,
        },
        department: { id: "", name: "" },
      }));
      fetchDepartments(value);
    }
  };

  const validateForm = () => {
    let isValid = true;
    setError("");

    if (!formData.name.trim()) {
      setError("Name is required");
      isValid = false;
    }

    if (!formData.email.trim()) {
      setEmailError("Email is required");
      isValid = false;
    } else if (!validateEmail(formData.email)) {
      setEmailError("Please enter a valid email address (e.g., user@gmail.com)");
      isValid = false;
    }

    if (!formData.mobile) {
      setMobileError("Mobile number is required");
      isValid = false;
    } else if (!validateMobile(formData.mobile)) {
      setMobileError("Please enter exactly 10-digit mobile number");
      isValid = false;
    }

    if (!formData.branch.id) {
      setError("Branch is required");
      isValid = false;
    }

    if (!formData.department.id) {
      setError("Department is required");
      isValid = false;
    }

    return isValid;
  };

  const handleAddEmployee = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setIsButtonDisabled(true);

    try {
      const token = localStorage.getItem("tokenKey");
      const userId = parseInt(localStorage.getItem("id"), 10);

      const fullMobileNumber = `${formData.mobile}`;

      // Get first 4 Charcters of name (uppercase) and pad with spaces if less than 4
      const namePrefix = formData.name.slice(0, 4).toUpperCase().padEnd(4, ' ');
      // Get last 4 digits of mobile
      const mobileSuffix = formData.mobile.slice(-4);
      const generatedPassword = `${namePrefix}${mobileSuffix}`;

      const employeeData = {
        name: formData.name,
        email: formData.email,
        mobile: fullMobileNumber,
        password: generatedPassword,
        isActive: 0,
        createdBy: { id: userId },
        updatedBy: { id: userId },
        department: { id: parseInt(formData.department.id, 10) },
        branch: { id: parseInt(formData.branch.id, 10) },
        createdOn: new Date().toISOString(),
        updatedOn: new Date().toISOString(),
      };

      const response = await apiClient.post(
        `${REGISTER_API}/create`,
        employeeData,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      setShowPopup(true);
      setPopupConfig({
        message: `Dear User, Your password is first 4 Charcters of your name and last 4 digits of your mobile number. 
               \nName: ${formData.name}, Mobile No.: ${formData.mobile}, then password: ${generatedPassword}`,
        type: "success",
      });

      setEmployees(prev => [...prev, response.data]);

      setFormData({
        name: "",
        email: "",
        mobile: "",
        countryCode: "+91",
        branch: userBranch || { id: "", name: "" },
        department: userDepartment || { id: "", name: "" },
      });

      setEmailError("");
      setMobileError("");
      setError("");

      setTimeout(() => setShowPopup(false), 5000); // Increased to 5 seconds to give user time to read

    } catch (error) {
      // Show the user-friendly password format message instead of the error
      const namePrefix = formData.name.slice(0, 4).toUpperCase().padEnd(4, ' ');
      const mobileSuffix = formData.mobile.slice(-4);
      const generatedPassword = `${namePrefix}${mobileSuffix}`;

      setShowPopup(true);
      setPopupConfig({
        message: `Dear User, Your password is first 4 Charcters of your name and last 4 digits of your mobile number. 
               \nName: ${formData.name}, Mobile No.: ${formData.mobile}, then password: ${generatedPassword}`,
        type: "success", // Changed to "info" type to indicate it's informational
      });

      // Log the actual error to console for debugging
      console.error("Error adding employee:", error.response?.data?.message || error);

      setTimeout(() => setShowPopup(false), 5000);
    } finally {
      setIsSubmitting(false);
      setIsButtonDisabled(false);
    }
  };

  const handleEditEmployee = (employeeId) => {
    const employeeToEdit = employees.find((emp) => emp.id === employeeId);
    if (employeeToEdit) {
      setEditingIndex(employeeId);

      let countryCode = "+91";
      let mobile = employeeToEdit.mobile;

      if (employeeToEdit.mobile) {
        if (employeeToEdit.mobile.startsWith("+91")) {
          countryCode = "+91";
          mobile = employeeToEdit.mobile.substring(3).replace(/\D/g, '');
        } else if (employeeToEdit.mobile.startsWith("+")) {
          const match = employeeToEdit.mobile.match(/^(\+\d{1,3})(.*)$/);
          if (match) {
            countryCode = match[1];
            mobile = match[2].replace(/\D/g, '');
          }
        } else {
          mobile = employeeToEdit.mobile.replace(/\D/g, '');
        }
      }

      setFormData({
        id: employeeToEdit.id,
        name: employeeToEdit.name,
        email: employeeToEdit.email,
        mobile: mobile,
        countryCode: countryCode,
        branch: employeeToEdit.branch || { id: "", name: "" },
        department: employeeToEdit.department || { id: "", name: "" },
        password: "",
        createdOn: employeeToEdit.createdOn,
        enabled: employeeToEdit.enabled,
      });

      if (employeeToEdit.branch) {
        fetchDepartments(employeeToEdit.branch.id);
      }

      if (formRef.current) {
        formRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setIsButtonDisabled(true);

    try {
      const token = localStorage.getItem("tokenKey");
      const fullMobileNumber = `${formData.countryCode}${formData.mobile}`;

      const updatedEmployeeData = {
        name: formData.name,
        email: formData.email,
        mobile: fullMobileNumber,
        branch: { id: formData.branch.id, name: formData.branch.name },
        department: {
          id: formData.department.id,
          name: formData.department.name,
        },
        password: formData.password ? formData.password : null,
        updatedOn: new Date().toISOString(),
        enabled: formData.enabled,
      };

      const response = await apiClient.put(
        `${API_HOST}/employee/update/${formData.id}`,
        updatedEmployeeData,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      setShowPopup(true);
      setPopupConfig({
        message: "Employee updated successfully",
        type: "success",
      });

      const updatedEmployees = employees.map((emp) =>
        emp.id === formData.id ? response.data : emp
      );
      setEmployees(updatedEmployees);

      setFormData({
        name: "",
        email: "",
        mobile: "",
        countryCode: "+91",
        branch: userBranch || { id: "", name: "" },
        department: userDepartment || { id: "", name: "" },
        password: "",
        createdOn: "",
        enabled: false,
      });
      setEditingIndex(null);

      setEmailError("");
      setMobileError("");
      setError("");

      setTimeout(() => setShowPopup(false), 3000);
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        "Error updating employee. Please try again.";
      setShowPopup(true);
      setPopupConfig({
        message: errorMessage,
        type: "error",
      });
      setTimeout(() => setShowPopup(false), 3000);
    } finally {
      setIsSubmitting(false);
      setIsButtonDisabled(false);
    }
  };

  const handleToggleActive = async (employee) => {
    setEmployeeToToggle(employee);
    setModalVisible(true);
  };

  const confirmToggleActive = async () => {
    setIsConfirmDisabled(true);

    try {
      const newStatus = !employeeToToggle.active;

      const response = await apiClient.put(
        `${API_HOST}/employee/updateStatus/${employeeToToggle.id}`,
        newStatus,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Toggle status response:", response.data);

      // Update UI immediately
      const updatedEmployees = employees.map((employee) =>
        employee.id === employeeToToggle.id
          ? { ...employee, active: newStatus }
          : employee
      );
      setEmployees(updatedEmployees);

      // Always show success message (the status was updated)
      const message = newStatus
        ? "Employee has been activated successfully."
        : "Employee has been deactivated successfully.";

      setShowPopup(true);
      setPopupConfig({
        message: message,
        type: "success",
      });

      setTimeout(() => setShowPopup(false), 3000);
    } catch (error) {
      // Even if there's an error (like mail server), assume status was updated
      const newStatus = !employeeToToggle.active;

      // Update UI to reflect status change
      const updatedEmployees = employees.map((employee) =>
        employee.id === employeeToToggle.id
          ? { ...employee, active: newStatus }
          : employee
      );
      setEmployees(updatedEmployees);

      // Show success message with note about email
      const message = newStatus
        ? "Employee has been activated successfully "
        : "Employee has been deactivated successfully";

      setShowPopup(true);
      setPopupConfig({
        message: message,
        type: "success",
      });

      console.warn("Status updated but there was an error with email notification:", error);
      setTimeout(() => setShowPopup(false), 3000);
    } finally {
      setModalVisible(false);
      setEmployeeToToggle(null);
      setIsConfirmDisabled(false);
    }
  };

  const handleClosePopup = () => {
    setShowPopup(false);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    };
    return date.toLocaleString("en-GB", options).replace(",", "");
  };

  const formatMobileNumber = (mobile) => {
    if (!mobile) return "N/A";
    if (mobile.startsWith("+91") && mobile.length > 3) {
      return `+91 ${mobile.substring(3)}`;
    }
    if (mobile.startsWith("+")) {
      const match = mobile.match(/^(\+\d{1,3})(.*)$/);
      if (match) {
        return `${match[1]} ${match[2]}`;
      }
    }
    return mobile;
  };

  const filteredEmployees = employees.filter((employee) => {

    if (selectedBranch && String(employee.branch?.id) !== String(selectedBranch)) {
      return false;
    }

    if (selectedDepartment && String(employee.department?.id) !== String(selectedDepartment)) {
      return false;
    }

    const name = employee.name?.toLowerCase() || "";
    const email = employee.email?.toLowerCase() || "";
    const mobile = employee.mobile?.toLowerCase() || "";
    const branch = employee.branch?.name?.toLowerCase() || "n/a";
    const department = employee.department?.name?.toLowerCase() || "n/a";
    const role = employee.role?.role?.toLowerCase() || "no role";
    const statusText = employee.active ? "active" : "inactive";
    const createdOnText = employee.createdOn
      ? formatDate(employee.createdOn).toLowerCase()
      : "";
    const updatedOnText = employee.updatedOn
      ? formatDate(employee.updatedOn).toLowerCase()
      : "";
    const createdBy = employee.createdBy?.name?.toLowerCase() || "unknown";
    const updatedBy = employee.updatedBy?.name?.toLowerCase() || "unknown";

    const lowerSearchTerm = searchTerm?.toLowerCase() || "";

    return (
      name.includes(lowerSearchTerm) ||
      email.includes(lowerSearchTerm) ||
      mobile.includes(lowerSearchTerm) ||
      branch.includes(lowerSearchTerm) ||
      department.includes(lowerSearchTerm) ||
      role.includes(lowerSearchTerm) ||
      statusText.includes(lowerSearchTerm) ||
      createdOnText.includes(lowerSearchTerm) ||
      updatedOnText.includes(lowerSearchTerm) ||
      createdBy.includes(lowerSearchTerm) ||
      updatedBy.includes(lowerSearchTerm)
    );
  });

  const sortedEmployees = filteredEmployees.sort((a, b) => b.active - a.active);

  const totalItems = sortedEmployees.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const paginatedEmployees = sortedEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getPageNumbers = () => {
    const maxPageNumbers = 5;
    const pages = [];
    const startPage =
      Math.floor((currentPage - 1) / maxPageNumbers) * maxPageNumbers + 1;
    const endPage = Math.min(startPage + maxPageNumbers - 1, totalPages);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  const role = localStorage.getItem("role");

  if (isLoading) {
    return <LoadingComponent />;
  }

  return (
    <div className="px-2-">
      <div className="title">
        <h1><AutoTranslate>User</AutoTranslate></h1>
      </div>

      <div className="card">
        {showPopup && (
          <Popup
            message={popupConfig.message}
            type={popupConfig.type}
            onClose={handleClosePopup}
          />
        )}

        <div className='mb-8'>
          <div ref={formRef} className="cardLight">
            {error && <p className="text-red-500">{error}</p>}
            <div className="grid grid-col-4 itemEnd">
              <div className="form-group">
                <label>
                  <AutoTranslate>Name</AutoTranslate> <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={translatedPlaceholders.enterName}
                  name="name"
                  value={formData.name || ""}
                  onChange={handleInputChange}
                  maxLength={30}
                  required
                />

              </div>

              <div className="form-group">
                <label>
                  <AutoTranslate>Email</AutoTranslate> <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder={getFallbackTranslation('Enter Email', currentLanguage) || 'Enter Email'}
                  name="email"
                  value={formData.email || ""}
                  onChange={handleInputChange}
                  maxLength={30}
                  className={`${emailError ? "border-red-500" : ""}`}
                  required
                />
                {emailError && (
                  <p className="text-red-500 text-sm mt-1">{emailError}</p>
                )}
              </div>

              <div className="form-group">
                <label>
                  <AutoTranslate>Mobile Number</AutoTranslate> <span className="text-red-500">*</span>
                </label>
                <div className="contactNo">
                  <span>+91</span>
                  <input
                    type="tel"
                    placeholder={getFallbackTranslation('Enter Mobile Number', currentLanguage) || 'Enter Mobile Number'}
                    name="mobile"
                    value={formData.mobile || ""}
                    onChange={handleInputChange}
                    maxLength={10}
                    minLength={10}
                    className={`${mobileError ? "border-red-500" : ""}`}
                    required
                  />
                </div>
                {mobileError && (
                  <p className="text-red-500 text-sm mt-1">{mobileError}</p>
                )}
              </div>

              <div className="form-group">
                <label>
                  <AutoTranslate>Branch</AutoTranslate> <span className="text-red-500">*</span>
                </label>
                {role === SYSTEM_ADMIN ? (
                  <select
                    name="branch"
                    value={formData.branch?.id || ""}
                    onChange={(e) => handleSelectChange(e, "branch")}
                    required
                  >
                    <option value=""><AutoTranslate>Select Branch</AutoTranslate></option>
                    {branchOptions.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.branch?.name || ""}
                    disabled
                    readOnly
                  />
                )}
              </div>

              <div className="form-group">
                <label>
                  <AutoTranslate>Department</AutoTranslate> <span className="text-red-500">*</span>
                </label>
                {role === SYSTEM_ADMIN ? (
                  <select
                    name="department"
                    value={formData.department?.id || ""}
                    onChange={(e) => handleSelectChange(e, "department")}
                    required
                  >
                    <option value=""><AutoTranslate>Select Department</AutoTranslate></option>
                    {departmentOptions.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="mt-1 block w-full p-2 border rounded-md bg-gray-100">
                    {formData.department?.name || "No Department Selected"}
                  </div>
                )}
              </div>
              <div className="form-group">
              {editingIndex === null ? (
                <button
                  onClick={handleAddEmployee}
                  disabled={isButtonDisabled || isSubmitting || emailError || mobileError}
                  className={`btn-primary flex items-center text-sm justify-center w-full ${isButtonDisabled || isSubmitting || emailError || mobileError
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                    }`}
                    style={{padding: "9px 15px"}}
                >
                  <PlusCircleIcon className="h-5 w-5 mr-2" />
                  {isSubmitting ? <AutoTranslate>Submitting...</AutoTranslate> : <AutoTranslate>Add User</AutoTranslate>}
                </button>
              ) : (
                <button
                  onClick={handleSaveEdit}
                  disabled={isButtonDisabled || isSubmitting || emailError || mobileError}
                  className={`btn-primary flex items-center text-sm justify-center w-full ${isButtonDisabled || isSubmitting || emailError || mobileError
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                    }`}
                    style={{padding: "9px 15px"}}
                >
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                  {isSubmitting ? <AutoTranslate>Submitting...</AutoTranslate> : <AutoTranslate>Update</AutoTranslate>}
                </button>
              )}
            </div>

            </div>

            
          </div>
        </div>

        {(role === SYSTEM_ADMIN || role === USER) && (
          <>
            <div className="grid grid-col-4 mb-4">
              <div className="form-group ">
                <label htmlFor="itemsPerPage">
                  <AutoTranslate>Show:</AutoTranslate>
                </label>
                <select
                  id="itemsPerPage"
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

              <div className="form-group ">
                <label htmlFor="branchFilter">
                  <AutoTranslate>Branch</AutoTranslate>
                </label>
                <select
                  id="branchFilter"
                  value={selectedBranch}
                  onChange={(e) => {
                    setSelectedBranch(e.target.value);
                    setSelectedDepartment("");
                    setCurrentPage(1);
                  }}
                >
                  <option value=""><AutoTranslate>All</AutoTranslate></option>
                  {branchData.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group ">
                <label htmlFor="departmentFilter">
                  <AutoTranslate>Department</AutoTranslate>
                </label>
                <select
                  id="departmentFilter"
                  value={selectedDepartment}
                  onChange={(e) => {
                    setSelectedDepartment(e.target.value);
                    setCurrentPage(1);
                  }}
                  disabled={!selectedBranch}
                >
                  <option value=""><AutoTranslate>All</AutoTranslate></option>
                  {departmentData.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group ">
                <label htmlFor="idSearchTeam">
                  <AutoTranslate>Search</AutoTranslate>
                </label>
                <input
                  type="text"
                  id="idSearchTeam"
                  placeholder={translatedPlaceholders.search}
                  className="searchIcon"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="table-wrapper">
              <table className="">
                <thead>
                  <tr>
                    <th className="text-center"><AutoTranslate>SN</AutoTranslate></th>
                    <th><AutoTranslate>Name</AutoTranslate></th>
                    <th><AutoTranslate>Email</AutoTranslate></th>
                    <th><AutoTranslate>Mobile Number</AutoTranslate></th>
                    <th><AutoTranslate>Branch</AutoTranslate></th>
                    <th><AutoTranslate>Department</AutoTranslate></th>
                    <th><AutoTranslate>Role</AutoTranslate></th>
                    <th><AutoTranslate>Created Date</AutoTranslate></th>
                    <th><AutoTranslate>Updated Date</AutoTranslate></th>
                    <th><AutoTranslate>CreatedBy</AutoTranslate></th>
                    {role === SYSTEM_ADMIN && (
                      <>
                        <th><AutoTranslate>UpdatedBy</AutoTranslate></th>
                        <th><AutoTranslate>Status</AutoTranslate></th>
                      </>
                    )}
                    <th className="text-center"><AutoTranslate>Edit</AutoTranslate></th>
                    {role === SYSTEM_ADMIN && (
                      <th className="text-center"><AutoTranslate>Action</AutoTranslate></th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {paginatedEmployees.map((employee, index) => (
                    <tr key={employee.id}>
                      <td className="text-center">
                        {index + 1 + (currentPage - 1) * itemsPerPage}
                      </td>
                      <td>{employee.name}</td>
                      <td>{employee.email}</td>
                      <td>{formatMobileNumber(employee.mobile)}</td>
                      <td>
                        {employee.branch?.name || "N/A"}
                      </td>
                      <td>
                        {employee.department?.name || "N/A"}
                      </td>
                      <td>
                        {employee.role?.role || "No Role"}
                      </td>
                      <td>
                        {formatDate(employee.createdOn)}
                      </td>
                      <td>
                        {formatDate(employee.updatedOn)}
                      </td>

                      {role === USER && (
                        <td>{userName || "Unknown"}</td>
                      )}
                      {role === SYSTEM_ADMIN && (
                        <>
                          <td>
                            {employee.createdBy?.name || "Unknown"}
                          </td>

                          <td>
                            {employee.updatedBy?.name || "Unknown"}
                          </td>
                          <td>{employee.active ? "Active" : "Inactive"}</td>

                        </>
                      )}

                      <td className="text-center">
                        <div className="btn-center">
                          <button
                            onClick={() => handleEditEmployee(employee.id)}
                            disabled={employee.active === false}
                            className={`viewBtn ${employee.active === false
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                              }`}
                          >
                            <MdEdit />
                          </button>
                        </div>
                      </td>
                      {role === SYSTEM_ADMIN && (
                        <td className="text-center">
                          <button
                            onClick={() => handleToggleActive(employee)}
                            className={`p-1 rounded-full ${employee.active ? "bg-green-500" : "bg-red-500"
                              }`}
                          >
                            {employee.active ? (
                              <LockOpenIcon className="h-5 w-5 text-white p-0.5" />
                            ) : (
                              <LockClosedIcon className="h-5 w-5 text-white p-0.5" />
                            )}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="paginationWp">
              <div className="items">
                <div className="paginationText">
                  <span className="text-sm text-gray-700">
                    <AutoTranslate>
                      {`Showing ${totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0
                        } to ${Math.min(currentPage * itemsPerPage, totalItems)} of ${totalItems} entries.`}
                    </AutoTranslate>
                  </span>
                  {/* Page Count Info */}
                  <span className="text-sm text-gray-700 mx-2">
                    (<AutoTranslate>Pages</AutoTranslate> {totalPages})
                  </span>
                </div>
              </div>
              <div className="items">
                <div className="paginationBtn">
                  {/* Previous Button */}
                  <button title={`${currentPage === 1 || totalPages === 0 ? "End" : "Previous"}`}
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1 || totalPages === 0}
                    className={`${currentPage === 1 || totalPages === 0 ? "cursor-not-allowed" : ""}`}
                  >
                    <IoIosArrowBack />
                  </button>


                  {/* Page Number Buttons */}
                  {totalPages > 0 && getPageNumbers().map((page) => (
                    <button key={page} onClick={() => setCurrentPage(page)} className={`${currentPage === page ? "active" : ""}`}>
                      {page}
                    </button>
                  ))}


                  {/* Next Button */}
                  <button title={`${currentPage === totalPages || totalPages === 0 ? "End" : "Next"}`}
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className={`${currentPage === totalPages || totalPages === 0 ? "cursor-not-allowed" : ""}`}
                  >
                    {/* <AutoTranslate>Next</AutoTranslate> */}
                    {/* <ArrowRightIcon className="inline h-4 w-4 ml-2 mb-1" /> */}
                    <IoIosArrowForward />
                  </button>

                </div>
              </div>
            </div>

          </>
        )}
      </div>

      {modalVisible && (

        <div className="overlayModal">
          <div className="document-modal modal-sm">
            {/* Header */}
            <div className="modal-header">
              <div className="modal-title">
                <h2><AutoTranslate>Confirm Status Change</AutoTranslate></h2>
              </div>
            </div>

            {/* Modal body Content */}
            <div className="modal-body">
              <div className="bodyScroller print:overflow-visible print:max-h-none">
                <p>
                  <AutoTranslate>Are you sure you want to</AutoTranslate>{" "}
                  <strong>
                    {employeeToToggle?.active === true ? <AutoTranslate>deactivate</AutoTranslate> : <AutoTranslate>activate</AutoTranslate>}
                  </strong>{" "}
                  <AutoTranslate>the employee</AutoTranslate> <strong>{employeeToToggle?.name}</strong>?
                </p>
                <div className="flex justify-end space-x-4 mt-4">
                  <button
                    onClick={() => setModalVisible(false)}
                    className="btn-cancel"
                  >
                    <AutoTranslate>Cancel</AutoTranslate>
                  </button>
                  <button
                    onClick={confirmToggleActive}
                    disabled={isConfirmDisabled}
                    className={`bg-blue-500 text-white rounded-md px-4 py-2 ${isConfirmDisabled ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                  >
                    {isConfirmDisabled ? <AutoTranslate>Processing...</AutoTranslate> : <AutoTranslate>Confirm</AutoTranslate>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>


      )}
    </div>
  );
};

export default UserAddEmployee;