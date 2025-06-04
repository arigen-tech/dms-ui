

import React, { useState, useEffect } from "react"
import axios from "axios"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { CalendarIcon } from "@heroicons/react/24/outline"
import { API_HOST } from "../API/apiConfig"
import Popup from "../Components/Popup"
import { FILETYPE_API } from "../API/apiConfig"

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
  const [loading, setLoading] = useState(false)

  const [allArchiveFromDate, setAllArchiveFromDate] = useState(null)
  const [allArchiveToDate, setAllArchiveToDate] = useState(null)
  const [allArchiveLoading, setAllArchiveLoading] = useState(false)
  const [fileTypes, setFileTypes] = useState([])
  const [selectedFileTypes, setSelectedFileTypes] = useState([])
  const [selectAllFileTypes, setSelectAllFileTypes] = useState(false)
  const [selectedAllArchiveFileTypes, setSelectedAllArchiveFileTypes] = useState([])
  const [selectAllArchiveFileTypes, setSelectAllArchiveFileTypes] = useState(false)

  const [selectedFileType, setSelectedFileType] = useState("")
  const [availableExtensions, setAvailableExtensions] = useState([])
  const [selectedRegularFileType, setSelectedRegularFileType] = useState("")
  const [selectedAllArchiveFileType, setSelectedAllArchiveFileType] = useState("")
  const [regularFileTypes, setRegularFileTypes] = useState([])
  const [allArchiveFileTypes, setAllArchiveFileTypes] = useState([])
  const [extensionSectionOpen, setExtensionSectionOpen] = useState(false)
  const [allExtensions, setAllExtensions] = useState([])

  // Enhanced state for two-tier archival
  const [archivedFileStatus, setArchivedFileStatus] = useState([])
  const [primaryArchiveStatus, setPrimaryArchiveStatus] = useState([])
  const [secondaryArchiveStatus, setSecondaryArchiveStatus] = useState([])
  const [isRetrievingArchived, setIsRetrievingArchived] = useState(false)
  const [retrievingId, setRetrievingId] = useState(null)
  const [activeTab, setActiveTab] = useState("all") // 'all', 'primary', 'secondary'
  const [processingRetention, setProcessingRetention] = useState(false)

  // Search and pagination state
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Progress bar state
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [storeProgress, setStoreProgress] = useState(0)
  const [showProgress, setShowProgress] = useState(false)
  const [progressType, setProgressType] = useState("") // 'download' or 'store'
  const [progressMessage, setProgressMessage] = useState("")

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  useEffect(() => {
    fetchUserDetails()
    fetchBranches()
    fetchFileTypes()
    fetchArchivedFileStatus()
    fetchPrimaryArchiveStatus()
    fetchSecondaryArchiveStatus()
  }, [])

  // Validation function
  const validateDownloadInputs = () => {
    const errors = []

    // Check if branch is selected (for non-admin users)
    if (userRole !== "ADMIN" && !archiveCriteria.branchId) {
      errors.push("Please select a branch")
    }

    // Check if file types are selected
    if (regularFileTypes.length === 0) {
      errors.push("Please select at least one file type")
    }

    return errors
  }

  // Validation function for all archives
  const validateAllArchiveInputs = () => {
    const errors = []

    // Check if file types are selected
    if (allArchiveFileTypes.length === 0) {
      errors.push("Please select at least one file type")
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

      const extensions = response.data.response.map((item) => item.extension)
      setAllExtensions(extensions)
    } catch (error) {
      console.error("Error fetching Files Types:", error)
      showPopup("Failed to fetch file types", "error")
    }
  }

  const fetchArchivedFileStatus = async () => {
    try {
      const token = localStorage.getItem("tokenKey")
      const response = await axios.get(`${API_HOST}/archive/status`, {
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

  const fetchPrimaryArchiveStatus = async () => {
    try {
      const token = localStorage.getItem("tokenKey")
      const response = await axios.get(`${API_HOST}/archive/status/primary`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.data && response.data.response) {
        setPrimaryArchiveStatus(response.data.response)
      } else {
        setPrimaryArchiveStatus([])
      }
    } catch (error) {
      console.error("Error fetching primary archive status:", error)
      setPrimaryArchiveStatus([])
    }
  }

  const fetchSecondaryArchiveStatus = async () => {
    try {
      const token = localStorage.getItem("tokenKey")
      const response = await axios.get(`${API_HOST}/archive/status/secondary`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.data && response.data.response) {
        setSecondaryArchiveStatus(response.data.response)
      } else {
        setSecondaryArchiveStatus([])
      }
    } catch (error) {
      console.error("Error fetching secondary archive status:", error)
      setSecondaryArchiveStatus([])
    }
  }

  const handleProcessRetentionPolicy = async () => {
    setProcessingRetention(true)
    try {
      const token = localStorage.getItem("tokenKey")
      const response = await axios.post(
        `${API_HOST}/archive/process-retention`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      showPopup("Retention policy processing completed successfully", "success")

      // Refresh all archive statuses
      fetchArchivedFileStatus()
      fetchPrimaryArchiveStatus()
      fetchSecondaryArchiveStatus()
    } catch (error) {
      console.error("Error processing retention policy:", error)
      showPopup("Failed to process retention policy", "error")
    } finally {
      setProcessingRetention(false)
    }
  }

 const handleRetrieveArchived = async (archiveId) => {
    setIsRetrievingArchived(true);
    setRetrievingId(archiveId);
    try {
        const token = localStorage.getItem("tokenKey");
        const response = await axios.get(`${API_HOST}/archive/retrieve/${archiveId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            responseType: "blob",
        });

        // Get the original filename from the content-disposition header
        const contentDisposition = response.headers['content-disposition'];
        let filename = `archived_file_${archiveId}`; // fallback name
        
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
            if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1];
            }
        }

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", filename); // Use the original filename
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        showPopup("Archived file retrieved successfully", "success");

        fetchArchivedFileStatus();
        fetchPrimaryArchiveStatus();
        fetchSecondaryArchiveStatus();
    } catch (error) {
        console.error("Error retrieving archived file:", error);
        showPopup("Failed to retrieve archived file", "error");
    } finally {
        setIsRetrievingArchived(false);
        setRetrievingId(null);
    }
};
  const groupedFileTypes = fileTypes.reduce((acc, curr) => {
    if (!acc[curr.filetype]) {
      acc[curr.filetype] = []
    }
    acc[curr.filetype].push(curr.extension)
    return acc
  }, {})

  const handleSelectAllExtensions = (fileType, isAllArchive) => {
    if (fileType === "all") {
      if (isAllArchive) {
        setAllArchiveFileTypes((prev) => (prev.length === allExtensions.length ? [] : [...allExtensions]))
      } else {
        setRegularFileTypes((prev) => (prev.length === allExtensions.length ? [] : [...allExtensions]))
        setArchiveCriteria((prev) => ({
          ...prev,
          fileTypes: prev.fileTypes.length === allExtensions.length ? [] : [...allExtensions],
        }))
      }
    } else {
      const extensions = groupedFileTypes[fileType] || []
      if (isAllArchive) {
        setAllArchiveFileTypes((prev) => (prev.length === extensions.length ? [] : extensions))
      } else {
        setRegularFileTypes((prev) => (prev.length === extensions.length ? [] : extensions))
        setArchiveCriteria((prev) => ({
          ...prev,
          fileTypes: prev.fileTypes.length === extensions.length ? [] : extensions,
        }))
      }
    }
  }

  const handleFileTypeSelect = (fileType, isAllArchive) => {
    if (isAllArchive) {
      setSelectedAllArchiveFileType(fileType)
      setAllArchiveFileTypes([])
    } else {
      setSelectedRegularFileType(fileType)
      setRegularFileTypes([])
      setArchiveCriteria((prev) => ({
        ...prev,
        fileTypes: [],
      }))
    }
  }

  const handleExtensionChange = (extension, isAllArchive) => {
    if (isAllArchive) {
      setAllArchiveFileTypes((prev) =>
        prev.includes(extension) ? prev.filter((ext) => ext !== extension) : [...prev, extension],
      )
    } else {
      setRegularFileTypes((prev) =>
        prev.includes(extension) ? prev.filter((ext) => ext !== extension) : [...prev, extension],
      )
      setArchiveCriteria((prev) => ({
        ...prev,
        fileTypes: prev.fileTypes.includes(extension)
          ? prev.fileTypes.filter((ext) => ext !== extension)
          : [...prev.fileTypes, extension],
      }))
    }
  }

  const handleFileTypeClick = (fileType, isAllArchive) => {
    if ((isAllArchive ? selectedAllArchiveFileType : selectedRegularFileType) === fileType) {
      setExtensionSectionOpen(!extensionSectionOpen)
    } else {
      handleFileTypeSelect(fileType, isAllArchive)
      setExtensionSectionOpen(true)
    }
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

      setArchiveCriteria((prev) => ({
        ...prev,
        branchId: response.data.branch?.id || "",
        departmentId: response.data.department?.id || "",
      }))

      if (response.data.branch?.id) {
        fetchDepartments(response.data.branch.id)
      }
    } catch (error) {
      console.error("Error fetching user details:", error)
      showPopup("Failed to fetch user details", "error")
    }
  }

 const getFilteredDataByRole = (data) => {
  if (!data || !Array.isArray(data)) return [];
  
  // Normalize role name for comparison
  const normalizedRole = userRole?.toUpperCase().replace(/_/g, ' ');

  switch (normalizedRole) {
    case "ADMIN":
      return data;
    
    case "BRANCH ADMIN":
      // Filter by branch ID or name
      return data.filter(file => 
        (file.branchId === userBranch?.id) || 
        (file.branchName === userBranch?.name)
      );
    
    case "DEPARTMENT ADMIN":
      // Filter by department ID or name
      return data.filter(file => 
        (file.departmentId === userDepartment?.id) || 
        (file.departmentName === userDepartment?.name)
      );
    
    default:
      return [];
  }
};

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
    if (archiveCriteria.branchId) {
      fetchDepartments(archiveCriteria.branchId)
    }
  }, [archiveCriteria.branchId])

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
      ...(name === "branchId" && { department: "" }),
    }))
  }

  const handleDownload = async () => {
    // Validate inputs first
    const validationErrors = validateDownloadInputs()
    if (validationErrors.length > 0) {
      showPopup(`\n${validationErrors.join("\n")}`, "warning")
      return
    }

    setLoading(true)
    setShowProgress(true)
    setProgressType("download")
    setDownloadProgress(0)
    setProgressMessage("Starting download...")

    // REMOVED: Fake progress simulation - this was the problem!

    try {
      const token = localStorage.getItem("tokenKey")
      const params = new URLSearchParams()

      // Only add branchId if it exists
      if (archiveCriteria.branchId) {
        params.append("branchId", archiveCriteria.branchId)
      }

      if (userRole) {
        params.append("userRole", userRole)
      }

      if (archiveCriteria.departmentId) {
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

      regularFileTypes.forEach((fileType) => {
        params.append("fileTypes", fileType)
      })

      // REAL PROGRESS TRACKING with axios onDownloadProgress
      const response = await axios.get(`${API_HOST}/archive/download`, {
        params: params,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: "blob",
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.lengthComputable) {
            // Real progress based on actual bytes downloaded
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            setDownloadProgress(percentCompleted)
            setProgressMessage(`Downloading... ${percentCompleted}%`)
          } else {
            // If server doesn't send content-length, show indeterminate progress
            setProgressMessage("Downloading files...")
          }
        },
      })

      // Download completed - prepare file
      setDownloadProgress(100)
      setProgressMessage("Preparing download...")

      // Create and trigger download
      const blob = new Blob([response.data], { type: "application/zip" })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `archive_${new Date().toISOString().split("T")[0]}.zip`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      // Show success message AFTER download is triggered
      setTimeout(() => {
        setShowProgress(false)
        showPopup("Archive downloaded successfully! ", "success")
      }, 500)

    } catch (error) {
      setShowProgress(false)
      console.error("Error downloading archive:", error)
      showPopup("Failed to download archive ", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadAll = async () => {
    // Validate inputs first
    const validationErrors = validateAllArchiveInputs()
    if (validationErrors.length > 0) {
      showPopup(`\n${validationErrors.join("\n")}`, "warning")
      return
    }

    setAllArchiveLoading(true)
    setShowProgress(true)
    setProgressType("download")
    setDownloadProgress(0)
    setProgressMessage("Starting download for all branches...")

    // REMOVED: Fake progress simulation - this was the problem!

    try {
      const token = localStorage.getItem("tokenKey")
      const params = new URLSearchParams()

      if (allArchiveFromDate) {
        const formattedFromDate = allArchiveFromDate.toISOString().split("T")[0]
        params.append("fromDate", formattedFromDate)
      }

      if (allArchiveToDate) {
        const formattedToDate = allArchiveToDate.toISOString().split("T")[0]
        params.append("toDate", formattedToDate)
      }

      allArchiveFileTypes.forEach((fileType) => {
        params.append("fileTypes", fileType)
      })

      // REAL PROGRESS TRACKING with axios onDownloadProgress
      const response = await axios.get(`${API_HOST}/archive/download/all`, {
        params: params,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: "blob",
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.lengthComputable) {
            // Real progress based on actual bytes downloaded
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            setDownloadProgress(percentCompleted)
            setProgressMessage(`Downloading all branches... ${percentCompleted}%`)
          } else {
            // If server doesn't send content-length, show indeterminate progress
            setProgressMessage("Downloading files for all branches...")
          }
        },
      })

      // Download completed - prepare file
      setDownloadProgress(100)
      setProgressMessage("Preparing download...")

      // Create and trigger download
      const blob = new Blob([response.data], { type: "application/zip" })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `all_archives_${new Date().toISOString().split("T")[0]}.zip`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      // Show success message AFTER download is triggered
      setTimeout(() => {
        setShowProgress(false)
        showPopup("All archives downloaded successfully! ", "success")
      }, 500)

    } catch (error) {
      setShowProgress(false)
      console.error("Error downloading all archives:", error)
      showPopup("Failed to download all archives ", "error")
    } finally {
      setAllArchiveLoading(false)
    }
  }

  const handleStoreArchive = async () => {
    // Validate inputs first
    const validationErrors = validateDownloadInputs()
    if (validationErrors.length > 0) {
      showPopup(`\n${validationErrors.join("\n")}`, "warning")
      return
    }

    setLoading(true)
    setShowProgress(true)
    setProgressType("store")
    setStoreProgress(0)
    setProgressMessage("Preparing to store archive...")

    // Simulate progress
    const progressInterval = setInterval(() => {
      setStoreProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + Math.random() * 12
      })
    }, 250)

    try {
      const token = localStorage.getItem("tokenKey")
      const params = new URLSearchParams()

      if (archiveCriteria.branchId) {
        params.append("branchId", archiveCriteria.branchId)
      }

      if (userRole) {
        params.append("userRole", userRole)
      }

      if (archiveCriteria.departmentId) {
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

      regularFileTypes.forEach((fileType) => {
        params.append("fileTypes", fileType)
      })

      setProgressMessage("Storing archive to server...")

      const response = await axios.post(`${API_HOST}/archive/store`, params, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      })

      clearInterval(progressInterval)
      setStoreProgress(100)
      setProgressMessage("Archive stored successfully!")

      setTimeout(() => {
        setShowProgress(false)
        if (response.data.success) {
          showPopup(`Archive stored successfully! \nLocation: ${response.data.fileName}`, "success")
        } else {
          showPopup(response.data.message || "Failed to store archive ", "error")
        }
      }, 1000)
    } catch (error) {
      clearInterval(progressInterval)
      setShowProgress(false)
      console.error("Error storing archive:", error)
      showPopup("Failed to store archive ", "error")
    } finally {
      setLoading(false)
      setStoreProgress(0)
    }
  }

  const handleStoreAllArchive = async () => {
    // Validate inputs first
    const validationErrors = validateAllArchiveInputs()
    if (validationErrors.length > 0) {
      showPopup(`\n${validationErrors.join("\n")}`, "warning")
      return
    }

    setAllArchiveLoading(true)
    setShowProgress(true)
    setProgressType("store")
    setStoreProgress(0)
    setProgressMessage("Preparing to store archive for all branches...")

    // Simulate progress
    const progressInterval = setInterval(() => {
      setStoreProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + Math.random() * 12
      })
    }, 250)

    try {
      const token = localStorage.getItem("tokenKey")
      const params = new URLSearchParams()

      // Set allDataRequest to true for storing all archives
      params.append("allDataRequest", "true")

      if (allArchiveFromDate) {
        const formattedFromDate = allArchiveFromDate.toISOString().split("T")[0]
        params.append("fromDate", formattedFromDate)
      }

      if (allArchiveToDate) {
        const formattedToDate = allArchiveToDate.toISOString().split("T")[0]
        params.append("toDate", formattedToDate)
      }

      allArchiveFileTypes.forEach((fileType) => {
        params.append("fileTypes", fileType)
      })

      setProgressMessage("Storing archive to server for all branches...")

      const response = await axios.post(`${API_HOST}/archive/store`, params, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      })

      clearInterval(progressInterval)
      setStoreProgress(100)
      setProgressMessage("Archive stored successfully for all branches!")

      setTimeout(() => {
        setShowProgress(false)
        if (response.data.success) {
          showPopup(`All archives stored successfully! \nLocation: ${response.data.fileName}`, "success")
        } else {
          showPopup(response.data.message || "Failed to store all archives ", "error")
        }
      }, 1000)
    } catch (error) {
      clearInterval(progressInterval)
      setShowProgress(false)
      console.error("Error storing all archives:", error)
      showPopup("Failed to store all archives ", "error")
    } finally {
      setAllArchiveLoading(false)
      setStoreProgress(0)
    }
  }

  const showPopup = (message, type = "info") => {
    setPopupMessage({ message, type })
  }

  const formatArchiveDate = (archiveDate) => {
    if (!archiveDate) return "-"

    // Handle array format: [year, month, day, hour, minute, second, nanosecond]
    if (Array.isArray(archiveDate) && archiveDate.length >= 6) {
      const [year, month, day, hour, minute, second] = archiveDate
      // Month is 1-based in the array, but Date constructor expects 0-based
      const date = new Date(year, month - 1, day, hour, minute, second)
      return date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    }

    // Handle regular date string/object
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
    const delta = 2
    const range = []
    const rangeWithDots = []

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i)
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, "...")
    } else {
      rangeWithDots.push(1)
    }

    rangeWithDots.push(...range)

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push("...", totalPages)
    } else {
      rangeWithDots.push(totalPages)
    }

    return rangeWithDots
  }

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
      <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 pointer-events-none" />
    </div>
  ))

  const commonInputClasses =
    "block w-full h-[46px] px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
  const commonLabelClasses = "block text-md font-medium text-gray-700 mb-2"
  const commonWrapperClasses = "relative flex flex-col"

  const renderArchiveFields = () => {
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
        <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 pointer-events-none" />
      </div>
    ))
    userRole = localStorage.getItem("role")
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 bg-slate-100 p-6 rounded-lg">
        {userRole === "BRANCH ADMIN" ? (
          <>
            <div className="flex flex-col">
              <label className="mb-1" htmlFor="branch">
                Branch
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
                Department
              </label>
              <select
                id="departmentId"
                name="departmentId"
                onChange={handleInputChange}
                className="p-2 border rounded-md outline-none"
              >
                <option value="">Select Department</option>
                {departmentOptions.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : userRole === "DEPARTMENT ADMIN" || userRole === "USER" ? (
          <>
            <div className="flex flex-col">
              <label className="mb-1" htmlFor="branch">
                Branch
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
                Department
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
          </>
        ) : (
          <>
            <div className="flex flex-col">
              <label className="mb-1" htmlFor="branch">
                Branch
              </label>
              <select
                id="branchId"
                name="branchId"
                value={archiveCriteria.branchId}
                onChange={handleInputChange}
                className="p-2 border rounded-md outline-none"
              >
                <option value="">Select Branch</option>
                {branchOptions.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="mb-1" htmlFor="department">
                Department
              </label>
              <select
                id="departmentId"
                name="departmentId"
                value={archiveCriteria.departmentId}
                onChange={handleInputChange}
                className="p-2 border rounded-md outline-none"
                disabled={!archiveCriteria.branchId}
              >
                <option value="">Select Department</option>
                {departmentOptions.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>
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

  const renderFileTypeSelection = (isAllArchive = false) => {
    const selectedFileType = isAllArchive ? selectedAllArchiveFileType : selectedRegularFileType
    const selectedTypes = isAllArchive ? allArchiveFileTypes : regularFileTypes
    const availableExtensions = selectedFileType === "all" ? allExtensions : groupedFileTypes[selectedFileType] || []
    const areAllSelected =
      availableExtensions.length > 0 && availableExtensions.every((ext) => selectedTypes.includes(ext))

    return (
      <div className="mb-6 bg-slate-100 p-4 sm:p-6 lg:p-8 rounded-xl shadow-sm">
        <label className="block text-lg font-semibold text-gray-800 mb-4">File Types</label>

        <div className="space-y-4">
          <div className="mb-4">
            <button
              onClick={() => {
                handleFileTypeClick("all", isAllArchive)
                const btn = document.getElementById("selectAllBtn")
                btn.classList.add("animate-refresh")
                setTimeout(() => btn.classList.remove("animate-refresh"), 500)
              }}
              id="selectAllBtn"
              className={`
                w-full px-4 py-3 rounded-lg
                font-medium text-sm transition-all duration-200
                shadow-sm hover:shadow-md
                ${selectedFileType === "all" ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-white text-blue-600 "}
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                transform hover:-translate-y-0.5
                flex items-center justify-center gap-2
              `}
            >
              <svg
                className={`w-5 h-5 ${selectedFileType === "all" ? "text-white" : "text-blue-600"}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
              <span>Select File Types</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
            {Object.keys(groupedFileTypes).map((fileType) => (
              <div
                key={fileType}
                onClick={() => handleFileTypeClick(fileType, isAllArchive)}
                className={`bg-white px-3 py-2 rounded-lg shadow-sm cursor-pointer transition-all duration-200
                  hover:-translate-y-0.5 text-center
                  ${selectedFileType === fileType ? "ring-2 ring-blue-500 bg-blue-50" : ""}`}
              >
                <span className="text-gray-700 text-sm font-medium">{fileType}</span>
              </div>
            ))}
          </div>

          {selectedFileType && extensionSectionOpen && (
            <div className="mt-4 bg-white rounded-lg p-4">
              <div className="flex flex-wrap justify-between items-center mb-3">
                <h3 className="text-sm font-medium text-gray-700 mb-2 sm:mb-0">
                  {selectedFileType === "all"
                    ? "All Available Extensions"
                    : `Available Extensions for ${selectedFileType}`}
                </h3>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id={`select-all-${isAllArchive}`}
                    checked={areAllSelected}
                    onChange={() => handleSelectAllExtensions(selectedFileType, isAllArchive)}
                    className="h-4 w-4 rounded accent-blue-600"
                  />
                  <label
                    htmlFor={`select-all-${isAllArchive}`}
                    className="ml-2 text-sm font-medium text-gray-700 cursor-pointer"
                  >
                    Select All
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {availableExtensions.map((extension) => {
                  const isSelected = selectedTypes.includes(extension)
                  return (
                    <div key={extension} className="bg-gray-50 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`ext-${extension}-${isAllArchive}`}
                          checked={isSelected}
                          onChange={() => handleExtensionChange(extension, isAllArchive)}
                          className="h-4 w-4 rounded accent-blue-600"
                        />
                        <label htmlFor={`ext-${extension}-${isAllArchive}`} className="ml-3 cursor-pointer text-sm">
                          <span className="text-gray-700 font-medium">{extension}</span>
                        </label>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-blue-800 font-medium">Selected: {selectedTypes.length} extensions</span>
        </div>
      </div>
    )
  }

 const renderArchiveStatusTabs = () => {
  const getCurrentData = () => {
    let data;
    switch (activeTab) {
      case "primary":
        data = primaryArchiveStatus;
        break;
      case "secondary":
        data = secondaryArchiveStatus;
        break;
      default:
        data = archivedFileStatus;
    }
    return getFilteredDataByRole(data);
  };

  const currentData = getCurrentData();

  
    // Filter data based on search term
    const filteredData = currentData.filter((file) => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();

      return (
        (file.fileName && file.fileName.toLowerCase().includes(searchLower)) ||
        (file.branchName && file.branchName.toLowerCase().includes(searchLower)) ||
        (file.departmentName && file.departmentName.toLowerCase().includes(searchLower)) ||
        (file.storageType && file.storageType.toLowerCase().includes(searchLower)) ||
        formatArchiveDate(file.archiveDate).toLowerCase().includes(searchLower) ||
        (file.movedToSecondaryDate && formatArchiveDate(file.movedToSecondaryDate).toLowerCase().includes(searchLower))
      );
    });

    // Pagination calculations
    const totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = filteredData.slice(startIndex, endIndex);


    if (currentData.length === 0) {
      return (
        <div className="bg-white p-6 rounded-xl shadow-md w-full mb-6">
          <div className="flex space-x-1 mb-4">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 rounded-lg font-medium ${activeTab === "all" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
            >
              All Archives ({getFilteredDataByRole(archivedFileStatus).length})
            </button>
            <button
              onClick={() => setActiveTab("primary")}
              className={`px-4 py-2 rounded-lg font-medium ${activeTab === "primary" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
            >
              Primary Archive ({getFilteredDataByRole(primaryArchiveStatus).length})
            </button>
            <button
              onClick={() => setActiveTab("secondary")}
              className={`px-4 py-2 rounded-lg font-medium ${activeTab === "secondary" ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
            >
              Secondary Archive ({getFilteredDataByRole(secondaryArchiveStatus).length})
            </button>
          </div>
          <p className="text-gray-500 text-center">No archived files found in {activeTab} storage</p>
        </div>
      )
    }

    return (
      <>
        {(userRole === "ADMIN" || userRole === "BRANCH ADMIN" || userRole === "DEPARTMENT ADMIN") && (
          <div className="bg-white p-6 rounded-xl shadow-md w-full mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">Archive Management</h3>
              <button
                onClick={handleProcessRetentionPolicy}
                disabled={processingRetention}
                className={`px-4 py-2 rounded-lg font-medium ${processingRetention ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700 text-white"}`}
              >
                {processingRetention ? "Processing..." : "Process Retention Policy"}
              </button>
            </div>

            <div className="flex space-x-1 mb-4">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-4 py-2 rounded-lg font-medium ${activeTab === "all" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
              >
                All Archives ({archivedFileStatus.length})
              </button>
              <button
                onClick={() => setActiveTab("primary")}
                className={`px-4 py-2 rounded-lg font-medium ${activeTab === "primary" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
              >
                Primary Archive ({primaryArchiveStatus.length})
              </button>
              <button
                onClick={() => setActiveTab("secondary")}
                className={`px-4 py-2 rounded-lg font-medium ${activeTab === "secondary" ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
              >
                Secondary Archive ({secondaryArchiveStatus.length})
              </button>
            </div>

            {/* Search and Items Per Page Controls */}
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex items-center bg-blue-500 rounded-lg w-full flex-1 md:w-1/2">
                <label htmlFor="itemsPerPage" className="mr-2 ml-2 text-white text-sm">
                  Show:
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
                  placeholder="Search files..."
                  className="border rounded-l-md p-1 outline-none w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <svg
                  className="text-white bg-blue-500 rounded-r-lg h-8 w-8 border p-1.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border p-2 text-left">SR.</th>
                    <th className="border p-2 text-left">File Name</th>
                    <th className="border p-2 text-left">Branch</th>
                    <th className="border p-2 text-left">Department</th>
                    <th className="border p-2 text-left">Archive Date</th>
                    <th className="border p-2 text-left">Storage Type</th>
                    {activeTab !== "primary" && <th className="border p-2 text-left">Moved to Secondary</th>}
                    <th className="border p-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((file, index) => (
                    <tr key={file.id}>
                      <td className="border p-2">{startIndex + index + 1}</td>
                      <td className="border p-2">{file.fileName}</td>
                      <td className="border p-2">{file.branchName}</td>
                      <td className="border p-2">{file.departmentName}</td>
                      <td className="border p-2">{formatArchiveDate(file.archiveDate)}</td>
                      <td className="border p-2">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${file.storageType === "PRIMARY" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}`}
                        >
                          {file.storageType}
                        </span>
                      </td>
                      {activeTab !== "primary" && (
                        <td className="border p-2">
                          {file.movedToSecondaryDate ? formatArchiveDate(file.movedToSecondaryDate) : "-"}
                        </td>
                      )}
                      <td className="border p-2">
                        <button
                          onClick={() => handleRetrieveArchived(file.id)}
                          disabled={isRetrievingArchived}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          {isRetrievingArchived && file.id === retrievingId ? "Retrieving..." : "Retrieve"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center mt-4">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded mr-3 ${currentPage === 1 ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"}`}
              >
                <svg className="inline h-4 w-4 mr-2 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>

              {getPageNumbers(totalPages, currentPage).map((page, index) => (
                <button
                  key={index}
                  onClick={() => typeof page === "number" && setCurrentPage(page)}
                  disabled={typeof page !== "number"}
                  className={`px-3 py-1 rounded mx-1 ${currentPage === page ? "bg-blue-500 text-white" : typeof page === "number" ? "bg-slate-200 hover:bg-blue-100" : "bg-transparent cursor-default"}`}
                >
                  {page}
                </button>
              ))}

              <span className="text-sm text-gray-700 mx-2">of {totalPages} pages</span>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded ml-3 ${currentPage === totalPages ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"}`}
              >
                Next
                <svg className="inline h-4 w-4 ml-2 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <div className="ml-4">
                <span className="text-sm text-gray-700">
                  Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} entries
                </span>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="p-4">
    <div className="flex flex-col space-y-4">
      <h2 className="text-2xl mb-6 font-semibold text-gray-800"> Archive Download</h2>
      <div className="bg-white p-4 rounded-xl shadow-md w-full">
        {popupMessage && (
          <Popup message={popupMessage.message} type={popupMessage.type} onClose={() => setPopupMessage(null)} />
        )}

        {renderArchiveFields()}
        {renderFileTypeSelection(false)}

        <div className="flex flex-wrap gap-4 mt-4">
          <button
            onClick={handleDownload}
            disabled={loading}
            className={`bg-blue-900 text-white rounded-lg py-3 px-6 hover:bg-blue-800 transition duration-300 shadow-md hover:shadow-lg flex items-center justify-center ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {loading ? "Downloading..." : "Download Archive"}
          </button>

          <button
            onClick={handleStoreArchive}
            disabled={loading}
            className={`bg-green-700 text-white rounded-lg py-3 px-6 hover:bg-green-800 transition duration-300 shadow-md hover:shadow-lg flex items-center justify-center ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {loading ? "Storing..." : "Store Archive"}
          </button>
        </div>
      </div>

      {userRole === "ADMIN" && (
        <div className="flex flex-col space-y-4">
          <h2 className="text-2xl mb-6 font-semibold text-gray-800">Download All Archives</h2>

          <div className="bg-white p-6 rounded-xl shadow-md w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 bg-slate-100 p-6 rounded-lg">
              <div className={commonWrapperClasses}>
                <label className={commonLabelClasses} htmlFor="fromDate">
                  From Date
                </label>
                <DatePicker
                  id="fromDate"
                  selected={allArchiveFromDate}
                  onChange={(date) => setAllArchiveFromDate(date)}
                  selectsStart
                  startDate={allArchiveFromDate}
                  endDate={allArchiveToDate}
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
                  selected={allArchiveToDate}
                  onChange={(date) => setAllArchiveToDate(date)}
                  selectsEnd
                  startDate={allArchiveFromDate}
                  endDate={allArchiveToDate}
                  dateFormat="dd-MM-yyyy"
                  placeholderText="End Date"
                  customInput={<CustomInput />}
                />
              </div>
            </div>

            {renderFileTypeSelection(true)}

            <div className="flex flex-wrap gap-4 mt-4">
              <button
                onClick={handleDownloadAll}
                disabled={allArchiveLoading}
                className={`bg-blue-900 text-white rounded-lg py-3 px-6 hover:bg-blue-800 transition duration-300 shadow-md hover:shadow-lg flex items-center justify-center ${allArchiveLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {allArchiveLoading ? "Downloading All..." : "Download All Archives"}
              </button>

              <button
                onClick={handleStoreAllArchive}
                disabled={allArchiveLoading}
                className={`bg-green-700 text-white rounded-lg py-3 px-6 hover:bg-green-800 transition duration-300 shadow-md hover:shadow-lg flex items-center justify-center ${allArchiveLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {allArchiveLoading ? "Storing All..." : "Store All Archives"}
              </button>
            </div>
          </div>
        </div>
      )}
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
                  {progressType === "download" ? "Downloading Archive" : "Storing Archive"}
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
    </div>
    </div>
  )
}

export default ArchiveDownload
