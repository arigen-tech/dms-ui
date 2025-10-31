import React, { useState, useRef } from 'react';
import {
  Upload, Database, Folder, CheckCircle, AlertCircle,
  Settings, ChevronDown, ChevronUp, Server,
  Archive, HardDrive, CloudUpload, X, Loader, Search, FileSearch,
  CheckCircle2, FileArchive, Shield, File, FileText
} from 'lucide-react';
import Popup from '../Components/Popup';

const Import = () => {
  const [importing, setImporting] = useState(false);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState({});
  const [progress, setProgress] = useState(0);
  const [importOptions, setImportOptions] = useState({
    importDatabase: true,
    importFiles: true,
    overwriteExisting: false
  });
  const [availableTables, setAvailableTables] = useState([]);
  const [selectedTables, setSelectedTables] = useState(new Set());
  const [availableFiles, setAvailableFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [showTableSelector, setShowTableSelector] = useState(false);
  const [showFileSelector, setShowFileSelector] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState('');
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successData, setSuccessData] = useState({});
  const [fileContentType, setFileContentType] = useState(null);
  const [fileStructure, setFileStructure] = useState({});
  const [validationDetails, setValidationDetails] = useState(null);

  // Popup state management
  const [popupMessage, setPopupMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

  const getAuthToken = () => {
    return localStorage.getItem('tokenKey') || localStorage.getItem('authToken');
  };

  // Popup function like in Branch component
  const showPopup = (message, type = 'info') => {
    setPopupMessage({
      message,
      type,
      onClose: () => {
        setPopupMessage(null);
      }
    });
  };

  const handleFileSelect = async (selectedFile) => {
    if (!selectedFile) return;

    setFileError('');
    setFileContentType(null);
    setFileStructure({});
    setValidationDetails(null);
    setAvailableTables([]);
    setSelectedTables(new Set());
    setAvailableFiles([]);
    setSelectedFiles(new Set());

    if (!selectedFile.name.toLowerCase().endsWith('.zip')) {
      setFileError('Please select a ZIP file exported from DMS system.');
      showPopup('Invalid file type. Please select a ZIP file.', 'error');
      return;
    }

    const maxSize = 100 * 1024 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setFileError('File size exceeds 100GB limit.');
      showPopup('File too large. Maximum size is 100GB.', 'error');
      return;
    }

    if (selectedFile.size === 0) {
      setFileError('File is empty.');
      showPopup('The selected file is empty.', 'error');
      return;
    }

    console.log('Selected file:', selectedFile.name, 'Size:', formatFileSize(selectedFile.size));

    setFile(selectedFile);
    // setStatus({
    //   type: 'info',
    //   message: `File selected: ${selectedFile.name} (${formatFileSize(selectedFile.size)}) - Validating...`
    // });

    await validateFile(selectedFile);
  };

  const handleFileInputChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const validateFile = async (fileToValidate) => {
    try {
      

      const token = getAuthToken();
      const formData = new FormData();
      formData.append('file', fileToValidate);

      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      console.log('Sending validation request for file:', fileToValidate.name);

      const response = await fetch(`${API_BASE_URL}/import/validate`, {
        method: 'POST',
        body: formData,
        headers: headers
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Authentication required. Please log in again.');
        }
        const errorText = await response.text();
        throw new Error(`Validation failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      console.log('Validation response:', result);

      if (result.success) {
        const details = result.details || {};
        const tables = details.availableTables || [];
        const files = details.availableFiles || [];
        const hasDatabase = details.hasDatabase || false;
        const hasFiles = details.hasFiles || false;
        const fileStructure = details.fileStructure || {};

        console.log('Validation details:', details);

        let contentType = 'unknown';
        if (hasDatabase && hasFiles) {
          contentType = 'both';
        } else if (hasDatabase) {
          contentType = 'database';
        } else if (hasFiles) {
          contentType = 'files';
        }

        setFileContentType(contentType);
        setFileStructure(fileStructure);
        setValidationDetails(details);

        // Auto-set import options based on content type
        setImportOptions(prev => ({
          ...prev,
          importDatabase: hasDatabase,
          importFiles: hasFiles
        }));

        // Build the success message for popup
        let popupMessage = `✅ File validated successfully! `;
        if (hasDatabase) popupMessage += `Found ${tables.length} tables. `;
        if (hasFiles) popupMessage += `Found file system content (${files.length} categories). `;
        if (hasDatabase && hasFiles) popupMessage += `Complete system backup detected.`;

        // Show success popup
        showPopup(popupMessage, 'success');

        

        if (tables.length > 0) {
          setAvailableTables(tables);
          setSelectedTables(new Set(tables));
          console.log('Tables available:', tables);
        } else {
          setAvailableTables([]);
          setSelectedTables(new Set());
        }

        if (files.length > 0) {
          setAvailableFiles(files);
          setSelectedFiles(new Set(files));
          console.log('File categories available:', files);
        } else {
          setAvailableFiles([]);
          setSelectedFiles(new Set());
        }

      } else {
        throw new Error(result.message || 'File validation failed');
      }
    } catch (error) {
      console.error('Validation error:', error);
      const errorMessage = `❌ Validation failed: ${error.message}`;
      setStatus({
        type: 'error',
        message: errorMessage
      });
      // Show error in popup too
      showPopup(errorMessage, 'error');
      setFile(null);
      setFileError(error.message);
      setFileContentType(null);
    }
  };

  const simulateProgress = () => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 300);
    return interval;
  };

  const showSuccessPopupMessage = (data) => {
    setSuccessData(data);
    setShowSuccessPopup(true);
  };

  const handleImport = async (importType = 'full') => {
    if (!file) {
      showPopup('Please select a file to import.', 'warning');
      return;
    }

    // Determine what to import based on type and available content
    let importDatabase = false;
    let importFiles = false;
    let tablesToImport = [];
    let filesToImport = [];

    switch (importType) {
      case 'database':
        importDatabase = importOptions.importDatabase && selectedTables.size > 0;
        tablesToImport = Array.from(selectedTables);
        break;

      case 'files':
        importFiles = importOptions.importFiles && selectedFiles.size > 0;
        filesToImport = Array.from(selectedFiles);
        break;

      case 'full':
        importDatabase = importOptions.importDatabase;
        importFiles = importOptions.importFiles;
        tablesToImport = importDatabase ? Array.from(selectedTables) : [];
        filesToImport = importFiles ? Array.from(selectedFiles) : [];
        break;
    }

    // Validation checks with popup messages
    if (importDatabase && tablesToImport.length === 0) {
      showPopup('Please select at least one table to import for database import.', 'warning');
      return;
    }

    if (importFiles && filesToImport.length === 0) {
      showPopup('Please select at least one file category to import for file import.', 'warning');
      return;
    }

    if (!importDatabase && !importFiles) {
      showPopup('Please enable and select at least one table or file category to import.', 'warning');
      return;
    }

    setIsSubmitting(true);
    setImporting(true);
    setImportResults(null);
    const progressInterval = simulateProgress();

    try {
      const token = getAuthToken();
      const formData = new FormData();
      formData.append('file', file);

      const params = new URLSearchParams();
      params.append('importDatabase', importDatabase.toString());
      params.append('importFiles', importFiles.toString());
      params.append('overwriteExisting', importOptions.overwriteExisting.toString());

      // Only add selected tables if we're importing database
      if (importDatabase && tablesToImport.length > 0) {
        params.append('selectedTables', tablesToImport.join(','));
      }

      // Only add selected files if we're importing files
      if (importFiles && filesToImport.length > 0) {
        params.append('selectedFiles', filesToImport.join(','));
      }

      console.log('Starting import with params:', {
        importDatabase,
        importFiles,
        tablesToImport,
        filesToImport,
        overwrite: importOptions.overwriteExisting
      });

      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/import/restore?${params.toString()}`, {
        method: 'POST',
        body: formData,
        headers: headers
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Authentication required. Please log in again.');
        }
        const errorText = await response.text();
        throw new Error(`Import failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      setProgress(100);

      if (result.success) {
        setImportResults(result);

        const successData = {
          type: getImportTypeDisplayName(importType),
          databaseTables: result.databaseTables || 0,
          databaseRecords: result.databaseRecords || 0,
          filesImported: result.filesImportedCount || 0,
          filesReplaced: result.filesReplaced || 0,
          filesSkipped: result.filesSkipped || 0,
          selectedTables: result.selectedTables || tablesToImport,
          selectedFiles: result.selectedFiles || filesToImport,
          source: result.metadata?.databaseName || 'DMS System',
          period: result.metadata?.dateRange || 'Unknown period',
          timestamp: new Date().toLocaleString(),
          importId: result.importId,
          overwrite: importOptions.overwriteExisting,
          recordsAdded: result.details?.recordsAdded || 0,
          recordsUpdated: result.details?.recordsUpdated || 0
        };

        showSuccessPopupMessage(successData);
        console.log('Import Results:', result);

      } else {
        throw new Error(result.message || 'Import failed');
      }

    } catch (error) {
      console.error('Import error:', error);
      setProgress(0);
      showPopup(`Import failed: ${error.message}`, 'error');
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        setImporting(false);
        setIsSubmitting(false);
      }, 1000);
    }
  };

  // Reset function to clear all states after import
  const resetImportState = () => {
    setFile(null);
    setStatus({});
    setProgress(0);
    setAvailableTables([]);
    setSelectedTables(new Set());
    setAvailableFiles([]);
    setSelectedFiles(new Set());
    setImportResults(null);
    setFileError('');
    setFileContentType(null);
    setValidationDetails(null);
    setShowTableSelector(false);
    setShowFileSelector(false);
    setImportOptions({
      importDatabase: true,
      importFiles: true,
      overwriteExisting: false
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getImportTypeDisplayName = (type) => {
    switch (type) {
      case 'database': return 'Database';
      case 'files': return 'Files & Documents';
      case 'full': return 'Complete System';
      default: return type;
    }
  };

  const handleTableSelection = (tableName) => {
    setSelectedTables(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(tableName)) {
        newSelection.delete(tableName);
      } else {
        newSelection.add(tableName);
      }
      return newSelection;
    });
  };

  const handleFileCategorySelection = (fileCategory) => {
    setSelectedFiles(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(fileCategory)) {
        newSelection.delete(fileCategory);
      } else {
        newSelection.add(fileCategory);
      }
      return newSelection;
    });
  };

  const selectAllTables = () => {
    setSelectedTables(new Set(availableTables));
  };

  const clearTableSelection = () => {
    setSelectedTables(new Set());
  };

  const selectAllFiles = () => {
    setSelectedFiles(new Set(availableFiles));
  };

  const clearFileSelection = () => {
    setSelectedFiles(new Set());
  };

  const handleOptionChange = (option) => {
    setImportOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const clearFile = () => {
    setFile(null);
    setStatus({});
    setAvailableTables([]);
    setSelectedTables(new Set());
    setAvailableFiles([]);
    setSelectedFiles(new Set());
    setImportResults(null);
    setFileError('');
    setFileContentType(null);
    setValidationDetails(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isImportDisabled = (importType) => {
    if (importing || !file) return true;

    const hasDatabaseContent = availableTables.length > 0;
    const hasFilesContent = availableFiles.length > 0;

    switch (importType) {
      case 'database':
        return !(importOptions.importDatabase && hasDatabaseContent && selectedTables.size > 0);

      case 'files':
        return !(importOptions.importFiles && hasFilesContent && selectedFiles.size > 0);

      case 'full':
        const dbReady = importOptions.importDatabase && hasDatabaseContent && selectedTables.size > 0;
        const filesReady = importOptions.importFiles && hasFilesContent && selectedFiles.size > 0;
        return !(dbReady || filesReady);

      default:
        return true;
    }
  };

  const SuccessPopup = () => {
    if (!showSuccessPopup) return null;

    // Calculate totals based on import type
    const isDatabaseImport = successData.type === 'Database' || successData.type === 'Complete System';
    const isFilesImport = successData.type === 'Files & Documents' || successData.type === 'Complete System';

    // Get actual counts from backend response
    const actualTableCount = successData.selectedTables?.length ||
      successData.databaseTables ||
      0;

    const totalFilesProcessed = (successData.filesImported || 0) +
      (successData.filesReplaced || 0) +
      (successData.filesSkipped || 0);

    // Format display data
    const formatSource = (source) => {
      if (!source || source === 'Unknown Source') return 'DMS System';
      return source;
    };

    const formatPeriod = (period) => {
      if (!period) return 'Recent export';
      if (period.toLowerCase().includes('unknown')) return 'Recent backup';
      return period;
    };

    // Determine what to show based on import type
    const showDatabaseSection = isDatabaseImport && actualTableCount > 0;
    const showFilesSection = isFilesImport && totalFilesProcessed > 0;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-in fade-in duration-300 p-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-green-200 max-w-2xl w-full max-h-[90vh] overflow-hidden mx-auto animate-in zoom-in duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-1">🎉 Import Successful!</h3>
                <p className="text-green-100 text-lg font-medium">
                  {successData.type === 'Database' && 'Database restoration completed'}
                  {successData.type === 'Files & Documents' && 'Files import completed'}
                  {successData.type === 'Complete System' && 'System restoration completed'}
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {showDatabaseSection && (
                <>
                  {successData.databaseRecords > 0 && (
                    <div className="text-center p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                      <div className="text-indigo-600 text-sm font-semibold mb-1">Records</div>
                      <div className="text-2xl font-bold text-indigo-700">{successData.databaseRecords?.toLocaleString()}</div>
                    </div>
                  )}
                </>
              )}
              {showFilesSection && (
                <>
                  {/* File stats can be added here if needed */}
                </>
              )}
            </div>

            {/* Database Results */}
            {showDatabaseSection && (
              <div className="mb-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Database className="w-5 h-5 text-blue-600" />
                  </div>
                  <h4 className="font-bold text-gray-900 text-lg">Database Import</h4>
                  {successData.type === 'Complete System' && (
                    <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded-full">
                      Completed
                    </span>
                  )}
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-blue-600 text-xs font-semibold uppercase tracking-wide mb-1">Total Tables</div>
                      <div className="text-2xl font-bold text-blue-700">{actualTableCount}</div>
                    </div>
                    {successData.databaseRecords > 0 && (
                      <div>
                        <div className="text-indigo-600 text-xs font-semibold uppercase tracking-wide mb-1">Total Records</div>
                        <div className="text-2xl font-bold text-indigo-700">{successData.databaseRecords?.toLocaleString()}</div>
                      </div>
                    )}
                    {successData.recordsAdded > 0 && (
                      <div>
                        <div className="text-emerald-600 text-xs font-semibold uppercase tracking-wide mb-1">Added</div>
                        <div className="text-xl font-bold text-emerald-700">{successData.recordsAdded?.toLocaleString()}</div>
                      </div>
                    )}
                    {successData.recordsUpdated > 0 && (
                      <div>
                        <div className="text-amber-600 text-xs font-semibold uppercase tracking-wide mb-1">Updated</div>
                        <div className="text-xl font-bold text-amber-700">{successData.recordsUpdated?.toLocaleString()}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Files Results */}
            {showFilesSection && (
              <div className="mb-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Folder className="w-5 h-5 text-green-600" />
                  </div>
                  <h4 className="font-bold text-gray-900 text-lg">Files Import</h4>
                  {successData.type === 'Complete System' && (
                    <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-1 rounded-full">
                      Completed
                    </span>
                  )}
                </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-green-600 text-xs font-semibold uppercase tracking-wide mb-1">Total Files</div>
                      <div className="text-2xl font-bold text-green-700">{totalFilesProcessed}</div>
                    </div>
                    {successData.filesImported > 0 && (
                      <div>
                        <div className="text-emerald-600 text-xs font-semibold uppercase tracking-wide mb-1">Imported</div>
                        <div className="text-xl font-bold text-emerald-700">{successData.filesImported}</div>
                      </div>
                    )}
                    {successData.filesReplaced > 0 && (
                      <div>
                        <div className="text-amber-600 text-xs font-semibold uppercase tracking-wide mb-1">Replaced</div>
                        <div className="text-xl font-bold text-amber-700">{successData.filesReplaced}</div>
                      </div>
                    )}
                    {successData.filesSkipped > 0 && (
                      <div>
                        <div className="text-gray-600 text-xs font-semibold uppercase tracking-wide mb-1">Skipped</div>
                        <div className="text-xl font-bold text-gray-700">{successData.filesSkipped}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Import Summary */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-5 rounded-xl border border-purple-200">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FileArchive className="w-5 h-5 text-purple-600" />
                </div>
                <h4 className="font-bold text-gray-900 text-lg">Import Summary</h4>
              </div>

              {/* Compact Grid Layout */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-3 bg-white/50 rounded-lg border border-purple-100">
                    <span className="text-purple-700 font-medium text-sm">Type:</span>
                    <span className="font-bold text-purple-900">{successData.type}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/50 rounded-lg border border-purple-100">
                    <span className="text-purple-700 font-medium text-sm">Source:</span>
                    <span className="font-bold text-purple-900 truncate ml-2" title={formatSource(successData.source)}>
                      {formatSource(successData.source)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-3 bg-white/50 rounded-lg border border-purple-100">
                    <span className="text-purple-700 font-medium text-sm">Period:</span>
                    <span className="font-bold text-purple-900">{formatPeriod(successData.period)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/50 rounded-lg border border-purple-100">
                    <span className="text-purple-700 font-medium text-sm">Completed:</span>
                    <span className="font-bold text-purple-900 text-sm">{successData.timestamp}</span>
                  </div>
                </div>
              </div>

              {/* Import-specific highlights */}
              <div className="mt-4 pt-4 border-t border-purple-200">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-center">
                  {successData.type === 'Database' && (
                    <>
                      <div className="bg-white/70 p-2 rounded-lg border border-purple-100">
                        <div className="text-purple-600 text-xs font-semibold mb-1">Tables</div>
                        <div className="text-lg font-bold text-purple-700">{actualTableCount}</div>
                      </div>
                      <div className="bg-white/70 p-2 rounded-lg border border-purple-100">
                        <div className="text-purple-600 text-xs font-semibold mb-1">Duplicates</div>
                        <div className={`text-sm font-bold ${successData.overwrite ? 'text-amber-600' : 'text-green-600'}`}>
                          {successData.overwrite ? 'Replace' : 'Skip '}
                        </div>
                      </div>
                    </>
                  )}

                  {successData.type === 'Files & Documents' && (
                    <>
                      <div className="bg-white/70 p-2 rounded-lg border border-purple-100">
                        <div className="text-purple-600 text-xs font-semibold mb-1">Files</div>
                        <div className="text-lg font-bold text-purple-700">{totalFilesProcessed}</div>
                      </div>
                      <div className="bg-white/70 p-2 rounded-lg border border-purple-100">
                        <div className="text-purple-600 text-xs font-semibold mb-1">Duplicates</div>
                        <div className={`text-sm font-bold ${successData.overwrite ? 'text-amber-600' : 'text-green-600'}`}>
                          {successData.overwrite ? 'Replace' : 'Skip '}
                        </div>
                      </div>
                    </>
                  )}

                  {successData.type === 'Complete System' && (
                    <>
                      <div className="bg-white/70 p-2 rounded-lg border border-purple-100">
                        <div className="text-purple-600 text-xs font-semibold mb-1">Tables</div>
                        <div className="text-lg font-bold text-purple-700">{actualTableCount}</div>
                      </div>
                      <div className="bg-white/70 p-2 rounded-lg border border-purple-100">
                        <div className="text-purple-600 text-xs font-semibold mb-1">Files</div>
                        <div className="text-lg font-bold text-purple-700">{totalFilesProcessed}</div>
                      </div>
                      <div className="bg-white/70 p-2 rounded-lg border border-purple-100">
                        <div className="text-purple-600 text-xs font-semibold mb-1">Duplicates</div>
                        <div className={`text-sm font-bold ${successData.overwrite ? 'text-amber-600' : 'text-green-600'}`}>
                          {successData.overwrite ? 'Replace' : 'Skip '}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Success Message */}
            <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
              <div className="flex items-center space-x-3">
                <Shield className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <div className="font-bold text-green-800 text-sm mb-1">✅ System Ready</div>
                  <p className="text-green-700 text-sm">
                    {successData.type === 'Database' && 'Your database has been successfully restored and is ready for use.'}
                    {successData.type === 'Files & Documents' && 'All selected files and documents have been imported successfully.'}
                    {successData.type === 'Complete System' && 'Your complete Document Management System has been restored and is ready for use.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex gap-3">
            <button
              onClick={() => {
                setShowSuccessPopup(false);
                resetImportState();
              }}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Continue to DMS
            </button>
            <button
              onClick={() => {
                setShowSuccessPopup(false);
              }}
              className="px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-all duration-300"
            >
              Import Another
            </button>
          </div>
        </div>
      </div>
    );
  };

  const FileDetails = ({ file, status }) => {
    if (!file || !status.details) return null;

    return (
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4">
        <h4 className="font-medium text-gray-900 mb-2">📊 File Analysis:</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div>
              <span className="text-gray-600">Name:</span>
              <span className="ml-2 font-medium">{file.name}</span>
            </div>
            <div>
              <span className="text-gray-600">Size:</span>
              <span className="ml-2 font-medium">{formatFileSize(file.size)}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div>
              <span className="text-gray-600">Content Type:</span>
              <span className={`ml-2 font-medium ${fileContentType === 'both' ? 'text-purple-600' :
                fileContentType === 'database' ? 'text-blue-600' :
                  fileContentType === 'files' ? 'text-green-600' : 'text-gray-500'
                }`}>
                {fileContentType === 'both' ? 'Database + Files' :
                  fileContentType === 'database' ? 'Database Only' :
                    fileContentType === 'files' ? 'Files Only' : 'Unknown'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Tables Found:</span>
              <span className="ml-2 font-medium text-blue-600">
                {status.details.availableTables?.length || 0}
              </span>
            </div>
          </div>
        </div>

        {status.details.availableTables && status.details.availableTables.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Available Tables:</span>
              <span className="font-medium text-blue-600">
                {status.details.availableTables.length} tables • {selectedTables.size} selected
              </span>
            </div>
            <button
              onClick={() => setShowTableSelector(!showTableSelector)}
              className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              <span>{showTableSelector ? 'Hide Table Selection' : 'Select Tables to Import'}</span>
              {showTableSelector ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        )}

        {status.details.availableFiles && status.details.availableFiles.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Available File Categories:</span>
              <span className="font-medium text-green-600">
                {status.details.availableFiles.length} categories • {selectedFiles.size} selected
              </span>
            </div>
            <button
              onClick={() => setShowFileSelector(!showFileSelector)}
              className="flex items-center space-x-2 text-sm text-green-600 hover:text-green-800 font-medium"
            >
              <span>{showFileSelector ? 'Hide File Selection' : 'Select File Categories to Import'}</span>
              {showFileSelector ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>
    );
  };

  const TableSelector = () => {
    if (!showTableSelector || availableTables.length === 0) return null;

    const allSelected = selectedTables.size === availableTables.length;
    const someSelected = selectedTables.size > 0 && !allSelected;

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 mt-4 max-h-80 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h5 className="font-medium text-gray-900">Select Tables to Import</h5>
          <div className="flex space-x-2">
            <button
              onClick={selectAllTables}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 border border-blue-200 rounded"
            >
              Select All
            </button>
            <button
              onClick={clearTableSelection}
              className="text-xs text-gray-600 hover:text-gray-800 font-medium px-2 py-1 border border-gray-200 rounded"
            >
              Clear All
            </button>
          </div>
        </div>

        <label className="flex items-center space-x-2 p-2 border-b border-gray-200 mb-2">
          <input
            type="checkbox"
            checked={allSelected}
            ref={input => {
              if (input) {
                input.indeterminate = someSelected;
              }
            }}
            onChange={() => allSelected ? clearTableSelection() : selectAllTables()}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-900">
            {allSelected ? 'All tables selected' : someSelected ? 'Some tables selected' : 'Select all tables'}
          </span>
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {availableTables.map(table => (
            <label key={table} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
              <input
                type="checkbox"
                checked={selectedTables.has(table)}
                onChange={() => handleTableSelection(table)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 truncate" title={table}>{table}</span>
            </label>
          ))}
        </div>

        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Selected: <span className="font-medium">{selectedTables.size}</span> of {availableTables.length} tables
          </div>
        </div>
      </div>
    );
  };

  const FileSelector = () => {
    if (!showFileSelector || availableFiles.length === 0) return null;

    const allSelected = selectedFiles.size === availableFiles.length;
    const someSelected = selectedFiles.size > 0 && !allSelected;

    const fileCategoryIcons = {
      'documents': <FileText className="w-4 h-4 text-blue-600" />,
      'waiting_room': <Folder className="w-4 h-4 text-orange-600" />,
      'profiles': <File className="w-4 h-4 text-green-600" />,
      'archive': <Archive className="w-4 h-4 text-purple-600" />
    };

    const fileCategoryNames = {
      'documents': 'Documents',
      'waiting_room': 'Waiting Room',
      'profiles': 'User Profiles',
      'archive': 'Archives'
    };

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <h5 className="font-medium text-gray-900">Select File Categories to Import</h5>
          <div className="flex space-x-2">
            <button
              onClick={selectAllFiles}
              className="text-xs text-green-600 hover:text-green-800 font-medium px-2 py-1 border border-green-200 rounded"
            >
              Select All
            </button>
            <button
              onClick={clearFileSelection}
              className="text-xs text-gray-600 hover:text-gray-800 font-medium px-2 py-1 border border-gray-200 rounded"
            >
              Clear All
            </button>
          </div>
        </div>

        <label className="flex items-center space-x-2 p-2 border-b border-gray-200 mb-2">
          <input
            type="checkbox"
            checked={allSelected}
            ref={input => {
              if (input) {
                input.indeterminate = someSelected;
              }
            }}
            onChange={() => allSelected ? clearFileSelection() : selectAllFiles()}
            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          <span className="text-sm font-medium text-gray-900">
            {allSelected ? 'All file categories selected' : someSelected ? 'Some categories selected' : 'Select all file categories'}
          </span>
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {availableFiles.map(category => (
            <label key={category} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedFiles.has(category)}
                onChange={() => handleFileCategorySelection(category)}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <div className="flex items-center space-x-2">
                {fileCategoryIcons[category] || <File className="w-4 h-4 text-gray-600" />}
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {fileCategoryNames[category] || category}
                  </div>
                  <div className="text-xs text-gray-500">
                    {fileStructure[category]?.fileCount || 0} files
                  </div>
                </div>
              </div>
            </label>
          ))}
        </div>

        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Selected: <span className="font-medium">{selectedFiles.size}</span> of {availableFiles.length} file categories
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
    <div className="min-h-screen bg-gradient-to-br bg-slate-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Popup Component */}
        {popupMessage && (
          <Popup
            message={popupMessage.message}
            type={popupMessage.type}
            onClose={popupMessage.onClose}
          />
        )}

        <SuccessPopup />

        <div className="text-center mb-4">
          <div className="flex items-center justify-center mb-6">
            <div className="p-2 bg-white rounded-2xl shadow-lg border border-gray-200/50">
              <CloudUpload className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            DMS Data Import
          </h1>
          <p className="text-sm text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Restore your Document Management System from backup files. Supports files up to 100GB with selective table and file import.
          </p>
        </div>

        {importing && (
          <div className="mb-4 bg-white rounded-2xl shadow-xl border border-green-200 p-6 animate-in fade-in duration-500 max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  {progress < 100 ? (
                    <Loader className="w-5 h-5 text-green-600 animate-spin" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {progress < 100 ? '🔄 Importing DMS Data' : '✅ Import Complete'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {importOptions.importDatabase && `${selectedTables.size} tables`}
                    {importOptions.importDatabase && importOptions.importFiles ? ' and ' : ''}
                    {importOptions.importFiles && `${selectedFiles.size} file categories`}
                  </p>
                </div>
              </div>
              <span className="text-xl font-bold text-green-600 bg-green-50 px-3 py-1 rounded-lg">
                {Math.round(progress)}%
              </span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
              <div
                className="h-4 rounded-full bg-gradient-to-r from-green-500 via-green-600 to-blue-600 transition-all duration-300 ease-out relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse"></div>
              </div>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {status.message && (
          <div className={`mb-6 p-4 rounded-xl border max-w-4xl mx-auto ${status.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
            status.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
              'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
            <div className="flex items-center space-x-2">
              {status.type === 'error' && <AlertCircle className="w-5 h-5" />}
              {status.type === 'success' && <CheckCircle className="w-5 h-5" />}
              <span className="font-medium">{status.message}</span>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8 max-w-4xl mx-auto">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="p-3 bg-blue-100 rounded-xl">
                <FileSearch className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Select DMS Export File
              </h3>
              <p className="text-gray-600 mb-4">
                Choose a ZIP file that was exported from your DMS system.
                The system will automatically detect available content (database, files, or both).
              </p>

              <input
                type="file"
                id="import-file"
                ref={fileInputRef}
                accept=".zip"
                onChange={handleFileInputChange}
                className="hidden"
                disabled={importing}
              />

              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${dragOver
                  ? 'border-blue-400 bg-blue-50'
                  : fileError
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300 hover:border-blue-400'
                  }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {fileError && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-200 rounded-lg">
                    <div className="flex items-center space-x-2 text-red-700">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">{fileError}</span>
                    </div>
                  </div>
                )}

                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Upload className="w-8 h-8 text-blue-600" />
                  </div>

                  <div>
                    <button
                      onClick={triggerFileInput}
                      disabled={importing}
                      className={`inline-flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${importing
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                        }`}
                    >
                      <Search className="w-4 h-4" />
                      <span>Browse for Export ZIP File</span>
                    </button>
                  </div>

                  <div className="text-sm text-gray-500">
                    or drag and drop your file here
                  </div>
                </div>

                {file ? (
                  <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Archive className="w-5 h-5 text-green-600" />
                        <div>
                          <div className="font-medium text-gray-900">{file.name}</div>
                          <div className="text-sm text-gray-600">
                            {formatFileSize(file.size)} • {fileContentType ?
                              fileContentType === 'both' ? 'Database + Files' :
                                fileContentType === 'database' ? 'Database Only' :
                                  fileContentType === 'files' ? 'Files Only' : 'Ready for import'
                              : 'Ready for import'}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={clearFile}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        disabled={importing}
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className=""></div>
                )}

                <div className="mt-4 text-xs text-gray-400">
                  Maximum file size: 100GB • DMS Export ZIP format only
                </div>
              </div>
            </div>
          </div>
        </div>

        {file && fileContentType && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8 max-w-4xl mx-auto">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Settings className="w-6 h-6 mr-3 text-blue-600" />
              Import Configuration
            </h3>

            <div className="space-y-6">
              <div className={`flex items-start justify-between p-4 border rounded-xl transition-colors ${fileContentType === 'database' || fileContentType === 'both'
                ? 'border-blue-200 hover:border-blue-300'
                : 'border-gray-200 bg-gray-50 opacity-60'
                }`}>
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Database className={`w-5 h-5 ${fileContentType === 'database' || fileContentType === 'both' ? 'text-blue-600' : 'text-gray-400'
                      }`} />
                    <div className={`font-semibold ${fileContentType === 'database' || fileContentType === 'both' ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                      Import Database
                    </div>
                    {!(fileContentType === 'database' || fileContentType === 'both') && (
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Not available</span>
                    )}
                  </div>
                  <div className={`text-sm ml-8 ${fileContentType === 'database' || fileContentType === 'both' ? 'text-gray-600' : 'text-gray-400'
                    }`}>
                    Restore database tables and records. Select specific tables or import all.
                    {importOptions.importDatabase && availableTables.length > 0 && (
                      <div className="mt-1 text-blue-600 font-medium">
                        {availableTables.length} tables available • {selectedTables.size} selected
                      </div>
                    )}
                  </div>

                  {importOptions.importDatabase && availableTables.length > 0 && (
                    <button
                      onClick={() => setShowTableSelector(!showTableSelector)}
                      className="ml-8 mt-2 flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      <span>{showTableSelector ? 'Hide Table Selection' : 'Select Specific Tables'}</span>
                      {showTableSelector ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                <label className={`relative inline-flex items-center cursor-pointer ${!(fileContentType === 'database' || fileContentType === 'both') ? 'opacity-50 cursor-not-allowed' : ''
                  }`}>
                  <input
                    type="checkbox"
                    checked={importOptions.importDatabase}
                    onChange={() => fileContentType === 'database' || fileContentType === 'both' ? handleOptionChange('importDatabase') : null}
                    className="sr-only peer"
                    disabled={importing || !(fileContentType === 'database' || fileContentType === 'both')}
                  />
                  <div className={`w-12 h-6 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${fileContentType === 'database' || fileContentType === 'both'
                    ? 'bg-gray-200 peer-checked:bg-blue-600 after:border-gray-300'
                    : 'bg-gray-100 after:border-gray-200'
                    }`}></div>
                </label>
              </div>

              <div className={`flex items-start justify-between p-4 border rounded-xl transition-colors ${fileContentType === 'files' || fileContentType === 'both'
                ? 'border-green-200 hover:border-green-300'
                : 'border-gray-200 bg-gray-50 opacity-60'
                }`}>
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <HardDrive className={`w-5 h-5 ${fileContentType === 'files' || fileContentType === 'both' ? 'text-green-600' : 'text-gray-400'
                      }`} />
                    <div className={`font-semibold ${fileContentType === 'files' || fileContentType === 'both' ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                      Import Files & Documents
                    </div>
                    {!(fileContentType === 'files' || fileContentType === 'both') && (
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Not available</span>
                    )}
                  </div>
                  <div className={`text-sm ml-8 ${fileContentType === 'files' || fileContentType === 'both' ? 'text-gray-600' : 'text-gray-400'
                    }`}>
                    Restore documents, profiles, waiting room files, and archives with automatic directory creation.
                    {importOptions.importFiles && availableFiles.length > 0 && (
                      <div className="mt-1 text-green-600 font-medium">
                        {availableFiles.length} categories available • {selectedFiles.size} selected
                      </div>
                    )}
                  </div>

                  {importOptions.importFiles && availableFiles.length > 0 && (
                    <button
                      onClick={() => setShowFileSelector(!showFileSelector)}
                      className="ml-8 mt-2 flex items-center space-x-2 text-sm text-green-600 hover:text-green-800 font-medium"
                    >
                      <span>{showFileSelector ? 'Hide File Selection' : 'Select File Categories'}</span>
                      {showFileSelector ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                <label className={`relative inline-flex items-center cursor-pointer ${!(fileContentType === 'files' || fileContentType === 'both') ? 'opacity-50 cursor-not-allowed' : ''
                  }`}>
                  <input
                    type="checkbox"
                    checked={importOptions.importFiles}
                    onChange={() => fileContentType === 'files' || fileContentType === 'both' ? handleOptionChange('importFiles') : null}
                    className="sr-only peer"
                    disabled={importing || !(fileContentType === 'files' || fileContentType === 'both')}
                  />
                  <div className={`w-12 h-6 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${fileContentType === 'files' || fileContentType === 'both'
                    ? 'bg-gray-200 peer-checked:bg-green-600 after:border-gray-300'
                    : 'bg-gray-100 after:border-gray-200'
                    }`}></div>
                </label>
              </div>

              <div className="flex items-start justify-between p-4 border border-amber-200 rounded-xl hover:border-amber-300 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    <div className="font-semibold text-gray-900">Duplicate Data Handling</div>
                  </div>
                  <div className="text-sm text-gray-600 ml-8">
                    {importOptions.overwriteExisting
                      ? "Replace existing records and files when duplicates are found."
                      : "Skip existing records and files, only add new data."
                    }
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={importOptions.overwriteExisting}
                    onChange={() => handleOptionChange('overwriteExisting')}
                    className="sr-only peer"
                    disabled={importing}
                  />
                  <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>
            </div>

            <TableSelector />
            <FileSelector />
          </div>
        )}

        {file && fileContentType && (
          <div className="max-w-4xl mx-auto">
           
            

            {/* Import Cards - Styled like Backup Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Database Import Card */}
              <div className={`bg-white rounded-2xl shadow-lg border-2 p-6 transition-all duration-300 ${isImportDisabled('database') || isSubmitting
                ? 'border-gray-200 opacity-50 cursor-not-allowed'
                : 'border-blue-200 hover:border-blue-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer'
                }`}
                onClick={() => !isImportDisabled('database') && !isSubmitting && handleImport('database')}
              >
                <div className="flex flex-col items-center text-center h-full">
                  <div className="p-4 bg-blue-100 rounded-2xl mb-4">
                    <Database className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Database Import</h3>
                  <p className="text-gray-600 mb-4 flex-1">
                    Import database tables and records only
                  </p>
                  <div className="w-full space-y-3">
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <div className="text-blue-700 font-semibold text-sm">
                        {selectedTables.size > 0
                          ? `${selectedTables.size} tables selected`
                          : 'No tables selected'
                        }
                      </div>
                    </div>
                    <button
                      disabled={isImportDisabled('database') || isSubmitting}
                      className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${isImportDisabled('database') || isSubmitting
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                        }`}
                    >
                      {isSubmitting ? 'Importing...' : 'Start Database Import'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Files Import Card */}
              <div className={`bg-white rounded-2xl shadow-lg border-2 p-6 transition-all duration-300 ${isImportDisabled('files') || isSubmitting
                ? 'border-gray-200 opacity-50 cursor-not-allowed'
                : 'border-green-200 hover:border-green-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer'
                }`}
                onClick={() => !isImportDisabled('files') && !isSubmitting && handleImport('files')}
              >
                <div className="flex flex-col items-center text-center h-full">
                  <div className="p-4 bg-green-100 rounded-2xl mb-4">
                    <HardDrive className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Files & Documents Import</h3>
                  <p className="text-gray-600 mb-4 flex-1">
                    Import documents, files, and attachments only
                  </p>
                  <div className="w-full space-y-3">
                    <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                      <div className="text-green-700 font-semibold text-sm">
                        {selectedFiles.size > 0
                          ? `${selectedFiles.size} categories selected`
                          : 'No categories selected'
                        }
                      </div>
                    </div>
                    <button
                      disabled={isImportDisabled('files') || isSubmitting}
                      className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${isImportDisabled('files') || isSubmitting
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl'
                        }`}
                    >
                      {isSubmitting ? 'Importing...' : 'Start Files Import'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Complete System Import Card */}
              <div className={`bg-white rounded-2xl shadow-lg border-2 p-6 transition-all duration-300 ${isImportDisabled('full') || isSubmitting
                ? 'border-gray-200 opacity-50 cursor-not-allowed'
                : 'border-purple-200 hover:border-purple-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer'
                }`}
                onClick={() => !isImportDisabled('full') && !isSubmitting && handleImport('full')}
              >
                <div className="flex flex-col items-center text-center h-full">
                  <div className="p-4 bg-purple-100 rounded-2xl mb-4">
                    <Server className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Complete System Import</h3>
                  <p className="text-gray-600 mb-4 flex-1">
                    Import both database and files for complete system restoration
                  </p>
                  <div className="w-full space-y-3">
                    <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                      <div className="text-purple-700 font-semibold text-sm">
                        {importOptions.importDatabase ? `${selectedTables.size} tables` : ''}
                        {importOptions.importDatabase && importOptions.importFiles ? ' + ' : ''}
                        {importOptions.importFiles ? `${selectedFiles.size} categories` : ''}
                        {!importOptions.importDatabase && !importOptions.importFiles ? 'Nothing selected' : ''}
                      </div>
                    </div>
                    <button
                      disabled={isImportDisabled('full') || isSubmitting}
                      className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${isImportDisabled('full') || isSubmitting
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl'
                        }`}
                    >
                      {isSubmitting ? 'Importing...' : 'Start Full System Import'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

export default Import;