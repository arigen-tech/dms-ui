import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useLocation } from 'react-router-dom';
import { IoIosArrowForward, IoIosArrowBack } from "react-icons/io";
import { MdRemoveRedEye, MdOutlineClose } from "react-icons/md";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowPathIcon,
  PrinterIcon,
  XMarkIcon,
  EyeIcon,
} from "@heroicons/react/24/solid";
import { API_HOST, DOCUMENTHEADER_API, BRANCH_API, DEPAETMENT_API } from "../API/apiConfig";
import FilePreviewModal from "../Components/FilePreviewModal";
import apiClient from "../API/apiClient";
import LoadingComponent from '../Components/LoadingComponent';
import AutoTranslate from '../i18n/AutoTranslate'; // Import AutoTranslate
import { useLanguage } from '../i18n/LanguageContext'; // Import useLanguage hook
import Popup from '../Components/Popup';

const Approve = () => {
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

  const location = useLocation();
  const [branchFilter, setBranchFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [isOpen, setIsOpen] = useState(false);
  const [rejectReasonError, setRejectReasonError] = useState(false);
  const [printTrue, setPrintTrue] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState({ paths: [] });
  const [openingFiles, setOpeningFiles] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [documentToApprove, setDocumentToApprove] = useState(null);
  const [isRejectReasonModalOpen, setIsRejectReasonModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [, setError] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [highlightedDocId, setHighlightedDocId] = useState(null);
  const [blobUrl, setBlobUrl] = useState("");
  const [contentType, setContentType] = useState("");
  const [selectedDocFile, setSelectedDocFiles] = useState(null);
  const [searchFileTerm, setSearchFileTerm] = useState("");
  const [, setIsOpeningFile] = useState(false);
  const [, setUserBranch] = useState(null);
  const [openingFileIndex, setOpeningFileIndex] = useState(null);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [popupMessage, setPopupMessage] = useState(null);

  // Debug language status
  useEffect(() => {
    console.log('🔍 Approve Component - Language Status:', {
      currentLanguage,
      defaultLanguage,
      isTranslationNeeded: isTranslationNeeded(),
      translationStatus
    });
  }, [currentLanguage, defaultLanguage, translationStatus, isTranslationNeeded]);

  useEffect(() => {
    fetchUserBranch();
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

  const showPopup = (message, type = 'info') => {
    setPopupMessage({
      message,
      type,
      onClose: () => setPopupMessage(null)
    });
  };

  const fetchUserBranch = async () => {
    setLoading(true);
    setError("");
    try {
      const userId = localStorage.getItem("id");
      const response = await apiClient.get(
        `${API_HOST}/employee/findById/${userId}`);
      setUserBranch(response.data.branch);
    } catch (error) {
      console.error("Error fetching user branch:", error);
      setError("Error fetching user branch.");
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    setLoading(true);
    setError("");
    try {
      const userId = localStorage.getItem("id");

      if (!userId) {
        setError("Authentication details missing. Please log in again.");
        setLoading(false);
        return;
      }
      const userResponse = await apiClient.get(
        `${API_HOST}/employee/findById/${userId}`);

      const departmentId = userResponse.data?.department?.id;
      const branchId = userResponse.data?.branch?.id;

      let url;
      if (!branchId && !departmentId) {
        url = `${DOCUMENTHEADER_API}/pending`;
      } else if (departmentId) {
        url = `${DOCUMENTHEADER_API}/pendingByBranch/${branchId}/${departmentId}`;
      } else {
        url = `${DOCUMENTHEADER_API}/pendingByBranch/${branchId}`;
      }

      const response = await apiClient.get(url);

      setDocuments(response.data);

      console.log("all doc ", response.data);
    } catch (error) {
      if (error?.response?.status === 401) {
        setError("Unauthorized access. Please log in again.");
      } else {
        setError("Error fetching documents. Please try again later.");
      }
      console.error(
        "Fetch documents error:",
        error?.response?.data || error.message
      );
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


      const response = await apiClient.get(
        `${API_HOST}/api/documents/byDocumentHeader/${doc.id}/PENDING`);

      console.log("paths", response.data);

      setSelectedDoc((prevDoc) => ({
        ...prevDoc,
        paths: response.data || [],
      }));
    } catch (error) {
      console.error("Error fetching documents:", error.message || error);
    }
  };

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

  const handleStatusChange = (doc, status) => {
    if (status === "REJECTED") {
      setDocumentToApprove(doc);
      setIsRejectReasonModalOpen(true);
    } else if (status === "APPROVED") {
      setDocumentToApprove(doc);
      setIsConfirmModalOpen(true);
    }
  };

  const approveDocument = async () => {
    try {
      const employeeId = localStorage.getItem("id");

      const response = await apiClient.patch(
        `/api/documents/${documentToApprove.id}/approval-status`,
        null,
        {
          headers: {
            employeeId: employeeId,
          },
          params: {
            status: "APPROVED",
          },
        }
      );

      console.log("Approval response:", response.data);

      setSuccessMessage("Document Approved Successfully");
      setIsConfirmModalOpen(false);
      fetchDocuments();

      setIsSuccessModalOpen(true);
    } catch (error) {
      console.error("Error approving document:", error);
    }
  };




  const handleRejectDocument = async () => {
    try {
      const employeeId = localStorage.getItem("id");

      const response = await apiClient.patch(
        `/api/documents/${documentToApprove.id}/approval-status`,
        null,
        {
          headers: {
            employeeId: employeeId,
          },
          params: {
            status: "REJECTED",
            rejectionReason: rejectReason,
          },
        }
      );

      console.log("Rejection response:", response.data);

      setSuccessMessage("Document Rejected Successfully");
      setIsRejectReasonModalOpen(false);
      setRejectReason("");
      fetchDocuments();

      setIsConfirmModalOpen(false);
      setIsSuccessModalOpen(true);
    } catch (error) {
      console.error("Error rejecting document:", error);
    }
  };


  const openModal = (doc) => {
    setSelectedDoc(doc);
    fetchPaths(doc);
    setIsOpen(true);
    fetchQRCode(doc.id);
  };

  console.log("selectedDoc Data:", selectedDoc);
  const closeModal = () => {
    setIsOpen(false);
    setSelectedDoc(null);
  };

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


  const printPage = () => {
    setPrintTrue(true);
    window.print();
    setTimeout(() => {
      setPrintTrue(false);
    }, 1000);
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

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = (
      doc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.fileNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.categoryMaster?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.employee?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.employee?.department?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.employee?.branch?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const matchesBranch = branchFilter === '' || doc.employee?.branch?.id === parseInt(branchFilter);
    const matchesDepartment = departmentFilter === '' || doc.employee?.department?.id === parseInt(departmentFilter);

    return matchesSearch && matchesBranch && matchesDepartment;
  });

  const totalItems = filteredDocuments.length;
  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
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

  if (loading) {
    return <LoadingComponent />;
  }

  return (
    <div className="">
      <div className="title">
        <h1><AutoTranslate>Pending Documents</AutoTranslate></h1>
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

          {/* Branch Filter Dropdown */}
          <div className="form-group">
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

          {/* Department Filter Dropdown */}
          <div className="form-group">
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
                .filter(dept => branchFilter === '' || dept.branch?.id === parseInt(branchFilter))
                .map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Search Input (Remaining Space) */}
          <div className="form-group">
            <label htmlFor="searchId">
              <AutoTranslate>Search</AutoTranslate>
            </label>
            <input
              type="text"
              id="searchId"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="table-wrapper">
          <table className="">
            <thead>
              <tr>
                <th className="text-center">
                  <AutoTranslate>SN</AutoTranslate>
                </th>
                <th>
                  <AutoTranslate>Title</AutoTranslate>
                </th>
                <th>
                  <AutoTranslate>File No</AutoTranslate>
                </th>
                <th>
                  <AutoTranslate>Subject</AutoTranslate>
                </th>
                <th>
                  <AutoTranslate>Branch</AutoTranslate>
                </th>
                <th>
                  <AutoTranslate>Department</AutoTranslate>
                </th>
                <th>
                  <AutoTranslate>Category</AutoTranslate>
                </th>
                <th>
                  <AutoTranslate>Uploaded Date</AutoTranslate>
                </th>
                <th>
                  <AutoTranslate>User</AutoTranslate><AutoTranslate> Name</AutoTranslate>
                </th>
                <th>
                  <AutoTranslate>No. Of Attached Files</AutoTranslate>
                </th>
                <th className="text-center">
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
                    <td className="text-center">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td>{doc.title}</td>
                    <td>{doc.fileNo}</td>
                    <td>{doc.subject}</td>
                    <td>
                      {doc.branchMaster
                        ? doc.branchMaster?.name
                        : <AutoTranslate>No Branch</AutoTranslate>}
                    </td>
                    <td>
                      {doc.departmentMaster
                        ? doc.departmentMaster?.name
                        : <AutoTranslate>No Department</AutoTranslate>}
                    </td>
                    <td>
                      {doc.categoryMaster ? doc.categoryMaster.name : ""}
                    </td>
                    <td>
                      {new Date(doc.createdOn).toLocaleDateString()}
                    </td>

                    <td>
                      {doc.employee ? doc.employee.name : "N/A"}
                    </td>

                    <td className="text-center">{doc.documentDetails.length}</td>
                    <td className="text-center">
                      <div className="btn-center">
                        <button className="viewBtn" onClick={() => openModal(doc)}>
                          {/* <EyeIcon className="h-6 w-6 bg-green-400 rounded-xl p-1 text-white" /> */}
                          <MdRemoveRedEye />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="11" className="text-center">
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

        <>
          {isOpen && selectedDoc && (
            <div className="overlayModal">
              <div className="document-modal">
                {/* Header */}
                <div className="modal-header">
                  <div className="modal-title">
                    <div className="flex items-center space-x-2">
                      <p className="text-lg font-extrabold text-indigo-600 border-b-4 border-indigo-600">D</p>
                      <p className="text-lg font-extrabold text-indigo-600 border-t-4 border-indigo-600">MS</p>
                    </div>
                    <h2><AutoTranslate>Document Information</AutoTranslate></h2>
                  </div>
                  <div className="headerRight">
                    <p className="text-sm text-gray-600 mt-2 sm:mt-0">
                      <strong><AutoTranslate>Uploaded Date:</AutoTranslate></strong> {formatDate(selectedDoc?.createdOn)}
                    </p>
                    {/* Print Button */}
                    <button className="printBtn" onClick={printPage} title="Print">
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
                      <div className="info-card">
                        <div className="info-grid">
                          {[
                            { label: "Branch", value: selectedDoc?.employee?.branch?.name },
                            { label: "Department", value: selectedDoc?.employee?.department?.name },
                            { label: "File No.", value: selectedDoc?.fileNo },
                            { label: "Title", value: selectedDoc?.title },
                            { label: "Subject", value: selectedDoc?.subject },
                            {
                              label: "Category",
                              value: selectedDoc?.categoryMaster?.name || <AutoTranslate>No Category</AutoTranslate>,
                            },
                            // { label: "Status", value: selectedDoc?.approvalStatus },
                            { label: "Upload By", value: selectedDoc?.employee?.name },
                          ].map((item, idx) => (
                            <p key={idx} className="text-md text-gray-700">
                              <AutoTranslate>{item.label}</AutoTranslate> <AutoTranslate>{item.value || "N/A"}</AutoTranslate>
                            </p>
                          ))}

                        </div>
                      </div>
                      {/* QR Code */}
                      <div className="qr-card">
                        <h2 className="mb-4"><AutoTranslate>QR Code:</AutoTranslate></h2>
                        {selectedDoc?.qrPath ? (
                          <>
                            <div className="imgWp">
                              <img src={qrCodeUrl} alt="QR Code" />
                            </div>
                            <button
                              onClick={downloadQRCode}
                              className="mt-4 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 no-print"
                            >
                              <AutoTranslate>Download</AutoTranslate>
                            </button>
                          </>
                        ) : (
                          <p className="text-gray-500">
                            <AutoTranslate>No QR code available</AutoTranslate>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Attached Files */}
                    <div className="mt-8">
                      <div className="attachedWp relative">
                        <h2 className="mb-0">
                          <AutoTranslate>Attached Files</AutoTranslate>
                        </h2>
                        <div className="form-group">
                          <input
                            type="text"
                            placeholder="Search Files..."
                            value={searchFileTerm}
                            onChange={(e) => setSearchFileTerm(e.target.value)}
                            maxLength={20}
                            className="searchIcon"
                          />
                        </div>
                      </div>

                      {loadingFiles ? (
                        <div className="flex justify-center items-center py-6">
                          <div className="w-6 h-6 border-4 border-blue-500 border-dashed rounded-full animate-spin"></div>
                          <span className="ml-2 text-gray-600">
                            <AutoTranslate>Loading files...</AutoTranslate>
                          </span>
                        </div>
                      ) : selectedDoc && filteredDocFiles.length > 0 ? (
                        <div className="border border-gray-200 rounded-lg shadow-sm overflow-x-auto">
                          {/* Table Header */}
                          <div
                            className="hidden md:grid bg-gray-100 text-gray-700 font-semibold text-sm px-4 py-2 sticky top-0"
                            style={{
                              gridTemplateColumns: "minmax(200px, 3fr) minmax(80px, 0.8fr) minmax(80px, 0.8fr) minmax(100px, 0.8fr) minmax(120px, 1fr) minmax(80px, 0.8fr)"
                            }}
                          >
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
                            <span className="text-center no-print">
                              <AutoTranslate>Action</AutoTranslate>
                            </span>
                            <span className="text-center no-print">
                              <AutoTranslate>Open</AutoTranslate>
                            </span>
                          </div>

                          {/* File List */}
                          <ul
                            className={`divide-y divide-gray-200 ${printTrue === false && filteredDocFiles.length > 5
                              ? "max-h-72 overflow-y-auto print:max-h-none print:overflow-visible"
                              : ""
                              }`}
                          >
                            {filteredDocFiles.map((file, index) => (
                              <li
                                key={index}
                                className="hover:bg-indigo-50 transition duration-200"
                              >
                                {/* Desktop View */}
                                <div
                                  className="hidden md:grid items-center px-4 py-3"
                                  style={{
                                    gridTemplateColumns: "minmax(200px, 3fr) minmax(80px, 0.8fr) minmax(80px, 0.8fr) minmax(100px, 0.8fr) minmax(120px, 1fr) minmax(80px, 0.8fr)"
                                  }}
                                >
                                  {/* File Name */}
                                  <div className="text-left text-gray-800 flex items-center min-w-0">
                                    <strong className="mr-2 flex-shrink-0">{index + 1}.</strong>
                                    <span className="truncate" title={file.docName}>{file.docName}</span>
                                  </div>

                                  {/* Year */}
                                  <div className="text-center text-gray-700">{file.year}</div>

                                  {/* Version */}
                                  <div className="text-center text-gray-700">{file.version}</div>

                                  {/* Status */}
                                  <div className="text-center">
                                    <span
                                      className={`px-2 py-1 text-xs rounded-full font-medium whitespace-nowrap
                    ${file.status === "APPROVED"
                                          ? "bg-green-100 text-green-700"
                                          : file.status === "REJECTED"
                                            ? "bg-red-100 text-red-700"
                                            : "bg-yellow-100 text-yellow-700"
                                        }`}
                                    >
                                      {file.status || <AutoTranslate>PENDING</AutoTranslate>}
                                    </span>
                                  </div>

                                  {/* Select Dropdown */}
                                  <div className="text-center no-print">
                                    <select
                                      className="border px-2 py-1 rounded-md text-sm w-full max-w-[100px]"
                                      onChange={(e) => handleStatusChange(file, e.target.value)}
                                      disabled={file.status === "APPROVED" || file.status === "REJECTED"}
                                    >
                                      <option value=""><AutoTranslate>Select</AutoTranslate></option>
                                      <option value="APPROVED"><AutoTranslate>APPROVED</AutoTranslate></option>
                                      <option value="REJECTED"><AutoTranslate>REJECTED</AutoTranslate></option>
                                    </select>
                                  </div>

                                  {/* Open Button */}
                                  <div className="flex justify-center no-print">
                                    <button
                                      onClick={() => {
                                        setOpeningFileIndex(index);
                                        setSelectedDocFiles(file);
                                        openFile(file).finally(() => setOpeningFileIndex(null));
                                      }}
                                      disabled={openingFileIndex !== null}
                                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200 whitespace-nowrap
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
                                  <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs text-gray-500"><AutoTranslate>File Name</AutoTranslate></p>
                                      <p className="text-gray-800 font-medium truncate" title={file.docName}>
                                        <strong>{index + 1}.</strong> {file.docName}
                                      </p>
                                    </div>
                                    <span
                                      className={`px-2 py-1 text-xs rounded-full font-medium ml-2 whitespace-nowrap
                    ${file.status === "APPROVED"
                                          ? "bg-green-100 text-green-700"
                                          : file.status === "REJECTED"
                                            ? "bg-red-100 text-red-700"
                                            : "bg-yellow-100 text-yellow-700"
                                        }`}
                                    >
                                      {file.status || <AutoTranslate>PENDING</AutoTranslate>}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                      <p className="text-xs text-gray-500"><AutoTranslate>Year</AutoTranslate></p>
                                      <p className="text-gray-700">{file.year}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500"><AutoTranslate>Version</AutoTranslate></p>
                                      <p className="text-gray-700">{file.version}</p>
                                    </div>
                                  </div>

                                  <div className="mt-3 flex gap-2 no-print">
                                    <select
                                      className="flex-1 border px-2 py-1.5 rounded-md text-sm"
                                      onChange={(e) => handleStatusChange(file, e.target.value)}
                                      disabled={file.status === "APPROVED" || file.status === "REJECTED"}
                                    >
                                      <option value=""><AutoTranslate>Select Action</AutoTranslate></option>
                                      <option value="APPROVED"><AutoTranslate>APPROVED</AutoTranslate></option>
                                      <option value="REJECTED"><AutoTranslate>REJECTED</AutoTranslate></option>
                                    </select>

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
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 mt-4 text-center">
                          <AutoTranslate>No attached files available.</AutoTranslate>
                        </p>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}
        </>

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

      {isConfirmModalOpen && (
        <div className="overlayModal">
          <div className="document-modal modal-sm">
            {/* Header */}
            <div className="modal-header">
              <div className="modal-title">
                <h2><AutoTranslate>Confirm Approval</AutoTranslate></h2>
              </div>
            </div>

            {/* Modal body Content */}
            <div className="modal-body">
              <div className="bodyScroller print:overflow-visible print:max-h-none">
                <p><AutoTranslate>Are you sure you want to approve this document?</AutoTranslate></p>
                <div className="flex justify-end mt-4">
                  <button
                    className="bg-green-500 text-white p-2 rounded-md mr-2"
                    onClick={approveDocument}
                  >
                    <AutoTranslate>Yes, Approve</AutoTranslate>
                  </button>
                  <button className="btn-cancel" onClick={() => setIsConfirmModalOpen(false)}>
                    <AutoTranslate>Cancel</AutoTranslate>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      )}

      {/* Reject Reason Modal */}
      {isRejectReasonModalOpen && (
        <div className="overlayModal">
          <div className="document-modal modal-sm">
            {/* Header */}
            <div className="modal-header">
              <div className="modal-title">
                <h2><AutoTranslate>Reason for Rejection</AutoTranslate></h2>
              </div>
            </div>

            {/* Modal body Content */}
            <div className="modal-body">
              <div className="bodyScroller print:overflow-visible print:max-h-none">
                <textarea
                  className="w-full border p-2 mb-2"
                  rows="4"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Enter rejection reason"
                  required
                ></textarea>

                {rejectReasonError && (
                  <p className="text-red-500 text-sm">
                    <AutoTranslate>Please enter a rejection reason with at least 10 characters.</AutoTranslate>
                  </p>
                )}

                <div className="flex justify-end">
                  <button
                    className="bg-red-500 text-white p-2 rounded-md mr-2"
                    onClick={() => {
                      if (rejectReason.trim().length < 10) {
                        setRejectReasonError(true);
                      } else {
                        setRejectReasonError(false);
                        handleRejectDocument();
                      }
                    }}
                  >
                    <AutoTranslate>Submit</AutoTranslate>
                  </button>
                  <button
                    className="btn-cancel"
                    onClick={() => {
                      setRejectReasonError(false);
                      setIsRejectReasonModalOpen(false);
                    }}
                  >
                    <AutoTranslate>Cancel</AutoTranslate>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      )}

      {/* Success Modal */}
      {isSuccessModalOpen && (
        <div className="overlayModal">
          <div className="bg-white p-6 rounded-md text-center w-1/3 relative">
            <div className="spinner-border animate-spin text-green-500 w-6 h-6 mb-4"></div>
            <h3 className="text-lg font-bold mb-4">
              <AutoTranslate>{successMessage}</AutoTranslate>
            </h3>
            <button
              className="bg-green-500 text-white p-2 rounded-md"
              onClick={() => setIsSuccessModalOpen(false)}
            >
              <AutoTranslate>OK</AutoTranslate>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Approve;