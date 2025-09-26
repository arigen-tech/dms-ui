"use client"

import { useRef, useState, useEffect } from "react"
import apiClient from "../API/apiClient"
import { useLocation, useNavigate } from "react-router-dom"
import Popup from "../Components/Popup"
import LoadingComponent from "../Components/LoadingComponent"
import { API_HOST, FILETYPE_API } from "../API/apiConfig"
import { MagnifyingGlassIcon, EyeIcon, ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/24/solid"

const WaitingRoom = ({ fieldsDisabled }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const data = location.state
  const [formData, setFormData] = useState({
    uploadedFilePaths: [],
    uploadedFiles: [],
  })
  const [uploadedFileNames, setUploadedFileNames] = useState([])
  const [uploadedFilePath, setUploadedFilePath] = useState([])
  const [selectedFiles, setSelectedFiles] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState({ paths: [] })
  const [isUploadEnabled, setIsUploadEnabled] = useState(false)
  const [printTrue, setPrintTrue] = useState(false)
  const [documents, setDocuments] = useState([])
  const fileInputRef = useRef(null)
  const [totalItems, setTotalItems] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [isUploading, setIsUploading] = useState(false)
  const [popupMessage, setPopupMessage] = useState(null)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [searchTerm, setSearchTerm] = useState("")
  const [uploadProgress, setUploadProgress] = useState(0)
  const token = localStorage.getItem("token")
  const UserId = localStorage.getItem("userId")
  const [error, setError] = useState("")
  const [qrCodeUrl, setQrCodeUrl] = useState(null)
  const [filesType, setFilesType] = useState([])
  const [unsportFile, setUnsportFile] = useState(false)
  const [viewFileTypeModel, setViewFileTypeModel] = useState(false)
  const [folderUpload, setFolderUpload] = useState(false)
  const [uploadController, setUploadController] = useState(null)
  const [blobUrl, setBlobUrl] = useState("")
  const [contentType, setContentType] = useState("")
  const [selectedDocFile, setSelectedDocFiles] = useState(null)
  const [searchFileTerm, setSearchFileTerm] = useState("")
  const [openingFileIndex, setOpeningFileIndex] = useState(null)
  const [loading, setLoading] = useState(false)
  const [bProcess, setBProcess] = useState(false)
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [openingFiles, setOpeningFiles] = useState(null)
  const [deletingFiles, setDeletingFiles] = useState(null)

  const [filterCategory, setFilterCategory] = useState("")
  const [filterYear, setFilterYear] = useState("")
  const [selectedRowIds, setSelectedRowIds] = useState([])

  const SAMPLE_DOCUMENTS = [
    {
      id: 1,
      docName: "Annual_Report_2024.pdf",
      sourceName: "Finance_Department.pdf",
      version: "1.0",
      fileType: "pdf",
      createdOn: "2025-09-23T10:00:00.000Z",
    },
    {
      id: 2,
      docName: "Project_Proposal_Marketing.docx",
      sourceName: "Marketing_Team.docx",
      version: "2.1",
      fileType: "docx",
      createdOn: "2025-09-22T14:30:00.000Z",
    },
    {
      id: 3,
      docName: "Budget_Analysis_Q3.xlsx",
      sourceName: "Accounting_Dept.xlsx",
      version: "1.5",
      fileType: "xlsx",
      createdOn: "2025-09-21T09:15:00.000Z",
    },
    {
      id: 4,
      docName: "Training_Manual_HR.pptx",
      sourceName: "Human_Resources.pptx",
      version: "3.0",
      fileType: "pptx",
      createdOn: "2025-09-20T16:45:00.000Z",
    },
  ]

  console.log("formData", formData)

  const fetchPaths = async () => {
    // Dummy implementation to satisfy the linter. Replace with actual logic if needed.
    console.log("Fetching paths...")
  }

  useEffect(() => {
    fetchDocuments()
    fetchPaths()
    fetchFilesType()
  }, [])

  const showPopup = (message, type = "info") => {
    setPopupMessage({
      message,
      type,
      onClose: () => {
        setPopupMessage(null)
      },
    })
  }

  console.log("already uploaded", uploadedFilePath)

  const fetchFilesType = async () => {
    try {
      const response = await apiClient.get(`${FILETYPE_API}/getAllActive`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setFilesType(response?.data?.response ?? [])
    } catch (error) {
      console.error("Error fetching Files Types:", error)
      setFilesType([])
    }
  }

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      setDocuments(SAMPLE_DOCUMENTS)
      setTotalItems(SAMPLE_DOCUMENTS.length)
    } catch (error) {
      console.error("Error fetching documents:", error)
      if (error.response) {
        console.error("Error response data:", error.response.data)
        console.error("Error response status:", error.response.status)
      } else if (error.request) {
        console.error("No response received:", error.request)
      } else {
        console.error("Error setting up request:", error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  console.log("all doc by user", documents)

  const openFile = async (file) => {
    try {
      setOpeningFiles(true)

      const encodedPath = file.path.split("/").map(encodeURIComponent).join("/")
      const fileUrl = `${API_HOST}/api/documents/download/${encodedPath}`

      const response = await apiClient.get(fileUrl, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      })

      const blob = new Blob([response.data], { type: response.headers["content-type"] })
      const url = URL.createObjectURL(blob)

      setBlobUrl(url)
      setContentType(response.headers["content-type"])
      setSearchFileTerm("")
      setIsModalOpen(true)
    } catch (error) {
      console.error("❌ Error fetching file:", error)
      alert("Failed to fetch or preview the file.")
    } finally {
      setOpeningFiles(false)
    }
  }

  const filteredDocuments = documents.filter((doc) => {
    const search = searchTerm.toLowerCase()
    const createdDate = doc.createdOn ? new Date(doc.createdOn).toLocaleDateString("en-GB") : ""

    return (
      (doc.docName && doc.docName.toLowerCase().includes(search)) ||
      (doc.sourceName && doc.sourceName.toLowerCase().includes(search)) ||
      (doc.version && doc.version.toLowerCase().includes(search)) ||
      (doc.fileType && doc.fileType.toLowerCase().includes(search)) ||
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
    console.log("JSON for selected documents:", JSON.stringify(selectedDocumentsData, null, 2))
    navigate("/all-documents")
  }

  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage)
  const paginatedDocuments = filteredDocuments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const getPageNumbers = () => {
    const maxPageNumbers = 5
    const startPage = Math.floor((currentPage - 1) / maxPageNumbers) * maxPageNumbers + 1
    const endPage = Math.min(startPage + maxPageNumbers - 1, totalPages)
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i)
  }

  const formatDate = (dateString) => {
    if (!dateString) return "--"
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return "--"
    const options = { day: "2-digit", month: "2-digit", year: "numeric" }
    return date.toLocaleString("en-GB", options).replace(",", "")
  }

  const openModal = (doc) => {
    setSelectedDoc(doc)
    fetchPaths(doc)
    setIsOpen(true)
  }

  const closeModal = () => {
    setIsOpen(false)
    setSelectedDoc(null)
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
                  placeholder="Search by document name, source name, version, file type..."
                  className="border rounded-l-md p-1.5 outline-none"
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
                    <th className="border p-2 text-left">Doc Name</th>
                    <th className="border p-2 text-left">Source Name</th>
                    <th className="border p-2 text-left">Version</th>
                    <th className="border p-2 text-left">File Type</th>
                    <th className="border p-2 text-left">Created Date</th>
                    <th className="border p-2 text-left">View</th>
                    <th className="border p-2 text-left">Select</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedDocuments.map((doc, index) => (
                    <tr key={doc.id}>
                      <td className="border p-2">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                      <td className="border p-2">{doc.docName}</td>
                      <td className="border p-2">{doc.sourceName}</td>
                      <td className="border p-2">{doc.version}</td>
                      <td className="border p-2">{doc.fileType}</td>
                      <td className="border p-2">{formatDate(doc.createdOn)}</td>
                      <td className="border p-2">
                        <button onClick={() => openModal(doc)}>
                          <EyeIcon className="h-6 w-6 bg-green-400 rounded-xl p-1 text-white" />
                        </button>
                      </td>
                      <td className="border p-2 text-center">
                        <input
                          type="checkbox"
                          checked={selectedRowIds.includes(doc.id)}
                          onChange={(e) => handleCheckboxChange(doc.id, e.target.checked)}
                        />
                      </td>
                    </tr>
                  ))}
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
                  Save Selected
                </button>
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center mt-4">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1 || totalPages === 0}
                  className={`px-3 py-1 rounded mr-3 ${
                    currentPage === 1 || totalPages === 0
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-slate-200 hover:bg-slate-300"
                  }`}
                >
                  <ArrowLeftIcon className="inline h-4 w-4 mr-2 mb-1" />
                  Previous
                </button>

                {totalPages > 0 &&
                  getPageNumbers().map((page) => (
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

                <span className="text-sm text-gray-700 mx-2">of {totalPages} pages</span>

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className={`px-3 py-1 rounded ml-3 ${
                    currentPage === totalPages || totalPages === 0
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-slate-200 hover:bg-slate-300"
                  }`}
                >
                  Next
                  <ArrowRightIcon className="inline h-4 w-4 ml-2 mb-1" />
                </button>

                <div className="ml-4">
                  <span className="text-sm text-gray-700">
                    Showing {totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{" "}
                    {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WaitingRoom
