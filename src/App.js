import "./App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HashRouter as Router } from 'react-router-dom';
import Dashboard from "./Pages/Dashboard";
import Inbox from "./Pages/Inbox";
import Users from "./Pages/Users";
import Branches from "./Pages/Branches";
import Departments from "./Pages/Departments";
import Roles from "./Pages/Roles";
import Types from "./Pages/Types";
import Years from "./Pages/Years";
import Categories from "./Pages/Categories";
import Documents from "./Pages/Documents";
import Approves from "./Pages/Approves";
import LoginPage from "./Pages/LoginPage";
import ApprovedDocs from "./Pages/ApprovedDocs";
import RejectedDocs from "./Pages/RejectedDocs";
import ApproveByAdmin from "./Pages/ApproveByAdmin";
import RejectByAdmin from "./Pages/RejectByAdmin";
import UserRoleAssing from "./Pages/UserRoleAssing";
import ChangePasswordPage from "./Pages/ChangePasswordPage";
import PrivateRoute from "./Components/PrivateRoute";
import SearchDoc from "./Pages/SearchDoc"; // Import the Search component
import SearchByScanning from "./Pages/SearchByScanning";
import BranchUsers from "./Pages/Branch/BranchUsers";
import DepartmentUsers from "./Pages/Department/DepartmentUsers"
import BranchDepartments from "./Pages/Branch/BranchDepartments"
import PendingUsers from "./Pages/Department/PendingUsers";
import UserReports from "./Pages/UserReports";
import DocumentsReport from "./Pages/DocumentsReport";  
import ManageUserRoles from "./Pages/ManageUserRoles";
import ArchiveDoc from "./Pages/ArchiveDoc"; 
import ArchivesDoc from "./Pages/ArchivesDoc"; 
import AdminsOCR from "./Pages/AdminsOCR"; 
import BrAdminsOCR from "./Pages/BrAdminsOCR"; 
import DpAdminsOCR from "./Pages/DpAdminsOCR"; 
import AdminsOCRResponce from "./Pages/AdminsOCRResponce"; 
import Scanner from "./Pages/Scanner"; 
import {SYSTEM_ADMIN, BRANCH_ADMIN, DEPARTMENT_ADMIN, USER} from "./API/apiConfig";
import Notification from "./Data/Notification";
import ChatBotPopup from "./Components/ChatBotPopup";
import IDCardGenerator from "./Pages/IDCardGenerator";
import FilesType from "./Pages/FilesTypes";
import RetentionPolicypage from "./Pages/RetentionPolicypage";
import ArchivalDashboard from "./Pages/ArchivalDashboard";
import FileComparepage from "./Pages/FileComparepage";
import ManageUserApplications from "./Pages/ManageUserApplications";
import TemplateMasters from "./Pages/TemplateMasters";
import AddFormReportss from "./Pages/AddFormReportss";
import AssignApplications from "./Pages/AssignApplications";
import RoleRightss from "./Pages/RoleRightss";
import AuditForms from "./Pages/AuditForms";


