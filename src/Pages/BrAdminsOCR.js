import React,{useState} from 'react'
import Sidebar from '../Components/Sidebar';
import Layout from '../Components/Layout';
import BrAdminOCR from '../Data/BrAdminOCR';

function BrAdminsOCR() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    return (
        <Layout>
        <BrAdminOCR/>
      </Layout>
  )
}

export default BrAdminsOCR