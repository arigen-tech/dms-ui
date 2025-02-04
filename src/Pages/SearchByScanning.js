import React,{useState} from 'react'
import Sidebar from '../Components/Sidebar';
import Layout from '../Components/Layout';
import SearchByScann from '../Data/SearchByScann';

function SearchByScanning() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    return (
        <Layout>
        <SearchByScann/>
     </Layout>
    )
}

export default SearchByScanning