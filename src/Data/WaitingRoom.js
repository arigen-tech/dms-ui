import { useState, useEffect } from "react";
import { MagnifyingGlassIcon, EyeIcon, ArrowLeftIcon, ArrowRightIcon, XMarkIcon } from "@heroicons/react/24/solid";
import apiClient from "../API/apiClient";
import { API_HOST } from "../API/apiConfig";
import * as mammoth from "mammoth";

const WaitingRoom = ({ isOpen, onClose, onSelectDocuments, metadata, token }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [blobUrl, setBlobUrl] = useState("");
  const [contentType, setContentType] = useState("");
  const [docxContent, setDocxContent] = useState("");
  const [isDocx, setIsDocx] = useState(false);
  const [openingFiles, setOpeningFiles] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchDocuments();
    }
  }, [isOpen]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/home/getallwaitingroom", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const docs = response?.data?.response || [];
      setDocuments(docs);
    } catch (error) {
      console.error("Error fetching documents:", error);
      alert("Failed to fetch documents");
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const openFile = async (file) => {
    try {
      setOpeningFiles(true);
      const fileName = file.filepath.split(/[/\\]/).pop();
      const fileUrl = `${API_HOST}/home/download/waitingroom/${encodeURIComponent(fileName)}`;

      const response = await apiClient.get(fileUrl, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });

      const contentType = response.headers["content-type"] || "";
      const blob = new Blob([response.data], { type: contentType });
      const fileExtension = fileName.toLowerCase().split(".").pop();

      if (fileExtension === "docx" || contentType.includes("wordprocessingml")) {
        const arrayBuffer = await blob.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setDocxContent(result.value);
        setIsDocx(true);
        setContentType("text/html");
        setBlobUrl("");
      } else {
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        setContentType(contentType);
        setIsDocx(false);
        setDocxContent("");
      }

      setPreviewFile(file);
      setIsPreviewOpen(true);
    } catch (error) {
      console.error("Error opening file:", error);
      alert("Failed to open file");
    } finally {
      setOpeningFiles(false);
    }
  };

  const closePreview = () => {
    setIsPreviewOpen(false);
    setPreviewFile(null);
    setIsDocx(false);
    setDocxContent("");
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setBlobUrl("");
    }
  };

  const handleCheckboxChange = (documentId, isChecked) => {
    setSelectedRowIds((prev) =>
      isChecked ? [...prev, documentId] : prev.filter((id) => id !== documentId)
    );
  };


  
  // In WaitingRoom component - update handleSelectDocuments
  const handleSelectDocuments = () => {
    if (selectedRowIds.length === 0) {
      return;
    }

    // Validate metadata is complete
    if (!metadata.fileNo || !metadata.title || !metadata.subject || !metadata.category || !metadata.year || !metadata.version) {
      alert("Please complete all metadata fields before selecting documents");
      return;
    }

    try {
      const selectedDocumentsData = documents
        .filter((doc) => selectedRowIds.includes(doc.id))
        .map((doc, index) => {
          // Generate the same file name format as Add Document
          const now = new Date();
          const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

          const baseName = metadata.fileNo.substring(0, 3);

          // Get original extension from the waiting room file
          const originalExtension = doc.documentName.split('.').pop() || 'pdf';

          // Generate display name WITHOUT extension (backend will add the original extension)
          const displayNameWithoutExt = `${baseName}_${metadata.category}_${metadata.year}_${metadata.version}_${timestamp}_${index + 1}`;

          return {
            id: doc.id,
            waitingRoomPath: doc.filepath,
            documentName: doc.documentName,
            fileType: doc.fileType,
            sourceName: doc.sourceName,
            displayName: displayNameWithoutExt, // Send without extension
            originalExtension: originalExtension, // Keep original extension separately
            isWaitingRoomFile: true,
            waitingRoomId: doc.id,
            version: metadata.version,
            year: metadata.year,
            status: "PENDING"
          };
        });

      // Pass the processed documents to parent
      onSelectDocuments(selectedDocumentsData);

      // Close modal
      onClose();

    } catch (error) {
      console.error("Error processing documents:", error);
      alert("Failed to process documents");
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    const search = searchTerm.toLowerCase();
    const createdDate = doc.createdOn ? new Date(doc.createdOn).toLocaleDateString("en-GB") : "";
    return (
      (doc.documentName && doc.documentName.toLowerCase().includes(search)) ||
      (doc.sourceName && doc.sourceName.toLowerCase().includes(search)) ||
      (doc.version && doc.version.toLowerCase().includes(search)) ||
      (doc.fileType && doc.fileType.toLowerCase().includes(search)) ||
      (doc.year && doc.year.includes(search)) ||
      createdDate.includes(search)
    );
  });

  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatDate = (timestamp) => {
    if (!timestamp) return "--";
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "--";
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
          <div>
            <h2 className="text-xl font-semibold">Choose From Waiting Room</h2>
            {metadata && (
              <p className="text-sm text-gray-600 mt-1">
                {metadata.branch} • {metadata.department} • {metadata.year} • {metadata.category}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition"
          >
            <XMarkIcon className="h-6 w-6 text-gray-600" />
          </button>
        </div>

        {/* Controls */}
        <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
          <div className="flex items-center bg-blue-500 rounded-lg">
            <label className="mr-2 ml-2 text-white text-sm">Show:</label>
            <select
              className="border rounded-r-lg p-1.5 outline-none"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              {[5, 10, 15, 20].map((num) => (
                <option key={num} value={num}>{num}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center">
            <input
              type="text"
              placeholder="Search documents..."
              className="border rounded-l-md p-1.5 outline-none w-80"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              maxLength={50}
            />
            <MagnifyingGlassIcon className="text-white bg-blue-500 rounded-r-lg h-8 w-8 border p-1.5" />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <table className="w-full border-collapse border">
              <thead className="sticky top-0 bg-slate-100">
                <tr>
                  <th className="border p-2 text-left">Select</th>
                  <th className="border p-2 text-left">SR.</th>
                  <th className="border p-2 text-left">Document Name</th>
                  <th className="border p-2 text-left">Source</th>
                  <th className="border p-2 text-left">Year</th>
                  <th className="border p-2 text-left">Version</th>
                  <th className="border p-2 text-left">Type</th>
                  <th className="border p-2 text-left">Created</th>
                  <th className="border p-2 text-left">View</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDocuments.length > 0 ? (
                  paginatedDocuments.map((doc, index) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="border p-2 text-center">
                        <input
                          type="checkbox"
                          checked={selectedRowIds.includes(doc.id)}
                          onChange={(e) => handleCheckboxChange(doc.id, e.target.checked)}
                          className="w-4 h-4"
                        />
                      </td>
                      <td className="border p-2">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                      <td className="border p-2">{doc.documentName || "--"}</td>
                      <td className="border p-2">{doc.sourceName || "--"}</td>
                      <td className="border p-2">{doc.year || "--"}</td>
                      <td className="border p-2">{doc.version || "--"}</td>
                      <td className="border p-2 uppercase">{doc.fileType || "--"}</td>
                      <td className="border p-2">{formatDate(doc.createdOn)}</td>
                      <td className="border p-2">
                        <button
                          onClick={() => openFile(doc)}
                          disabled={openingFiles}
                          className="disabled:opacity-50"
                        >
                          <EyeIcon className="h-6 w-6 bg-green-400 rounded-xl p-1 text-white hover:bg-green-500" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="border p-4 text-center text-gray-500">
                      No documents found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-gray-600">
              Selected: {selectedRowIds.length} of {filteredDocuments.length}
            </div>
            <button
              onClick={handleSelectDocuments}
              disabled={selectedRowIds.length === 0}
              className={`px-6 py-2 rounded-md text-white ${selectedRowIds.length === 0
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
                }`}
            >
              Select ({selectedRowIds.length})
            </button>
          </div>

          {/* Pagination */}
          {totalPages > 0 && (
            <div className="flex justify-between items-center">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded ${currentPage === 1 ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"
                  }`}
              >
                <ArrowLeftIcon className="inline h-4 w-4 mr-2" />
                Previous
              </button>

              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded ${currentPage === totalPages ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"
                  }`}
              >
                Next
                <ArrowRightIcon className="inline h-4 w-4 ml-2" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* File Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60]">
          <div className="bg-white p-4 rounded-lg max-w-5xl max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {previewFile?.documentName} - {previewFile?.version}
              </h3>
              <button
                onClick={closePreview}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Close
              </button>
            </div>
            <div className="w-full min-h-96 max-h-96 overflow-auto">
              {isDocx ? (
                <div
                  className="docx-content p-4 bg-white border rounded"
                  dangerouslySetInnerHTML={{ __html: docxContent }}
                  style={{ fontFamily: "Times, serif", lineHeight: "1.6", fontSize: "14px" }}
                />
              ) : blobUrl && contentType?.includes("pdf") ? (
                <iframe src={blobUrl} className="w-full h-full border" title="PDF Preview" />
              ) : blobUrl && contentType?.includes("image") ? (
                <img src={blobUrl} alt="Document" className="max-w-full max-h-full object-contain mx-auto" />
              ) : blobUrl && contentType?.includes("text") ? (
                <iframe src={blobUrl} className="w-full h-full border" title="Text Preview" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full bg-gray-100">
                  <p className="text-gray-600">Preview not available for this file type</p>
                  <p className="text-sm text-gray-500">File type: {contentType || "Unknown"}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WaitingRoom;