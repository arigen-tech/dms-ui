import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_HOST } from "../API/apiConfig";
import * as XLSX from "xlsx";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FaFilePdf, FaFileExcel, FaFileWord } from "react-icons/fa";

const DocumentReport = () => {
  const [searchCriteria, setSearchCriteria] = useState({
    category: "",
    status: "",
    branch: "",
    department: "",
  });

  const [categoryOptions, setCategoryOptions] = useState([]);
  const [branchOptions, setBranchOptions] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [noResultsFound, setNoResultsFound] = useState(false);
  const [userBranch, setUserBranch] = useState(null);
  const [userDepartment, setUserDepartment] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [error, setError] = useState(""); // Error state for validation
  const [selectedFormat, setSelectedFormat] = useState('excel');

  const role = localStorage.getItem("role");

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

  const formatDateTime = (date) => {
    if (!date) return null;
    const isoString = date.toISOString();
    const localDate = new Date(isoString);
    return localDate.toLocaleString("sv-SE").replace("T", " ");
  };

  const handleDownload = async () => {
    if (!fromDate || !toDate) {
      setError("Both From Date and To Date are required.");
      return;
    }

    try {
      setError(""); // Clear any previous errors
      const token = localStorage.getItem("tokenKey");

      const formattedFromDate = formatDateTime(fromDate);
      const formattedToDate = formatDateTime(toDate);

      const params = {
        ...(searchCriteria.category && { categoryId: searchCriteria.category }),
        ...(searchCriteria.status && { approvalStatus: searchCriteria.status }),
        ...(searchCriteria.branch && { branchId: searchCriteria.branch }),
        ...(searchCriteria.department && {
          departmentId: searchCriteria.department,
        }),
        ...(formattedFromDate && { startDate: formattedFromDate }),
        ...(formattedToDate && { endDate: formattedToDate }),
      };

      const response = await axios.get(`${API_HOST}/api/documents/filter`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      const data = response.data;

      if (data.length === 0) {
        setNoResultsFound(true);
        alert("No results found.");
        return;
      }

      setSearchResults(data);

      const mappedData = data.map((item, index) => ({
        "S.N.": index + 1,
        "File No.": item.fileNo,
        Title: item.title,
        Subject: item.subject,
        Version: item.version,
        Category: item.categoryMaster?.name || "N/A",
        Branch: item.employee?.branch?.name || "N/A",
        Department: item.employee?.department?.name || "N/A",
        "Count of Attach File": item.documentDetails?.length || 0,
        "Uploaded Date": new Date(item.createdOn).toLocaleDateString(),
        "Approval Status": item.approvalStatus || "Pending",
      }));

      const worksheet = XLSX.utils.json_to_sheet(mappedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Documents");

      const excelFile = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });
      const blob = new Blob([excelFile], { type: "application/octet-stream" });

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "Document Reports.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error fetching documents:", error);
      alert("Failed to fetch documents. Please try again.");
    }
  };

  const handleFormatChange = (event) => {
    setSelectedFormat(event.target.value);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Document Reports</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 bg-slate-100 p-4 rounded-lg">
        {role === "BRANCH ADMIN" ? (
          <>
            <select
              name="branch"
              value={searchCriteria.branch}
              onChange={handleInputChange}
              className="p-2 border rounded-md outline-none"
              disabled={true}
            >
              <option value={userBranch?.id}>{userBranch?.name}</option>
            </select>

            <select
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
          </>
        ) : role === "DEPARTMENT ADMIN" || role === "USER" ? (
          <>
            <select
              name="branch"
              value={searchCriteria.branch}
              onChange={handleInputChange}
              className="p-2 border rounded-md outline-none"
              disabled={true}
            >
              <option value={userBranch?.id}>{userBranch?.name}</option>
            </select>

            <select
              name="department"
              value={searchCriteria.department}
              onChange={handleInputChange}
              className="p-2 border rounded-md outline-none"
              disabled={true}
            >
              <option value={userDepartment?.id}>{userDepartment?.name}</option>
            </select>
          </>
        ) : (
          <>
            <select
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

            <select
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
          </>
        )}

        <select
          name="category"
          value={searchCriteria.category}
          onChange={handleInputChange}
          className="p-2 border rounded-md outline-none"
        >
          <option value="">Select Category</option>
          {categoryOptions.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        <select
          name="status"
          value={searchCriteria.status}
          onChange={handleInputChange}
          className="p-2 border rounded-md outline-none"
        >
          <option value="">Select Status</option>
          <option value="PENDING">PENDING</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
        </select>

        <DatePicker
          selected={fromDate}
          onChange={(date) => setFromDate(date)}
          selectsStart
          startDate={fromDate}
          endDate={toDate}
          dateFormat="yyyy-MM-dd"
          placeholderText="Start Date"
          maxDate={new Date()} // Prevents selecting dates later than today
          className="w-full px-3 py-2 border rounded-md"
        />

        <DatePicker
          selected={toDate}
          onChange={(date) => setToDate(date)}
          selectsEnd
          startDate={fromDate}
          endDate={toDate}
          dateFormat="yyyy-MM-dd"
          placeholderText="End Date"
          maxDate={new Date()} // Prevents selecting dates later than today
          className="w-full px-3 py-2 border rounded-md"
        />
      </div>

      <div className="format-selection space-y-4 grid grid-cols-12 mb-4">
      <label className="flex items-center space-x-2 mt-4">
        <input
          type="radio"
          value="pdf"
          checked={selectedFormat === "pdf"}
          onChange={handleFormatChange}
          className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
        />
        <FaFilePdf className="h-5 w-5 text-gray-700" />
        <span className="text-gray-700">PDF</span>
      </label>

      <label className="flex items-center space-x-2">
        <input
          type="radio"
          value="word"
          checked={selectedFormat === "word"}
          onChange={handleFormatChange}
          className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
        />
        <FaFileWord className="h-5 w-5 text-gray-700" />
        <span className="text-gray-700">Word</span>
      </label>

      <label className="flex items-center space-x-2">
        <input
          type="radio"
          value="excel"
          checked={selectedFormat === "excel"}
          onChange={handleFormatChange}
          className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
        />
        <FaFileExcel className="h-5 w-5 text-gray-700" />
        <span className="text-gray-700">Excel</span>
      </label>
    </div>

      {error && <p className="text-red-500">{error}</p>}

      <button
        onClick={handleDownload}
        className="bg-blue-900 text-white py-2 px-6 rounded-md hover:bg-blue-800 transition duration-300"
      >
        Download Report
      </button>
    </div>
  );
};

export default DocumentReport;
