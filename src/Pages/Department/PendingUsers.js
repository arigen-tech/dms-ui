import React, {useState} from 'react'
import Sidebar from '../../Components/Sidebar'
import Layout from '../../Components/Layout'
import PendingEmployee from '../../Data/Department/PendingEmployee';


function PendingUsers() {

    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    return (
        <Layout>
        <PendingEmployee/>
      </Layout>
    )
}

export default PendingUsers