import Popup from "../Components/Popup";
import LoadingComponent from '../Components/LoadingComponent';
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
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  REGISTER_API,
  EMPLOYEE_API,
  BRANCH_API,
  DEPAETMENT_API,
  ROLE_API,
} from "../API/apiConfig";
import { API_HOST } from "../API/apiConfig";

const UserAddEmployee = () => {
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
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [userName, setUserName] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
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
  
  const formRef = useRef(null); // Ref for the form section

  useEffect(() => {
    fetchEmployees();
    fetchOptions();
  }, []);

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validateMobile = (mobile) => {
    const re = /^\d{10}$/;
    return re.test(mobile);
  };

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const userId = localStorage.getItem("userId");
      const token = localStorage.getItem("tokenKey");

      const userResponse = await axios.get(
        `${EMPLOYEE_API}/findById/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

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

      setFormData((prevData) => ({
        ...prevData,
        branch: userBranch,
        department: userDepartment,
      }));

      const isAdmin = userData.role?.role?.toUpperCase() === "ADMIN";

      if (isAdmin) {
        const allEmployeesResponse = await axios.get(
          `${API_HOST}/employee/findAll`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setEmployees(allEmployeesResponse.data);
      } else {
        const createdByResponse = await axios.get(
          `${API_HOST}/employee/employeeCreateby/${userData.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
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

      const branchesRes = await axios.get(`${BRANCH_API}/findActiveRole`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

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

      const departmentsRes = await axios.get(
        `${DEPAETMENT_API}/findByBranch/${branchId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

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
      const isValid = validateEmail(value);
      setEmailError(isValid ? "" : "Please enter a valid email address (must contain @)");
    }

    if (name === "mobile") {
      const numericValue = value.replace(/\D/g, '');
      const isValid = numericValue.length === 10;
      setMobileError(isValid ? "" : "Please enter exactly 10 digits");
      setFormData(prev => ({ ...prev, mobile: numericValue }));
      return;
    }

    if (name === "name") {
      const regex = /^[A-Za-z\s]*$/; // Only letters and spaces
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
      fetchDepartments(value);
    }
  };

  const handleCountryCodeChange = (e) => {
    setFormData(prev => ({ ...prev, countryCode: e.target.value }));
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
      setEmailError("Please enter a valid email address");
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
      const userId = parseInt(localStorage.getItem("userId"), 10);

      const fullMobileNumber = `${formData.countryCode}${formData.mobile}`;

      const employeeData = {
        name: formData.name,
        email: formData.email,
        mobile: fullMobileNumber,
        password: `${formData.name}${formData.mobile.slice(0, 4)}`,
        isActive: 0,
        createdBy: { id: userId },
        updatedBy: { id: userId },
        department: { id: parseInt(formData.department.id, 10) },
        branch: { id: parseInt(formData.branch.id, 10) },
        createdOn: new Date().toISOString(),
        updatedOn: new Date().toISOString(),
      };

      const response = await axios.post(
        `${REGISTER_API}/create`,
        employeeData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setShowPopup(true);
      setPopupConfig({
        message: "Employee added successfully!",
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

      setTimeout(() => setShowPopup(false), 3000);

    } catch (error) {
      const errorMessage =
        error.response?.data?.message || // Extract message from response object
        error.response?.data ||          // Fallback to entire response if no message
        "Failed to add employee. Please try again.";
      
      setShowPopup(true);
      setPopupConfig({
        message: typeof errorMessage === 'object' ? JSON.stringify(errorMessage) : errorMessage,
        type: "error",
      });
      setTimeout(() => setShowPopup(false), 3000);
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
      
      // Scroll to form section
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

      const response = await axios.put(
        `${API_HOST}/employee/update/${formData.id}`,
        updatedEmployeeData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setShowPopup(true);
      setPopupConfig({
        message: "Employee updated successfully!",
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

      const response = await axios.put(
        `${API_HOST}/employee/updateStatus/${employeeToToggle.id}`,
        newStatus,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("tokenKey")}`,
            "Content-Type": "application/json",
          },
        }
      );

      const message = newStatus
        ? "Employee has been activated."
        : "Employee has been deactivated.";

      setShowPopup(true);
      setPopupConfig({
        message: message,
        type: "success",
      });

      const updatedEmployees = employees.map((employee) =>
        employee.id === employeeToToggle.id
          ? { ...employee, active: newStatus }
          : employee
      );
      setEmployees(updatedEmployees);

      setTimeout(() => setShowPopup(false), 3000);
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        "Error toggling employee status. Please try again.";
      setShowPopup(true);
      setPopupConfig({
        message: errorMessage,
        type: "error",
      });
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
    <div className="px-2">
      <h1 className="text-2xl mb-1 font-semibold">USERS</h1>
      <div className="bg-white p-4 rounded-lg shadow-sm">
        {error && <p className="text-red-500">{error}</p>}
        {showPopup && (
          <Popup
            message={popupConfig.message}
            type={popupConfig.type}
            onClose={handleClosePopup}
          />
        )}

        <div ref={formRef} className="mb-4 bg-slate-100 p-6 rounded-lg shadow-md">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <label className="block text-md font-medium text-gray-700">
              Name <span className="text-red-500">*</span>
              <input
                type="text"
                placeholder="Enter name"
                name="name"
                value={formData.name || ""}
                onChange={handleInputChange}
                maxLength={30}
                className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </label>

            <label className="block text-md font-medium text-gray-700">
              Email <span className="text-red-500">*</span>
              <input
                type="email"
                placeholder="Enter email"
                name="email"
                value={formData.email || ""}
                onChange={handleInputChange}
                maxLength={30}
                className={`mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500 ${emailError ? "border-red-500" : ""
                  }`}
                required
              />
              {emailError && (
                <p className="text-red-500 text-sm mt-1">{emailError}</p>
              )}
            </label>

            <label className="block text-md font-medium text-gray-700">
              Phone <span className="text-red-500">*</span>
              <div className="flex mt-1">
                <span className="w-20 p-2 border rounded-l-md bg-gray-100 text-center text-gray-700">
                  +91
                </span>
                <input
                  type="tel"
                  placeholder="Enter phone number"
                  name="mobile"
                  value={formData.mobile || ""}
                  onChange={handleInputChange}
                  maxLength={10}
                  minLength={10}
                  className={`flex-1 p-2 border rounded-r-md outline-none focus:ring-2 focus:ring-blue-500 ${mobileError ? "border-red-500" : ""
                    }`}
                  required
                />
              </div>
              {mobileError && (
                <p className="text-red-500 text-sm mt-1">{mobileError}</p>
              )}
            </label>

            <label className="block text-md font-medium text-gray-700">
              Branch <span className="text-red-500">*</span>
              {role === "ADMIN" ? (
                <select
                  name="branch"
                  value={formData.branch?.id || ""}
                  onChange={(e) => handleSelectChange(e, "branch")}
                  className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="" disabled>
                    Select Branch
                  </option>
                  {branchOptions.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="mt-1 block w-full p-2 border rounded-md bg-gray-100">
                  {formData.branch?.name || "No Branch Selected"}
                </div>
              )}
            </label>

            <label className="block text-md font-medium text-gray-700">
              Department <span className="text-red-500">*</span>
              {role === "ADMIN" ? (
                <select
                  name="department"
                  value={formData.department?.id || ""}
                  onChange={(e) => handleSelectChange(e, "department")}
                  className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="" disabled>
                    Select Department
                  </option>
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
            </label>
          </div>

          <div className="mt-6 flex flex-wrap gap-4">
            {editingIndex === null ? (
              <button
                onClick={handleAddEmployee}
                disabled={isButtonDisabled || isSubmitting || emailError || mobileError}
                className={`bg-blue-900 text-white rounded-2xl p-2 flex items-center text-sm justify-center ${isButtonDisabled || isSubmitting || emailError || mobileError
                  ? "opacity-50 cursor-not-allowed"
                  : ""
                  }`}
              >
                <PlusCircleIcon className="h-5 w-5 mr-2" />
                {isSubmitting ? "Submitting..." : "Add User"}
              </button>
            ) : (
              <button
                onClick={handleSaveEdit}
                disabled={isButtonDisabled || isSubmitting || emailError || mobileError}
                className={`bg-blue-900 text-white rounded-2xl p-2 flex items-center text-sm justify-center ${isButtonDisabled || isSubmitting || emailError || mobileError
                  ? "opacity-50 cursor-not-allowed"
                  : ""
                  }`}
              >
                <CheckCircleIcon className="h-5 w-5 mr-2" />
                {isSubmitting ? "Submitting..." : "Update"}
              </button>
            )}
          </div>
        </div>

        {(role === "ADMIN" || role === "USER") && (
          <>
            <div className="mb-4 bg-slate-100 p-4 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center bg-blue-500 rounded-lg w-full flex-1 md:w-1/5">
                <label
                  htmlFor="itemsPerPage"
                  className="mr-2 ml-2 text-white text-sm"
                >
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

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-2 text-left">SR.</th>
                    <th className="border p-2 text-left">Name</th>
                    <th className="border p-2 text-left">Email</th>
                    <th className="border p-2 text-left">Phone No.</th>
                    <th className="border p-2 text-left">Branch</th>
                    <th className="border p-2 text-left">Department</th>
                    <th className="border p-2 text-left">Role</th>
                    <th className="border p-2 text-left">Created Date</th>
                    <th className="border p-2 text-left">Updated Date</th>
                    <th className="border p-2 text-left">Created By</th>
                    {role === "ADMIN" && (
                      <>
                        <th className="border p-2 text-left">Updated By</th>
                        <th className="border p-2 text-left">Status</th>
                      </>
                    )}
                    <th className="border p-2 text-left">Edit</th>
                    {role === "ADMIN" && (
                      <th className="border p-2 text-left">Access</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {paginatedEmployees.map((employee, index) => (
                    <tr key={employee.id}>
                      <td className="border p-2">
                        {index + 1 + (currentPage - 1) * itemsPerPage}
                      </td>
                      <td className="border p-2">{employee.name}</td>
                      <td className="border p-2">{employee.email}</td>
                      <td className="border p-2">{formatMobileNumber(employee.mobile)}</td>
                      <td className="border p-2">
                        {employee.branch?.name || "N/A"}
                      </td>
                      <td className="border p-2">
                        {employee.department?.name || "N/A"}
                      </td>
                      <td className="border p-2">
                        {employee.role?.role || "No Role"}
                      </td>
                      <td className="border p-2">
                        {formatDate(employee.createdOn)}
                      </td>
                      <td className="border p-2">
                        {formatDate(employee.updatedOn)}
                      </td>

                      {role === "USER" && (
                        <td className="border p-2">{userName || "Unknown"}</td>
                      )}
                      {role === "ADMIN" && (
                        <>
                          <td className="border p-2">
                            {employee.createdBy?.name || "Unknown"}
                          </td>

                          <td className="border p-2">
                            {employee.updatedBy?.name || "Unknown"}
                          </td>
                          <td className="border p-2">
                            {employee.active ? "Active" : "Inactive"}
                          </td>
                        </>
                      )}

                      <td className="border p-2">
                        <button
                          onClick={() => handleEditEmployee(employee.id)}
                          disabled={employee.active === false}
                          className={`${employee.active === false
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                            }`}
                        >
                          <PencilIcon className="h-6 w-6 text-white bg-yellow-400 rounded-xl p-1" />
                        </button>
                      </td>
                      {role === "ADMIN" && (
                        <td className="border p-2">
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

            <div className="flex items-center mt-4">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || totalPages === 0}
                className={`px-3 py-1 rounded mr-3 ${currentPage === 1 || totalPages === 0
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-slate-200 hover:bg-slate-300"
                  }`}
              >
                <ArrowLeftIcon className="inline h-4 w-4 mr-2 mb-1" />
                Previous
              </button>

              {totalPages > 0 &&
                getPageNumbers().map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded mx-1 ${currentPage === page
                      ? "bg-blue-500 text-white"
                      : "bg-slate-200 hover:bg-blue-100"
                      }`}
                  >
                    {page}
                  </button>
                ))}

              <span className="text-sm text-gray-700 mx-2">
                of {totalPages} pages
              </span>

              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages || totalPages === 0}
                className={`px-3 py-1 rounded ml-3 ${currentPage === totalPages || totalPages === 0
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-slate-200 hover:bg-slate-300"
                  }`}
              >
                Next
                <ArrowRightIcon className="inline h-4 w-4 ml-2 mb-1" />
              </button>
              <div className="ml-4">
                <span className="text-sm text-gray-700">
                  Showing{" "}
                  {totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{" "}
                  {Math.min(currentPage * itemsPerPage, totalItems)} of{" "}
                  {totalItems} entries
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {modalVisible && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-80">
            <h2 className="text-lg font-semibold mb-4">
              Confirm Status Change
            </h2>
            <p>
              Are you sure you want to{" "}
              <strong>
                {employeeToToggle.active === true ? "deactivate" : "activate"}
              </strong>{" "}
              the employee <strong>{employeeToToggle.name}</strong> ?
            </p>
            <div className="flex justify-end space-x-4 mt-4">
              <button
                onClick={() => setModalVisible(false)}
                className="bg-gray-500 text-white rounded-md px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={confirmToggleActive}
                disabled={isConfirmDisabled}
                className={`bg-blue-500 text-white rounded-md px-4 py-2 ${isConfirmDisabled ? "opacity-50 cursor-not-allowed" : ""
                  }`}
              >
                {isConfirmDisabled ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserAddEmployee;