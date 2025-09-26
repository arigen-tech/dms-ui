"use client"

import { useRef, useState, useEffect } from "react"
import apiClient from "../API/apiClient"
import { useNavigate } from "react-router-dom"
import Popup from "../Components/Popup"
import LoadingComponent from "../Components/LoadingComponent"
import { API_HOST } from "../API/apiConfig"
import { MagnifyingGlassIcon, EyeIcon, ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/24/solid"

const WaitingRoom = () => {
  const navigate = useNavigate()
  
  // Essential state variables only
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
      const response = await apiClient.get('/home/getallwaitingroom', {
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

  const openFile = async (doc) => {
    try {
      setOpeningFiles(true)
      
      // Use the filepath from the API response
      const encodedPath = doc.filepath.split("/").map(encodeURIComponent).join("/")
      const fileUrl = `${API_HOST}/api/documents/download/${encodedPath}`

      const response = await apiClient.get(fileUrl, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      })

      const blob = new Blob([response.data], { type: response.headers["content-type"] })
      const url = URL.createObjectURL(blob)

      setBlobUrl(url)
      setContentType(response.headers["content-type"])
      setSelectedDoc(doc)
      setIsModalOpen(true)
    } catch (error) {
      console.error("Error opening file:", error)
      showPopup("Failed to open file", "error")
    } finally {
      setOpeningFiles(false)
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

  const handleSaveSelectedDocuments = async () => {
    if (selectedRowIds.length === 0) {
      showPopup("Please select at least one document to save.", "warning")
      return
    }

    const selectedDocumentsData = documents.filter((doc) => selectedRowIds.includes(doc.id))
    console.log("Selected documents:", selectedDocumentsData)
    
    // Add your save logic here
    showPopup(`Successfully saved ${selectedRowIds.length} documents`, "success")
    
    navigate("/all-documents", { 
    state: { 
      selectedDocuments: selectedDocumentsData,
      fromWaitingRoom: true 
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
      year: "numeric" 
    })
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedDoc(null)
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl)
      setBlobUrl("")
    }
  }

  if (loading) {
    return <LoadingComponent />
  }

  return (
    <div className="p-2">
      <div className="p-0">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="mt-6">
            {popupMessage && (
              <Popup 
                message={popupMessage.message} 
                type={popupMessage.type} 
                onClose={() => setPopupMessage(null)} 
              />
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
                  placeholder="Search by document name, source, version, type, year..."
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
                    <th className="border p-2 text-left">SR.</th>
                    <th className="border p-2 text-left">Document Name</th>
                    <th className="border p-2 text-left">Source Name</th>
                    <th className="border p-2 text-left">Year</th>
                    <th className="border p-2 text-left">Version</th>
                    <th className="border p-2 text-left">File Type</th>
                    <th className="border p-2 text-left">Created Date</th>
                    <th className="border p-2 text-left">View</th>
                    <th className="border p-2 text-left">Select</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedDocuments.length > 0 ? (
                    paginatedDocuments.map((doc, index) => (
                      <tr key={doc.id} className="hover:bg-gray-50">
                        <td className="border p-2">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                        <td className="border p-2">{doc.documentName || '--'}</td>
                        <td className="border p-2">{doc.sourceName || '--'}</td>
                        <td className="border p-2">{doc.year || '--'}</td>
                        <td className="border p-2">{doc.version || '--'}</td>
                        <td className="border p-2 uppercase">{doc.fileType || '--'}</td>
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
                        <td className="border p-2 text-center">
                          <input
                            type="checkbox"
                            checked={selectedRowIds.includes(doc.id)}
                            onChange={(e) => handleCheckboxChange(doc.id, e.target.checked)}
                            className="w-4 h-4"
                          />
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

              {/* Save Button */}
              <div className="flex justify-end mt-4">
                <button
                  onClick={handleSaveSelectedDocuments}
                  disabled={selectedRowIds.length === 0}
                  className={`px-4 py-2 rounded-md text-sm text-white ${
                    selectedRowIds.length === 0 ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  Save Selected ({selectedRowIds.length})
                </button>
              </div>

              {/* Pagination Controls */}
              {totalPages > 0 && (
                <div className="flex items-center justify-between mt-4">
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
                          currentPage === page ? "bg-blue-500 text-white" : "bg-slate-200 hover:bg-blue-100"
                        }`}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
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

                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-700">
                      Page {currentPage} of {totalPages}
                    </span>
                    <span className="text-sm text-gray-700">
                      Showing {totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{" "}
                      {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* File Preview Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg max-w-4xl max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {selectedDoc?.documentName} - {selectedDoc?.version}
              </h3>
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Close
              </button>
            </div>
            
            {blobUrl && (
              <div className="w-full h-96">
                {contentType?.includes('pdf') ? (
                  <iframe src={blobUrl} className="w-full h-full border" />
                ) : contentType?.includes('image') ? (
                  <img src={blobUrl} alt="Document" className="max-w-full max-h-full" />
                ) : (
                  <div className="flex items-center justify-center h-full bg-gray-100">
                    <p>Preview not available for this file type</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default WaitingRoom