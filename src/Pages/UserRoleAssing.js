import React, {useState} from 'react'
import Sidebar from '../Components/Sidebar'
import Layout from '../Components/Layout';
import EmployeeRole from '../Data/EmployeeRole'



function UserRoleAssing() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    return (
        <Layout>
        <EmployeeRole/>
     </Layout>
    )
}

export default UserRoleAssing