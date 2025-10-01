import React, {useState} from 'react'
import Layout from '../Components/Layout';
import DashboardsNew from '../Data/DashboardsNew';

function DashboardnEW() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    return (
        <Layout>
         <DashboardsNew/>
      </Layout>
    )
}

export default DashboardnEW