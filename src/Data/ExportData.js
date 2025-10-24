import React, { useState } from 'react';
import { Download, Database, Folder, Archive, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { EXPORT_API } from '../API/apiConfig';
import Popup from '../Components/Popup';

const ExportData = () => {
  const [exporting, setExporting] = useState('');
  const [status, setStatus] = useState({});
  const [progress, setProgress] = useState(0);
  const [popupMessage, setPopupMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = localStorage.getItem('tokenKey');

  const simulateProgress = () => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + Math.random() * 20;
      });
    }, 300);
    return interval;
  };

  const showPopup = (message, type = 'info') => {
    setPopupMessage({
      message,
      type,
      onClose: () => {
        setPopupMessage(null);
      }
    });
  };

  const handleExport = async (type) => {
    if (!token) {
      showPopup('Authentication token not found. Please login again!', 'error');
      return;
    }

    setExporting(type);
    setStatus({});
    
    const progressInterval = simulateProgress();

    try {
      let endpoint = '';
      let fileName = '';

      switch (type) {
        case 'database':
          endpoint = '/database';
          fileName = 'DMS_Database_Export.zip';
          break;
        case 'files':
          endpoint = '/files';
          fileName = 'DMS_Files_Export.zip';
          break;
        case 'complete':
          endpoint = '/complete';
          fileName = 'DMS_Complete_Export.zip';
          break;
        default:
          return;
      }

      const response = await fetch(`${EXPORT_API}${endpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Export failed: ${response.status} - ${errorData || response.statusText}`);
      }

      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error('Export returned empty file');
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setProgress(100);
      setStatus({
        type: 'success',
        message: `${type.charAt(0).toUpperCase() + type.slice(1)} export completed successfully! File: ${fileName}`
      });
      
      showPopup(`${type.charAt(0).toUpperCase() + type.slice(1)} export successful!`, 'success');

    } catch (error) {
      console.error('Export error:', error);
      setProgress(0);
      setStatus({
        type: 'error',
        message: `Export failed: ${error.message}`
      });
      
      showPopup(`Export failed: ${error.message}`, 'error');
    } finally {
      clearInterval(progressInterval);
      setExporting('');
      
      // Reset progress after delay
      setTimeout(() => setProgress(0), 3000);
    }
  };

  const ExportCard = ({ title, description, icon: Icon, type, buttonText, fileType }) => (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Icon className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 mb-4 text-sm">{description}</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {fileType}
            </span>
            <button
              onClick={() => handleExport(type)}
              disabled={exporting === type || !token}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium text-sm ${
                exporting === type || !token
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white transition-colors'
              }`}
            >
              {exporting === type ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>{buttonText}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-2">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {popupMessage && (
          <Popup
            message={popupMessage.message}
            type={popupMessage.type}
            onClose={popupMessage.onClose}
          />
        )}

        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Database className="w-8 h-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">
              DMS Export System
            </h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Export your Document Management System data and files. Choose between database tables (CSV format) 
            or document files (ZIP with preserved directory structure).
          </p>
        </div>

        {/* Progress Bar */}
        {exporting && (
          <div className="mb-8 bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span className="font-medium">Exporting {exporting}...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Please wait while we prepare your download. This may take a few minutes for large exports.
            </p>
          </div>
        )}

        {/* Status Message */}
        {status.message && (
          <div
            className={`flex items-center space-x-3 p-4 rounded-md mb-6 ${
              status.type === 'error' 
                ? 'bg-red-50 text-red-700 border border-red-200' 
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}
          >
            {status.type === 'error' ? (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="text-sm">{status.message}</span>
          </div>
        )}

        {/* Export Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <ExportCard
            title="Export Database"
            description="Download all database tables as CSV files in a ZIP archive. Includes complete metadata, table structure, and export information."
            icon={Database}
            type="database"
            buttonText="Download CSV"
            fileType="ZIP with CSV files"
          />

          <ExportCard
            title="Export Files"
            description="Download all documents, profiles, archive files, and waiting room files in a ZIP with preserved directory structure. Perfect for migration or backup."
            icon={Folder}
            type="files"
            buttonText="Download ZIP"
            fileType="ZIP with files"
          />
        </div>

        {/* Complete Export */}
        <div className="mb-8">
          <ExportCard
            title="Complete System Export"
            description="Export both database and files together in a comprehensive package. Includes everything needed for full system restoration or migration."
            icon={Archive}
            type="complete"
            buttonText="Download Complete"
            fileType="Complete backup ZIP"
          />
        </div>

        {/* Information Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
            <Info className="w-5 h-5 mr-2" />
            Export Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-2 text-blue-900">📊 Database Export Includes:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>All tables as individual CSV files</li>
                <li>Complete table metadata and structure</li>
                <li>Export timestamp and system information</li>
                <li>All relationships and data intact</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2 text-blue-900">📁 Files Export Includes:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>All documents with original folder structure</li>
                <li>User profile images and files</li>
                <li>Archive documents and versions</li>
                <li>Waiting room and pending files</li>
                <li>Path mapping for automatic restoration</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-100 rounded border border-blue-200">
            <p className="text-sm text-blue-800 font-medium">
              💡 <strong>Tip:</strong> For migration to another system, use the "Complete System Export" 
              and update the paths in PATH_MAPPING.txt before import.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportData;