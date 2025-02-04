import React, {useState} from 'react'
import Header from '../Components/Header';
import Layout from '../Components/Layout';
import UserReport from '../Data/UserReport';

function UserReports() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    return (
        <Layout>
        <UserReport/>
     </Layout>
    )
}

export default UserReports