import React,{useState} from 'react'
import Layout from '../Components/Layout';
import Sidebar from '../Components/Sidebar';
import SearchByScann from '../Data/SearchByScann';
import AddFormReports from '../Data/AddFormReports';

function AddFormReportss() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    return (
        <Layout>
        <AddFormReports/>
     </Layout>
    )
}

export default AddFormReportss