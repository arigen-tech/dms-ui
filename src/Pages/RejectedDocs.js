import React,{useState} from 'react'
import Sidebar from '../Components/Sidebar';
import Layout from '../Components/Layout';
import RejectedDoc from '../Data/RejectedDoc';

function RejectedDocs() {
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

export default RejectedDocs