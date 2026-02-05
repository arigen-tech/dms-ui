import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useLocation, useNavigate } from 'react-router-dom';
import {
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
  UserIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/solid";
import { API_HOST, DOCUMENTHEADER_API } from "../API/apiConfig";
import apiClient from "../API/apiClient";
import FilePreviewModal from "../Components/FilePreviewModal";
import LoadingComponent from "../Components/LoadingComponent";
import Popup from "../Components/Popup";
import AutoTranslate from '../i18n/AutoTranslate';
import { useLanguage } from '../i18n/LanguageContext';

const SharedDocs = () => {
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
  const [openingFiles, setOpeningFiles] = useState(null);

  // State for viewing shares
  const [viewSharesModalVisible, setViewSharesModalVisible] = useState(false);
  const [selectedDocShares, setSelectedDocShares] = useState([]);
  const [revokeShareModalVisible, setRevokeShareModalVisible] = useState(false);
  const [shareToRevoke, setShareToRevoke] = useState(null);
  const [revokeReason, setRevokeReason] = useState("");

  // State for share info tooltip
  const [shareInfoVisible, setShareInfoVisible] = useState(false);
  const [selectedDocShareInfo, setSelectedDocShareInfo] = useState(null);
  const [shareInfoPosition, setShareInfoPosition] = useState({ x: 0, y: 0 });

  // State for sharing documents
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [documentToShare, setDocumentToShare] = useState(null);
  const [shareRecipients, setShareRecipients] = useState([]);
  const [availableEmployees, setAvailableEmployees] = useState([]);
  const [shareEndTime, setShareEndTime] = useState("");
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [sharingDocument, setSharingDocument] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState([]);

  const [popupMessage, setPopupMessage] = useState(null);

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
    return getCurrentDateTimeLocal();
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

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return "--";
    try {
      const date = new Date(dateTimeString);
      const options = {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      };
      return date.toLocaleString("en-GB", options);
    } catch (error) {
      return "--";
    }
  };

  const formatDateArray = (dateArray) => {
    if (!dateArray || !Array.isArray(dateArray) || dateArray.length < 7) return "--";
    try {
      // Assuming format: [year, month, day, hour, minute, second, nanosecond]
      const [year, month, day, hour, minute, second] = dateArray;
      const date = new Date(year, month - 1, day, hour, minute, second);
      return date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "--";
    }
  };

  // Calculate filtered documents
  const filteredDocuments = useMemo(() => {
    if (!documents) return [];

    return documents.filter((doc) =>
      Object.entries(doc).some(([key, value]) => {
        if (key === "documentHeader" && value?.categoryMaster) {
          return value.categoryMaster.name?.toLowerCase().includes(searchTerm.toLowerCase());
        }
        if (key === "sharedByName" && value) {
          return value.toLowerCase().includes(searchTerm.toLowerCase());
        }
        if (key === "documentHeader" && value) {
          return (
            value.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            value.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            value.fileNo?.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
        if (key === "sharedFileNames" && Array.isArray(value)) {
          return value.some((fileName) =>
            fileName.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
        if (key === "sharedDate") {
          const date = formatDateArray(value).toLowerCase();
          return date.includes(searchTerm.toLowerCase());
        }
        if (key === "documentName" && value) {
          return value.toLowerCase().includes(searchTerm.toLowerCase());
        }
        return false;
      })
    )
      .sort((a, b) => {
        const dateA = a.sharedDate ? new Date(...a.sharedDate) : new Date(0);
        const dateB = b.sharedDate ? new Date(...b.sharedDate) : new Date(0);
        return dateB - dateA;
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
    const documentIndex = filteredDocuments.findIndex(doc => doc.documentHeader?.id === documentId);
    if (documentIndex !== -1) {
      return Math.ceil((documentIndex + 1) / itemsPerPage);
    }
    return 1;
  };

  useEffect(() => {
    fetchSharedDocuments();
  }, []);

  const fetchSharedDocuments = async () => {
    try {
      setLoading(true);

      const response = await axios.get(
        `${API_HOST}/document-share/shared-with-me`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // The response is already an array of share records
      const sharedRecords = Array.isArray(response.data) ? response.data : [];
      console.log("Shared records:", sharedRecords);

      // Group by document header to show unique documents
      const groupedByDocument = sharedRecords.reduce((acc, share) => {
        const docHeaderId = share.documentHeader?.id;

        if (!docHeaderId) return acc;

        if (!acc[docHeaderId]) {
          // First share for this document
          acc[docHeaderId] = {
            id: docHeaderId,
            documentHeader: share.documentHeader,
            shares: [share], // Store all share records for this document
            sharedByName: share.sharedByName,
            sharedDate: share.sharedDate,
            documentName: share.documentName,
            documentHeaderName: share.documentHeaderName,
            shareIds: share.shareIds ? [share.shareIds].flat() : [share.id],
            sharedFileNames: share.sharedFileNames,
            totalSharesCount: 1, // Count of distinct share records
            totalFilesShared: share.totalFilesShared || 0,
            // Collect all unique shared files across all shares
            allSharedFileNames: [...share.sharedFileNames],
            allShareRecords: [share] // Store all share records
          };
        } else {
          // Add this share to existing document
          acc[docHeaderId].shares.push(share);
          acc[docHeaderId].allShareRecords.push(share);
          acc[docHeaderId].totalSharesCount += 1;

          // Add share IDs
          if (share.shareIds) {
            acc[docHeaderId].shareIds = [...new Set([...acc[docHeaderId].shareIds, ...share.shareIds])];
          } else {
            acc[docHeaderId].shareIds = [...new Set([...acc[docHeaderId].shareIds, share.id])];
          }

          // Add shared file names
          acc[docHeaderId].sharedFileNames = [
            ...new Set([...acc[docHeaderId].sharedFileNames, ...share.sharedFileNames])
          ];

          // Keep track of all shared files
          acc[docHeaderId].allSharedFileNames = [
            ...new Set([...acc[docHeaderId].allSharedFileNames, ...share.sharedFileNames])
          ];

          // Sum total files shared
          acc[docHeaderId].totalFilesShared += share.totalFilesShared || 0;

          // Keep the most recent share date
          const currentDate = acc[docHeaderId].sharedDate;
          const newDate = share.sharedDate;
          if (newDate && (!currentDate ||
            (Array.isArray(newDate) && Array.isArray(currentDate) &&
              new Date(...newDate) > new Date(...currentDate)))) {
            acc[docHeaderId].sharedDate = newDate;
            acc[docHeaderId].sharedByName = share.sharedByName;
          }
        }

        return acc;
      }, {});

      // Convert to array
      const uniqueDocuments = Object.values(groupedByDocument);
      console.log("Grouped documents:", uniqueDocuments);
      setDocuments(uniqueDocuments);

    } catch (error) {
      console.error("Error fetching shared documents:", error);
      setError("Failed to fetch shared documents. Please try again.");
      showPopup('Failed to fetch shared documents. Please try again.', 'error');
    } finally {
      setLoading(false);
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

      return response.data;
    } catch (error) {
      console.error('Error fetching document shares:', error);
      return [];
    }
  };

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

  const showPopup = (message, type = 'info') => {
    setPopupMessage({
      message,
      type,
      onClose: () => {
        setPopupMessage(null);
      }
    });
  };

  useEffect(() => {
    if (selectedDoc) {
      setLoadingFiles(true);
      setTimeout(() => {
        setLoadingFiles(false);
      }, 300);
    }
  }, [selectedDoc]);

  const openFile = async (file) => {
    try {
      setOpeningFiles(true);
      const encodedPath = file.path.split("/").map(encodeURIComponent).join("/");
      const fileUrl = `${API_HOST}/api/documents/download/${encodedPath}`;

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
      console.error("❌ Error fetching file:", error);
      alert("Failed to fetch or preview the file.");
    } finally {
      setOpeningFiles(false);
    }
  };

  const handleDownload = async (file) => {
    if (!selectedDoc) return;

    const branch = selectedDoc.documentHeader?.employee?.branch?.name?.replace(/ /g, "_") || "unknown";
    const department = selectedDoc.documentHeader?.employee?.department?.name?.replace(/ /g, "_") || "unknown";
    const year = file.yearMaster?.name?.replace(/ /g, "_") || "unknown";
    const category = selectedDoc.documentHeader?.categoryMaster?.name?.replace(/ /g, "_") || "unknown";
    const version = file.version;
    const fileName = file.docName.replace(/ /g, "_");

    const fileUrl = `${API_HOST}/api/documents/download/${encodeURIComponent(
      branch
    )}/${encodeURIComponent(department)}/${encodeURIComponent(
      year
    )}/${encodeURIComponent(category)}/${encodeURIComponent(
      version
    )}/${encodeURIComponent(fileName)}`;

    try {
      const response = await apiClient.get(fileUrl, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });

      const downloadBlob = new Blob([response.data], {
        type: response.headers["content-type"],
      });

      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(downloadBlob);
      link.download = file.docName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error("Error downloading file:", error);
      showPopup('Failed to download file. Please try again!', 'error');
    }
  };

  const filteredDocFiles = useMemo(() => {
    if (!selectedDoc || !selectedDoc.documentHeader?.documentDetails) return [];

    // Filter files that are actually shared (based on allSharedFileNames)
    const sharedFileNames = selectedDoc.allSharedFileNames || selectedDoc.sharedFileNames || [];
    const allFiles = selectedDoc.documentHeader.documentDetails || [];

    const sharedFiles = allFiles.filter(file =>
      sharedFileNames.includes(file.docName)
    );

    // Apply search filter
    return sharedFiles.filter((file) => {
      const name = file.docName.toLowerCase();
      const version = String(file.version).toLowerCase();
      const term = searchFileTerm.toLowerCase();
      return name.includes(term) || version.includes(term);
    });
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

  const openModal = async (doc) => {
    setSelectedDoc(doc);
    setIsOpen(true);
    fetchQRCode(doc.id);
  };

  const closeModal = () => {
    setIsOpen(false);
    setSelectedDoc(null);
    setQrCodeUrl(null);
  };

  const handleViewShares = async (doc) => {
    try {
      const shares = await fetchDocumentShares(doc.id);
      setSelectedDocShares(shares);
      setViewSharesModalVisible(true);
    } catch (error) {
      console.error('Error fetching shares:', error);
      showPopup('Failed to load shares', 'error');
    }
  };

  const handleShowShareInfo = (doc, event) => {
    setSelectedDocShareInfo(doc);
    setShareInfoPosition({
      x: event.clientX,
      y: event.clientY
    });
    setShareInfoVisible(true);

    // Auto-hide after 5 seconds
    setTimeout(() => {
      setShareInfoVisible(false);
    }, 5000);
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

        // Refresh the shares list
        if (selectedDoc) {
          const updatedShares = await fetchDocumentShares(selectedDoc.id);
          setSelectedDocShares(updatedShares);
        }

        // Refresh documents list
        fetchSharedDocuments();
      } else {
        showPopup(response.data.message || 'Failed to revoke share', 'error');
      }
    } catch (error) {
      console.error('Error revoking share:', error);
      showPopup('Failed to revoke share. Please try again.', 'error');
    }
  };

  // ==================== Document Sharing Functions ====================

  const handleShareDocument = (doc) => {
    setDocumentToShare(doc);
    setShareModalVisible(true);
    setShareRecipients([]);
    setShareEndTime("");

    // Auto-select all shared file IDs for this document
    if (doc.allSharedFileNames && doc.documentHeader?.documentDetails) {
      const sharedFiles = doc.documentHeader.documentDetails.filter(file =>
        doc.allSharedFileNames.includes(file.docName)
      );
      setSelectedFileIds(sharedFiles.map(file => file.id));
    } else {
      setSelectedFileIds([]);
    }

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
        documentDetailIds: selectedFileIds,
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

        // Refresh the documents list
        fetchSharedDocuments();
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

  if (loading) {
    return <LoadingComponent />;
  }

  return (
    <div className="px-1">
      <h1 className="text-xl mb-4 font-semibold">
        <AutoTranslate>Shared Documents</AutoTranslate>
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

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-slate-100">
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
                  <AutoTranslate>Shared By</AutoTranslate>
                </th>
                <th className="border p-2 text-left">
                  <AutoTranslate>Shared Files</AutoTranslate>
                </th>
                <th className="border p-2 text-left">
                  <AutoTranslate>Actions</AutoTranslate>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedDocuments.length > 0 ? (
                paginatedDocuments.map((doc, index) => {
                  const isHighlighted = doc.id === highlightedDocId;
                  const sharedFilesCount = doc.allSharedFileNames?.length || doc.totalFilesShared || 0;
                  const totalShares = doc.totalSharesCount || 1;
                  const documentHeader = doc.documentHeader || {};
                  const sharedByName = doc.sharedByName || doc.shares?.[0]?.sharedByName || "N/A";
                  const sharedDate = doc.sharedDate || doc.shares?.[0]?.sharedDate;

                  return (
                    <tr
                      key={doc.id}
                      className={isHighlighted ? 'bg-yellow-100' : ''}
                    >
                      <td className="border p-2">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td className="border p-2">{documentHeader.fileNo || "N/A"}</td>
                      <td className="border p-2">{documentHeader.title || "N/A"}</td>
                      <td className="border p-2">{documentHeader.subject || "N/A"}</td>
                      <td className="border p-2">
                        <div className="flex flex-col">
                          <span>{sharedByName}</span>
                          <span className="text-xs text-gray-500">
                            {formatDateArray(sharedDate)}
                          </span>
                        </div>
                      </td>
                      <td className="border p-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-800 text-xs font-medium mr-2">
                              {sharedFilesCount}
                            </span>
                            <span className="text-sm text-gray-600">
                              file{sharedFilesCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                          {totalShares > 1 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 ml-2">
                              {totalShares} share{totalShares !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="border p-3 items-center">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openModal(doc)}
                            title={`View details for ${documentHeader.title || "this document"}`}
                            className="p-1 rounded hover:bg-green-100"
                          >
                            <EyeIcon className="h-5 w-5 text-green-600" />
                          </button>
                          <button
                            onClick={(e) => handleShowShareInfo(doc, e)}
                            title="Show share information"
                            className="p-1 rounded hover:bg-blue-100 relative"
                          >
                            <InformationCircleIcon className="h-5 w-5 text-blue-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan="7"
                    className="border p-4 text-center text-gray-500"
                  >
                    <AutoTranslate>No shared documents found.</AutoTranslate>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Share Info Tooltip */}
          {shareInfoVisible && selectedDocShareInfo && (
            <div
              className="fixed z-[9999] bg-white border border-gray-300 rounded-lg shadow-xl p-4 max-w-sm"
              style={{
                left: `${shareInfoPosition.x}px`,
                top: `${shareInfoPosition.y + 10}px`,
                transform: 'translateX(-50%)'
              }}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-gray-800">
                  <AutoTranslate>Share Information</AutoTranslate>
                </h3>
                <button
                  onClick={() => setShareInfoVisible(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600"><AutoTranslate>Total Shares:</AutoTranslate></span>
                  <span className="font-medium">{selectedDocShareInfo.totalSharesCount || 1}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600"><AutoTranslate>Shared Files:</AutoTranslate></span>
                  <span className="font-medium">{selectedDocShareInfo.allSharedFileNames?.length || selectedDocShareInfo.totalFilesShared || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600"><AutoTranslate>Shared By:</AutoTranslate></span>
                  <span className="font-medium">{selectedDocShareInfo.sharedByName || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600"><AutoTranslate>Last Shared:</AutoTranslate></span>
                  <span className="font-medium">{formatDateArray(selectedDocShareInfo.sharedDate)}</span>
                </div>

                {selectedDocShareInfo.shares && selectedDocShareInfo.shares.length > 1 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <h4 className="font-medium text-gray-700 mb-1">
                      <AutoTranslate>Share Details:</AutoTranslate>
                    </h4>
                    <div className="max-h-40 overflow-y-auto">
                      {selectedDocShareInfo.shares.slice(0, 3).map((share, idx) => (
                        <div key={idx} className="text-xs mb-1 p-1 bg-gray-50 rounded">
                          <div className="flex justify-between">
                            <span>Share {idx + 1}:</span>
                            <span className="font-medium">{share.sharedFileNames?.length || 0} files</span>
                          </div>
                          <div className="text-gray-500">
                            {formatDateArray(share.sharedDate)}
                          </div>
                        </div>
                      ))}
                      {selectedDocShareInfo.shares.length > 3 && (
                        <div className="text-xs text-gray-500 text-center">
                          + {selectedDocShareInfo.shares.length - 3} more shares
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => handleViewShares(selectedDocShareInfo)}
                  className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                >
                  <AutoTranslate>View All Shares</AutoTranslate>
                </button>
              </div>
            </div>
          )}

          <FilePreviewModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onDownload={handleDownload}
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
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleViewShares(selectedDoc)}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors duration-200"
                        title="View shared access"
                      >
                        <ShareIcon className="h-5 w-5" />
                        <AutoTranslate>View Shares</AutoTranslate>
                      </button>
                      <button
                        onClick={() => handleShareDocument(selectedDoc)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
                        title="Share document with others"
                      >
                        <ShareIcon className="h-5 w-5" />
                        <AutoTranslate>Share</AutoTranslate>
                      </button>
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
                          { label: "Branch", value: selectedDoc.documentHeader?.employee?.branch?.name || selectedDoc.documentHeader?.branchName },
                          { label: "Department", value: selectedDoc.documentHeader?.employee?.department?.name || selectedDoc.documentHeader?.departmentName },
                          { label: "File No.", value: selectedDoc.documentHeader?.fileNo },
                          { label: "Title", value: selectedDoc.documentHeader?.title },
                          { label: "Subject", value: selectedDoc.documentHeader?.subject },
                          { label: "Category", value: selectedDoc.documentHeader?.categoryMaster?.name || selectedDoc.documentHeader?.categoryName || <AutoTranslate>No Category</AutoTranslate> },
                          { label: "Status", value: selectedDoc.documentHeader?.approvalStatus },
                          { label: "Shared By", value: selectedDoc.sharedByName },
                          { label: "Shared Date", value: formatDateArray(selectedDoc.sharedDate) },
                          { label: "Total Files Shared", value: selectedDoc.allSharedFileNames?.length || selectedDoc.totalFilesShared },
                          { label: "Total Shares", value: selectedDoc.totalSharesCount || 1 },
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
                      {selectedDoc?.documentHeader?.qrPath ? (
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

                  {/* Shared Files Section */}
                  <div className="border-t border-gray-200 pt-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                      <div>
                        <h2 className="text-xl font-semibold text-gray-800">
                          <AutoTranslate>Shared Files</AutoTranslate>
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                          <AutoTranslate>Showing</AutoTranslate> {selectedDoc.allSharedFileNames?.length || 0} <AutoTranslate>shared files</AutoTranslate>
                        </p>
                      </div>
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
                        {/* Desktop View Table Header */}
                        <div className="hidden md:grid grid-cols-[30fr_10fr_10fr_10fr_15fr_15fr_20fr_10fr] bg-gray-50 text-gray-600 font-medium text-sm px-6 py-3">
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
                        </div>

                        <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                          {filteredDocFiles.map((file, index) => (
                            <div key={index} className="hover:bg-gray-50 transition-colors duration-150">
                              {/* Desktop View */}
                              <div className="hidden md:grid grid-cols-[30fr_10fr_10fr_10fr_15fr_15fr_20fr_10fr] items-center px-6 py-4 text-sm">
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
                              </div>

                              {/* Mobile View */}
                              <div className="md:hidden p-4">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="text-left text-gray-800 break-words flex-1">
                                    <strong>{index + 1}.</strong> {file.docName}
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

                                <div className="mt-3">
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
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
                        <DocumentIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500">
                          <AutoTranslate>No shared files found</AutoTranslate>
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

          {/* Share Document Modal */}
          {shareModalVisible && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full mx-4">
                <h2 className="text-lg font-semibold mb-4">
                  <AutoTranslate>Share Document</AutoTranslate>
                </h2>

                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    <AutoTranslate>Document:</AutoTranslate> {documentToShare?.documentHeader?.title}
                  </p>
                  <p className="text-sm text-gray-600">
                    <AutoTranslate>Selected {selectedFileIds.length} shared file(s) to share with employees in your department.</AutoTranslate>
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
                  <input
                    type="datetime-local"
                    value={shareEndTime}
                    onChange={(e) => setShareEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min={getMinDateTime()}
                  />
                  <p className="text-xs text-gray-500 mt-1">
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

          {/* View Shares Modal */}
          {viewSharesModalVisible && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">
                    <AutoTranslate>Shared Access Details</AutoTranslate>
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
                            <AutoTranslate>Shared By</AutoTranslate>
                          </th>
                          <th className="border p-2 text-left">
                            <AutoTranslate>Shared To</AutoTranslate>
                          </th>
                          <th className="border p-2 text-left">
                            <AutoTranslate>Shared Date</AutoTranslate>
                          </th>
                          <th className="border p-2 text-left">
                            <AutoTranslate>Expiration Time</AutoTranslate>
                          </th>
                          <th className="border p-2 text-left">
                            <AutoTranslate>Files</AutoTranslate>
                          </th>
                          <th className="border p-2 text-left">
                            <AutoTranslate>Status</AutoTranslate>
                          </th>
                          {/* <th className="border p-2 text-left">
                            <AutoTranslate>Actions</AutoTranslate>
                          </th> */}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDocShares.map((share, index) => (
                          <tr key={share.id} className="hover:bg-gray-50">
                            <td className="border p-2">{index + 1}</td>
                            <td className="border p-2">{share.sharedByName}</td>
                            <td className="border p-2">{share.sharedToName}</td>
                            <td className="border p-2">{formatDateArray(share.sharedDate)}</td>
                            <td className="border p-2">
                              {share.endTime ? formatDateArray(share.endTime) : "Permanent"}
                            </td>
                            <td className="border p-2">
                              <div className="flex items-center">
                                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-800 text-xs font-medium mr-2">
                                  {share.sharedFileNames?.length || share.totalFilesShared || 0}
                                </span>
                                <span className="text-sm">
                                  file{(share.sharedFileNames?.length || share.totalFilesShared || 0) !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </td>
                            <td className="border p-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${share.expired || share.isExpired ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                }`}>
                                {share.expired || share.isExpired ? 'Expired' : 'Active'}
                              </span>
                            </td>
                            {/* <td className="border p-2">
                              {share.sharedByName !== localStorage.getItem("userName") ? (
                                <span className="text-gray-500 text-sm">
                                  <AutoTranslate>Shared by others</AutoTranslate>
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleRevokeShare(share)}
                                  disabled={share.expired || share.isExpired}
                                  className={`px-3 py-1 rounded text-sm ${
                                    share.expired || share.isExpired
                                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                                  }`}
                                >
                                  <AutoTranslate>Revoke</AutoTranslate>
                                </button>
                              )}
                            </td> */}
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
                    <AutoTranslate>Files:</AutoTranslate> {shareToRevoke?.sharedFileNames?.length || shareToRevoke?.totalFilesShared || 0}
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

export default SharedDocs;