import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useLocation } from 'react-router-dom';
import {
  PencilIcon,
  PlusCircleIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  XMarkIcon,
  PrinterIcon,
} from "@heroicons/react/24/solid";
import { API_HOST, DOCUMENTHEADER_API, UPLOADFILE_API } from "../API/apiConfig";
import apiClient from "../API/apiClient";
import FilePreviewModal from "../Components/FilePreviewModal";
import LoadingComponent from "../Components/LoadingComponent";


const ApprovedDoc = () => {
  const [formData, setFormData] = useState({
    title: "",
    subject: "",
    version: "",
    category: null,
  });
  const location = useLocation();
  const [documents, setDocuments] = useState([]);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState({ paths: [] });
  const [searchTerm, setSearchTerm] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [printTrue, setPrintTrue] = useState(false);
  const [isOpeningFile, setIsOpeningFile] = useState(false);
  const [highlightedDocId, setHighlightedDocId] = useState(null);
  const [blobUrl, setBlobUrl] = useState("");
  const [contentType, setContentType] = useState("");
  const [selectedDocFile, setSelectedDocFiles] = useState(null);
  const [searchFileTerm, setSearchFileTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const token = localStorage.getItem("tokenKey");
  const UserId = localStorage.getItem("userId");
  const role = localStorage.getItem("role");


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

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      let response;

      // Differentiate between ADMIN and USER API calls
      if (role === "USER") {
        response = await axios.get(
          `${API_HOST}/api/documents/approved/employee/${UserId}`,
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
        response = await axios.get(`${API_HOST}/api/documents/approvedByEmp`, {
          headers: {
            Authorization: `Bearer ${token}`,
            employeeId: UserId, // Include employeeId in headers for ADMIN role
          },
        });
      }

      setDocuments(response.data);
      console.log("doc ", response.data);
    } catch (error) {
      console.error("Error fetching documents:", error);
      setError("Failed to fetch documents. Please try again.");
    } finally {
      setLoading(false);
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

      // Validate doc.id is not just a falsy value
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

      return response.data; // Optional: return the data
    } catch (error) {
      // More detailed error logging
      console.error("Error in fetchPaths:", error);

      // More comprehensive error handling
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

      // Optional: more user-friendly error handling
      alert(
        `Failed to fetch document paths: ${error.message || "Unknown error"}`
      );

      return null; // Explicitly return null on error
    }
  };

  const openFile = async (file) => {
    try {
      setIsOpeningFile(true);
      if (!file) {
        throw new Error("File object is undefined.");
      }
      console.log(file);

      const branch = selectedDoc.employee.branch.name.replace(/ /g, "_");
      const department = selectedDoc.employee.department.name.replace(
        / /g,
        "_"
      );
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

      console.log("File URL:", fileUrl);

      const response = await axios.get(fileUrl, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });

      let blob = new Blob([response.data], { type: response.headers["content-type"] });
      let url = URL.createObjectURL(blob);

      setBlobUrl(url);
      setContentType(response.headers["content-type"]);
      // setIsOpen(false);
      setSearchFileTerm("");
      setIsModalOpen(true);
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to fetch or preview the file.");
    } finally {
      setIsOpeningFile(false);
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



  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    };
    return date.toLocaleString("en-GB", options).replace(",", "");
  };

  const filteredDocuments = documents
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
            value.department?.name
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            value.branch?.name?.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
        if (key === "paths" && Array.isArray(value)) {
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
      // setError("Error displaying QR Code: " + error.message);
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
    fetchPaths(doc);
    setIsOpen(true);
    fetchQRCode(doc.id);
  };

  const formatDates = (timestamp) => {
    if (!timestamp) {
      return "N/A";
    }

    const date = new Date(timestamp); // Convert milliseconds to Date
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const closeModal = () => {
    setIsOpen(false);
    setSelectedDoc(null);
  };

  const printPage = () => {
    setPrintTrue(true);
    window.print();
    setTimeout(() => {
      setPrintTrue(false);
    }, 1000);
  };

  if (loading) {
    return <LoadingComponent />;
  }

  return (
    <div className="px-1">
      <h1 className="text-xl mb-4 font-semibold">Approved Documents</h1>
      <div className="bg-white p-4 rounded-lg shadow-sm">
        {error && <div className="text-red-500 mb-4">{error}</div>}

        <div className="mb-4 bg-slate-100 p-4 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Items Per Page (50%) */}
          <div className="flex items-center bg-blue-500 rounded-lg w-full flex-1 md:w-1/2">
            <label
              htmlFor="itemsPerPage"
              className="mr-2 ml-2 text-white text-sm"
            >
              Show:
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
                <th className="border p-2 text-left">SR.</th>
                <th className="border p-2 text-left">File No</th>
                <th className="border p-2 text-left">Title</th>
                <th className="border p-2 text-left">Subject</th>
                <th className="border p-2 text-left">Category</th>
                <th className="border p-2 text-left">Approval Status</th>
                <th className="border p-2 text-left">Approved by</th>
                <th className="border p-2 text-left">Approved Date</th>
                {/* {["ADMIN", "BRANCH ADMIN", "DEPARTMENT ADMIN"].includes(
                  role
                ) && <th className="border p-2 text-left">view</th>} */}
                <th className="border p-2 text-left">view</th>
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
                      {doc.categoryMaster?.name || "No Category"}
                    </td>
                    <td className="border p-2">
                      {doc.approvalStatus || "Pending"}
                    </td>
                    <td className="border p-2">
                      {doc.employeeBy?.name || "No Employee"}
                    </td>
                    <td className="border px-4 py-2">
                      {doc.approvalStatusOn ? formatDate(doc.approvalStatusOn) : "N/A"}
                    </td>
                    {/* {["ADMIN", "BRANCH ADMIN", "DEPARTMENT ADMIN"].includes(
                      role
                    ) && (
                      <td className="border p-2">
                        <button
                          onClick={() => openModal(doc)}
                          title={`View details for ${
                            doc.title || "this document"
                          }`}
                        >
                          <EyeIcon className="h-6 w-6 bg-green-400 rounded-xl p-1 text-white" />
                        </button>
                      </td>
                    )} */}
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
                    colSpan="13"
                    className="border p-4 text-center text-gray-500"
                  >
                    No data found.
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
          <>
            {isOpen && selectedDoc && (

              <div className="fixed inset-0 flex items-center justify-center z-50 bg-gray-800 bg-opacity-75 print-modal overflow-y-auto">
                <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-lg md:max-w-2xl lg:max-w-3xl p-4 sm:p-6 my-8 mx-4">
                  <div className="max-h-[80vh] overflow-y-auto">
                    <button
                      className="absolute top-4 right-16 text-gray-500 hover:text-gray-700 no-print"
                      onClick={printPage}
                    >
                      <PrinterIcon className="h-6 w-6" />
                    </button>

                    {/* Close Button */}
                    <button
                      className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 no-print"
                      onClick={closeModal}
                    >
                      <XMarkIcon className="h-6 w-6 text-black hover:text-white hover:bg-red-600 rounded-full p-1" />
                    </button>

                    {/* Modal Content */}
                    <div className="flex flex-col h-full mt-8">
                      {/* Header */}
                      <div className="flex flex-col sm:flex-row justify-between items-center border-b-2 border-gray-300 pb-4">
                        <div className="flex items-center space-x-2">
                          <p className="text-lg font-extrabold text-indigo-600 border-b-4 border-indigo-600">
                            D
                          </p>
                          <p className="text-lg font-extrabold text-indigo-600 border-t-4 border-indigo-600">
                            MS
                          </p>
                        </div>
                        <p className="text-sm text-gray-600 mt-2 sm:mt-0">
                          <strong>Uploaded Date:</strong>{" "}
                          {formatDate(selectedDoc?.createdOn)}
                        </p>
                      </div>

                      {/* Document Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="mt-6 text-left">
                          {[
                            {
                              label: "Branch",
                              value: selectedDoc?.employee?.branch?.name,
                            },
                            {
                              label: "Department",
                              value: selectedDoc?.employee?.department?.name,
                            },
                            { label: "File No.", value: selectedDoc?.fileNo },
                            { label: "Title", value: selectedDoc?.title },
                            { label: "Subject", value: selectedDoc?.subject },
                            {
                              label: "Category",
                              value:
                                selectedDoc?.categoryMaster?.name ||
                                "No Category",
                            },
                            {
                              label: "File Year",
                              value: selectedDoc?.yearMaster?.name,
                            },
                            {
                              label: "Status",
                              value: selectedDoc?.approvalStatus,
                            },
                            {
                              label: "Upload By",
                              value: selectedDoc?.employee?.name,
                            },
                          ].map((item, idx) => (
                            <p key={idx} className="text-md text-gray-700">
                              <strong>{item.label} :-</strong>{" "}
                              {item.value || "N/A"}
                            </p>
                          ))}
                        </div>
                        <div className="items-center justify-center text-center">
                          <p className="text-md text-gray-700 mt-3">
                            <strong>QR Code:</strong>
                          </p>
                          {selectedDoc?.qrPath ? (
                            <div className="mt-4">
                              <img
                                src={qrCodeUrl}
                                alt="QR Code"
                                className="mx-auto w-24 h-24 sm:w-32 sm:h-32 object-contain border border-gray-300 p-2"
                              />
                              <button
                                onClick={downloadQRCode}
                                className="mt-4 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 no-print"
                              >
                                Download
                              </button>
                            </div>
                          ) : (
                            <p className="text-gray-500">No QR code available</p>
                          )}
                        </div>
                      </div>

                      {/* Attached Files */}
                      <div className="mt-6 text-center">
                        <div className="mt-6 relative">
                          <div className="flex justify-center">
                            <h2 className="text-lg font-semibold text-indigo-700">Attached Files</h2>
                          </div>
                          <div className="absolute right-0 top-0">
                            <input
                              type="text"
                              placeholder="Search Files..."
                              value={searchFileTerm}
                              onChange={(e) => setSearchFileTerm(e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                        </div>
                        {selectedDoc && filteredDocFiles.length > 0 ? (
                          <>
                            <div className="flex justify-between mb-2 font-semibold text-sm text-gray-700 mt-5">
                              <h3 className="flex-1 text-left ml-2">File Name</h3>
                              <h3 className="flex-1 text-center">Version</h3>
                              <h3 className="text-right mr-10 no-print">
                                Actions
                              </h3>
                            </div>
                            <ul
                              className={`space-y-4 ${printTrue === false &&
                                filteredDocFiles.length > 2
                                ? "max-h-60 overflow-y-auto print:max-h-none print:overflow-visible"
                                : ""
                                }`}
                            >
                              {filteredDocFiles.map((file, index) => (
                                <li
                                  key={index}
                                  className="flex justify-between items-center p-4 bg-gray-50 border border-gray-200 rounded-lg shadow-sm hover:bg-indigo-50 transition duration-300"
                                >
                                  <div className="flex-1 text-left">
                                    <strong>{index + 1}</strong>{" "}
                                    {file.docName.split("_").slice(1).join("_")}
                                  </div>
                                  <div className="flex-1 text-center">
                                    <strong>{file.version}</strong>
                                  </div>
                                  <div className="text-right">
                                    <button
                                      onClick={() => {
                                        setSelectedDocFiles(file);
                                        openFile(file);
                                      }}
                                      disabled={isOpeningFile}
                                      className={`bg-indigo-500 text-white px-4 py-2 rounded-md transition duration-300 no-print
                                          ${isOpeningFile
                                          ? 'opacity-50 cursor-not-allowed'
                                          : 'hover:bg-indigo-600'
                                        }`}
                                    >
                                      {isOpeningFile ? 'Opening...' : 'Open'}
                                    </button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </>
                        ) : (
                          <p className="text-sm text-gray-500 mt-2">
                            No attached files available.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
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
              Previous
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
            <span className="text-sm text-gray-700 mx-2">of {totalPages} pages</span>

            {/* Next Button */}
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className={`px-3 py-1 rounded ml-3 ${currentPage === totalPages || totalPages === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"
                }`}
            >
              Next
              <ArrowRightIcon className="inline h-4 w-4 ml-2 mb-1" />
            </button>
            <div className="ml-4">
              <span className="text-sm text-gray-700">
                Showing {totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{" "}
                {Math.min(currentPage * itemsPerPage, totalItems)} of{" "}
                {totalItems} entries
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovedDoc;
