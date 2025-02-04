import React,{useState} from 'react'
import Sidebar from '../Components/Sidebar';
import Layout from '../Components/Layout';
import DpAdminOCR from '../Data/DpAdminOCR';

function DpAdminsOCR() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    return (
        <Layout>
        <DpAdminOCR/>
     </Layout>
  )
}

export default DpAdminsOCR