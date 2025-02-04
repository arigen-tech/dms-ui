import React,{useState} from 'react'
import Sidebar from '../Components/Sidebar';
import Layout from '../Components/Layout';
import ArchiveUpload from '../Data/ArchiveUpload';

function ArchivesDoc() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    return (
        <Layout>
        <ArchiveUpload/>
      </Layout>
    )
}

export default ArchivesDoc