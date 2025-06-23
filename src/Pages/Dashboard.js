import React, { useState, useEffect } from "react";
import { API_HOST, SYSTEM_ADMIN, BRANCH_ADMIN, DEPARTMENT_ADMIN, USER, BRANCH_API } from "../API/apiConfig";
import apiClient from "../API/apiClient";
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
import { GiFiles } from "react-icons/gi";
import {
  CalendarDaysIcon,
  ComputerDesktopIcon,
  DocumentArrowDownIcon,
  DocumentCheckIcon,
  DocumentMinusIcon,
  DocumentIcon,
  DocumentMagnifyingGlassIcon,
  KeyIcon,
  ShoppingCartIcon,
  UserCircleIcon,
  UsersIcon,
  IdentificationIcon
} from "@heroicons/react/24/solid";
import { IoDocumentLock } from "react-icons/io5";
import { FaUserClock } from "react-icons/fa6";
import Layout from "../Components/Layout";
import axios from 'axios';



function Dashboard() {
  const [chartData, setChartData] = useState([]);
  const [barChartData, setBarChartData] = useState([]); // Separate state for bar chart
  const [topOffice, setTopOffice] = useState([]);
  const [branchId, setBranchId] = useState(null);
  const [branchesId, setBranchsId] = useState(null);
  const [departmentId, setDepartmentId] = useState(null);
  const [branchUserCount, setBranchUserCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [isGrLoading, setIsGrLoading] = useState(true);
  const [isBarChartLoading, setIsBarChartLoading] = useState(true);
  const [isGraphChartLoading, setIsGraphChartLoading] = useState(true);
const [selectedStatus, setSelectedStatus] = useState("all");
const [selectedLineStatus, setSelectedLineStatus] = useState("all");
  
  // Separate loading for bar chart
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [isBranchLoading, setIsBranchLoading] = useState(false);

  const [stats, setStats] = useState({
    branchUser: 0,
    totalUser: 0,
    totalDocument: 0,
    pendingDocument: 0,
    storageUsed: 0,
    totalBranches: 0,
    totalDepartment: 0,
    totalFilesType: 0,
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
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i); // e.g., [2025, 2024, ..., 2016]
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

      const response = await apiClient.get(
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
    const role = localStorage.getItem("role");
    if (role === SYSTEM_ADMIN) {
      fetchBranches();
    }
  }, []);

  const fetchBranches = async () => {
    setIsBranchLoading(true);
    try {
      const token = localStorage.getItem("tokenKey");
      const response = await axios.get(`${BRANCH_API}/findActiveRole`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      setBranches(response.data);
    } catch (error) {
      console.error('Error fetching branches:', error);
    } finally {
      setIsBranchLoading(false);
    }
  };

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);

        const employeeId = localStorage.getItem("userId");
        const token = localStorage.getItem("tokenKey");

        if (!token || !employeeId) {
          throw new Error("Unauthorized: Token or Employee ID missing.");
        }

        const authHeader = { headers: { Authorization: `Bearer ${token}` } };
        const dashboardUrl = `${API_HOST}/api/dashboard/getAllCount/${employeeId}`;

        const response = await apiClient.get(dashboardUrl, {
          ...authHeader,
          params: { employeeId },
        });

        setStats(response.data);
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        const isUnauthorized =
          error.response?.status === 401 ||
          error.message === "Unauthorized: Token or Employee ID missing.";
        if (isUnauthorized) {
          navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    // Call only on first render
    fetchDashboardStats();
  }, [navigate]);


  // Fetch data for all charts except bar chart
  useEffect(() => {
    const fetchMonthlySummary = async () => {
      try {
        setIsGrLoading(true);

        const employeeId = localStorage.getItem("userId");
        const token = localStorage.getItem("tokenKey");
        const role = localStorage.getItem("role");

        if (!token || !employeeId) {
          throw new Error("Unauthorized: Token or Employee ID missing.");
        }

        const authHeader = { headers: { Authorization: `Bearer ${token}` } };
        const baseUrl = `${API_HOST}/api/documents`;
        const startDate = `${selectedYear}-01-01 00:00:00`;
        const endDate = `${selectedYear}-12-31 23:59:59`;

        let summaryUrl = `${baseUrl}/document/summary/by/${employeeId}`;

        // Default URL based on role (no branch filtering here)
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

        const response = await apiClient.get(summaryUrl, {
          ...authHeader,
          params: { startDate, endDate },
        });

        const {
          months,
          approvedDocuments,
          rejectedDocuments,
          pendingDocuments,
        } = response.data;

        const mappedData = months.map((month, index) => ({
          name: month,
          ApprovedDocuments: approvedDocuments[index],
          RejectedDocuments: rejectedDocuments[index],
          PendingDocuments: pendingDocuments[index],
        }));

        setChartData(mappedData);
      } catch (error) {
        console.error("Error fetching monthly summary:", error);
        const isUnauthorized =
          error.response?.status === 401 ||
          error.message === "Unauthorized: Token or Employee ID missing.";
        if (isUnauthorized) {
          navigate("/login");
        }
      } finally {
        setIsGrLoading(false);
      }
    };

    fetchMonthlySummary();
  }, [navigate, selectedYear, branchesId, departmentId]);

  // Separate fetch for bar chart with branch filtering
  useEffect(() => {
    const fetchBarChartData = async () => {
      try {
        setIsBarChartLoading(true);

        const employeeId = localStorage.getItem("userId");
        const token = localStorage.getItem("tokenKey");
        const role = localStorage.getItem("role");

        if (!token || !employeeId) {
          throw new Error("Unauthorized: Token or Employee ID missing.");
        }

        const authHeader = { headers: { Authorization: `Bearer ${token}` } };
        const baseUrl = `${API_HOST}/api/documents`;
        const startDate = `${selectedYear}-01-01 00:00:00`;
        const endDate = `${selectedYear}-12-31 23:59:59`;

        let summaryUrl = `${baseUrl}/document/summary/by/${employeeId}`;

        // Apply branch filtering logic for bar chart
        if (selectedBranch === 'all') {
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
        } else {
          // Filter by selected branch for bar chart
          summaryUrl = `${baseUrl}/branch/${selectedBranch}`;
        }

        const response = await apiClient.get(summaryUrl, {
          ...authHeader,
          params: { startDate, endDate },
        });

        const {
          months,
          approvedDocuments,
          rejectedDocuments,
          pendingDocuments,
        } = response.data;

        const mappedData = months.map((month, index) => ({
          name: month,
          ApprovedDocuments: approvedDocuments[index],
          RejectedDocuments: rejectedDocuments[index],
          PendingDocuments: pendingDocuments[index],
        }));

        setBarChartData(mappedData);
      } catch (error) {
        console.error("Error fetching bar chart data:", error);
        const isUnauthorized =
          error.response?.status === 401 ||
          error.message === "Unauthorized: Token or Employee ID missing.";
        if (isUnauthorized) {
          navigate("/login");
        }
      } finally {
        setIsBarChartLoading(false);
      }
    };

    fetchBarChartData();
  }, [navigate, selectedYear, branchesId, departmentId, selectedBranch]);


  useEffect(() => {
  // debugger;

  const fetchTopBranchSummary = async () => {
    try {
      setIsGraphChartLoading(true);

      const employeeId = localStorage.getItem("userId");
      const token = localStorage.getItem("tokenKey");
      const role = localStorage.getItem("role");

      if (!token || !employeeId) {
        throw new Error("Unauthorized: Token or Employee ID missing.");
      }

      const authHeader = { headers: { Authorization: `Bearer ${token}` } };
      const baseUrl = `${API_HOST}/api/documents`;
      const startDate = `${selectedYear}-01-01 00:00:00`;
      const endDate = `${selectedYear}-12-31 23:59:59`;

      const response = await apiClient.get(
        `${baseUrl}/top-branches-summary`,
        {
          ...authHeader,
          params: { startDate, endDate },
        }
      );

      const {
        branches,
        approvedDocuments,
        rejectedDocuments,
        pendingDocuments,
      } = response.data;

      // Map and filter data based on selectedLineStatus
      let mappedData = branches.map((branch, index) => ({
        name: branch,
        ApprovedDocuments: approvedDocuments[index],
        RejectedDocuments: rejectedDocuments[index],
        PendingDocuments: pendingDocuments[index],
      }));

      if (selectedLineStatus === "approved") {
        mappedData = mappedData.map(d => ({
          name: d.name,
          ApprovedDocuments: d.ApprovedDocuments,
        }));
      } else if (selectedLineStatus === "rejected") {
        mappedData = mappedData.map(d => ({
          name: d.name,
          RejectedDocuments: d.RejectedDocuments,
        }));
      } else if (selectedLineStatus === "pending") {
        mappedData = mappedData.map(d => ({
          name: d.name,
          PendingDocuments: d.PendingDocuments,
        }));
      }
      setTopOffice(mappedData);
    } catch (error) {
      console.error("Error fetching top branch summary:", error);
      const isUnauthorized =
        error.response?.status === 401 ||
        error.message === "Unauthorized: Token or Employee ID missing.";
      if (isUnauthorized) {
        navigate("/login");
      }
    } finally {
      setIsGraphChartLoading(false);
    }
  };

  if (selectedBranch === "top10" || selectedBranch === "all") {
    fetchTopBranchSummary();
  }
}, [navigate, selectedYear, selectedBranch, selectedLineStatus]);


  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  function StatBlock({ title, value, Icon }) {
    return (
      <div className="bg-gray-50 p-3 rounded-r-lg shadow flex items-center justify-between border-l-4 border-blue-50">
        <div>
          <h3 className="text-md font-semibold text-gray-700">{title}</h3>
          {loading ? (
            <div className="h-7 w-20 bg-gray-200 rounded animate-pulse" />
          ) : (
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          )}
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

  const SkeletonBox = () => (
    <div className="bg-gray-200 animate-pulse rounded-lg h-[300px] w-full"></div>
  );


  return (
    <Layout>
      <div className="flex flex-col p-4 min-h-full w-full bg-slate-100">
        <h2 className="text-xl mb-4 font-semibold">DASHBOARD</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {role === SYSTEM_ADMIN && (
            <>
              <Link to="/users" className="block">
                <StatBlock title="Total Users" value={stats.totalUser} Icon={UsersIcon} />
              </Link>

              <Link to="/userRoleAssing" className="block">
                <StatBlock
                  title="Total Pending Users"
                  value={stats.totalNullEmployeeType}
                  Icon={FaUserClock}
                />
              </Link>

              <Link to="/idcard" className="block">
                <StatBlock
                  title="Generate I'D Card"
                  Icon={IdentificationIcon}
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

              <Link to="/create-fileType" className="block">
                <StatBlock
                  title="Total Files Types"
                  value={stats.totalFilesType}
                  Icon={GiFiles}
                />
              </Link>

              <StatBlock
                title="Total Documents"
                value={stats.totalDocument}
                Icon={DocumentIcon}
              />

              <Link to="/approve-documents" className="block">
                <StatBlock
                  title="Pending Documents"
                  value={stats.totalPendingDocuments}
                  Icon={IoDocumentLock}
                />
              </Link>

              <Link to="/total-approved" className="block">
                <StatBlock
                  title="Approved Documents"
                  value={stats.totalApprovedDocuments}
                  Icon={DocumentCheckIcon}
                />
              </Link>

              <Link to="/total-rejected" className="block">
                <StatBlock
                  title="Rejected Documents"
                  value={stats.totalRejectedDocuments}
                  Icon={DocumentMinusIcon}
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
                  Icon={FaUserClock}
                />
              </Link>

              <Link to="/idcard" className="block">
                <StatBlock
                  title="Generate I'D Card"
                  Icon={IdentificationIcon}
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
                Icon={DocumentIcon}
              />

              <Link to="/approve-documents" className="block">
                <StatBlock
                  title="Pending Documents"
                  value={stats.totalPendingDocumentsById}
                  Icon={IoDocumentLock}
                />
              </Link>

              <Link to="/total-approved" className="block">
                <StatBlock
                  title="Approved Documents"
                  value={stats.totalApprovedStatusDocById}
                  Icon={DocumentCheckIcon}
                />
              </Link>

              <Link to="/total-rejected" className="block">
                <StatBlock
                  title="Rejected Documents"
                  value={stats.totalRejectedStatusDocById}
                  Icon={DocumentMinusIcon}
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
                  Icon={FaUserClock}
                />
              </Link>

              <Link to="/idcard" className="block">
                <StatBlock
                  title="Generate I'D Card"
                  Icon={IdentificationIcon}
                />
              </Link>

              <StatBlock
                title="Total Documents"
                value={totalDocsbyDep}
                Icon={DocumentIcon}
              />
              <Link to="/approve-documents" className="block">
                <StatBlock
                  title="Pending Documents"
                  value={stats.totalPendingDocumentsByDepartmentId}
                  Icon={IoDocumentLock}
                />
              </Link>

              <Link to="/total-approved" className="block">
                <StatBlock
                  title="Approved Documents"
                  value={stats.totalApprovedStatusDocByDepartmentId}
                  Icon={DocumentCheckIcon}
                />
              </Link>

              <Link to="/total-rejected" className="block">
                <StatBlock
                  title="Rejected Documents"
                  value={stats.totalRejectedStatusDocByDepartmentId}
                  Icon={DocumentMinusIcon}
                />
              </Link>
            </>
          )}

          {role === USER && (
            <>

              <Link to="/users" className="block">
                <StatBlock
                  title="Create User"
                  value={stats.createdByCount}
                  Icon={UsersIcon}
                />
              </Link>

              <StatBlock
                title="Total Documents"
                value={totalDocsbyUser}
                Icon={DocumentIcon}
              />

              <Link to="/all-documents" className="block">
                <StatBlock
                  title="Pending Documents"
                  value={stats.pendingDocsbyid}
                  Icon={IoDocumentLock}
                />
              </Link>

              <Link to="/approvedDocs" className="block">
                <StatBlock
                  title="Approved Documents"
                  value={stats.approvedDocsbyid}
                  Icon={DocumentCheckIcon}
                />
              </Link>

              <Link to="/rejectedDocs" className="block">
                <StatBlock
                  title="Rejected Documents"
                  value={stats.rejectedDocsbyid}
                  Icon={DocumentMinusIcon}
                />
              </Link>
            </>
          )}
        </div>

        <div className="mb-4">
          <label className="mr-2 font-semibold text-gray-700">Select Year:</label>
          <div className="relative w-40">
            <input
              list="year-options"
              type="text"
              inputMode="numeric"
              pattern="\d{4}"
              placeholder="YYYY"
              value={selectedYear || ""}
              onChange={(e) => {
                const val = e.target.value;
                // Only allow 4-digit numbers
                if (/^\d{0,4}$/.test(val)) {
                  setSelectedYear(val ? Number(val) : "");
                }
              }}
              className="w-full border border-gray-300 rounded px-3 py-1.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <datalist id="year-options">
              {years.map((year) => (
                <option key={year} value={year} />
              ))}
            </datalist>
            <span className="absolute right-2 top-2 text-gray-400 pointer-events-none">📅</span>
          </div>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Bar Chart - Only affected by branch filter */}
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <div className="mb-4">
              <h3 className="flex text-lg font-bold text-gray-800 border-b pb-2 mb-3">
                📊 Monthly Documents Status {selectedYear}
                
              

              {/* Branch Filter Dropdown - Only show for SYSTEM_ADMIN */}
              {role === SYSTEM_ADMIN && (
                <div className=" items-center gap-2">
                  {/* <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                    Branch:
                  </label> */}
                  <div className="relative">
                    <select
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      disabled={isBranchLoading}
                      className="appearance-none bg-white border ml-3 border-gray-300 rounded-lg px-2 py-1 pr-8 text-sm font-medium text-gray-700 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 min-w-[150px] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="all" className="font-medium">
                        🌐 All Branches
                      </option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id} className="font-medium">
                          🏢 {branch.name}
                        </option>
                      ))}
                      <option value="top10">Top 10 Branches</option>
                    </select>

                    {/* Custom dropdown arrow */}
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>

                    {/* Loading indicator */}
                    {isBranchLoading && (
                      <div className="absolute inset-y-0 right-8 flex items-center pr-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              </h3>
            </div>

            {isBarChartLoading ? (
              <SkeletonBox />
            ) : (
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} margin={{ top: 10, right: 30, left: 20, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={70}
                      interval={0}
                      tick={{
                        fontSize: 12,
                        fontWeight: 'bold',
                        fill: '#4a5568'
                      }}
                      tickLine={{ stroke: '#4a5568' }}
                      axisLine={{ stroke: '#4a5568', strokeWidth: 2 }}
                    />
                    <YAxis
                      tick={{
                        fontSize: 12,
                        fontWeight: 'bold',
                        fill: '#4a5568'
                      }}
                      tickLine={{ stroke: '#4a5568' }}
                      axisLine={{ stroke: '#4a5568', strokeWidth: 2 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '2px solid #2d3748',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Legend
                      wrapperStyle={{
                        paddingTop: '10px',
                        fontWeight: 'bold'
                      }}
                      iconSize={12}
                      iconType="circle"
                    />
                    <Bar
                      dataKey="RejectedDocuments"
                      fill="#FF0000"
                      name="Rejected Documents"
                      radius={[4, 4, 0, 0]}
                      barSize={20}
                    />
                    <Bar
                      dataKey="ApprovedDocuments"
                      fill="#82ca9d"
                      name="Approved Documents"
                      radius={[4, 4, 0, 0]}
                      barSize={20}
                    />
                    <Bar
                      dataKey="PendingDocuments"
                      fill="#f0ad4e"
                      name="Pending Documents"
                      radius={[4, 4, 0, 0]}
                      barSize={20}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Line Chart - Not affected by branch filter */}
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-800 border-b pb-2">
                📈 Top 10 Office {selectedYear}
              </h3>
              <select
                value={selectedLineStatus}
                onChange={e => setSelectedLineStatus(e.target.value)}
                className="ml-4 border border-gray-300 rounded px-2 py-1 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                style={{ minWidth: 120 }}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            {isGrLoading ? (
              <SkeletonBox />
            ) : (
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={topOffice} margin={{ top: 10, right: 30, left: 20, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={70}
                      interval={0}
                      tick={{
                        fontSize: 12,
                        fontWeight: 'bold',
                        fill: '#4a5568'
                      }}
                      tickLine={{ stroke: '#4a5568' }}
                      axisLine={{ stroke: '#4a5568', strokeWidth: 2 }}
                    />
                    <YAxis
                      tick={{
                        fontSize: 12,
                        fontWeight: 'bold',
                        fill: '#4a5568'
                      }}
                      tickLine={{ stroke: '#4a5568' }}
                      axisLine={{ stroke: '#4a5568', strokeWidth: 2 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '2px solid #2d3748',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Legend
                      wrapperStyle={{
                        paddingTop: '10px',
                        fontWeight: 'bold'
                      }}
                      iconSize={12}
                      iconType="circle"
                    />
                    {(selectedLineStatus === "all" || selectedLineStatus === "approved") && (
                      <Line
                        type="monotone"
                        dataKey="ApprovedDocuments"
                        stroke="#82ca9d"
                        strokeWidth={3}
                        dot={{ r: 6, strokeWidth: 2, fill: '#fff' }}
                        activeDot={{ r: 8, strokeWidth: 0 }}
                        name="Approved Documents"
                      />
                    )}
                    {(selectedLineStatus === "all" || selectedLineStatus === "rejected") && (
                      <Line
                        type="monotone"
                        dataKey="RejectedDocuments"
                        stroke="#FF0000"
                        strokeWidth={3}
                        dot={{ r: 6, strokeWidth: 2, fill: '#fff' }}
                        activeDot={{ r: 8, strokeWidth: 0 }}
                        name="Rejected Documents"
                      />
                    )}
                    {(selectedLineStatus === "all" || selectedLineStatus === "pending") && (
                      <Line
                        type="monotone"
                        dataKey="PendingDocuments"
                        stroke="#f0ad4e"
                        strokeWidth={3}
                        dot={{ r: 6, strokeWidth: 2, fill: '#fff' }}
                        activeDot={{ r: 8, strokeWidth: 0 }}
                        name="Pending Documents"
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Polar Chart */}
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <h3 className="text-lg font-bold mb-3 text-gray-800 border-b pb-2">🌀 Polar Document Stats {selectedYear}</h3>
            {isGrLoading ? (
              <SkeletonBox />
            ) : (
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart outerRadius="70%" data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                    <PolarGrid stroke="#e0e0e0" />
                    <PolarAngleAxis
                      dataKey="name"
                      tick={{
                        fontSize: 12,
                        fontWeight: 'bold',
                        fill: '#4a5568'
                      }}
                    />
                    <PolarRadiusAxis
                      tick={{
                        fontSize: 10,
                        fontWeight: 'bold',
                        fill: '#4a5568'
                      }}
                    />
                    <Radar
                      name="Approved Documents"
                      dataKey="ApprovedDocuments"
                      stroke="#82ca9d"
                      fill="#82ca9d"
                      fillOpacity={0.6}
                      strokeWidth={2}
                    />
                    <Radar
                      name="Rejected Documents"
                      dataKey="RejectedDocuments"
                      stroke="#FF0000"
                      fill="#FF0000"
                      fillOpacity={0.6}
                      strokeWidth={2}
                    />
                    <Radar
                      name="Pending Documents"
                      dataKey="PendingDocuments"
                      stroke="#f0ad4e"
                      fill="#f0ad4e"
                      fillOpacity={0.6}
                      strokeWidth={2}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '2px solid #2d3748',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Legend
                      wrapperStyle={{
                        paddingTop: '10px',
                        fontWeight: 'bold'
                      }}
                      iconSize={12}
                      iconType="circle"
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Pie Chart */}
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <h3 className="text-lg font-bold mb-3 text-gray-800 border-b pb-2">🎯 Document Status Distribution {selectedYear}</h3>
            {isGrLoading ? (
              <SkeletonBox />
            ) : (
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                    <Pie
                      data={pieChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={40}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`${value} documents`, 'Count']}
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '2px solid #2d3748',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        fontWeight: 'bold'
                      }}
                    />
                    <Legend
                      wrapperStyle={{
                        paddingTop: '15px',
                        fontWeight: 'bold'
                      }}
                      iconSize={12}
                      iconType="circle"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default Dashboard;
