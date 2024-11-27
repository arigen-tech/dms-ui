import React, { useState, useEffect } from "react";
import { API_HOST } from '../API/apiConfig';
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
    nullRoleEmployeeCountForBranch: 0
  });

  const navigate = useNavigate();

  useEffect(() => {
    const fetchStatsAndData = async () => {
      try {
        const employeeId = localStorage.getItem("userId");
        const token = localStorage.getItem("tokenKey");
        const role = localStorage.getItem("role");

        if (!token || !employeeId) {
          throw new Error("Unauthorized: Token or Employee ID missing.");
        }

        // Set Authorization header for requests
        const authHeader = { headers: { Authorization: `Bearer ${token}` } };
        const url=`${API_HOST}/Dashboard/GetAllCountsForDashBoard`;
        // Fetch dashboard stats
        const statsResponse = await axios.get(url,
          // "${BRANCH_API}/Dashboard/GetAllCountsForDashBoard",
          {
            ...authHeader,
            params: { employeeId },
          }
        );
        setStats(statsResponse.data);

        // Fetch documents summary
        const startDate = `${currentYear}-01-01 00:00:00`;
        const endDate = `${currentYear}-12-31 23:59:59`;

        let summaryUrl = '';

        if (role === "ADMIN" || role === "BRANCH ADMIN"  ||  role === "DEPARTMENT ADMIN") {
          summaryUrl = `${API_HOST}/api/documents/document/summary/by/${employeeId}`;
        } else {
          summaryUrl = `${API_HOST}/api/documents/documents-summary/${employeeId}`;
        }

        const summaryResponse = await axios.get(summaryUrl, {
          ...authHeader,
          params: { startDate, endDate },
        });





        const { months, approvedDocuments, rejectedDocuments } = summaryResponse.data;
        const mappedData = months.map((month, index) => ({
          name: month,
          ApprovedDocuments: approvedDocuments[index],
          RejectedDocuments: rejectedDocuments[index],
        }));

        setChartData(mappedData);

      } catch (error) {
        console.error("Error fetching data:", error);

        // Redirect to login if unauthorized
        if (
          error.response?.status === 401 ||
          error.message === "Unauthorized: Token or Employee ID missing."
        ) {
          navigate("/login");
        }
      }
    };

    fetchStatsAndData();
  }, [navigate, currentYear]);

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
                  value={stats.totalRejectedDocumentsById}
                  Icon={DocumentMagnifyingGlassIcon}
                />
                <StatBlock
                  title="Approved Documents"
                  value={stats.totalApprovedDocumentsById}
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
                  {/* RejectedDocuments bar with red color */}
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
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
