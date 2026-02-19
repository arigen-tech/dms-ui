import React, {useState} from 'react'
import Header from '../../Components/Header';
import Layout from '../../Components/Layout';
import DocumentTrashReport from '../../Data/ReportsD/DocumentTrashReport';

function DocumentsTrashedReports() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    return (
        <Layout>
         <DocumentTrashReport/>
      </Layout>
    )
}

export default DocumentsTrashedReports