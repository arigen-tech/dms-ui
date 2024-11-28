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
import BranchUsers from "./Pages/Branch/BranchUsers";
import DepartmentUsers from "./Pages/Department/DepartmentUsers"
import BranchDepartments from "./Pages/Branch/BranchDepartments"
import PendingUsers from "./Pages/Department/PendingUsers";
import UserReports from "./Pages/UserReports";
import DocumentsReport from "./Pages/DocumentsReport";  
// Define the roles
const ADMIN = "ADMIN";
const USER = "USER";
const BRANCH_ADMIN = "BRANCH ADMIN"; // New role
const DEPARTMENT_ADMIN = "DEPARTMENT ADMIN";

const protectedRoutes = [
  { path: "/dashboard", element: <Dashboard />, allowedRoles: [ADMIN, USER, BRANCH_ADMIN,DEPARTMENT_ADMIN] },
  { path: "/inbox", element: <Inbox />, allowedRoles: [ADMIN, USER, BRANCH_ADMIN,DEPARTMENT_ADMIN] },
  { path: "/users", element: <Users />, allowedRoles: [ADMIN,USER] },
  { path: "/branchusers", element: <BranchUsers/>, allowedRoles: [BRANCH_ADMIN] },
  { path: "/Departmentusers", element: <DepartmentUsers/>, allowedRoles: [DEPARTMENT_ADMIN] },
  { path: "/create-branch", element: <Branches />, allowedRoles: [ADMIN] },
  { path: "/create-department", element: <Departments />, allowedRoles: [ADMIN] },
  { path: "/create-departments", element: <BranchDepartments />, allowedRoles: [BRANCH_ADMIN] },
  { path: "/create-role", element: <Roles />, allowedRoles: [ADMIN] },
  { path: "/create-type", element: <Types />, allowedRoles: [ADMIN] },
  { path: "/create-year", element: <Years />, allowedRoles: [ADMIN] },
  { path: "/create-category", element: <Categories />, allowedRoles: [ADMIN] },
  { path: "/approve-documents", element: <Approves />, allowedRoles: [ADMIN,BRANCH_ADMIN,DEPARTMENT_ADMIN] },
  { path: "/approve-by-admin", element: <ApproveByAdmin />, allowedRoles: [ADMIN,BRANCH_ADMIN,DEPARTMENT_ADMIN] },
  { path: "/reject-by-admin", element: <RejectByAdmin />, allowedRoles: [ADMIN,BRANCH_ADMIN,DEPARTMENT_ADMIN] },
  { path: "/userRoleAssing", element: <UserRoleAssing />, allowedRoles: [ADMIN,BRANCH_ADMIN] },
  { path: "/pendingRole", element: <PendingUsers />, allowedRoles: [DEPARTMENT_ADMIN] },
  { path: "/all-documents", element: <Documents />, allowedRoles: [USER, ] }, 
  { path: "/approvedDocs", element: <ApprovedDocs />, allowedRoles: [USER, ] },
  { path: "/rejectedDocs", element: <RejectedDocs />, allowedRoles: [USER, ] }, 
  { path: "/userReport", element: <UserReports />, allowedRoles: [ADMIN,BRANCH_ADMIN,DEPARTMENT_ADMIN] }, 
  { path: "/documentReport", element: <DocumentsReport />, allowedRoles: [USER, ADMIN,BRANCH_ADMIN,DEPARTMENT_ADMIN] }, 
  { path: "/change-password", element: <ChangePasswordPage />, allowedRoles: [USER, ADMIN, BRANCH_ADMIN,DEPARTMENT_ADMIN] }, // Allow BRANCH_ADMIN access
  { path: "/search", element: <SearchDoc />, allowedRoles: [USER, ADMIN, BRANCH_ADMIN,DEPARTMENT_ADMIN] }, // Add the search route
];

function App() {
  return (
    <Router>
      <div>
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
        </Routes>
      </div>
    </Router>
  );
}

export default App;
