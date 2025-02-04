import React, { useState } from 'react';
import Sidebar from '../Components/Sidebar';
import Layout from '../Components/Layout';
import Employee from '../Data/Employee';

function Users() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <Layout>
    <Employee />
 </Layout>
  );
}

export default Users;
