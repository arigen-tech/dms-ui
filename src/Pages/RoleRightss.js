import React,{useState} from 'react'
import Sidebar from '../Components/Sidebar';
import Layout from '../Components/Layout';
import Role from '../Data/Role';
import Rolesrights from '../Data/RoleRights';

function RoleRightss() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    return (
        <Layout>
         <Rolesrights/>
      </Layout>
    )
}

export default RoleRightss;