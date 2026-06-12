import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useLocation } from 'react-router-dom';
import { MdRemoveRedEye, MdOutlineClose, MdEdit } from "react-icons/md";
import { IoIosArrowForward, IoIosArrowBack } from "react-icons/io";
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
import { API_HOST, DOCUMENTHEADER_API, BRANCH_API, DEPAETMENT_API, FILETYPE_API, SYSTEM_ADMIN, BRANCH_ADMIN, DEPARTMENT_ADMIN, USER } from "../API/apiConfig";
import { useNavigate } from "react-router-dom";
import FilePreviewModal from "../Components/FilePreviewModal";
import apiClient from "../API/apiClient";
import LoadingComponent from '../Components/LoadingComponent';
import AutoTranslate from '../i18n/AutoTranslate'; // Import AutoTranslate
import { useLanguage } from '../i18n/LanguageContext'; // Import useLanguage hook
import Popup from "../Components/Popup";


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
  const [popupMessage, setPopupMessage] = useState(null);

  const token = localStorage.getItem("tokenKey");
  const UserId = localStorage.getItem("id");
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

      if (role === USER) {
        response = await apiClient.get(`${API_HOST}/api/documents/rejected/employee/${UserId}`);
      } else if (
        role === SYSTEM_ADMIN ||
        role === BRANCH_ADMIN ||
        role === DEPARTMENT_ADMIN
      ) {
        response = await apiClient.get(`${API_HOST}/api/documents/rejectedByEmp`, {
          headers: {
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
      const response = await apiClient.get(`${BRANCH_API}/findActiveRole`);
      setBranches(response.data || []);
    } catch (error) {
      console.error('Error fetching branches:', error?.response?.data || error.message);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await apiClient.get(`${DEPAETMENT_API}/findAll`);
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

      const response = await apiClient.get(
        `${DOCUMENTHEADER_API}/byDocumentHeader/${documentId}/REJECTED`,
        {
          headers: {
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

      const encodedPath = file.path
        .split("/")
        .map(encodeURIComponent)
        .join("/");

      const fileUrl = `${API_HOST}/api/documents/download/${encodedPath}?action=view`;

      const response = await apiClient.get(fileUrl, {
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

      const apiUrl = `/api/documents/documents/download/qr/${documentId}`;

      const response = await apiClient.get(apiUrl, { responseType: "blob" });

      const qrCodeBlob = response.data;

      if (!qrCodeBlob.type.includes("image/png")) {
        throw new Error(<AutoTranslate>Received data is not a valid image</AutoTranslate>);
      }

      const qrCodeUrl = window.URL.createObjectURL(qrCodeBlob);
      setQrCodeUrl(qrCodeUrl);
    } catch (error) {
      setError(<AutoTranslate>Error displaying QR Code:</AutoTranslate> + error.message);
    }
  };


   const downloadQRCode = async () => {
    try {
      const response = await apiClient.get(
        `/api/documents/documents/download/qr/${selectedDoc.id}`,
        { responseType: "blob" }
      );
  
      const qrCodeUrl = window.URL.createObjectURL(response.data);
  
      const link = document.createElement("a");
      link.href = qrCodeUrl;
      link.download = `QR_Code_${selectedDoc.id}.png`;
      link.click();
  
      window.URL.revokeObjectURL(qrCodeUrl);
  
    } catch (error) {
      console.error(error);
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

  // const handleEdit = (docId) => {
  //   const data = documents.find((item) => item.id === docId);
  //   navigate("/all-documents", { state: data });
  // };

  const handleEdit = async (docId) => {
    try {
      const response = await apiClient.get(`${API_HOST}/api/documents/findBy/${docId}`);
      const latestData = response.data;

      console.log("Fetched latest document:", latestData);

      navigate("/all-documents", { state: latestData });
    } catch (error) {
      console.error("Failed to fetch document:", error);
    }
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
      const response = await apiClient.get(`${FILETYPE_API}/getAllActive`);
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
    <div className="">
      <div className="title">
        <h1><AutoTranslate>Rejected Documents</AutoTranslate></h1>
      </div>

      {popupMessage && (
        <Popup
          message={popupMessage.message}
          type={popupMessage.type}
          onClose={popupMessage.onClose}
        />
      )}
      <div className="card">
        <div className="grid grid-col-4 mb-4">
          {/* Items Per Page (50%) */}
          <div className="form-group ">
            <label htmlFor="itemsPerPage">
              <AutoTranslate>Show:</AutoTranslate>
            </label>
            <select
              id="itemsPerPage"
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
          <div className="form-group ">
            <label htmlFor="branchFilter">
              <AutoTranslate>Branch</AutoTranslate>
            </label>
            <select
              id="branchFilter"
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
          <div className="form-group ">
            <label htmlFor="departmentFilter">
              <AutoTranslate>Department</AutoTranslate>
            </label>
            <select
              id="departmentFilter"
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
          <div className="form-group ">
            <label htmlFor="searchId">
              <AutoTranslate>Search</AutoTranslate>
            </label>
            <input
              id="searchId"
              type="text"
              placeholder="Search..."
              className="searchIcon"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="table-wrapper">
          <table className="">
            <thead>
              <tr>
                <th className="text-center">
                  <AutoTranslate>SN</AutoTranslate>
                </th>
                <th>
                  <AutoTranslate>File No</AutoTranslate>
                </th>
                <th>
                  <AutoTranslate>Title</AutoTranslate>
                </th>
                <th>
                  <AutoTranslate>Subject</AutoTranslate>
                </th>
                <th>
                  <AutoTranslate>Category</AutoTranslate>
                </th>
                <th className="text-center">
                  <AutoTranslate>No. Of Attached Files</AutoTranslate>
                </th>
                {role === USER && (
                  <th className="text-center">
                    <AutoTranslate>Edit</AutoTranslate>
                  </th>
                )}
                <th className="text-center">
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
                    <td className="text-center">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td>{doc.fileNo || <AutoTranslate>N/A</AutoTranslate>}</td>
                    <td>{doc.title || <AutoTranslate>N/A</AutoTranslate>}</td>
                    <td>{doc.subject || <AutoTranslate>N/A</AutoTranslate>}</td>
                    <td>
                      {doc.categoryMaster?.name || <AutoTranslate>No Category</AutoTranslate>}
                    </td>
                    <td className="text-center">
                      {doc?.documentDetails?.length}
                    </td>
                    {role === USER && (
                      <td className="text-center">
                        <div className="btn-center">
                          <button className="viewBtn" onClick={() => handleEdit(doc.id)}>
                            <MdEdit />
                          </button>
                        </div>
                      </td>
                    )}
                    <td className="text-center">
                      <div className="btn-center">
                        <button className="viewBtn" onClick={() => openModal(doc)}
                          title={`View details for ${doc.title || "this document"
                            }`}>
                          <MdRemoveRedEye />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={role === USER ? "8" : "7"}
                    className="border p-4 text-center text-gray-500"
                  >
                    <AutoTranslate>No data found.</AutoTranslate>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination Controls */}
        <div className="paginationWp">
          <div className="items">
            <div className="paginationText">
              <span className="text-sm text-gray-700">
                <AutoTranslate>
                  {`Showing ${totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0
                    } to ${Math.min(currentPage * itemsPerPage, totalItems)} of ${totalItems} entries.`}
                </AutoTranslate>
              </span>
              {/* Page Count Info */}
              <span className="text-sm text-gray-700 mx-2">
                (<AutoTranslate>Pages</AutoTranslate> {totalPages})
              </span>
            </div>
          </div>
          <div className="items">
            <div className="paginationBtn">
              {/* Previous Button */}
              <button title={`${currentPage === 1 || totalPages === 0 ? "End" : "Previous"}`}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || totalPages === 0}
                className={`${currentPage === 1 || totalPages === 0 ? "cursor-not-allowed" : ""}`}
              >
                {/* <ArrowLeftIcon className="inline h-4 w-4 mr-2 mb-1" /> */}
                {/* <AutoTranslate>Previous</AutoTranslate> */}
                <IoIosArrowBack />
              </button>

              {/* Page Number Buttons */}
              {totalPages > 0 && getPageNumbers().map((page) => (
                <button key={page} onClick={() => setCurrentPage(page)} className={`${currentPage === page ? "active" : ""}`}>
                  {page}
                </button>
              ))}

              {/* Next Button */}
              <button title={`${currentPage === totalPages || totalPages === 0 ? "End" : "Next"}`}
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className={`${currentPage === totalPages || totalPages === 0 ? "cursor-not-allowed" : ""}`}
              >
                {/* <AutoTranslate>Next</AutoTranslate> */}
                {/* <ArrowRightIcon className="inline h-4 w-4 ml-2 mb-1" /> */}
                <IoIosArrowForward />
              </button>
            </div>
          </div>

        </div>

        <FilePreviewModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onDownload={(file, action = "download") => handleDownload(file, action)}
          fileType={contentType}
          fileUrl={blobUrl}
          fileName={selectedDocFile?.docName}
          fileData={selectedDocFile}
        />

      </div>

      {/* Document Details Code */}
      <>
        {isOpen && selectedDoc && (
          <div className="overlayModal">
            <div className="document-modal">
              {/* Header */}
              <div className="modal-header">
                <div className="modal-title">
                  <div className="bg-indigo-600 text-white rounded-lg p-2">
                    <span className="text-lg font-bold">D</span>
                    <span className="text-lg font-bold">MS</span>
                  </div>
                  <h2><AutoTranslate>Document Details</AutoTranslate></h2>
                </div>
                <div className="headerRight">
                  {/* Print Button */}
                  <button className="printBtn" onClick={() => handlePrintReport(selectedDoc?.id)} title="Print">
                    <PrinterIcon className="h-6 w-6" />
                  </button>

                  {/* Close Button */}
                  <button className="closeBtn" onClick={closeModal} title="Close">
                    <MdOutlineClose />
                  </button>
                </div>
              </div>


              {/* Modal body Content */}
              <div className="modal-body">
                <div className="bodyScroller print:overflow-visible print:max-h-none">
                  {/* Document Details */}
                  <div className="top-section">
                    {/* Information Column */}
                    <div className="info-card">
                      <div className="info-grid">
                        {[
                          { label: "Branch", value: selectedDoc?.branchMaster?.name },
                          { label: "Department", value: selectedDoc?.departmentMaster?.name },
                          { label: "File No.", value: selectedDoc?.fileNo },
                          { label: "Title", value: selectedDoc?.title },
                          { label: "Subject", value: selectedDoc?.subject },
                          { label: "Category", value: selectedDoc?.categoryMaster?.name || <AutoTranslate>No Category</AutoTranslate> },
                          // { label: "Status", value: selectedDoc?.approvalStatus },
                          { label: "Upload By", value: selectedDoc?.employee?.name },
                        ].map((item, idx) => (
                          <p key={idx} className="text-md text-gray-700">
                            <AutoTranslate>{item.label}</AutoTranslate> <AutoTranslate>{item.value || "N/A"}</AutoTranslate>
                          </p>
                        ))}
                      </div>
                    </div>

                    {/* QR Code Column */}
                    <div className="qr-card">
                      <h2 className="mb-4"><AutoTranslate>QR Code:</AutoTranslate></h2>
                      {selectedDoc?.qrPath ? (
                        <>
                          <div className="imgWp">
                            <img src={qrCodeUrl} alt="QR Code" />
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
<div className="mt-8">
  <div className="attachedWp relative">
    <h2 className="mb-0">
      <AutoTranslate>Attached Files</AutoTranslate>
    </h2>
    <div className="form-group">
      <input
        type="text"
        placeholder="Search files..."
        value={searchFileTerm}
        onChange={(e) => setSearchFileTerm(e.target.value)}
        className="searchIcon"
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
      <div className="hidden md:grid bg-gray-50 text-gray-600 font-medium text-sm px-6 py-3" style={{ gridTemplateColumns: "minmax(200px, 3fr) minmax(80px, 0.8fr) minmax(80px, 0.8fr) minmax(100px, 0.8fr) minmax(130px, 1.2fr) minmax(110px, 1fr) minmax(150px, 1.2fr) minmax(80px, 0.8fr)" }}>
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
            {/* Desktop View - Same column widths as header */}
            <div className="hidden md:grid px-6 py-4 text-sm items-center" style={{ gridTemplateColumns: "minmax(200px, 3fr) minmax(80px, 0.8fr) minmax(80px, 0.8fr) minmax(100px, 0.8fr) minmax(130px, 1.2fr) minmax(110px, 1fr) minmax(150px, 1.2fr) minmax(80px, 0.8fr)" }}>
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
              <div className="text-center text-gray-700 truncate" title={file.updetedBy}>{file.updetedBy || "--"}</div>
              <div className="text-center text-gray-700">{formatDate(file.updatedOn)}</div>
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
                    ${openingFileIndex === index ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"} text-white`}
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
                  <p className="text-gray-700">{file.year}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500"><AutoTranslate>Version</AutoTranslate></p>
                  <p className="text-gray-700">{file.version}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500"><AutoTranslate>Action By</AutoTranslate></p>
                  <p className="text-gray-700 truncate" title={file.updetedBy}>{file.updetedBy || "--"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500"><AutoTranslate>Action Date</AutoTranslate></p>
                  <p className="text-gray-700">{formatDate(file.updatedOn)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500"><AutoTranslate>Reason</AutoTranslate></p>
                  <p className="text-gray-700 break-words">{file.rejectionReason || "--"}</p>
                </div>
              </div>

              <div className="flex justify-center mt-4 no-print">
                <button
                  onClick={() => {
                    setOpeningFileIndex(index);
                    setSelectedDocFiles(file);
                    openFile(file).finally(() => setOpeningFileIndex(null));
                  }}
                  disabled={openingFileIndex !== null}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200
                    ${openingFileIndex === index ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"} text-white`}
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
</div>                </div>
              </div>

            </div>
          </div>
        )}

        {viewFileTypeModel && (
        <div className="overlayModal">
          <div className="document-modal modal-sm">
            {/* Header */}
            <div className="modal-header">
              <div className="modal-title">
                <h2><AutoTranslate>Supported File Types</AutoTranslate></h2>
              </div>
              <div className="headerRight">
                {/* Close Button */}
                <button className="closeBtn" onClick={handlecloseFileType} title="Close">
                  <MdOutlineClose />
                </button>
              </div>
            </div>

            {/* Modal body Content */}
            <div className="modal-body">
              <div className="bodyScroller print:overflow-visible print:max-h-none">
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
          </div>
        </div>
        )}

      </>

    </div>
  );
}

export default RejectedDoc;