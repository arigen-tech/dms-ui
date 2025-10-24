import React, { Suspense } from "react";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import { MenuProvider } from "./Components/MenuProvider";
import ProtectedRoute from "./Components/ProtectedRoute";
import ChatBotPopup from "./Components/ChatBotPopup";
import PageNotFound from "./Pages/PageNotFound";
import LoginPage from "./Pages/LoginPage";
import Notification from "./Data/Notification";
const Dashboard = React.lazy(() => import("./Pages/Dashboard"));
const Inbox = React.lazy(() => import("./Pages/Inbox"));
const Users = React.lazy(() => import("./Pages/Users"));
const Branches = React.lazy(() => import("./Pages/Branches"));
const Departments = React.lazy(() => import("./Pages/Departments"));
const Roles = React.lazy(() => import("./Pages/Roles"));
const Types = React.lazy(() => import("./Pages/Types"));
const Years = React.lazy(() => import("./Pages/Years"));
const Categories = React.lazy(() => import("./Pages/Categories"));
const Documents = React.lazy(() => import("./Pages/Documents"));
const Approves = React.lazy(() => import("./Pages/Approves"));
const ApprovedDocs = React.lazy(() => import("./Pages/ApprovedDocs"));
const RejectedDocs = React.lazy(() => import("./Pages/RejectedDocs"));
const ApproveByAdmin = React.lazy(() => import("./Pages/ApproveByAdmin"));
const RejectByAdmin = React.lazy(() => import("./Pages/RejectByAdmin"));
const UserRoleAssing = React.lazy(() => import("./Pages/UserRoleAssing"));
const ChangePasswordPage = React.lazy(() => import("./Pages/ChangePasswordPage"));
const SearchDoc = React.lazy(() => import("./Pages/SearchDoc"));
const SearchByScanning = React.lazy(() => import("./Pages/SearchByScanning"));
const BranchUsers = React.lazy(() => import("./Pages/Branch/BranchUsers"));
const DepartmentUsers = React.lazy(() => import("./Pages/Department/DepartmentUsers"));
const BranchDepartments = React.lazy(() => import("./Pages/Branch/BranchDepartments"));
const PendingUsers = React.lazy(() => import("./Pages/Department/PendingUsers"));
const UserReports = React.lazy(() => import("./Pages/UserReports"));
const DocumentsReport = React.lazy(() => import("./Pages/DocumentsReport"));
const ManageUserRoles = React.lazy(() => import("./Pages/ManageUserRoles"));
const ArchiveDoc = React.lazy(() => import("./Pages/ArchiveDoc"));
const ArchivesDoc = React.lazy(() => import("./Pages/ArchivesDoc"));
const AdminsOCR = React.lazy(() => import("./Pages/AdminsOCR"));
const BrAdminsOCR = React.lazy(() => import("./Pages/BrAdminsOCR"));
const DpAdminsOCR = React.lazy(() => import("./Pages/DpAdminsOCR"));
const AdminsOCRResponce = React.lazy(() => import("./Pages/AdminsOCRResponce"));
const Scanner = React.lazy(() => import("./Pages/Scanner"));
const IDCardGenerator = React.lazy(() => import("./Pages/IDCardGenerator"));
const FilesType = React.lazy(() => import("./Pages/FilesTypes"));
const RetentionPolicypage = React.lazy(() => import("./Pages/RetentionPolicypage"));
const ArchivalDashboard = React.lazy(() => import("./Pages/ArchivalDashboard"));
const FileComparepage = React.lazy(() => import("./Pages/FileComparepage"));
const ManageUserApplications = React.lazy(() => import("./Pages/ManageUserApplications"));
const TemplateMasters = React.lazy(() => import("./Pages/TemplateMasters"));
const AddFormReportss = React.lazy(() => import("./Pages/AddFormReportss"));
const AssignApplications = React.lazy(() => import("./Pages/AssignApplications"));
const RoleRightss = React.lazy(() => import("./Pages/RoleRightss"));
const AuditForms = React.lazy(() => import("./Pages/AuditForms"));
const WaitingRooms = React.lazy(() => import("./Pages/WaitingRooms"));
const DashboardnEW = React.lazy(() => import("./Pages/DashboardnEW"));
const ExportDatas =React.lazy(() => import( "./Pages/ExportDatas"));

