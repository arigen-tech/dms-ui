import React, {useState} from 'react'
import Sidebar from '../../Components/Sidebar'
import Layout from '../../Components/Layout'
import BranchEmployee from '../../Data/Branch/BranchEmployee';


function BranchUsers() {

    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    return (
      <Layout>
      <BranchEmployee />
    </Layout>
    )
}

export default BranchUsers