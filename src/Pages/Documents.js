import React,{useState} from 'react'
import Sidebar from '../Components/Sidebar';
import Layout from '../Components/Layout';
import Document from '../Data/Document';

function Documents() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    return (
        <Layout>
        <Document/>
      </Layout>
    )
}

export default Documents