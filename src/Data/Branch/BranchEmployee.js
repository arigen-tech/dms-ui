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
import { DEPAETMENT_API } from "../../API/apiConfig";
import { API_HOST } from "../../API/apiConfig";
import Popup from '../../Components/Popup';
import LoadingComponent from '../../Components/LoadingComponent';
import AutoTranslate from '../../i18n/AutoTranslate';
import { useLanguage } from '../../i18n/LanguageContext';
import { getFallbackTranslation } from '../../i18n/autoTranslator';

const BranchEmployee = () => {
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
        selectDepartment: 'Select Department',
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
    const [departmentOptions, setDepartmentOptions] = useState([]);
    const [error, setError] = useState("");
    const [userBranch, setUserBranch] = useState(null);
    const [emailError, setEmailError] = useState("");
    const [mobileError, setMobileError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const [popupConfig, setPopupConfig] = useState({
        message: '',
        type: 'default'
    });
    const [isConfirmDisabled, setIsConfirmDisabled] = useState(false);
    const [isButtonDisabled, setIsButtonDisabled] = useState(false);

    console.log("Error: ", error);

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
                    selectDepartment: 'Select Department',
                    search: 'Search...'
                });
                return;
            }

            const namePlaceholder = await translatePlaceholder('Enter name');
            const emailPlaceholder = await translatePlaceholder('Enter email');
            const phonePlaceholder = await translatePlaceholder('Enter phone number');
            const departmentPlaceholder = await translatePlaceholder('Select Department');
            const searchPlaceholder = await translatePlaceholder('Search...');

            setTranslatedPlaceholders({
                enterName: namePlaceholder,
                enterEmail: emailPlaceholder,
                enterPhone: phonePlaceholder,
                selectDepartment: departmentPlaceholder,
                search: searchPlaceholder
            });
        };

        updatePlaceholders();
    }, [currentLanguage, translatePlaceholder, isTranslationNeeded]);

    useEffect(() => {
        fetchUserBranch();
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
            const response = await axios.get(`${API_HOST}/branchmaster/findActiveRole`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setBranchData(response.data);
        } catch (error) {
            console.error("Error fetching branches:", error);
        }
    };

    const fetchFilterDepartments = async (branchId) => {
        try {
            const token = localStorage.getItem("tokenKey");
            const response = await axios.get(
                `${API_HOST}/DepartmentMaster/findByBranch/${branchId}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            setDepartmentData(response.data);
        } catch (error) {
            console.error("Error fetching departments:", error);
        }
    };

    useEffect(() => {
        if (userBranch) {
            fetchEmployees();
            fetchDepartments();
        }
    }, [userBranch]);

    const validateEmail = (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    };

    const validateMobile = (mobile) => {
        const re = /^\d{10}$/;
        return re.test(mobile);
    };

    const fetchUserBranch = async () => {
        setIsLoading(true);
        setError("");
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
            setFormData(prevData => ({
                ...prevData,
                branch: response.data.branch
            }));
        } catch (error) {
            console.error("Error fetching user branch:", error);
            setError("Error fetching user branch.");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchEmployees = async () => {
        setIsLoading(true);
        setError("");
        try {
            const token = localStorage.getItem("tokenKey");
            const employeeResponse = await axios.get(
                `${API_HOST}/employee/branch/${userBranch.id}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            setEmployees(employeeResponse.data);
        } catch (error) {
            setError("Error fetching employees.");
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return <LoadingComponent />;
    }

    const fetchDepartments = async () => {
        setIsLoading(true);
        setError("");
        try {
            const token = localStorage.getItem("tokenKey");
            const departmentsRes = await axios.get(
                `${DEPAETMENT_API}/findByBranch/${userBranch.id}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            setDepartmentOptions(departmentsRes.data);
        } catch (error) {
            setError("Error fetching departments.");
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

    const handleSelectChange = (e) => {
        const { value, selectedOptions } = e.target;
        const selectedName = selectedOptions[0].text;

        setFormData((prevData) => ({
            ...prevData,
            department: {
                id: value,
                name: selectedName,
            },
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
        if (!formData.department.id) {
            setError("Department is required");
            return;
        }

        setIsSubmitting(true);
        setIsButtonDisabled(true);

        try {
            const token = localStorage.getItem("tokenKey");
            const userId = localStorage.getItem("userId");

            if (!userId) {
                setError("User authentication error. Please log in again.");
                setIsSubmitting(false);
                setIsButtonDisabled(false);
                return;
            }

            const createdBy = { id: userId };
            const updatedBy = { id: userId };

            const employeeData = {
                password: `${formData.name}${formData.mobile.slice(0, 4)}`,
                mobile: formData.mobile,
                email: formData.email,
                name: formData.name,
                isActive: 1,
                createdOn: new Date().toISOString(),
                updatedOn: new Date().toISOString(),
                createdBy,
                updatedBy,
                department: {
                    id: formData.department.id,
                    name: formData.department.name,
                },
                branch: userBranch,
            };

            const response = await axios.post(
                `${API_HOST}/register/create`,
                employeeData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            if (response.data) {
                setEmployees([...employees, response.data]);

                if (response.data.token) {
                    localStorage.setItem("tokenKey", response.data.token);
                }

                setFormData({
                    name: "",
                    email: "",
                    mobile: "",
                    department: { id: "", name: "" },
                });

                setError("");
                setShowPopup(true);
                setPopupConfig({
                    message: "Employee added successfully!",
                    type: "success",
                });

                setTimeout(() => setPopupConfig({ message: "", type: "" }), 3000);
            }
        } catch (error) {
            console.error("Error adding employee:", error);
            const errorMessage = error.response?.data?.message || "Email address is already registered. Please use a different one.";

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
                department: employeeToEdit.department || { id: "", name: "" },
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
        if (!formData.department.id) {
            setError("Department is required");
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

            if (response.data) {
                const updatedEmployees = employees.map((emp) =>
                    emp.id === formData.id ? response.data : emp
                );
                setEmployees(updatedEmployees);

                setFormData({
                    name: "",
                    email: "",
                    mobile: "",
                    department: { id: "", name: "" },
                    password: "",
                    createdOn: "",
                    enabled: false,
                });

                setError("");
                setShowPopup(true);
                setPopupConfig({
                    message: "Employee updated successfully!",
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

            if (response.data) {
                const updatedEmployees = employees.map((employee) =>
                    employee.id === employeeToToggle.id
                        ? { ...employee, active: newStatus }
                        : employee
                );
                setEmployees(updatedEmployees);

                const message = newStatus
                    ? "Employee has been activated."
                    : "Employee has been deactivated.";
                setShowPopup(true);
                setPopupConfig({
                    message: message,
                    type: "success",
                });

                setTimeout(() => setPopupConfig({ message: "", type: "" }), 3000);
            }
        } catch (error) {
            console.error("Error toggling employee status:", error);
            const errorMessage = error.response?.data?.message || "Error toggling employee status. Please try again.";

            setShowPopup(true);
            setPopupConfig({
                message: errorMessage,
                type: "error",
            });
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

    const role = localStorage.getItem("role");

    return (
        <div className="px-2">
            <h1 className="text-2xl mb-1 font-semibold">
                <AutoTranslate>Branch Users</AutoTranslate>
            </h1>
            <div className="bg-white p-4 rounded-lg shadow-sm">
                {showPopup && (
                    <Popup
                        message={popupConfig.message}
                        type={popupConfig.type}
                        onClose={handleClosePopup}
                    />
                )}

                <div ref={formRef} className="mb-4 bg-slate-100 p-4 rounded-lg">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <label className="block text-md font-medium text-gray-700">
                            <AutoTranslate>Name</AutoTranslate> <span className="text-red-500">*</span>
                            <input
                                type="text"
                                placeholder={translatedPlaceholders.enterName}
                                name="name"
                                value={formData.name || ""}
                                onChange={handleInputChange}
                                maxLength={30}
                                className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </label>

                        <label className="block text-md font-medium text-gray-700">
                            <AutoTranslate>Email</AutoTranslate> <span className="text-red-500">*</span>
                            <input
                                type="email"
                                placeholder={translatedPlaceholders.enterEmail}
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
                            <AutoTranslate>Phone</AutoTranslate> <span className="text-red-500">*</span>
                            <div className="flex mt-1">
                                <span className="w-20 p-2 border rounded-l-md bg-gray-100 text-center text-gray-700">
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
                            <AutoTranslate>Branch</AutoTranslate>
                            <input
                                type="text"
                                name="branch"
                                value={userBranch ? userBranch.name : "Loading..."}
                                disabled
                                className="mt-1 block w-full p-2 border rounded-md outline-none bg-gray-100 focus:ring-2 focus:ring-blue-500"
                            />
                        </label>

                        <label className="block text-md font-medium text-gray-700">
                            <AutoTranslate>Department</AutoTranslate>
                            <select
                                name="department"
                                value={formData.department?.id || ""}
                                onChange={handleSelectChange}
                                className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value=""><AutoTranslate>Select Department</AutoTranslate></option>
                                {departmentOptions.map((department) => (
                                    <option key={department.id} value={department.id}>
                                        {department.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <div className="mt-3 flex justify-start">
                        {editingIndex === null ? (
                            <button
                                onClick={handleAddEmployee}
                                disabled={isButtonDisabled || isSubmitting}
                                className={`bg-blue-900 text-white rounded-2xl p-2 flex items-center text-sm justify-center ${isButtonDisabled || isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <PlusCircleIcon className="h-5 w-5 mr-1" />
                                {isSubmitting ? <AutoTranslate>Submitting...</AutoTranslate> : <AutoTranslate>Add User</AutoTranslate>}
                            </button>
                        ) : (
                            <button
                                onClick={handleSaveEdit}
                                disabled={isButtonDisabled || isSubmitting}
                                className={`bg-blue-900 text-white rounded-2xl p-2 flex items-center text-sm justify-center ${isButtonDisabled || isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <CheckCircleIcon className="h-5 w-5 mr-1" />
                                {isSubmitting ? <AutoTranslate>Submitting...</AutoTranslate> : <AutoTranslate>Update</AutoTranslate>}
                            </button>
                        )}
                    </div>
                </div>

                {role === "BRANCH ADMIN" && (
                    <>
                        <div className="mb-4 bg-slate-100 p-4 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex items-center bg-blue-500 rounded-lg w-full flex-1 md:w-1/2">
                                <label
                                    htmlFor="itemsPerPage"
                                    className="mr-2 ml-2 text-white text-sm"
                                >
                                    <AutoTranslate>Show:</AutoTranslate>
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

                            {/* Branch Filter */}
                            <div className="flex items-center bg-blue-500 rounded-lg w-full flex-1 md:w-1/4">
                                <label htmlFor="branchFilter" className="mr-2 ml-2 text-white text-sm">
                                    <AutoTranslate>Branch</AutoTranslate>
                                </label>
                                <select
                                    id="branchFilter"
                                    className="border rounded-r-lg p-1.5 outline-none w-full"
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
                            <div className="flex items-center bg-blue-500 rounded-lg w-full flex-1 md:w-1/4">
                                <label htmlFor="departmentFilter" className="mr-2 ml-2 text-white text-sm">
                                    <AutoTranslate>Department</AutoTranslate>
                                </label>
                                <select
                                    id="departmentFilter"
                                    className="border rounded-r-lg p-1.5 outline-none w-full"
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
                            <div className="flex items-center w-full md:w-1/4 flex-1">
                                <input
                                    type="text"
                                    placeholder={translatedPlaceholders.search}
                                    className="border rounded-l-md p-1 outline-none w-full"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <MagnifyingGlassIcon className="text-white bg-blue-500 rounded-r-lg h-8 w-8 border p-1.5" />
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse border">
                                <thead className="bg-slate-100">
                                    <tr>
                                        <th className="border p-2 text-left"><AutoTranslate>SN</AutoTranslate></th>
                                        <th className="border p-2 text-left"><AutoTranslate>Name</AutoTranslate></th>
                                        <th className="border p-2 text-left"><AutoTranslate>Email</AutoTranslate></th>
                                        <th className="border p-2 text-left"><AutoTranslate>Phone No.</AutoTranslate></th>
                                        <th className="border p-2 text-left"><AutoTranslate>Branch</AutoTranslate></th>
                                        <th className="border p-2 text-left"><AutoTranslate>Department</AutoTranslate></th>
                                        <th className="border p-2 text-left"><AutoTranslate>Role</AutoTranslate></th>
                                        <th className="border p-2 text-left"><AutoTranslate>Created Date</AutoTranslate></th>
                                        <th className="border p-2 text-left"><AutoTranslate>Updated Date</AutoTranslate></th>
                                        <th className="border p-2 text-left"><AutoTranslate>CreatedBy</AutoTranslate></th>
                                        <th className="border p-2 text-left"><AutoTranslate>UpdatedBy</AutoTranslate></th>
                                        <th className="border p-2 text-left"><AutoTranslate>Status</AutoTranslate></th>
                                        <th className="border p-2 text-left"><AutoTranslate>Edit</AutoTranslate></th>
                                        <th className="border p-2 text-left"><AutoTranslate>Action</AutoTranslate></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedEmployees.map((employee, index) => (
                                        <tr key={employee.id}>
                                            <td className="border p-2">{index + 1 + (currentPage - 1) * itemsPerPage}</td>
                                            <td className="border p-2">{employee.name}</td>
                                            <td className="border p-2">{employee.email}</td>
                                            <td className="border p-2">{employee.mobile}</td>
                                            <td className="border p-2">
                                                {employee.branch?.name || "N/A"}
                                            </td>
                                            <td className="border p-2">{employee.department?.name || "N/A"}</td>
                                            <td className="border p-2">{employee.role?.role || "No Role"}</td>
                                            <td className="border p-2">{formatDate(employee.createdOn)}</td>
                                            <td className="border p-2">{formatDate(employee.updatedOn)}</td>
                                            <td className="border p-2">
                                                {employee.createdBy?.name || "Unknown"}
                                            </td>
                                            <td className="border p-2">
                                                {employee.updatedBy?.name || "Unknown"}
                                            </td>
                                            <td className="border p-2">{employee.active ? "Active" : "Inactive"}</td>
                                            <td className="border p-2 text-center">
                                                <button
                                                    onClick={() => handleEditEmployee(employee.id)}
                                                    disabled={employee.active === false}
                                                    className={`${employee.active === false ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    <PencilIcon className="h-6 w-6 text-white bg-yellow-400 rounded-xl p-1" />
                                                </button>
                                            </td>
                                            <td className="border p-2">
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

                        <div className="flex items-center mt-4">
                            <button
                                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1 || totalPages === 0}
                                className={`px-3 py-1 rounded mr-3 ${currentPage === 1 || totalPages === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"
                                    }`}
                            >
                                <ArrowLeftIcon className="inline h-4 w-4 mr-2 mb-1" />
                                <AutoTranslate>Previous</AutoTranslate>
                            </button>

                            {totalPages > 0 && getPageNumbers().map((page) => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`px-3 py-1 rounded mx-1 ${currentPage === page ? "bg-blue-500 text-white" : "bg-slate-200 hover:bg-blue-100"
                                        }`}
                                >
                                    {page}
                                </button>
                            ))}

                            <span className="text-sm text-gray-700 mx-2">
                                <AutoTranslate>of</AutoTranslate> {totalPages} <AutoTranslate>pages</AutoTranslate>
                            </span>

                            <button
                                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className={`px-3 py-1 rounded ml-3 ${currentPage === totalPages || totalPages === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"
                                    }`}
                            >
                                <AutoTranslate>Next</AutoTranslate>
                                <ArrowRightIcon className="inline h-4 w-4 ml-2 mb-1" />
                            </button>
                            <div className="ml-4">
                                <span className="text-sm text-gray-700">
                                    <AutoTranslate>
                                        {`Showing ${totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to ${Math.min(currentPage * itemsPerPage, totalItems)} of ${totalItems} entries`}
                                    </AutoTranslate>
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
                            <AutoTranslate>Confirm Status Change</AutoTranslate>
                        </h2>
                        <p>
                            <AutoTranslate>Are you sure you want to</AutoTranslate>{" "}
                            <strong>
                                {employeeToToggle.active === true ? <AutoTranslate>deactivate</AutoTranslate> : <AutoTranslate>activate</AutoTranslate>}
                            </strong>{" "}
                            <AutoTranslate>the employee</AutoTranslate> <strong>{employeeToToggle.name}</strong> ?
                        </p>
                        <div className="flex justify-end space-x-4">
                            <button
                                onClick={() => setModalVisible(false)}
                                className="bg-gray-500 text-white rounded-md px-4 py-2"
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
            )}
        </div>
    );
};

export default BranchEmployee;