function App() {
  return (
    <MenuProvider>
      <Router>
        <ChatBotPopup />
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LoginPage />} />
            <Route path="/notifications" element={<Notification />} />
            <Route path="/adminOCRResponce" element={<AdminsOCRResponce />} />
            <Route path="/profile" element={<ChangePasswordPage />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/newDash" element={<Dashboard />} />
              <Route path="/dashboard" element={<DashboardnEW />} />
              <Route path="/inbox" element={<Inbox />} />
              <Route path="/users" element={<Users />} />
              <Route path="/branchusers" element={<BranchUsers />} />
              <Route path="/Departmentusers" element={<DepartmentUsers />} />
              <Route path="/create-branch" element={<Branches />} />
              <Route path="/create-year" element={<Years />} />
              <Route path="/create-department" element={<Departments />} />
              <Route path="/create-departments" element={<BranchDepartments />} />
              <Route path="/create-role" element={<Roles />} />
              <Route path="/create-type" element={<Types />} />
              <Route path="/create-category" element={<Categories />} />
              <Route path="/approve-documents" element={<Approves />} />
              <Route path="/total-approved" element={<ApproveByAdmin />} />
              <Route path="/total-rejected" element={<RejectByAdmin />} />
              <Route path="/userRoleAssing" element={<UserRoleAssing />} />
              <Route path="/pendingRole" element={<PendingUsers />} />
              <Route path="/all-documents" element={<Documents />} />
              <Route path="/approvedDocs" element={<ApprovedDocs />} />
              <Route path="/rejectedDocs" element={<RejectedDocs />} />
              <Route path="/userReport" element={<UserReports />} />
              <Route path="/manageUserRole" element={<ManageUserRoles />} />
              <Route path="/documentReport" element={<DocumentsReport />} />
              <Route path="/profile" element={<ChangePasswordPage />} />
              <Route path="/search" element={<SearchDoc />} />
              <Route path="/searchByScan" element={<SearchByScanning />} />
              <Route path="/archive" element={<ArchiveDoc />} />
              <Route path="/archivesuplod" element={<ArchivesDoc />} />
              <Route path="/adminOcr" element={<AdminsOCR />} />
              <Route path="/brAdminOcr" element={<BrAdminsOCR />} />
              <Route path="/searchOcr" element={<DpAdminsOCR />} />
              <Route path="/adminOCRResponce" element={<AdminsOCRResponce />} />
              <Route path="/scan" element={<Scanner />} />
              <Route path="/idcard" element={<IDCardGenerator />} />
              <Route path="/create-fileType" element={<FilesType />} />
              <Route path="/retentionpolicy" element={<RetentionPolicypage />} />
              <Route path="/archivalDashboard" element={<ArchivalDashboard />} />
              <Route path="/FileCompare" element={<FileComparepage />} />
              <Route path="/ManageUserApplications" element={<ManageUserApplications />} />
              <Route path="/TemplateMasters" element={<TemplateMasters />} />
              <Route path="/Audit-form" element={<AuditForms />} />
              <Route path="/Add-form-reports" element={<AddFormReportss />} />
              <Route path="/Assign-applications" element={<AssignApplications />} />
              <Route path="/Role-rights" element={<RoleRightss />} />
              <Route path="/Waiting-room" element={<WaitingRooms />} />
              <Route path="/newDash" element={<DashboardnEW />} />
              <Route path="/export" element={<ExportDatas />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Suspense>
      </Router>
    </MenuProvider>
  );
}

export default App;
