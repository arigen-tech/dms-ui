

import * as mammoth from "mammoth"
import { useState, useEffect } from "react"
import apiClient from "../API/apiClient"
import { useNavigate, useLocation } from "react-router-dom"
import Popup from "../Components/Popup"
import LoadingComponent from "../Components/LoadingComponent"
import { API_HOST } from "../API/apiConfig"
import { MagnifyingGlassIcon, EyeIcon, ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/24/solid"

const WaitingRoom = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(false)
  const [totalItems, setTotalItems] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRowIds, setSelectedRowIds] = useState([])
  const [popupMessage, setPopupMessage] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [blobUrl, setBlobUrl] = useState("")
  const [contentType, setContentType] = useState("")
  const [openingFiles, setOpeningFiles] = useState(false)
  const [docxContent, setDocxContent] = useState("")
  const [isDocx, setIsDocx] = useState(false)

  const token = localStorage.getItem("token")

  useEffect(() => {
    fetchDocuments()
  }, [])

  const showPopup = (message, type = "info") => {
    setPopupMessage({
      message,
      type,
      onClose: () => setPopupMessage(null),
    })
  }

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get("/home/getallwaitingroom", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const docs = response?.data?.response || []
      setDocuments(docs)
      setTotalItems(docs.length)
    } catch (error) {
      console.error("Error fetching documents:", error)
      showPopup("Failed to fetch documents", "error")
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }

  // Enhanced file name generation function
  const generateFileName = (doc, index, metadata = {}) => {
    const now = new Date()
    const formattedDate = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
      2,
      "0",
    )}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(
      2,
      "0",
    )}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(
      2,
      "0",
    )}${String(now.getMilliseconds()).padStart(3, "0")}`

    const baseName = doc.documentName ? doc.documentName.split(".")[0].substring(0, 3) : "DOC"
    const extension = doc.fileType?.toLowerCase() || (doc.documentName ? doc.documentName.split(".").pop() : "pdf")

    // Use metadata from Document Management or fallback values
    const branch = metadata.branch || "BRANCH"
    const department = metadata.department || "DEPT"
    const year = metadata.year || "YEAR"
    const category = metadata.category || "CATEGORY"
    const version = metadata.version || doc.version || "1.0"

    return `${baseName}_${branch}_${department}_${year}_${category}_${version}_${formattedDate}_${index + 1}.${extension}`
  }

  // Enhanced file selection handler


 const handleSaveSelectedDocuments = () => {
  if (selectedRowIds.length === 0) {
    showPopup("Please select at least one document.", "warning");
    return;
  }

  const selectedDocumentsData = documents.filter(doc => selectedRowIds.includes(doc.id));
  const metadata = location.state?.metadata || {};

  navigate("/all-documents", {
    state: {
      selectedDocuments: selectedDocumentsData.map(doc => ({
        id: doc.id,
        waitingRoomPath: doc.filepath,
        documentName: doc.documentName,
        fileType: doc.fileType,
        sourceName: doc.sourceName,
      })),
      fromWaitingRoom: true,
      metadata,
    },
  });
};


// Add metadata display at the top
{location.state?.metadata && (
  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
    <h3 className="text-lg font-semibold text-blue-800 mb-2">Document Management Metadata</h3>
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
      <div><strong>Branch:</strong> {location.state.metadata.branch}</div>
      <div><strong>Department:</strong> {location.state.metadata.department}</div>
      <div><strong>Year:</strong> {location.state.metadata.year}</div>
      <div><strong>Category:</strong> {location.state.metadata.category}</div>
      <div><strong>Version:</strong> {location.state.metadata.version}</div>
      <div><strong>File No:</strong> {location.state.metadata.fileNo}</div>
    </div>
    <p className="text-blue-600 text-xs mt-2">
      Selected files will use this metadata when moved to document storage.
    </p>
  </div>
)}

  // Rest of your existing functions remain the same...
  const openFile = async (file) => {
    try {
      setOpeningFiles(true)

      let fileUrl
      let fileName

      if (file.filepath && !file.branch) {
        fileName = file.filepath.split(/[/\\]/).pop()
        fileUrl = `${API_HOST}/home/download/waitingroom/${encodeURIComponent(fileName)}`
      } else if (file.branch && file.department && file.year && file.category && file.version && file.fileName) {
        fileName = `${file.branch}/${file.department}/${file.year}/${file.category}/${file.version}/${file.fileName}`
        const encodedPath = fileName.split("/").map(encodeURIComponent).join("/")
        fileUrl = `${API_HOST}/api/documents/download/${encodedPath}`
      } else if (file.path) {
        fileName = file.path.split(/[/\\]/).pop()
        const encodedPath = file.path.split("/").map(encodeURIComponent).join("/")
        fileUrl = `${API_HOST}/api/documents/download/${encodedPath}`
      } else if (file.documentName) {
        fileName = file.documentName.split(/[/\\]/).pop()
        fileUrl = `${API_HOST}/home/download/waitingroom/${encodeURIComponent(fileName)}`
      } else {
        console.error("Unable to determine file type:", file)
        showPopup("Unable to open file - missing file information", "error")
        return
      }

      const response = await apiClient.get(fileUrl, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      })

      const contentType = response.headers["content-type"] || ""
      const blob = new Blob([response.data], { type: contentType })
      const fileExtension = fileName.toLowerCase().split(".").pop()

      if (fileExtension === "docx" || contentType.includes("wordprocessingml") || contentType.includes("msword")) {
        try {
          const arrayBuffer = await blob.arrayBuffer()
          const result = await mammoth.convertToHtml({ arrayBuffer })
          setDocxContent(result.value)
          setIsDocx(true)
          setContentType("text/html")
          setBlobUrl("")
        } catch (mammothError) {
          console.error("Error converting DOCX:", mammothError)
          showPopup("Failed to convert DOCX file for viewing", "error")
          return
        }
      } else {
        const url = URL.createObjectURL(blob)
        setBlobUrl(url)
        setContentType(contentType)
        setIsDocx(false)
        setDocxContent("")
      }

      setSelectedDoc(file)
      setIsModalOpen(true)
    } catch (error) {
      console.error("Error opening file:", error)
      if (error.response?.status === 404) {
        showPopup("File not found. It may have been moved or deleted.", "error")
      } else if (error.response?.status === 403) {
        showPopup("Access denied. You don't have permission to view this file.", "error")
      } else {
        showPopup("Failed to open file. Please try again.", "error")
      }
    } finally {
      setOpeningFiles(false)
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedDoc(null)
    setIsDocx(false)
    setDocxContent("")
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl)
      setBlobUrl("")
    }
  }

  const filteredDocuments = documents.filter((doc) => {
    const search = searchTerm.toLowerCase()
    const createdDate = doc.createdOn ? new Date(doc.createdOn).toLocaleDateString("en-GB") : ""

    return (
      (doc.documentName && doc.documentName.toLowerCase().includes(search)) ||
      (doc.sourceName && doc.sourceName.toLowerCase().includes(search)) ||
      (doc.version && doc.version.toLowerCase().includes(search)) ||
      (doc.fileType && doc.fileType.toLowerCase().includes(search)) ||
      (doc.year && doc.year.includes(search)) ||
      createdDate.includes(search)
    )
  })

  const handleCheckboxChange = (documentId, isChecked) => {
    setSelectedRowIds((prevSelected) => {
      if (isChecked) {
        return [...prevSelected, documentId]
      } else {
        return prevSelected.filter((id) => id !== documentId)
      }
    })
  }

  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage)
  const paginatedDocuments = filteredDocuments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const getPageNumbers = () => {
    const maxPageNumbers = 5
    const startPage = Math.floor((currentPage - 1) / maxPageNumbers) * maxPageNumbers + 1
    const endPage = Math.min(startPage + maxPageNumbers - 1, totalPages)
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i)
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return "--"
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) return "--"
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  if (loading) {
    return <LoadingComponent />
  }

  return (
    <div className="p-2">
      <div className="p-0">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h1 className="text-xl mb-4 font-semibold">Waiting Room</h1>

          {location.state?.metadata && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800">Metadata from Document Management</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-sm">
                <div><strong>Branch:</strong> {location.state.metadata.branch}</div>
                <div><strong>Department:</strong> {location.state.metadata.department}</div>
                <div><strong>Year:</strong> {location.state.metadata.year}</div>
                <div><strong>Category:</strong> {location.state.metadata.category}</div>
              </div>
            </div>
          )}

          {popupMessage && (
            <Popup message={popupMessage.message} type={popupMessage.type} onClose={() => setPopupMessage(null)} />
          )}

          {/* Search and Show Controls */}
          <div className="mb-4 bg-slate-100 p-4 rounded-lg flex justify-between items-center">
            <div className="flex items-center bg-blue-500 rounded-lg">
              <label htmlFor="itemsPerPage" className="mr-2 ml-2 text-white text-sm">
                Show:
              </label>
              <select
                id="itemsPerPage"
                className="border rounded-r-lg p-1.5 outline-none"
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value))
                  setCurrentPage(1)
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
                placeholder="Search documents..."
                className="border rounded-l-md p-1.5 outline-none w-80"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                maxLength={50}
              />
              <MagnifyingGlassIcon className="text-white bg-blue-500 rounded-r-lg h-8 w-8 border p-1.5" />
            </div>
          </div>

          <div className="overflow-x-auto bg-white">
            <table className="w-full border-collapse border">
              <thead>
                <tr className="bg-slate-100">
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
                        <button onClick={() => openFile(doc)} disabled={openingFiles} className="disabled:opacity-50">
                          <EyeIcon className="h-6 w-6 bg-green-400 rounded-xl p-1 text-white hover:bg-green-500" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="border p-4 text-center text-gray-500">
                      No documents found in waiting room
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Action Buttons */}
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-600">
                Selected: {selectedRowIds.length} of {filteredDocuments.length} documents
              </div>

              <button
                onClick={handleSaveSelectedDocuments}
                disabled={selectedRowIds.length === 0}
                className={`px-6 py-2 rounded-md text-white ${selectedRowIds.length === 0
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                  }`}
              >
                Choose Selected ({selectedRowIds.length})
              </button>
            </div>

            {/* Pagination */}
            {totalPages > 0 && (
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 rounded mr-3 ${currentPage === 1 ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"
                      }`}
                  >
                    <ArrowLeftIcon className="inline h-4 w-4 mr-2 mb-1" />
                    Previous
                  </button>

                  {getPageNumbers().map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 rounded mx-1 ${currentPage === page ? "bg-blue-500 text-white" : "bg-slate-200 hover:bg-blue-100"
                        }`}
                    >
                      {page}
                    </button>
                  ))}

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

                <div className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages} •
                  Showing {totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{" "}
                  {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* File Preview Modal - same as before */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg max-w-5xl max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {selectedDoc?.documentName} - {selectedDoc?.version}
              </h3>
              <button onClick={closeModal} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
                Close
              </button>
            </div>

            <div className="w-full min-h-96 max-h-96 overflow-auto">
              {isDocx ? (
                <div
                  className="docx-content p-4 bg-white border rounded"
                  dangerouslySetInnerHTML={{ __html: docxContent }}
                  style={{
                    fontFamily: "Times, serif",
                    lineHeight: "1.6",
                    fontSize: "14px",
                  }}
                />
              ) : blobUrl && contentType?.includes("pdf") ? (
                <iframe src={blobUrl} className="w-full h-full border" title="PDF Preview" />
              ) : blobUrl && contentType?.includes("image") ? (
                <img
                  src={blobUrl || "/placeholder.svg"}
                  alt="Document"
                  className="max-w-full max-h-full object-contain mx-auto"
                />
              ) : blobUrl && contentType?.includes("text") ? (
                <iframe src={blobUrl} className="w-full h-full border" title="Text Preview" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full bg-gray-100 space-y-4">
                  <div className="text-center">
                    <p className="text-gray-600 mb-4">Preview not available for this file type</p>
                    <p className="text-sm text-gray-500">File type: {contentType || "Unknown"}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WaitingRoom