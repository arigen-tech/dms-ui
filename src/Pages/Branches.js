import React,{useState} from 'react'
import Header from '../Components/Header';
import Layout from '../Components/Layout';
import Branch from '../Data/Branch';

function Branches() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    return (
        <Layout>
        <Branch/>
      </Layout>
    )
}

export default Branches