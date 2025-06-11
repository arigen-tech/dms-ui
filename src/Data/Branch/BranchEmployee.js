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
import React, { useState, useEffect } from "react";
import axios from "axios";
import {
    REGISTER_API,
    EMPLOYEE_API,
    BRANCH_API,
    DEPAETMENT_API,
    ROLE_API,
} from "../../API/apiConfig";
import { API_HOST } from "../../API/apiConfig";
import Popup from '../../Components/Popup';

const BranchEmployee = () => {
    const [employees, setEmployees] = useState([]);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        mobile: "",
        branch: { id: "", name: "" },
        department: { id: "", name: "" },
    });
    const [searchTerm, setSearchTerm] = useState("");
    const [editingIndex, setEditingIndex] = useState(null);
    const [itemsPerPage, setItemsPerPage] = useState(5);
    const [currentPage, setCurrentPage] = useState(1);
    const [modalVisible, setModalVisible] = useState(false);
    const [employeeToToggle, setEmployeeToToggle] = useState(null);
    const [departmentOptions, setDepartmentOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [Message, setMessage] = useState("");
    //const [isSubmitting, setIsSubmitting] = useState(false);
    const [userBranch, setUserBranch] = useState(null);


    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const [popupConfig, setPopupConfig] = useState({
        message: '',
        type: 'default'
    });
    const [isConfirmDisabled, setIsConfirmDisabled] = useState(false);


    useEffect(() => {
        fetchUserBranch();
    }, []);

    useEffect(() => {
        if (userBranch) {
            fetchEmployees();
            fetchDepartments();
        }
    }, [userBranch]);

    const fetchUserBranch = async () => {
        setLoading(true);
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
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        setLoading(true);
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
            setLoading(false);
        }
    };

    const fetchDepartments = async () => {
        setLoading(true);
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
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
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
        console.log("Form Data before submit:", formData);

        const isFormDataValid = formData.name && formData.email && formData.mobile;
        const isDepartmentSelected = formData.department && formData.department.id;

        if (isFormDataValid && isDepartmentSelected) {
            setIsSubmitting(true);

            try {
                const token = localStorage.getItem("tokenKey");
                const userId = localStorage.getItem("userId");

                if (!userId) {
                    setError("User authentication error. Please log in again.");
                    setIsSubmitting(false);
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

                console.log("Employee Data to Send:", employeeData);

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

                console.log("API Response:", response.data);

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
                    // Show success message in a popup
                    setShowPopup(true);
                    setPopupConfig({
                        message: "Employee added successfully!",
                        type: "success",
                    });

                    // Automatically hide the flash message after 3 seconds
                    setTimeout(() => setPopupConfig({ message: "", type: "" }), 3000);
                }
            } catch (error) {
                console.error("Error adding employee:", error);
                const errorMessage = error.response?.data?.message || "Email address is already registered. Please use a different one.";

                // Show error message in a popup
                setShowPopup(true);
                setPopupConfig({
                    message: errorMessage,
                    type: "error",
                });
            } finally {
                setIsSubmitting(false);
            }
        } else {
            const errorMessage = "Please fill out all fields and select a department.";
            setError(errorMessage);
            // Optionally, show error popup for validation issue
            setShowPopup(true);
            setPopupConfig({
                message: errorMessage,
                type: "error",
            });
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
        }
    };

    const handleSaveEdit = async () => {
        console.log("Form Data before save:", formData);

        const isFormDataValid = formData.name && formData.email && formData.mobile;
        const isDepartmentSelected = formData.department && formData.department.id;

        if (isFormDataValid && isDepartmentSelected) {
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

                    // Show success message in a popup
                    setShowPopup(true);
                    setPopupConfig({
                        message: "Employee updated successfully!",
                        type: "success",
                    });

                    // Automatically hide the flash message after 3 seconds
                    setTimeout(() => setPopupConfig({ message: "", type: "" }), 3000);

                    setEditingIndex(null);
                }
            } catch (error) {
                console.error("Error updating employee:", error);
                const errorMessage = error.response?.data?.message || "Error updating employee. Please try again.";

                // Show error message in a popup
                setShowPopup(true);
                setPopupConfig({
                    message: errorMessage,
                    type: "error",
                });
            }
        } else {
            const errorMessage = "Please fill out all fields and select a department.";
            setError(errorMessage);

            // Optionally, show error popup for validation issue
            setShowPopup(true);
            setPopupConfig({
                message: errorMessage,
                type: "error",
            });
        }
    };

    const handleToggleActive = (employee) => {
        setEmployeeToToggle(employee);
        setModalVisible(true);
    };

    const confirmToggleActive = async () => {
        // Disable the button immediately when clicked
        setIsConfirmDisabled(true);

        try {
            const newStatus = !employeeToToggle.active; // Toggle between true and false

            // Send the PUT request to update the status
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
                // Update the local employee list after successful status update
                const updatedEmployees = employees.map((employee) =>
                    employee.id === employeeToToggle.id
                        ? { ...employee, active: newStatus }
                        : employee
                );
                setEmployees(updatedEmployees);

                // Set flash message based on the new status
                const message = newStatus
                    ? "Employee has been activated."
                    : "Employee has been deactivated.";
                setShowPopup(true); // Show the popup for feedback
                setPopupConfig({
                    message: message,
                    type: "success",
                });

                // Automatically hide the flash message after 3 seconds
                setTimeout(() => setPopupConfig({ message: "", type: "" }), 3000);
            }
        } catch (error) {
            console.error("Error toggling employee status:", error);
            // Set error message
            const errorMessage = error.response?.data?.message || "Error toggling employee status. Please try again.";

            // Show error message in a popup
            setShowPopup(true); // Show the popup for error feedback
            setPopupConfig({
                message: errorMessage,
                type: "error",
            });
        } finally {
            // Ensure modal is closed and state is cleared even if there was an error
            setModalVisible(false);
            setEmployeeToToggle(null);
            // Re-enable the button when the operation is complete
            setIsConfirmDisabled(false);
        }
    };

    const handleClosePopup = () => {
        // Refresh the page when the popup is closed after a successful action
        if (popupConfig.type === 'success') {
            window.location.reload(); // Refresh the page
        } else {
            setShowPopup(false); // Just close the popup for other types
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
        // Safeguard for undefined values and normalize data
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

        // Normalize the search term
        const lowerSearchTerm = searchTerm?.toLowerCase() || "";

        // Return true if any column includes the search term
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
        const maxPageNumbers = 5; // Number of pages to display at a time
        const pages = [];
        const startPage = Math.floor((currentPage - 1) / maxPageNumbers) * maxPageNumbers + 1;
        const endPage = Math.min(startPage + maxPageNumbers - 1, totalPages);

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i); const getPageNumbers = () => {
                const maxPageNumbers = 5; // Show 5 pages at a time
                const pages = [];

                // Calculate the start and end page numbers
                const startPage = Math.floor((currentPage - 1) / maxPageNumbers) * maxPageNumbers + 1;
                const endPage = Math.min(startPage + maxPageNumbers - 1, totalPages);

                // Push pages to display in the pagination
                for (let i = startPage; i <= endPage; i++) {
                    pages.push(i);
                }

                return pages;
            };

        }

        return pages;
    };

    const role = localStorage.getItem("role");

    return (
        <div className="px-2">
            <h1 className="text-2xl mb-1 font-semibold">Branch Users</h1>
            <div className="bg-white p-1 rounded-lg shadow-sm">
                {showPopup && (
                    <Popup
                        message={popupConfig.message}
                        type={popupConfig.type}
                        onClose={handleClosePopup}
                    />
                )}

                {loading && <p className="text-blue-500">Loading...</p>}

                <div className="mb-4 bg-slate-100 p-4 rounded-lg">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Name Input */}
                        <label className="block text-md font-medium text-gray-700">
                            Name
                            <input
                                type="text"
                                placeholder="Enter name"
                                name="name"
                                value={formData.name || ""}
                                onChange={handleInputChange}
                                className="mt-1 block w-full p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </label>

                        {/* Email Input */}
                        <label className="block text-md font-medium text-gray-700">
                            Email
                            <input
                                type="email"
                                placeholder="Enter email"
                                name="email"
                                value={formData.email || ""}
                                onChange={handleInputChange}
                                className="mt-1 block w-full p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </label>

                        {/* Phone Input */}
                        <label className="block text-md font-medium text-gray-700">
                            Phone
                            <input
                                type="tel"
                                placeholder="Enter phone number"
                                name="mobile"
                                maxLength={10}
                                minLength={10}
                                value={formData.mobile || ""}
                                onChange={handleInputChange}
                                onInput={(e) => {
                                    e.target.value = e.target.value.replace(/[^0-9]/g, ""); // Allow only numbers
                                }}
                                className="mt-1 block w-full p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </label>


                        {/* Branch Input */}
                        <label className="block text-md font-medium text-gray-700">
                            Branch
                            <input
                                type="text"
                                name="branch"
                                value={userBranch ? userBranch.name : "Loading..."}
                                disabled
                                className="mt-1 block w-full p-3 border rounded-md outline-none bg-gray-100 focus:ring-2 focus:ring-blue-500"
                            />
                        </label>

                        {/* Department Selection */}
                        <label className="block text-md font-medium text-gray-700">
                            Department
                            <select
                                name="department"
                                value={formData.department?.id || ""}
                                onChange={handleSelectChange}
                                className="mt-1 block w-full p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select Department</option>
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
                                className="bg-blue-900 text-white rounded-2xl p-2 flex items-center text-sm justify-center"
                            >
                                <PlusCircleIcon className="h-5 w-5 mr-1" />
                                {isSubmitting ? "Submitting..." : "Add User"}
                            </button>
                        ) : (
                            <button
                                onClick={handleSaveEdit}
                                className="bg-blue-900 text-white rounded-2xl p-2 flex items-center text-sm justify-center"
                            >
                                <CheckCircleIcon className="h-5 w-5 mr-1" />{" "}
                                {isSubmitting ? "Submitting..." : "Update"}
                            </button>
                        )}
                    </div>
                </div>

                {role === "BRANCH ADMIN" && (
                    <>
                        <div className="mb-4 bg-slate-100 p-4 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4">
                            {/* Items Per Page (50%) */}
                            <div className="flex items-center bg-blue-500 rounded-lg w-full flex-1 md:w-1/2">
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

                            {/* Search Input (Remaining Space) */}
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
                                <thead className="bg-slate-100">
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
                                        <th className="border p-2 text-left">Updated By</th>
                                        <th className="border p-2 text-left">Status</th>
                                        <th className="border p-2 text-left">Edit</th>
                                        <th className="border p-2 text-left">Access</th>
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
                                                <button onClick={() => handleEditEmployee(employee.id)} disabled={employee.active === false}
                                                    className={`${employee.active === false ? 'opacity-50 cursor-not-allowed' : ''}`}>
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
                            {/* Previous Button */}
                            <button
                                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className={`px-3 py-1 rounded mr-3 ${currentPage === 1 ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"
                                    }`}
                            >
                                <ArrowLeftIcon className="inline h-4 w-4 mr-2 mb-1" />
                                Previous
                            </button>

                            {/* Page Number Buttons */}
                            {getPageNumbers().map((page) => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`px-3 py-1 rounded mx-1 ${currentPage === page ? "bg-blue-500 text-white" : "bg-slate-200 hover:bg-blue-100"
                                        }`}
                                >
                                    {page}
                                </button>
                            ))}

                            {/* Page Count Info */}
                            <span className="text-sm text-gray-700 mx-2">of {totalPages} pages</span>

                            {/* Next Button */}
                            <button
                                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className={`px-3 py-1 rounded ml-3 ${currentPage === totalPages ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"
                                    }`}
                            >
                                Next
                                <ArrowRightIcon className="inline h-4 w-4 ml-2 mb-1" />
                            </button>
                            <div className="ml-4">
                                <span className="text-sm text-gray-700">
                                    Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
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
                        <div className="flex justify-end space-x-4">
                            <button
                                onClick={() => setModalVisible(false)}
                                className="bg-gray-500 text-white rounded-md px-4 py-2"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmToggleActive}
                                disabled={isConfirmDisabled}
                                className={`bg-blue-500 text-white rounded-md px-4 py-2 ${isConfirmDisabled ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                            >
                                {isConfirmDisabled ? 'Processing...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BranchEmployee;
