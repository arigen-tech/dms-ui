import React,{useState} from 'react'
import Header from '../Components/Header';
import Layout from '../Components/Layout';
import Import from '../Data/Import';

function Imports() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    return (
        <Layout>
        <Import/>
      </Layout>
    )
}

export default Imports