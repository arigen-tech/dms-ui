import React, { useState } from 'react'
import Sidebar from '../Components/Sidebar';
import Layout from '../Components/Layout'
import AllowFunctionalityByRole from '../Data/AllowFunctionalityByRole'


function AllowFunctionalityByRoles() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    return (
        <Layout>
            <AllowFunctionalityByRole />
        </Layout>
    )
}

export default AllowFunctionalityByRoles;