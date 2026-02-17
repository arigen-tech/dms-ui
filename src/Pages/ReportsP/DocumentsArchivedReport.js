import React, {useState} from 'react'
import Header from '../../Components/Header';
import Layout from '../../Components/Layout';
import DocumentsArchivedReports from '../../Data/ReportsD/DocumentsArchivedReports';

function DocumentsArchivedReport() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    return (
        <Layout>
         <DocumentsArchivedReports/>
      </Layout>
    )
}

export default DocumentsArchivedReport