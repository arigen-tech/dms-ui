import React, {useState} from 'react'
import Header from '../../Components/Header';
import Layout from '../../Components/Layout';
import DocumentsDownloadedReports from '../../Data/ReportsD/DocumentsDownloadedReports';

function DocumentsDownloadedReport() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    return (
        <Layout>
         <DocumentsDownloadedReports/>
      </Layout>
    )
}

export default DocumentsDownloadedReport