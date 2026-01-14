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
  ArrowUturnLeftIcon,
} from "@heroicons/react/24/solid";
import { API_HOST, DOCUMENTHEADER_API } from "../API/apiConfig";
import apiClient from "../API/apiClient";
import FilePreviewModal from "../Components/FilePreviewModal";
import LoadingComponent from "../Components/LoadingComponent";
import Popup from "../Components/Popup";
import AutoTranslate from '../i18n/AutoTranslate';
import { useLanguage } from '../i18n/LanguageContext';

const TrashDoc = () => {
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
  const [blobUrl, setBlobUrl] = useState("");
  const [contentType, setContentType] = useState("");
  const [selectedDocFile, setSelectedDocFiles] = useState(null);
  const [searchFileTerm, setSearchFileTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [openingFileIndex, setOpeningFileIndex] = useState(null);
  const [openingFiles, setOpeningFiles] = useState(null);
  const [highlightedDocId, setHighlightedDocId] = useState(null);
  
  // State for file-level restore
  const [fileToRestore, setFileToRestore] = useState(null);
  const [confirmRestoreModalVisible, setConfirmRestoreModalVisible] = useState(false);
  const [isRestoreConfirmDisabled, setIsRestoreConfirmDisabled] = useState(false);
  const [popupMessage, setPopupMessage] = useState(null);

  const token = localStorage.getItem("tokenKey");
  const UserId = localStorage.getItem("userId");
  const role = localStorage.getItem("role");

  useEffect(() => {
    console.log('🔍 TrashDoc Component - Language Status:', {
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
    fetchTrashDocuments();
  }, []);

  const fetchTrashDocuments = async () => {
    try {
      setLoading(true);
      let response;

      if (role === "USER") {
        response = await axios.get(
          `${API_HOST}/api/documents/approved/employee/${UserId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      } else if (
        role === "ADMIN" ||
        role === "BRANCH ADMIN" ||
        role === "DEPARTMENT ADMIN"
      ) {
        response = await axios.get(`${API_HOST}/api/documents/approvedTrashByEmp`, {
          headers: {
            Authorization: `Bearer ${token}`,
            employeeId: UserId,
          },
        });
      }

      const allDocuments = Array.isArray(response.data) ? response.data : [];
      
      // Filter documents that have at least one deleted file
      const trashDocuments = allDocuments.filter(doc => {
        // Check if documentDetails exists and has at least one file with isDeleted = true
        return doc.documentDetails && 
               doc.documentDetails.some(file => file.isDeleted === true);
      });
      
      setDocuments(trashDocuments);
      console.log("Fetched trash documents:", trashDocuments);
    } catch (error) {
      console.error("Error fetching trash documents:", error);
      setError("Failed to fetch trash documents. Please try again.");
      showPopup('Failed to fetch trash documents. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Function to handle file restoration
  const handleRestoreFile = (file) => {
    setFileToRestore(file);
    setConfirmRestoreModalVisible(true);
  };

  const confirmRestoreFile = async () => {
    setIsRestoreConfirmDisabled(true);

    if (fileToRestore) {
      try {
        // Call the API to restore file (set isDeleted = false)
        const response = await axios.put(
          `${DOCUMENTHEADER_API}/delete-status/${fileToRestore.id}`,
          null,
          {
            params: { isDeleted: false },
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        // Refresh the documents list
        fetchTrashDocuments();

        // If modal is open, update the selectedDoc
        if (selectedDoc) {
          const updatedDocumentDetails = selectedDoc.documentDetails.map(file =>
            file.id === fileToRestore.id ? { ...file, isDeleted: false } : file
          );
          
          setSelectedDoc({
            ...selectedDoc,
            documentDetails: updatedDocumentDetails
          });
        }

        setConfirmRestoreModalVisible(false);
        setFileToRestore(null);
        setIsRestoreConfirmDisabled(false);
        
        showPopup('File restored successfully!', 'success');
      } catch (error) {
        console.error('Error restoring file:', error.response ? error.response.data : error.message);
        showPopup('Failed to restore file. Please try again!', 'error');
        setIsRestoreConfirmDisabled(false);
      }
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
    
    const branch = selectedDoc.employee.branch.name.replace(/ /g, "_");
    const department = selectedDoc.employee.department.name.replace(/ /g, "_");
    const year = file.yearMaster?.name?.replace(/ /g, "_") || "unknown";
    const category = selectedDoc.categoryMaster?.name?.replace(/ /g, "_") || "unknown";
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
    if (!selectedDoc || !Array.isArray(selectedDoc.documentDetails)) return [];
    
    // Filter to show only deleted files (for trash page)
    return selectedDoc.documentDetails.filter((file) => {
      if (!file.isDeleted) return false; // Only show deleted files
      
      const name = file.docName.toLowerCase();
      const version = String(file.version).toLowerCase();
      const term = searchFileTerm.toLowerCase();
      return name.includes(term) || version.includes(term);
    });
  }, [selectedDoc, searchFileTerm]);

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

  const filteredDocuments = documents?.filter((doc) =>
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
        return value.some((file) =>
          file.docName.toLowerCase().includes(searchTerm.toLowerCase())
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

  const totalItems = filteredDocuments.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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

  const openModal = (doc) => {
    setSelectedDoc(doc);
    setIsOpen(true);
    fetchQRCode(doc.id);
  };

  const closeModal = () => {
    setIsOpen(false);
    setSelectedDoc(null);
    setQrCodeUrl(null);
  };

  if (loading) {
    return <LoadingComponent />;
  }

  return (
    <div className="px-1">
      <h1 className="text-xl mb-4 font-semibold">
        <AutoTranslate>Trash Documents</AutoTranslate>
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
                  <AutoTranslate>Category</AutoTranslate>
                </th>
                <th className="border p-2 text-left">
                  <AutoTranslate>Approval Status</AutoTranslate>
                </th>
                <th className="border p-2 text-left">
                  <AutoTranslate>View</AutoTranslate>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedDocuments.length > 0 ? (
                paginatedDocuments.map((doc, index) => (
                  <tr
                    key={doc.id}
                    className={
                      doc.id === highlightedDocId
                        ? 'bg-yellow-100'
                        : ''
                    }
                  >
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
                      {doc.approvalStatus || <AutoTranslate>Pending</AutoTranslate>}
                    </td>
                    <td className="border p-2">
                      <button
                        onClick={() => openModal(doc)}
                        title={`View details for ${doc.title || "this document"}`}
                      >
                        <EyeIcon className="h-6 w-6 bg-green-400 rounded-xl p-1 text-white" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="7"
                    className="border p-4 text-center text-gray-500"
                  >
                    <AutoTranslate>No data found in trash.</AutoTranslate>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          
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
                        <AutoTranslate>Document Details (Trash)</AutoTranslate>
                      </h1>
                    </div>
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
                          { label: "Branch", value: selectedDoc?.employee?.branch?.name },
                          { label: "Department", value: selectedDoc?.employee?.department?.name },
                          { label: "File No.", value: selectedDoc?.fileNo },
                          { label: "Title", value: selectedDoc?.title },
                          { label: "Subject", value: selectedDoc?.subject },
                          { label: "Category", value: selectedDoc?.categoryMaster?.name || <AutoTranslate>No Category</AutoTranslate> },
                          { label: "Status", value: selectedDoc?.approvalStatus },
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
                        <AutoTranslate>Deleted Files</AutoTranslate>
                      </h2>
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

                    {loadingFiles ? (
                      <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        <span className="ml-3 text-gray-600">
                          <AutoTranslate>Loading files...</AutoTranslate>
                        </span>
                      </div>
                    ) : selectedDoc && filteredDocFiles.length > 0 ? (
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        {/* Desktop View Table Header - Added Restore column */}
                        <div className="hidden md:grid grid-cols-[35fr_10fr_10fr_10fr_15fr_15fr_20fr_10fr_10fr] bg-gray-50 text-gray-600 font-medium text-sm px-6 py-3">
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
                          {filteredDocFiles.map((file, index) => (
                            <div key={index} className="hover:bg-gray-50 transition-colors duration-150">
                              {/* Desktop View */}
                              <div className="hidden md:grid grid-cols-[35fr_10fr_10fr_10fr_15fr_15fr_20fr_10fr_10fr] items-center px-6 py-4 text-sm">
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
                                        <AutoTranslate>Opening...</AutoTranslate>
                                      </>
                                    ) : (
                                      <>
                                        <EyeIcon className="h-3 w-3" />
                                        <AutoTranslate>View</AutoTranslate>
                                      </>
                                    )}
                                  </button>
                                </div>
                                {/* Action Column - Show restore button for deleted files */}
                                <div className="flex justify-center no-print">
                                  <button
                                    onClick={() => handleRestoreFile(file)}
                                    className="p-1.5 rounded-full bg-green-100 hover:bg-green-200 text-green-700"
                                    title="Restore File"
                                  >
                                    <ArrowUturnLeftIcon className="h-5 w-5" />
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
                                        <AutoTranslate>Opening...</AutoTranslate>
                                      </>
                                    ) : (
                                      <>
                                        <EyeIcon className="h-3 w-3" />
                                        <AutoTranslate>View File</AutoTranslate>
                                      </>
                                    )}
                                  </button>
                                  
                                  {/* Restore button for mobile */}
                                  <button
                                    onClick={() => handleRestoreFile(file)}
                                    className="p-1.5 rounded-full bg-green-100 hover:bg-green-200"
                                    title="Restore File"
                                  >
                                    <ArrowUturnLeftIcon className="h-5 w-5 text-green-700" />
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
                          <AutoTranslate>No deleted files found</AutoTranslate>
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

          {/* Confirmation Modal for File Restoration */}
          {confirmRestoreModalVisible && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
                <h2 className="text-lg font-semibold mb-4">
                  <AutoTranslate>Restore File</AutoTranslate>
                </h2>
                <p className="mb-4">
                  <AutoTranslate>Are you sure you want to restore this file?</AutoTranslate> 
                  <br />
                  <strong>"{fileToRestore?.docName}"</strong>
                </p>
                <div className="flex justify-end gap-4">
                  <button 
                    onClick={() => setConfirmRestoreModalVisible(false)} 
                    className="bg-gray-300 hover:bg-gray-400 p-2 rounded-lg transition-colors"
                    disabled={isRestoreConfirmDisabled}
                  >
                    <AutoTranslate>Cancel</AutoTranslate>
                  </button>
                  <button
                    onClick={confirmRestoreFile}
                    disabled={isRestoreConfirmDisabled}
                    className={`px-4 py-2 rounded-md text-white ${isRestoreConfirmDisabled 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-green-600 hover:bg-green-700'} transition-colors`}
                  >
                    {isRestoreConfirmDisabled ? (
                      <AutoTranslate>Processing...</AutoTranslate>
                    ) : (
                      <AutoTranslate>Restore</AutoTranslate>
                    )}
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

export default TrashDoc;