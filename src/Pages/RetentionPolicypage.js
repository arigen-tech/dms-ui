import React,{useState} from 'react'
import Sidebar from '../Components/Sidebar';
import Layout from '../Components/Layout';
import RetentionPolicy from '../Data/RetentionPolicy';

function ArchiveDoc() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    return (
        <Layout>
        <RetentionPolicy/>
      </Layout>
    )
}

export default ArchiveDoc