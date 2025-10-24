import React,{useState} from 'react'
import Header from '../Components/Header';
import Layout from '../Components/Layout';
import ExportData from '../Data/ExportData';

function ExportDatas() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    return (
        <Layout>
        <ExportData/>
      </Layout>
    )
}

export default ExportDatas