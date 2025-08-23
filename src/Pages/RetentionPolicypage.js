import React,{useState} from 'react'
import Layout from '../Components/Layout';
import NewRetentionPolicy from '../Data/NewRetaintionPolicy';

function ArchiveDoc() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    return (
        <Layout>
        <NewRetentionPolicy/>
      </Layout>
    )
}

export default ArchiveDoc