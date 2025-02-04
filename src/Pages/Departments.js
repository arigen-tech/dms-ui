import React, {useState} from 'react'
import Sidebar from '../Components/Sidebar';
import Layout from '../Components/Layout';
import Department from '../Data/Department';

function Departments() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    return (
        <Layout>
        <Department/>
      </Layout>
    )
}

export default Departments