import React,{useState} from 'react'
import Header from '../Components/Header';
import Layout from '../Components/Layout'
import LanguageMaster from '../Data/LanguageMaster';

function LanguageMasters() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    return (
        <Layout>
        <LanguageMaster/>
      </Layout>
    )
}

export default LanguageMasters