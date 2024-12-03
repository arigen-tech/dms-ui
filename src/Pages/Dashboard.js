import React, { useState, useEffect } from "react";
import { API_HOST } from "../API/apiConfig";
import axios from "axios";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Cell,
  Pie,
} from "recharts";
import { useNavigate } from "react-router-dom"; // For redirecting if unauthorized
import Sidebar from "../Components/Sidebar";
import Header from "../Components/Header";
import {
  CalendarDaysIcon,
  ComputerDesktopIcon,
  DocumentArrowDownIcon,
  DocumentChartBarIcon,
  DocumentMagnifyingGlassIcon,
  KeyIcon,
  ServerStackIcon,
  ShoppingCartIcon,
  UserCircleIcon,
  UsersIcon,
} from "@heroicons/react/24/solid";

function Dashboard() {
  const [chartData, setChartData] = useState([]);
  const [branchId, setBranchId] = useState(null);
  const [branchesId, setBranchsId] = useState(null);
  const [departmentId, setDepartmentId] = useState(null);
  const [branchUserCount, setBranchUserCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const currentYear = new Date().getFullYear();
  const [stats, setStats] = useState({
    branchUser: 0,
    totalUser: 0,
    totalDocument: 0,
    pendingDocument: 0,
    storageUsed: 0,
    totalBranches: 0,
    totalDepartment: 0,
    totalRoles: 0,
    documentType: 0,
    annualYear: 0,
    totalCategories: 0,
    totalApprovedDocuments: 0,
    totalRejectedDocuments: 0,
    totalPendingDocuments: 0,
    totalApprovedDocumentsById: 0,
    totalRejectedDocumentsById: 0,
    totalPendingDocumentsById: 0,
    totalDocumentsById: 0,
    totalNullEmployeeType: 0,
    totalApprovedStatusDocById: 0,
    totalRejectedStatusDocById: 0,
    departmentCountForBranch: 0,
    nullRoleEmployeeCountForBranch: 0,
    departmentUser: 0,
    nullRoleEmployeeCountForDepartment: 0,
    totalDocumentsByDepartmentId: 0,
    totalPendingDocumentsByDepartmentId: 0,
    totalApprovedStatusDocByDepartmentId: 0,
    totalRejectedStatusDocByDepartmentId: 0,
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchUserDetails();
  }, []);
  
  const fetchUserDetails = async () => {
    try {
      const userId = localStorage.getItem("userId");
      const token = localStorage.getItem("tokenKey");
  
      if (!userId || !token) {
        throw new Error("User ID or token is missing in localStorage");
      }
  
      const response = await axios.get(`${API_HOST}/employee/findById/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
  
      const employeeData = response.data;
      console.log("Employee data:", employeeData);
  
      // Set Branch ID if available
      if (employeeData.branch && employeeData.branch.id) {
        const branchId = employeeData.branch.id;
        setBranchsId(branchId);
        console.log("Branch ID:", branchId);
      } else {
        console.warn("Branch ID is not available in the response.");
        setBranchsId(null);
      }
  
      // Set Department ID if available, handle null case
      if (employeeData.department) {
        const departmentId = employeeData.department.id;
        setDepartmentId(departmentId);
        console.log("Department ID:", departmentId);
      } else {
        console.warn("Department is null.");
        setDepartmentId(null);
      }
    } catch (error) {
      console.error("Error fetching user details:", error.response?.data || error.message);
      // Set default values or handle error
      setBranchsId(null);
      setDepartmentId(null);
    }
  };
  
  
  
  
  useEffect(() => {
    const fetchStatsAndData = async () => {
      try {
        const employeeId = localStorage.getItem("userId");
        const token = localStorage.getItem("tokenKey");
        const role = localStorage.getItem("role");
  
        if (!token || !employeeId) {
          throw new Error("Unauthorized: Token or Employee ID missing.");
        }
  
        const authHeader = { headers: { Authorization: `Bearer ${token}` } };
        const url = `${API_HOST}/api/dashboard/getAllCount/${employeeId}`;
  
        const startDate = `${currentYear}-01-01 00:00:00`;
        const endDate = `${currentYear}-12-31 23:59:59`;
        let summaryUrl = `${API_HOST}/api/documents/document/summary/by/${employeeId}`;
  
        if (role === "ADMIN") {
          summaryUrl = `${API_HOST}/api/documents/total`;
        } else if (role === "BRANCH ADMIN") {
          // Always use branchesId for Branch Admin
          summaryUrl = `${API_HOST}/api/documents/branch/${branchesId}`;
        } else if (role === "DEPARTMENT ADMIN") {
          // Use departmentId if available, otherwise fall back to branchesId
          summaryUrl = departmentId 
            ? `${API_HOST}/api/documents/department/${departmentId}`
            : `${API_HOST}/api/documents/branch/${branchesId}`;
        } else if (role === "USER") {
          summaryUrl = `${API_HOST}/api/documents/document/summary/by/${employeeId}`;
        }
  
        const [statsResponse, summaryResponse] = await Promise.all([
          axios.get(url, { ...authHeader, params: { employeeId } }),
          axios.get(summaryUrl, {
            ...authHeader,
            params: { startDate, endDate },
          }),
        ]);
  
        setStats(statsResponse.data);
  
        const { months, approvedDocuments, rejectedDocuments } = summaryResponse.data;
        const mappedData = months.map((month, index) => ({
          name: month,
          ApprovedDocuments: approvedDocuments[index],
          RejectedDocuments: rejectedDocuments[index],
          PendingDocuments: rejectedDocuments[index],
        }));
  
        setChartData(mappedData);
      } catch (error) {
        console.error("Error fetching data:", error);
  
        if (
          error.response?.status === 401 ||
          error.message === "Unauthorized: Token or Employee ID missing."
        ) {
          navigate("/login");
        }
      }
    };
  
    fetchStatsAndData();
  }, [navigate, currentYear, branchesId, departmentId]);
  
 

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  function StatBlock({ title, value, Icon }) {
    return (
      <div className="bg-white p-3 rounded-r-lg shadow flex items-center justify-between border-l-4 border-blue-800">
        <div>
          <h3 className="text-md font-semibold text-gray-700">{title}</h3>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <Icon className="w-8 h-8 text-blue-900" />
      </div>
    );
  }

  const role = localStorage.getItem("role");
  const totalApprovedDocuments = chartData.reduce(
    (acc, curr) => acc + curr.ApprovedDocuments,
    0
  );
  const totalRejectedDocuments = chartData.reduce(
    (acc, curr) => acc + curr.RejectedDocuments,
    0
  );
  const totalPendingDocuments = chartData.reduce(
    (acc, curr) => acc + curr.PendingDocuments,
    0
  );
  const COLORS = ["#82ca9d", "#FF0000", "#f0ad4e"];

  const pieChartData = [
    { name: "Approved", value: totalApprovedDocuments },
    { name: "Rejected", value: totalRejectedDocuments },
    { name: "Pending", value: totalPendingDocuments },
  ];

  return (
    <div className="flex flex-row bg-gray-200 h-screen w-screen overflow-hidden">
      {sidebarOpen && <Sidebar />}
      <div className="flex flex-col flex-1">
        <Header toggleSidebar={toggleSidebar} />
        <div className="flex-1 p-4 min-h-0 overflow-auto">
          <h2 className="text-xl mb-4 font-semibold">DASHBOARD</h2>

          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatBlock
              title="Total Users"
              value={stats.totalUser}
              Icon={UsersIcon}
            />
            <StatBlock
              title="Storage Used"
              value={`150 GB`}
              Icon={ServerStackIcon}
            />
            {/* <StatBlock
              title="Annual Years"
              value={stats.annualYear}
              Icon={CalendarDaysIcon}
            /> */}

            {role === "USER" && (
              <>
                <StatBlock
                  title="Total Documents"
                  value={stats.totalDocumentsById}
                  Icon={DocumentArrowDownIcon}
                />
                <StatBlock
                  title="Pending Documents"
                  value={stats.totalPendingDocumentsById}
                  Icon={DocumentMagnifyingGlassIcon}
                />
                <StatBlock
                  title="Rejected Documents"
                  value={stats.rejectedDocsbyid}
                  Icon={DocumentMagnifyingGlassIcon}
                />
                <StatBlock
                  title="Approved Documents"
                  value={stats.approvedDocsbyid}
                  Icon={DocumentMagnifyingGlassIcon}
                />
              </>
            )}

            {role === "ADMIN" && (
              <>
                <StatBlock
                  title="Total Documents"
                  value={stats.totalDocument}
                  Icon={DocumentArrowDownIcon}
                />
                <StatBlock
                  title="Pending Documents"
                  value={stats.totalPendingDocuments}
                  Icon={DocumentMagnifyingGlassIcon}
                />
                <StatBlock
                  title="Total Branches"
                  value={stats.totalBranches}
                  Icon={KeyIcon}
                />
                <StatBlock
                  title="Total Departments"
                  value={stats.totalDepartment}
                  Icon={ComputerDesktopIcon}
                />
                <StatBlock
                  title="Total Roles"
                  value={stats.totalRoles}
                  Icon={UserCircleIcon}
                />
                <StatBlock
                  title="Document Types"
                  value={stats.documentType}
                  Icon={DocumentChartBarIcon}
                />
                <StatBlock
                  title="Total Categories"
                  value={stats.totalCategories}
                  Icon={ShoppingCartIcon}
                />
                <StatBlock
                  title="Rejected Documents"
                  value={stats.totalRejectedDocuments}
                  Icon={DocumentMagnifyingGlassIcon}
                />
                <StatBlock
                  title="Approved Documents"
                  value={stats.totalApprovedDocuments}
                  Icon={DocumentMagnifyingGlassIcon}
                />
              </>
            )}

            {/* Branch Admin Stats */}
            {role === "BRANCH ADMIN" && (
              <>
                <StatBlock
                  title="Branch Users"
                  value={stats.branchUser}
                  Icon={UsersIcon}
                />
                <StatBlock
                  title="Pending Users"
                  value={stats.nullRoleEmployeeCountForBranch}
                  Icon={UsersIcon}
                />
                <StatBlock
                  title="Total Documents"
                  value={stats.totalDocumentsById}
                  Icon={DocumentArrowDownIcon}
                />
                <StatBlock
                  title="Pending Documents"
                  value={stats.totalPendingDocumentsById}
                  Icon={DocumentMagnifyingGlassIcon}
                />
                <StatBlock
                  title="Approved Documents"
                  value={stats.totalApprovedStatusDocById}
                  Icon={DocumentMagnifyingGlassIcon}
                />
                <StatBlock
                  title="Rejected Documents"
                  value={stats.totalRejectedStatusDocById}
                  Icon={DocumentMagnifyingGlassIcon}
                />
                <StatBlock
                  title="Total Departments"
                  value={stats.departmentCountForBranch}
                  Icon={ComputerDesktopIcon}
                />
              </>
            )}

            {role === "DEPARTMENT ADMIN" && (
              <>
                <StatBlock
                  title="Branch Users"
                  value={stats.branchUser}
                  Icon={UsersIcon}
                />
                <StatBlock
                  title="Pending Users"
                  value={stats.nullRoleEmployeeCountForBranch}
                  Icon={UsersIcon}
                />
                <StatBlock
                  title="Total Documents"
                  value={stats.totalDocumentsById}
                  Icon={DocumentArrowDownIcon}
                />
                <StatBlock
                  title="Pending Documents"
                  value={stats.totalPendingDocumentsById}
                  Icon={DocumentMagnifyingGlassIcon}
                />
                <StatBlock
                  title="Approved Documents"
                  value={stats.totalApprovedStatusDocById}
                  Icon={DocumentMagnifyingGlassIcon}
                />
                <StatBlock
                  title="Rejected Documents"
                  value={stats.totalRejectedStatusDocById}
                  Icon={DocumentMagnifyingGlassIcon}
                />
                <StatBlock
                  title="Total Departments"
                  value={stats.departmentCountForBranch}
                  Icon={ComputerDesktopIcon}
                />
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Bar Chart */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">
                Monthly Document Stats {currentYear}
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="RejectedDocuments"
                    fill="#FF0000"
                    name="Rejected Documents"
                  />
                  <Bar
                    dataKey="ApprovedDocuments"
                    fill="#82ca9d"
                    name="Approved Documents"
                  />
                  <Bar
                    dataKey="PendingDocuments"
                    fill="#f0ad4e"
                    name="Pending Documents"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Line Chart */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">
                Page Document Stats {currentYear}
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="ApprovedDocuments"
                    stroke="#82ca9d"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="RejectedDocuments"
                    stroke="#FF0000"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="PendingDocuments"
                    stroke="#f0ad4e"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Polar Chart */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">
                Polar Document Stats
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart outerRadius="80%" data={chartData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="name" />
                  <PolarRadiusAxis />
                  {/* Radar components for each data set */}
                  <Radar
                    name="Approved Documents"
                    dataKey="ApprovedDocuments"
                    stroke="#82ca9d"
                    fill="#82ca9d"
                    fillOpacity={0.6}
                  />
                  <Radar
                    name="Rejected Documents"
                    dataKey="RejectedDocuments"
                    stroke="#FF0000"
                    fill="#FF0000"
                    fillOpacity={0.6}
                  />
                  <Radar
                    name="Pending Documents"
                    dataKey="PendingDocuments"
                    stroke="#f0ad4e"
                    fill="#f0ad4e"
                    fillOpacity={0.6}
                  />
                  {/* Tooltip to display data when mouse hovers */}
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">
                Document Status Distribution
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={pieChartData} // Use the calculated totals here
                    dataKey="value" // Value to use for Pie slices
                    nameKey="name" // Name of each section (Approved, Rejected, Pending)
                    cx="50%" // Centering the Pie chart
                    cy="50%" // Centering the Pie chart
                    outerRadius={80} // Outer radius of the Pie chart
                    label // Adding labels inside Pie slices
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip /> {/* Tooltip to show data when hovered */}
                  <Legend />{" "}
                  {/* Legend to show which color corresponds to which name */}
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
