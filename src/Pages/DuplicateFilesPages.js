import React,{useState} from 'react'
import Header from '../Components/Header';
import Layout from '../Components/Layout';
import Branch from '../Data/Branch';
import DuplicateFilesPage from '../Data/DuplicateFilesPage';

function DuplicateFilesPages() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    return (
        <Layout>
        <DuplicateFilesPage/>
      </Layout>
    )
}

export default DuplicateFilesPages