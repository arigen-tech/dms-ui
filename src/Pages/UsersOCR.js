import React,{useState} from 'react'
import Sidebar from '../Components/Sidebar';
import Layout from '../Components/Layout';
import UserOCR from '../Data/UserOCR';

function UsersOCR() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    return (
        <Layout>
        <UserOCR/>
     </Layout>
  )
}

export default UsersOCR