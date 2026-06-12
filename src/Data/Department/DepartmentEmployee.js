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
import { API_HOST } from "../../API/apiConfig";
import Popup from '../../Components/Popup';
import LoadingComponent from "../../Components/LoadingComponent";
import AutoTranslate from '../../i18n/AutoTranslate';
import { useLanguage } from '../../i18n/LanguageContext';
import { getFallbackTranslation } from '../../i18n/autoTranslator';
import apiClient from "../../API/apiClient"
import { IoIosArrowForward, IoIosArrowBack } from "react-icons/io";

const DepartmentEmployee = () => {
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
        search: 'Search...'
    });

    const [employees, setEmployees] = useState([]);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        mobile: "",
        branch: { id: "", name: "" },
        department: { id: "", name: "" },
    });
    const [searchTerm, setSearchTerm] = useState("");
    const [branchData, setBranchData] = useState([]);
    const [departmentData, setDepartmentData] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState("");
    const [selectedDepartment, setSelectedDepartment] = useState("");
    const [editingIndex, setEditingIndex] = useState(null);
    const [itemsPerPage, setItemsPerPage] = useState(5);
    const [currentPage, setCurrentPage] = useState(1);
    const [modalVisible, setModalVisible] = useState(false);
    const [employeeToToggle, setEmployeeToToggle] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [, setError] = useState("");
    const [userBranch, setUserBranch] = useState(null);
    const [userDepartment, setUserDepartment] = useState(null);
    const [isConfirmDisabled, setIsConfirmDisabled] = useState(false);
    const [emailError, setEmailError] = useState("");
    const [mobileError, setMobileError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const [popupConfig, setPopupConfig] = useState({
        message: '',
        type: 'default'
    });
    const [isButtonDisabled, setIsButtonDisabled] = useState(false);

    const formRef = useRef(null); // Ref for the form section

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
                    search: 'Search...'
                });
                return;
            }

            const namePlaceholder = await translatePlaceholder('Enter name');
            const emailPlaceholder = await translatePlaceholder('Enter email');
            const phonePlaceholder = await translatePlaceholder('Enter phone number');
            const searchPlaceholder = await translatePlaceholder('Search...');

            setTranslatedPlaceholders({
                enterName: namePlaceholder,
                enterEmail: emailPlaceholder,
                enterPhone: phonePlaceholder,
                search: searchPlaceholder
            });
        };

        updatePlaceholders();
    }, [currentLanguage, translatePlaceholder, isTranslationNeeded]);

    useEffect(() => {
        fetchUserDetails();
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
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    };

    const validateMobile = (mobile) => {
        const re = /^\d{10}$/;
        return re.test(mobile);
    };

    useEffect(() => {
        if (userBranch && userDepartment) {
            fetchDepartmentEmployees();
        }
    }, [userBranch, userDepartment]);

    const fetchUserDetails = async () => {
        setIsLoading(true);
        setError("");
        try {
            const userId = localStorage.getItem("id");
            const token = localStorage.getItem("tokenKey");

            const response = await apiClient.get(`${API_HOST}/employee/findById/${userId}`);

            setUserBranch(response.data.branch);
            setUserDepartment(response.data.department);
            setFormData(prevData => ({
                ...prevData,
                branch: response.data.branch,
                department: response.data.department
            }));
        } catch (error) {
            console.error("Error fetching user details:", error);
            setError("Error fetching user details.");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchDepartmentEmployees = async () => {
        setIsLoading(true);
        setError("");
        try {
            const token = localStorage.getItem("tokenKey");
            const response = await apiClient.get(`${API_HOST}/employee/department/${userDepartment.id}`);
            setEmployees(response.data.response);
        } catch (error) {
            setError("Error fetching department employees.");
        } finally {
            setIsLoading(false);
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

    const handleAddEmployee = async () => {
        // Validate all fields before submission
        if (!formData.name) {
            setError("Name is required");
            return;
        }
        if (!formData.email || !validateEmail(formData.email)) {
            setEmailError("Please enter a valid email address");
            return;
        }
        if (!formData.mobile || !validateMobile(formData.mobile)) {
            setMobileError("Please enter exactly 10 digits");
            return;
        }

        setIsSubmitting(true);
        setIsButtonDisabled(true);

        try {
            const token = localStorage.getItem("tokenKey");
            const userId = localStorage.getItem("id");

            if (!userId) {
                setError("User authentication error. Please log in again.");
                setIsSubmitting(false);
                setIsButtonDisabled(false);
                return;
            }

            const createdBy = { id: userId };
            const updatedBy = { id: userId };

            // Generate password: first 4 letters of name + last 4 digits of mobile
            const namePrefix = formData.name.slice(0, 4).toUpperCase().padEnd(4, ' ');
            const mobileSuffix = formData.mobile.slice(-4);
            const generatedPassword = `${namePrefix}${mobileSuffix}`;

            const employeeData = {
                password: generatedPassword,
                mobile: formData.mobile,
                email: formData.email,
                name: formData.name,
                isActive: 1,
                createdOn: new Date().toISOString(),
                updatedOn: new Date().toISOString(),
                createdBy,
                updatedBy,
                department: userDepartment,
                branch: userBranch,
            };

            const response = await apiClient.post(
                `${API_HOST}/register/create`,
                employeeData,
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );

            if (response.data) {
                setEmployees([...employees, response.data]);

                setFormData({
                    name: "",
                    email: "",
                    mobile: "",
                    branch: userBranch,
                    department: userDepartment,
                });
                setError("");

                setShowPopup(true);
                setPopupConfig({
                    message: `Dear User, Your password is first 4 characters of your name and last 4 digits of your mobile number. 
                         \nName: ${formData.name}, Mobile No.: ${formData.mobile}, then password: ${generatedPassword}`,
                    type: "success",
                });

                setTimeout(() => setShowPopup(false), 5000);
            }
        } catch (error) {
            console.error("Error adding employee:", error);

            // Generate password for the message even in error case
            const namePrefix = formData.name.slice(0, 4).toUpperCase().padEnd(4, ' ');
            const mobileSuffix = formData.mobile.slice(-4);
            const generatedPassword = `${namePrefix}${mobileSuffix}`;

            // Get the backend error message
            const backendMessage = error.response?.data?.message || "";

            // Check if it's the generic "We encountered an issue..." message
            if (backendMessage.includes("We encountered an issue while processing your request")) {
                // Replace with password format message
                setShowPopup(true);
                setPopupConfig({
                    message: `Dear User, Your password is first 4 characters of your name and last 4 digits of your mobile number. 
                         \nName: ${formData.name}, Mobile No.: ${formData.mobile}, then password: ${generatedPassword}`,
                    type: "success",
                });
            } else {
                // For other specific error messages (like duplicate email), show them
                setShowPopup(true);
                setPopupConfig({
                    message: backendMessage || "Email address is already registered. Please use a different one.",
                    type: "error",
                });
            }

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
            setFormData({
                id: employeeToEdit.id,
                name: employeeToEdit.name,
                email: employeeToEdit.email,
                mobile: employeeToEdit.mobile,
                branch: userBranch,
                department: userDepartment,
                password: "",
                createdOn: employeeToEdit.createdOn,
                enabled: employeeToEdit.enabled,
            });

            // Scroll to form section
            if (formRef.current) {
                formRef.current.scrollIntoView({ behavior: 'smooth' });
            }
        }
    };

    const handleSaveEdit = async () => {
        // Validate all fields before submission
        if (!formData.name) {
            setError("Name is required");
            return;
        }
        if (!formData.email || !validateEmail(formData.email)) {
            setEmailError("Please enter a valid email address");
            return;
        }
        if (!formData.mobile || !validateMobile(formData.mobile)) {
            setMobileError("Please enter exactly 10 digits");
            return;
        }

        setIsSubmitting(true);
        setIsButtonDisabled(true);

        try {
            const token = localStorage.getItem("tokenKey");

            const updatedEmployeeData = {
                name: formData.name,
                email: formData.email,
                mobile: formData.mobile,
                branch: userBranch,
                department: userDepartment,
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

            if (response.data) {
                const updatedEmployees = employees.map((emp) =>
                    emp.id === formData.id ? response.data : emp
                );
                setEmployees(updatedEmployees);

                setFormData({
                    name: "",
                    email: "",
                    mobile: "",
                    department: userDepartment,
                    branch: userBranch,
                });

                setError("");
                setShowPopup(true);
                setPopupConfig({
                    message: "Employee updated successfully",
                    type: "success",
                });

                setTimeout(() => setPopupConfig({ message: "", type: "" }), 3000);

                setEditingIndex(null);
            }
        } catch (error) {
            console.error("Error updating employee:", error);
            const errorMessage = error.response?.data?.message || "Error updating employee. Please try again.";

            setShowPopup(true);
            setPopupConfig({
                message: errorMessage,
                type: "error",
            });
        } finally {
            setIsSubmitting(false);
            setIsButtonDisabled(false);
        }
    };

    const handleToggleActive = (employee) => {
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
        if (popupConfig.type === 'success') {

        } else {
            setShowPopup(false);
        }
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

    const filteredEmployees = employees.filter((employee) => {
        if (selectedBranch && String(employee.branch?.id) !== String(selectedBranch)) {
            return false;
        }

        // --- Apply Department Filter ---
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
        const createdOnText = employee.createdOn ? formatDate(employee.createdOn).toLowerCase() : "";
        const updatedOnText = employee.updatedOn ? formatDate(employee.updatedOn).toLowerCase() : "";
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
        const startPage = Math.floor((currentPage - 1) / maxPageNumbers) * maxPageNumbers + 1;
        const endPage = Math.min(startPage + maxPageNumbers - 1, totalPages);

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }

        return pages;
    };

    if (isLoading) {
        return <LoadingComponent />;
    }

    return (
        <div className="px-2-">
            <div className="title">
                <h1><AutoTranslate>Department Users</AutoTranslate></h1>
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
                                    placeholder={translatedPlaceholders.enterEmail}
                                    name="email"
                                    value={formData.email || ""}
                                    onChange={handleInputChange}
                                    maxLength={30}
                                    className={`${emailError ? "border-red-500" : ""
                                        }`}
                                    required
                                />
                                {emailError && (
                                    <p className="text-red-500 text-sm mt-1">{emailError}</p>
                                )}
                            </div>

                            <div className="form-group">
                                <label>
                                    <AutoTranslate>Phone</AutoTranslate> <span className="text-red-500">*</span>
                                </label>
                                <div className="contactNo">
                                    <span>
                                        +91
                                    </span>
                                    <input
                                        type="tel"
                                        placeholder={translatedPlaceholders.enterPhone}
                                        name="mobile"
                                        value={formData.mobile || ""}
                                        onChange={handleInputChange}
                                        maxLength={10}
                                        minLength={10}
                                        className={`${mobileError ? "border-red-500" : ""
                                            }`}
                                        required
                                    />
                                </div>
                                {mobileError && (
                                    <p className="text-red-500 text-sm mt-1">{mobileError}</p>
                                )}

                            </div>

                            <div className="form-group">
                                <label>
                                    <AutoTranslate>Branch</AutoTranslate>
                                </label>
                                <input
                                    type="text"
                                    name="branch"
                                    value={userBranch ? userBranch.name : "Loading..."}
                                    disabled
                                />
                            </div>

                            <div className="form-group">
                                <label>
                                    <AutoTranslate>Department</AutoTranslate>
                                </label>
                                <input
                                    type="text"
                                    name="department"
                                    value={userDepartment ? userDepartment.name : "Loading..."}
                                    disabled
                                />
                            </div>
                            <div className="form-group">
                                {editingIndex === null ? (
                                    <button
                                        onClick={handleAddEmployee}
                                        disabled={isButtonDisabled || isSubmitting}
                                        className={`btn-primary flex items-center text-sm justify-center w-full ${isButtonDisabled || isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        style={{ padding: "9px 15px" }}>
                                        <PlusCircleIcon className="h-5 w-5 mr-1" />
                                        {isSubmitting ? <AutoTranslate>Submitting...</AutoTranslate> : <AutoTranslate>Add User</AutoTranslate>}
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleSaveEdit}
                                        disabled={isButtonDisabled || isSubmitting}
                                        className={`btn-primary flex items-center text-sm justify-center ${isButtonDisabled || isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        style={{ padding: "9px 15px" }}>
                                        <CheckCircleIcon className="h-5 w-5 mr-1" />
                                        {isSubmitting ? <AutoTranslate>Submitting...</AutoTranslate> : <AutoTranslate>Update</AutoTranslate>}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>


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

                    {/* Branch Filter */}
                    <div className="form-group ">
                        <label htmlFor="branchFilter" >
                            <AutoTranslate>Branch</AutoTranslate>
                        </label>
                        <select
                            id="branchFilter"
                            value={selectedBranch}
                            onChange={(e) => {
                                setSelectedBranch(e.target.value);
                                setSelectedDepartment(""); // reset department when branch changes
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


                    {/* Department Filter */}
                    <div className="form-group ">
                        <label htmlFor="departmentFilter" >
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

                    {/* Search */}
                    <div className="form-group ">
                        <label htmlFor="searchId" >
                            <AutoTranslate>Search</AutoTranslate>
                        </label>
                        <input
                            type="text"
                            id="searchId"
                            placeholder={translatedPlaceholders.search}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="searchIcon"
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
                                <th><AutoTranslate>Phone No.</AutoTranslate></th>
                                <th><AutoTranslate>Branch</AutoTranslate></th>
                                <th><AutoTranslate>Department</AutoTranslate></th>
                                <th><AutoTranslate>Role</AutoTranslate></th>
                                <th><AutoTranslate>Created Date</AutoTranslate></th>
                                <th><AutoTranslate>Updated Date</AutoTranslate></th>
                                <th><AutoTranslate>CreatedBy</AutoTranslate></th>
                                <th><AutoTranslate>UpdatedBy</AutoTranslate></th>
                                <th><AutoTranslate>Status</AutoTranslate></th>
                                <th className="text-center"><AutoTranslate>Edit</AutoTranslate></th>
                                <th className="text-center"><AutoTranslate>Action</AutoTranslate></th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedEmployees.map((employee, index) => (
                                <tr key={employee.id}>
                                    <td className="text-center">{index + 1 + (currentPage - 1) * itemsPerPage}</td>
                                    <td>{employee.name}</td>
                                    <td>{employee.email}</td>
                                    <td>{employee.mobile}</td>
                                    <td>
                                        {employee.branch?.name || "N/A"}
                                    </td>
                                    <td>{employee.department?.name || "N/A"}</td>
                                    <td>{employee.role?.role || "No Role"}</td>
                                    <td>{formatDate(employee.createdOn)}</td>
                                    <td>{formatDate(employee.updatedOn)}</td>
                                    <td>
                                        {employee.createdBy?.name || "Unknown"}
                                    </td>
                                    <td>
                                        {employee.updatedBy?.name || "Unknown"}
                                    </td>
                                    <td>{employee.active ? "Active" : "Inactive"}</td>
                                    <td className="text-center">
                                        <div className="btn-center">
                                            <button
                                                onClick={() => handleEditEmployee(employee.id)}
                                                disabled={employee.active === false}
                                                className={`viewBtn ${employee.active === false ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                <PencilIcon />
                                            </button>
                                        </div>
                                    </td>
                                    <td className="text-center">
                                        <button
                                            onClick={() => handleToggleActive(employee)}
                                            className={`p-1 rounded-full ${employee.active ? "bg-green-500" : "bg-red-500"}`}
                                        >
                                            {employee.active ? (
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
                                <IoIosArrowForward />
                            </button>

                        </div>
                    </div>
                </div>
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
                                        {employeeToToggle.active === true ? <AutoTranslate>deactivate</AutoTranslate> : <AutoTranslate>activate</AutoTranslate>}
                                    </strong>{" "}
                                    <AutoTranslate>the employee</AutoTranslate> <strong>{employeeToToggle.name}</strong> ?
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
                                        className={`bg-blue-500 text-white rounded-md px-4 py-2 ${isConfirmDisabled ? 'opacity-50 cursor-not-allowed' : ''
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

export default DepartmentEmployee;