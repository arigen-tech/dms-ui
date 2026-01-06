import React from "react";
import { useNavigate } from "react-router-dom";

const PageNotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-blue-800 text-white px-4">
      {/* Big 404 */}
      <h1 className="text-9xl font-extrabold text-red-500 drop-shadow-lg">404</h1>

      {/* Message */}
      <p className="mt-6 text-2xl font-semibold">Oops! Page Not Found</p>
      <p className="mt-2 text-gray-300 text-center max-w-md">
        The page you are looking for doesn’t exist or has been moved.  
        Try going back to the dashboard.
      </p>

      {/* Button */}
      <button
        onClick={() => navigate("/newDash")}
        className="mt-6 rounded-lg bg-blue-600 px-6 py-2 font-medium text-white shadow-lg hover:bg-blue-700 transition"
      >
        Go Back To Dashboard
      </button>

      {/* Decorative Bottom Line */}
      <div className="mt-6 w-32 h-1 rounded-full bg-blue-400"></div>
    </div>
  );
};

export default PageNotFound;
