import React, { useState } from "react";
import Sidebar from "../Components/Sidebar";
import Header from "../Components/Header";
import Footer from "../Components/Footer";

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const [roleChanged, setRoleChanged] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const triggerMenuRefresh = () => {
    setRoleChanged(prev => !prev);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-100">
      {/* Sidebar Container */}
      <div
        className={`fixed md:relative z-30 h-full transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-full overflow-y-auto">
          {sidebarOpen && <Sidebar roleChanged={roleChanged} />}
        </div>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={toggleSidebar}
        ></div>
      )}

      {/* Main Content Container */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <Header toggleSidebar={toggleSidebar} triggerMenuRefresh={triggerMenuRefresh} />

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="min-h-full flex flex-col">
            <main className="p-4 flex-1">
              {children}
            </main>
            <Footer />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Layout;
