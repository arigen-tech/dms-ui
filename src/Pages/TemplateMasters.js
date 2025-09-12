import React,{useState} from 'react'
import Sidebar from '../Components/Sidebar';
import Layout from '../Components/Layout';
import SearchByScann from '../Data/SearchByScann';
import Templatemaster from '../Data/TemplateMaster';
import TemplateMaster from '../Data/TemplateMaster';

function TemplateMasters() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    return (
        <Layout>
        <TemplateMaster/>
     </Layout>
    )
}

export default TemplateMasters