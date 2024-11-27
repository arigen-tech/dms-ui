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
import { API_HOST } from "../../API/apiConfig";

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
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [Message, setMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [userBranch, setUserBranch] = useState(null);
    const [userDepartment, setUserDepartment] = useState(null);

    useEffect(() => {
        fetchUserDetails();
    }, []);

    useEffect(() => {
        if (userBranch && userDepartment) {
            fetchDepartmentEmployees();
        }
    }, [userBranch, userDepartment]);

    const fetchUserDetails = async () => {
        setLoading(true);
        setError("");
        try {
            const userId = localStorage.getItem("userId");
            const token = localStorage.getItem("tokenKey");
            const response = await axios.get(
                `${ API_HOST }/employee/findById/${userId}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
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
            setLoading(false);
        }
    };

    const fetchDepartmentEmployees = async () => {
        setLoading(true);
        setError("");
        try {
            const token = localStorage.getItem("tokenKey");
            const employeeResponse = await axios.get(
                `${ API_HOST }/employee/department/${userDepartment.id}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            setEmployees(employeeResponse.data);
        } catch (error) {
            setError("Error fetching department employees.");
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

    const handleAddEmployee = async () => {
        const isFormDataValid = formData.name && formData.email && formData.mobile;

        if (isFormDataValid) {
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
                    department: userDepartment,
                    branch: userBranch,
                };

                const response = await axios.post(
                    `${ API_HOST }/register/create`,
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
                    setFormData({
                        name: "",
                        email: "",
                        mobile: "",
                        branch: userBranch,
                        department: userDepartment,
                    });
                    setError("");
                    setMessage("Employee added successfully!");
                    setTimeout(() => setMessage(""), 3000);
                }
            } catch (error) {
                console.error("Error adding employee:", error);
                setError(
                    error.response?.data?.message ||
                    "Error adding employee. Please try again."
                );
            } finally {
                setIsSubmitting(false);
            }
        } else {
            setError("Please fill out all fields.");
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
        }
    };

    const handleSaveEdit = async () => {
        const isFormDataValid = formData.name && formData.email && formData.mobile;

        if (isFormDataValid) {
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

                const response = await axios.put(
                    `${ API_HOST }/employee/update/${formData.id}`,
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
                        department: userDepartment,
                        branch: userBranch,
                    });

                    setError("");
                    setMessage("Employee updated successfully!");
                    setTimeout(() => setMessage(""), 3000);
                    setEditingIndex(null);
                }
            } catch (error) {
                setError(
                    error.response?.data?.message ||
                    "Error updating employee. Please try again."
                );
            }
        } else {
            setError("Please fill out all fields.");
        }
    };

    const handleToggleActive = (employee) => {
        setEmployeeToToggle(employee);
        setModalVisible(true);
    };

    const confirmToggleActive = async () => {
        try {
            const newStatus = employeeToToggle.active ? false : true;

            await axios.put(
                `${ API_HOST }/employee/updateStatus/${employeeToToggle.id}`,
                newStatus,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("tokenKey")}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            const updatedEmployees = employees.map((employee) =>
                employee.id === employeeToToggle.id
                    ? { ...employee, active: newStatus }
                    : employee
            );
            setEmployees(updatedEmployees);

            const message = newStatus
                ? "Employee has been activated."
                : "Employee has been deactivated.";
            setMessage(message);

            setTimeout(() => setMessage(""), 3000);
        } catch (error) {
            console.error("Error toggling employee status:", error);
        } finally {
            setModalVisible(false);
            setEmployeeToToggle(null);
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
        const searchLower = searchTerm.toLowerCase();
        return (
            employee.name.toLowerCase().includes(searchLower) ||
            employee.email.toLowerCase().includes(searchLower) ||
            employee.mobile.toLowerCase().includes(searchLower) ||
            (employee.active ? "active" : "inactive").includes(searchLower) ||
            formatDate(employee.createdOn).includes(searchTerm) ||
            formatDate(employee.updatedOn).includes(searchTerm)
        );
    });

    const sortedEmployees = filteredEmployees.sort((a, b) => b.active - a.active);

    const totalItems = sortedEmployees.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const paginatedEmployees = sortedEmployees.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="p-1">
            <h1 className="text-xl mb-4 font-semibold">DEPARTMENT USERS</h1>
            <div className="bg-white p-3 rounded-lg shadow-sm">
                {error && <p className="text-red-500">{error}</p>}
                {Message && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
                        <strong className="font-bold">Success! </strong>
                        <span className="block sm:inline">{Message}</span>
                        <button
                            type="button"
                            onClick={() => setMessage("")}
                            className="absolute top-0 right-0 mt-2 mr-2 text-green-500 hover:text-green-700"
                        >
                            <svg
                                className="fill-current h-6 w-6"
                                role="img"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                aria-label="Close"
                            >
                                <path d="M12 10.293l5.293-5.293 1.414 1.414L13.414 12l5.293 5.293-1.414 1.414L12 13.414l-5.293 5.293-1.414-1.414L10.586 12 5.293 6.707 6.707 5.293z" />
                            </svg>
                        </button>
                    </div>
                )}

                {loading && <p className="text-blue-500">Loading...</p>}

                <div className="mb-4 bg-slate-100 p-4 rounded-lg">
                    <div className="grid grid-cols-3 gap-4">
                        <input
                            type="text"
                            placeholder="Name"
                            name="name"
                            value={formData.name || ""}
                            onChange={handleInputChange}
                            className="p-2 border rounded-md outline-none"
                        />
                        <input
                            type="email"
                            placeholder="Email"
                            name="email"
                            value={formData.email || ""}
                            onChange={handleInputChange}
                            className="p-2 border rounded-md outline-none"
                        />
                        <input
                            type="tel"
                            placeholder="Phone"
                            name="mobile"
                            maxLength={10}
                            minLength={10}
                            value={formData.mobile || ""}
                            onChange={handleInputChange}
                            className="p-2 border rounded-md outline-none"
                        />
                        <input
                            type="text"
                            name="branch"
                            value={userBranch ? userBranch.name : "Loading..."}
                            disabled
                            className="p-2 border rounded-md outline-none bg-gray-100"
                        />
                        <input
                            type="text"
                            name="department"
                            value={userDepartment ? userDepartment.name : "Loading..."}
                            disabled
                            className="p-2 border rounded-md outline-none bg-gray-100"
                        />
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
                                <CheckCircleIcon className="h-5 w-5 mr-1" />
                                {isSubmitting ? "Submitting..." : "Update"}
                            </button>
                        )}
                    </div>
                </div>

                <div className="mb-4 bg-slate-100 p-4 rounded-lg flex justify-between items-center">
                    <div className="flex items-center bg-blue-500 rounded-lg">
                        <label
                            htmlFor="itemsPerPage"
                            className="mr-2 ml-2 text-white text-sm"
                        >
                            Show:
                        </label>
                        <select
                            id="itemsPerPage"
                            value={itemsPerPage}
                            onChange={(e) => {
                                setItemsPerPage(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="p-1 rounded-lg outline-none text-sm"
                        >
                            <option value="5">5</option>
                            <option value="10">10</option>
                            <option value="20">20</option>
                        </select>
                    </div>
                    <div className="flex items-center bg-white rounded-lg p-2">
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="ml-2 outline-none"
                        />
                    </div>
                </div>

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
                                    <th className="border p-2 text-left">Status</th>
                                    <th className="border p-2 text-left">Edit</th>
                                    <th className="border p-2 text-left">Access</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedEmployees.map((employee, index) => (
                                    <tr key={employee.id}>
                                        <td className="border p-2">{index + 1}</td>
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
                                        <td className="border p-2">{employee.active ? "Active" : "Inactive"}</td>
                                        <td className="border p-2">
                                            <button
                                                onClick={() => handleEditEmployee(employee.id)}
                                                className="text-blue-600"
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

                        <div className="flex justify-between items-center mt-4">
                            <div>
                                <span className="text-sm text-gray-700">
                                    Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                                    {Math.min(currentPage * itemsPerPage, totalItems)} of{" "}
                                    {totalItems} entries
                                </span>
                            </div>
                            <div className="flex items-center">
                                <button
                                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="bg-slate-200 px-3 py-1 rounded mr-3"
                                >
                                    <ArrowLeftIcon className="inline h-4 w-4 mr-2 mb-1" />
                                    Previous
                                </button>
                                <span className="text-sm text-gray-700">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="bg-slate-200 px-3 py-1 rounded ml-3"
                                >
                                    Next
                                    <ArrowRightIcon className="inline h-4 w-4 ml-2 mb-1" />
                                </button>
                            </div>
                        </div>
            </div>

            {/* Modal for confirming status toggle */}
            {modalVisible && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg max-w-sm w-full">
                        <h2 className="text-xl font-bold mb-4">Confirm Action</h2>
                        <p className="mb-4">
                            Are you sure you want to{" "}
                            {employeeToToggle?.active ? "deactivate" : "activate"}{" "}
                            this employee?
                        </p>
                        <div className="flex justify-end space-x-2">
                            <button
                                onClick={() => setModalVisible(false)}
                                className="px-4 py-2 border rounded hover:bg-gray-100"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmToggleActive}
                                className="px-4 py-2 bg-blue-900 text-white rounded hover:bg-blue-800"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BranchEmployee;
