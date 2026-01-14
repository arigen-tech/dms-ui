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
} from "@heroicons/react/24/solid"
import axios from "axios"
import { useNavigate } from "react-router-dom"

import { DOCUMENTHEADER_API, API_HOST } from "../API/apiConfig"
import LoadingComponent from '../Components/LoadingComponent'
import Popup from '../Components/Popup'
import AutoTranslate from '../i18n/AutoTranslate'

const tokenKey = "tokenKey"

const DuplicateFilesPage = () => {
  const navigate = useNavigate()
  const [duplicateGroups, setDuplicateGroups] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [popupMessage, setPopupMessage] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDuplicates, setSelectedDuplicates] = useState([])
  const [expandedGroups, setExpandedGroups] = useState({})
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteType, setDeleteType] = useState("")
  const [itemToDelete, setItemToDelete] = useState(null)
  
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
        setExpandedGroups(expandedState)
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
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }))
  }

  // Handle single duplicate selection
  const handleSelectDuplicate = (duplicateId) => {
    setSelectedDuplicates(prev => {
      if (prev.includes(duplicateId)) {
        return prev.filter(id => id !== duplicateId)
      } else {
        return [...prev, duplicateId]
      }
    })
  }

  // Select all duplicates in a group
  const handleSelectAllInGroup = (groupId) => {
    const group = duplicateGroups.find(g => g.originalDocumentId === groupId)
    if (!group || !group.duplicateFiles) return

    const allDuplicateIds = group.duplicateFiles.map(file => file.duplicateId)

    setSelectedDuplicates(prev => {
      const alreadySelected = allDuplicateIds.every(id => prev.includes(id))
      if (alreadySelected) {
        return prev.filter(id => !allDuplicateIds.includes(id))
      } else {
        return [...prev, ...allDuplicateIds]
      }
    })
  }

  // Compare all duplicates in a group
  const handleCompareAllInGroup = (groupId) => {
    const group = duplicateGroups.find(g => g.originalDocumentId === groupId)

    if (!group || !group.duplicateFiles || group.duplicateFiles.length === 0) {
      return
    }

    const navigationState = {
      preselectedGroup: {
        originalDetailId: group.originalDocumentId,
        originalFileName: group.originalFileName,
        duplicateFiles: group.duplicateFiles.map(file => ({
          duplicateDetailId: file.duplicateId,
          duplicateFileName: file.duplicateFileName
        }))
      }
    }

    navigate('/FileCompare', { replace: false, state: navigationState })
  }

  // Compare selected duplicates (for bulk action)
  const handleCompareSelected = () => {
    if (selectedDuplicates.length === 0) {
      showPopup("Please select at least one duplicate file to compare", "error")
      return
    }

    // Find the group that contains the first selected duplicate
    const firstSelectedId = selectedDuplicates[0]
    let targetGroup = null
    let selectedFilesInGroup = []

    for (const group of duplicateGroups) {
      const foundFile = group.duplicateFiles?.find(file => file.duplicateId === firstSelectedId)
      if (foundFile) {
        targetGroup = group
        // Filter only the selected files that belong to this group
        selectedFilesInGroup = group.duplicateFiles.filter(file =>
          selectedDuplicates.includes(file.duplicateId)
        )
        break
      }
    }

    if (!targetGroup || selectedFilesInGroup.length === 0) {
      showPopup("Could not find selected files in the same group", "error")
      return
    }

    const navigationState = {
      preselectedGroup: {
        originalDetailId: targetGroup.originalDocumentId,
        originalFileName: targetGroup.originalFileName,
        duplicateFiles: selectedFilesInGroup.map(file => ({
          duplicateDetailId: file.duplicateId,
          duplicateFileName: file.duplicateFileName
        }))
      }
    }

    navigate('/FileCompare', { replace: false, state: navigationState })
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

  return (
    <div className="px-2">
      <h1 className="text-2xl mb-1 font-semibold">
        <AutoTranslate>Duplicate Files</AutoTranslate>
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
                      {expandedGroups[group.originalDocumentId] ? (
                        <ChevronDownIcon className="h-5 w-5 text-gray-500 mr-3" />
                      ) : (
                        <ChevronRightIcon className="h-5 w-5 text-gray-500 mr-3" />
                      )}

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={group.duplicateFiles?.every(file =>
                            selectedDuplicates.includes(file.duplicateId)
                          )}
                          onChange={(e) => {
                            e.stopPropagation()
                            handleSelectAllInGroup(group.originalDocumentId)
                          }}
                          className="h-4 w-4 text-blue-600 mr-3"
                        />
                        {getFileIcon(group.originalFileName)}
                      </div>

                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {group.originalFileName}
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteAllInGroup(group.originalDocumentId)
                        }}
                        className="text-red-500 hover:text-red-700 text-sm flex items-center px-3 py-1 border border-red-200 rounded hover:bg-red-50"
                      >
                        <TrashIcon className="h-3.5 w-3.5 mr-1.5" />
                        <AutoTranslate>Delete All</AutoTranslate>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Group Content - Expanded */}
                {expandedGroups[group.originalDocumentId] && (
                  <div className="p-4 bg-white">
                    {/* Original File Section */}
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="bg-white p-2 rounded border border-blue-200 mr-3">
                            {getFileIcon(group.originalFileName)}
                          </div>
                          <div>
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-blue-700">
                                <AutoTranslate>Original File</AutoTranslate>
                              </span>
                              <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                <AutoTranslate>Safe</AutoTranslate>
                              </span>
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              {getFileType(group.originalFileName)} • {group.version ? `Version ${group.version}` : 'No version'}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDownloadFile(group.originalFilePath, group.originalFileName)}
                          className="text-blue-600 hover:text-blue-800 text-sm flex items-center px-3 py-1.5 border border-blue-200 rounded hover:bg-blue-50"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4 mr-1.5" />
                          <AutoTranslate>Download</AutoTranslate>
                        </button>
                      </div>
                    </div>

                    {/* Duplicates Section */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-sm font-medium text-gray-900">
                          <AutoTranslate>Duplicate Files</AutoTranslate>
                          <span className="ml-2 text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded">
                            {group.duplicateFiles?.length || 0} files
                          </span>
                        </div>
                        <button
                          onClick={() => handleCompareAllInGroup(group.originalDocumentId)}
                          className="text-blue-600 hover:text-blue-800 text-sm flex items-center px-3 py-1.5 border border-blue-200 rounded hover:bg-blue-50"
                        >
                          <ArrowsRightLeftIcon className="h-4 w-4 mr-1.5" />
                          <AutoTranslate>Compare All</AutoTranslate>
                        </button>
                      </div>

                      {/* Duplicates List */}
                      <div className="space-y-3">
                        {group.duplicateFiles?.map((file) => (
                          <div key={file.duplicateId} className="border border-gray-200 rounded p-3 hover:bg-gray-50">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start flex-1">
                                <input
                                  type="checkbox"
                                  checked={selectedDuplicates.includes(file.duplicateId)}
                                  onChange={() => handleSelectDuplicate(file.duplicateId)}
                                  className="h-4 w-4 text-blue-600 mt-1 mr-3"
                                />
                                {getFileIcon(file.duplicateFileName)}
                                <div className="ml-3 flex-1">
                                  <div className="text-sm font-medium text-gray-900">
                                    {file.duplicateFileName}
                                  </div>
                                  <div className="flex items-center text-xs text-gray-500 mt-1">
                                    <ClockIcon className="h-3 w-3 mr-1" />
                                    {formatDate(file.createdOn)}
                                  </div>
                                  <div className="flex items-center mt-2">
                                    <span className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded mr-2">
                                      Version {file.version}
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
                className="text-blue-600 hover:text-blue-800 text-sm flex items-center px-3 py-1.5 border border-blue-200 rounded hover:bg-blue-50"
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
      </div>
    </div>
  )
}

export default DuplicateFilesPage