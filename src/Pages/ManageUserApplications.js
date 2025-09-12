import React,{useState} from 'react'
import Layout from '../Components/Layout';
import ManageUserApplication from '../Data/ManageUserApplication';

function ManageUserApplications() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    return (
        <Layout>
         <ManageUserApplication/>
     </Layout>
    )
}

export default ManageUserApplications