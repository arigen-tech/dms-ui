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

import { DOCUMENTHEADER_API, API_HOST } from "../API/apiConfig"
import LoadingComponent from '../Components/LoadingComponent'
import Popup from '../Components/Popup'
import AutoTranslate from '../i18n/AutoTranslate'

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
  
  // New states for comparison functionality
  const [showComparisonModal, setShowComparisonModal] = useState(false)
  const [comparisonResult, setComparisonResult] = useState(null)
  const [isComparing, setIsComparing] = useState(false)
  const [fileUrls, setFileUrls] = useState({
    firstFile: null,
    secondFile: null,
  })
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [activeTab, setActiveTab] = useState("preview")
  
  // Pagination state
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [currentPage, setCurrentPage] = useState(1)

  const token = typeof window !== "undefined" ? localStorage.getItem(tokenKey) : null

  // Fetch duplicate documents
  const fetchDuplicateDocuments = async () => {
    setIsLoading(true)
    try {
      const response = await axios.get(`${DOCUMENTHEADER_API}/duplicates`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.data.status === 200) {
        const data = response.data.response || []
        setDuplicateGroups(data)

        // Initialize all groups as collapsed by default
        const expandedState = {}
        data.forEach(group => {
          expandedState[group.originalDocumentId] = false
        })
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

  useEffect(() => {
    fetchDuplicateDocuments()
  }, [])

  // Filter duplicates based on search
  const filteredDuplicates = useMemo(() => {
    if (!searchTerm.trim()) return duplicateGroups

    const searchLower = searchTerm.toLowerCase()
    return duplicateGroups.filter(group => {
      return (
        group.originalFileName?.toLowerCase().includes(searchLower) ||
        group.originalFilePath?.toLowerCase().includes(searchLower) ||
        group.duplicateFiles?.some(file =>
          file.duplicateFileName?.toLowerCase().includes(searchLower) ||
          file.duplicateFilePath?.toLowerCase().includes(searchLower)
        )
      )
    })
  }, [duplicateGroups, searchTerm])

  // Paginate the filtered results
  const totalItems = filteredDuplicates.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const paginatedDuplicates = filteredDuplicates.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Get page numbers for pagination
  const getPageNumbers = () => {
    const maxPageNumbers = 5
    const startPage = Math.floor((currentPage - 1) / maxPageNumbers) * maxPageNumbers + 1
    const endPage = Math.min(startPage + maxPageNumbers - 1, totalPages)
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i)
  }

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, itemsPerPage])

  // Show popup message
  const showPopup = (message, type = 'info') => {
    setPopupMessage({
      message,
      type,
      onClose: () => {
        setPopupMessage(null);
      }
    });
  };

  // Toggle group expansion
  const toggleGroup = (groupId) => {
    setExpandedStates(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }))
  }

  // Handle single duplicate selection - only one duplicate can be selected at a time
  const handleSelectDuplicate = (groupId, duplicateId) => {
    setSelectedDuplicates(prev => {
      // Remove all other duplicates from the same group
      const filtered = prev.filter(id => 
        !duplicateGroups.some(group => 
          group.duplicateFiles?.some(file => file.duplicateId === id && group.originalDocumentId === groupId)
        )
      )
      
      // If clicking the already selected duplicate, deselect it
      if (filtered.includes(duplicateId)) {
        return filtered.filter(id => id !== duplicateId)
      }
      
      // Otherwise, add the new duplicate
      return [...filtered, duplicateId]
    })
  }

  // Check if a duplicate is selected
  const isDuplicateSelected = (duplicateId) => {
    return selectedDuplicates.includes(duplicateId)
  }

  // Check if all duplicates in a group are selected
  const areAllDuplicatesInGroupSelected = (groupId) => {
    const group = duplicateGroups.find(g => g.originalDocumentId === groupId)
    if (!group || !group.duplicateFiles || group.duplicateFiles.length === 0) return false
    
    return group.duplicateFiles.every(file => 
      selectedDuplicates.includes(file.duplicateId)
    )
  }

  // Check if only one duplicate is selected (for compare button)
  const isOnlyOneDuplicateSelected = () => {
    return selectedDuplicates.length === 1
  }

  // Select all duplicates in a group
  const handleSelectAllInGroup = (groupId) => {
    const group = duplicateGroups.find(g => g.originalDocumentId === groupId)
    if (!group || !group.duplicateFiles) return

    const allDuplicateIds = group.duplicateFiles.map(file => file.duplicateId)

    setSelectedDuplicates(prev => {
      const alreadySelectedAll = areAllDuplicatesInGroupSelected(groupId)
      
      if (alreadySelectedAll) {
        // Deselect all duplicates from this group
        return prev.filter(id => !allDuplicateIds.includes(id))
      } else {
        // Select all duplicates from this group
        return [...new Set([...prev, ...allDuplicateIds])]
      }
    })
  }

  // Get file preview URL
  const getFilePreviewUrl = async (filePath) => {
    try {
      const pathParts = filePath.split('/')
      if (pathParts.length < 6) {
        return null
      }

      const [branch, department, year, category, version, ...fileNameParts] = pathParts
      const actualFileName = fileNameParts.join('/')

      const encodedCategory = encodeURIComponent(category)
      const encodedFileName = encodeURIComponent(actualFileName)

      const fileUrl = `${API_HOST}/api/documents/download/${branch}/${department}/${year}/${encodedCategory}/${version}/${encodedFileName}`

      const response = await axios.get(fileUrl, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      })

      const blob = new Blob([response.data], {
        type: response.headers["content-type"],
      })

      const url = URL.createObjectURL(blob)

      return { url, contentType: response.headers["content-type"] }
    } catch (error) {
      console.error("Error fetching file preview:", error)
      return null
    }
  }

  // Compare original with a single duplicate
  const handleCompareWithDuplicate = async (group, duplicateId) => {
    const duplicateFile = group.duplicateFiles?.find(f => f.duplicateId === duplicateId)
    if (!duplicateFile) return

    setIsComparing(true)
    setComparisonResult(null)
    setShowComparisonModal(true)
    setActiveTab("preview")

    try {
      const response = await axios.post(
        `${DOCUMENTHEADER_API}/compare`,
        { firstFileId: group.originalDocumentId, secondFileId: duplicateFile.duplicateId },
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } },
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

        const next = {
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
        }

        setComparisonResult(next)
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

  // Compare selected duplicates (for bulk action)
  const handleCompareSelected = async () => {
    if (selectedDuplicates.length === 0) {
      showPopup("Please select at least one duplicate file to compare", "error")
      return
    }

    if (selectedDuplicates.length > 1) {
      showPopup("Please select only ONE duplicate file to compare with the original", "error")
      return
    }

    // Find the group that contains the selected duplicate
    const duplicateId = selectedDuplicates[0]
    let targetGroup = null
    let selectedFile = null

    for (const group of duplicateGroups) {
      const foundFile = group.duplicateFiles?.find(file => file.duplicateId === duplicateId)
      if (foundFile) {
        targetGroup = group
        selectedFile = foundFile
        break
      }
    }

    if (!targetGroup || !selectedFile) {
      showPopup("Could not find selected file", "error")
      return
    }

    await handleCompareWithDuplicate(targetGroup, selectedFile.duplicateId)
  }

  // Delete single duplicate
  const handleDeleteDuplicate = (groupId, duplicateId) => {
    const group = duplicateGroups.find(g => g.originalDocumentId === groupId)
    if (!group) return

    const duplicateFile = group.duplicateFiles.find(f => f.duplicateId === duplicateId)
    if (!duplicateFile) return

    setDeleteType("single")
    setItemToDelete({
      groupId,
      duplicateId,
      fileName: duplicateFile.duplicateFileName,
      originalFileName: group.originalFileName
    })
    setShowDeleteConfirm(true)
  }

  // Delete all duplicates in a group
  const handleDeleteAllInGroup = (groupId) => {
    const group = duplicateGroups.find(g => g.originalDocumentId === groupId)
    if (!group) return

    setDeleteType("group")
    setItemToDelete({
      groupId,
      fileName: group.originalFileName,
      count: group.duplicateFiles?.length || 0
    })
    setShowDeleteConfirm(true)
  }

  // Delete selected duplicates (bulk action)
  const handleDeleteSelected = () => {
    if (selectedDuplicates.length === 0) {
      showPopup("Please select at least one duplicate file to delete", "error")
      return
    }

    setDeleteType("selected")
    setItemToDelete({
      selectedIds: [...selectedDuplicates],
      count: selectedDuplicates.length
    })
    setShowDeleteConfirm(true)
  }

  // Confirm and execute deletion
  const confirmDelete = async () => {
    try {
      if (deleteType === "single") {
        const response = await axios.delete(
          `${DOCUMENTHEADER_API}/duplicates/${itemToDelete.duplicateId}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        )

        if (response.data.status === 200) {
          showPopup(`Deleted duplicate: ${itemToDelete.fileName}`, "success")
          fetchDuplicateDocuments()
        } else {
          showPopup(`Failed to delete duplicate: ${response.data.message}`, "error")
        }
      } else if (deleteType === "group") {
        const response = await axios.delete(
          `${DOCUMENTHEADER_API}/duplicates/original/${itemToDelete.groupId}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        )

        if (response.data.status === 200) {
          showPopup(`Deleted ${itemToDelete.count} duplicate(s) for ${itemToDelete.fileName}`, "success")
          fetchDuplicateDocuments()
        } else {
          showPopup(`Failed to delete duplicates: ${response.data.message}`, "error")
        }
      } else if (deleteType === "selected") {
        const deletePromises = itemToDelete.selectedIds.map(duplicateId =>
          axios.delete(`${DOCUMENTHEADER_API}/duplicates/${duplicateId}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
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

  // Download file
  const handleDownloadFile = async (filePath, fileName) => {
    try {
      const pathParts = filePath.split('/')
      if (pathParts.length < 6) {
        showPopup("Invalid file path format", "error")
        return
      }

      const [branch, department, year, category, version, ...fileNameParts] = pathParts
      const actualFileName = fileNameParts.join('/')

      const encodedCategory = encodeURIComponent(category)
      const encodedFileName = encodeURIComponent(actualFileName)

      const fileUrl = `${API_HOST}/api/documents/download/${branch}/${department}/${year}/${encodedCategory}/${version}/${encodedFileName}`

      const response = await axios.get(fileUrl, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      })

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

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A"
    const date = new Date(timestamp)
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Get file icon based on type
  const getFileIcon = (fileName) => {
    if (!fileName) return <DocumentIcon className="h-5 w-5 text-gray-500" />

    const ext = fileName.split('.').pop()?.toLowerCase()

    if (['pdf'].includes(ext)) return <DocumentTextIcon className="h-5 w-5 text-red-500" />
    if (['doc', 'docx', 'txt', 'rtf'].includes(ext)) return <DocumentTextIcon className="h-5 w-5 text-blue-500" />
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(ext)) return <PhotoIcon className="h-5 w-5 text-green-500" />
    if (['xls', 'xlsx', 'csv'].includes(ext)) return <DocumentTextIcon className="h-5 w-5 text-green-600" />

    return <DocumentIcon className="h-5 w-5 text-gray-500" />
  }

  // Get file type text
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

  // Get version text for display
  const getVersionText = (version, isOriginal = false) => {
    if (isOriginal) {
      return "No version"
    }
    
    if (!version || version === "" || version === "null" || version === "undefined") {
      return "No version"
    }
    return `Version ${version}`
  }

  // Close comparison modal
  const closeComparisonModal = () => {
    setShowComparisonModal(false)
    setActiveTab("preview")

    if (fileUrls.firstFile?.url) URL.revokeObjectURL(fileUrls.firstFile.url)
    if (fileUrls.secondFile?.url) URL.revokeObjectURL(fileUrls.secondFile.url)

    setFileUrls({ firstFile: null, secondFile: null })
    setComparisonResult(null)
  }

  // Get difference color
  const getDifferenceColor = (similarityPercentage) => {
    if (similarityPercentage === 100) return "border-green-400 bg-green-50"
    if (similarityPercentage >= 80) return "border-yellow-400 bg-yellow-50"
    return "border-red-400 bg-red-50"
  }

  // Get difference type color
  const getDifferenceTypeColor = (type) => {
    switch (type) {
      case "ADDED":
        return "bg-green-100 border-green-400 text-green-800"
      case "DELETED":
        return "bg-red-100 border-red-400 text-red-800"
      case "MODIFIED":
        return "bg-yellow-100 border-yellow-400 text-yellow-800"
      default:
        return "bg-gray-100 border-gray-400 text-gray-800"
    }
  }

  // Render file viewer
  const renderFileViewer = (fileData, isFirst = true, fileName = "") => {
    if (!fileData || !fileData.url) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-50">
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
          className="w-full h-full"
          frameBorder={0}
          title={fileName}
        />
      )
    }
    else if (contentType.includes("image") || 
             ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(extension)) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-50">
          <img
            src={fileData.url || "/placeholder.svg"}
            alt={fileName}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )
    }
    else {
      return (
        <iframe
          src={fileData.url}
          className="w-full h-full"
          frameBorder="0"
          title={fileName}
        />
      )
    }
  }

  // Render differences view
  const renderDifferencesView = () => {
    if (!comparisonResult?.differences || comparisonResult.differences.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-700">
              <AutoTranslate>No differences found</AutoTranslate>
            </p>
            <p className="text-sm text-gray-500">
              <AutoTranslate>Files are identical</AutoTranslate>
            </p>
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
                  <div className="text-xs font-medium text-gray-600 mb-1">
                    <AutoTranslate>Original</AutoTranslate>
                  </div>
                  <div className="text-sm bg-white p-2 rounded border font-mono">
                    {diff.leftContent || <span className="text-gray-400 italic"><AutoTranslate>No content</AutoTranslate></span>}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-600 mb-1">
                    <AutoTranslate>Modified</AutoTranslate>
                  </div>
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

  // Extract file name from full path
  const extractFileName = (fullPath) => {
    if (!fullPath) return "Unknown"
    const parts = fullPath.split('/')
    return parts[parts.length - 1] || "Unknown"
  }

  return (
    <div className="px-2">
      <h1 className="text-2xl mb-1 font-semibold">
        <AutoTranslate>Duplicate File</AutoTranslate>
      </h1>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        {popupMessage && (
          <Popup
            message={popupMessage.message}
            type={popupMessage.type}
            onClose={popupMessage.onClose}
          />
        )}

        {/* Search and Pagination Controls */}
        <div className="mb-4 bg-slate-100 p-4 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center bg-blue-500 rounded-lg w-full flex-1 md:w-1/2">
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

          <div className="flex items-center w-full md:w-auto flex-1">
            <input
              type="text"
              placeholder="Search duplicate files..."
              className="border rounded-l-md p-1 outline-none w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <MagnifyingGlassIcon className="text-white bg-blue-500 rounded-r-lg h-8 w-8 border p-1.5" />
          </div>
        </div>

        {/* Duplicate Groups List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="p-8 text-center">
              <LoadingComponent />
            </div>
          ) : paginatedDuplicates.length === 0 ? (
            <div className="text-center py-12">
              <DocumentDuplicateIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">
                {searchTerm ? (
                  <AutoTranslate>No duplicates match your search</AutoTranslate>
                ) : (
                  <AutoTranslate>No duplicate files found</AutoTranslate>
                )}
              </p>
            </div>
          ) : (
            paginatedDuplicates.map((group) => (
              <div key={group.originalDocumentId} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Group Header - Collapsible */}
                <div
                  className="bg-gray-50 hover:bg-gray-100 px-4 py-3 cursor-pointer transition-colors border-b border-gray-200"
                  onClick={() => toggleGroup(group.originalDocumentId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {expandedStates[group.originalDocumentId] ? (
                        <ChevronDownIcon className="h-5 w-5 text-gray-500 mr-3" />
                      ) : (
                        <ChevronRightIcon className="h-5 w-5 text-gray-500 mr-3" />
                      )}

                      <div className="flex items-center">
                        {/* Original file - auto checked with checkmark icon */}
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
                      {/* <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteAllInGroup(group.originalDocumentId)
                        }}
                        className="text-red-500 hover:text-red-700 text-sm flex items-center px-3 py-1 border border-red-200 rounded hover:bg-red-50"
                      >
                        <TrashIcon className="h-3.5 w-3.5 mr-1.5" />
                        <AutoTranslate>Delete All</AutoTranslate>
                      </button> */}
                    </div>
                  </div>
                </div>

                {/* Group Content - Expanded */}
                {expandedStates[group.originalDocumentId] && (
                  <div className="p-4 bg-white">
                    {/* Duplicates Section */}
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
                          <span className="text-xs text-gray-600">
                            <AutoTranslate>Select All</AutoTranslate>
                          </span>
                        </div>
                      </div>

                      {/* Duplicates List */}
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
                                      {getVersionText(file.version, false)}
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
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1 || totalPages === 0}
              className={`px-3 py-1 rounded mr-3 ${currentPage === 1 || totalPages === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"
                }`}
            >
              <ArrowLeftIcon className="inline h-4 w-4 mr-2 mb-1" />
              <AutoTranslate>Previous</AutoTranslate>
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

            <span className="text-sm text-gray-700 mx-2">
              <AutoTranslate>of</AutoTranslate> {totalPages} <AutoTranslate>pages</AutoTranslate>
            </span>

            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className={`px-3 py-1 rounded ml-3 ${currentPage === totalPages || totalPages === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"
                }`}
            >
              <AutoTranslate>Next</AutoTranslate>
              <ArrowRightIcon className="inline h-4 w-4 ml-2 mb-1" />
            </button>

            <div className="ml-4">
              <span className="text-sm text-gray-700">
                <AutoTranslate>
                  {`Here are items ${totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to ${Math.min(currentPage * itemsPerPage, totalItems)} out of ${totalItems}`}
                </AutoTranslate>
              </span>
            </div>
          </div>
        )}

        {/* Bulk Actions Bar */}
        {selectedDuplicates.length > 0 && (
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white border border-gray-300 rounded-lg shadow-lg p-3 z-50">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-700">
                {selectedDuplicates.length} file(s) selected
              </span>
              <button
                onClick={handleCompareSelected}
                className={`text-sm flex items-center px-3 py-1.5 border rounded ${isOnlyOneDuplicateSelected() 
                  ? "text-blue-600 hover:text-blue-800 border-blue-200 hover:bg-blue-50" 
                  : "text-gray-400 border-gray-300 cursor-not-allowed"}`}
                disabled={!isOnlyOneDuplicateSelected()}
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
                    {deleteType === "single" ? (
                      <AutoTranslate>Delete this duplicate file?</AutoTranslate>
                    ) : deleteType === "group" ? (
                      <AutoTranslate>Delete all {itemToDelete.count} duplicate files?</AutoTranslate>
                    ) : (
                      <AutoTranslate>Delete {itemToDelete.count} selected duplicate(s)?</AutoTranslate>
                    )}
                  </p>
                  {deleteType === "single" && (
                    <div className="bg-gray-50 border border-gray-200 rounded p-3">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {itemToDelete.fileName}
                      </p>
                    </div>
                  )}
                  {deleteType === "group" && (
                    <div className="bg-gray-50 border border-gray-200 rounded p-3">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {itemToDelete.fileName}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        <AutoTranslate>This will delete all {itemToDelete.count} duplicates</AutoTranslate>
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-red-600 mt-3">
                    <AutoTranslate>This action cannot be undone.</AutoTranslate>
                  </p>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false)
                      setItemToDelete(null)
                    }}
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

        {/* Comparison Modal */}
        {showComparisonModal && comparisonResult && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-5/6 flex flex-col">
              <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                <div className="flex items-center space-x-4">
                  <h2 className="text-xl font-semibold">
                    <AutoTranslate>File Compare</AutoTranslate>
                  </h2>
                  <div className="flex items-center">
                    {/* {comparisonResult.identical ? (
                      <CheckCircleIcon className="h-6 w-6 text-green-500 mr-2" />
                    ) : (
                      <XCircleIcon className="h-6 w-6 text-red-500 mr-2" />
                    )} */}
                    {/* <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${comparisonResult.identical ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}
                    >
                      {comparisonResult.similarityPercentage?.toFixed(1) || "0.0"}% <AutoTranslate>Similar</AutoTranslate>
                    </span> */}
                  </div>
                </div>
                <button
                  onClick={closeComparisonModal}
                  className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="border-b bg-gray-50">
                <nav className="flex space-x-8 px-4">
                  <button
                    onClick={() => setActiveTab("preview")}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === "preview"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                  >
                    <AutoTranslate>File Preview</AutoTranslate>
                  </button>
                  {/* <button
                    onClick={() => setActiveTab("differences")}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === "differences"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                  >
                    <AutoTranslate>Difference</AutoTranslate> ({comparisonResult.differences?.length || 0})
                  </button> */}
                </nav>
              </div>

              {activeTab === "preview" && (
                <div className="grid grid-cols-2 gap-px bg-gray-200">
                  <div className="bg-blue-50 p-3 flex items-center justify-between">
                    <div className="flex items-center">
                      {getFileIcon(comparisonResult.leftFile.fileName)}
                      <div className="ml-2">
                        <h3 className="font-medium text-gray-800">{extractFileName(comparisonResult.leftFile.fileName)}</h3>
                        <p className="text-xs text-gray-600">
                          <AutoTranslate>Version:</AutoTranslate> {comparisonResult.leftFile.version} | <AutoTranslate>Type:</AutoTranslate> {comparisonResult.leftFile.fileType}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-blue-50 p-3 flex items-center justify-between">
                    <div className="flex items-center">
                      {getFileIcon(comparisonResult.rightFile.fileName)}
                      <div className="ml-2">
                        <h3 className="font-medium text-gray-800">{extractFileName(comparisonResult.rightFile.fileName)}</h3>
                        <p className="text-xs text-gray-600">
                          <AutoTranslate>Version:</AutoTranslate> {comparisonResult.rightFile.version} | <AutoTranslate>Type:</AutoTranslate> {comparisonResult.rightFile.fileType}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-hidden">
                {activeTab === "preview" ? (
                  <div className="h-full flex">
                    {isLoadingFiles ? (
                      <div className="w-full flex items-center justify-center">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                          <p className="text-gray-600">
                            <AutoTranslate>Loading file previews...</AutoTranslate>
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div
                          className={`w-1/2 border-r-4 ${getDifferenceColor(comparisonResult.similarityPercentage)}`}
                        >
                          <div className="h-full flex flex-col">
                            <div className="flex-1 overflow-auto">
                              {renderFileViewer(fileUrls.firstFile, true, comparisonResult.leftFile.fileName)}
                            </div>
                          </div>
                        </div>
                        <div className={`w-1/2 ${getDifferenceColor(comparisonResult.similarityPercentage)}`}>
                          <div className="h-full flex flex-col">
                            <div className="flex-1 overflow-auto">
                              {renderFileViewer(fileUrls.secondFile, false, comparisonResult.rightFile.fileName)}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : activeTab === "differences" ? (
                  renderDifferencesView()
                ) : null}
              </div>

              <div className="p-4 bg-gray-50 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    {/* <div className="text-sm">
                      <span className="font-medium">
                        <AutoTranslate>Status:</AutoTranslate>
                      </span>
                      <span className={`ml-1 ${comparisonResult.identical ? "text-green-600" : "text-red-600"}`}>
                        {comparisonResult.message}
                      </span>
                    </div> */}
                    {/* {!comparisonResult.identical && comparisonResult.differences && (
                      <div className="text-sm">
                        <span className="font-medium">
                          <AutoTranslate>Differences Found:</AutoTranslate>
                        </span>
                        <span className="ml-1 text-red-600">{comparisonResult.differences.length}</span>
                      </div>
                    )} */}
                    {/* {comparisonResult.comparisonResult?.summary && (
                      <div className="flex items-center space-x-4 text-sm">
                        {comparisonResult.comparisonResult.summary.totalLinesAdded > 0 && (
                          <div className="text-green-600">
                            +{comparisonResult.comparisonResult.summary.totalLinesAdded} <AutoTranslate>added</AutoTranslate>
                          </div>
                        )}
                        {comparisonResult.comparisonResult.summary.totalLinesDeleted > 0 && (
                          <div className="text-red-600">
                            -{comparisonResult.comparisonResult.summary.totalLinesDeleted} <AutoTranslate>deleted</AutoTranslate>
                          </div>
                        )}
                        {comparisonResult.comparisonResult.summary.totalLinesModified > 0 && (
                          <div className="text-yellow-600">
                            ~{comparisonResult.comparisonResult.summary.totalLinesModified} <AutoTranslate>modified</AutoTranslate>
                          </div>
                        )}
                      </div>
                    )} */}
                  </div>

                  {/* <div className="flex items-center space-x-4 text-xs">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-50 border-2 border-green-400 mr-1"></div>
                      <span><AutoTranslate>Identical (100%)</AutoTranslate></span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-yellow-50 border-2 border-yellow-400 mr-1"></div>
                      <span><AutoTranslate>Similar (80-99%)</AutoTranslate></span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-red-50 border-2 border-red-400 mr-1"></div>
                      <span><AutoTranslate>Different (&lt;80%)</AutoTranslate></span>
                    </div>
                  </div> */}
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