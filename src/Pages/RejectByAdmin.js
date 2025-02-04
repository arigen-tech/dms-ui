import React,{useState} from 'react'
import Sidebar from '../Components/Sidebar';
import Layout from '../Components/Layout';
import RejectedDoc from '../Data/RejectedDoc';

function RejectByAdmin() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    return (
        <Layout>
        <RejectedDoc/>
     </Layout>
  )
}

export default RejectByAdmin