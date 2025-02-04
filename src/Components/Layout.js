import React, { useState } from "react";
import Sidebar from "../Components/Sidebar";
import Header from "../Components/Header";

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex flex-row bg-neutral-100 h-screen w-screen overflow-hidden">
      {/* Sidebar with transition */}
      <div
        className={`transform transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } fixed md:relative z-30`}
      >
        {sidebarOpen && <Sidebar />}
      </div>

      {/* Overlay for mobile view when sidebar is open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={toggleSidebar}
        ></div>
      )}

      {/* Main Content */}
      <div className="flex flex-col flex-1 w-full">
        {/* Header */}
        <div className="w-full z-10">
          <Header toggleSidebar={toggleSidebar} />
        </div>

        {/* Children (Main Content) */}
        <div className="flex-1 p-4 min-h-0 overflow-auto md:mt-0">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;