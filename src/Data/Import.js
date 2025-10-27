import React, { useState } from 'react';
import { Upload, Download, Database, Folder, CheckCircle, AlertCircle, Home, FileText, Settings } from 'lucide-react';

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

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      if (selectedFile.name.toLowerCase().endsWith('.zip')) {
        setFile(selectedFile);
        setStatus({});
        validateFile(selectedFile);
      } else {
        setStatus({
          type: 'error',
          message: 'Please select a ZIP file exported from DMS system.'
        });
      }
    }
  };

  const validateFile = async (fileToValidate) => {
    try {
      const formData = new FormData();
      formData.append('file', fileToValidate);

      const response = await fetch(`${API_BASE_URL}/import/validate`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (result.success) {
        setStatus({
          type: 'success',
          message: `File validated successfully! Size: ${(fileToValidate.size / (1024 * 1024)).toFixed(2)}MB`,
          details: result.details
        });
      } else {
        setStatus({
          type: 'error',
          message: result.message
        });
        setFile(null);
      }
    } catch (error) {
      setStatus({
        type: 'error',
        message: `Validation failed: ${error.message}`
      });
      setFile(null);
    }
  };

  const simulateProgress = () => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 80) {
          clearInterval(interval);
          return 80;
        }
        return prev + 5;
      });
    }, 200);
    return interval;
  };

  const handleImport = async (importType = 'full') => {
    if (!file) {
      setStatus({
        type: 'error',
        message: 'Please select a file to import.'
      });
      return;
    }

    setImporting(true);
    const progressInterval = simulateProgress();

    try {
      const formData = new FormData();
      formData.append('file', file);

      let endpoint = '/import/restore';
      let params = '';

      switch (importType) {
        case 'database':
          params = '?importDatabase=true&importFiles=false';
          break;
        case 'files':
          params = '?importDatabase=false&importFiles=true';
          break;
        case 'full':
        default:
          params = `?importDatabase=${importOptions.importDatabase}&importFiles=${importOptions.importFiles}&overwriteExisting=${importOptions.overwriteExisting}`;
          break;
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}${params}`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      setProgress(100);

      if (result.success) {
        setStatus({
          type: 'success',
          message: `Import completed successfully!`,
          details: result
        });
        
        // Show import summary
        if (result.databaseImported) {
          console.log(`Database: ${result.databaseTables} tables, ${result.databaseRecords} records`);
        }
        if (result.filesImported) {
          console.log(`Files: ${result.filesImportedCount} imported, ${result.filesSkipped} skipped`);
        }
        
      } else {
        throw new Error(result.message || 'Import failed');
      }

    } catch (error) {
      console.error('Import error:', error);
      setProgress(0);
      setStatus({
        type: 'error',
        message: `Import failed: ${error.message}`
      });
    } finally {
      clearInterval(progressInterval);
      setImporting(false);
    }
  };

  const handleOptionChange = (option) => {
    setImportOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  const FileDetails = ({ file, status }) => {
    if (!file || !status.details) return null;

    return (
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4">
        <h4 className="font-medium text-gray-900 mb-2">File Details:</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-600">Name:</span>
            <span className="ml-2 font-medium">{file.name}</span>
          </div>
          <div>
            <span className="text-gray-600">Size:</span>
            <span className="ml-2 font-medium">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
          </div>
          <div>
            <span className="text-gray-600">Has Database:</span>
            <span className="ml-2 font-medium">
              {status.details.hasDatabase ? 'Yes' : 'No'}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Has Files:</span>
            <span className="ml-2 font-medium">
              {status.details.hasFiles ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const ImportResults = ({ status }) => {
    if (!status.details || !status.details.databaseImported) return null;

    const details = status.details;
    
    return (
      <div className="bg-green-50 p-4 rounded-lg border border-green-200 mt-4">
        <h4 className="font-medium text-green-900 mb-3">Import Results:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {details.databaseImported && (
            <div className="bg-white p-3 rounded border border-green-200">
              <div className="flex items-center space-x-2 text-green-700 mb-2">
                <Database className="w-4 h-4" />
                <span className="font-medium">Database Import</span>
              </div>
              <div className="text-green-600">
                <div>Tables: {details.databaseTables}</div>
                <div>Records: {details.databaseRecords}</div>
              </div>
            </div>
          )}
          
          {details.filesImported && (
            <div className="bg-white p-3 rounded border border-green-200">
              <div className="flex items-center space-x-2 text-green-700 mb-2">
                <Folder className="w-4 h-4" />
                <span className="font-medium">Files Import</span>
              </div>
              <div className="text-green-600">
                <div>Files Imported: {details.filesImportedCount}</div>
                <div>Files Skipped: {details.filesSkipped}</div>
              </div>
            </div>
          )}
        </div>
        
        {details.pathMappings && (
          <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
            <div className="flex items-center space-x-2 text-blue-700 mb-2">
              <Settings className="w-4 h-4" />
              <span className="font-medium">Path Mappings Applied</span>
            </div>
            <div className="text-blue-600 text-xs">
              Files have been restored to their original directory structure.
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Upload className="w-8 h-8 text-green-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">
              DMS Import System
            </h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Restore your Document Management System from previously exported backup files. 
            Import database tables, files, or complete system backups.
          </p>
        </div>

        {/* Progress Bar */}
        {importing && (
          <div className="mb-8 bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span className="font-medium">Importing DMS data...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-600 h-3 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Please wait while we restore your DMS data. This may take several minutes for large imports.
            </p>
          </div>
        )}

        {/* Status Message */}
        {status.message && (
          <div
            className={`flex items-start space-x-3 p-4 rounded-md mb-6 ${
              status.type === 'error' 
                ? 'bg-red-50 text-red-700 border border-red-200' 
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}
          >
            {status.type === 'error' ? (
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            ) : (
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <span className="text-sm">{status.message}</span>
              <FileDetails file={file} status={status} />
              <ImportResults status={status} />
            </div>
          </div>
        )}

        {/* File Upload Section */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 mb-8">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Select DMS Export File
              </h3>
              <p className="text-gray-600 mb-4 text-sm">
                Choose a ZIP file that was previously exported from the DMS system. 
                The file should contain database CSV files and/or document files with preserved structure.
              </p>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  id="import-file"
                  accept=".zip"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={importing}
                />
                <label
                  htmlFor="import-file"
                  className={`cursor-pointer inline-flex items-center space-x-2 px-4 py-2 rounded-md font-medium text-sm ${
                    importing
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>{file ? 'Change File' : 'Choose ZIP File'}</span>
                </label>
                {file && (
                  <div className="mt-3 text-sm text-gray-600">
                    Selected: <span className="font-medium">{file.name}</span>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Maximum file size: 500MB • ZIP format only
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Import Options */}
        {file && (
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Import Options
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">Import Database</div>
                  <div className="text-sm text-gray-600">Restore all database tables and records</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={importOptions.importDatabase}
                    onChange={() => handleOptionChange('importDatabase')}
                    className="sr-only peer"
                    disabled={importing}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">Import Files</div>
                  <div className="text-sm text-gray-600">Restore documents, profiles, and archive files</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={importOptions.importFiles}
                    onChange={() => handleOptionChange('importFiles')}
                    className="sr-only peer"
                    disabled={importing}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">Overwrite Existing</div>
                  <div className="text-sm text-gray-600">Replace existing data and files (use with caution)</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={importOptions.overwriteExisting}
                    onChange={() => handleOptionChange('overwriteExisting')}
                    className="sr-only peer"
                    disabled={importing}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Import Actions */}
        {file && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <button
              onClick={() => handleImport('database')}
              disabled={importing || !importOptions.importDatabase}
              className={`flex flex-col items-center p-4 rounded-lg border-2 ${
                importing || !importOptions.importDatabase
                  ? 'bg-gray-100 border-gray-300 cursor-not-allowed'
                  : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
              }`}
            >
              <Database className="w-8 h-8 text-blue-600 mb-2" />
              <span className="font-medium text-blue-900">Import Database Only</span>
              <span className="text-xs text-blue-700 mt-1">CSV tables and records</span>
            </button>

            <button
              onClick={() => handleImport('files')}
              disabled={importing || !importOptions.importFiles}
              className={`flex flex-col items-center p-4 rounded-lg border-2 ${
                importing || !importOptions.importFiles
                  ? 'bg-gray-100 border-gray-300 cursor-not-allowed'
                  : 'bg-green-50 border-green-200 hover:bg-green-100'
              }`}
            >
              <Folder className="w-8 h-8 text-green-600 mb-2" />
              <span className="font-medium text-green-900">Import Files Only</span>
              <span className="text-xs text-green-700 mt-1">Documents and folders</span>
            </button>

            <button
              onClick={() => handleImport('full')}
              disabled={importing}
              className={`flex flex-col items-center p-4 rounded-lg border-2 ${
                importing
                  ? 'bg-gray-100 border-gray-300 cursor-not-allowed'
                  : 'bg-purple-50 border-purple-200 hover:bg-purple-100'
              }`}
            >
              <Download className="w-8 h-8 text-purple-600 mb-2" />
              <span className="font-medium text-purple-900">Full System Import</span>
              <span className="text-xs text-purple-700 mt-1">Database + Files</span>
            </button>
          </div>
        )}

        {/* Information Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Import Instructions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-2 text-blue-900">📋 Before You Import:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Ensure you have a recent backup</li>
                <li>Verify the export file was created from this DMS version</li>
                <li>Check available disk space</li>
                <li>Stop any active DMS operations</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2 text-blue-900">⚙️ Import Features:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Automatic path mapping restoration</li>
                <li>Preserved directory structure</li>
                <li>Database relationship integrity</li>
                <li>Duplicate file handling</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
            <p className="text-sm text-yellow-800">
              ⚠️ <strong>Warning:</strong> Overwriting existing data cannot be undone. 
              Always test imports in a staging environment first.
            </p>
          </div>
        </div>

        {/* Navigation */}
        {/* <div className="mt-8 flex justify-center space-x-4">
          <button
            onClick={() => window.location.href = '/'}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
          <button
            onClick={() => window.location.href = '/export'}
            className="flex items-center space-x-2 px-4 py-2 text-blue-600 hover:text-blue-800 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Go to Export</span>
          </button>
        </div> */}
      </div>
    </div>
  );
};

export default Import;