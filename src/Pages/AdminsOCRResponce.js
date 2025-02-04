import React,{useState} from 'react'
import Sidebar from '../Components/Sidebar';
import Layout from '../Components/Layout'
// import AdminOCRResponse from '../Data/AdminOCRRespons';
import AdminOCRResponce from '../Data/AdminOCRResponce';

function AdminsOCRResponce() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    return (
        <Layout>
        <AdminOCRResponce/>
      </Layout>
  )
}

export default AdminsOCRResponce