const protectedRoutes = [
  { path: "/dashboard", element: <Dashboard />, allowedRoles: [SYSTEM_ADMIN, USER, BRANCH_ADMIN,DEPARTMENT_ADMIN] },
  { path: "/inbox", element: <Inbox />, allowedRoles: [SYSTEM_ADMIN, USER, BRANCH_ADMIN,DEPARTMENT_ADMIN] },
  { path: "/users", element: <Users />, allowedRoles: [SYSTEM_ADMIN,USER] },
  { path: "/branchusers", element: <BranchUsers/>, allowedRoles: [BRANCH_ADMIN] },
  { path: "/Departmentusers", element: <DepartmentUsers/>, allowedRoles: [DEPARTMENT_ADMIN] },
  { path: "/create-branch", element: <Branches />, allowedRoles: [SYSTEM_ADMIN] },
  { path: "/create-year", element: <Years />, allowedRoles: [SYSTEM_ADMIN] },
  { path: "/create-department", element: <Departments />, allowedRoles: [SYSTEM_ADMIN] },
  { path: "/create-departments", element: <BranchDepartments />, allowedRoles: [BRANCH_ADMIN] },
  { path: "/create-role", element: <Roles />, allowedRoles: [SYSTEM_ADMIN] },
  { path: "/create-type", element: <Types />, allowedRoles: [SYSTEM_ADMIN] },
  { path: "/create-year", element: <Years />, allowedRoles: [SYSTEM_ADMIN] },
  { path: "/create-category", element: <Categories />, allowedRoles: [SYSTEM_ADMIN] },
  { path: "/approve-documents", element: <Approves />, allowedRoles: [SYSTEM_ADMIN,BRANCH_ADMIN,DEPARTMENT_ADMIN] },
  { path: "/total-approved", element: <ApproveByAdmin />, allowedRoles: [SYSTEM_ADMIN,BRANCH_ADMIN,DEPARTMENT_ADMIN] },
  { path: "/total-rejected", element: <RejectByAdmin />, allowedRoles: [SYSTEM_ADMIN,BRANCH_ADMIN,DEPARTMENT_ADMIN] },
  { path: "/userRoleAssing", element: <UserRoleAssing />, allowedRoles: [SYSTEM_ADMIN,BRANCH_ADMIN] },
  { path: "/pendingRole", element: <PendingUsers />, allowedRoles: [DEPARTMENT_ADMIN] },
  { path: "/all-documents", element: <Documents />, allowedRoles: [USER, ] }, 
  { path: "/approvedDocs", element: <ApprovedDocs />, allowedRoles: [USER, ] },
  { path: "/rejectedDocs", element: <RejectedDocs />, allowedRoles: [USER, ] }, 
  { path: "/userReport", element: <UserReports />, allowedRoles: [SYSTEM_ADMIN,BRANCH_ADMIN,DEPARTMENT_ADMIN] }, 
  { path: "/manageUserRole", element: <ManageUserRoles />, allowedRoles: [SYSTEM_ADMIN,BRANCH_ADMIN,DEPARTMENT_ADMIN] }, 
  { path: "/documentReport", element: <DocumentsReport />, allowedRoles: [USER, SYSTEM_ADMIN,BRANCH_ADMIN,DEPARTMENT_ADMIN] }, 
  { path: "/profile", element: <ChangePasswordPage />, allowedRoles: [USER, SYSTEM_ADMIN, BRANCH_ADMIN,DEPARTMENT_ADMIN] },
  { path: "/search", element: <SearchDoc />, allowedRoles: [USER, SYSTEM_ADMIN, BRANCH_ADMIN,DEPARTMENT_ADMIN] }, 
  { path: "/searchByScan", element: <SearchByScanning />, allowedRoles: [USER, SYSTEM_ADMIN, BRANCH_ADMIN,DEPARTMENT_ADMIN] }, 
  { path: "/archive", element: <ArchiveDoc />, allowedRoles: [ SYSTEM_ADMIN, BRANCH_ADMIN,DEPARTMENT_ADMIN] }, 
  { path: "/archivesuplod", element: <ArchivesDoc />, allowedRoles: [ SYSTEM_ADMIN, BRANCH_ADMIN,DEPARTMENT_ADMIN] }, 
  { path: "/adminOcr", element: <AdminsOCR />, allowedRoles: [SYSTEM_ADMIN] },
  { path: "/brAdminOcr", element: <BrAdminsOCR />, allowedRoles: [BRANCH_ADMIN] }, 
  { path: "/searchOcr", element: <DpAdminsOCR />, allowedRoles: [DEPARTMENT_ADMIN, USER] }, 
  { path: "/adminOCRResponce", element: <AdminsOCRResponce />, allowedRoles: [SYSTEM_ADMIN, BRANCH_ADMIN,DEPARTMENT_ADMIN, USER] }, 
  { path: "/scan", element: <Scanner />, allowedRoles: [SYSTEM_ADMIN, BRANCH_ADMIN,DEPARTMENT_ADMIN, USER] },
  { path: "/idcard", element: <IDCardGenerator />, allowedRoles: [SYSTEM_ADMIN, BRANCH_ADMIN,DEPARTMENT_ADMIN] },
  { path: "/create-fileType", element: <FilesType />, allowedRoles: [SYSTEM_ADMIN] },
  { path: "/retentionpolicy", element: <RetentionPolicypage />, allowedRoles: [SYSTEM_ADMIN, BRANCH_ADMIN] },
  { path: "/archivalDashboard", element: <ArchivalDashboard />, allowedRoles: [SYSTEM_ADMIN] },
  { path: "/FileCompare", element: <FileComparepage />, allowedRoles: [SYSTEM_ADMIN, BRANCH_ADMIN,DEPARTMENT_ADMIN, USER] },
  { path: "/ManageUserApplications", element: <ManageUserApplications />, allowedRoles: [SYSTEM_ADMIN] },
  { path: "/TemplateMasters", element: <TemplateMasters />, allowedRoles: [SYSTEM_ADMIN] },
  { path: "/Audit-form", element: <AuditForms/>, allowedRoles: [SYSTEM_ADMIN] },
  { path: "/Add-form-reports", element: <AddFormReportss/>, allowedRoles: [SYSTEM_ADMIN] },
  { path: "/Assign-applications", element: <AssignApplications/>, allowedRoles: [SYSTEM_ADMIN] },
  { path: "/Role-rights", element: <RoleRightss/>, allowedRoles: [SYSTEM_ADMIN] },







   
];

function App() {
  return (
    <Router>
      <div>
      <ChatBotPopup />
        <Routes>
          {protectedRoutes.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={
                <PrivateRoute allowedRoles={route.allowedRoles}>
                  {route.element}
                </PrivateRoute>
              }
            />
          ))}
          <Route path="/" element={<LoginPage />} />
          <Route path="/notifications" element={<Notification />} />
        </Routes>
        
      </div>
    </Router>
  );
}

export default App;
