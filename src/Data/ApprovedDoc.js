import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { useLocation, useNavigate } from 'react-router-dom';
import {
  PencilIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  ArrowDownTrayIcon,
  QrCodeIcon,
  ArrowPathIcon,
  DocumentIcon,
  XMarkIcon,
  PrinterIcon,
  TrashIcon,
  CheckIcon,
  ShareIcon,
  ClockIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/solid";
import { API_HOST, DOCUMENTHEADER_API, FILETYPE_API, SYSTEM_ADMIN, BRANCH_ADMIN, DEPARTMENT_ADMIN, USER } from "../API/apiConfig";
import apiClient from "../API/apiClient";
import FilePreviewModal from "../Components/FilePreviewModal";
import LoadingComponent from "../Components/LoadingComponent";
import Popup from "../Components/Popup";
import AutoTranslate from '../i18n/AutoTranslate';
import { useLanguage } from '../i18n/LanguageContext';

const ApprovedDoc = () => {
  const {
    currentLanguage,
    defaultLanguage,
    translationStatus,
    isTranslationNeeded,
    availableLanguages,
    changeLanguage,
    translate,
    preloadTranslationsForTerms
  } = useLanguage();

  const navigate = useNavigate();
  const location = useLocation();
  const [documents, setDocuments] = useState([]);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [highlightedDocId, setHighlightedDocId] = useState(null);
  const [blobUrl, setBlobUrl] = useState("");
  const [contentType, setContentType] = useState("");
  const [selectedDocFile, setSelectedDocFiles] = useState(null);
  const [searchFileTerm, setSearchFileTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [openingFileIndex, setOpeningFileIndex] = useState(null);
  const [viewFileTypeModel, setViewFileTypeModel] = useState(false);
  const [filesType, setFilesType] = useState([]);
  const [openingFiles, setOpeningFiles] = useState(null);

  // State for file-level trash
  const [fileToDelete, setFileToDelete] = useState(null);
  const [confirmDeleteModalVisible, setConfirmDeleteModalVisible] = useState(false);
  const [isDeleteConfirmDisabled, setIsDeleteConfirmDisabled] = useState(false);
  const [popupMessage, setPopupMessage] = useState(null);

  // State for document-level bulk delete
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [selectAllDocsChecked, setSelectAllDocsChecked] = useState(false);
  const [bulkDocDeleteModalVisible, setBulkDocDeleteModalVisible] = useState(false);
  const [isBulkDocDeleting, setIsBulkDocDeleting] = useState(false);

  // State for file-level bulk delete (inside modal)
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectAllFilesChecked, setSelectAllFilesChecked] = useState(false);
  const [bulkFileDeleteModalVisible, setBulkFileDeleteModalVisible] = useState(false);
  const [isBulkFileDeleting, setIsBulkFileDeleting] = useState(false);

  // State for document sharing
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [documentToShare, setDocumentToShare] = useState(null);
  const [selectedFileIds, setSelectedFileIds] = useState([]); // New: Selected file IDs for sharing
  const [shareRecipients, setShareRecipients] = useState([]);
  const [availableEmployees, setAvailableEmployees] = useState([]);
  const [shareEndTime, setShareEndTime] = useState("");
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [sharingDocument, setSharingDocument] = useState(false);
  const [documentShares, setDocumentShares] = useState({});
  const [viewSharesModalVisible, setViewSharesModalVisible] = useState(false);
  const [selectedDocShares, setSelectedDocShares] = useState([]);
  const [revokeShareModalVisible, setRevokeShareModalVisible] = useState(false);
  const [shareToRevoke, setShareToRevoke] = useState(null);
  const [revokeReason, setRevokeReason] = useState("");


  const [shareDate, setShareDate] = useState("");
  const [shareTime, setShareTime] = useState("");
  // State for bulk sharing
  const [bulkShareModalVisible, setBulkShareModalVisible] = useState(false);
  const [isBulkSharing, setIsBulkSharing] = useState(false);

  // New state for tracking which documents have shares
  const [documentsWithShares, setDocumentsWithShares] = useState(new Set());

  // New state to track if modal was opened from a selected document
  const [modalOpenedFromSelectedDoc, setModalOpenedFromSelectedDoc] = useState(false);

  const token = localStorage.getItem("tokenKey");
  const UserId = localStorage.getItem("userId");
  const role = localStorage.getItem("role");

  // Get current date-time in format for datetime-local input (YYYY-MM-DDTHH:mm)
  const getCurrentDateTimeLocal = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Get minimum future datetime (current datetime)
  const getMinDateTime = () => {
    const now = new Date();

    // Get current date-time in ISO format (removing seconds/milliseconds)
    const isoString = now.toISOString();
    // Return format: YYYY-MM-DDTHH:mm (HTML5 datetime-local expects this)
    return isoString.substring(0, 16);
  };

  // Function to validate date-time input
  const validateDateTime = (selectedDateTime) => {
    if (!selectedDateTime) return { isValid: true, message: '' };

    const selected = new Date(selectedDateTime);
    const now = new Date();

    // If selected is in the past
    if (selected < now) {
      return {
        isValid: false,
        message: 'Cannot select past date/time'
      };
    }

    return { isValid: true, message: '' };
  };



  const getNextAvailableTime = () => {
    const now = new Date();
    let nextHour = now.getHours();
    let nextMinute = now.getMinutes();

    // Round up to next 30-minute interval
    if (nextMinute < 30) {
      nextMinute = 30;
    } else {
      nextMinute = 0;
      nextHour = nextHour + 1;
      if (nextHour >= 24) {
        nextHour = 0;
      }
    }

    return {
      hour: String(nextHour).padStart(2, '0'),
      minute: String(nextMinute).padStart(2, '0')
    };
  };
  const generateTimeOptions = () => {
    const options = [];
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // If no date is selected or date is today, disable past times
    const isToday = !shareDate ||
      shareDate === now.toISOString().split('T')[0];

    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) { // 30-minute intervals
        const hourStr = String(hour).padStart(2, '0');
        const minuteStr = String(minute).padStart(2, '0');
        const timeValue = `${hourStr}:${minuteStr}`;
        const displayTime = `${hourStr}:${minuteStr}`;

        let disabled = false;

        // If it's today, disable times in the past
        if (isToday) {
          if (hour < currentHour) {
            disabled = true;
          } else if (hour === currentHour && minute < currentMinute) {
            disabled = true;
          }
        }

        options.push({
          value: timeValue,
          label: displayTime,
          disabled: disabled
        });
      }
    }

    return options;
  };

  // Handle date-time change with validation
  const handleDateTimeChange = (e) => {
    const selectedValue = e.target.value;

    if (!selectedValue) {
      setShareEndTime("");
      return;
    }

    const validation = validateDateTime(selectedValue);
    if (!validation.isValid) {
      showPopup(validation.message, 'warning');
      // Set to current date-time
      setShareEndTime(getMinDateTime());
    } else {
      setShareEndTime(selectedValue);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "--";
    try {
      const date = new Date(dateString);
      const options = {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      };
      return date.toLocaleString("en-GB", options).replace(",", "");
    } catch (error) {
      return "--";
    }
  };

  const formatDateTime = (dateTimeInput) => {
    if (!dateTimeInput) return "--";

    try {
      let date;

      // Check if it's an array (from API response)
      if (Array.isArray(dateTimeInput)) {
        // Assuming format: [year, month, day, hour, minute, second, nanosecond]
        const [year, month, day, hour = 0, minute = 0, second = 0] = dateTimeInput;
        // Note: month is 1-based in API (1 = January), but Date constructor expects 0-based (0 = January)
        date = new Date(year, month - 1, day, hour, minute, second);
      } else if (typeof dateTimeInput === 'string') {
        // If it's a string, parse normally
        date = new Date(dateTimeInput);
      } else if (dateTimeInput instanceof Date) {
        // If it's already a Date object
        date = dateTimeInput;
      } else {
        return "--";
      }

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "--";
      }

      const options = {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      };
      return date.toLocaleString("en-GB", options);
    } catch (error) {
      console.error("Error formatting date:", error, dateTimeInput);
      return "--";
    }
  };

  // Calculate filtered documents
  const filteredDocuments = useMemo(() => {
    if (!documents) return [];

    return documents.filter((doc) =>
      Object.entries(doc).some(([key, value]) => {
        if (key === "categoryMaster" && value?.name) {
          return value.name.toLowerCase().includes(searchTerm.toLowerCase());
        }
        if (key === "employeeBy" && value) {
          return value.name?.toLowerCase().includes(searchTerm.toLowerCase());
        }
        if (key === "employee" && value) {
          return (
            value.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            value.department?.name
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            value.branch?.name?.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
        if (key === "documentDetails" && Array.isArray(value)) {
          // Only include documents that have at least one non-deleted file
          const hasNonDeletedFiles = value.some(file => !file.isDeleted);
          if (!hasNonDeletedFiles) return false;

          return value.some((file) =>
            !file.isDeleted && file.docName.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
        if (key === "updatedOn" || key === "createdOn") {
          const date = formatDate(value).toLowerCase();
          return date.includes(searchTerm.toLowerCase());
        }
        if (key === "approvalStatus" && value) {
          return value.toLowerCase().includes(searchTerm.toLowerCase());
        }
        if (key === "title" && value) {
          return value.toLowerCase().includes(searchTerm.toLowerCase());
        }
        if (key === "subject" && value) {
          return value.toLowerCase().includes(searchTerm.toLowerCase());
        }
        if (key === "fileNo" && value) {
          return value.toLowerCase().includes(searchTerm.toLowerCase());
        }
        return false;
      })
    )
      .sort((a, b) => {
        if (a.approvalStatus !== "Pending" && b.approvalStatus === "Pending") return -1;
        if (a.approvalStatus === "Pending" && b.approvalStatus !== "Pending") return 1;
        return new Date(b.approvalStatusOn || 0) - new Date(a.approvalStatusOn || 0);
      });
  }, [documents, searchTerm]);

  // Calculate pagination values
  const paginationValues = useMemo(() => {
    const totalItems = filteredDocuments.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const paginatedDocuments = filteredDocuments.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );

    return { totalItems, totalPages, paginatedDocuments };
  }, [filteredDocuments, currentPage, itemsPerPage]);

  const { totalItems, totalPages, paginatedDocuments } = paginationValues;

  const getPageNumbers = () => {
    const maxPageNumbers = 5;
    const startPage =
      Math.floor((currentPage - 1) / maxPageNumbers) * maxPageNumbers + 1;
    const endPage = Math.min(startPage + maxPageNumbers - 1, totalPages);
    return Array.from(
      { length: endPage - startPage + 1 },
      (_, i) => startPage + i
    );
  };

  // Check if a document has shares
  const checkIfDocumentHasShares = useCallback(async (docId) => {
    try {
      const response = await axios.get(
        `${API_HOST}/document-share/document/${docId}/shares`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const shares = response.data || [];
      return shares.length > 0;
    } catch (error) {
      console.error('Error checking document shares:', error);
      return false;
    }
  }, [token]);

  // Load all document shares on component mount
  const loadAllDocumentShares = useCallback(async () => {
    if (!documents || documents.length === 0) return;

    const sharesSet = new Set();

    for (const doc of documents) {
      try {
        const response = await axios.get(
          `${API_HOST}/document-share/document/${doc.id}/shares`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const shares = response.data || [];
        if (shares.length > 0) {
          sharesSet.add(doc.id);

          // Store the shares for this document
          setDocumentShares(prev => ({
            ...prev,
            [doc.id]: shares
          }));
        }
      } catch (error) {
        console.error(`Error loading shares for document ${doc.id}:`, error);
      }
    }

    setDocumentsWithShares(sharesSet);
  }, [documents, token]);

  useEffect(() => {
    console.log('🔍 ApprovedDoc Component - Language Status:', {
      currentLanguage,
      defaultLanguage,
      isTranslationNeeded: isTranslationNeeded(),
      translationStatus
    });
  }, [currentLanguage, defaultLanguage, translationStatus, isTranslationNeeded]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const notificationDocId = searchParams.get('docId');

    if (notificationDocId && documents?.length > 0) {
      const highlightId = parseInt(notificationDocId);
      setHighlightedDocId(highlightId);
      const pageForDocument = findPageForDocument(highlightId);
      setCurrentPage(pageForDocument);
    }
  }, [location.search, documents, itemsPerPage]);

  const findPageForDocument = (documentId) => {
    const documentIndex = filteredDocuments.findIndex(doc => doc.id === documentId);
    if (documentIndex !== -1) {
      return Math.ceil((documentIndex + 1) / itemsPerPage);
    }
    return 1;
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Load shares when documents are loaded
  useEffect(() => {
    if (documents.length > 0) {
      loadAllDocumentShares();
    }
  }, [documents, loadAllDocumentShares]);

  // Reset selected documents when documents change
  useEffect(() => {
    setSelectedDocuments([]);
    setSelectAllDocsChecked(false);
  }, [documents, currentPage, itemsPerPage]);

  // Update selectAllDocsChecked when paginated documents or selections change
  useEffect(() => {
    if (paginatedDocuments.length === 0) {
      setSelectAllDocsChecked(false);
      return;
    }

    const allSelected = paginatedDocuments.every(doc =>
      selectedDocuments.some(selected => selected.id === doc.id)
    );
    setSelectAllDocsChecked(allSelected);
  }, [selectedDocuments, paginatedDocuments]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      let response;

      if (role === USER) {
        response = await axios.get(
          `${API_HOST}/api/documents/approved/employee/${UserId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      } else if (
        role === SYSTEM_ADMIN ||
        role === BRANCH_ADMIN ||
        role === DEPARTMENT_ADMIN
      ) {
        response = await axios.get(`${API_HOST}/api/documents/approvedByEmp`, {
          headers: {
            Authorization: `Bearer ${token}`,
            employeeId: UserId,
          },
        });
      }

      const allDocuments = Array.isArray(response.data) ? response.data : [];
      // Filter to show only non-deleted documents
      const activeDocuments = allDocuments.filter(doc => !doc.isDeleted);
      setDocuments(activeDocuments);
      console.log("Fetched approved documents:", activeDocuments);
    } catch (error) {
      console.error("Error fetching documents:", error);
      setError("Failed to fetch documents. Please try again.");
      showPopup('Failed to fetch documents. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Function to handle document selection
  const handleSelectDocument = (doc) => {
    setSelectedDocuments(prev => {
      const isSelected = prev.some(d => d.id === doc.id);
      if (isSelected) {
        return prev.filter(d => d.id !== doc.id);
      } else {
        return [...prev, doc];
      }
    });
  };

  const handleSelectAllDocuments = () => {
    if (selectAllDocsChecked) {
      // Clear all selections
      setSelectedDocuments([]);
      setSelectAllDocsChecked(false);
    } else {
      // Select all paginated documents
      setSelectedDocuments([...paginatedDocuments]);
      setSelectAllDocsChecked(true);
    }
  };

  // Function to handle bulk document delete (move all approved files in selected documents to trash)
  const handleBulkDocumentDelete = () => {
    if (selectedDocuments.length === 0) {
      showPopup('Please select at least one document to move to trash.', 'warning');
      return;
    }
    setBulkDocDeleteModalVisible(true);
  };

  const confirmBulkDocumentDelete = async () => {
    setIsBulkDocDeleting(true);

    try {
      // Get all approved files from selected documents
      const allFilesToDelete = [];
      selectedDocuments.forEach(doc => {
        if (doc.documentDetails) {
          const approvedFiles = doc.documentDetails.filter(file =>
            file.status === "APPROVED" && !file.isDeleted
          );
          allFilesToDelete.push(...approvedFiles);
        }
      });

      if (allFilesToDelete.length === 0) {
        showPopup('No approved files found in selected documents.', 'warning');
        setIsBulkDocDeleting(false);
        setBulkDocDeleteModalVisible(false);
        return;
      }

      // Move all approved files to trash
      const deletePromises = allFilesToDelete.map(file =>
        axios.put(
          `${DOCUMENTHEADER_API}/delete-status/${file.id}`,
          null,
          {
            params: { isDeleted: true },
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        )
      );

      await Promise.all(deletePromises);

      // Refresh the documents list
      fetchDocuments();

      // Clear selections
      setSelectedDocuments([]);
      setSelectAllDocsChecked(false);
      setBulkDocDeleteModalVisible(false);

      showPopup(`${allFilesToDelete.length} approved file(s) from ${selectedDocuments.length} document(s) moved to trash successfully!`, 'success');
    } catch (error) {
      console.error('Error in bulk document delete:', error);
      showPopup('Failed to move some files to trash. Please try again!', 'error');
    } finally {
      setIsBulkDocDeleting(false);
    }
  };

  // Function to handle bulk document sharing - SHARES ALL APPROVED FILES
  const handleBulkDocumentShare = () => {
    if (selectedDocuments.length === 0) {
      showPopup('Please select at least one document to share.', 'warning');
      return;
    }

    // Check if all selected documents have approved files
    const documentsWithoutApprovedFiles = selectedDocuments.filter(doc => {
      const hasApprovedFiles = doc.documentDetails?.some(file =>
        file.status === "APPROVED" && !file.isDeleted
      );
      return !hasApprovedFiles;
    });

    if (documentsWithoutApprovedFiles.length > 0) {
      showPopup(`Cannot share ${documentsWithoutApprovedFiles.length} document(s) - they have no approved files.`, 'warning');
      return;
    }

    setBulkShareModalVisible(true);
    fetchDepartmentEmployees();
  };

  const confirmBulkDocumentShare = async () => {
    if (shareRecipients.length === 0) {
      showPopup('Please select at least one recipient', 'warning');
      return;
    }

    setIsBulkSharing(true);

    try {
      // Prepare bulk share request
      const bulkShareRequest = {
        documentHeaderIds: selectedDocuments.map(doc => doc.id),
        recipientIds: shareRecipients,
        endTime: shareEndTime ? new Date(shareEndTime).toISOString() : null
      };

      // Call bulk share endpoint
      const response = await axios.post(
        `${API_HOST}/document-share/bulk-share`,
        bulkShareRequest,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.status === 200) {
        const shareResponse = response.data.response;

        // Show success message
        if (shareResponse.totalFilesShared > 0) {
          showPopup(`Successfully shared ${shareResponse.totalFilesShared} file(s) across ${shareResponse.totalDocuments} document(s)!`, 'success');

          // Update share status for all shared documents
          selectedDocuments.forEach(doc => {
            setDocumentsWithShares(prev => new Set(prev).add(doc.id));

            // Refresh shares for this document
            fetchDocumentShares(doc.id);
          });
        } else {
          showPopup('No new files were shared. All files may have already been shared.', 'info');
        }
      } else {
        showPopup(response.data.message || 'Failed to share documents', 'error');
      }

      // Close modal and reset
      setBulkShareModalVisible(false);
      setShareRecipients([]);
      setShareEndTime("");

      // Clear selections
      setSelectedDocuments([]);
      setSelectAllDocsChecked(false);

    } catch (error) {
      console.error('Error in bulk document share:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to process bulk sharing. Please try again.';
      showPopup(errorMessage, 'error');
    } finally {
      setIsBulkSharing(false);
    }
  };

  // Get approved file IDs from a document
  const getApprovedFileIds = (doc) => {
    if (!doc.documentDetails) return [];
    return doc.documentDetails
      .filter(file => file.status === "APPROVED" && !file.isDeleted)
      .map(file => file.id);
  };

  // Get approved files from a document
  const getApprovedFiles = (doc) => {
    if (!doc.documentDetails) return [];
    return doc.documentDetails.filter(file => file.status === "APPROVED" && !file.isDeleted);
  };

  // Function to handle file deletion (move to trash) - single file
  const handleDeleteFile = (file) => {
    setFileToDelete(file);
    setConfirmDeleteModalVisible(true);
  };

  const confirmDeleteFile = async () => {
    setIsDeleteConfirmDisabled(true);

    if (fileToDelete) {
      try {
        // Call the API to move file to trash (set isDeleted = true)
        const response = await axios.put(
          `${DOCUMENTHEADER_API}/delete-status/${fileToDelete.id}`,
          null,
          {
            params: { isDeleted: true },
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        // Update the file in the selectedDoc documentDetails
        if (selectedDoc && selectedDoc.documentDetails) {
          const updatedDocumentDetails = selectedDoc.documentDetails.map(file =>
            file.id === fileToDelete.id ? { ...file, isDeleted: true } : file
          );

          setSelectedDoc({
            ...selectedDoc,
            documentDetails: updatedDocumentDetails
          });

          // Remove from selected files if present
          setSelectedFiles(prev => prev.filter(f => f.id !== fileToDelete.id));
          setSelectedFileIds(prev => prev.filter(id => id !== fileToDelete.id));
        }

        // Also update the document in the main documents list
        const updatedDocuments = documents.map(doc => {
          if (doc.id === selectedDoc?.id && doc.documentDetails) {
            const updatedDocDetails = doc.documentDetails.map(file =>
              file.id === fileToDelete.id ? { ...file, isDeleted: true } : file
            );

            // Check if all files in this document are deleted
            const allFilesDeleted = updatedDocDetails.every(file => file.isDeleted === true);

            return {
              ...doc,
              documentDetails: updatedDocDetails,
              isDeleted: allFilesDeleted
            };
          }
          return doc;
        }).filter(doc => !doc.isDeleted);

        setDocuments(updatedDocuments);

        setConfirmDeleteModalVisible(false);
        setFileToDelete(null);
        setIsDeleteConfirmDisabled(false);

        showPopup('File moved to trash successfully!', 'success');
      } catch (error) {
        console.error('Error deleting file:', error.response ? error.response.data : error.message);
        showPopup('Failed to move file to trash. Please try again!', 'error');
        setIsDeleteConfirmDisabled(false);
      }
    }
  };

  // Bulk file delete functions (inside modal)
  const handleSelectAllFiles = () => {
    if (!selectedDoc) return;

    const currentFilteredFiles = getCurrentFilteredFiles();

    if (selectAllFilesChecked) {
      // Clear all selections
      setSelectedFiles([]);
      setSelectedFileIds([]);
      setSelectAllFilesChecked(false);
    } else {
      // Select all filtered files that are APPROVED
      const approvedFiles = currentFilteredFiles.filter(file => file.status === "APPROVED");
      setSelectedFiles([...approvedFiles]);
      setSelectedFileIds(approvedFiles.map(file => file.id));
      setSelectAllFilesChecked(true);
    }
  };

  const handleSelectFile = (file) => {
    // Only allow selection of APPROVED files
    if (file.status !== "APPROVED") {
      showPopup('Only APPROVED files can be moved to trash.', 'warning');
      return;
    }

    setSelectedFiles(prev => {
      const isSelected = prev.some(f => f.id === file.id);
      if (isSelected) {
        const newFiles = prev.filter(f => f.id !== file.id);
        setSelectedFileIds(newFiles.map(f => f.id));
        return newFiles;
      } else {
        const newFiles = [...prev, file];
        setSelectedFileIds(newFiles.map(f => f.id));
        return newFiles;
      }
    });
  };

  const handleBulkFileDelete = () => {
    if (selectedFiles.length === 0) {
      showPopup('Please select at least one file to move to trash.', 'warning');
      return;
    }
    setBulkFileDeleteModalVisible(true);
  };

  const confirmBulkFileDelete = async () => {
    setIsBulkFileDeleting(true);

    try {
      const deletePromises = selectedFiles.map(file =>
        axios.put(
          `${DOCUMENTHEADER_API}/delete-status/${file.id}`,
          null,
          {
            params: { isDeleted: true },
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        )
      );

      await Promise.all(deletePromises);

      // Refresh the documents list
      fetchDocuments();

      // Update selectedDoc if modal is open
      if (selectedDoc) {
        const updatedDocumentDetails = selectedDoc.documentDetails.map(file =>
          selectedFiles.some(selected => selected.id === file.id)
            ? { ...file, isDeleted: true }
            : file
        );

        setSelectedDoc({
          ...selectedDoc,
          documentDetails: updatedDocumentDetails
        });
      }

      // Clear selections
      setSelectedFiles([]);
      setSelectedFileIds([]);
      setSelectAllFilesChecked(false);
      setBulkFileDeleteModalVisible(false);

      showPopup(`${selectedFiles.length} file(s) moved to trash successfully!`, 'success');
    } catch (error) {
      console.error('Error in bulk file delete:', error);
      showPopup('Failed to move some files to trash. Please try again!', 'error');
    } finally {
      setIsBulkFileDeleting(false);
    }
  };

  const getCurrentFilteredFiles = () => {
    if (!selectedDoc || !Array.isArray(selectedDoc.documentDetails)) return [];

    // Filter to show only non-deleted files
    return selectedDoc.documentDetails.filter((file) => {
      if (file.isDeleted) return false;

      const name = file.docName.toLowerCase();
      const version = String(file.version).toLowerCase();
      const term = searchFileTerm.toLowerCase();
      return name.includes(term) || version.includes(term);
    });
  };

  // Update selectAllFilesChecked when filtered files or selections change
  useEffect(() => {
    if (!selectedDoc) return;

    const currentFilteredFiles = getCurrentFilteredFiles();
    if (currentFilteredFiles.length === 0) {
      setSelectAllFilesChecked(false);
      return;
    }

    const approvedFiles = currentFilteredFiles.filter(file => file.status === "APPROVED");
    if (approvedFiles.length === 0) {
      setSelectAllFilesChecked(false);
      return;
    }

    const allSelected = approvedFiles.every(file =>
      selectedFiles.some(selected => selected.id === file.id)
    );
    setSelectAllFilesChecked(allSelected);
  }, [selectedFiles, selectedDoc, searchFileTerm]);

  const showPopup = (message, type = 'info') => {
    setPopupMessage({
      message,
      type,
      onClose: () => {
        setPopupMessage(null);
      }
    });
  };

  // When modal opens with selected document, check if it was selected in table
  useEffect(() => {
    if (selectedDoc) {
      setLoadingFiles(true);
      setTimeout(() => {
        setLoadingFiles(false);
      }, 300);

      // Check if this document is in the selectedDocuments list
      const isSelectedInTable = selectedDocuments.some(doc => doc.id === selectedDoc.id);

      if (isSelectedInTable || modalOpenedFromSelectedDoc) {
        // If document is selected in table OR modal was opened from selected doc, auto-select approved files for sharing
        const approvedFileIds = getApprovedFileIds(selectedDoc);
        setSelectedFileIds(approvedFileIds);
      } else {
        // Otherwise, don't auto-select files for sharing
        setSelectedFileIds([]);
      }
    }
  }, [selectedDoc]);

  const openFile = async (file) => {
    try {
      setOpeningFiles(true);

      const encodedPath = file.path
        .split("/")
        .map(encodeURIComponent)
        .join("/");

      const fileUrl = `${API_HOST}/api/documents/download/${encodedPath}?action=view`;

      const response = await apiClient.get(fileUrl, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: response.headers["content-type"] });
      const url = URL.createObjectURL(blob);

      setBlobUrl(url);
      setContentType(response.headers["content-type"]);
      setSearchFileTerm("");
      setIsModalOpen(true);
    } catch (error) {
      let errorMessage = "Failed to fetch or preview the file.";

      if (error.response) {
        const data = error.response.data;

        // If it's a Blob (common with responseType: 'blob'), read it as text
        if (data instanceof Blob) {
          try {
            const text = await data.text();           // read blob as text
            const json = JSON.parse(text);            // parse JSON
            errorMessage = json.message || `Error: ${error.response.status}`;
          } catch (e) {
            errorMessage = `Error: ${error.response.status}`;
          }
        } else if (typeof data === "object") {
          errorMessage = data.message || `Error: ${error.response.status}`;
        } else {
          errorMessage = `Error: ${error.response.status}`;
        }
      } else if (error.request) {
        errorMessage = "No response from server";
      } else {
        errorMessage = error.message;
      }

      showPopup(errorMessage, "error");
      console.error("Error fetching file:", errorMessage);
    } finally {
      setOpeningFiles(false);
    }
  };

  const handleDownload = async (file, action = "download") => {
    if (!selectedDoc) return;

    try {
      const branch = selectedDoc.employee?.branch?.name?.replace(/ /g, "_");
      const department = selectedDoc.employee?.department?.name?.replace(/ /g, "_");
      const year = file.year?.replace(/ /g, "_") || "unknown";
      const category = selectedDoc.categoryMaster?.name?.replace(/ /g, "_") || "unknown";
      const version = file.version;
      const fileName = file.docName?.replace(/ /g, "_");

      const fileUrl = `${API_HOST}/api/documents/download/${encodeURIComponent(branch)}/${encodeURIComponent(department)}/${encodeURIComponent(year)}/${encodeURIComponent(category)}/${encodeURIComponent(version)}/${encodeURIComponent(fileName)}?action=${action}`;

      const response = await apiClient.get(fileUrl, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });

      // Create a blob from the response
      const blob = new Blob([response.data], { type: response.headers["content-type"] });
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);

      if (action === "view") {
        window.open(link.href, "_blank");
      } else {
        link.download = file.docName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      URL.revokeObjectURL(link.href);
    } catch (error) {
      let msg = "Something went wrong";

      if (error.response) {
        const data = error.response.data;

        // If server returned a blob (like JSON error), read it as text
        if (data instanceof Blob) {
          try {
            const text = await data.text();       // read blob as text
            const json = JSON.parse(text);        // parse JSON
            msg = json.message || `Error: ${error.response.status}`;
          } catch (e) {
            // fallback if parsing fails
            msg = `Error: ${error.response.status}`;
          }
        } else if (typeof data === "object") {
          msg = data.message || `Error: ${error.response.status}`;
        } else {
          msg = `Error: ${error.response.status}`;
        }
      } else if (error.request) {
        msg = "No response from server";
      } else {
        msg = error.message;
      }

      showPopup(msg, "error");
    }
  };

  const filteredDocFiles = useMemo(() => {
    return getCurrentFilteredFiles();
  }, [selectedDoc, searchFileTerm]);

  const fetchQRCode = async (documentId) => {
    try {
      if (!token) {
        throw new Error("Authentication token is missing");
      }

      const apiUrl = `${DOCUMENTHEADER_API}/documents/download/qr/${documentId}`;

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch QR code");
      }

      const qrCodeBlob = await response.blob();

      if (!qrCodeBlob.type.includes("image/png")) {
        throw new Error("Received data is not a valid image");
      }

      const qrCodeUrl = window.URL.createObjectURL(qrCodeBlob);
      setQrCodeUrl(qrCodeUrl);
      setError("");
    } catch (error) {
      console.error("Error fetching QR code:", error);
      setQrCodeUrl(null);
    }
  };

  const handleEdit = (docId) => {
    const data = documents.find((item) => item.id === docId);
    navigate("/all-documents", { state: data });
  };

  const downloadQRCode = async () => {
    if (!selectedDoc?.id) {
      alert("Please select a document first");
      return;
    }

    try {
      if (!token) {
        throw new Error("Authentication token is missing");
      }

      const apiUrl = `${DOCUMENTHEADER_API}/documents/download/qr/${selectedDoc.id}`;

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch QR code");
      }

      const qrCodeBlob = await response.blob();
      const qrCodeUrl = window.URL.createObjectURL(qrCodeBlob);

      const link = document.createElement("a");
      link.href = qrCodeUrl;
      link.download = `QR_Code_${selectedDoc.id}.png`;
      link.click();

      window.URL.revokeObjectURL(qrCodeUrl);
    } catch (error) {
      console.error("Error downloading QR Code:", error);
      showPopup('Error downloading QR Code: ' + error.message, 'error');
    }
  };

  const handlePrintReport = async (id) => {
    if (!id) return;

    try {
      const response = await fetch(`http://localhost:8443/api/reports/document/${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/pdf",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to download PDF");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `document_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      showPopup('Error printing report: ' + error.message, 'error');
    }
  };

  const fetchFilesType = async () => {
    try {
      const response = await apiClient.get(`${FILETYPE_API}/getAllActive`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      setFilesType(response?.data?.response ?? []);
    } catch (error) {
      console.error('Error fetching Files Types:', error);
      setFilesType([]);
    }
  };

  const viewfiletype = () => {
    fetchFilesType();
    setViewFileTypeModel(true);
  };

  const handlecloseFileType = () => {
    setViewFileTypeModel(false);
  };

  const filteredFiles = (filesType ?? []).filter((file) =>
    file.filetype?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.extension?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openModal = (doc, fromSelectedDoc = false) => {
    setSelectedDoc(doc);
    setIsOpen(true);
    setModalOpenedFromSelectedDoc(fromSelectedDoc);
    fetchQRCode(doc.id);
    fetchDocumentShares(doc.id);
  };

  const closeModal = () => {
    setIsOpen(false);
    setSelectedDoc(null);
    setQrCodeUrl(null);
    setSelectedFiles([]);
    setSelectedFileIds([]);
    setSelectAllFilesChecked(false);
    setModalOpenedFromSelectedDoc(false);
  };

  // ==================== Document Sharing Functions ====================

  const fetchDepartmentEmployees = async () => {
    try {
      setLoadingEmployees(true);

      // Call the API endpoint that returns employees in current user's branch and department
      const response = await axios.get(
        `${API_HOST}/employee/current/branch-department`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Based on your response, the data is in response.data.response
      const employees = response?.data?.response || [];

      if (!Array.isArray(employees)) {
        console.error('Invalid response format:', response.data);
        showPopup('Invalid response format from server', 'error');
        setAvailableEmployees([]);
        return;
      }

      // ✅ Filter out current user & inactive employees
      const filteredEmployees = employees.filter(emp =>
        emp.id !== parseInt(UserId) && emp.active === true
      );

      setAvailableEmployees(filteredEmployees);

    } catch (error) {
      console.error('Error fetching department employees:', error);

      let errorMessage = 'Failed to load department employees';
      if (error.response?.status === 404) {
        errorMessage = 'API endpoint not found. Please check the URL.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication failed. Please login again.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      showPopup(errorMessage, 'error');
      setAvailableEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleShareDocument = (doc) => {
    setDocumentToShare(doc);
    setShareModalVisible(true);
    setShareRecipients([]);
    setShareEndTime("");

    // Auto-select all approved file IDs for this document
    const approvedFileIds = getApprovedFileIds(doc);
    setSelectedFileIds(approvedFileIds);

    fetchDepartmentEmployees();
  };

  const handleShareSubmit = async () => {
    if (!documentToShare || shareRecipients.length === 0) {
      showPopup('Please select at least one recipient', 'warning');
      return;
    }

    if (selectedFileIds.length === 0) {
      showPopup('No files selected to share', 'warning');
      return;
    }

    setSharingDocument(true);

    try {
      // Prepare share request - sending specific file IDs
      const shareRequest = {
        documentHeaderId: documentToShare.id,
        documentDetailIds: selectedFileIds, // Send the selected file IDs
        recipientIds: shareRecipients,
        endTime: shareEndTime ? new Date(shareEndTime).toISOString() : null
      };

      const response = await axios.post(
        `${API_HOST}/document-share/share`,
        shareRequest,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.status === 200) {
        const shareResponse = response.data.response;

        // Update share status for this document
        setDocumentsWithShares(prev => new Set(prev).add(documentToShare.id));

        // Refresh shares for this document
        fetchDocumentShares(documentToShare.id);

        // Show success message
        if (shareResponse.totalFilesShared > 0) {
          showPopup(`Successfully shared ${shareResponse.totalFilesShared} file(s)!`, 'success');
        } else {
          showPopup('Document shared successfully!', 'success');
        }

        setShareModalVisible(false);
        setDocumentToShare(null);
        setShareRecipients([]);
        setShareEndTime("");
        setSelectedFileIds([]);
      } else {
        showPopup(response.data.message || 'Failed to share document', 'error');
      }
    } catch (error) {
      console.error('Error sharing document:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to share document. Please try again.';
      showPopup(errorMessage, 'error');
    } finally {
      setSharingDocument(false);
    }
  };

  const fetchDocumentShares = async (documentHeaderId) => {
    try {
      const response = await axios.get(
        `${API_HOST}/document-share/document/${documentHeaderId}/shares`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const shares = response.data || [];

      // Update document shares state
      setDocumentShares(prev => ({
        ...prev,
        [documentHeaderId]: shares
      }));

      // Update documents with shares set
      if (shares.length > 0) {
        setDocumentsWithShares(prev => new Set(prev).add(documentHeaderId));
      } else {
        setDocumentsWithShares(prev => {
          const newSet = new Set(prev);
          newSet.delete(documentHeaderId);
          return newSet;
        });
      }

      return shares;
    } catch (error) {
      console.error('Error fetching document shares:', error);
      return [];
    }
  };

  const handleViewShares = (doc) => {
    const shares = documentShares[doc.id] || [];
    setSelectedDocShares(shares);
    setViewSharesModalVisible(true);
  };

  const handleRevokeShare = (share) => {
    setShareToRevoke(share);
    setRevokeReason("");
    setRevokeShareModalVisible(true);
  };

  const confirmRevokeShare = async () => {
    if (!shareToRevoke) return;

    try {
      const revokeRequest = {
        shareId: shareToRevoke.id,
        reason: revokeReason
      };

      const response = await axios.post(
        `${API_HOST}/document-share/revoke`,
        revokeRequest,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.status === 200) {
        showPopup('Share revoked successfully!', 'success');
        setRevokeShareModalVisible(false);
        setShareToRevoke(null);
        setRevokeReason("");

        // Refresh shares for the document
        if (selectedDoc) {
          fetchDocumentShares(selectedDoc.id);
        }

        // Update view shares modal if open
        if (viewSharesModalVisible) {
          setSelectedDocShares(prev => prev.filter(share => share.id !== shareToRevoke.id));
        }

        // Update documents with shares set
        const documentId = shareToRevoke.documentHeaderId || (selectedDoc?.id);
        if (documentId) {
          // Check if document still has shares
          const currentShares = documentShares[documentId] || [];
          const remainingShares = currentShares.filter(s => s.id !== shareToRevoke.id);

          if (remainingShares.length === 0) {
            setDocumentsWithShares(prev => {
              const newSet = new Set(prev);
              newSet.delete(documentId);
              return newSet;
            });
          }
        }
      } else {
        showPopup(response.data.message || 'Failed to revoke share', 'error');
      }
    } catch (error) {
      console.error('Error revoking share:', error);
      showPopup('Failed to revoke share. Please try again.', 'error');
    }
  };

  if (loading) {
    return <LoadingComponent />;
  }

  return (
    <div className="px-1">
      <h1 className="text-xl mb-4 font-semibold">
        <AutoTranslate>Approved Documents</AutoTranslate>
      </h1>

      {popupMessage && (
        <Popup
          message={popupMessage.message}
          type={popupMessage.type}
          onClose={popupMessage.onClose}
        />
      )}

      <div className="bg-white p-4 rounded-lg shadow-sm">
        {error && <div className="text-red-500 mb-4">{error}</div>}

        <div className="mb-4 bg-slate-100 p-4 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center bg-blue-500 rounded-lg w-full flex-1 md:w-1/2">
            <label
              htmlFor="itemsPerPage"
              className="mr-2 ml-2 text-white text-sm"
            >
              <AutoTranslate>Show:</AutoTranslate>
            </label>
            <select
              id="itemsPerPage"
              className="border rounded-r-lg p-1.5 outline-none w-full"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              {[5, 10, 15, 20].map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center w-full md:w-auto flex-1">
            <input
              type="text"
              placeholder="Search..."
              className="border rounded-l-md p-1 outline-none w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <MagnifyingGlassIcon className="text-white bg-blue-500 rounded-r-lg h-8 w-8 border p-1.5" />
          </div>
        </div>

        {/* Bulk Action Bar - NOW WITH SHARE BUTTON */}
        {selectedDocuments.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center">
              <CheckIcon className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-blue-700">
                <AutoTranslate>{selectedDocuments.length} document(s) selected</AutoTranslate>
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleBulkDocumentShare}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200"
                disabled={isBulkSharing}
              >
                <ShareIcon className="h-4 w-4" />
                {isBulkSharing ? (
                  <AutoTranslate>Sharing...</AutoTranslate>
                ) : (
                  <AutoTranslate>Share Selected</AutoTranslate>
                )}
              </button>
              <button
                onClick={handleBulkDocumentDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200"
                disabled={isBulkDocDeleting}
              >
                <TrashIcon className="h-4 w-4" />
                {isBulkDocDeleting ? (
                  <AutoTranslate>Processing...</AutoTranslate>
                ) : (
                  <AutoTranslate>Move Selected to Trash</AutoTranslate>
                )}
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-slate-100">
                <th className="border p-2 text-left">
                  <input
                    type="checkbox"
                    checked={selectAllDocsChecked}
                    onChange={handleSelectAllDocuments}
                    className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    title="Select all documents"
                  />
                </th>

                <th className="border p-2 text-left">
                  <AutoTranslate>SN</AutoTranslate>
                </th>
                <th className="border p-2 text-left">
                  <AutoTranslate>File No</AutoTranslate>
                </th>
                <th className="border p-2 text-left">
                  <AutoTranslate>Title</AutoTranslate>
                </th>
                <th className="border p-2 text-left">
                  <AutoTranslate>Subject</AutoTranslate>
                </th>
                <th className="border p-2 text-left">
                  <AutoTranslate>Category</AutoTranslate>
                </th>
                <th className="border p-2 text-left">
                  <AutoTranslate>No. Of Attached Files</AutoTranslate>
                </th>

                <th className="border p-2 text-left">
                  <AutoTranslate>View</AutoTranslate>
                </th>
                <th className="border p-2 text-left">
                  <AutoTranslate>Share</AutoTranslate>
                </th>
                <th className="border p-2 text-left">
                  <AutoTranslate>Trash</AutoTranslate>
                </th>
              </tr>
            </thead>

            <tbody>
              {paginatedDocuments.length > 0 ? (
                paginatedDocuments.map((doc, index) => {
                  const isSelected = selectedDocuments.some(d => d.id === doc.id);
                  const hasShares = documentsWithShares.has(doc.id);
                  const hasApprovedFiles = doc.documentDetails?.some(file =>
                    file.status === "APPROVED" && !file.isDeleted
                  );

                  return (
                    <tr
                      key={doc.id}
                      className={
                        doc.id === highlightedDocId
                          ? 'bg-yellow-100'
                          : isSelected
                            ? 'bg-blue-50'
                            : ''
                      }
                    >
                      <td className="border p-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectDocument(doc)}
                          className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                        />
                      </td>

                      <td className="border p-2">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>

                      <td className="border p-2">{doc.fileNo || "N/A"}</td>
                      <td className="border p-2">{doc.title || "N/A"}</td>
                      <td className="border p-2">{doc.subject || "N/A"}</td>

                      <td className="border p-2">
                        {doc.categoryMaster?.name || <AutoTranslate>No Category</AutoTranslate>}
                      </td>

                      <td className="border p-2">
                        {doc.documentDetails?.length || 0}
                      </td>

                      {/* View Button Column */}
                      <td className="border p-2">
                        <div className="flex justify-center">
                          <button
                            onClick={() => openModal(doc, isSelected)}
                            title={`View details for ${doc.title || "this document"}`}
                            className="p-1.5 rounded hover:bg-blue-100 text-blue-600 transition-colors duration-200"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>

                      {/* Share Button Column */}
                      <td className="border p-2">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => {
                              // Open modal first, then open share modal
                              openModal(doc, true);
                              // Set a timeout to open share modal after document modal opens
                              setTimeout(() => {
                                handleShareDocument(doc);
                              }, 100);
                            }}
                            title="Share document within department"
                            className={`p-1.5 rounded transition-colors duration-200 ${hasApprovedFiles
                              ? 'hover:bg-green-100 text-green-600'
                              : 'text-gray-400 cursor-not-allowed'
                              }`}
                            disabled={!hasApprovedFiles}
                          >
                            <ShareIcon className="h-5 w-5" />
                          </button>
                          {hasShares && (
                            <button
                              onClick={() => handleViewShares(doc)}
                              title="View shared access"
                              className="p-1.5 rounded hover:bg-purple-100 text-purple-600 transition-colors duration-200"
                            >
                              <UserGroupIcon className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Trash Button Column */}
                      <td className="border p-2">
                        <div className="flex justify-center">
                          <button
                            onClick={() => {
                              // For single document, add it to selection and show bulk delete modal
                              setSelectedDocuments([doc]);
                              setBulkDocDeleteModalVisible(true);
                            }}
                            title="Move to trash"
                            className={`p-1.5 rounded transition-colors duration-200 ${hasApprovedFiles
                              ? 'hover:bg-red-100 text-red-600'
                              : 'text-gray-400 cursor-not-allowed'
                              }`}
                            disabled={!hasApprovedFiles}
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={10}
                    className="border p-4 text-center text-gray-500"
                  >
                    <AutoTranslate>No data found.</AutoTranslate>
                  </td>
                </tr>
              )}
            </tbody>

          </table>

          <FilePreviewModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onDownload={(file, action = "download") => handleDownload(file, action)}
            fileType={contentType}
            fileUrl={blobUrl}
            fileName={selectedDocFile?.docName}
            fileData={selectedDocFile}
          />

          {/* Document Details Modal */}
          {isOpen && selectedDoc && (
            <div className="fixed inset-0 flex items-center justify-center z-50 bg-gray-900/80 backdrop-blur-sm print:bg-white overflow-y-auto p-4">
              <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-7xl p-6 my-8 mx-auto">
                <div className="max-h-[90vh] overflow-y-auto print:overflow-visible print:max-h-none">

                  <div className="flex justify-between items-center mb-6 no-print">
                    <div className="flex items-center space-x-2">
                      <div className="bg-indigo-600 text-white rounded-lg p-2">
                        <span className="text-lg font-bold">D</span>
                        <span className="text-lg font-bold">MS</span>
                      </div>
                      <h1 className="text-2xl font-bold text-gray-800">
                        <AutoTranslate>Document Details</AutoTranslate>
                      </h1>
                    </div>

                    {/* Auto-selection Notification Banner */}
                    {(selectedFileIds.length > 0 && (modalOpenedFromSelectedDoc || selectedDocuments.some(d => d.id === selectedDoc.id))) && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center">
                          <CheckIcon className="h-5 w-5 text-blue-600 mr-2" />
                          <span className="text-blue-700 font-medium">
                            <AutoTranslate>{selectedFileIds.length} approved file(s) auto-selected for sharing</AutoTranslate>
                          </span>
                        </div>
                        <p className="text-sm text-blue-600 mt-1">
                          <AutoTranslate>All approved files are selected because this document was selected in the table.</AutoTranslate>
                        </p>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => handlePrintReport(selectedDoc?.id)}
                        className="flex items-center gap-2 px-4 py-2 text-indigo-600 hover:text-indigo-800 transition-colors duration-200 bg-indigo-50 hover:bg-indigo-100 rounded-lg"
                        title="Print document"
                      >
                        <PrinterIcon className="h-5 w-5" />
                        <span><AutoTranslate>Print</AutoTranslate></span>
                      </button>
                      <button
                        onClick={closeModal}
                        className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-red-600 transition-colors duration-200 bg-gray-100 hover:bg-gray-200 rounded-lg"
                        title="Close modal"
                      >
                        <XMarkIcon className="h-5 w-5" />
                        <span><AutoTranslate>Close</AutoTranslate></span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <div className="lg:col-span-2 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { label: "Branch", value: selectedDoc?.branchMaster?.name },
                          { label: "Department", value: selectedDoc?.departmentMaster?.name },
                          { label: "File No.", value: selectedDoc?.fileNo },
                          { label: "Title", value: selectedDoc?.title },
                          { label: "Subject", value: selectedDoc?.subject },
                          { label: "Category", value: selectedDoc?.categoryMaster?.name || <AutoTranslate>No Category</AutoTranslate> },
                          { label: "Upload By", value: selectedDoc?.employee?.name },
                        ].map((item, idx) => (
                          <div key={idx} className="space-y-1">
                            <p className="text-sm font-medium text-gray-500">
                              <AutoTranslate>{item.label}</AutoTranslate>
                            </p>
                            <p className="text-gray-900 font-medium">
                              {item.value || <span className="text-gray-400"><AutoTranslate>N/A</AutoTranslate></span>}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-700 mb-4">
                        <AutoTranslate>QR Code</AutoTranslate>
                      </h3>
                      {selectedDoc?.qrPath ? (
                        <>
                          <div className="p-3 bg-white rounded-lg border border-gray-300">
                            <img
                              src={qrCodeUrl}
                              alt="QR Code"
                              className="w-32 h-32 object-contain"
                            />
                          </div>
                          <button
                            onClick={downloadQRCode}
                            className="mt-4 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                          >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                            <AutoTranslate>Download QR</AutoTranslate>
                          </button>
                        </>
                      ) : (
                        <div className="text-center text-gray-500 py-8">
                          <QrCodeIcon className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                          <p><AutoTranslate>No QR code available</AutoTranslate></p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Attached Files Section */}
                  <div className="border-t border-gray-200 pt-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                      <h2 className="text-xl font-semibold text-gray-800">
                        <AutoTranslate>Attached Files</AutoTranslate>
                        <span className="ml-2 text-sm font-normal text-gray-600">
                          ({selectedFiles.length} selected for trash, {selectedFileIds.length} selected for sharing)
                        </span>
                      </h2>
                      <div className="flex items-center gap-4">
                        <div className="relative w-full sm:w-64">
                          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search files..."
                            value={searchFileTerm}
                            onChange={(e) => setSearchFileTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>

                        {/* Share Button - Moved here between search and trash */}
                        <button
                          onClick={() => handleShareDocument(selectedDoc)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 whitespace-nowrap"
                          title="Share document"
                        >
                          <ShareIcon className="h-4 w-4" />
                          <AutoTranslate>Share ({selectedFileIds.length} files)</AutoTranslate>
                        </button>

                        {/* View Shares Button */}
                        {documentsWithShares.has(selectedDoc.id) && (
                          <button
                            onClick={() => handleViewShares(selectedDoc)}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors duration-200 whitespace-nowrap"
                            title="View shared access"
                          >
                            <UserGroupIcon className="h-4 w-4" />
                            <AutoTranslate>View Shares ({documentShares[selectedDoc.id]?.length || 0})</AutoTranslate>
                          </button>
                        )}

                        {selectedFiles.length > 0 && (
                          <button
                            onClick={handleBulkFileDelete}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 whitespace-nowrap"
                          >
                            <TrashIcon className="h-4 w-4" />
                            <span><AutoTranslate>Move to Trash ({selectedFiles.length})</AutoTranslate></span>
                          </button>
                        )}
                      </div>
                    </div>

                    {loadingFiles ? (
                      <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        <span className="ml-3 text-gray-600">
                          <AutoTranslate>Loading files...</AutoTranslate>
                        </span>
                      </div>
                    ) : selectedDoc && filteredDocFiles.length > 0 ? (
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        {/* Desktop View Table Header - Added Checkbox columns */}
                        <div className="hidden md:grid grid-cols-[15fr_25fr_25fr_10fr_10fr_10fr_15fr_15fr_20fr_10fr_10fr] bg-gray-50 text-gray-600 font-medium text-sm px-6 py-3">
                          <span className="text-left">
                            <input
                              type="checkbox"
                              checked={selectAllFilesChecked}
                              onChange={handleSelectAllFiles}
                              className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                              title="Select all APPROVED files for trash"
                            />
                          </span>
                          <span className="text-left">
                            <input
                              type="checkbox"
                              checked={selectedFileIds.length === getApprovedFileIds(selectedDoc).length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedFileIds(getApprovedFileIds(selectedDoc));
                                } else {
                                  setSelectedFileIds([]);
                                }
                              }}
                              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                              title="Select all APPROVED files for sharing"
                            />
                          </span>
                          <span className="text-left">
                            <AutoTranslate>File Name</AutoTranslate>
                          </span>
                          <span className="text-center">
                            <AutoTranslate>Year</AutoTranslate>
                          </span>
                          <span className="text-center">
                            <AutoTranslate>Version</AutoTranslate>
                          </span>
                          <span className="text-center">
                            <AutoTranslate>Status</AutoTranslate>
                          </span>
                          <span className="text-center">
                            <AutoTranslate>Action By</AutoTranslate>
                          </span>
                          <span className="text-center">
                            <AutoTranslate>Action Date</AutoTranslate>
                          </span>
                          <span className="text-center">
                            <AutoTranslate>Reason</AutoTranslate>
                          </span>
                          <span className="text-center no-print">
                            <AutoTranslate>View</AutoTranslate>
                          </span>
                          <span className="text-center no-print">
                            <AutoTranslate>Action</AutoTranslate>
                          </span>
                        </div>

                        <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                          {filteredDocFiles.map((file, index) => {
                            const isSelectedForTrash = selectedFiles.some(f => f.id === file.id);
                            const isSelectedForShare = selectedFileIds.includes(file.id);
                            const canDelete = file.status === "APPROVED";
                            const canShare = file.status === "APPROVED" && !file.isDeleted;

                            return (
                              <div key={index} className={`hover:bg-gray-50 transition-colors duration-150 ${isSelectedForTrash ? 'bg-blue-50' : ''}`}>
                                {/* Desktop View */}
                                <div className="hidden md:grid grid-cols-[15fr_25fr_25fr_10fr_10fr_10fr_15fr_15fr_20fr_10fr_10fr] items-center px-6 py-4 text-sm">
                                  <div className="text-left">
                                    {canDelete ? (
                                      <input
                                        type="checkbox"
                                        checked={isSelectedForTrash}
                                        onChange={() => handleSelectFile(file)}
                                        className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                      />
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </div>
                                  <div className="text-left">
                                    {canShare ? (
                                      <input
                                        type="checkbox"
                                        checked={isSelectedForShare}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedFileIds(prev => [...prev, file.id]);
                                          } else {
                                            setSelectedFileIds(prev => prev.filter(id => id !== file.id));
                                          }
                                        }}
                                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                      />
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </div>
                                  <div className="text-left text-gray-800 break-words">
                                    <strong>{index + 1}.</strong> {file.docName}
                                  </div>
                                  <div className="text-center text-gray-700">{file.yearMaster?.name || "--"}</div>
                                  <div className="text-center text-gray-700">{file.version}</div>
                                  <div className="text-center">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${file.status === "APPROVED" ? "bg-green-100 text-green-800" :
                                        file.status === "REJECTED" ? "bg-red-100 text-red-800" :
                                          "bg-yellow-100 text-yellow-800"}`}
                                    >
                                      {file.status || <AutoTranslate>PENDING</AutoTranslate>}
                                    </span>
                                  </div>
                                  <div className="text-center text-gray-700">{file.approvedBy || "--"}</div>
                                  <div className="text-center text-gray-700">{formatDate(file.approvedOn)}</div>
                                  <div className="text-center text-gray-700 break-words">{file.rejectionReason || "--"}</div>
                                  <div className="flex justify-center no-print">
                                    <button
                                      onClick={() => {
                                        setOpeningFileIndex(index);
                                        setSelectedDocFiles(file);
                                        openFile(file).finally(() => setOpeningFileIndex(null));
                                      }}
                                      disabled={openingFileIndex !== null}
                                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200
                          ${openingFileIndex === index ?
                                          "bg-indigo-400 cursor-not-allowed" :
                                          "bg-indigo-600 hover:bg-indigo-700"} text-white`}
                                    >
                                      {openingFileIndex === index ? (
                                        <>
                                          <ArrowPathIcon className="h-3 w-3 animate-spin" />
                                          <AutoTranslate>
                                            {file.ltoArchived && !file.restored ? "Restoring..." : "Opening..."}
                                          </AutoTranslate>
                                        </>
                                      ) : (
                                        <>
                                          {file.ltoArchived && !file.restored ? (
                                            <ArrowPathIcon className="h-3 w-3" />
                                          ) : (
                                            <EyeIcon className="h-3 w-3" />
                                          )}
                                          <AutoTranslate>
                                            {file.ltoArchived && !file.restored ? "Restore" : "View"}
                                          </AutoTranslate>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                  <div className="flex justify-center no-print">
                                    {canDelete && (
                                      <button
                                        onClick={() => handleDeleteFile(file)}
                                        className="p-1.5 rounded-full bg-red-100 hover:bg-red-200 text-red-700"
                                        title="Move to Trash"
                                      >
                                        <TrashIcon className="h-5 w-5" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Mobile View */}
                                <div className="md:hidden p-4">
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center">
                                      <div className="flex items-center mr-2">
                                        {canDelete && (
                                          <input
                                            type="checkbox"
                                            checked={isSelectedForTrash}
                                            onChange={() => handleSelectFile(file)}
                                            className="h-4 w-4 mr-1 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                          />
                                        )}
                                        {canShare && (
                                          <input
                                            type="checkbox"
                                            checked={isSelectedForShare}
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                setSelectedFileIds(prev => [...prev, file.id]);
                                              } else {
                                                setSelectedFileIds(prev => prev.filter(id => id !== file.id));
                                              }
                                            }}
                                            className="h-4 w-4 mr-1 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                          />
                                        )}
                                      </div>
                                      <div className="text-left text-gray-800 break-words flex-1">
                                        <strong>{index + 1}.</strong> {file.docName}
                                      </div>
                                    </div>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-2
                        ${file.status === "APPROVED" ? "bg-green-100 text-green-800" :
                                        file.status === "REJECTED" ? "bg-red-100 text-red-800" :
                                          "bg-yellow-100 text-yellow-800"}`}
                                    >
                                      {file.status || <AutoTranslate>PENDING</AutoTranslate>}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                                    <div>
                                      <p className="text-xs text-gray-500"><AutoTranslate>Year</AutoTranslate></p>
                                      <p className="text-gray-700">{file.yearMaster?.name || "--"}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500"><AutoTranslate>Version</AutoTranslate></p>
                                      <p className="text-gray-700">{file.version}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500"><AutoTranslate>Action By</AutoTranslate></p>
                                      <p className="text-gray-700">{file.approvedBy || "--"}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500"><AutoTranslate>Action Date</AutoTranslate></p>
                                      <p className="text-gray-700">{formatDate(file.approvedOn)}</p>
                                    </div>
                                    <div className="col-span-2">
                                      <p className="text-xs text-gray-500"><AutoTranslate>Reason</AutoTranslate></p>
                                      <p className="text-gray-700 break-words">{file.rejectionReason || "--"}</p>
                                    </div>
                                  </div>

                                  <div className="mt-3 flex justify-between items-center">
                                    <button
                                      onClick={() => {
                                        setOpeningFileIndex(index);
                                        setSelectedDocFiles(file);
                                        openFile(file).finally(() => setOpeningFileIndex(null));
                                      }}
                                      disabled={openingFileIndex !== null}
                                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200
                          ${openingFileIndex === index ?
                                          "bg-indigo-400 cursor-not-allowed" :
                                          "bg-indigo-600 hover:bg-indigo-700"} text-white`}
                                    >
                                      {openingFileIndex === index ? (
                                        <>
                                          <ArrowPathIcon className="h-3 w-3 animate-spin" />
                                          <AutoTranslate>
                                            {file.ltoArchived && !file.restored ? "Restoring..." : "Opening..."}
                                          </AutoTranslate>
                                        </>
                                      ) : (
                                        <>
                                          {file.ltoArchived && !file.restored ? (
                                            <ArrowPathIcon className="h-3 w-3" />
                                          ) : (
                                            <EyeIcon className="h-3 w-3" />
                                          )}
                                          <AutoTranslate>
                                            {file.ltoArchived && !file.restored ? "Restore" : "View File"}
                                          </AutoTranslate>
                                        </>
                                      )}
                                    </button>

                                    <div className="flex gap-2">
                                      {canDelete && (
                                        <button
                                          onClick={() => handleDeleteFile(file)}
                                          className="p-1.5 rounded-full bg-red-100 hover:bg-red-200"
                                          title="Move to Trash"
                                        >
                                          <TrashIcon className="h-5 w-5 text-red-700" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
                        <DocumentIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500">
                          <AutoTranslate>No attached files found</AutoTranslate>
                        </p>
                        {searchFileTerm && (
                          <p className="text-sm text-gray-400 mt-1">
                            <AutoTranslate>Try adjusting your search term</AutoTranslate>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Confirmation Modal for Single File Deletion */}
          {confirmDeleteModalVisible && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
                <h2 className="text-lg font-semibold mb-4">
                  <AutoTranslate>Move to Trash</AutoTranslate>
                </h2>
                <p className="mb-4">
                  <AutoTranslate>Are you sure you want to move this file to trash?</AutoTranslate>
                  <br />
                  <strong>"{fileToDelete?.docName}"</strong>
                </p>
                <div className="flex justify-end gap-4">
                  <button
                    onClick={() => setConfirmDeleteModalVisible(false)}
                    className="bg-gray-300 hover:bg-gray-400 p-2 rounded-lg transition-colors"
                    disabled={isDeleteConfirmDisabled}
                  >
                    <AutoTranslate>Cancel</AutoTranslate>
                  </button>
                  <button
                    onClick={confirmDeleteFile}
                    disabled={isDeleteConfirmDisabled}
                    className={`px-4 py-2 rounded-md text-white ${isDeleteConfirmDisabled
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700'} transition-colors`}
                  >
                    {isDeleteConfirmDisabled ? (
                      <AutoTranslate>Processing...</AutoTranslate>
                    ) : (
                      <AutoTranslate>Move to Trash</AutoTranslate>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Confirmation Modal for Bulk File Deletion (inside modal) */}
          {bulkFileDeleteModalVisible && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
                <h2 className="text-lg font-semibold mb-4">
                  <AutoTranslate>Bulk Move to Trash</AutoTranslate>
                </h2>
                <p className="mb-4">
                  <AutoTranslate>Are you sure you want to move {selectedFiles.length} file(s) to trash?</AutoTranslate>
                </p>
                <ul className="mb-4 max-h-40 overflow-y-auto">
                  {selectedFiles.slice(0, 5).map((file, index) => (
                    <li key={index} className="text-sm text-gray-600 truncate">
                      • {file.docName}
                    </li>
                  ))}
                  {selectedFiles.length > 5 && (
                    <li className="text-sm text-gray-500">
                      ... and {selectedFiles.length - 5} more
                    </li>
                  )}
                </ul>
                <div className="flex justify-end gap-4">
                  <button
                    onClick={() => setBulkFileDeleteModalVisible(false)}
                    className="bg-gray-300 hover:bg-gray-400 p-2 rounded-lg transition-colors"
                    disabled={isBulkFileDeleting}
                  >
                    <AutoTranslate>Cancel</AutoTranslate>
                  </button>
                  <button
                    onClick={confirmBulkFileDelete}
                    disabled={isBulkFileDeleting}
                    className={`px-4 py-2 rounded-md text-white ${isBulkFileDeleting
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700'} transition-colors`}
                  >
                    {isBulkFileDeleting ? (
                      <AutoTranslate>Processing...</AutoTranslate>
                    ) : (
                      <AutoTranslate>Move All to Trash</AutoTranslate>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Confirmation Modal for Bulk Document Deletion (main table) */}
          {bulkDocDeleteModalVisible && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
                <h2 className="text-lg font-semibold mb-4">
                  <AutoTranslate>Bulk Move to Trash</AutoTranslate>
                </h2>
                <p className="mb-4">
                  <AutoTranslate>Are you sure you want to move all approved files from {selectedDocuments.length} document(s) to trash?</AutoTranslate>
                  <br />
                  <small className="text-gray-600">
                    <AutoTranslate>This will move only APPROVED files from the selected documents to trash.</AutoTranslate>
                  </small>
                </p>
                <ul className="mb-4 max-h-40 overflow-y-auto">
                  {selectedDocuments.slice(0, 5).map((doc, index) => {
                    const approvedFilesCount = doc.documentDetails?.filter(file =>
                      !file.isDeleted && file.status === "APPROVED"
                    ).length || 0;
                    return (
                      <li key={index} className="text-sm text-gray-600 truncate">
                        • {doc.title} ({approvedFilesCount} approved file{approvedFilesCount !== 1 ? 's' : ''})
                      </li>
                    );
                  })}
                  {selectedDocuments.length > 5 && (
                    <li className="text-sm text-gray-500">
                      ... and {selectedDocuments.length - 5} more
                    </li>
                  )}
                </ul>
                <div className="flex justify-end gap-4">
                  <button
                    onClick={() => setBulkDocDeleteModalVisible(false)}
                    className="bg-gray-300 hover:bg-gray-400 p-2 rounded-lg transition-colors"
                    disabled={isBulkDocDeleting}
                  >
                    <AutoTranslate>Cancel</AutoTranslate>
                  </button>
                  <button
                    onClick={confirmBulkDocumentDelete}
                    disabled={isBulkDocDeleting}
                    className={`px-4 py-2 rounded-md text-white ${isBulkDocDeleting
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700'} transition-colors`}
                  >
                    {isBulkDocDeleting ? (
                      <AutoTranslate>Processing...</AutoTranslate>
                    ) : (
                      <AutoTranslate>Move All to Trash</AutoTranslate>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Share Document Modal (Single Document) */}
          {shareModalVisible && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full mx-4">
                <h2 className="text-lg font-semibold mb-4">
                  <AutoTranslate>Share Document</AutoTranslate>
                </h2>

                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    <AutoTranslate>Document:</AutoTranslate> {documentToShare?.title}
                  </p>
                  <p className="text-sm text-gray-600">
                    <AutoTranslate>Selected {selectedFileIds.length} file(s) to share with employees in your department.</AutoTranslate>
                  </p>
                  <p className="text-sm text-blue-600 mt-1">
                    <AutoTranslate>You can change which files to share by checking/unchecking files in the document details.</AutoTranslate>
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <AutoTranslate>Select Employees</AutoTranslate>
                  </label>
                  {loadingEmployees ? (
                    <div className="flex items-center">
                      <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin text-blue-600" />
                      <AutoTranslate>Loading employees...</AutoTranslate>
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto border rounded-lg p-2">
                      {availableEmployees.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          <AutoTranslate>No other employees in this department</AutoTranslate>
                        </p>
                      ) : (
                        availableEmployees.map(emp => (
                          <div key={emp.id} className="flex items-center mb-2">
                            <input
                              type="checkbox"
                              id={`emp-${emp.id}`}
                              checked={shareRecipients.includes(emp.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setShareRecipients([...shareRecipients, emp.id]);
                                } else {
                                  setShareRecipients(shareRecipients.filter(id => id !== emp.id));
                                }
                              }}
                              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <label htmlFor={`emp-${emp.id}`} className="ml-2 text-sm text-gray-700">
                              {emp.name} ({emp.email})
                            </label>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center">
                      <ClockIcon className="h-4 w-4 mr-1" />
                      <AutoTranslate>Expiration Time (Optional)</AutoTranslate>
                    </div>
                  </label>

                  <div className="grid grid-cols-2 gap-3 mb-2">
                    {/* Date Picker */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        <AutoTranslate>Date</AutoTranslate>
                      </label>
                      <input
                        type="date"
                        value={shareDate}
                        onChange={(e) => {
                          setShareDate(e.target.value);
                          if (!e.target.value) {
                            setShareTime("");
                          } else if (e.target.value === new Date().toISOString().split('T')[0]) {
                            // If selecting today, auto-select next available time
                            const nextTime = getNextAvailableTime();
                            setShareTime(`${nextTime.hour}:${nextTime.minute}`);
                          }
                        }}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Time Picker */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        <AutoTranslate>Time</AutoTranslate>
                      </label>
                      <select
                        value={shareTime}
                        onChange={(e) => setShareTime(e.target.value)}
                        disabled={!shareDate}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">--:--</option>
                        {generateTimeOptions().map((time, index) => (
                          <option
                            key={index}
                            value={time.value}
                            disabled={time.disabled}
                            className={time.disabled ? 'text-gray-400 bg-gray-100' : ''}
                          >
                            {time.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Display selected date-time */}
                  {shareDate && shareTime && (
                    <div className="text-sm bg-blue-50 p-2 rounded border border-blue-200 mb-2">
                      <AutoTranslate>Selected:</AutoTranslate> {shareDate} {shareTime}
                      {(() => {
                        const selectedDateTime = new Date(`${shareDate}T${shareTime}`);
                        const now = new Date();
                        if (selectedDateTime < now) {
                          return (
                            <span className="text-red-600 ml-2">
                              <ExclamationTriangleIcon className="h-4 w-4 inline mr-1" />
                              <AutoTranslate>(Past time!)</AutoTranslate>
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}

                  <div className="flex items-center mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        setShareDate(now.toISOString().split('T')[0]);
                        const nextTime = getNextAvailableTime();
                        setShareTime(`${nextTime.hour}:${nextTime.minute}`);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      <ClockIcon className="h-4 w-4 mr-1" />
                      <AutoTranslate>Set to next available time</AutoTranslate>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShareDate("");
                        setShareTime("");
                      }}
                      className="ml-4 text-sm text-gray-600 hover:text-gray-800 flex items-center"
                    >
                      <XMarkIcon className="h-4 w-4 mr-1" />
                      <AutoTranslate>Clear</AutoTranslate>
                    </button>
                  </div>

                  <p className="text-xs text-gray-500 mt-2">
                    <AutoTranslate>Leave empty for permanent access</AutoTranslate>
                  </p>
                </div>
                <div className="flex justify-end gap-4">
                  <button
                    onClick={() => {
                      setShareModalVisible(false);
                      setDocumentToShare(null);
                      setShareRecipients([]);
                      setShareEndTime("");
                      setSelectedFileIds([]);
                    }}
                    className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded-lg transition-colors"
                    disabled={sharingDocument}
                  >
                    <AutoTranslate>Cancel</AutoTranslate>
                  </button>
                  <button
                    onClick={handleShareSubmit}
                    disabled={sharingDocument || shareRecipients.length === 0 || selectedFileIds.length === 0}
                    className={`px-4 py-2 rounded-md text-white ${(sharingDocument || shareRecipients.length === 0 || selectedFileIds.length === 0)
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'} transition-colors flex items-center`}
                  >
                    {sharingDocument ? (
                      <>
                        <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                        <AutoTranslate>Sharing...</AutoTranslate>
                      </>
                    ) : (
                      <>
                        <ShareIcon className="h-4 w-4 mr-2" />
                        <AutoTranslate>Share {selectedFileIds.length} File(s)</AutoTranslate>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bulk Share Document Modal */}
          {bulkShareModalVisible && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full mx-4">
                <h2 className="text-lg font-semibold mb-4">
                  <AutoTranslate>Bulk Share Documents</AutoTranslate>
                </h2>

                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    <AutoTranslate>Sharing all approved files from {selectedDocuments.length} document(s) with employees in your department.</AutoTranslate>
                  </p>

                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700">
                      <AutoTranslate>Selected Documents:</AutoTranslate>
                    </p>
                    <ul className="max-h-32 overflow-y-auto border rounded-lg p-2 mt-1">
                      {selectedDocuments.slice(0, 5).map((doc, index) => {
                        const approvedFilesCount = doc.documentDetails?.filter(f =>
                          f.status === "APPROVED" && !f.isDeleted
                        ).length || 0;
                        return (
                          <li key={doc.id} className="text-sm text-gray-600 truncate">
                            • {doc.title} ({approvedFilesCount} approved file{approvedFilesCount !== 1 ? 's' : ''})
                          </li>
                        );
                      })}
                      {selectedDocuments.length > 5 && (
                        <li className="text-sm text-gray-500">
                          ... and {selectedDocuments.length - 5} more
                        </li>
                      )}
                    </ul>
                  </div>

                  <p className="text-sm text-blue-600">
                    <AutoTranslate>This will share ALL approved files from each selected document.</AutoTranslate>
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <AutoTranslate>Select Employees</AutoTranslate>
                  </label>
                  {loadingEmployees ? (
                    <div className="flex items-center">
                      <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin text-blue-600" />
                      <AutoTranslate>Loading employees...</AutoTranslate>
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto border rounded-lg p-2">
                      {availableEmployees.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          <AutoTranslate>No other employees in this department</AutoTranslate>
                        </p>
                      ) : (
                        availableEmployees.map(emp => (
                          <div key={emp.id} className="flex items-center mb-2">
                            <input
                              type="checkbox"
                              id={`bulk-emp-${emp.id}`}
                              checked={shareRecipients.includes(emp.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setShareRecipients([...shareRecipients, emp.id]);
                                } else {
                                  setShareRecipients(shareRecipients.filter(id => id !== emp.id));
                                }
                              }}
                              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <label htmlFor={`bulk-emp-${emp.id}`} className="ml-2 text-sm text-gray-700">
                              {emp.name} ({emp.email})
                            </label>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center">
                      <ClockIcon className="h-4 w-4 mr-1" />
                      <AutoTranslate>Expiration Time (Optional)</AutoTranslate>
                    </div>
                  </label>
                  <input
                    type="datetime-local"
                    value={shareEndTime}
                    onChange={(e) => setShareEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min={getMinDateTime()} // FIXED: This prevents past dates/times
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    <AutoTranslate>Leave empty for permanent access</AutoTranslate>
                  </p>
                </div>

                <div className="flex justify-end gap-4">
                  <button
                    onClick={() => {
                      setBulkShareModalVisible(false);
                      setShareRecipients([]);
                      setShareEndTime("");
                    }}
                    className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded-lg transition-colors"
                    disabled={isBulkSharing}
                  >
                    <AutoTranslate>Cancel</AutoTranslate>
                  </button>
                  <button
                    onClick={confirmBulkDocumentShare}
                    disabled={isBulkSharing || shareRecipients.length === 0}
                    className={`px-4 py-2 rounded-md text-white ${(isBulkSharing || shareRecipients.length === 0)
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700'} transition-colors flex items-center`}
                  >
                    {isBulkSharing ? (
                      <>
                        <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                        <AutoTranslate>Sharing...</AutoTranslate>
                      </>
                    ) : (
                      <>
                        <ShareIcon className="h-4 w-4 mr-2" />
                        <AutoTranslate>Share {selectedDocuments.length} Document(s)</AutoTranslate>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* View Shares Modal */}
          {viewSharesModalVisible && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">
                    <AutoTranslate>Shared Access</AutoTranslate>
                  </h2>
                  <button
                    onClick={() => setViewSharesModalVisible(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {selectedDocShares.length === 0 ? (
                  <div className="text-center py-8">
                    <UserGroupIcon className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500">
                      <AutoTranslate>No shares found for this document</AutoTranslate>
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border p-2 text-left">
                            <AutoTranslate>SN</AutoTranslate>
                          </th>
                          <th className="border p-2 text-left">
                            <AutoTranslate>Shared To</AutoTranslate>
                          </th>
                          <th className="border p-2 text-left">
                            <AutoTranslate>Files Shared</AutoTranslate>
                          </th>
                          <th className="border p-2 text-left">
                            <AutoTranslate>Shared Date</AutoTranslate>
                          </th>
                          <th className="border p-2 text-left">
                            <AutoTranslate>Expiration Time</AutoTranslate>
                          </th>
                          <th className="border p-2 text-left">
                            <AutoTranslate>Status</AutoTranslate>
                          </th>
                          <th className="border p-2 text-left">
                            <AutoTranslate>Actions</AutoTranslate>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDocShares.map((share, index) => (
                          <tr key={share.id} className="hover:bg-gray-50">
                            <td className="border p-2">{index + 1}</td>
                            <td className="border p-2">{share.sharedToName}</td>
                            <td className="border p-2">

                              {share.sharedFileNames && share.sharedFileNames.length > 0 && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {share.sharedFileNames.slice(0, 2).map((name, i) => (
                                    <div key={i}>{name}</div>
                                  ))}
                                  {share.sharedFileNames.length > 2 && (
                                    <div>... and {share.sharedFileNames.length - 2} more</div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="border p-2">{formatDateTime(share.sharedDate)}</td>
                            <td className="border p-2">
                              {share.endTime ? formatDateTime(share.endTime) : "Permanent"}
                            </td>
                            <td className="border p-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${share.isExpired ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                }`}>
                                {share.isExpired ? 'Expired' : 'Active'}
                              </span>
                            </td>
                            <td className="border p-2">
                              <button
                                onClick={() => handleRevokeShare(share)}
                                disabled={share.isExpired}
                                className={`px-3 py-1 rounded text-sm ${share.isExpired
                                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                  : 'bg-red-100 text-red-700 hover:bg-red-200'
                                  }`}
                              >
                                <AutoTranslate>Revoke</AutoTranslate>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Revoke Share Confirmation Modal */}
          {revokeShareModalVisible && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
                <h2 className="text-lg font-semibold mb-4">
                  <AutoTranslate>Revoke Share Access</AutoTranslate>
                </h2>
                <div className="mb-4">
                  <p className="mb-2">
                    <AutoTranslate>Are you sure you want to revoke access for:</AutoTranslate>
                  </p>
                  <p className="font-semibold">{shareToRevoke?.sharedToName}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    <AutoTranslate>Document:</AutoTranslate> {shareToRevoke?.documentName}
                  </p>
                  <p className="text-sm text-gray-600">
                    <AutoTranslate>Files shared:</AutoTranslate> {shareToRevoke?.totalFilesShared || 1}
                  </p>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <AutoTranslate>Reason (Optional)</AutoTranslate>
                  </label>
                  <textarea
                    value={revokeReason}
                    onChange={(e) => setRevokeReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    placeholder="Enter reason for revoking access..."
                  />
                </div>
                <div className="flex justify-end gap-4">
                  <button
                    onClick={() => {
                      setRevokeShareModalVisible(false);
                      setShareToRevoke(null);
                      setRevokeReason("");
                    }}
                    className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded-lg transition-colors"
                  >
                    <AutoTranslate>Cancel</AutoTranslate>
                  </button>
                  <button
                    onClick={confirmRevokeShare}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
                  >
                    <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                    <AutoTranslate>Revoke Access</AutoTranslate>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center mt-4">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1 || totalPages === 0}
              className={`px-3 py-1 rounded mr-3 ${currentPage === 1 || totalPages === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"
                }`}
            >
              <ArrowLeftIcon className="inline h-4 w-4 mr-2 mb-1" />
              <AutoTranslate>Previous</AutoTranslate>
            </button>

            {totalPages > 0 && getPageNumbers().map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 rounded mx-1 ${currentPage === page ? "bg-blue-500 text-white" : "bg-slate-200 hover:bg-blue-100"
                  }`}
              >
                {page}
              </button>
            ))}

            <span className="text-sm text-gray-700 mx-2">
              <AutoTranslate>of</AutoTranslate> {totalPages} <AutoTranslate>pages</AutoTranslate>
            </span>

            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className={`px-3 py-1 rounded ml-3 ${currentPage === totalPages || totalPages === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"
                }`}
            >
              <AutoTranslate>Next</AutoTranslate>
              <ArrowRightIcon className="inline h-4 w-4 ml-2 mb-1" />
            </button>
            <div className="ml-4">
              <span className="text-sm text-gray-700">
                <AutoTranslate>
                  {`Here are items ${totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0
                    } to ${Math.min(currentPage * itemsPerPage, totalItems)} out of ${totalItems}.`}
                </AutoTranslate>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovedDoc;