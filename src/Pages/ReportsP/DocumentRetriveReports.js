import React, {useState} from 'react'
import Header from '../../Components/Header';
import Layout from '../../Components/Layout';
import DocumentRetriveReport from '../../Data/ReportsD/DocumentRetriveReport';

function DocumentRetriveReports() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    return (
        <Layout>
         <DocumentRetriveReport/>
      </Layout>
    )
}

export default DocumentRetriveReports