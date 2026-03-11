import { useState, useEffect, useMemo } from "react"
import {
  DocumentDuplicateIcon,
  TrashIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  DocumentIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowsRightLeftIcon,
  DocumentTextIcon,
  PhotoIcon,
  FolderIcon,
  ClockIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/solid"
import axios from "axios"
import apiClient from "../API/apiClient";

import { DOCUMENTHEADER_API, API_HOST } from "../API/apiConfig"
import LoadingComponent from '../Components/LoadingComponent'
import Popup from '../Components/Popup'
import AutoTranslate from '../i18n/AutoTranslate'
import exportDuplicateReport from "./exportDuplicateReport" 

const tokenKey = "tokenKey"

const DuplicateFilesPage = () => {
  const [duplicateGroups, setDuplicateGroups] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [popupMessage, setPopupMessage] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDuplicates, setSelectedDuplicates] = useState([])
  const [expandedStates, setExpandedStates] = useState({})
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteType, setDeleteType] = useState("")
  const [itemToDelete, setItemToDelete] = useState(null)

  // Comparison states
  const [showComparisonModal, setShowComparisonModal] = useState(false)
  const [comparisonResult, setComparisonResult] = useState(null)
  const [isComparing, setIsComparing] = useState(false)
  const [fileUrls, setFileUrls] = useState({ firstFile: null, secondFile: null })
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [activeTab, setActiveTab] = useState("preview")

  // Pagination state
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [currentPage, setCurrentPage] = useState(1)

  const token = typeof window !== "undefined" ? localStorage.getItem(tokenKey) : null

  // ============================================================
  // FETCH DUPLICATES
  // ============================================================
  const fetchDuplicateDocuments = async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.get(`${DOCUMENTHEADER_API}/duplicates`)
      if (response.data.status === 200) {
        const data = response.data.response || []
        setDuplicateGroups(data)
        const expandedState = {}
        data.forEach(group => { expandedState[group.originalDocumentId] = false })
        setExpandedStates(expandedState)
      } else {
        showPopup("Failed to fetch duplicate documents", "error")
      }
    } catch (error) {
      console.error("Error fetching duplicate documents:", error)
      showPopup("Failed to fetch duplicate documents", "error")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchDuplicateDocuments() }, [])

  // ============================================================
  // FILTER & PAGINATION
  // ============================================================
  const filteredDuplicates = useMemo(() => {
    if (!searchTerm.trim()) return duplicateGroups
    const searchLower = searchTerm.toLowerCase()
    return duplicateGroups.filter(group =>
      group.originalFileName?.toLowerCase().includes(searchLower) ||
      group.originalFilePath?.toLowerCase().includes(searchLower) ||
      group.duplicateFiles?.some(file =>
        file.duplicateFileName?.toLowerCase().includes(searchLower) ||
        file.duplicateFilePath?.toLowerCase().includes(searchLower)
      )
    )
  }, [duplicateGroups, searchTerm])

  const totalItems = filteredDuplicates.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const paginatedDuplicates = filteredDuplicates.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const getPageNumbers = () => {
    const maxPageNumbers = 5
    const startPage = Math.floor((currentPage - 1) / maxPageNumbers) * maxPageNumbers + 1
    const endPage = Math.min(startPage + maxPageNumbers - 1, totalPages)
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i)
  }

  useEffect(() => { setCurrentPage(1) }, [searchTerm, itemsPerPage])

  // ============================================================
  // HELPERS
  // ============================================================
  const showPopup = (message, type = 'info') => {
    setPopupMessage({ message, type, onClose: () => setPopupMessage(null) })
  }

  const toggleGroup = (groupId) => {
    setExpandedStates(prev => ({ ...prev, [groupId]: !prev[groupId] }))
  }

  const handleSelectDuplicate = (groupId, duplicateId) => {
    setSelectedDuplicates(prev => {
      const filtered = prev.filter(id =>
        !duplicateGroups.some(group =>
          group.duplicateFiles?.some(file => file.duplicateId === id && group.originalDocumentId === groupId)
        )
      )
      if (filtered.includes(duplicateId)) return filtered.filter(id => id !== duplicateId)
      return [...filtered, duplicateId]
    })
  }

  const isDuplicateSelected = (duplicateId) => selectedDuplicates.includes(duplicateId)

  const areAllDuplicatesInGroupSelected = (groupId) => {
    const group = duplicateGroups.find(g => g.originalDocumentId === groupId)
    if (!group || !group.duplicateFiles || group.duplicateFiles.length === 0) return false
    return group.duplicateFiles.every(file => selectedDuplicates.includes(file.duplicateId))
  }

  const isOnlyOneDuplicateSelected = () => selectedDuplicates.length === 1

  const handleSelectAllInGroup = (groupId) => {
    const group = duplicateGroups.find(g => g.originalDocumentId === groupId)
    if (!group || !group.duplicateFiles) return
    const allDuplicateIds = group.duplicateFiles.map(file => file.duplicateId)
    setSelectedDuplicates(prev => {
      if (areAllDuplicatesInGroupSelected(groupId)) {
        return prev.filter(id => !allDuplicateIds.includes(id))
      }
      return [...new Set([...prev, ...allDuplicateIds])]
    })
  }

  // ============================================================
  // ✅ FIXED: getFilePreviewUrl — uses path directly, same as FileCompare fix
  // ============================================================
  const getFilePreviewUrl = async (filePath) => {
    if (!filePath) {
      console.error("❌ filePath is missing")
      return null
    }

    try {
      const pathParts = filePath.replace(/\\/g, '/').split('/').filter(Boolean)

      if (pathParts.length < 6) {
        console.error("❌ Path has fewer than 6 parts:", pathParts)
        return null
      }

      const [branch, department, year, category, version, ...fileNameParts] = pathParts
      const fileName = fileNameParts.join('/')

      const fileUrl =
        `${API_HOST}/api/documents/download/` +
        `${encodeURIComponent(branch)}/` +
        `${encodeURIComponent(department)}/` +
        `${encodeURIComponent(year)}/` +
        `${encodeURIComponent(category)}/` +
        `${encodeURIComponent(version)}/` +
        `${encodeURIComponent(fileName)}?action=view`

      console.log("🔗 Preview URL:", fileUrl)

      const response = await apiClient.get(fileUrl, { responseType: "blob" })

      const contentType = response.headers["content-type"] || "application/octet-stream"
      const blob = new Blob([response.data], { type: contentType })
      const url = URL.createObjectURL(blob)

      console.log("✅ File loaded:", fileName)
      return { url, contentType }
    } catch (error) {
      console.error("❌ Error fetching file preview:", error.message, "| status:", error.response?.status)
      return null
    }
  }

  // ============================================================
  // COMPARE
  // ============================================================
  const handleCompareWithDuplicate = async (group, duplicateId) => {
    const duplicateFile = group.duplicateFiles?.find(f => f.duplicateId === duplicateId)
    if (!duplicateFile) return

    setIsComparing(true)
    setComparisonResult(null)
    setShowComparisonModal(true)
    setActiveTab("preview")
    setIsLoadingFiles(true)

    try {
      const response = await apiClient.post(
        `${DOCUMENTHEADER_API}/compare`,
        { firstFileId: group.originalDocumentId, secondFileId: duplicateFile.duplicateId },
        { headers: { "Content-Type": "application/json" } }
      )

      const result = response.data

      if (result.status === 200 && result.message === "success") {
        const apiResponse = result.response

        const [firstFileData, secondFileData] = await Promise.all([
          getFilePreviewUrl(group.originalFilePath),
          getFilePreviewUrl(duplicateFile.duplicateFilePath),
        ])

        setFileUrls({ firstFile: firstFileData, secondFile: secondFileData })

        const leftFileType = apiResponse.comparisonResult?.leftFile?.fileType || "Unknown"
        const rightFileType = apiResponse.comparisonResult?.rightFile?.fileType || "Unknown"

        setComparisonResult({
          identical: apiResponse.identical,
          message: apiResponse.message,
          similarityPercentage: apiResponse.similarityPercentage,
          differences: apiResponse.differences || [],
          comparisonResult: apiResponse.comparisonResult,
          leftFile: {
            fileName: apiResponse.comparisonResult?.leftFile?.fileName || group.originalFileName || "Unknown",
            version: "No version",
            fileType: leftFileType,
            path: apiResponse.comparisonResult?.leftFile?.filePath || group.originalFilePath || "",
            highlightedContent: apiResponse.comparisonResult?.leftFile?.highlightedContent || "",
          },
          rightFile: {
            fileName: apiResponse.comparisonResult?.rightFile?.fileName || duplicateFile.duplicateFileName || "Unknown",
            version: duplicateFile.version ? `Version ${duplicateFile.version}` : "No version",
            fileType: rightFileType,
            path: apiResponse.comparisonResult?.rightFile?.filePath || duplicateFile.duplicateFilePath || "",
            highlightedContent: apiResponse.comparisonResult?.rightFile?.highlightedContent || "",
          },
          diffImagePath: apiResponse.diffImagePath,
        })

        showPopup(apiResponse.message, apiResponse.identical ? "success" : "info")
      } else {
        showPopup(result.message || "Failed to compare files", "error")
      }
    } catch (error) {
      console.error("Error comparing files:", error)
      showPopup("Failed to compare files", "error")
    } finally {
      setIsComparing(false)
      setIsLoadingFiles(false)
    }
  }

  const handleCompareSelected = async () => {
    if (selectedDuplicates.length === 0) {
      showPopup("Please select at least one duplicate file to compare", "error")
      return
    }
    if (selectedDuplicates.length > 1) {
      showPopup("Please select only ONE duplicate file to compare with the original", "error")
      return
    }

    const duplicateId = selectedDuplicates[0]
    let targetGroup = null
    let selectedFile = null

    for (const group of duplicateGroups) {
      const foundFile = group.duplicateFiles?.find(file => file.duplicateId === duplicateId)
      if (foundFile) { targetGroup = group; selectedFile = foundFile; break }
    }

    if (!targetGroup || !selectedFile) {
      showPopup("Could not find selected file", "error")
      return
    }

    await handleCompareWithDuplicate(targetGroup, selectedFile.duplicateId)
  }

  // ============================================================
  // DELETE
  // ============================================================
  const handleDeleteDuplicate = (groupId, duplicateId) => {
    const group = duplicateGroups.find(g => g.originalDocumentId === groupId)
    if (!group) return
    const duplicateFile = group.duplicateFiles.find(f => f.duplicateId === duplicateId)
    if (!duplicateFile) return
    setDeleteType("single")
    setItemToDelete({ groupId, duplicateId, fileName: duplicateFile.duplicateFileName, originalFileName: group.originalFileName })
    setShowDeleteConfirm(true)
  }

  const handleDeleteAllInGroup = (groupId) => {
    const group = duplicateGroups.find(g => g.originalDocumentId === groupId)
    if (!group) return
    setDeleteType("group")
    setItemToDelete({ groupId, fileName: group.originalFileName, count: group.duplicateFiles?.length || 0 })
    setShowDeleteConfirm(true)
  }

  const handleDeleteSelected = () => {
    if (selectedDuplicates.length === 0) {
      showPopup("Please select at least one duplicate file to delete", "error")
      return
    }
    setDeleteType("selected")
    setItemToDelete({ selectedIds: [...selectedDuplicates], count: selectedDuplicates.length })
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    try {
      if (deleteType === "single") {
        const response = await apiClient.delete(`${DOCUMENTHEADER_API}/duplicates/${itemToDelete.duplicateId}`)
        if (response.data.status === 200) {
          showPopup(`Deleted duplicate: ${itemToDelete.fileName}`, "success")
          fetchDuplicateDocuments()
        } else {
          showPopup(`Failed to delete duplicate: ${response.data.message}`, "error")
        }
      } else if (deleteType === "group") {
        const response = await apiClient.delete(`${DOCUMENTHEADER_API}/duplicates/original/${itemToDelete.groupId}`)
        if (response.data.status === 200) {
          showPopup(`Deleted ${itemToDelete.count} duplicate(s) for ${itemToDelete.fileName}`, "success")
          fetchDuplicateDocuments()
        } else {
          showPopup(`Failed to delete duplicates: ${response.data.message}`, "error")
        }
      } else if (deleteType === "selected") {
        const deletePromises = itemToDelete.selectedIds.map(duplicateId =>
          apiClient.delete(`${DOCUMENTHEADER_API}/duplicates/${duplicateId}`)
        )
        const results = await Promise.allSettled(deletePromises)
        const successful = results.filter(r => r.status === 'fulfilled')
        if (successful.length > 0) {
          showPopup(`Deleted ${successful.length} duplicate(s)`, "success")
          fetchDuplicateDocuments()
          setSelectedDuplicates([])
        }
      }
    } catch (error) {
      console.error("Error deleting duplicate:", error)
      showPopup("Failed to delete duplicate", "error")
    } finally {
      setShowDeleteConfirm(false)
      setItemToDelete(null)
    }
  }

  // ============================================================
  // DOWNLOAD
  // ============================================================
  const handleDownloadFile = async (filePath, fileName) => {
    try {
      const pathParts = filePath.replace(/\\/g, '/').split('/').filter(Boolean)
      if (pathParts.length < 6) {
        showPopup("Invalid file path format", "error")
        return
      }
      const [branch, department, year, category, version, ...fileNameParts] = pathParts
      const actualFileName = fileNameParts.join('/')

      const fileUrl =
        `${API_HOST}/api/documents/download/` +
        `${encodeURIComponent(branch)}/` +
        `${encodeURIComponent(department)}/` +
        `${encodeURIComponent(year)}/` +
        `${encodeURIComponent(category)}/` +
        `${encodeURIComponent(version)}/` +
        `${encodeURIComponent(actualFileName)}`

      const response = await apiClient.get(fileUrl, { responseType: "blob" })
      const blob = new Blob([response.data], { type: response.headers["content-type"] })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = fileName || actualFileName
      document.body.appendChild(link)
      link.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(link)
      showPopup(`Downloaded: ${fileName || actualFileName}`, "success")
    } catch (error) {
      console.error("Error downloading file:", error)
      showPopup("Failed to download file", "error")
    }
  }

  // ============================================================
  // UI HELPERS
  // ============================================================
  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A"
    const date = new Date(timestamp)
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getFileIcon = (fileName) => {
    if (!fileName) return <DocumentIcon className="h-5 w-5 text-gray-500" />
    const ext = fileName.split('.').pop()?.toLowerCase()
    if (['pdf'].includes(ext)) return <DocumentTextIcon className="h-5 w-5 text-red-500" />
    if (['doc', 'docx', 'txt', 'rtf'].includes(ext)) return <DocumentTextIcon className="h-5 w-5 text-blue-500" />
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(ext)) return <PhotoIcon className="h-5 w-5 text-green-500" />
    if (['xls', 'xlsx', 'csv'].includes(ext)) return <DocumentTextIcon className="h-5 w-5 text-green-600" />
    return <DocumentIcon className="h-5 w-5 text-gray-500" />
  }

  const getFileType = (fileName) => {
    if (!fileName) return "Document"
    const ext = fileName.split('.').pop()?.toLowerCase()
    if (['pdf'].includes(ext)) return 'PDF Document'
    if (['doc', 'docx'].includes(ext)) return 'Word Document'
    if (['xls', 'xlsx'].includes(ext)) return 'Excel Spreadsheet'
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return 'Image'
    if (['txt'].includes(ext)) return 'Text File'
    return 'Document'
  }

  const getVersionText = (version) => {
    if (!version || version === "" || version === "null" || version === "undefined") return "No version"
    return `Version ${version}`
  }

  const closeComparisonModal = () => {
    setShowComparisonModal(false)
    setActiveTab("preview")
    if (fileUrls.firstFile?.url) URL.revokeObjectURL(fileUrls.firstFile.url)
    if (fileUrls.secondFile?.url) URL.revokeObjectURL(fileUrls.secondFile.url)
    setFileUrls({ firstFile: null, secondFile: null })
    setComparisonResult(null)
  }

  const getDifferenceTypeColor = (type) => {
    switch (type) {
      case "ADDED": return "bg-green-100 border-green-400 text-green-800"
      case "DELETED": return "bg-red-100 border-red-400 text-red-800"
      case "MODIFIED": return "bg-yellow-100 border-yellow-400 text-yellow-800"
      default: return "bg-gray-100 border-gray-400 text-gray-800"
    }
  }

  // ✅ FIXED: renderFileViewer — inline styles for guaranteed height
  const renderFileViewer = (fileData, isFirst = true, fileName = "") => {
    if (!fileData || !fileData.url) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '400px', background: '#f9fafb' }}>
          <div className="text-center">
            <DocumentIcon className="h-20 w-20 text-gray-400 mx-auto mb-4" />
            <p className="text-sm text-gray-600">
              <AutoTranslate>Unable to load file preview</AutoTranslate>
            </p>
          </div>
        </div>
      )
    }

    const contentType = (fileData.contentType || "").toLowerCase()
    const extension = fileName.split('.').pop()?.toLowerCase() || ""

    if (contentType.includes("pdf") || extension === "pdf") {
      return (
        <iframe
          src={fileData.url}
          style={{ width: '100%', height: '100%', minHeight: '500px', border: 'none', display: 'block' }}
          title={fileName}
        />
      )
    } else if (
      contentType.includes("image") ||
      ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(extension)
    ) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '400px', background: '#f9fafb' }}>
          <img
            src={fileData.url}
            alt={fileName}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        </div>
      )
    } else {
      return (
        <iframe
          src={fileData.url}
          style={{ width: '100%', height: '100%', minHeight: '500px', border: 'none', display: 'block' }}
          title={fileName}
        />
      )
    }
  }

  const renderDifferencesView = () => {
    if (!comparisonResult?.differences || comparisonResult.differences.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-700"><AutoTranslate>No differences found</AutoTranslate></p>
            <p className="text-sm text-gray-500"><AutoTranslate>Files are identical</AutoTranslate></p>
          </div>
        </div>
      )
    }

    return (
      <div className="h-full overflow-auto p-4">
        <div className="space-y-3">
          {comparisonResult.differences.map((diff, index) => (
            <div key={index} className={`p-3 rounded-lg border-l-4 ${getDifferenceTypeColor(diff.type)}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getDifferenceTypeColor(diff.type)}`}>
                  {diff.type}
                </span>
                <div className="text-xs text-gray-600">
                  <AutoTranslate>Line</AutoTranslate> {diff.leftLineNumber !== -1 ? diff.leftLineNumber : "N/A"} →{" "}
                  {diff.rightLineNumber !== -1 ? diff.rightLineNumber : "N/A"}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-medium text-gray-600 mb-1"><AutoTranslate>Original</AutoTranslate></div>
                  <div className="text-sm bg-white p-2 rounded border font-mono">
                    {diff.leftContent || <span className="text-gray-400 italic"><AutoTranslate>No content</AutoTranslate></span>}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-600 mb-1"><AutoTranslate>Modified</AutoTranslate></div>
                  <div className="text-sm bg-white p-2 rounded border font-mono">
                    {diff.rightContent || <span className="text-gray-400 italic"><AutoTranslate>No content</AutoTranslate></span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const extractFileName = (fullPath) => {
    if (!fullPath) return "Unknown"
    const parts = fullPath.split('/')
    return parts[parts.length - 1] || "Unknown"
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="px-2">
      <h1 className="text-2xl mb-1 font-semibold">
        <AutoTranslate>Duplicate File</AutoTranslate>
      </h1>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        {popupMessage && (
          <Popup message={popupMessage.message} type={popupMessage.type} onClose={popupMessage.onClose} />
        )}

        {/* Search and Pagination Controls */}
        <div className="mb-4 bg-slate-100 p-4 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4">

  {/* Show items */}
  <div className="flex items-center bg-blue-500 rounded-lg w-full flex-1 md:w-1/3">
    <label htmlFor="itemsPerPage" className="mr-2 ml-2 text-white text-sm">
      <AutoTranslate>Show:</AutoTranslate>
    </label>
    <select
      id="itemsPerPage"
      className="border rounded-r-lg p-1.5 outline-none w-full"
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

  {/* Search */}
  <div className="flex items-center w-full md:w-1/3 flex-1">
    <input
      type="text"
      placeholder="Search duplicate files..."
      className="border rounded-l-md p-1 outline-none w-full"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
    />
    <MagnifyingGlassIcon className="text-white bg-blue-500 rounded-r-lg h-8 w-8 border p-1.5" />
  </div>

  {/* Export Button */}
  <div className="w-full md:w-auto flex justify-end">
    <button
      onClick={() => exportDuplicateReport(duplicateGroups)}
      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md shadow transition"
    >
      Export Report
    </button>
  </div>

</div>

        {/* Duplicate Groups List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="p-8 text-center"><LoadingComponent /></div>
          ) : paginatedDuplicates.length === 0 ? (
            <div className="text-center py-12">
              <DocumentDuplicateIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">
                {searchTerm
                  ? <AutoTranslate>No duplicates match your search</AutoTranslate>
                  : <AutoTranslate>No duplicate files found</AutoTranslate>}
              </p>
            </div>
          ) : (
            paginatedDuplicates.map((group) => (
              <div key={group.originalDocumentId} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Group Header */}
                <div
                  className="bg-gray-50 hover:bg-gray-100 px-4 py-3 cursor-pointer transition-colors border-b border-gray-200"
                  onClick={() => toggleGroup(group.originalDocumentId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {expandedStates[group.originalDocumentId]
                        ? <ChevronDownIcon className="h-5 w-5 text-gray-500 mr-3" />
                        : <ChevronRightIcon className="h-5 w-5 text-gray-500 mr-3" />}
                      <div className="flex items-center">
                        <CheckCircleIcon className="h-5 w-5 text-blue-600 mr-3" />
                        {getFileIcon(group.originalFileName)}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {extractFileName(group.originalFileName)}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center mt-0.5">
                          <FolderIcon className="h-3 w-3 mr-1" />
                          {group.originalFilePath}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className="text-xs text-gray-500 mr-4">
                        {group.duplicateFiles?.length || 0} duplicate(s)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Group Content - Expanded */}
                {expandedStates[group.originalDocumentId] && (
                  <div className="p-4 bg-white">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-sm font-medium text-gray-900">
                          <AutoTranslate>Duplicate Files</AutoTranslate>
                          <span className="ml-2 text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded">
                            {group.duplicateFiles?.length || 0} files
                          </span>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={areAllDuplicatesInGroupSelected(group.originalDocumentId)}
                            onChange={() => handleSelectAllInGroup(group.originalDocumentId)}
                            className="h-4 w-4 text-blue-600 mr-2"
                          />
                          <span className="text-xs text-gray-600"><AutoTranslate>Select All</AutoTranslate></span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {group.duplicateFiles?.map((file) => (
                          <div key={file.duplicateId} className="border border-gray-200 rounded p-3 hover:bg-gray-50">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start flex-1">
                                <input
                                  type="checkbox"
                                  checked={isDuplicateSelected(file.duplicateId)}
                                  onChange={() => handleSelectDuplicate(group.originalDocumentId, file.duplicateId)}
                                  className="h-4 w-4 text-blue-600 mt-1 mr-3"
                                />
                                {getFileIcon(file.duplicateFileName)}
                                <div className="ml-3 flex-1">
                                  <div className="text-sm font-medium text-gray-900">
                                    {extractFileName(file.duplicateFileName)}
                                  </div>
                                  <div className="flex items-center text-xs text-gray-500 mt-1">
                                    <ClockIcon className="h-3 w-3 mr-1" />
                                    {formatDate(file.createdOn)}
                                  </div>
                                  <div className="flex items-center mt-2">
                                    <span className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded mr-2">
                                      {getVersionText(file.version)}
                                    </span>
                                    <span className="text-xs text-gray-600">
                                      {getFileType(file.duplicateFileName)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2 ml-4">
                                <button
                                  onClick={() => handleDownloadFile(file.duplicateFilePath, file.duplicateFileName)}
                                  className="text-green-600 hover:text-green-800 p-1.5 hover:bg-green-50 rounded border border-green-200"
                                  title="Download"
                                >
                                  <ArrowDownTrayIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleCompareWithDuplicate(group, file.duplicateId)}
                                  className="text-blue-600 hover:text-blue-800 p-1.5 hover:bg-blue-50 rounded border border-blue-200"
                                  title="Compare"
                                >
                                  <ArrowsRightLeftIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteDuplicate(group.originalDocumentId, file.duplicateId)}
                                  className="text-red-600 hover:text-red-800 p-1.5 hover:bg-red-50 rounded border border-red-200"
                                  title="Delete"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 0 && (
          <div className="flex items-center mt-4">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1 || totalPages === 0}
              className={`px-3 py-1 rounded mr-3 ${currentPage === 1 || totalPages === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"}`}
            >
              <ArrowLeftIcon className="inline h-4 w-4 mr-2 mb-1" />
              <AutoTranslate>Previous</AutoTranslate>
            </button>

            {getPageNumbers().map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 rounded mx-1 ${currentPage === page ? "bg-blue-500 text-white" : "bg-slate-200 hover:bg-blue-100"}`}
              >
                {page}
              </button>
            ))}

            <span className="text-sm text-gray-700 mx-2">
              <AutoTranslate>of</AutoTranslate> {totalPages} <AutoTranslate>pages</AutoTranslate>
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className={`px-3 py-1 rounded ml-3 ${currentPage === totalPages || totalPages === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"}`}
            >
              <AutoTranslate>Next</AutoTranslate>
              <ArrowRightIcon className="inline h-4 w-4 ml-2 mb-1" />
            </button>

            <div className="ml-4">
              <span className="text-sm text-gray-700">
                {totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, totalItems)} / {totalItems}
              </span>
            </div>
          </div>
        )}

        {/* Bulk Actions Bar */}
        {selectedDuplicates.length > 0 && (
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white border border-gray-300 rounded-lg shadow-lg p-3 z-50">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-700">{selectedDuplicates.length} file(s) selected</span>
              <button
                onClick={handleCompareSelected}
                disabled={!isOnlyOneDuplicateSelected()}
                className={`text-sm flex items-center px-3 py-1.5 border rounded ${isOnlyOneDuplicateSelected()
                  ? "text-blue-600 hover:text-blue-800 border-blue-200 hover:bg-blue-50"
                  : "text-gray-400 border-gray-300 cursor-not-allowed"}`}
              >
                <ArrowsRightLeftIcon className="h-4 w-4 mr-1.5" />
                <AutoTranslate>Compare Selected</AutoTranslate>
              </button>
              <button
                onClick={handleDeleteSelected}
                className="text-red-600 hover:text-red-800 text-sm flex items-center px-3 py-1.5 border border-red-200 rounded hover:bg-red-50"
              >
                <TrashIcon className="h-4 w-4 mr-1.5" />
                <AutoTranslate>Delete Selected</AutoTranslate>
              </button>
              <button
                onClick={() => setSelectedDuplicates([])}
                className="text-gray-600 hover:text-gray-800 text-sm flex items-center px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50"
              >
                <XMarkIcon className="h-4 w-4 mr-1.5" />
                <AutoTranslate>Clear</AutoTranslate>
              </button>
            </div>
          </div>
        )}

        {/* Delete Confirmation Popup */}
        {showDeleteConfirm && itemToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-sm">
              <div className="p-5">
                <div className="flex items-center mb-4">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-500 mr-3" />
                  <h3 className="text-base font-semibold text-gray-900">
                    <AutoTranslate>Confirm Deletion</AutoTranslate>
                  </h3>
                </div>
                <div className="mb-5">
                  <p className="text-sm text-gray-700 mb-3">
                    {deleteType === "single"
                      ? <AutoTranslate>Delete this duplicate file?</AutoTranslate>
                      : deleteType === "group"
                        ? <span>Delete all {itemToDelete.count} duplicate files?</span>
                        : <span>Delete {itemToDelete.count} selected duplicate(s)?</span>}
                  </p>
                  {deleteType === "single" && (
                    <div className="bg-gray-50 border border-gray-200 rounded p-3">
                      <p className="text-sm font-medium text-gray-900 truncate">{itemToDelete.fileName}</p>
                    </div>
                  )}
                  {deleteType === "group" && (
                    <div className="bg-gray-50 border border-gray-200 rounded p-3">
                      <p className="text-sm font-medium text-gray-900 truncate">{itemToDelete.fileName}</p>
                      <p className="text-xs text-gray-600 mt-1">This will delete all {itemToDelete.count} duplicates</p>
                    </div>
                  )}
                  <p className="text-xs text-red-600 mt-3">
                    <AutoTranslate>This action cannot be undone.</AutoTranslate>
                  </p>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => { setShowDeleteConfirm(false); setItemToDelete(null) }}
                    className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    <AutoTranslate>Cancel</AutoTranslate>
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="px-4 py-2 text-sm text-white bg-red-600 rounded hover:bg-red-700"
                  >
                    <AutoTranslate>Delete</AutoTranslate>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ✅ FIXED COMPARISON MODAL — same inline style approach as FileCompare */}
        {showComparisonModal && comparisonResult && (
          <div
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 50, padding: '16px'
            }}
          >
            <div
              style={{
                background: 'white', borderRadius: '8px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                width: '100%', maxWidth: '1280px', height: '90vh',
                display: 'flex', flexDirection: 'column', overflow: 'hidden'
              }}
            >
              {/* Modal Header */}
              <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>
                    <AutoTranslate>File Compare</AutoTranslate>
                  </h2>
                  <button
                    onClick={closeComparisonModal}
                    style={{ padding: '4px', borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'transparent' }}
                    className="hover:bg-gray-100"
                  >
                    <XMarkIcon style={{ height: '24px', width: '24px', color: '#6b7280' }} />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb', flexShrink: 0 }}>
                <nav style={{ display: 'flex', padding: '0 16px' }}>
                  <button
                    onClick={() => setActiveTab("preview")}
                    style={{
                      padding: '10px 4px', marginRight: '24px', background: 'transparent',
                      border: 'none', borderBottom: activeTab === "preview" ? '2px solid #3b82f6' : '2px solid transparent',
                      color: activeTab === "preview" ? '#2563eb' : '#6b7280',
                      fontWeight: 500, fontSize: '14px', cursor: 'pointer'
                    }}
                  >
                    <AutoTranslate>File Preview</AutoTranslate>
                  </button>
                  <button
                    onClick={() => setActiveTab("differences")}
                    style={{
                      padding: '10px 4px', marginRight: '24px', background: 'transparent',
                      border: 'none', borderBottom: activeTab === "differences" ? '2px solid #3b82f6' : '2px solid transparent',
                      color: activeTab === "differences" ? '#2563eb' : '#6b7280',
                      fontWeight: 500, fontSize: '14px', cursor: 'pointer'
                    }}
                  >
                    <AutoTranslate>Differences</AutoTranslate> ({comparisonResult.differences?.length || 0})
                  </button>
                </nav>
              </div>

              {/* File name headers — only for preview tab */}
              {activeTab === "preview" && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: '#e5e7eb', flexShrink: 0 }}>
                  <div style={{ background: '#eff6ff', padding: '12px 16px', display: 'flex', alignItems: 'center' }}>
                    {getFileIcon(comparisonResult.leftFile.fileName)}
                    <div style={{ marginLeft: '8px' }}>
                      <div style={{ fontWeight: 500, fontSize: '14px', color: '#111827' }}>
                        {extractFileName(comparisonResult.leftFile.fileName)}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        Version: {comparisonResult.leftFile.version} | Type: {comparisonResult.leftFile.fileType}
                      </div>
                    </div>
                  </div>
                  <div style={{ background: '#eff6ff', padding: '12px 16px', display: 'flex', alignItems: 'center' }}>
                    {getFileIcon(comparisonResult.rightFile.fileName)}
                    <div style={{ marginLeft: '8px' }}>
                      <div style={{ fontWeight: 500, fontSize: '14px', color: '#111827' }}>
                        {extractFileName(comparisonResult.rightFile.fileName)}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        Version: {comparisonResult.rightFile.version} | Type: {comparisonResult.rightFile.fileType}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ✅ MAIN CONTENT — flex:1 + minHeight:0 is the critical fix */}
              <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                {activeTab === "preview" ? (
                  <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
                    {isLoadingFiles || isComparing ? (
                      <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                          <p className="text-gray-600">
                            <AutoTranslate>Loading file previews...</AutoTranslate>
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* LEFT PANEL */}
                        <div style={{
                          width: '50%', display: 'flex', flexDirection: 'column', minHeight: 0,
                          borderRight: '4px solid',
                          borderColor: comparisonResult.similarityPercentage === 100 ? '#4ade80'
                            : comparisonResult.similarityPercentage >= 80 ? '#facc15' : '#f87171'
                        }}>
                          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                            {renderFileViewer(fileUrls.firstFile, true, comparisonResult.leftFile.fileName)}
                          </div>
                        </div>

                        {/* RIGHT PANEL */}
                        <div style={{ width: '50%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                            {renderFileViewer(fileUrls.secondFile, false, comparisonResult.rightFile.fileName)}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : activeTab === "differences" ? (
                  renderDifferencesView()
                ) : null}
              </div>

              {/* Modal Footer */}
              <div style={{ padding: '12px 16px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <div style={{ fontSize: '14px' }}>
                      <span style={{ fontWeight: 500 }}>Status: </span>
                      <span style={{ color: comparisonResult.identical ? '#16a34a' : '#dc2626' }}>
                        {comparisonResult.message}
                      </span>
                    </div>
                    {!comparisonResult.identical && comparisonResult.differences?.length > 0 && (
                      <div style={{ fontSize: '14px' }}>
                        <span style={{ fontWeight: 500 }}>Differences: </span>
                        <span style={{ color: '#dc2626' }}>{comparisonResult.differences.length}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ width: '12px', height: '12px', background: '#f0fdf4', border: '2px solid #4ade80', marginRight: '4px' }}></div>
                      <span>Identical (100%)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ width: '12px', height: '12px', background: '#fefce8', border: '2px solid #facc15', marginRight: '4px' }}></div>
                      <span>Similar (80-99%)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ width: '12px', height: '12px', background: '#fef2f2', border: '2px solid #f87171', marginRight: '4px' }}></div>
                      <span>Different (&lt;80%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DuplicateFilesPage