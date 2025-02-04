import React,{useState} from 'react'
import Sidebar from '../Components/Sidebar';
import Layout from '../Components/Layout'
import AdminOCR from '../Data/AdminOCR';

function AdminsOCR() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    return (
        <Layout>
        <AdminOCR/>
      </Layout>
  )
}

export default AdminsOCR