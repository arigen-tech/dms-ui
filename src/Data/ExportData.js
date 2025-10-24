import React, { useState, useEffect } from 'react';
import { Download, Database, Folder, Archive, AlertCircle, CheckCircle, Info, Calendar, Filter, X, Clock, Ban, HardDrive, FileText, Shield, CloudDownload, Server, FileArchive, CheckCircle2 } from 'lucide-react';
import { EXPORT_API } from '../API/apiConfig';
import Popup from '../Components/Popup';

const ExportData = () => {
  const [exporting, setExporting] = useState('');
  const [status, setStatus] = useState({});
  const [progress, setProgress] = useState(0);
  const [popupMessage, setPopupMessage] = useState(null);
  const [dateRange, setDateRange] = useState({
    fromDate: '',
    toDate: ''
  });
  const [isFilterActive, setIsFilterActive] = useState(false);
  const [exportHistory, setExportHistory] = useState([]);
  const [blockedExports, setBlockedExports] = useState(new Set());
  const [activeTab, setActiveTab] = useState('quick');
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successData, setSuccessData] = useState({});
  const [progressInterval, setProgressInterval] = useState(null);
  const [showDuplicatePopup, setShowDuplicatePopup] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [pendingExport, setPendingExport] = useState(null);
  const [backendExportHistory, setBackendExportHistory] = useState([]);

  const token = localStorage.getItem('tokenKey');

  // Load export history from localStorage AND backend on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('exportHistory');
    if (savedHistory) {
      const history = JSON.parse(savedHistory).filter(item => item.status === 'completed' || item.status === 'failed');
      setExportHistory(history);
    }
    
    // Load backend export history
    loadBackendExportHistory();
  }, []);

  // Load backend export history
  const loadBackendExportHistory = async () => {
    try {
      const response = await fetch(`${EXPORT_API}/history`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const history = await response.json();
        setBackendExportHistory(history);
      }
    } catch (error) {
      console.error('Failed to load backend export history:', error);
    }
  };

  // Save export history to localStorage whenever it changes
  useEffect(() => {
    const completedHistory = exportHistory.filter(item => item.status === 'completed' || item.status === 'failed');
    localStorage.setItem('exportHistory', JSON.stringify(completedHistory));
  }, [exportHistory]);

  // Check for duplicate backups when date range changes - TYPE SPECIFIC
  useEffect(() => {
    checkForDuplicateBackups();
  }, [dateRange, exportHistory, backendExportHistory]);

  const checkForDuplicateBackups = () => {
    if (!dateRange.fromDate || !dateRange.toDate) {
      setDuplicateWarning(null);
      return;
    }

    const fromDate = new Date(dateRange.fromDate);
    const toDate = new Date(dateRange.toDate);

    // Check duplicates for each type separately
    const databaseDuplicates = checkDuplicatesForType('database', fromDate, toDate);
    const filesDuplicates = checkDuplicatesForType('files', fromDate, toDate);
    const completeDuplicates = checkDuplicatesForType('complete', fromDate, toDate);

    // Set duplicate warnings for each type
    setDuplicateWarning({
      database: databaseDuplicates.length > 0 ? databaseDuplicates[0] : null,
      files: filesDuplicates.length > 0 ? filesDuplicates[0] : null,
      complete: completeDuplicates.length > 0 ? completeDuplicates[0] : null
    });
  };

  const checkDuplicatesForType = (type, fromDate, toDate) => {
    // Combine frontend and backend history for duplicate checking - TYPE SPECIFIC
    const allHistory = [
      ...exportHistory.filter(item => item.status === 'completed' && item.type === type),
      ...backendExportHistory.filter(item => item.type === type)
    ];

    // Check if this date range is COMPLETELY within any existing backup range of the same type
    return allHistory.filter(exportItem => {
      const existingFrom = exportItem.fromDate ? new Date(exportItem.fromDate) : null;
      const existingTo = exportItem.toDate ? new Date(exportItem.toDate) : null;

      // If either date is missing, skip comparison
      if (!existingFrom || !existingTo) return false;

      // Check if the new range is COMPLETELY within existing range
      const completelyWithin = fromDate >= existingFrom && toDate <= existingTo;
      
      // Check if the new range is exactly the same as existing range
      const exactlySame = fromDate.getTime() === existingFrom.getTime() && toDate.getTime() === existingTo.getTime();
      
      return completelyWithin || exactlySame;
    });
  };

  const simulateProgress = () => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 85) {
          clearInterval(interval);
          return 85;
        }
        return prev + Math.random() * 8;
      });
    }, 300);
    setProgressInterval(interval);
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

  const showSuccessPopupMessage = (data) => {
    setSuccessData(data);
    setShowSuccessPopup(true);
    setTimeout(() => {
      setShowSuccessPopup(false);
    }, 5000);
  };

  const showDuplicateBlockPopup = (type) => {
    setPendingExport(type);
    
    // Get the specific duplicate warning for this type
    const duplicateForType = duplicateWarning && duplicateWarning[type];
    if (duplicateForType) {
      setShowDuplicatePopup({
        type: type,
        existingFrom: formatDateDisplay(duplicateForType.fromDate),
        existingTo: formatDateDisplay(duplicateForType.toDate)
      });
    }
  };

  const handleDuplicateClose = () => {
    setShowDuplicatePopup(false);
    setPendingExport(null);
  };

  const addToExportHistory = (type, fromDate, toDate, status, fileName, exportId, fileSize) => {
    const newExport = {
      id: exportId || Date.now().toString(),
      type,
      fromDate,
      toDate,
      status,
      fileName,
      fileSize,
      timestamp: new Date().toISOString(),
    };
    
    setExportHistory(prev => {
      if (status === 'processing') {
        return prev; // Don't add processing items to history
      }
      
      const filteredHistory = prev.filter(item => item.id !== exportId);
      return [newExport, ...filteredHistory.slice(0, 9)];
    });
  };

  const handleDateChange = (field, value) => {
    const newDateRange = {
      ...dateRange,
      [field]: value
    };
    setDateRange(newDateRange);
    
    const hasDates = newDateRange.fromDate || newDateRange.toDate;
    setIsFilterActive(hasDates);
  };

  const clearDateRange = () => {
    setDateRange({ fromDate: '', toDate: '' });
    setIsFilterActive(false);
    setDuplicateWarning(null);
  };

  const validateDateRange = (forExport = false) => {
    const errors = [];

    if (forExport && activeTab === 'advanced') {
      if (!dateRange.fromDate || !dateRange.toDate) {
        errors.push('Please select both start date and end date');
      }
    }

    if (dateRange.fromDate && dateRange.toDate) {
      const fromDate = new Date(dateRange.fromDate);
      const toDate = new Date(dateRange.toDate);
      
      if (fromDate > toDate) {
        errors.push('Start date cannot be after end date');
      }

      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      if (fromDate < oneYearAgo) {
        errors.push('Start date cannot be more than 1 year ago');
      }
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (dateRange.fromDate) {
      const fromDate = new Date(dateRange.fromDate);
      if (fromDate > today) {
        errors.push('Start date cannot be in the future');
      }
    }

    if (dateRange.toDate) {
      const toDate = new Date(dateRange.toDate);
      if (toDate > today) {
        errors.push('End date cannot be in the future');
      }
    }

    return errors;
  };

  const isExportBlocked = (type) => {
    const key = `${type}_${dateRange.fromDate}_${dateRange.toDate}`;
    return blockedExports.has(key);
  };

  const blockExport = (type) => {
    const key = `${type}_${dateRange.fromDate}_${dateRange.toDate}`;
    setBlockedExports(prev => new Set([...prev, key]));
    
    setTimeout(() => {
      setBlockedExports(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    }, 30000);
  };

  const performExport = async (type) => {
    // BLOCK THE EXPORT if it's a duplicate range for this specific type
    if (duplicateWarning && duplicateWarning[type] && activeTab === 'advanced') {
      showDuplicateBlockPopup(type);
      return; // IMPORTANT: Return early to prevent export
    }

    if (!token) {
      showPopup('Authentication required. Please login again.', 'error');
      return;
    }

    if (isExportBlocked(type)) {
      showPopup('Export operation already in progress. Please wait for completion.', 'warning');
      return;
    }

    const validationErrors = validateDateRange(true);
    if (validationErrors.length > 0) {
      showPopup(validationErrors.join(', '), 'error');
      return;
    }

    blockExport(type);

    const exportId = `export_${Date.now()}`;
    const exportTypeName = getExportTypeDisplayName(type);
    
    setExporting(type);
    setStatus({});

    const interval = simulateProgress();

    try {
      let endpoint = '';

      switch (type) {
        case 'database':
          endpoint = '/database';
          break;
        case 'files':
          endpoint = '/files';
          break;
        case 'complete':
          endpoint = '/complete';
          break;
        default:
          return;
      }

      const params = new URLSearchParams();
      if (dateRange.fromDate) params.append('fromDate', dateRange.fromDate);
      if (dateRange.toDate) params.append('toDate', dateRange.toDate);

      if (activeTab === 'quick' && !dateRange.fromDate && !dateRange.toDate) {
        const today = new Date().toISOString().split('T')[0];
        params.append('fromDate', today);
        params.append('toDate', today);
      }

      const url = `${EXPORT_API}${endpoint}${params.toString() ? `?${params.toString()}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 429) {
        const errorText = await response.text();
        throw new Error(`Export operation blocked: ${errorText}`);
      }

      if (response.status === 400) {
        const errorData = await response.text();
        // Check if it's a duplicate error
        if (errorData.includes('Duplicate backup detected') || errorData.includes('completely within existing backup')) {
          throw new Error(`DUPLICATE_BACKUP: ${errorData}`);
        }
        throw new Error(`Export failed: ${errorData}`);
      }

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Export failed with status ${response.status}: ${errorData || response.statusText}`);
      }

      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error('Export operation returned empty file');
      }

      // Complete progress to 100%
      setProgress(100);
      clearInterval(interval);

      const contentDisposition = response.headers.get('Content-Disposition');
      const exportIdHeader = response.headers.get('X-Export-ID');
      
      // Generate filename with both from and to dates
      let fileName = generateFileName(type, dateRange.fromDate, dateRange.toDate);
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          fileName = filenameMatch[1];
        }
      }

      const urlObject = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = urlObject;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(urlObject);

      const dateRangeText = isFilterActive || activeTab === 'advanced'
        ? ` for period ${formatDateDisplay(dateRange.fromDate)} to ${formatDateDisplay(dateRange.toDate)}`
        : ' (Today\'s Data)';

      const successData = {
        type: exportTypeName,
        fileName,
        fileSize: formatFileSize(blob.size),
        dateRange: dateRangeText,
        timestamp: new Date().toLocaleTimeString()
      };

      setStatus({
        type: 'success',
        message: `${exportTypeName} backup completed successfully`
      });

      // Only add to history when completed
      addToExportHistory(type, dateRange.fromDate, dateRange.toDate, 'completed', fileName, exportIdHeader || exportId, blob.size);
      
      // Reload backend history to include this new export
      loadBackendExportHistory();
      
      showSuccessPopupMessage(successData);

    } catch (error) {
      setProgress(0);
      clearInterval(interval);
      
      // Handle duplicate backup error from backend
      if (error.message.includes('DUPLICATE_BACKUP')) {
        const errorMessage = error.message.replace('DUPLICATE_BACKUP: ', '');
        showDuplicateBlockPopup(type);
      } else {
        const errorMessage = `Backup operation failed: ${error.message}`;
        
        setStatus({
          type: 'error',
          message: errorMessage
        });

        // Add failed export to history
        addToExportHistory(type, dateRange.fromDate, dateRange.toDate, 'failed', null, exportId);
        showPopup(errorMessage, 'error');
      }
    } finally {
      setTimeout(() => {
        setExporting('');
        setProgress(0);
        // Remove from blocked exports
        const key = `${type}_${dateRange.fromDate}_${dateRange.toDate}`;
        setBlockedExports(prev => {
          const newSet = new Set(prev);
          newSet.delete(key);
          return newSet;
        });
      }, 2000);
    }
  };

  const handleExport = async (type) => {
    // Check for duplicate backup warning - if completely within existing range for this type, BLOCK IT
    if (duplicateWarning && duplicateWarning[type] && activeTab === 'advanced') {
      showDuplicateBlockPopup(type);
      return; // BLOCK THE EXPORT - don't proceed to performExport
    }

    performExport(type);
  };

  const generateFileName = (type, fromDate, toDate) => {
    const exportTypeName = getExportTypeDisplayName(type).replace(/\s+/g, '_');
    
    if (activeTab === 'quick' || !fromDate || !toDate) {
      const today = new Date().toISOString().split('T')[0];
      return `DMS_${exportTypeName}_Backup_${today}.zip`;
    }
    
    // Format dates for filename (YYYY-MM-DD format)
    const fromFormatted = fromDate.replace(/-/g, '');
    const toFormatted = toDate.replace(/-/g, '');
    
    return `DMS_${exportTypeName}_Backup_${fromFormatted}_to_${toFormatted}.zip`;
  };

  const getExportTypeDisplayName = (type) => {
    switch (type) {
      case 'database': return 'Database';
      case 'files': return 'Documents';
      case 'complete': return 'Full System';
      default: return type;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const ExportActionCard = ({ type, icon: Icon, title, description, variant = 'primary' }) => {
    const isBlocked = isExportBlocked(type);
    const isDisabled = exporting === type || !token || isBlocked;
    const isDateRangeInvalid = activeTab === 'advanced' && (!dateRange.fromDate || !dateRange.toDate);
    const isDuplicateBlocked = duplicateWarning && duplicateWarning[type] && activeTab === 'advanced';

    const variantStyles = {
      primary: {
        bg: 'bg-blue-500',
        hover: 'hover:bg-blue-600',
        light: 'bg-blue-50',
        text: 'text-blue-600',
        border: 'border-blue-200'
      },
      success: {
        bg: 'bg-emerald-500',
        hover: 'hover:bg-emerald-600',
        light: 'bg-emerald-50',
        text: 'text-emerald-600',
        border: 'border-emerald-200'
      },
      warning: {
        bg: 'bg-amber-500',
        hover: 'hover:bg-amber-600',
        light: 'bg-amber-50',
        text: 'text-amber-600',
        border: 'border-amber-200'
      }
    };

    const style = variantStyles[variant];

    return (
      <div className={`bg-white rounded-xl border ${
        isDateRangeInvalid || isDuplicateBlocked ? 'border-gray-200 opacity-75' : style.border
      } p-6 hover:shadow-lg transition-all duration-300 group flex flex-col h-full`}>
        <div className="flex items-start space-x-4 mb-4">
          <div className={`p-3 rounded-xl ${
            isDuplicateBlocked ? 'bg-gray-100' : style.light
          } group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
            <Icon className={`w-6 h-6 ${
              isDuplicateBlocked ? 'text-gray-400' : style.text
            }`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
            {isDateRangeInvalid && (
              <p className="text-xs text-gray-500 mt-2 italic">
                Select start and end dates to enable
              </p>
            )}
            {isDuplicateBlocked && (
              <p className="text-xs text-red-600 mt-2 font-medium">
                ⚠️ {getExportTypeDisplayName(type)} backup already exists for this date range
              </p>
            )}
          </div>
        </div>

        <div className="mt-auto">
          <button
            onClick={() => handleExport(type)}
            disabled={isDisabled || (activeTab === 'advanced' && (isDateRangeInvalid || isDuplicateBlocked))}
            className={`w-full flex items-center justify-center space-x-3 px-6 py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 ${
              isDisabled || (activeTab === 'advanced' && (isDateRangeInvalid || isDuplicateBlocked))
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : `${style.bg} ${style.hover} text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5`
            }`}
          >
            {exporting === type ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Creating Backup...</span>
              </>
            ) : isBlocked ? (
              <>
                <Clock className="w-5 h-5" />
                <span>Processing...</span>
              </>
            ) : isDuplicateBlocked ? (
              <>
                <Ban className="w-5 h-5" />
                <span>Duplicate {getExportTypeDisplayName(type)} Backup</span>
              </>
            ) : (
              <>
                <CloudDownload className="w-5 h-5" />
                <span>Start {getExportTypeDisplayName(type)} Backup</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  const formatDateDisplay = (date) => {
    if (!date) return 'All Records';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {popupMessage && (
          <Popup
            message={popupMessage.message}
            type={popupMessage.type}
            onClose={popupMessage.onClose}
          />
        )}

        {/* Centered Success Popup */}
        {showSuccessPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-2xl border border-emerald-200 p-6 max-w-md mx-4 animate-in zoom-in duration-300">
              <div className="flex items-start space-x-4">
                <div className="p-2 bg-emerald-100 rounded-full flex-shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-2 text-lg">Backup Completed Successfully!</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    {successData.type} backup has been generated and downloaded.
                  </p>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-start">
                      <span className="text-gray-500 font-medium">File:</span>
                      <span className="font-medium text-gray-700 text-right max-w-[200px] break-words">{successData.fileName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-medium">Size:</span>
                      <span className="font-medium text-gray-700">{successData.fileSize}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-gray-500 font-medium">Period:</span>
                      <span className="font-medium text-gray-700 text-right max-w-[150px]">{successData.dateRange}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-medium">Time:</span>
                      <span className="font-medium text-gray-700">{successData.timestamp}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowSuccessPopup(false)}
                    className="w-full mt-6 px-4 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-transform"
                  >
                    Got it!
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Duplicate Block Popup */}
        {showDuplicatePopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-2xl border border-red-200 p-6 max-w-md mx-4 animate-in zoom-in duration-300">
              <div className="flex items-start space-x-4">
                <div className="p-2 bg-red-100 rounded-full flex-shrink-0">
                  <Ban className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-2 text-lg">
                    {getExportTypeDisplayName(showDuplicatePopup.type)} Backup Blocked - Duplicate Date Range
                  </h4>
                  
                  <div className="space-y-3 text-sm mb-4">
                    <div className="flex justify-between items-start">
                      <span className="text-gray-500 font-medium">Selected Range:</span>
                      <span className="font-medium text-gray-700 text-right">
                        {formatDateDisplay(dateRange.fromDate)} to {formatDateDisplay(dateRange.toDate)}
                      </span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-gray-500 font-medium">Existing {getExportTypeDisplayName(showDuplicatePopup.type)} Backup:</span>
                      <span className="font-medium text-gray-700 text-right">
                        {showDuplicatePopup.existingFrom} to {showDuplicatePopup.existingTo}
                      </span>
                    </div>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <p className="text-red-700 text-sm font-medium">
                      This {getExportTypeDisplayName(showDuplicatePopup.type).toLowerCase()} backup already exists for the selected date range.
                    </p>
                    <p className="text-red-600 text-xs mt-1">
                      You cannot create duplicate {getExportTypeDisplayName(showDuplicatePopup.type).toLowerCase()} backups for the same date range.
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-blue-700 text-sm font-medium mb-1">
                      To create a new {getExportTypeDisplayName(showDuplicatePopup.type).toLowerCase()} backup, please:
                    </p>
                    <ul className="text-blue-600 text-xs list-disc list-inside space-y-1">
                      <li>Select a different date range</li>
                      <li>Or try a different backup type (Database, Files, or Complete)</li>
                      <li>Or use Quick Backup for today's data only</li>
                    </ul>
                  </div>

                  <button
                    onClick={handleDuplicateClose}
                    className="w-full mt-2 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-transform"
                  >
                    Got it - I'll select different dates
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 bg-white rounded-2xl shadow-lg border border-gray-200/50">
              <Server className="w-10 h-10 text-blue-600" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Data Management & Backup
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Secure and reliable backup solutions for your database and document files
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-1 mb-8 max-w-md mx-auto">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('quick')}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ${
                activeTab === 'quick'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Quick Backup
            </button>
            <button
              onClick={() => setActiveTab('advanced')}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ${
                activeTab === 'advanced'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Date Range Export
            </button>
          </div>
        </div>

        {/* Dynamic Progress Bar - Centered */}
        {exporting && (
          <div className="mb-8 bg-white rounded-2xl shadow-xl border border-blue-200 p-6 animate-in fade-in duration-500 max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CloudDownload className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Creating {getExportTypeDisplayName(exporting)} Backup</h3>
                  <p className="text-sm text-gray-600">
                    {activeTab === 'advanced' 
                      ? `${formatDateDisplay(dateRange.fromDate)} to ${formatDateDisplay(dateRange.toDate)}`
                      : "Today's complete data"
                    }
                  </p>
                </div>
              </div>
              <span className="text-xl font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">
                {Math.round(progress)}%
              </span>
            </div>
            
            {/* Enhanced Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
              <div 
                className="h-4 rounded-full bg-gradient-to-r from-blue-500 via-blue-600 to-purple-600 transition-all duration-300 ease-out relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse"></div>
                <div className="absolute right-0 top-0 w-2 h-4 bg-white/60 animate-pulse"></div>
              </div>
            </div>
            
            <div className="flex justify-between text-xs text-gray-500 mt-3 font-medium">
              <span className={`${progress > 0 ? 'text-blue-600' : ''}`}>Initializing</span>
              <span className={`${progress > 25 ? 'text-blue-600' : ''}`}>Collecting Data</span>
              <span className={`${progress > 50 ? 'text-blue-600' : ''}`}>Processing Files</span>
              <span className={`${progress > 75 ? 'text-blue-600' : ''}`}>Finalizing</span>
            </div>
          </div>
        )}

        {/* Status Message */}
        {/* {status.message && !exporting && (
          <div
            className={`flex items-center space-x-4 p-4 rounded-2xl mb-6 animate-in fade-in duration-500 max-w-2xl mx-auto ${
              status.type === 'error' 
                ? 'bg-red-50 text-red-800 border border-red-200' 
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}
          >
            {status.type === 'error' ? (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="text-sm font-medium">{status.message}</span>
          </div>
        )} */}

        {/* Quick Backup Section */}
        {activeTab === 'quick' && (
          <div className="space-y-8 mb-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Quick System Backup</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Complete system backups for today's data. No date selection required.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <ExportActionCard
                type="database"
                icon={Database}
                title="Database Backup"
                description="Export complete database with all tables, relationships, and metadata for today's data"
                variant="success"
              />
              <ExportActionCard
                type="files"
                icon={FileArchive}
                title="Documents Backup"
                description="Backup all document files, images, and attachments with folder structure for today"
                variant="warning"
              />
              <ExportActionCard
                type="complete"
                icon={Server}
                title="Full System Backup"
                description="Complete backup including database, files, and system configuration for today"
                variant="primary"
              />
            </div>
          </div>
        )}

        {/* Advanced Date Range Section */}
        {activeTab === 'advanced' && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Selective Data Export</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Export data from specific time periods for compliance or analysis
              </p>
            </div>

            {/* Date Range Selector */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-6 h-6 text-blue-600" />
                  <h3 className="text-xl font-semibold text-gray-900">Define Export Period</h3>
                </div>
                {isFilterActive && (
                  <button
                    onClick={clearDateRange}
                    className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                  >
                    <X className="w-4 h-4" />
                    <span>Clear Dates</span>
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={dateRange.fromDate}
                    onChange={(e) => handleDateChange('fromDate', e.target.value)}
                    max={dateRange.toDate || new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-700 font-medium"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={dateRange.toDate}
                    onChange={(e) => handleDateChange('toDate', e.target.value)}
                    min={dateRange.fromDate || undefined}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-700 font-medium"
                    required
                  />
                </div>
              </div>

              {/* Duplicate Detection Information */}
              {/* <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-blue-800 text-sm font-medium mb-2">
                      Duplicate Detection Rules
                    </p>
                    <ul className="text-blue-700 text-sm space-y-1">
                      <li>• <strong>Separate checks</strong> for Database, Files, and Complete backups</li>
                      <li>• <strong>Blocked</strong>: Same backup type with same date range</li>
                      <li>• <strong>Allowed</strong>: Different backup types with same date range</li>
                    </ul>
                    <p className="text-blue-600 text-xs mt-2">
                      Example: You can have Database backup AND Files backup for the same date range
                    </p>
                  </div>
                </div>
              </div> */}

              {/* Individual Duplicate Warnings */}
              {/* <div className="mt-4 space-y-3">
                {duplicateWarning && duplicateWarning.database && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-amber-700 text-sm font-medium">
                      ⚠️ Database backup already exists for {formatDateDisplay(dateRange.fromDate)} to {formatDateDisplay(dateRange.toDate)}
                    </p>
                  </div>
                )}
                {duplicateWarning && duplicateWarning.files && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-amber-700 text-sm font-medium">
                      ⚠️ Files backup already exists for {formatDateDisplay(dateRange.fromDate)} to {formatDateDisplay(dateRange.toDate)}
                    </p>
                  </div>
                )}
                {duplicateWarning && duplicateWarning.complete && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-amber-700 text-sm font-medium">
                      ⚠️ Complete backup already exists for {formatDateDisplay(dateRange.fromDate)} to {formatDateDisplay(dateRange.toDate)}
                    </p>
                  </div>
                )}
              </div> */}
            </div>

            {/* Export Options */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <ExportActionCard
                type="database"
                icon={FileText}
                title="Database Export"
                description="Export structured database data for selected period with full relationships and integrity"
                variant="success"
              />
              <ExportActionCard
                type="files"
                icon={HardDrive}
                title="Files Export"
                description="Export documents and media files modified within the specified date range"
                variant="warning"
              />
              <ExportActionCard
                type="complete"
                icon={Archive}
                title="Complete Export"
                description="Full system backup including both database and files for the selected period"
                variant="primary"
              />
            </div>
          </div>
        )}

        {/* Recent Activity - Only shows completed/failed exports */}
        {(exportHistory.length > 0 || backendExportHistory.length > 0) && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mt-12">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Clock className="w-6 h-6 mr-3 text-gray-600" />
              Recent Backup Operations
            </h3>
            <div className="space-y-4">
              {[...exportHistory, ...backendExportHistory.map(item => ({
                id: item.exportId,
                type: item.type,
                fromDate: item.fromDate,
                toDate: item.toDate,
                status: 'completed',
                fileName: item.fileName,
                fileSize: item.fileSize,
                timestamp: item.exportTime
              }))].slice(0, 5).map((exportItem) => (
                <div key={exportItem.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 hover:bg-white transition-all duration-300 group">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className={`p-2 rounded-lg ${
                      exportItem.status === 'completed' ? 'bg-emerald-100' : 'bg-red-100'
                    }`}>
                      {exportItem.status === 'completed' ? (
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-1">
                        <span className="font-semibold text-gray-900 capitalize">{exportItem.type} Backup</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          exportItem.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {exportItem.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {formatDateDisplay(exportItem.fromDate)} to {formatDateDisplay(exportItem.toDate)}
                      </p>
                      {exportItem.fileName && (
                        <p className="text-xs text-gray-500 mt-1 truncate">{exportItem.fileName}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-900 block">
                      {formatDateTime(exportItem.timestamp)}
                    </span>
                    {exportItem.fileSize && (
                      <span className="text-xs text-gray-500">{formatFileSize(exportItem.fileSize)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExportData;