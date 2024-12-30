import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  PrinterIcon,
  XMarkIcon,
  EyeIcon,
} from "@heroicons/react/24/solid";
import { API_HOST, DOCUMENTHEADER_API } from "../API/apiConfig";

const Approve = () => {
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
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [documentToApprove, setDocumentToApprove] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [isRejectReasonModalOpen, setIsRejectReasonModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState(null);

  const tokenKey = localStorage.getItem("tokenKey");

  const [userBranch, setUserBranch] = useState(null);

  useEffect(() => {
    fetchUserBranch();
    fetchDocuments();
  }, []);

  const fetchUserBranch = async () => {
    setLoading(true);
    setError("");
    try {
      const userId = localStorage.getItem("userId");
      const tokenKey = localStorage.getItem("tokenKey");
      const response = await axios.get(
        `${API_HOST}/employee/findById/${userId}`,
        {
          headers: { Authorization: `Bearer ${tokenKey}` },
        }
      );
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
      const tokenKey = localStorage.getItem("tokenKey");
      const userId = localStorage.getItem("userId");

      if (!tokenKey || !userId) {
        setError("Authentication details missing. Please log in again.");
        setLoading(false);
        return;
      }
      const userResponse = await axios.get(
        `${API_HOST}/employee/findById/${userId}`,
        {
          headers: { Authorization: `Bearer ${tokenKey}` },
        }
      );

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

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${tokenKey}` },
      });

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

  const fetchPaths = async (doc) => {
    try {
      const tokenKey = localStorage.getItem(tokenKey);
      if (!tokenKey) {
        throw new Error("No authentication tokenKey found.");
      }

      const response = await axios.get(
        `${API_HOST}/api/documents/byDocumentHeader/${doc.id}`,
        {
          headers: { Authorization: `Bearer ${tokenKey}` },
        }
      );

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
    const tokenKey = localStorage.getItem(tokenKey);
    const createdOnDate = new Date(file.createdOn);
    const year = createdOnDate.getFullYear();
    const month = String(createdOnDate.getMonth() + 1).padStart(2, "0");
    const category = file.documentHeader.categoryMaster.name;
    const fileName = file.docName;
    const fileUrl = `${API_HOST}/api/documents/${year}/${month}/${encodeURIComponent(
      category
    )}/${encodeURIComponent(fileName)}`;

    console.log("File URL:", fileUrl);

    try {
      const response = await axios.get(fileUrl, {
        headers: { Authorization: `Bearer ${tokenKey}` },
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type: response.headers["content-type"],
      });
      const blobUrl = window.URL.createObjectURL(blob);

      window.open(blobUrl, "_blank");
    } catch (error) {
      console.error("Error fetching file:", error);
    }
  };

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
      const employeeId = localStorage.getItem("userId");

      const response = await axios.patch(
        `${API_HOST}/api/documents/${documentToApprove.id}/approval-status`, // Change to PATCH
        null, // No body needed for the PATCH request since we're using query parameters
        {
          headers: {
            Authorization: `Bearer ${tokenKey}`,
            employeeId: employeeId, // Include employeeId in headers
          },
          params: {
            status: "APPROVED", // Send status as a query parameter
          },
        }
      );

      setSuccessMessage("Document Approved Successfully");
      setIsConfirmModalOpen(false);
      fetchDocuments();

      setIsConfirmModalOpen(false);
      setIsSuccessModalOpen(true);
    } catch (error) {
      console.error("Error approving document:", error);
    }
  };

  const handleRejectDocument = async () => {
    try {
      const employeeId = localStorage.getItem("userId");

      const response = await axios.patch(
        `${API_HOST}/api/documents/${documentToApprove.id}/approval-status`, // Change to PATCH
        null, // No body needed for the PATCH request since we're using query parameters
        {
          headers: {
            Authorization: `Bearer ${tokenKey}`,
            employeeId: employeeId, // Include employeeId in headers
          },
          params: {
            status: "REJECTED", // Send status as a query parameter
            rejectionReason: rejectReason, // Include rejection reason as a query parameter
          },
        }
      );
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

  const downloadQRCode = async () => {
    if (!selectedDoc.id) {
      alert("Please enter a document ID");
      return;
    }

    try {
      if (!tokenKey) {
        throw new Error("Authentication tokenKey is missing");
      }

      const apiUrl = `${DOCUMENTHEADER_API}/documents/download/qr/${selectedDoc.id}`;

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenKey}`,
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
    setSelectedDoc(doc); // Set the selected document without paths first
    fetchPaths(doc); // Fetch paths and update the selected document with paths
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
      if (!tokenKey) {
        throw new Error("Authentication tokenKey is missing");
      }
  
      const apiUrl = `${DOCUMENTHEADER_API}/documents/download/qr/${documentId}`;
  
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenKey}`,
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

  const filteredDocuments = documents.filter((doc) =>
    Object.entries(doc).some(([key, value]) => {
      if (key === "categoryMaster" && value?.name) {
        return value.name.toLowerCase().includes(searchTerm.toLowerCase());
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
      return (
        value &&
        value.toString().toLowerCase().includes(searchTerm.toLowerCase())
      );
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
    const startPage =
      Math.floor((currentPage - 1) / maxPageNumbers) * maxPageNumbers + 1;
    const endPage = Math.min(startPage + maxPageNumbers - 1, totalPages);
    return Array.from(
      { length: endPage - startPage + 1 },
      (_, i) => startPage + i
    );
  };

  return (
    <div className="p-4">
      <h1 className="text-xl mb-4 font-semibold">Pending Approval</h1>
      <div className="bg-white p-3 rounded-lg shadow-sm">
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
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
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
              placeholder="Search"
              className="p-2 border rounded-l-lg outline-none"
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
                <th className="border p-2 text-left">Title</th>
                <th className="border p-2 text-left">File No</th>
                <th className="border p-2 text-left">Subject</th>
                <th className="border p-2 text-left">Uploaded Date</th>
                <th className="border p-2 text-left">Category</th>
                <th className="border p-2 text-left">User Name</th>
                <th className="border p-2 text-left">Department</th>
                <th className="border p-2 text-left">Branch</th>
                <th className="border p-2 text-left">Approval Status</th>
                <th className="border p-2 text-left">Action</th>
                <th className="border p-2 text-left">View</th>
              </tr>
            </thead>

            <tbody>
              {paginatedDocuments.length > 0 ? (
                paginatedDocuments.map((doc, index) => (
                  <tr key={doc.id} className="even:bg-gray-50">
                    <td className="border p-2">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="border p-2">{doc.title}</td>
                    <td className="border p-2">{doc.fileNo}</td>
                    <td className="border p-2">{doc.subject}</td>
                    <td className="border p-2">
                      {new Date(doc.createdOn).toLocaleDateString()}
                    </td>
                    <td className="border p-2">
                      {doc.categoryMaster ? doc.categoryMaster.name : ""}
                    </td>
                    <td className="border p-2">
                      {doc.employee ? doc.employee.name : "N/A"}
                    </td>
                    <td className="border p-2">
                      {doc.employee && doc.employee.department
                        ? doc.employee.department.name
                        : "No Department"}
                    </td>
                    <td className="border p-2">
                      {doc.employee && doc.employee.branch
                        ? doc.employee.branch.name
                        : "No Branch"}
                    </td>
                    <td className="border p-2">{doc.approvalStatus}</td>
                    <td className="border p-2">
                      <select
                        className="border p-1"
                        onChange={(e) =>
                          handleStatusChange(doc, e.target.value)
                        }
                      >
                        <option value="">Select Status</option>
                        <option value="APPROVED">APPROVED</option>
                        <option value="REJECTED">REJECTED</option>
                      </select>
                    </td>
                    <td className="border p-2">
                      <button onClick={() => openModal(doc)}>
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

          <>
            {isOpen && selectedDoc && (
              <div className="fixed inset-0 flex items-center justify-center z-50 bg-gray-800 bg-opacity-75 print-modal">
                <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-lg md:max-w-2xl lg:max-w-3xl p-4 sm:p-6">
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
                            <strong>{item.label}:</strong> {item.value || "N/A"}
                          </p>
                        ))}
                      </div>
                      <div className="items-center justify-center text-center">
                        <p className="text-md text-gray-700 mt-3">
                          <strong>QR Code:</strong>
                        </p>
                        {selectedDoc?.documentDetails[0]?.path ? (
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
                      <h2 className="text-lg font-semibold text-indigo-700">
                        Attached Files
                      </h2>
                      {Array.isArray(selectedDoc.documentDetails) &&
                      selectedDoc.documentDetails.length > 0 ? (
                        <>
                          <div className="flex justify-between mb-2 font-semibold text-sm text-gray-700 mt-5">
                            <h3 className="flex-1 text-left ml-2">File Name</h3>
                            <h3 className="flex-1 text-center">Version</h3>
                            <h3 className="text-right mr-10 no-print">
                              Actions
                            </h3>
                          </div>
                          <ul className="space-y-4 max-h-60 overflow-y-auto">
                            {selectedDoc.documentDetails.map((file, index) => (
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
                                    onClick={() => openFile(file)}
                                    className="bg-indigo-500 text-white px-4 py-2 rounded-md hover:bg-indigo-600 transition duration-300 no-print"
                                  >
                                    Open
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
            )}
          </>
        </div>

        <div className="flex justify-between items-center mt-4">
          <div>
            <span className="text-sm text-gray-700">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}{" "}
              entries
            </span>
          </div>
          <div className="flex items-center">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded mr-3 ${
                currentPage === 1
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
                className={`px-3 py-1 rounded mx-1 ${
                  currentPage === page
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
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className={`px-3 py-1 rounded ml-3 ${
                currentPage === totalPages
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

      {isConfirmModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-4 rounded-md w-1/3">
            <h3 className="text-lg font-bold mb-2">Confirm Approval</h3>
            <p>Are you sure you want to approve this document?</p>
            <div className="flex justify-end mt-4">
              <button
                className="bg-green-500 text-white p-2 rounded-md mr-2"
                onClick={approveDocument}
              >
                Yes, Approve
              </button>
              <button
                className="bg-gray-500 text-white p-2 rounded-md"
                onClick={() => setIsConfirmModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isRejectReasonModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-4 rounded-md w-1/3">
            <h3 className="text-lg font-bold mb-2">Reason for Rejection</h3>
            <textarea
              className="w-full border p-2 mb-2"
              rows="4"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason"
              required
            ></textarea>
            {/* Error message */}
            {rejectReasonError && (
              <p className="text-red-500 text-sm">
                Please enter a rejection reason with at least 10 characters.
              </p>
            )}
            <div className="flex justify-end">
              <button
                className="bg-red-500 text-white p-2 rounded-md mr-2"
                onClick={() => {
                  if (rejectReason.trim().length < 10) {
                    setRejectReasonError(true); // Set error message
                  } else {
                    setRejectReasonError(false); // Clear error message
                    handleRejectDocument(); // Submit rejection
                  }
                }}
              >
                Submit
              </button>
              <button
                className="bg-gray-500 text-white p-2 rounded-md"
                onClick={() => {
                  setRejectReasonError(false); // Clear error message
                  setIsRejectReasonModalOpen(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isSuccessModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-md text-center w-1/3">
            <div className="spinner-border animate-spin text-green-500 w-6 h-6 mb-4"></div>
            <h3 className="text-lg font-bold mb-4">{successMessage}</h3>
            <button
              className="bg-green-500 text-white p-2 rounded-md"
              onClick={() => setIsSuccessModalOpen(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Approve;
