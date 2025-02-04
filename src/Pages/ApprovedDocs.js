import React,{useState, useEffect} from 'react'
import Sidebar from '../Components/Sidebar';
import Layout from '../Components/Layout';
import ApprovedDoc from '../Data/ApprovedDoc';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API_HOST } from '../API/apiConfig';

function ApprovedDocs() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [searchParams] = useSearchParams();
    const [document, setDocument] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    const documentId = searchParams.get('documentId');
    const tokenKey = localStorage.getItem('tokenKey');

    const fetchSpecificDocument = async (id) => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_HOST}/documents/${id}`, {
                headers: { Authorization: `Bearer ${tokenKey}` }
            });
            setDocument(response.data.response);
            setError(null);
        } catch (error) {
            console.error('Error fetching document:', error);
            setError('Failed to load document');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (documentId) {
            fetchSpecificDocument(documentId);
        }
    }, [documentId]);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    return (
        <Layout>
        <ApprovedDoc/>
      </Layout>
  )
}

export default ApprovedDocs