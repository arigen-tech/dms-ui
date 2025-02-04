import React, {useState} from 'react'
import Sidebar from '../../Components/Sidebar';
import Layout from '../../Components/Layout';
import BranchDepartment from '../../Data/Branch/BranchDepartment';

function BranchDepartments() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    return (
        <Layout>
        <BranchDepartment/>
      </Layout>
    )
}

export default BranchDepartments