import React, {useState} from 'react'
import Header from '../../Components/Header';
import Layout from '../../Components/Layout';
import DocumentAuditReport from'../../Data/ReportsD/DocumentAuditReport';
function DocumentsAuditReports() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    return (
        <Layout>
         <DocumentAuditReport/>
      </Layout>
    )
}

export default DocumentsAuditReports