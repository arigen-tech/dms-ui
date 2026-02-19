import React, {useState} from 'react'
import Header from '../../Components/Header';
import Layout from '../../Components/Layout';
import DocumentsUploadReports from '../../Data/ReportsD/DocumentsUploadReports';

function DocumentsUploadReport() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    return (
        <Layout>
         <DocumentsUploadReports/>
      </Layout>
    )
}

export default DocumentsUploadReport