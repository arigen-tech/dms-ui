import React, { useState, useEffect } from "react";
import { API_HOST, SYSTEM_ADMIN, BRANCH_ADMIN, DEPARTMENT_ADMIN, USER  } from "../API/apiConfig";
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
import { useNavigate, Link } from "react-router-dom";
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

      const response = await axios.get(
        `${API_HOST}/employee/findById/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

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
      console.error(
        "Error fetching user details:",
        error.response?.data || error.message
      );
      // Set default values or handle error
      setBranchsId(null);
      setDepartmentId(null);
    }
  };

  useEffect(() => {
    const fetchStatsAndData = async () => {
      try {

        // debugger;
        const employeeId = localStorage.getItem("userId");
        const token = localStorage.getItem("tokenKey");
        const role = localStorage.getItem("role");
  
        if (!token || !employeeId) {
          throw new Error("Unauthorized: Token or Employee ID missing.");
        }
  
        const authHeader = { headers: { Authorization: `Bearer ${token}` } };
        const baseUrl = `${API_HOST}/api/documents`;
        const dashboardUrl = `${API_HOST}/api/dashboard/getAllCount/${employeeId}`;
        const startDate = `${currentYear}-01-01 00:00:00`;
        const endDate = `${currentYear}-12-31 23:59:59`;
  
        let summaryUrl = `${baseUrl}/document/summary/by/${employeeId}`;
  
        switch (role) {
          case SYSTEM_ADMIN:
            summaryUrl = `${baseUrl}/monthly-total`;
            break;
          case BRANCH_ADMIN:
            summaryUrl = `${baseUrl}/branch/${branchesId}`;
            break;
          case DEPARTMENT_ADMIN:
            summaryUrl = departmentId
              ? `${baseUrl}/department/${departmentId}`
              : `${baseUrl}/branch/${branchesId}`;
            break;
          case USER:
            summaryUrl = `${baseUrl}/document/summary/by/${employeeId}`;
            break;
          default:
            throw new Error("Invalid role.");
        }
  
        const [statsResponse, summaryResponse] = await Promise.all([
          axios.get(dashboardUrl, { ...authHeader, params: { employeeId } }),
          axios.get(summaryUrl, {
            ...authHeader,
            params: { startDate, endDate },
          }),
        ]);
  
        setStats(statsResponse.data);
  
        const {
          months,
          approvedDocuments,
          rejectedDocuments,
          pendingDocuments,
        } = summaryResponse.data;
  
        const mappedData = months.map((month, index) => ({
          name: month,
          ApprovedDocuments: approvedDocuments[index],
          RejectedDocuments: rejectedDocuments[index],
          PendingDocuments: pendingDocuments[index],
        }));
  
        setChartData(mappedData);
      } catch (error) {
        console.error("Error fetching data:", error);
  
        const isUnauthorized =
          error.response?.status === 401 ||
          error.message === "Unauthorized: Token or Employee ID missing.";
  
        if (isUnauthorized) {
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
      <div className="bg-gray-50 p-3 rounded-r-lg shadow flex items-center justify-between border-l-4 border-blue-50">
        <div>
          <h3 className="text-md font-semibold text-gray-700">{title}</h3>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <Icon className="w-8 h-8 text-blue-800" />
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

  const totalDocsbyBranch = (stats.totalRejectedStatusDocById + stats.totalApprovedStatusDocById + stats.totalPendingDocumentsById);
  const totalDocsbyDep = (stats.totalRejectedStatusDocByDepartmentId + stats.totalApprovedStatusDocByDepartmentId + stats.totalPendingDocumentsByDepartmentId);
  const totalDocsbyUser = (stats.rejectedDocsbyid + stats.approvedDocsbyid + stats.pendingDocsbyid);


  return (
    <div className="flex flex-row bg-gray-200 h-screen w-screen overflow-hidden">
      {sidebarOpen && <Sidebar />}
      <div className="flex flex-col flex-1">
        <Header toggleSidebar={toggleSidebar} />
        <div className="flex-1 p-4 min-h-0 overflow-auto">
          <h2 className="text-xl mb-4 font-semibold">DASHBOARD</h2>

          <div className="grid grid-cols-4 gap-4 mb-6">
            {role === SYSTEM_ADMIN && (
              <>
                <Link to="/users" className="block">
                  <StatBlock
                    title="Total Users"
                    value={stats.totalUser}
                    Icon={UsersIcon}
                  />
                </Link>
                
                <Link to="/userRoleAssing" className="block">
                  <StatBlock
                    title="Total Pending Users"
                    value={stats.totalNullEmployeeType}
                    Icon={UsersIcon}
                  />
                </Link>

                <Link to="/create-branch" className="block">
                  <StatBlock
                    title="Total Branches"
                    value={stats.totalBranches}
                    Icon={KeyIcon}
                  />
                </Link>

                <Link to="/create-department" className="block">
                  <StatBlock
                    title="Total Departments"
                    value={stats.totalDepartment}
                    Icon={ComputerDesktopIcon}
                  />
                </Link>

                <Link to="/create-role" className="block">
                  <StatBlock
                    title="Total Roles"
                    value={stats.totalRoles}
                    Icon={UserCircleIcon}
                  />
                </Link>

                <Link to="/create-category" className="block">
                  <StatBlock
                    title="Total Categories"
                    value={stats.totalCategories}
                    Icon={ShoppingCartIcon}
                  />
                </Link>

                <Link to="/create-year" className="block">
                  <StatBlock
                    title="Total Year"
                    value={stats.annualYear}
                    Icon={CalendarDaysIcon}
                  />
                </Link>

                <StatBlock
                  title="Total Documents"
                  value={stats.totalDocument}
                  Icon={DocumentArrowDownIcon}
                />

                <Link to="/approve-documents" className="block">
                  <StatBlock
                    title="Pending Documents"
                    value={stats.totalPendingDocuments}
                    Icon={DocumentMagnifyingGlassIcon}
                  />
                </Link>

                <Link to="/total-approved" className="block">
                  <StatBlock
                    title="Approved Documents"
                    value={stats.totalApprovedDocuments}
                    Icon={DocumentMagnifyingGlassIcon}
                  />
                </Link>

                <Link to="/total-rejected" className="block">
                  <StatBlock
                    title="Rejected Documents"
                    value={stats.totalRejectedDocuments}
                    Icon={DocumentMagnifyingGlassIcon}
                  />
                </Link>
              </>
            )}

            {role === BRANCH_ADMIN && (
              <>
                <Link to="/branchusers" className="block">
                  <StatBlock
                    title="Branch Users"
                    value={stats.branchUser}
                    Icon={UsersIcon}
                  />
                </Link>

                <Link to="/userRoleAssing" className="block">
                  <StatBlock
                    title="Pending Users"
                    value={stats.nullRoleEmployeeCountForBranch}
                    Icon={UsersIcon}
                  />
                </Link>

                <Link to="/create-departments" className="block">
                  <StatBlock
                    title="Total Departments"
                    value={stats.departmentCountForBranch}
                    Icon={ComputerDesktopIcon}
                  />
                </Link>

                <StatBlock
                  title="Total Documents"
                  value={totalDocsbyBranch}
                  Icon={DocumentArrowDownIcon}
                />

                <Link to="/approve-documents" className="block">
                  <StatBlock
                    title="Pending Documents"
                    value={stats.totalPendingDocumentsById}
                    Icon={DocumentMagnifyingGlassIcon}
                  />
                </Link>

                <Link to="/total-approved" className="block">
                  <StatBlock
                    title="Approved Documents"
                    value={stats.totalApprovedStatusDocById}
                    Icon={DocumentMagnifyingGlassIcon}
                  />
                </Link>

                <Link to="/total-rejected" className="block">
                  <StatBlock
                    title="Rejected Documents"
                    value={stats.totalRejectedStatusDocById}
                    Icon={DocumentMagnifyingGlassIcon}
                  />
                </Link>
              </>
            )}

            {role === DEPARTMENT_ADMIN && (
              <>
                <Link to="/Departmentusers" className="block">
                  <StatBlock
                    title="Department Users"
                    value={stats.departmentUser}
                    Icon={UsersIcon}
                  />
                </Link>

                <Link to="/PendingRole" className="block">
                  <StatBlock
                    title="Pending Users"
                    value={stats.nullRoleEmployeeCountForDepartment}
                    Icon={UsersIcon}
                  />
                </Link>

                <StatBlock
                  title="Total Documents"
                  value={totalDocsbyDep}
                  Icon={DocumentArrowDownIcon}
                />
                <Link to="/approve-documents" className="block">
                  <StatBlock
                    title="Pending Documents"
                    value={stats.totalPendingDocumentsByDepartmentId}
                    Icon={DocumentMagnifyingGlassIcon}
                  />
                </Link>

                <Link to="/total-approved" className="block">
                  <StatBlock
                    title="Approved Documents"
                    value={stats.totalApprovedStatusDocByDepartmentId}
                    Icon={DocumentMagnifyingGlassIcon}
                  />
                </Link>

                <Link to="/total-rejected" className="block">
                  <StatBlock
                    title="Rejected Documents"
                    value={stats.totalRejectedStatusDocByDepartmentId}
                    Icon={DocumentMagnifyingGlassIcon}
                  />
                </Link>
              </>
            )}

            {role === USER && (
              <>
                <StatBlock
                  title="Total Documents"
                  value={totalDocsbyUser}
                  Icon={DocumentArrowDownIcon}
                />
                <Link to="/users" className="block">
                  <StatBlock
                    title="Create User"
                    value={stats.createdByCount}
                    Icon={UsersIcon}
                  />
                </Link>

                <Link to="/all-documents" className="block">
                  <StatBlock
                    title="Pending Documents"
                    value={stats.pendingDocsbyid}
                    Icon={DocumentMagnifyingGlassIcon}
                  />
                </Link>

                <Link to="/approvedDocs" className="block">
                  <StatBlock
                    title="Approved Documents"
                    value={stats.approvedDocsbyid}
                    Icon={DocumentMagnifyingGlassIcon}
                  />
                </Link>

                <Link to="/rejectedDocs" className="block">
                  <StatBlock
                    title="Rejected Documents"
                    value={stats.rejectedDocsbyid}
                    Icon={DocumentMagnifyingGlassIcon}
                  />
                </Link>
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
