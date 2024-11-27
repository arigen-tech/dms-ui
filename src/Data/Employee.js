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
} from "../API/apiConfig"; // Import your API URLs
import { API_HOST } from "../API/apiConfig";

const UserAddEmployee = () => {
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({
    // employeeId: '',
    name: "",
    email: "",
    mobile: "",
    branch: { id: "", name: "" }, // Ensure initial structure
    // department: { id: "", name: "" }, // Ensure initial structure
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [employeeToToggle, setEmployeeToToggle] = useState(null);
  const [branchOptions, setBranchOptions] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [Message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchEmployees();
    fetchOptions();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axios.get(
        `${ API_HOST }/employee/findAll`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("tokenKey")}`,
          },
        }
      );
      setEmployees(response.data);
      console.log(response.data);
    } catch (error) {
      setError("Error fetching employees.");
    } finally {
      setLoading(false);
    }
  };

  // const fetchEmployees = async () => {
  //   setLoading(true);
  //   setError("");
  //   try {
  //     // Retrieve userId from localStorage
  //     const userId = localStorage.getItem("userId");
  
  //     // Fetch branchId using userId
  //     const branchResponse = await axios.get(
  //       `${ API_HOST }/employee/findById/${userId}`,
  //       {
  //         headers: {
  //           Authorization: `Bearer ${localStorage.getItem("tokenKey")}`,
  //         },
  //       }
  //     );
      
  //     const branchId = branchResponse.data.branch.id; // Adjust this based on your API response structure
  
  //     // Fetch employees using the branchId
  //     const employeeResponse = await axios.get(
  //       `${ API_HOST }/employee/branch/${branchId}`,
  //       {
  //         headers: {
  //           Authorization: `Bearer ${localStorage.getItem("tokenKey")}`,
  //         },
  //       }
  //     );
  
  //     setEmployees(employeeResponse.data);
  //     console.log(employeeResponse.data);
  //   } catch (error) {
  //     setError("Error fetching employees.");
  //   } finally {
  //     setLoading(false);
  //   }
  // };
  
  const fetchOptions = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("tokenKey"); // Retrieve the token from local storage

      const branchesRes = await axios.get(`${BRANCH_API}/findActiveRole`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setBranchOptions(branchesRes.data);
      console.log(branchesRes.data);
    } catch (error) {
      setError("Error fetching options.");
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async (branchId) => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("tokenKey");

      // Fetch departments for the selected branch
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

    // Fetch departments when a branch is selected
    if (key === "branch") {
      fetchDepartments(value); // Pass the selected branch ID to fetch related departments
    }
  };

  const handleAddEmployee = async () => {
    console.log("Form Data before submit:", formData);

    const isFormDataValid = formData.name && formData.email && formData.mobile;
    const isBranchSelected = formData.branch && formData.branch.id;
    //const isDepartmentSelected = formData.department && formData.department.id;

    // if (isFormDataValid && isBranchSelected && isDepartmentSelected) {
    if (isFormDataValid && isBranchSelected) {

      setIsSubmitting(true); // Disable button after click

      try {
        const token = localStorage.getItem("tokenKey");
        const userId = localStorage.getItem("userId"); // Retrieve user ID from localStorage
        console.log("Retrieved Token:", token);

        if (!userId) {
          setError("User authentication error. Please log in again.");
          setIsSubmitting(false);
          return;
        }

        // `createdBy` and `updatedBy` should reference an object with at least the `id` field
        const createdBy = { id: userId };
        const updatedBy = { id: userId };

        const employeeData = {
          password: `${formData.name}${formData.mobile.slice(0, 4)}`, // Optional
          mobile: formData.mobile,
          email: formData.email,
          name: formData.name,
          isActive: 1,
          createdOn: new Date().toISOString(),
          updatedOn: new Date().toISOString(),
          createdBy, // Pass as an object
          updatedBy, // Pass as an object
          // department: {
          //   id: formData.department.id,
          //   name: formData.department.name,
          // },
          branch: { id: formData.branch.id, name: formData.branch.name },
        };

        console.log("Employee Data to Send:", employeeData);

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
            branch: { id: "", name: "" },
            // department: { id: "", name: "" },
          });

          setError("");
          setMessage("Employee added successfully!");

          // Clear success message after 2 seconds
          setTimeout(() => setMessage(""), 3000);
        }
      } catch (error) {
        console.error("Error adding employee:", error);
        setError(
          error.response?.data?.message ||
            "Error adding employee. Please try again."
        );
      } finally {
        setIsSubmitting(false); // Enable button after submission is done
      }
    } else {
      setError(
        "Please fill out all fields and select a branch and department."
      );
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
        branch: employeeToEdit.branch || { id: "", name: "", address: "" },
        department: employeeToEdit.department || { id: "", name: "" },
        password: "", // Password field left empty for editing
        createdOn: employeeToEdit.createdOn,
        enabled: employeeToEdit.enabled, // No need for fallback since it should always be a boolean
      });
    }
  };

  const handleSaveEdit = async () => {
    console.log("Form Data before save:", formData);

    const isFormDataValid = formData.name && formData.email && formData.mobile;
    const isBranchSelected = formData.branch && formData.branch.id;
    const isDepartmentSelected = formData.department && formData.department.id;

    if (isFormDataValid && isBranchSelected && isDepartmentSelected) {
      try {
        const token = localStorage.getItem("tokenKey");

        const updatedEmployeeData = {
          name: formData.name,
          email: formData.email,
          mobile: formData.mobile,
          branch: { id: formData.branch.id, name: formData.branch.name },
          department: {
            id: formData.department.id,
            name: formData.department.name,
          },
          // Only include password if it's provided by the user
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

          // Reset form data
          setFormData({
            name: "",
            email: "",
            mobile: "",
            branch: { id: "", name: "", address: "" },
            department: { id: "", name: "" },
            password: "",
            createdOn: "",
            enabled: false,
          });

          setError("");
          setMessage("Employee updated successfully!");
          setTimeout(() => setMessage(""), 3000);

          setEditingIndex(null);
        }
      } catch (error) {
        console.error("Error updating employee:", error);
        setError(
          error.response?.data?.message ||
            "Error updating employee. Please try again."
        );
      }
    } else {
      setError(
        "Please fill out all fields and select a branch and department."
      );
    }
  };

  const handleToggleActive = (employee) => {
    setEmployeeToToggle(employee);
    setModalVisible(true);
  };

  const confirmToggleActive = async () => {
    try {
      const newStatus = employeeToToggle.active ? false : true; // Toggle between true and false

      // Send the PUT request to update the status
      await axios.put(
        `${ API_HOST }/employee/updateStatus/${employeeToToggle.id}`, // Updated URL with employee ID
        newStatus, // Send the new status directly as the request body
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("tokenKey")}`, // Include the token in the headers
            "Content-Type": "application/json",
          },
        }
      );

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
      setMessage(message);

      // Automatically hide the flash message after 3 seconds
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error toggling employee status:", error);
      // Optionally, show an error message to the user here
    } finally {
      // Ensure modal is closed and state is cleared even if there was an error
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
    const statusText = employee.active === true ? "active" : "inactive";
    const createdOnText = formatDate(employee.createdOn);
    const updatedOnText = formatDate(employee.updatedOn);

    return (
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.mobile.toLowerCase().includes(searchTerm.toLowerCase()) ||
      statusText.includes(searchTerm.toLowerCase()) ||
      createdOnText.includes(searchTerm.toLowerCase()) ||
      updatedOnText.includes(searchTerm.toLowerCase())
    );
  });

  const sortedEmployees = filteredEmployees.sort((a, b) => b.active - a.active);

  const totalItems = sortedEmployees.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedEmployees = sortedEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const role = localStorage.getItem("role");

  return (
    <div className="p-1">
      <h1 className="text-xl mb-4 font-semibold">USERS</h1>
      <div className="bg-white p-3 rounded-lg shadow-sm">
        {error && <p className="text-red-500">{error}</p>}
        {/* Success Message */}
        {Message && (
          <div
            className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4"
            role="alert"
          >
            <strong className="font-bold">Success! </strong>
            <span className="block sm:inline">{Message} </span>
            <button
              type="button"
              onClick={() => setMessage("")} // Close the message on button click
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

            {/* Branch Selection */}
            <select
              name="branch"
              value={formData.branch?.id || ""}
              onChange={(e) => handleSelectChange(e, "branch")}
              className="p-2 border rounded-md outline-none"
            >
              <option value="">Select Branch</option>
              {branchOptions.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>

            {/* Department Selection */}
            {/* <select
              name="department"
              value={formData.department?.id || ""}
              onChange={(e) => handleSelectChange(e, "department")}
              className="p-2 border rounded-md outline-none"
            >
              <option value="">Select Department</option>
              {departmentOptions.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select> */}
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

        {role === "ADMIN" && (
          <>
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
                  className="border rounded-r-lg p-1.5 outline-none"
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                >
                  {[5, 10, 15, 20].map((num) => (
                    <option key={num} value={num}>
                      {num}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center">
                <input
                  type="text"
                  placeholder="Search..."
                  className="border rounded-l-md p-1 outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <MagnifyingGlassIcon className="text-white bg-blue-500 rounded-r-lg h-8 w-8 border p-1.5" />
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
                    <td className="border p-2">{index + 1}</td>
                    <td className="border p-2">{employee.name}</td>
                    <td className="border p-2">{employee.email}</td>
                    <td className="border p-2">{employee.mobile}</td>
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
                    <td className="border p-2">
                      {employee.createdBy?.name || "Unknown"}
                    </td>
                    <td className="border p-2">
                      {employee.updatedBy?.name || "Unknown"}
                    </td>
                    <td className="border p-2">
                      {employee.active ? "Active" : "Inactive"}
                    </td>
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
                        className={`p-1 rounded-full ${
                          employee.active ? "bg-green-500" : "bg-red-500"
                        }`}
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
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
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
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="bg-slate-200 px-3 py-1 rounded ml-3"
                >
                  Next
                  <ArrowRightIcon className="inline h-4 w-4 ml-2 mb-1" />
                </button>
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
                className="bg-blue-500 text-white rounded-md px-4 py-2"
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

export default UserAddEmployee;
