import React,{useState} from 'react'
import Header from '../Components/Header';
import Layout from '../Components/Layout';
import FilesType from '../Data/FilesType';

function FilesTypes() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    return (
        <Layout>
        <FilesType/>
      </Layout>
    )
}

export default FilesTypes