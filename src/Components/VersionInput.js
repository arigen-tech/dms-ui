// components/VersionInput.jsx - Complete enhanced version

import React, { useState, useEffect, useRef } from 'react';
import { ArrowPathIcon, ChevronDownIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid';
import apiClient from '../API/apiClient';
import { API_HOST } from '../API/apiConfig';
import AutoTranslate from '../i18n/AutoTranslate';
import { getFallbackTranslation } from '../i18n/autoTranslator';
import { useLanguage } from '../i18n/LanguageContext';

const VersionInput = ({ 
  editingDoc, 
  selectedYear, 
  version, 
  setVersion,
  onVersionChange,
  disabled = false,
  uploadedFiles = [],
  showChangeType = true // ✅ NEW: Show change type selection
}) => {
  const { currentLanguage } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [isManualEdit, setIsManualEdit] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [versionInfo, setVersionInfo] = useState(null);
  const [suggestedVersion, setSuggestedVersion] = useState(null);
  const dropdownRef = useRef(null);
  const [isVersionManuallySet, setIsVersionManuallySet] = useState(false);
  
  // ✅ NEW: Change type state
  const [changeType, setChangeType] = useState('patch'); // 'patch' | 'minor' | 'major'
  const [validationError, setValidationError] = useState('');
  
  // ✅ NEW: Version format regex (semantic version)
  const VERSION_REGEX = /^\d+\.\d+(\.\d+)?$/;
  const VERSION_PARTS_REGEX = /^(\d+)\.(\d+)(?:\.(\d+))?$/;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowHistory(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset manual flag when selected year changes
  useEffect(() => {
    if (selectedYear?.id) {
      setIsVersionManuallySet(false);
      setIsManualEdit(false);
      setValidationError('');
    }
  }, [selectedYear?.id]);

  // Auto-fetch version when year, document, or uploaded files change
  useEffect(() => {
    if (editingDoc?.id && selectedYear?.id) {
      fetchNextVersion();
    } else if (!editingDoc && selectedYear?.id) {
      calculateNextVersionForNewDocument();
    }
  }, [editingDoc?.id, selectedYear?.id, uploadedFiles.length, changeType]);

  // ✅ NEW: Calculate version with change type
  const calculateVersionWithChangeType = (baseVersion, type) => {
    if (!baseVersion) return '1.0.0';
    
    const parts = baseVersion.match(VERSION_PARTS_REGEX);
    if (!parts) return baseVersion;
    
    let major = parseInt(parts[1]);
    let minor = parseInt(parts[2]);
    let patch = parts[3] ? parseInt(parts[3]) : 0;
    
    switch (type) {
      case 'major':
        major += 1;
        minor = 0;
        patch = 0;
        break;
      case 'minor':
        minor += 1;
        patch = 0;
        break;
      case 'patch':
        patch += 1;
        break;
      default:
        patch += 1;
    }
    
    return `${major}.${minor}.${patch}`;
  };

  // ✅ NEW: Find latest version from uploaded files
  const findLatestVersionFromFiles = (files, yearId) => {
    let maxMajor = 0;
    let maxMinor = 0;
    let maxPatch = 0;
    let latestVersion = null;
    
    files.forEach(file => {
      if (file.version && (file.yearMaster?.id === yearId || file.yearId === yearId)) {
        const parts = file.version.match(VERSION_PARTS_REGEX);
        if (parts) {
          const major = parseInt(parts[1]);
          const minor = parseInt(parts[2]);
          const patch = parts[3] ? parseInt(parts[3]) : 0;
          
          if (major > maxMajor || 
              (major === maxMajor && minor > maxMinor) ||
              (major === maxMajor && minor === maxMinor && patch > maxPatch)) {
            maxMajor = major;
            maxMinor = minor;
            maxPatch = patch;
            latestVersion = file.version;
          }
        }
      }
    });
    
    return latestVersion;
  };

  const calculateNextVersionForNewDocument = () => {
    if (!selectedYear?.id) return;
    
    const filesForYear = uploadedFiles.filter(
      file => file.yearMaster?.id === selectedYear.id || file.yearId === selectedYear.id
    );
    
    if (filesForYear.length === 0) {
      const initialVersion = '1.0.0';
      setSuggestedVersion(initialVersion);
      if (!isManualEdit && !isVersionManuallySet) {
        setVersion(initialVersion);
        if (onVersionChange) onVersionChange(initialVersion);
      }
      return;
    }
    
    const latestVersion = findLatestVersionFromFiles(filesForYear, selectedYear.id);
    if (latestVersion) {
      const nextVersion = calculateVersionWithChangeType(latestVersion, changeType);
      setSuggestedVersion(nextVersion);
      if (!isManualEdit && !isVersionManuallySet) {
        setVersion(nextVersion);
        if (onVersionChange) onVersionChange(nextVersion);
      }
    }
  };

  const fetchNextVersion = async () => {
    if (!editingDoc?.id || !selectedYear?.id) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.get(
        `${API_HOST}/api/documents/next-version/${editingDoc.id}/${selectedYear.id}`
      );
      
      if (response.data?.status === 200 && response.data?.response) {
        const nextVersion = response.data.response.nextVersion;
        const filesForYear = uploadedFiles.filter(
          file => file.yearMaster?.id === selectedYear.id || file.yearId === selectedYear.id
        );
        
        let finalVersion = nextVersion;
        if (filesForYear.length > 0) {
          const latestPendingVersion = findLatestVersionFromFiles(filesForYear, selectedYear.id);
          if (latestPendingVersion) {
            // Use the higher version between DB and pending
            const dbParts = nextVersion.match(VERSION_PARTS_REGEX);
            const pendingParts = latestPendingVersion.match(VERSION_PARTS_REGEX);
            
            if (dbParts && pendingParts) {
              const dbMajor = parseInt(dbParts[1]);
              const dbMinor = parseInt(dbParts[2]);
              const dbPatch = parseInt(dbParts[3] || 0);
              const pMajor = parseInt(pendingParts[1]);
              const pMinor = parseInt(pendingParts[2]);
              const pPatch = parseInt(pendingParts[3] || 0);
              
              // Compare versions
              if (pMajor > dbMajor || 
                  (pMajor === dbMajor && pMinor > dbMinor) ||
                  (pMajor === dbMajor && pMinor === dbMinor && pPatch > dbPatch)) {
                finalVersion = calculateVersionWithChangeType(latestPendingVersion, changeType);
              } else {
                finalVersion = calculateVersionWithChangeType(nextVersion, changeType);
              }
            }
          }
        } else {
          finalVersion = calculateVersionWithChangeType(nextVersion, changeType);
        }
        
        setSuggestedVersion(finalVersion);
        if (!isManualEdit && !isVersionManuallySet) {
          setVersion(finalVersion);
          if (onVersionChange) onVersionChange(finalVersion);
        }
      }
    } catch (error) {
      console.error('Failed to fetch next version:', error);
    } finally {
      setIsLoading(false);
    }
  };

    const fetchVersionHistory = async () => {
    if (!editingDoc?.id || !selectedYear?.id) return;

    try {
      const response = await apiClient.get(
        `${API_HOST}/api/documents/version-history/${editingDoc.id}/${selectedYear.id}`
      );
      
      if (response.data?.status === 200 && response.data?.response) {
        setVersionInfo(response.data.response);
      }
    } catch (error) {
      console.error('Failed to fetch version history:', error);
    }
  };

  // ✅ NEW: Validate version input
  const validateVersion = (value) => {
    if (!value) {
      setValidationError('Version is required');
      return false;
    }
    
    if (!VERSION_REGEX.test(value)) {
      setValidationError('Version must be in format: major.minor.patch (e.g., 1.2.3)');
      return false;
    }
    
    const parts = value.match(VERSION_PARTS_REGEX);
    if (parts) {
      const major = parseInt(parts[1]);
      const minor = parseInt(parts[2]);
      const patch = parseInt(parts[3] || 0);
      
      if (major < 0 || minor < 0 || patch < 0) {
        setValidationError('Version parts must be positive numbers');
        return false;
      }
      
      if (major > 999 || minor > 999 || patch > 999) {
        setValidationError('Version parts must be less than 1000');
        return false;
      }
    }
    
    setValidationError('');
    return true;
  };

  const handleVersionChange = (e) => {
    const newVersion = e.target.value;
    
    // ✅ NEW: Prevent invalid characters
    const sanitized = newVersion.replace(/[^0-9.]/g, '');
    
    // ✅ NEW: Prevent multiple dots in a row
    const finalVersion = sanitized.replace(/\.{2,}/g, '.');
    
    setVersion(finalVersion);
    setIsManualEdit(true);
    setIsVersionManuallySet(true);
    validateVersion(finalVersion);
    if (onVersionChange) onVersionChange(finalVersion);
  };

  const handleVersionBlur = (e) => {
    const value = e.target.value;
    if (value && VERSION_REGEX.test(value)) {
      // Ensure it ends with .0 if only major.minor
      const parts = value.split('.');
      if (parts.length === 2) {
        const formatted = `${parts[0]}.${parts[1]}.0`;
        setVersion(formatted);
        if (onVersionChange) onVersionChange(formatted);
      }
    }
  };

  const handleUseSuggested = () => {
    if (suggestedVersion && validateVersion(suggestedVersion)) {
      setVersion(suggestedVersion);
      setIsManualEdit(false);
      setIsVersionManuallySet(false);
      setValidationError('');
      if (onVersionChange) onVersionChange(suggestedVersion);
    }
  };

  const handleSelectVersionFromHistory = (selectedVersion) => {
    if (validateVersion(selectedVersion)) {
      setVersion(selectedVersion);
      setIsManualEdit(true);
      setIsVersionManuallySet(true);
      setShowHistory(false);
      if (onVersionChange) onVersionChange(selectedVersion);
    }
  };

  // ✅ NEW: Change type buttons
  const ChangeTypeSelector = () => (
    <div className="flex gap-1 mt-2">
      <button
        type="button"
        onClick={() => setChangeType('patch')}
        className={`px-3 py-1 text-xs rounded-md transition-colors ${
          changeType === 'patch' 
            ? 'bg-green-500 text-white' 
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
        title="Bug fix - increment patch (1.2.3 → 1.2.4)"
      >
        <AutoTranslate>Patch</AutoTranslate>
      </button>
      <button
        type="button"
        onClick={() => setChangeType('minor')}
        className={`px-3 py-1 text-xs rounded-md transition-colors ${
          changeType === 'minor' 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
        title="New feature - increment minor (1.2.3 → 1.3.0)"
      >
        <AutoTranslate>Minor</AutoTranslate>
      </button>
      <button
        type="button"
        onClick={() => setChangeType('major')}
        className={`px-3 py-1 text-xs rounded-md transition-colors ${
          changeType === 'major' 
            ? 'bg-red-500 text-white' 
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
        title="Breaking change - increment major (1.2.3 → 2.0.0)"
      >
        <AutoTranslate>Major</AutoTranslate>
      </button>
      
      {/* Change Type Indicator */}
      {suggestedVersion && (
        <span className="ml-2 text-xs text-gray-500 flex items-center">
          → {changeType === 'patch' && '🐛 Bug fix'}
          {changeType === 'minor' && '✨ New feature'}
          {changeType === 'major' && '⚠️ Breaking change'}
        </span>
      )}
    </div>
  );

  const isVersionAutoGenerated = !isManualEdit && !isVersionManuallySet && version === suggestedVersion;

  const getPendingFilesCount = () => {
    if (!selectedYear?.id) return 0;
    return uploadedFiles.filter(
      file => file.yearMaster?.id === selectedYear.id || file.yearId === selectedYear.id
    ).length;
  };

  const pendingCount = getPendingFilesCount();

  return (
    <div className="form-group" ref={dropdownRef}>
      <label className="flex items-center gap-2">
        <span><AutoTranslate>Version</AutoTranslate></span>
        {!isManualEdit && !isVersionManuallySet && suggestedVersion && (
          <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">
            <AutoTranslate>Auto</AutoTranslate>
          </span>
        )}
        {isManualEdit && (
          <span className="text-xs bg-yellow-500 text-white px-2 py-0.5 rounded-full">
            <AutoTranslate>Manual</AutoTranslate>
          </span>
        )}
        {pendingCount > 0 && (
          <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">
            {pendingCount} <AutoTranslate>pending</AutoTranslate>
          </span>
        )}
        <span className="text-xs text-gray-400 font-normal ml-1">
          (major.minor.patch)
        </span>
      </label>

      <div className="relative">
        <div className="flex gap-2">
          <div className="flex-1">
            <input
              type="text"
              value={version || ''}
              onChange={handleVersionChange}
              onBlur={handleVersionBlur}
              onFocus={() => setShowHistory(false)}
              placeholder={getFallbackTranslation('Enter version (e.g., 1.2.3)', currentLanguage)}
              disabled={disabled}
              className={`w-full border-2 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all
                ${validationError ? 'border-red-500 ring-red-500' : ''}
                ${isVersionAutoGenerated ? 'border-blue-500 bg-blue-50' : ''}
                ${isManualEdit && !validationError ? 'border-yellow-500 bg-yellow-50' : ''}
              `}
            />
            {validationError && (
              <div className="mt-1 flex items-center gap-1 text-red-500 text-xs">
                <ExclamationCircleIcon className="h-3 w-3" />
                <span>{validationError}</span>
              </div>
            )}
          </div>

          {/* Suggest Button */}
          <button
            type="button"
            onClick={fetchNextVersion}
            disabled={isLoading || (!editingDoc && !selectedYear) || disabled}
            className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 
                     transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center gap-1 whitespace-nowrap"
            title="Auto-generate next version"
          >
            <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="text-sm hidden sm:inline">
              <AutoTranslate>Suggest</AutoTranslate>
            </span>
          </button>

          {/* History Button */}
          {editingDoc?.id && selectedYear?.id && (
            <button
              type="button"
              onClick={() => {
                setShowHistory(!showHistory);
                if (!showHistory) fetchVersionHistory();
              }}
              disabled={disabled}
              className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 
                       transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center gap-1"
              title="View version history"
            >
              <ChevronDownIcon className={`h-4 w-4 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>

        {/* Change Type Selector */}
        {showChangeType && !disabled && (
          <ChangeTypeSelector />
        )}

        {/* Version Info Banner */}
        {version && suggestedVersion && !isManualEdit && !isVersionManuallySet && version === suggestedVersion && (
          <div className="mt-2 p-2 bg-green-50 rounded-lg border border-green-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700">
                <span className="font-medium"><AutoTranslate>Suggested</AutoTranslate>:</span> {suggestedVersion}
                {pendingCount > 0 && (
                  <span className="ml-2 text-xs text-orange-600">
                    ({pendingCount} file{pendingCount > 1 ? 's' : ''} in this year)
                  </span>
                )}
                {versionInfo?.totalVersions > 0 && !pendingCount && (
                  <span className="ml-2 text-xs text-gray-500">
                    ({versionInfo.totalVersions} {versionInfo.totalVersions === 1 ? 'version' : 'versions'} in DB)
                  </span>
                )}
              </span>
            </div>
            <button
              onClick={handleUseSuggested}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              <AutoTranslate>Use this</AutoTranslate>
            </button>
          </div>
        )}

        {isManualEdit && suggestedVersion && version !== suggestedVersion && !validationError && (
          <div className="mt-2 p-2 bg-yellow-50 rounded-lg border border-yellow-200 flex items-center justify-between">
            <span className="text-sm text-yellow-700">
              <span className="font-medium"><AutoTranslate>Suggested</AutoTranslate>:</span> {suggestedVersion}
              {pendingCount > 0 && (
                <span className="ml-2 text-xs text-orange-600">
                  ({pendingCount} file{pendingCount > 1 ? 's' : ''} pending)
                </span>
              )}
            </span>
            <button
              onClick={handleUseSuggested}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              <AutoTranslate>Use suggested</AutoTranslate>
            </button>
          </div>
        )}

        {/* Version History Dropdown */}
        {showHistory && versionInfo && (
          <div className="absolute z-20 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
            <div className="p-2 border-b bg-gray-50 sticky top-0 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                <AutoTranslate>Version History</AutoTranslate>
              </span>
              <span className="text-xs text-gray-500">
                {versionInfo.totalVersions || 0} {versionInfo.totalVersions === 1 ? 'version' : 'versions'}
              </span>
            </div>
            
            <div className="divide-y divide-gray-100">
              {versionInfo.history && versionInfo.history.length > 0 ? (
                versionInfo.history.map((item, idx) => (
                  <div
                    key={idx}
                    className={`px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between
                               transition-colors ${item.version === version ? 'bg-blue-50 border-l-4 border-blue-500' : ''}
                               ${item.isPending ? 'bg-orange-50' : ''}`}
                    onClick={() => {
                      if (!item.isPending) {
                        handleSelectVersionFromHistory(item.version);
                      }
                    }}
                    style={{ cursor: item.isPending ? 'default' : 'pointer' }}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`font-mono text-sm font-medium ${item.isPending ? 'text-orange-600' : ''}`}>
                        {item.version}
                      </span>
                      {item.isPending && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                          <AutoTranslate>Pending Upload</AutoTranslate>
                        </span>
                      )}
                      {item.status && !item.isPending && (
                        <span className={`text-xs px-2 py-0.5 rounded-full
                          ${item.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                            item.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'}`}>
                          {item.status}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {item.createdOn && !item.isPending && (
                        <span>{new Date(item.createdOn).toLocaleDateString('en-GB')}</span>
                      )}
                      {item.createdBy && !item.isPending && (
                        <span className="truncate max-w-[100px]">{item.createdBy}</span>
                      )}
                      {idx === 0 && !item.isPending && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          <AutoTranslate>Latest</AutoTranslate>
                        </span>
                      )}
                      {item.version === suggestedVersion && idx !== 0 && !item.isPending && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          <AutoTranslate>Suggested</AutoTranslate>
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-3 py-4 text-center text-sm text-gray-500">
                  <AutoTranslate>No version history found</AutoTranslate>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Version Format Hint */}
      <div className="mt-1 text-xs text-gray-400">
        <AutoTranslate>Format:</AutoTranslate> major.minor.patch (e.g., <span className="font-mono">1.2.3</span>)
        <span className="ml-2 text-gray-300">
          · {changeType === 'patch' && '🐛 Bug fix (1.2.3 → 1.2.4)'}
          {changeType === 'minor' && '✨ New feature (1.2.3 → 1.3.0)'}
          {changeType === 'major' && '⚠️ Breaking change (1.2.3 → 2.0.0)'}
        </span>
      </div>
    </div>
  );
};

export default VersionInput;