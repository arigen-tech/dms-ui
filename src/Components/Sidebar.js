import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeftIcon,
  InboxIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  DocumentArrowUpIcon,
  DocumentCheckIcon,
  DocumentChartBarIcon,
  DocumentMinusIcon,
  DocumentMagnifyingGlassIcon,
  DocumentIcon,
  KeyIcon,
  UserPlusIcon,
  ComputerDesktopIcon,
  LockClosedIcon,
  UserCircleIcon,
  CalendarDaysIcon,
  ShoppingCartIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/solid";
import { RiFileUserFill } from "react-icons/ri";
import { IoDocumentLock } from "react-icons/io5";
import { FaRegFile, FaTimesCircle } from 'react-icons/fa';
import logo3 from "../Assets/logo3.png";
import { API_HOST } from "../API/apiConfig";

const tokenKey = "tokenKey";

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const [counts, setCounts] = useState(() => {
    const savedCounts = sessionStorage.getItem("counts");
    return savedCounts
      ? JSON.parse(savedCounts)
      : {
          totalUser: 0,
          branchUser: 0,
          totalDocument: 0,
          pendingDocument: 0,
          storageUsed: 0,
          totalBranches: 0,
          totalDepartment: 0,
          totalRoles: 0,
          documentType: 0,
          annualYear: 0,
          totalNullEmployeeType: 0,
          totalCategories: 0,
          totalApprovedDocuments: 0,
          totalRejectedDocuments: 0,
          totalPendingDocuments: 0,
          totalApprovedDocumentsById: 0,
          totalRejectedDocumentsById: 0,
          totalPendingDocumentsById: 0,
          totalDocumentsById: 0,
          totalApprovedStatusDocById: 0,
          totalRejectedStatusDocById: 0,
          departmentCountForBranch: 0,
          nullRoleEmployeeCountForBranch: 0,
        };
  });

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const employeeId = localStorage.getItem("userId"); // Get employeeId from local storage
        const token = localStorage.getItem("tokenKey"); // Ensure this is defined correctly

        // Check if employeeId is available
        if (!employeeId) {
          throw new Error("Employee ID not found in local storage.");
        }

        const response = await axios.get(
          `${API_HOST}/Dashboard/GetAllCountsForDashBoard`,
          {
            params: {
              employeeId: employeeId, // Pass employeeId as a query parameter
            },
            headers: { Authorization: `Bearer ${token}` }, // Attach token in headers
          }
        );

        // Set the counts in state and session storage
        setCounts(response.data);
        sessionStorage.setItem("counts", JSON.stringify(response.data));
        console.log("Counts fetched:", response.data);
      } catch (error) {
        console.error("Error fetching dashboard counts:", error);
      }
    };

    // const storedCounts = sessionStorage.getItem("counts");
    // if (storedCounts) {
    //   // If counts exist in session storage, retrieve them
    //   setCounts(JSON.parse(storedCounts));
    // } else {
    // session storage, fetch counts from the API
    fetchCounts();
    // }
  }, []);

  const [isCreateOpen, setCreateOpen] = useState(() => {
    return localStorage.getItem("isCreateOpen") === "true";
  });

  const [isDocumentOpen, setDocumentOpen] = useState(() => {
    return localStorage.getItem("isDocumentOpen") === "true";
  });

  const [isReportOpen, setReportOpen] = useState(() => {
    return localStorage.getItem("isReportOpen") === "true";
  });

  const handleLogout = () => {
    localStorage.removeItem(tokenKey);
    sessionStorage.removeItem("counts");
    navigate("/");
  };

  const handleCreateToggle = () => {
    const newCreateOpenState = !isCreateOpen;
    setCreateOpen(newCreateOpenState);
    localStorage.setItem("isCreateOpen", newCreateOpenState);
  };

  const handleDocumentToggle = () => {
    const newDocumentOpenState = !isDocumentOpen;
    setDocumentOpen(newDocumentOpenState);
    localStorage.setItem("isDocumentOpen", newDocumentOpenState);
  };

  const handleReportToggle = () => {
    const newReportOpenState = !isReportOpen;
    setReportOpen(newReportOpenState);
    localStorage.setItem("isReportOpen", newReportOpenState);
  };

  const isActive = (path) =>
    location.pathname === path
      ? "bg-blue-950 text-white"
      : "text-white hover:bg-blue-950 hover:text-white";

  const SidebarLink = ({ to, icon: Icon, text, count }) => (
    <Link
      to={to}
      className={`px-3 py-1 rounded-lg text-xs font-lg flex items-center justify-between ${isActive(
        to
      )}`}
    >
      <div className="flex items-center">
        <Icon className="h-5 w-5 mr-3" />
        <span>{text}</span>
      </div>
      {count > 0 && (
        <span className="bg-blue-600 text-white rounded-2xl px-2 py-1 text-xs font-semibold">
          {count}
        </span>
      )}
    </Link>
  );

  const role = localStorage.getItem("role");

  return (
    <div className="h-screen flex flex-col justify-between bg-blue-800 text-white w-52 p-1 transition-all duration-300">
      <div>
        <div className="flex items-center border-b border-t justify-center mb-2">
          <img className="flex w-30 h-30" src={logo3} alt="DMS" />
        </div>
        <nav className="flex flex-col space-y-1">
          <hr className="border-t border-blue-800" />

          {role === "USER" && (
            <>
              <SidebarLink to="/dashboard" icon={InboxIcon} text="Dashboard" />

              <SidebarLink
                to="/users"
                icon={UserGroupIcon}
                text="Users"
                count={counts.totalUser}
              />
              <SidebarLink
                to="/all-documents"
                icon={DocumentArrowUpIcon}
                text="Upload Document"
                count={counts.totalPendingDocumentsById}
              />
              <SidebarLink
                to="/approvedDocs"
                icon={DocumentCheckIcon}
                text="Approved Document"
                count={counts.totalApprovedDocumentsById}
              />
              <SidebarLink
                to="/rejectedDocs"
                icon={DocumentTextIcon}
                text="Rejected Document"
                count={counts.totalRejectedDocumentsById}
              />
              {/* Added Search Documents Link */}
              <SidebarLink
                to="/search"
                icon={DocumentTextIcon}
                text="Search Documents"
              />

<div>
                <button
                  onClick={handleReportToggle}
                  className="w-full px-3 py-1 rounded-lg text-xs font-lg flex items-center justify-between text-white hover:bg-blue-950 hover:text-white"
                >
                  <div className="flex items-center">
                    <DocumentChartBarIcon className="h-5 w-5 mr-3" />
                    Report Section
                  </div>
                  {isReportOpen ? (
                    <ChevronDownIcon className="h-4 w-4" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4" />
                  )}
                </button>
                {isReportOpen && (
                  <div className="ml-2 flex flex-col space-y-1">
                    <hr className="border-t border-blue-800 mt-1" />
                    <SidebarLink
                      to="/documentReport"
                      icon={DocumentTextIcon}
                      text="Document Report"
                      // count={counts.totalRejectedDocuments}
                    />
                  </div>
                )}
              </div>
            </>
            
          )}

          {role === "ADMIN" && (
            <>
              <SidebarLink to="/dashboard" icon={InboxIcon} text="Dashboard" />
              <hr className="border-t border-blue-800 mt-1" />
              <div>
                <SidebarLink
                  to="/users"
                  icon={UserGroupIcon}
                  text="Users"
                  count={counts.totalUser}
                />
                <hr className="border-t border-blue-800 mt-1" />
                <SidebarLink
                  to="/userRoleAssing"
                  icon={UserPlusIcon}
                  text="Total Pending Users"
                  count={counts.totalNullEmployeeType}
                />
                <button
                  onClick={handleCreateToggle}
                  className="w-full px-3 py-1 rounded-lg text-xs flex items-center justify-between text-white hover:bg-blue-950 hover:text-white mt-2"
                >
                  <div className="flex items-center">
                    <BuildingOfficeIcon className="h-5 w-5 mr-3" />
                    Organisation
                  </div>
                  {isCreateOpen ? (
                    <ChevronDownIcon className="h-4 w-4" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4" />
                  )}
                </button>
                {isCreateOpen && (
                  <div className="ml-2 flex flex-col space-y-1">
                    <hr className="border-t border-blue-800 mt-1" />
                    <SidebarLink
                      to="/create-branch"
                      icon={KeyIcon}
                      text="Branch"
                      count={counts.totalBranches}
                    />
                    <hr className="border-t border-blue-800" />
                    <SidebarLink
                      to="/create-department"
                      icon={ComputerDesktopIcon}
                      text="Department"
                      count={counts.totalDepartment}
                    />
                    <hr className="border-t border-blue-800" />
                    <SidebarLink
                      to="/create-role"
                      icon={UserCircleIcon}
                      text="Role"
                      count={counts.totalRoles}
                    />
                    <hr className="border-t border-blue-800" />
                    <SidebarLink
                      to="/create-category"
                      icon={ShoppingCartIcon}
                      text="Category"
                      count={counts.totalCategories}
                    />
                  </div>
                )}
              </div>
              <div>
                <button
                  onClick={handleDocumentToggle}
                  className="w-full px-3 py-1 rounded-lg text-xs font-lg flex items-center justify-between text-white hover:bg-blue-950 hover:text-white"
                >
                  <div className="flex items-center">
                    <DocumentIcon className="h-5 w-5 mr-3" />
                    Document
                  </div>
                  {isDocumentOpen ? (
                    <ChevronDownIcon className="h-4 w-4" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4" />
                  )}
                </button>
                {isDocumentOpen && (
                  <div className="ml-2 flex flex-col space-y-1">
                    <hr className="border-t border-blue-800 mt-1" />
                    <SidebarLink
                      to="/approve-documents"
                      icon={IoDocumentLock}
                      text="Wait For Approve"
                      count={counts.totalPendingDocuments}
                    />
                    <SidebarLink
                      to="/approve-by-admin"
                      icon={DocumentCheckIcon}
                      text="Approved Document"
                      count={counts.totalApprovedDocuments}
                    />
                    <SidebarLink
                      to="/reject-by-admin"
                      icon={DocumentMinusIcon}
                      text="Rejected Document"
                      count={counts.totalRejectedDocuments}
                    />
                    {/* Added Search Documents Link */}
                    <SidebarLink
                      to="/search"
                      icon={DocumentMagnifyingGlassIcon}
                      text="Search Documents"
                    />
                  </div>
                )}
              </div>
              <div>
                <button
                  onClick={handleReportToggle}
                  className="w-full px-3 py-1 rounded-lg text-xs font-lg flex items-center justify-between text-white hover:bg-blue-950 hover:text-white"
                >
                  <div className="flex items-center">
                    <DocumentChartBarIcon className="h-5 w-5 mr-3" />
                    Report Section
                  </div>
                  {isReportOpen ? (
                    <ChevronDownIcon className="h-4 w-4" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4" />
                  )}
                </button>
                {isReportOpen && (
                  <div className="ml-2 flex flex-col space-y-1">
                    <hr className="border-t border-blue-800 mt-1" />
                    <SidebarLink
                      to="/documentReport"
                      icon={DocumentTextIcon}
                      text="Document Report"
                      // count={counts.totalRejectedDocuments}
                    />

                    <SidebarLink
                      to="/userReport"
                      icon={RiFileUserFill}
                      text="User Report"
                      // count={counts.totalRejectedDocuments}
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {role === "DEPARTMENT ADMIN" && (
            <>
              <SidebarLink to="/dashboard" icon={InboxIcon} text="Dashboard" />
              <SidebarLink
                to="/Departmentusers"
                icon={UserGroupIcon}
                text="Users"
                count={counts.branchUser}
              />
              <SidebarLink
                to="/PendingRole"
                icon={UserPlusIcon}
                text="Pending Users"
                count={counts.nullRoleEmployeeCountForBranch}
              />
              {/* <SidebarLink
                to="/create-departments"
                icon={ComputerDesktopIcon}
                text="Departments"
                count={counts.departmentCountForBranch}
              /> */}
              <div>
                {/* Document section */}
                <button
                  onClick={handleDocumentToggle}
                  className="w-full px-3 py-1 rounded-lg text-xs font-lg flex items-center justify-between text-white hover:bg-blue-950 hover:text-white"
                >
                  <div className="flex items-center">
                    <DocumentTextIcon className="h-5 w-5 mr-3" />
                    Document
                  </div>
                  {isDocumentOpen ? (
                    <ChevronDownIcon className="h-4 w-4" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4" />
                  )}
                </button>
                {isDocumentOpen && (
                  <div className="ml-2 flex flex-col space-y-1">
                    <hr className="border-t border-blue-800 mt-1" />
                    <SidebarLink
                      to="/approve-documents"
                      icon={IoDocumentLock}
                      text="Pending Approvals"
                      count={counts.totalPendingDocumentsById}
                    />
                    <SidebarLink
                      to="/approve-by-admin"
                      icon={DocumentCheckIcon}
                      text="Approved Documents"
                      count={counts.totalApprovedStatusDocById}
                    />
                    <SidebarLink
                      to="/reject-by-admin"
                      icon={DocumentTextIcon}
                      text="Rejected Documents"
                      count={counts.totalRejectedStatusDocById}
                    />
                    <SidebarLink
                      to="/search"
                      icon={DocumentTextIcon}
                      text="Search Documents"
                    />
                  </div>
                )}
                <div>
                <button
                  onClick={handleReportToggle}
                  className="w-full px-3 py-1 rounded-lg text-xs font-lg flex items-center justify-between text-white hover:bg-blue-950 hover:text-white"
                >
                  <div className="flex items-center">
                    <DocumentChartBarIcon className="h-5 w-5 mr-3" />
                    Report Section
                  </div>
                  {isReportOpen ? (
                    <ChevronDownIcon className="h-4 w-4" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4" />
                  )}
                </button>
                {isReportOpen && (
                  <div className="ml-2 flex flex-col space-y-1">
                    <hr className="border-t border-blue-800 mt-1" />
                    <SidebarLink
                      to="/documentReport"
                      icon={DocumentTextIcon}
                      text="Document Report"
                      // count={counts.totalRejectedDocuments}
                    />

                    <SidebarLink
                      to="/userReport"
                      icon={RiFileUserFill}
                      text="User Report"
                      // count={counts.totalRejectedDocuments}
                    />
                  </div>
                )}
              </div>
              </div>
            </>
          )}
          {role === "BRANCH ADMIN" && (
            <>
              <SidebarLink to="/dashboard" icon={InboxIcon} text="Dashboard" />
              <SidebarLink
                to="/branchusers"
                icon={UserGroupIcon}
                text="Branch Users"
                count={counts.branchUser}
              />
              <SidebarLink
                to="/userRoleAssing"
                icon={UserPlusIcon}
                text="Pending Users"
                count={counts.nullRoleEmployeeCountForBranch}
              />
              <SidebarLink
                to="/create-departments"
                icon={ComputerDesktopIcon}
                text="Departments"
                count={counts.departmentCountForBranch}
              />
              <div>
                {/* Document section */}
                <button
                  onClick={handleDocumentToggle}
                  className="w-full px-3 py-1 rounded-lg text-xs font-lg flex items-center justify-between text-white hover:bg-blue-950 hover:text-white"
                >
                  <div className="flex items-center">
                    <DocumentTextIcon className="h-5 w-5 mr-3" />
                    Document
                  </div>
                  {isDocumentOpen ? (
                    <ChevronDownIcon className="h-4 w-4" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4" />
                  )}
                </button>
                {isDocumentOpen && (
                  <div className="ml-2 flex flex-col space-y-1">
                    <hr className="border-t border-blue-800 mt-1" />
                    <SidebarLink
                      to="/approve-documents"
                      icon={LockClosedIcon}
                      text="Pending Approvals"
                      count={counts.totalPendingDocumentsById}
                    />
                    <SidebarLink
                      to="/approve-by-admin"
                      icon={DocumentCheckIcon}
                      text="Approved Documents"
                      count={counts.totalApprovedStatusDocById}
                    />
                    <SidebarLink
                      to="/reject-by-admin"
                      icon={DocumentTextIcon}
                      text="Rejected Documents"
                      count={counts.totalRejectedStatusDocById}
                    />
                    <SidebarLink
                      to="/search"
                      icon={DocumentTextIcon}
                      text="Search Documents"
                    />
                  </div>
                )}
                <div>
                <button
                  onClick={handleReportToggle}
                  className="w-full px-3 py-1 rounded-lg text-xs font-lg flex items-center justify-between text-white hover:bg-blue-950 hover:text-white"
                >
                  <div className="flex items-center">
                    <DocumentChartBarIcon className="h-5 w-5 mr-3" />
                    Report Section
                  </div>
                  {isReportOpen ? (
                    <ChevronDownIcon className="h-4 w-4" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4" />
                  )}
                </button>
                {isReportOpen && (
                  <div className="ml-2 flex flex-col space-y-1">
                    <hr className="border-t border-blue-800 mt-1" />
                    <SidebarLink
                      to="/documentReport"
                      icon={DocumentTextIcon}
                      text="Document Report"
                      // count={counts.totalRejectedDocuments}
                    />

                    <SidebarLink
                      to="/userReport"
                      icon={RiFileUserFill}
                      text="User Report"
                      // count={counts.totalRejectedDocuments}
                    />
                  </div>
                )}
              </div>
              </div>
            </>
          )}

          <hr className="border-t border-blue-800" />
        </nav>
      </div>
      <div>
        <hr className="border-t border-blue-800 mb-1" />
        <button
          onClick={handleLogout}
          className="w-full px-3 py-1 rounded-lg text-xs font-lg flex items-center text-white hover:bg-blue-950 hover:text-white"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-3" />
          Logout
        </button>
        <hr className="border-t border-blue-800 mb-0.5 my-1" />
      </div>
    </div>
  );
}

export default Sidebar;
