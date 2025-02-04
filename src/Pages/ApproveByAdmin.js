import React,{useState} from 'react'
import Sidebar from '../Components/Sidebar';
import Layout from '../Components/Layout';
import ApprovedDoc from '../Data/ApprovedDoc';

function ApproveByAdmin() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    return (
        <Layout>
        <ApprovedDoc/>
      </Layout>
  )
}

export default ApproveByAdmin