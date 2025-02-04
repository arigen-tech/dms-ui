import React, {useState} from 'react'
import Sidebar from '../../Components/Sidebar'
import Layout from '../../Components/Layout'
import DepartmentEmployee from '../../Data/Department/DepartmentEmployee';


function DepartmentUsers() {

    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    return (
      <Layout>
       <DepartmentEmployee />
    </Layout>
    )
}

export default DepartmentUsers