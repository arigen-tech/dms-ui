import React,{useState} from 'react'
import Sidebar from '../Components/Sidebar';
import Layout from '../Components/Layout';
import ApprovedDoc from '../Data/ApprovedDoc';
import WaitingRoom from '../Data/WaitingRoom';

function WaitingRooms() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    return (
        <Layout>
        <WaitingRoom/>
      </Layout>
  )
}

export default WaitingRooms