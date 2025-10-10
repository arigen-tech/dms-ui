import React from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import PageNotFound from "./../Pages/PageNotFound";


// ✅ Define all valid protected routes in your app
const validRoutes = [
  "/dashboard",
  "/inbox",
  "/users",
  "/branchusers",
  "/Departmentusers",
  "/create-branch",
  "/create-year",
  "/create-department",
  "/create-departments",
  "/create-role",
  "/create-type",
  "/create-category",
  "/approve-documents",
  "/total-approved",
  "/total-rejected",
  "/userRoleAssing",
  "/pendingRole",
  "/all-documents",
  "/approvedDocs",
  "/rejectedDocs",
  "/userReport",
  "/manageUserRole",
  "/documentReport",
  "/profile",
  "/search",
  "/searchByScan",
  "/archive",
  "/archivesuplod",
  "/adminOcr",
  "/brAdminOcr",
  "/searchOcr",
  "/adminOCRResponce",
  "/scan",
  "/idcard",
  "/create-fileType",
  "/retentionpolicy",
  "/archivalDashboard",
  "/FileCompare",
  "/ManageUserApplications",
  "/TemplateMasters",
  "/Audit-form",
  "/Add-form-reports",
  "/Assign-applications",
  "/Role-rights",
  "/Waiting-room",
  "/newDash",
];

const NotAuthorized = () => {
  const navigate = useNavigate();


  return (
    <div className="flex flex-col items-center justify-center h-screen bg-blue-800  text-white px-4">
      {/* Big 403 */}
      <h1 className="text-9xl font-extrabold text-red-500 drop-shadow-lg">403</h1>

      {/* Message */}
      <p className="mt-6 text-2xl font-semibold">Access Denied</p>
      <p className="mt-2 text-gray-300 text-center max-w-md">
        You don’t have permission to view this page.
        Please contact your administrator or return to the dashboard.
      </p>

      {/* Button */}
      <button
        onClick={() => navigate("/dashboard")}
        className="mt-6 rounded-lg bg-blue-600 px-6 py-2 font-medium text-white shadow-lg hover:bg-blue-700 transition"
      >
        Go Back To Dashboard
      </button>

      {/* Decorative Bottom Line */}
      <div className="mt-6 w-32 h-1 rounded-full bg-blue-400"></div>
    </div>
  );
};

// ✅ Main ProtectedRoute component
const ProtectedRoute = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const currToken = localStorage.getItem("tokenKey");
  
  function parseJwt(token) {
    if (!token) return null;
    try {
      const base64Payload = token.split('.')[1];
      const payload = atob(base64Payload); // decode Base64
      return JSON.parse(payload);
    } catch (e) {
      return null;
    }
  }

  // Check if token is expired
  function isTokenValid(token) {
    const payload = parseJwt(token);
    if (!payload) return false;
    const now = Date.now() / 1000; // current time in seconds
    return payload.exp && payload.exp > now;
  }

  const allowedUrls = JSON.parse(
    sessionStorage.getItem("allowedUrls") || "[]"
  );

  if (!isTokenValid(currToken)) {
    return <Navigate to="/" replace />;
  }

  if(localStorage.getItem("tokenKey") === null){
    return <Navigate to="/" replace />;
  }

  // Route not part of validRoutes → show 404
  if (!validRoutes.includes(currentPath)) {
    return <PageNotFound />;
  }

  // Dashboard OR user has explicit permission
  if (currentPath === "/dashboard" || allowedUrls.includes(currentPath)) {
    return <Outlet />;
  }

  // Everything else → Not Authorized
  return <NotAuthorized />;
};

export default ProtectedRoute;
