import React, { useState } from 'react'
import Layout from '../Components/Layout';
import Sidebar from '../Components/Sidebar';
import SearchByScann from '../Data/SearchByScann';
import AuditForm from '../Data/AuditFrom';

function AuditForms() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    return (
        <Layout>
            <AuditForm />   
        </Layout>
    )
}

export default AuditForms