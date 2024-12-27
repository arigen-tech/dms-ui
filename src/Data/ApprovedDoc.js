import React, { useState, useEffect } from "react";
import axios from "axios";
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
import { API_HOST } from "../API/apiConfig";
import {
  DOCUMENTHEADER_API,
  UPLOADFILE_API
} from '../API/apiConfig';

const ApprovedDoc = () => {
  const [formData, setFormData] = useState({
    title: "",
    subject: "",
    version: "",
    category: null,
  });
  const [documents, setDocuments] = useState([]);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState({ paths: [] });
  const [searchTerm, setSearchTerm] = useState("");

  const token = localStorage.getItem("tokenKey");
  const UserId = localStorage.getItem("userId");
  const role = localStorage.getItem("role");

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
      } else if (role === "ADMIN" || role === "BRANCH ADMIN" || role === "DEPARTMENT ADMIN") {
        response = await axios.get(
          `${API_HOST}/api/documents/approvedByEmp`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              employeeId: UserId, // Include employeeId in headers for ADMIN role
            },
          }
        );
      }

      setDocuments(response.data);
    } catch (error) {
      console.error("Error fetching documents:", error);
      setError("Failed to fetch documents. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchPaths = async (doc) => {
    try {
      const token = localStorage.getItem("tokenKey");
      if (!token) {
        throw new Error("No authentication token found.");
      }

      // More comprehensive document validation
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
      console.log(`Full URL: ${DOCUMENTHEADER_API}/byDocumentHeader/${documentId}`);

      const response = await axios.get(
        `${DOCUMENTHEADER_API}/byDocumentHeader/${documentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
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
            data: error.response.data
          });
        } else if (error.request) {
          console.error("No response received:", error.request);
        }
      }

      // Optional: more user-friendly error handling
      alert(`Failed to fetch document paths: ${error.message || 'Unknown error'}`);

      return null; // Explicitly return null on error
    }
  };

  const openFile = async (file) => {
    const token = localStorage.getItem("tokenKey"); // Get the token from localStorage
    const createdOnDate = new Date(file.createdOn); // Convert timestamp to Date object
    const year = createdOnDate.getFullYear(); // Extract year
    const month = String(createdOnDate.getMonth() + 1).padStart(2, "0"); // Extract month and pad with zero
    const category = file.documentHeader.categoryMaster.name; // Get the category name
    const fileName = file.docName; // The file name

    // Construct the URL based on the Spring Boot @GetMapping pattern
    const fileUrl = `${API_HOST}/api/documents/${year}/${month}/${category}/${fileName}`;

    try {
      // Fetch the file using axios and pass the token in the headers
      const response = await axios.get(fileUrl, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob", // Fetch the file as a blob
      });

      // Get the MIME type of the file from the response headers
      const contentType = response.headers["content-type"];

      // Create a blob from the response
      const blob = new Blob([response.data], { type: contentType });

      // Generate a URL for the blob
      const blobUrl = window.URL.createObjectURL(blob);

      // Open the blob in a new tab
      window.open(blobUrl, "_blank");
    } catch (error) {
      console.error("Error fetching file:", error);
      alert("There was an error opening the file. Please try again.");
    }
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

  const filteredDocuments = documents.filter((doc) =>
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
  );


  const totalItems = filteredDocuments.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getPageNumbers = () => {
    const maxPageNumbers = 5;
    const startPage = Math.floor((currentPage - 1) / maxPageNumbers) * maxPageNumbers + 1;
    const endPage = Math.min(startPage + maxPageNumbers - 1, totalPages);
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  };

  // const handleNextPage = () => {
  //   if (currentPage < totalPages) {
  //     setCurrentPage(currentPage + 1);
  //   }
  // };

  // const handlePreviousPage = () => {
  //   if (currentPage > 1) {
  //     setCurrentPage(currentPage - 1);
  //   }
  //};
  const openModal = (doc) => {
    setSelectedDoc(doc); // Set the selected document without paths first
    fetchPaths(doc); // Fetch paths and update the selected document with paths
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setSelectedDoc(null);
  };

  const printPage = () => {
    window.print(); // Simple print functionality
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="p-1">
      <h1 className="text-xl mb-4 font-semibold">Approved Documents</h1>
      <div className="bg-white p-3 rounded-lg shadow-sm">
        {error && <div className="text-red-500 mb-4">{error}</div>}

        <div className="mb-4 bg-slate-100 p-4 rounded-lg flex justify-between items-center">
          <div className="flex items-center bg-blue-500 rounded-lg">
            <label
              htmlFor="itemsPerPage"
              className="mr-2 ml-2 text-white text-sm"
            >
              Show:
            </label>
            <select
              id="itemsPerPage"
              className="border rounded-r-lg p-1.5 outline-none"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value)); // Update items per page
                setCurrentPage(1); // Reset to the first page
              }}
            >
              {[5, 10, 15, 20].map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center">
            <input
              type="text"
              placeholder="Search..."
              className="border rounded-l-md p-1 outline-none"
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
                {["ADMIN", "BRANCH ADMIN", "DEPARTMENT ADMIN"].includes(role) && (
                  <th className="border p-2 text-left">view</th>
                )}

              </tr>
            </thead>
            <tbody>
              {paginatedDocuments.length > 0 ? (
                paginatedDocuments.map((doc, index) => (
                  <tr key={doc.id}>
                    <td className="border p-2">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="border p-2">{doc.fileNo || "N/A"}</td>
                    <td className="border p-2">{doc.title || "N/A"}</td>
                    <td className="border p-2">{doc.subject || "N/A"}</td>
                    <td className="border p-2">
                      {doc.categoryMaster?.name || "No Category"}
                    </td>
                    <td className="border p-2">{doc.approvalStatus || "Pending"}</td>
                    <td className="border p-2">{doc.employeeBy?.name || "No Employee"}</td>
                    <td className="border px-4 py-2">
                      {doc.updatedOn ? formatDate(doc.updatedOn) : "N/A"}
                    </td>
                    {["ADMIN", "BRANCH ADMIN", "DEPARTMENT ADMIN"].includes(role) && (
                      <td className="border p-2">
                        <button
                          onClick={() => openModal(doc)}
                          title={`View details for ${doc.title || "this document"}`}
                        >
                          <EyeIcon className="h-6 w-6 bg-green-400 rounded-xl p-1 text-white" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="13" className="border p-4 text-center text-gray-500">
                    No data found.
                  </td>
                </tr>
              )}
            </tbody>

          </table>
          <>
            {isOpen && selectedDoc && (
              <div className="fixed inset-0 flex items-center justify-center z-50 bg-gray-900 bg-opacity-50">
                <div className="relative bg-white rounded-lg shadow-lg max-w-lg w-full p-6">
                  {/* Print Button */}
                  <button
                    className="absolute top-2 right-10 text-gray-500 hover:text-gray-700 no-print"
                    onClick={printPage}
                  >
                    <PrinterIcon className="h-6 w-6" />
                  </button>

                  {/* Close Button */}
                  <button
                    className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 no-print"
                    onClick={closeModal}
                  >
                    <XMarkIcon className="h-6 w-6 text-black hover:text-white hover:bg-red-800" />
                  </button>


                  {/* Modal Content Divided into Two Halves */}
                  <div className="h-1/2 flex flex-col justify-between">
                    {/* Top Half */}
                    <div className="flex justify-between items-center mb-4 mt-4">
                      <div className="flex items-start space-x-1">
                        <p className="text-sm text-black font-bold border-b-4 border-black">
                          D
                        </p>
                        <p className="text-sm text-black font-bold border-t-4 border-black">
                          MS
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm text-gray-600">
                          <strong>Uploaded Date:</strong>{" "}
                          {formatDate(selectedDoc?.createdOn)}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Half */}
                    <div className="text-left">
                      <p className="text-sm text-gray-600">
                        <strong>File No.:</strong>{" "}
                        {selectedDoc?.fileNo || "N/A"}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Title:</strong> {selectedDoc?.title || "N/A"}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Subject:</strong>{" "}
                        {selectedDoc?.subject || "N/A"}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Version:</strong>{" "}
                        {selectedDoc?.version || "N/A"}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Category:</strong>{" "}
                        {selectedDoc?.categoryMaster?.name || "No Category"}
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="h-1/2 flex flex-col items-center justify-center mt-4">
                    <h1 className="text-sm text-center font-bold mb-2">
                      Attached Files
                    </h1>

                    {Array.isArray(selectedDoc.paths) &&
                      selectedDoc.paths.length > 0 ? (
                      <ul className="list-disc list-inside">
                        {selectedDoc.paths.map((file, index) => (
                          <li key={index} className="mb-2">
                            <span className="mr-4">{file.docName}</span>
                            <button
                              onClick={() => openFile(file)} // Pass the file object to openFile function
                              className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                            >
                              Open
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">
                        No attached files available.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
          <div className="flex justify-between items-center mt-4">
            <div>
              <span className="text-sm text-gray-700">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
              </span>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded mr-3 ${currentPage === 1
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-slate-200 hover:bg-slate-300"
                  }`}
              >
                <ArrowLeftIcon className="inline h-4 w-4 mr-2 mb-1" />
                Previous
              </button>

              {getPageNumbers().map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 rounded mx-1 ${currentPage === page
                    ? "bg-blue-500 text-white"
                    : "bg-slate-200 hover:bg-blue-100"
                    }`}
                >
                  {page}
                </button>
              ))}

              <span className="text-sm text-gray-700 mx-2">
                of {totalPages} pages
              </span>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded ml-3 ${currentPage === totalPages
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-slate-200 hover:bg-slate-300"
                  }`}
              >
                Next
                <ArrowRightIcon className="inline h-4 w-4 ml-2 mb-1" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovedDoc;
