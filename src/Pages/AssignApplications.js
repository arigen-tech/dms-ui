import React,{useState} from 'react'
import Layout from '../Components/Layout';
import Sidebar from '../Components/Sidebar';
import SearchByScann from '../Data/SearchByScann';
import AssignApplication from '../Data/AssignApplication';

function AssignApplications() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    return (
        <Layout>
        <AssignApplication/>
     </Layout>
    )
}

export default AssignApplications;