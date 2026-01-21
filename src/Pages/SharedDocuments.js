import React,{useState} from 'react'
import Sidebar from '../Components/Sidebar';
import Layout from '../Components/Layout';
import SharedDocs from '../Data/SharedDocs';

function SharedDocuments() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    return (
        <Layout>
       <SharedDocs/>
     </Layout>
    )
}

export default SharedDocuments