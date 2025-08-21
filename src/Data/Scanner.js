import React, { useState } from 'react';
import axios from 'axios';

const Scanner = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);

  const handleScan = async () => {
    setIsScanning(true);
    setError(null);
    setScanResult(null);
    
    try {
      const response = await axios.post('/api/scanner', {}, {
        responseType: 'blob'
      });
      
      const url = URL.createObjectURL(new Blob([response.data]));
      setScanResult(url);
    } catch (err) {
      if (err.response?.data) {
        setError(err.response.data.message || 'Scan failed');
      } else {
        setError(err.message);
      }
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>Document Scanner</h1>
      
      <button 
        onClick={handleScan}
        disabled={isScanning}
        style={{
          padding: '10px 20px',
          background: isScanning ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        {isScanning ? 'Scanning...' : 'Start Scan'}
      </button>
      
      {error && (
        <div style={{
          marginTop: '20px',
          padding: '10px',
          background: '#ffebee',
          color: '#d32f2f',
          borderRadius: '4px'
        }}>
          {error}
        </div>
      )}
      
      {scanResult && (
        <div style={{ marginTop: '20px' }}>
          <h3>Scan Result</h3>
          <img 
            src={scanResult} 
            alt="Scanned document" 
            style={{ 
              maxWidth: '100%', 
              border: '1px solid #ddd',
              marginTop: '10px'
            }} 
          />
          <a
            href={scanResult}
            download="scan.jpg"
            style={{
              display: 'inline-block',
              marginTop: '10px',
              padding: '10px 15px',
              background: '#28a745',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px'
            }}
          >
            Download Scan
          </a>
        </div>
      )}
    </div>
  );
};

export default Scanner;