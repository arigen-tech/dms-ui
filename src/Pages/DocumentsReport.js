import React, {useState} from 'react'
import Header from '../Components/Header';
import Layout from '../Components/Layout';
import DocumentReport from '../Data/DocumentReport';

function DocumentsReport() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    return (
        <Layout>
         <DocumentReport/>
      </Layout>
    )
}

export default DocumentsReport