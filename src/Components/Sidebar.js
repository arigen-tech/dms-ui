import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import {
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
  CalendarDaysIcon,
  UserPlusIcon,
  ComputerDesktopIcon,
  LockClosedIcon,
  UserCircleIcon,
  ShoppingCartIcon,
  IdentificationIcon,
  ClockIcon
} from "@heroicons/react/24/solid";
import { SiArchiveofourown } from "react-icons/si";

import {
  RiFileUserFill,
  RiInboxUnarchiveFill,
  RiMenuSearchLine,
  RiInboxArchiveFill,
  RiArchiveStackFill,
} from "react-icons/ri";
import { IoDocumentLock } from "react-icons/io5";
import { AiOutlineFileSearch } from "react-icons/ai";
import { MdAdfScanner } from "react-icons/md";
import { FaUserClock } from "react-icons/fa6";
import { GiFiles } from "react-icons/gi";

import logo3 from "../Assets/logo3.png";
import {
  API_HOST,
  SYSTEM_ADMIN,
  BRANCH_ADMIN,
  DEPARTMENT_ADMIN,
  USER,
} from "../API/apiConfig";

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
        totalFilesType: 0,
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
        departmentUser: 0,
        rejectedDocsbyid: 0,
        approvedDocsbyid: 0,
        pendingDocsbyid: 0,
        createdByCount: 0,
        nullRoleEmployeeCountForDepartment: 0,
        totalDocumentsByDepartmentId: 0,
        totalPendingDocumentsByDepartmentId: 0,
        totalApprovedStatusDocByDepartmentId: 0,
        totalRejectedStatusDocByDepartmentId: 0,
      };
  });

  //System Admin
  const manageUserRoleCont = counts.totalUser - counts.totalNullEmployeeType;

  //Branch Admin
  const manageUserRoleContbranch =
    counts.branchUser - counts.nullRoleEmployeeCountForBranch;

  //Department Admin
  const manageUserRoleContdepartment =
    counts.departmentUser - counts.nullRoleEmployeeCountForDepartment;

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
          `${API_HOST}/api/dashboard/getAllCount/${employeeId}`,
          {
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

  const [isOCROpen, setOCROpen] = useState(() => {
    return localStorage.getItem("isOCROpen") === "true";
  });

  const [isArchiveOpen, setArchiveOpen] = useState(() => {
    return localStorage.getItem("isArchiveOpen") === "true";
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

  const handleOCRToggle = () => {
    const newOCROpenState = !isOCROpen;
    setOCROpen(newOCROpenState);
    localStorage.setItem("isOCROpen", newOCROpenState);
  };

  const handleArchiveToggle = () => {
    const newArchiveOpenState = !isArchiveOpen;
    setArchiveOpen(newArchiveOpenState);
    localStorage.setItem("isArchiveOpen", newArchiveOpenState);
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
    <div className="max-h-[100%] overflow-y-auto print:max-h-none print:overflow-auto h-screen flex flex-col justify-between bg-blue-800 text-white w-52 p-1 transition-all duration-300 hide-scrollbar">
      <div>
        <div className="flex items-center border-b border-t justify-center mb-2">
          <img className="flex w-30 h-30" src={logo3} alt="DMS" />
        </div>
        <nav className="flex flex-col space-y-1">
          <hr className="border-t border-blue-800" />

          {role === SYSTEM_ADMIN && (
            <>
              <SidebarLink to="/dashboard" icon={InboxIcon} text="Dashboard" />
              <SidebarLink to="/archivalDashboard" icon={SiArchiveofourown} text="Archival Dashboard" />

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
                  icon={FaUserClock}
                  text="Total Pending Users"
                  count={counts.totalNullEmployeeType}
                />
                <hr className="border-t border-blue-800 mt-1" />
                <SidebarLink
                  to="/manageUserRole"
                  icon={UserPlusIcon}
                  text="Manage Users Roles"
                  count={manageUserRoleCont}
                />
                <hr className="border-t border-blue-800 mt-1" />
                <SidebarLink
                  to="/idcard"
                  icon={IdentificationIcon}
                  text="Generate I'D Card"
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
                    <hr className="border-t border-blue-800" />
                    <SidebarLink
                      to="/create-year"
                      icon={CalendarDaysIcon}
                      text="Years"
                      count={counts.annualYear}
                    />
                    <hr className="border-t border-blue-800" />
                    <SidebarLink
                      to="/create-fileType"
                      icon={GiFiles}
                      text="Files Types"
                      count={counts.totalFilesType}
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
                      text="Pending Approvals"
                      count={counts.totalPendingDocuments}
                    />
                    <SidebarLink
                      to="/total-approved"
                      icon={DocumentCheckIcon}
                      text="Approved Document"
                      count={counts.totalApprovedDocuments}
                    />
                    <SidebarLink
                      to="/total-rejected"
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
                    <SidebarLink
                      to="/searchByScan"
                      icon={DocumentTextIcon}
                      text="Search Documents By QR Codes"
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
                    />

                    <SidebarLink
                      to="/userReport"
                      icon={RiFileUserFill}
                      text="User Report"
                    />
                  </div>
                )}
              </div>

              {/* arcive and Ocr */}
              <div>
                <button
                  onClick={handleOCRToggle}
                  className="w-full px-3 py-1 rounded-lg text-xs font-lg flex items-center justify-between text-white hover:bg-blue-950 hover:text-white"
                >
                  <div className="flex items-center">
                    <AiOutlineFileSearch className="h-5 w-5 mr-3" />O C R
                  </div>
                  {isOCROpen ? (
                    <ChevronDownIcon className="h-4 w-4" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4" />
                  )}
                </button>
                {isOCROpen && (
                  <div className="ml-2 flex flex-col space-y-1">
                    <hr className="border-t border-blue-800 mt-1" />
                    <SidebarLink
                      to="/adminOcr"
                      icon={RiMenuSearchLine}
                      text="Search OCR"
                    // count={counts.totalRejectedDocuments}
                    />
                  </div>
                )}
              </div>

              <div>
                <button
                  onClick={handleArchiveToggle}
                  className="w-full px-3 py-1 rounded-lg text-xs font-lg flex items-center justify-between text-white hover:bg-blue-950 hover:text-white"
                >
                  <div className="flex items-center">
                    <RiArchiveStackFill className="h-5 w-5 mr-3" />
                    Archive Section
                  </div>
                  {isArchiveOpen ? (
                    <ChevronDownIcon className="h-4 w-4" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4" />
                  )}
                </button>
                {isArchiveOpen && (
                  <div className="ml-2 flex flex-col space-y-1">
                    <hr className="border-t border-blue-800 mt-1" />

                    <SidebarLink
                      to="/archive"
                      icon={RiInboxArchiveFill}
                      text="Data Archive Download"
                    />

                    <SidebarLink
                      to="/archivesuplod"
                      icon={RiInboxUnarchiveFill}
                      text="Data Archive Upload"
                    />
                    <SidebarLink
                      to="/retentionpolicy"
                      icon={ClockIcon}
                      text="RetentionPolicy"
                    />

                  </div>
                )}
              </div>
            </>
          )}
          {role === BRANCH_ADMIN && (
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
                icon={FaUserClock}
                text="Pending Users"
                count={counts.nullRoleEmployeeCountForBranch}
              />
              <SidebarLink
                to="/manageUserRole"
                icon={UserPlusIcon}
                text="Manage Users Roles"
                count={manageUserRoleContbranch}
              />
              <hr className="border-t border-blue-800 mt-1" />
              <SidebarLink
                to="/idcard"
                icon={IdentificationIcon}
                text="Generate I'D Card"
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
                      to="/total-approved"
                      icon={DocumentCheckIcon}
                      text="Approved Documents"
                      count={counts.totalApprovedStatusDocById}
                    />
                    <SidebarLink
                      to="/total-rejected"
                      icon={DocumentMinusIcon}
                      text="Rejected Documents"
                      count={counts.totalRejectedStatusDocById}
                    />
                    <SidebarLink
                      to="/search"
                      icon={DocumentMagnifyingGlassIcon}
                      text="Search Documents"
                    />
                    <SidebarLink
                      to="/searchByScan"
                      icon={DocumentTextIcon}
                      text="Search Documents By QR Codes"
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
              <div>
                <button
                  onClick={handleOCRToggle}
                  className="w-full px-3 py-1 rounded-lg text-xs font-lg flex items-center justify-between text-white hover:bg-blue-950 hover:text-white"
                >
                  <div className="flex items-center">
                    <AiOutlineFileSearch className="h-5 w-5 mr-3" />O C R
                  </div>
                  {isOCROpen ? (
                    <ChevronDownIcon className="h-4 w-4" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4" />
                  )}
                </button>
                {isOCROpen && (
                  <div className="ml-2 flex flex-col space-y-1">
                    <hr className="border-t border-blue-800 mt-1" />
                    <SidebarLink
                      to="/brAdminOcr"
                      icon={RiMenuSearchLine}
                      text="Search OCR"
                    // count={counts.totalRejectedDocuments}
                    />
                  </div>
                )}
              </div>
              <div>
                <button
                  onClick={handleArchiveToggle}
                  className="w-full px-3 py-1 rounded-lg text-xs font-lg flex items-center justify-between text-white hover:bg-blue-950 hover:text-white"
                >
                  <div className="flex items-center">
                    <RiArchiveStackFill className="h-5 w-5 mr-3" />
                    Archive Section
                  </div>
                  {isArchiveOpen ? (
                    <ChevronDownIcon className="h-4 w-4" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4" />
                  )}
                </button>
                {isArchiveOpen && (
                  <div className="ml-2 flex flex-col space-y-1">
                    <hr className="border-t border-blue-800 mt-1" />
                    <SidebarLink
                      to="/archive"
                      icon={RiInboxArchiveFill}
                      text="Data Archive Download"
                    />

                    <SidebarLink
                      to="/archivesuplod"
                      icon={RiInboxUnarchiveFill}
                      text="Data Archive Upload"
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {role === DEPARTMENT_ADMIN && (
            <>
              <SidebarLink to="/dashboard" icon={InboxIcon} text="Dashboard" />
              <SidebarLink
                to="/Departmentusers"
                icon={UserGroupIcon}
                text="Users"
                count={counts.departmentUser}
              />
              <SidebarLink
                to="/PendingRole"
                icon={FaUserClock}
                text="Pending Users"
                count={counts.nullRoleEmployeeCountForDepartment}
              />
              <hr className="border-t border-blue-800 mt-1" />
              <SidebarLink
                to="/idcard"
                icon={IdentificationIcon}
                text="Generate I'D Card"
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
                      icon={IoDocumentLock}
                      text="Pending Approvals"
                      count={counts.totalPendingDocumentsByDepartmentId}
                    />
                    <SidebarLink
                      to="/total-approved"
                      icon={DocumentCheckIcon}
                      text="Approved Document"
                      count={counts.totalApprovedStatusDocByDepartmentId}
                    />
                    <SidebarLink
                      to="/total-rejected"
                      icon={DocumentMinusIcon}
                      text="Rejected Documents"
                      count={counts.totalRejectedStatusDocByDepartmentId}
                    />
                    <SidebarLink
                      to="/search"
                      icon={DocumentMagnifyingGlassIcon}
                      text="Search Documents"
                    />
                    <SidebarLink
                      to="/searchByScan"
                      icon={DocumentTextIcon}
                      text="Search Documents By QR Codes"
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
              <div>
                <button
                  onClick={handleOCRToggle}
                  className="w-full px-3 py-1 rounded-lg text-xs font-lg flex items-center justify-between text-white hover:bg-blue-950 hover:text-white"
                >
                  <div className="flex items-center">
                    <AiOutlineFileSearch className="h-5 w-5 mr-3" />O C R
                  </div>
                  {isOCROpen ? (
                    <ChevronDownIcon className="h-4 w-4" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4" />
                  )}
                </button>
                {isOCROpen && (
                  <div className="ml-2 flex flex-col space-y-1">
                    <hr className="border-t border-blue-800 mt-1" />
                    <SidebarLink
                      to="/dpAdminOcr"
                      icon={RiMenuSearchLine}
                      text="Search OCR"
                    // count={counts.totalRejectedDocuments}
                    />
                  </div>
                )}
              </div>
              <div>
                <button
                  onClick={handleArchiveToggle}
                  className="w-full px-3 py-1 rounded-lg text-xs font-lg flex items-center justify-between text-white hover:bg-blue-950 hover:text-white"
                >
                  <div className="flex items-center">
                    <RiArchiveStackFill className="h-5 w-5 mr-3" />
                    Archive Section
                  </div>
                  {isArchiveOpen ? (
                    <ChevronDownIcon className="h-4 w-4" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4" />
                  )}
                </button>
                {isArchiveOpen && (
                  <div className="ml-2 flex flex-col space-y-1">
                    <hr className="border-t border-blue-800 mt-1" />
                    <SidebarLink
                      to="/archive"
                      icon={RiInboxArchiveFill}
                      text="Data Archive Download"
                    />

                    <SidebarLink
                      to="/archivesuplod"
                      icon={RiInboxUnarchiveFill}
                      text="Data Archive Upload"
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {role === USER && (
            <>
              <SidebarLink to="/dashboard" icon={InboxIcon} text="Dashboard" />

              <SidebarLink
                to="/users"
                icon={UserGroupIcon}
                text="Users"
                count={counts.createdByCount}
              />

              <SidebarLink
                to="/scan"
                icon={MdAdfScanner}
                text="Scan Document"
              />
              <SidebarLink
                to="/all-documents"
                icon={DocumentArrowUpIcon}
                text="Upload Document"
                count={counts.pendingDocsbyid}
              />
              <SidebarLink
                to="/approvedDocs"
                icon={DocumentCheckIcon}
                text="Approved Document"
                count={counts.approvedDocsbyid}
              />
              <SidebarLink
                to="/rejectedDocs"
                icon={DocumentTextIcon}
                text="Rejected Document"
                count={counts.rejectedDocsbyid}
              />
              {/* Added Search Documents Link */}
              <SidebarLink
                to="/search"
                icon={DocumentTextIcon}
                text="Search Documents"
              />
              <SidebarLink
                to="/searchByScan"
                icon={DocumentTextIcon}
                text="Search Documents By QR Codes"
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
              <div>
                <button
                  onClick={handleOCRToggle}
                  className="w-full px-3 py-1 rounded-lg text-xs font-lg flex items-center justify-between text-white hover:bg-blue-950 hover:text-white"
                >
                  <div className="flex items-center">
                    <AiOutlineFileSearch className="h-5 w-5 mr-3" />O C R
                  </div>
                  {isOCROpen ? (
                    <ChevronDownIcon className="h-4 w-4" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4" />
                  )}
                </button>
                {isOCROpen && (
                  <div className="ml-2 flex flex-col space-y-1">
                    <hr className="border-t border-blue-800 mt-1" />
                    <SidebarLink
                      to="/userOcr"
                      icon={RiMenuSearchLine}
                      text="Search OCR"
                    />
                  </div>
                )}
              </div>
            </>
          )}

          <hr className="border-t border-blue-800" />
        </nav>
      </div>
    </div>
  );
}

export default Sidebar;
