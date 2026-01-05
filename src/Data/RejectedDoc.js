import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useLocation } from 'react-router-dom';
import {
  EyeIcon,
  XMarkIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowDownTrayIcon,
  QrCodeIcon,
  ArrowPathIcon,
  DocumentIcon,
  PencilIcon,
  PrinterIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/solid";
import { API_HOST, DOCUMENTHEADER_API, BRANCH_API, DEPAETMENT_API, FILETYPE_API } from "../API/apiConfig";
import { useNavigate } from "react-router-dom";
import FilePreviewModal from "../Components/FilePreviewModal";
import apiClient from "../API/apiClient";
import LoadingComponent from '../Components/LoadingComponent';
import AutoTranslate from '../i18n/AutoTranslate'; // Import AutoTranslate
import { useLanguage } from '../i18n/LanguageContext'; // Import useLanguage hook

function RejectedDoc() {
  // Get language context
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

  const [branchFilter, setBranchFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const [documents, setDocuments] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState({ paths: [] });
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [printTrue, setPrintTrue] = useState(false);
  const [highlightedDocId, setHighlightedDocId] = useState(null);
  const [blobUrl, setBlobUrl] = useState("");
  const [contentType, setContentType] = useState("");
  const [selectedDocFile, setSelectedDocFiles] = useState(null);
  const [searchFileTerm, setSearchFileTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [, setIsOpeningFile] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [openingFileIndex, setOpeningFileIndex] = useState(null);
  const [viewFileTypeModel, setViewFileTypeModel] = useState(false);
  const [filesType, setFilesType] = useState([]);
  const [, setIsUploading] = useState(false);
  const [, setOpeningFiles] = useState(null);

  const token = localStorage.getItem("tokenKey");
  const UserId = localStorage.getItem("userId");
  const role = localStorage.getItem("role");

  // Debug language status
  useEffect(() => {
    console.log('🔍 RejectedDoc Component - Language Status:', {
      currentLanguage,
      defaultLanguage,
      isTranslationNeeded: isTranslationNeeded(),
      translationStatus
    });
  }, [currentLanguage, defaultLanguage, translationStatus, isTranslationNeeded]);

  useEffect(() => {
    fetchDocuments();
    fetchBranches();
    fetchDepartments();
  }, []);

  useEffect(() => {
    // Check if there's a document ID passed from notification
    const searchParams = new URLSearchParams(location.search);
    const notificationDocId = searchParams.get('docId');

    if (notificationDocId && documents.length > 0) {
      const filteredDocuments = documents.filter((doc) =>
        Object.entries(doc).some(([key, value]) => {
          if (key === "id") {
            return value.toString() === notificationDocId;
          }
          return false;
        })
      );

      if (filteredDocuments.length > 0) {
        const highlightId = parseInt(notificationDocId);
        setHighlightedDocId(highlightId);

        // Find and set the correct page
        const pageForDocument = findPageForDocument(highlightId);
        setCurrentPage(pageForDocument);
      }
    }
  }, [location.search, documents, itemsPerPage]);

  const findPageForDocument = (documentId) => {
    const documentIndex = filteredDocuments.findIndex(doc => doc.id === documentId);
    if (documentIndex !== -1) {
      return Math.ceil((documentIndex + 1) / itemsPerPage);
    }
    return 1;
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      let response;

      if (role === "USER") {
        response = await axios.get(
          `${API_HOST}/api/documents/rejected/employee/${UserId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      } else if (
        role === "ADMIN" ||
        role === "BRANCH ADMIN" ||
        role === "DEPARTMENT ADMIN"
      ) {
        response = await axios.get(`${API_HOST}/api/documents/rejectedByEmp`, {
          headers: {
            Authorization: `Bearer ${token}`,
            employeeId: UserId,
          },
        });
      }

      setDocuments(response.data);
    } catch (error) {
      console.error("Error fetching documents:", error);
      setError("Failed to fetch documents. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await axios.get(`${BRANCH_API}/findActiveRole`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBranches(response.data || []);
    } catch (error) {
      console.error('Error fetching branches:', error?.response?.data || error.message);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await axios.get(`${DEPAETMENT_API}/findAll`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDepartments(response.data || []);
    } catch (error) {
      console.error('Error fetching departments:', error?.response?.data || error.message);
    }
  };

  const fetchPaths = async (doc) => {
    try {
      if (!token) {
        throw new Error("No authentication token found.");
      }

      if (!doc) {
        console.error("Document is null or undefined");
        return null;
      }

      if (!doc.id) {
        console.error("Invalid document: No ID found", doc);
        return null;
      }

      const documentId = doc.id.toString().trim();
      if (!documentId) {
        console.error("Document ID is empty or invalid", doc);
        return null;
      }

      console.log(`Attempting to fetch paths for document ID: ${documentId}`);
      console.log(
        `Full URL: ${DOCUMENTHEADER_API}/byDocumentHeader/${documentId}`
      );

      const response = await axios.get(
        `${DOCUMENTHEADER_API}/byDocumentHeader/${documentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Paths response:", response.data);

      setSelectedDoc((prevDoc) => ({
        ...prevDoc,
        paths: Array.isArray(response.data) ? response.data : [],
      }));

      return response.data;
    } catch (error) {
      console.error("Error in fetchPaths:", error);

      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error("Server responded with error:", {
            status: error.response.status,
            data: error.response.data,
          });
        } else if (error.request) {
          console.error("No response received:", error.request);
        }
      }

      alert(
        `Failed to fetch document paths: ${error.message || "Unknown error"}`
      );

      return null;
    }
  };

  console.log("Error: ", error);

  const openFile = async (file) => {
    try {
      setOpeningFiles(true);

      // Encode each segment separately to preserve folder structure
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
    const branch = selectedDoc.employee.branch.name.replace(/ /g, "_");
    const department = selectedDoc.employee.department.name.replace(/ /g, "_");
    const year = selectedDoc.yearMaster.name.replace(/ /g, "_");
    const category = selectedDoc.categoryMaster.name.replace(/ /g, "_");
    const version = file.version;
    const fileName = file.docName.replace(/ /g, "_");

    const fileUrl = `${API_HOST}/api/documents/download/${encodeURIComponent(
      branch
    )}/${encodeURIComponent(department)}/${encodeURIComponent(
      year
    )}/${encodeURIComponent(category)}/${encodeURIComponent(
      version
    )}/${encodeURIComponent(fileName)}`;

    const response = await apiClient.get(fileUrl, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: "blob",
    });

    const downloadBlob = new Blob([response.data], {
      type: response.headers["content-type"],
    });

    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(downloadBlob);
    link.download = file.docName; // download actual name with extension
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const filteredDocFiles = useMemo(() => {
    if (!selectedDoc || !Array.isArray(selectedDoc.paths)) return [];

    return selectedDoc.paths.filter((file) => {
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
      setError(""); // Clear any previous errors
    } catch (error) {
      setQrCodeUrl(null);
      setError("Error displaying QR Code: " + error.message);
    }
  };

  const downloadQRCode = async () => {
    if (!selectedDoc.id) {
      alert("Please enter a document ID");
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
      setError("Error downloading QR Code: " + error.message);
    } finally {
    }
  };

  const openModal = (doc) => {
    setSelectedDoc(doc);
    fetchPaths(doc);
    setIsOpen(true);
    fetchQRCode(doc.id);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    };
    return date.toLocaleString("en-GB", options).replace(",", "");
  };

  // Enhanced filtering logic with branch/department filters and null-safe search
  const filteredDocuments = documents
    .filter((doc) => {
      const matchesBranch = branchFilter === '' || doc.employee?.branch?.id === parseInt(branchFilter);
      const matchesDepartment = departmentFilter === '' || doc.employee?.department?.id === parseInt(departmentFilter);
      return matchesBranch && matchesDepartment;
    })
    .filter((doc) =>
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
            value.department?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            value.branch?.name?.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
        if (key === "paths" && Array.isArray(value)) {
          return value.some((file) => file.docName?.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        if (key === "updatedOn" || key === "createdOn") {
          const date = value ? formatDate(value).toLowerCase() : '';
          return date.includes(searchTerm.toLowerCase());
        }
        if (key === "approvalStatus" && value) {
          return value.toLowerCase().includes(searchTerm.toLowerCase());
        }
        if (typeof value === "string") {
          return value.toLowerCase().includes(searchTerm.toLowerCase());
        }
        return false;
      })
    )
    .sort((a, b) => {
      // First sort by status change (non-pending status goes to top)
      if (a.approvalStatus !== "Pending" && b.approvalStatus === "Pending") return -1;
      if (a.approvalStatus === "Pending" && b.approvalStatus !== "Pending") return 1;

      // If both have the same status state, sort by approval date
      return new Date(b.approvalStatusOn || 0) - new Date(a.approvalStatusOn || 0);
    });

  const totalItems = filteredDocuments.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getPageNumbers = () => {
    const maxPageNumbers = 5; // Number of page buttons to show
    const startPage = Math.floor((currentPage - 1) / maxPageNumbers) * maxPageNumbers + 1;
    const endPage = Math.min(startPage + maxPageNumbers - 1, totalPages);
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  };

  const handleEdit = (docId) => {
    const data = documents.find((item) => item.id === docId);
    navigate("/all-documents", { state: data });
  };

  const printPage = () => {
    setPrintTrue(true);
    window.print();
    setTimeout(() => {
      setPrintTrue(false);
    }, 1000);
  };

  const closeModal = () => {
    setIsOpen(false);
    setSelectedDoc(null);
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

      // Create a temporary <a> element to download the PDF
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `document_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading PDF:", error);
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
    setIsUploading(false);
  }

  const handlecloseFileType = () => {
    setViewFileTypeModel(false);
    setIsUploading(false);
  }

  const filteredFiles = (filesType ?? []).filter((file) =>
    file.filetype?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.extension?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <LoadingComponent />;
  }

  return (
    <div className="px-1">
      <h1 className="text-xl mb-4 font-semibold">
        <AutoTranslate>RejectedDocuments</AutoTranslate>
      </h1>
      <div className="bg-white p-4 rounded-lg shadow-sm overflow-x-auto">
        <div className="mb-4 bg-slate-100 p-4 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Items Per Page (50%) */}
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

          {/* Branch Filter */}
          <div className="flex items-center bg-blue-500 rounded-lg w-full flex-1 md:w-1/5">
            <label htmlFor="branchFilter" className="mr-2 ml-2 text-white text-sm">
              <AutoTranslate>Branch</AutoTranslate>
            </label>
            <select
              id="branchFilter"
              className="border rounded-r-lg p-1.5 outline-none w-full"
              value={branchFilter}
              onChange={(e) => {
                setBranchFilter(e.target.value);
                setDepartmentFilter('');
                setCurrentPage(1);
              }}
            >
              <option value=""><AutoTranslate>All Branches</AutoTranslate></option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div className="flex items-center bg-blue-500 rounded-lg w-full flex-1 md:w-1/5">
            <label htmlFor="departmentFilter" className="mr-2 ml-2 text-white text-sm">
              <AutoTranslate>Department</AutoTranslate>
            </label>
            <select
              id="departmentFilter"
              className="border rounded-r-lg p-1.5 outline-none w-full"
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value);
                setCurrentPage(1);
              }}
              disabled={branchFilter === ''}
            >
              <option value=""><AutoTranslate>All Departments</AutoTranslate></option>
              {departments
                .filter((dept) => branchFilter === '' || dept.branch?.id === parseInt(branchFilter))
                .map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Search Input (Remaining Space) */}
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
                {role === "USER" && (
                  <th className="border p-2 text-left">
                    <AutoTranslate>Edit</AutoTranslate>
                  </th>
                )}
                <th className="border p-2 text-left">
                  <AutoTranslate>view</AutoTranslate>
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
                    <td className="border p-2">{doc.fileNo || <AutoTranslate>N/A</AutoTranslate>}</td>
                    <td className="border p-2">{doc.title || <AutoTranslate>N/A</AutoTranslate>}</td>
                    <td className="border p-2">{doc.subject || <AutoTranslate>N/A</AutoTranslate>}</td>
                    <td className="border p-2">
                      {doc.categoryMaster?.name || <AutoTranslate>No Category</AutoTranslate>}
                    </td>
                    <td className="border p-2">
                      {doc.approvalStatus || <AutoTranslate>N/A</AutoTranslate>}
                    </td>
                    {role === "USER" && (
                      <td className="border p-2">
                        <button onClick={() => handleEdit(doc.id)}>
                          <PencilIcon className="h-6 w-6 text-white bg-yellow-400 rounded-xl p-1" />
                        </button>
                      </td>
                    )}
                    <td className="border p-2">
                      <button
                        onClick={() => openModal(doc)}
                        title={`View details for ${doc.title || "this document"
                          }`}
                      >
                        <EyeIcon className="h-6 w-6 bg-green-400 rounded-xl p-1 text-white" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={role === "USER" ? "8" : "7"}
                    className="border p-4 text-center text-gray-500"
                  >
                    <AutoTranslate>No data found.</AutoTranslate>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {/* Document Details Code */}
          <>
            {isOpen && selectedDoc && (
              <div className="fixed inset-0 flex items-center justify-center z-50 bg-gray-900/80 backdrop-blur-sm print:bg-white overflow-y-auto p-4">
                <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-7xl p-6 my-8 mx-auto">
                  <div className="max-h-[90vh] overflow-y-auto print:overflow-visible print:max-h-none">

                    {/* Header Actions */}
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

                    {/* Document Details */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                      {/* Information Column */}
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

                      {/* QR Code Column */}
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
                          {/* Table Header - Hidden on mobile */}
                          <div className="hidden md:grid grid-cols-[35fr_10fr_10fr_10fr_15fr_15fr_20fr_10fr] bg-gray-50 text-gray-600 font-medium text-sm px-6 py-3">
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

                          {/* File List */}
                          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                            {filteredDocFiles.map((file, index) => (
                              <div key={index} className="hover:bg-gray-50 transition-colors duration-150">
                                {/* Desktop View */}
                                <div className="hidden md:grid grid-cols-[35fr_10fr_10fr_10fr_15fr_15fr_20fr_10fr] items-center px-6 py-4 text-sm">
                                  <div className="text-left text-gray-800 break-words">
                                    <strong>{index + 1}.</strong> {file.docName}
                                  </div>
                                  <div className="text-center text-gray-700">{file.year}</div>
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
                                      <p className="text-gray-700">{file.year}</p>
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

                                  <div className="mt-3 flex justify-end">
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

            {viewFileTypeModel && (
              <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
                <div className="w-80 sm:w-96 bg-white rounded-xl shadow-xl p-5 border border-gray-200 max-h-[80vh] overflow-y-auto transition-all">

                  {/* Header */}
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">
                      <AutoTranslate>Supported File Types</AutoTranslate>
                    </h2>
                    <button
                      onClick={handlecloseFileType}
                      className="text-gray-400 hover:text-red-500 text-xl focus:outline-none"
                      aria-label="Close"
                    >
                      &times;
                    </button>
                  </div>

                  {/* Search Input */}
                  <input
                    type="text"
                    placeholder="Search file type..."
                    value={searchTerm}
                    onChange={(e) => setSearchFileTerm(e.target.value)}
                    maxLength={20}
                    className="w-full p-2 mb-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />

                  {/* List */}
                  <ul className="space-y-2">
                    {filteredFiles.length > 0 ? (
                      filteredFiles.map((file) => (
                        <li
                          key={file.id}
                          className="flex justify-between items-center px-3 py-2 bg-gray-50 rounded-md hover:bg-blue-50 transition text-sm"
                        >
                          <span className="text-gray-800 font-medium">{file.filetype}</span>
                          <span className="text-gray-500">{file.extension}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-center text-gray-500 text-sm">
                        <AutoTranslate>No matching file types found</AutoTranslate>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}

          </>
          <FilePreviewModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onDownload={handleDownload}
            fileType={contentType}
            fileUrl={blobUrl}
            fileName={selectedDocFile?.docName}
            fileData={selectedDocFile}
          />
          {/* Pagination Controls */}
          <div className="flex items-center mt-4">
            {/* Previous Button */}
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1 || totalPages === 0}
              className={`px-3 py-1 rounded mr-3 ${currentPage === 1 || totalPages === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"
                }`}
            >
              <ArrowLeftIcon className="inline h-4 w-4 mr-2 mb-1" />
              <AutoTranslate>Previous</AutoTranslate>
            </button>

            {/* Page Number Buttons */}
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

            {/* Page Count Info */}
            <span className="text-sm text-gray-700 mx-2">
              <AutoTranslate>of</AutoTranslate> {totalPages} <AutoTranslate>pages</AutoTranslate>
            </span>

            {/* Next Button */}
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
}

export default RejectedDoc;