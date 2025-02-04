import React,{useState} from 'react'
import Sidebar from '../Components/Sidebar';
import Layout from '../Components/Layout';
import ArchiveDownload from '../Data/ArchiveDownload';

function ArchiveDoc() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    return (
        <Layout>
        <ArchiveDownload/>
      </Layout>
    )
}

export default ArchiveDoc