"use client"

import React, { useState, useEffect } from "react"
import axios from "axios"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"

import {
  CalendarIcon, MagnifyingGlassIcon, ArrowLeftIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline"

import { API_HOST } from "../API/apiConfig"
import { FILETYPE_API } from "../API/apiConfig"

// Make sure these components are properly exported
import Popup from "../Components/Popup"
import RetentionCheckAlert from "../Components/RetentionCheckAlert"
import LoadingComponent from "../Components/LoadingComponent"

const ArchiveDownload = () => {
  const [fromDate, setFromDate] = useState(null)
  const [toDate, setToDate] = useState(null)
  const initialFormData = {
    branchId: "",
    departmentId: "",
    startDate: null,
    endDate: null,
    fileTypes: [],
  }
  const [archiveCriteria, setArchiveCriteria] = React.useState(initialFormData)
  let [userRole, setUserRole] = useState(null)
  const [branchOptions, setBranchOptions] = useState([])
  const [departmentOptions, setDepartmentOptions] = useState([])
  const [popupMessage, setPopupMessage] = useState(null)
  const [userBranch, setUserBranch] = useState(null)
  const [userDepartment, setUserDepartment] = useState(null)
  const [isLoading, setIsLoading] = useState(false)


  const [fileTypes, setFileTypes] = useState([])
  const [selectedFileTypes, setSelectedFileTypes] = useState([])

  // File type dropdown states
  const [showFileTypeDropdown, setShowFileTypeDropdown] = useState(false)
  const [selectAllFileTypes, setSelectAllFileTypes] = useState(false)

  // Enhanced state for archive management
  const [archivedFileStatus, setArchivedFileStatus] = useState([])
  const [filteredArchivedFiles, setFilteredArchivedFiles] = useState([])
  const [isRetrievingArchived, setIsRetrievingArchived] = useState(false)
  const [retrievingId, setRetrievingId] = useState(null)
  const [activeTab, setActiveTab] = useState("all")

  // Retention Check state (NO file type filtering)
  const [runCheckLoading, setRunCheckLoading] = useState(false)
  const [retentionAlert, setRetentionAlert] = useState({
    show: false,
    result: null,
  })

  // Pagination state (removed search functionality)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)

  // Progress bar state
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [storeProgress, setStoreProgress] = useState(0)
  const [showProgress, setShowProgress] = useState(false)
  const [progressType, setProgressType] = useState("")
  const [progressMessage, setProgressMessage] = useState("")

  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchUserDetails()
    fetchBranches()
    fetchFileTypes()
    fetchArchivedFileStatus()
  }, [])

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  // Update selectAll states
  useEffect(() => {
    setSelectAllFileTypes(selectedFileTypes.length === fileTypes.length && fileTypes.length > 0)
  }, [selectedFileTypes, fileTypes])

  // Filter archived files based on criteria - FIXED: Admin sees all data, no file type filtering when none selected
  useEffect(() => {
    filterArchivedFiles()
  }, [archivedFileStatus, archiveCriteria, selectedFileTypes, fromDate, toDate])

  const filterArchivedFiles = () => {
    let filtered = getFilteredDataByRole(archivedFileStatus)

    // FIXED: Admin sees ALL data - no branch filtering for Admin
    if (userRole !== "ADMIN") {
      // Apply branch filter only for non-Admin users
      if (archiveCriteria.branchId && archiveCriteria.branchId !== "all") {
        filtered = filtered.filter(
          (file) =>
            file.branchId === Number.parseInt(archiveCriteria.branchId) ||
            file.branch?.id === Number.parseInt(archiveCriteria.branchId),
        )
      }

      // Apply department filter only for non-Admin users
      if (archiveCriteria.departmentId && archiveCriteria.departmentId !== "all") {
        filtered = filtered.filter(
          (file) =>
            file.departmentId === Number.parseInt(archiveCriteria.departmentId) ||
            file.department?.id === Number.parseInt(archiveCriteria.departmentId),
        )
      }

      // Apply file type filter only for non-Admin users
      if (selectedFileTypes.length > 0) {
        filtered = filtered.filter((file) => {
          if (!file.fileName) return false
          const fileExtension = file.fileName.split(".").pop()?.toLowerCase()
          return selectedFileTypes.some((selectedType) => selectedType.toLowerCase() === fileExtension)
        })
      }
    }
    // For Admin: No branch, department, or file type filtering - they see everything

    // Apply date range filter (this applies to all users including Admin)
    if (fromDate || toDate) {
      filtered = filtered.filter((file) => {
        if (!file.archiveDate) return false

        let fileDate
        if (Array.isArray(file.archiveDate) && file.archiveDate.length >= 3) {
          const [year, month, day] = file.archiveDate
          fileDate = new Date(year, month - 1, day)
        } else {
          fileDate = new Date(file.archiveDate)
        }

        if (fromDate && fileDate < fromDate) return false
        if (toDate && fileDate > toDate) return false
        return true
      })
    }

    setFilteredArchivedFiles(filtered)
  }

  // FIXED: Validation function - Admin doesn't need file types or branch selection
  const validateInputs = () => {
    const errors = []

    // All users (including Admin) must select file types
    if (selectedFileTypes.length === 0) {
      errors.push("Please select at least one file type")
    }

    // Non-Admin users need branch selection
    if (userRole !== "ADMIN" && !archiveCriteria.branchId) {
      errors.push("Please select a branch")
    }

    return errors
  }

  const fetchFileTypes = async () => {
    try {
      const token = localStorage.getItem("tokenKey")
      const response = await axios.get(`${FILETYPE_API}/getAllActive`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setFileTypes(response.data.response)
    } catch (error) {
      console.error("Error fetching Files Types:", error)
      showPopup("Failed to fetch file types", "error")
    }
  }

  const fetchArchivedFileStatus = async () => {
    try {
      const token = localStorage.getItem("tokenKey")
      const response = await axios.get(`${API_HOST}/archive-reference/all`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.data && response.data.response) {
        setArchivedFileStatus(response.data.response)
      } else {
        setArchivedFileStatus([])
        console.warn("Unexpected response format from archive status API:", response.data)
      }
    } catch (error) {
      console.error("Error fetching archived file status:", error)
      showPopup("Failed to fetch archived file status", "error")
      setArchivedFileStatus([])
    }
  }

  // Policy Status Check (NO file type filtering - processes ALL files)
  const handleRunRetentionCheck = async () => {
    setRunCheckLoading(true);
    try {
      const token = localStorage.getItem("tokenKey");
      const response = await axios.post(
        `${API_HOST}/retention-policy/run-check`,
        {}, 
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Transform the API response to match what RetentionCheckAlert expects
      const apiResponse = response.data.response || {};

      // Convert policyResults object to array if needed
      const policyResults = {};
      if (apiResponse.policyResults) {
        Object.entries(apiResponse.policyResults).forEach(([key, policy]) => {
          policyResults[key] = {
            ...policy,
            policyName: `Policy ${key}`,
            movedCount: policy.movedDocuments?.length || 0,
            notEligibleCount: policy.notEligibleYet?.length || 0,
            totalDocumentsForPolicy: (policy.movedDocuments?.length || 0) + (policy.notEligibleYet?.length || 0)
          };
        });
      }

      // Convert timestamp to Date object
      const timestamp = apiResponse.timestamp
        ? new Date(apiResponse.timestamp)
        : new Date();

      const result = {
        success: apiResponse.success !== false,
        error: apiResponse.error || null,
        processedCount: apiResponse.processedCount || 0,
        processedDocuments: apiResponse.processedDocuments || [],
        documentsWithPolicies: apiResponse.documentsWithPolicies || 0,
        documentsWithoutPolicies: apiResponse.documentsWithoutPolicies || 0,
        missingDocuments: apiResponse.missingDocuments || [],
        errors: apiResponse.errors || [],
        policyResults: policyResults,
        manualTrigger: apiResponse.manualTrigger || true,
        timestamp: timestamp.toISOString()
      };

      setRetentionAlert({
        show: true,
        result: result
      });

      fetchArchivedFileStatus(); // Refresh the archive status
    } catch (error) {
      console.error("Error running retention policy check:", error);

      const errorMessage = error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Failed to run policy status check";

      setRetentionAlert({
        show: true,
        result: {
          error: errorMessage,
          success: false,
          processedCount: 0,
          processedDocuments: [],
          documentsWithPolicies: 0,
          documentsWithoutPolicies: 0,
          missingDocuments: [],
          errors: [errorMessage],
          policyResults: {},
          manualTrigger: true,
          timestamp: new Date().toISOString()
        },
      });
    } finally {
      setRunCheckLoading(false);
    }
  };

  const handleRetrieveArchived = async (archiveName) => {
    setIsRetrievingArchived(true);
    setRetrievingId(archiveName);

    try {
      const token = localStorage.getItem("tokenKey");
      const encodedName = encodeURIComponent(archiveName);
      const response = await axios.get(`${API_HOST}/archive/retrieve/${encodedName}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });

      let filename = archiveName;
      const contentDisposition = response.headers["content-disposition"];
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match?.[1]) filename = match[1];
      }

      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showPopup("Data Retrieve successfully", "success");
    } catch (error) {
      let errorMessage = "Failed to Download";
      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          errorMessage = JSON.parse(text)?.message || errorMessage;
        } catch {
          errorMessage = "Archive not found or corrupted";
        }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      showPopup(errorMessage, "error");
    } finally {
      setIsRetrievingArchived(false);
      setRetrievingId(null);
    }
  };



  // FIXED: Close dropdown when file type is selected
  const handleFileTypeChange = (filetype) => {
    // Get all extensions for this filetype
    const extensionsForType = fileTypes.filter((ft) => ft.filetype === filetype).map((ft) => ft.extension)

    const isSelected = extensionsForType.every((ext) => selectedFileTypes.includes(ext))

    if (isSelected) {
      // Remove all extensions for this filetype
      setSelectedFileTypes((prev) => prev.filter((ext) => !extensionsForType.includes(ext)))
    } else {
      // Add all extensions for this filetype
      setSelectedFileTypes((prev) => [...new Set([...prev, ...extensionsForType])])
    }

    // Close dropdown after selection
    setTimeout(() => {
      setShowFileTypeDropdown(false)
    }, 100)
  }

  const handleSelectAllFileTypes = () => {
    if (selectAllFileTypes) {
      setSelectedFileTypes([])
    } else {
      setSelectedFileTypes(fileTypes.map((ft) => ft.extension))
    }

    // Close dropdown after selection
    setTimeout(() => {
      setShowFileTypeDropdown(false)
    }, 100)
  }

  const fetchUserDetails = async () => {

    try {
      const userId = localStorage.getItem("userId")
      const token = localStorage.getItem("tokenKey")
      const response = await axios.get(`${API_HOST}/employee/findById/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      setUserRole(response.data.role)
      setUserBranch(response.data.branch)
      setUserDepartment(response.data.department)

      // For Admin, don't set default branch/department
      if (response.data.role !== "ADMIN") {
        setArchiveCriteria((prev) => ({
          ...prev,
          branchId: response.data.branch?.id || "",
          departmentId: response.data.department?.id || "",
        }))
      }

      if (response.data.branch?.id) {
        fetchDepartments(response.data.branch.id)
      }
    } catch (error) {
      console.error("Error fetching user details:", error)
      showPopup("Failed to fetch user details", "error")
    }
  }

  // FIXED: Admin role filtering - Admin sees ALL data
  const getFilteredDataByRole = (data) => {
    if (!data || !Array.isArray(data)) return []

    const normalizedRole = userRole?.toUpperCase().replace(/_/g, " ")

    switch (normalizedRole) {
      case "ADMIN":
        // Admin sees ALL data from ALL branches and departments - no filtering whatsoever
        return data

      case "BRANCH ADMIN":
        return data.filter(
          (file) =>
            file.branchId === userBranch?.id ||
            file.branchName === userBranch?.name ||
            file.branch?.id === userBranch?.id,
        )

      case "DEPARTMENT ADMIN":
        return data.filter(
          (file) =>
            file.departmentId === userDepartment?.id ||
            file.departmentName === userDepartment?.name ||
            file.department?.id === userDepartment?.id,
        )

      default:
        return []
    }
  }

  useEffect(() => {
    setArchiveCriteria((prev) => ({
      ...prev,
      branch: userBranch?.id || "",
      branchName: userBranch?.name || "",
      department: userDepartment?.id || "",
      departmentName: userDepartment?.name || "",
    }))
  }, [userBranch, userDepartment])

  useEffect(() => {
    if (userRole === "BRANCH ADMIN" && userBranch?.id) {
      setArchiveCriteria((prev) => ({
        ...prev,
        branch: userBranch.id,
      }))
      fetchDepartments(userBranch.id)
    }
  }, [userRole, userBranch])

  useEffect(() => {
    if (userRole === "DEPARTMENT ADMIN" || userRole === "USER") {
      if (userBranch?.id) {
        setArchiveCriteria((prev) => ({
          ...prev,
          branch: userBranch.id,
          department: userDepartment?.id || "",
        }))
        fetchDepartments(userBranch.id)
      }
    }
  }, [userRole, userBranch, userDepartment])

  useEffect(() => {
    if (archiveCriteria.branchId && archiveCriteria.branchId !== "all") {
      fetchDepartments(archiveCriteria.branchId)
    } else {
      setDepartmentOptions([])
      setArchiveCriteria((prev) => ({ ...prev, departmentId: "" }))
    }
  }, [archiveCriteria.branchId])

  const groupArchivesByName = (archives) => {
    const grouped = {};

    archives.forEach(archive => {
      // If name is null, treat each as separate entry using id as key
      if (archive.name === null) {
        const uniqueKey = `single_${archive.id}`;
        grouped[uniqueKey] = {
          ...archive,
          fileCount: 1,
          totalSize: archive.fileSize,
          fileNames: [archive.fileName],
          displayName: "N/A"  // This will be shown in the table
        };
      }
      // If name exists, group by name
      else {
        if (!grouped[archive.name]) {
          grouped[archive.name] = {
            ...archive,
            fileCount: 1,
            totalSize: archive.fileSize,
            fileNames: [archive.fileName],
            displayName: archive.name
          };
        } else {
          grouped[archive.name].fileCount += 1;
          grouped[archive.name].totalSize += archive.fileSize;
          grouped[archive.name].fileNames.push(archive.fileName);
        }
      }
    });

    return Object.values(grouped);
  };

  const fetchBranches = async () => {
    try {
      const token = localStorage.getItem("tokenKey")
      const response = await axios.get(`${API_HOST}/branchmaster/findAll`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setBranchOptions(response.data)
    } catch (error) {
      console.error("Error fetching branches:", error)
      showPopup("Failed to fetch branches", "error")
    }
  }

  const fetchDepartments = async (branchId) => {
    try {
      const token = localStorage.getItem("tokenKey")
      const response = await axios.get(`${API_HOST}/DepartmentMaster/findByBranch/${branchId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setDepartmentOptions(response.data)
    } catch (error) {
      console.error("Error fetching departments:", error)
      showPopup("Failed to fetch departments", "error")
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setArchiveCriteria((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "branchId" && { departmentId: "" }),
    }))
  }

  const handleDownload = async () => {
    const validationErrors = validateInputs()
    if (validationErrors.length > 0) {
      showPopup(`\n${validationErrors.join("\n")}`, "warning")
      return
    }

    setIsLoading(true)
    setShowProgress(true)
    setProgressType("download")
    setDownloadProgress(0)
    setProgressMessage("Starting download...")

    try {
      const token = localStorage.getItem("tokenKey")
      const params = new URLSearchParams()

      // Check if all branches selected
      const isAllBranches = archiveCriteria.branchId === "all"
      const apiEndpoint = isAllBranches ? `${API_HOST}/archive/download/all` : `${API_HOST}/archive/download`

      if (!isAllBranches && archiveCriteria.branchId) {
        params.append("branchId", archiveCriteria.branchId)
      }

      if (userRole) {
        params.append("userRole", userRole)
      }

      if (archiveCriteria.departmentId && archiveCriteria.departmentId !== "all") {
        params.append("departmentId", archiveCriteria.departmentId)
      }

      if (fromDate) {
        const formattedFromDate = fromDate.toISOString().split("T")[0]
        params.append("fromDate", formattedFromDate)
      }

      if (toDate) {
        const formattedToDate = toDate.toISOString().split("T")[0]
        params.append("toDate", formattedToDate)
      }

      // Only add file types if they are selected
      if (selectedFileTypes.length > 0) {
        selectedFileTypes.forEach((fileType) => {
          params.append("fileTypes", fileType)
        })
      }

      const response = await axios.get(apiEndpoint, {
        params: params,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: "blob",
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.lengthComputable) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            setDownloadProgress(percentCompleted)
            setProgressMessage(`Downloading... ${percentCompleted}%`)
          } else {
            setProgressMessage("Downloading files...")
          }
        },
      })

      setDownloadProgress(100)
      setProgressMessage("Preparing download...")

      const blob = new Blob([response.data], { type: "application/zip" })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      const fileName = isAllBranches
        ? `all_archives_${new Date().toISOString().split("T")[0]}.zip`
        : `archive_${new Date().toISOString().split("T")[0]}.zip`
      link.setAttribute("download", fileName)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      setTimeout(() => {
        setShowProgress(false)
        showPopup("Data Downloaded Successfully! ", "success")
      }, 500)
    } catch (error) {
      setShowProgress(false)
      console.error("Error downloading archive:", error)
      showPopup("Failed to Download ", "error")
    } finally {
      setIsLoading(false)
    }
  }

  const handleStoreArchive = async () => {
    const validationErrors = validateInputs()
    if (validationErrors.length > 0) {
      showPopup(`\n${validationErrors.join("\n")}`, "warning")
      return
    }

    setIsLoading(true)
    setShowProgress(true)
    setProgressType("store")
    setStoreProgress(0)
    setProgressMessage("Preparing to Archive...")

    let progressInterval;

    try {
      const token = localStorage.getItem("tokenKey")
      const params = new URLSearchParams()

      // Check if all branches selected
      const isAllBranches = archiveCriteria.branchId === "all"

      if (isAllBranches) {
        params.append("allDataRequest", "true")
      } else if (archiveCriteria.branchId) {
        params.append("branchId", archiveCriteria.branchId)
      }

      if (userRole) {
        params.append("userRole", userRole)
      }

      if (archiveCriteria.departmentId && archiveCriteria.departmentId !== "all") {
        params.append("departmentId", archiveCriteria.departmentId)
      }

      if (fromDate) {
        const formattedFromDate = fromDate.toISOString().split("T")[0]
        params.append("fromDate", formattedFromDate)
      }

      if (toDate) {
        const formattedToDate = toDate.toISOString().split("T")[0]
        params.append("toDate", formattedToDate)
      }

      // Only add file types if they are selected
      if (selectedFileTypes.length > 0) {
        selectedFileTypes.forEach((fileType) => {
          params.append("fileTypes", fileType)
        })
      }

      // Start progress simulation
      progressInterval = setInterval(() => {
        setStoreProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + Math.random() * 12
        })
      }, 250)

      setProgressMessage("Storing archive to server...")

      const response = await axios.post(`${API_HOST}/archive/store`, params, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      })

      // Clear interval and complete progress
      if (progressInterval) {
        clearInterval(progressInterval)
      }
      setStoreProgress(100)
      setProgressMessage("Data Archived Successfully!")

      setTimeout(() => {
        setShowProgress(false)
        // Reset progress only after hiding the progress bar
        setStoreProgress(0)
        if (response.data && response.data.success) {
          if (!response.data.response) {
            showPopup("No new documents found for archival. All matching files may have already been archived.", "info");
          } else {
            showPopup("Data Archived successfully!", "success");
          }
        } else {
          showPopup(response.data?.message || "Failed to archive", "error");
        }

      }, 1000)
    } catch (error) {
      if (progressInterval) {
        clearInterval(progressInterval)
      }
      setShowProgress(false)
      setStoreProgress(0) // Reset progress on error
      console.error("Error storing archive:", error)
      showPopup("Failed to Archive ", "error")
    } finally {
      setIsLoading(false)
      // Don't reset progress here - let it reset in the success timeout or error handling
    }
  }

  const showPopup = (message, type = "info") => {
    setPopupMessage({ message, type })
  }

  const formatArchiveDate = (archiveDate) => {
    if (!archiveDate) return "-"

    if (Array.isArray(archiveDate) && archiveDate.length >= 6) {
      const [year, month, day, hour, minute, second] = archiveDate
      const date = new Date(year, month - 1, day, hour, minute, second)
      return date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    }

    try {
      return new Date(archiveDate).toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch (error) {
      return "-"
    }
  }

  const getPageNumbers = (totalPages, currentPage) => {
    const maxPageNumbers = 5; // Number of page buttons to show
    const startPage = Math.floor((currentPage - 1) / maxPageNumbers) * maxPageNumbers + 1;
    const endPage = Math.min(startPage + maxPageNumbers - 1, totalPages);

    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  };


  const CustomInput = React.forwardRef(({ value, onClick, placeholder, disabled }, ref) => (
    <div className="relative">
      <input
        type="text"
        ref={ref}
        onClick={onClick}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        readOnly
        className="block w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm pl-10 cursor-pointer"
      />
      {/* Fallback calendar icon if CalendarIcon is not available */}
      {CalendarIcon ? (
        <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 pointer-events-none" />
      ) : (
        <svg
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      )}
    </div>
  ))

  const commonInputClasses =
    "block w-full h-[46px] px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
  const commonLabelClasses = "block text-md font-medium text-gray-700 mb-2"
  const commonWrapperClasses = "relative flex flex-col"

  // FIXED: File Type Dropdown Component with auto-close
  const renderFileTypeDropdown = () => {
    const uniqueFileTypes = [...new Set(fileTypes.map((ft) => ft.filetype))]

    const getSelectedFileTypes = () => {
      return uniqueFileTypes.filter((filetype) => {
        const extensionsForType = fileTypes.filter((ft) => ft.filetype === filetype).map((ft) => ft.extension)
        return extensionsForType.every((ext) => selectedFileTypes.includes(ext))
      })
    }

    const selectedTypes = getSelectedFileTypes()

    if (isLoading) {
      return <LoadingComponent />;
    }

    return (
      <div className="flex flex-col">
        <label className="mb-1" htmlFor="fileTypes">
          File Types {userRole !== "ADMIN" && "*"}
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowFileTypeDropdown(!showFileTypeDropdown)}
            className="w-full p-2 border rounded-md outline-none bg-white text-left flex justify-between items-center"
          >
            <span>
              {selectedTypes.length === 0
                ? "Select File Types"
                : `${selectedTypes.length} file type${selectedTypes.length > 1 ? "s" : ""} selected`}
            </span>
            <svg
              className={`w-4 h-4 transition-transform ${showFileTypeDropdown ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showFileTypeDropdown && (
            <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
              <div className="p-2 border-b border-gray-200">
                <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={selectAllFileTypes}
                    onChange={handleSelectAllFileTypes}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-900">Select All</span>
                </label>
              </div>

              <div className="max-h-48 overflow-y-auto">
                {uniqueFileTypes.map((filetype) => {
                  const extensionsForType = fileTypes.filter((ft) => ft.filetype === filetype).map((ft) => ft.extension)
                  const isSelected = extensionsForType.every((ext) => selectedFileTypes.includes(ext))

                  return (
                    <label key={filetype} className="flex items-center cursor-pointer hover:bg-gray-50 p-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleFileTypeChange(filetype)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="ml-2 flex-1">
                        <span className="text-sm font-medium text-gray-900">{filetype}</span>
                        <div className="text-xs text-gray-500">{extensionsForType.join(", ")}</div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderArchiveFields = () => {
    userRole = localStorage.getItem("role")
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 bg-slate-100 p-6 rounded-lg">
        {userRole === "BRANCH ADMIN" ? (
          <>
            <div className="flex flex-col">
              <label className="mb-1" htmlFor="branch">
                Branch <span className="text-red-500">*</span>
              </label>
              <select
                id="branchId"
                name="branchId"
                value={archiveCriteria.branchId}
                onChange={handleInputChange}
                className="p-2 border rounded-md outline-none"
                disabled={true}
              >
                <option value={userBranch?.id}>{userBranch?.name}</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label className="mb-1" htmlFor="department">
                Department <span className="text-red-500">*</span>
              </label>
              <select
                id="departmentId"
                name="departmentId"
                value={archiveCriteria.departmentId}
                onChange={handleInputChange}
                className="p-2 border rounded-md outline-none"
              >
                <option value="">Select Department</option>
                <option value="all">All Departments</option>
                {departmentOptions.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>

            {renderFileTypeDropdown()}
          </>
        ) : userRole === "DEPARTMENT ADMIN" || userRole === "USER" ? (
          <>
            <div className="flex flex-col">
              <label className="mb-1" htmlFor="branch">
                Branch <span className="text-red-500">*</span>
              </label>
              <select
                id="branchId"
                name="branchId"
                value={archiveCriteria.branchId}
                onChange={handleInputChange}
                className="p-2 border rounded-md outline-none"
                disabled={true}
              >
                <option value={userBranch?.id}>{userBranch?.name}</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label className="mb-1" htmlFor="department">
                Department<span className="text-red-500">*</span>
              </label>
              <select
                id="departmentId"
                name="departmentId"
                value={archiveCriteria.departmentId}
                onChange={handleInputChange}
                className="p-2 border rounded-md outline-none"
                disabled={true}
              >
                <option value={userDepartment?.id}>{userDepartment?.name}</option>
              </select>
            </div>

            {renderFileTypeDropdown()}
          </>
        ) : (
          <>
            <div className="flex flex-col">
              <label className="mb-1" htmlFor="branch">
                Branch <span className="text-red-500">*</span>
              </label>
              <select
                id="branchId"
                name="branchId"
                value={archiveCriteria.branchId}
                onChange={handleInputChange}
                className="p-2 border rounded-md outline-none"
              >
                <option value="">Select Branch</option>
                <option value="all">All Branches</option>
                {branchOptions.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="mb-1" htmlFor="department">
                Department <span className="text-red-500">*</span>
              </label>
              <select
                id="departmentId"
                name="departmentId"
                value={archiveCriteria.departmentId}
                onChange={handleInputChange}
                className="p-2 border rounded-md outline-none"
                disabled={!archiveCriteria.branchId || archiveCriteria.branchId === "all"}
              >
                <option value="">Select Department</option>
                <option value="all">All Departments</option>
                {departmentOptions.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>

            {renderFileTypeDropdown()}
          </>
        )}

        <div className={commonWrapperClasses}>
          <label className={commonLabelClasses} htmlFor="fromDate">
            From Date
          </label>
          <DatePicker
            id="fromDate"
            selected={fromDate}
            onChange={(date) => setFromDate(date)}
            selectsStart
            startDate={fromDate}
            endDate={toDate}
            maxDate={new Date()}
            dateFormat="dd/MM/yyyy"
            placeholderText="Select a start date"
            customInput={<CustomInput />}
          />
        </div>

        <div className={commonWrapperClasses}>
          <label className={commonLabelClasses} htmlFor="toDate">
            To Date
          </label>
          <DatePicker
            id="endDate"
            selected={toDate}
            onChange={(date) => setToDate(date)}
            selectsEnd
            startDate={fromDate}
            endDate={toDate}
            dateFormat="dd-MM-yyyy"
            placeholderText="End Date"
            customInput={<CustomInput />}
          />
        </div>
      </div>
    )
  }

  // Simple Policy Status Check Button (NO file type dependency)
  const renderRunRetentionCheck = () => {
    return (
      <button
        type="button"
        onClick={handleRunRetentionCheck}
        disabled={runCheckLoading}
        className={`bg-green-600 text-white rounded-2xl p-2 flex items-center text-sm justify-center min-w-[180px] ${runCheckLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-green-700"
          }`}
        title="Policy Status check on all eligible documents"
      >
        {runCheckLoading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Running...
          </>
        ) : (
          "Policy Status"
        )}
      </button>
    )
  }

  const renderArchiveStatusTabs = () => {
    const currentData = filteredArchivedFiles;

    // Group archives by name before applying search and pagination
    const groupedData = groupArchivesByName(currentData);

    // Apply search filtering on grouped data
    const filteredData = groupedData.filter((archive) => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();

      return (
        (archive.name && archive.name.toLowerCase().includes(searchLower)) ||
        (archive.branchName && archive.branchName.toLowerCase().includes(searchLower)) ||
        (archive.departmentName && archive.departmentName.toLowerCase().includes(searchLower)) ||
        (archive.storageType && archive.storageType.toLowerCase().includes(searchLower)) ||
        formatArchiveDate(archive.archiveDate).toLowerCase().includes(searchLower)
      );
    });

    const totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    // Function to determine status display
    const getStatusDisplay = (archive) => {
      // Check if archive has a status property
      if (archive.status) {
        switch (archive.status.toUpperCase()) {
          case 'SCHEDULED':
          case 'SCHEDULING':
            return (
              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                SCHEDULED
              </span>
            );
          case 'ARCHIVED':
            return (
              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                ARCHIVED
              </span>
            );
          case 'FAILED':
            return (
              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                FAILED
              </span>
            );
          default:
            return (
              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                {archive.status || 'UNKNOWN'}
              </span>
            );
        }
      }

      // Fallback for archives without explicit status
      if (archive.archiveDate) {
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
            ARCHIVED
          </span>
        );
      }

      return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
          UNKNOWN
        </span>
      );
    };

    // Function to determine if archive can be retrieved
    const canRetrieveArchive = (archive) => {
      return archive.status === 'ARCHIVED' ||
        (!archive.status && archive.archiveDate); // Fallback for older archives
    };

    if (currentData.length === 0) {
      return (
        <div className="bg-white p-6 rounded-xl shadow-md w-full mb-6">
          <div className="flex space-x-1 mb-4">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 rounded-lg font-medium ${activeTab === "all" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
            >
              Filtered Archives ({currentData.length})
            </button>
          </div>
          <p className="text-gray-500 text-center">
            No archived files match your criteria.<br />
            Try changing your filters or clearing the date range.
          </p>
        </div>
      );
    }

    return (
      <>
        {(userRole === "ADMIN" || userRole === "BRANCH ADMIN" || userRole === "DEPARTMENT ADMIN") && (
          <div className="bg-white p-2 rounded-xl shadow-md w-full mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl mb-1 font-semibold">Archive Management</h3>
              <div className="flex items-center gap-4">
                {renderRunRetentionCheck()}
              </div>
            </div>

            {/* Search and Items Per Page Controls */}
            <div className="mb-3 bg-slate-100 p-1 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4">
              {/* Items Per Page */}
              <div className="flex items-center bg-blue-500 rounded-lg w-full flex-1 md:w-1/2">
                <label htmlFor="itemsPerPage" className="mr-2 ml-2 text-white text-sm">
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

              {/* Search Input */}
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
                    <th className="border p-2 text-left">Archive Name</th>
                    <th className="border p-2 text-left">Files Count</th>
                    <th className="border p-2 text-left">Branch</th>
                    <th className="border p-2 text-left">Department</th>
                    <th className="border p-2 text-left">Archive Date</th>
                    <th className="border p-2 text-left">Status</th>
                    <th className="border p-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((archive, index) => (
                    <tr key={archive.id}>
                      <td className="border p-2">{startIndex + index + 1}</td>
                      <td className="border p-2" title={archive.fileNames.join(', ')}>
                        {archive.displayName}
                      </td>
                      <td className="border p-2">{archive.fileCount}</td>
                      <td className="border p-2">{archive.branchName || archive.branch?.name}</td>
                      <td className="border p-2">{archive.departmentName || archive.department?.name}</td>
                      <td className="border p-2">{formatArchiveDate(archive.archiveDate)}</td>
                      <td className="border p-2">
                        {getStatusDisplay(archive)}
                      </td>
                      <td className="border p-2">
                        {canRetrieveArchive(archive) ? (
                          <button
                            onClick={() => handleRetrieveArchived(archive.name)}
                            disabled={isRetrievingArchived}
                            className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50"
                            title="Download as ZIP with folder structure"
                          >
                            {isRetrievingArchived && archive.name === retrievingId ? "Retrieving..." : "Retrieve"}
                          </button>
                        ) : (
                          <span className="text-gray-400" title="Only archived files can be retrieved">
                            Retrieve
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center mt-4">
              {/* Previous Button */}
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded mr-3 ${currentPage === 1 ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"}`}
              >
                <ArrowLeftIcon className="inline h-4 w-4 mr-2 mb-1" />
                Previous
              </button>

              {/* Page Number Buttons */}
              {getPageNumbers(totalPages, currentPage).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 rounded mx-1 ${currentPage === page ? "bg-blue-500 text-white" : "bg-slate-200 hover:bg-blue-100"}`}
                >
                  {page}
                </button>
              ))}

              {/* Page Count Info */}
              <span className="text-sm text-gray-700 mx-2">of {totalPages} pages</span>

              {/* Next Button */}
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded ml-3 ${currentPage === totalPages ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"}`}
              >
                Next
                <ArrowRightIcon className="inline h-4 w-4 ml-2 mb-1" />
              </button>
              <div className="ml-4">
                <span className="text-sm text-gray-700">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, totalItems)} of{" "}
                  {totalItems} entries
                </span>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  // FIXED: Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showFileTypeDropdown && !event.target.closest(".relative")) {
        setShowFileTypeDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showFileTypeDropdown])

  return (
    <div className="px-2">
      <div className="flex flex-col space-y-4">
        <h2 className="text-2xl mb-1 font-semibold">Archive Download</h2>
        <div className="bg-white p-1 rounded-lg shadow-sm">
          {popupMessage && (
            <Popup message={popupMessage.message} type={popupMessage.type} onClose={() => setPopupMessage(null)} />
          )}

          {renderArchiveFields()}

          <div className="flex flex-wrap gap-4 mt-4">
            <button
              onClick={handleDownload}
              disabled={isLoading}
              className={`bg-blue-900 text-white rounded-lg py-3 px-6 hover:bg-blue-800 transition duration-300 shadow-md hover:shadow-lg flex items-center justify-center ${isLoading ? "opacity-50 cursor-not-allowed" : ""
                }`}
            >
              {isLoading ? "Downloading..." : "Download"}
            </button>

            <button
              onClick={handleStoreArchive}
              disabled={isLoading}
              className={`bg-green-700 text-white rounded-lg py-3 px-6 hover:bg-green-800 transition duration-300 shadow-md hover:shadow-lg flex items-center justify-center ${isLoading ? "opacity-50 cursor-not-allowed" : ""
                }`}
            >
              {isLoading ? "Archiving..." : "Archive"}
            </button>
          </div>
        </div>

        {renderArchiveStatusTabs()}

        {/* Progress Bar Modal */}
        {showProgress && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
              <div className="text-center">
                <div className="mb-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                    <svg className="w-8 h-8 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {progressType === "download" ? "Downloading " : " Archiveing"}
                  </h3>
                  <p className="text-gray-600 mb-4">{progressMessage}</p>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progressType === "download" ? downloadProgress : storeProgress}%` }}
                  ></div>
                </div>

                <div className="text-sm text-gray-500">
                  {Math.round(progressType === "download" ? downloadProgress : storeProgress)}% Complete
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Retention Check Results Alert */}
        {retentionAlert.show && (
          <RetentionCheckAlert
            onClose={() => setRetentionAlert({ show: false, result: null })}
            result={retentionAlert.result}
          />
        )}
      </div>
    </div>
  )
}

export default ArchiveDownload
