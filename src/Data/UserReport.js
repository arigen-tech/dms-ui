import React, { useState, useEffect } from "react";
import { API_HOST } from "../API/apiConfig";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const UserReport = () => {
  const [searchCriteria, setSearchCriteria] = useState({
    fileNo: "",
    title: "",
    subject: "",
    version: "",
    category: "",
    branch: "",
    department: "",
  });

  const [branchOptions, setBranchOptions] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    if (searchCriteria.branch) {
      fetchDepartments(searchCriteria.branch);
    }
  }, [searchCriteria.branch]);

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSearchCriteria((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "branch" && { department: "" }),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Search Criteria:", searchCriteria);
    console.log("From Date:", fromDate);
    console.log("To Date:", toDate);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">User Reports</h2>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 bg-slate-100 p-4 rounded-lg">
          {/* Branch Dropdown */}
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

          {/* Department Dropdown */}
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

          {/* Status Dropdown */}
          <select
            name="status"
            onChange={handleInputChange}
            className="p-2 border rounded-md outline-none"
          >
            <option value="">Select Status</option>
            <option value="PENDING">ACTIVE</option>
            <option value="APPROVED">INACTIVE</option>
          </select>

          {/* From Date Picker */}
          <DatePicker
            selected={fromDate}
            onChange={(date) => setFromDate(date)}
            selectsStart
            startDate={fromDate}
            endDate={toDate}
            dateFormat="dd/MM/yyyy"
            placeholderText="Select a start date"
            className="w-full px-3 py-2 border rounded-md focus:ring-2"
          />

          {/* To Date Picker */}
          <DatePicker
            selected={toDate}
            onChange={(date) => setToDate(date)}
            selectsEnd
            startDate={fromDate}
            endDate={toDate}
            minDate={fromDate}
            dateFormat="dd/MM/yyyy"
            placeholderText="Select an end date"
            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="bg-blue-900 text-white py-2 px-6 rounded-md hover:bg-blue-800 transition duration-300"
        >
          Download Report
        </button>
      </form>
    </div>
  );
};

export default UserReport