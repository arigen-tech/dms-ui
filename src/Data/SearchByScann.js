"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import apiClient from "../API/apiClient"
import { API_HOST, BRANCH_ADMIN, DEPARTMENT_ADMIN, USER } from "../API/apiConfig"
import { useLocation, useNavigate } from "react-router-dom"
import { BsQrCode, BsCameraVideo, BsCameraVideoOff, BsUpload } from "react-icons/bs"
import { FiSearch, FiX, FiDownload, FiEye } from "react-icons/fi"
import Popup from "../Components/Popup"
import QrScanner from "qr-scanner"
import FilePreviewModal from "../Components/FilePreviewModal";
import LoadingSpinner from "../Components/LoadingComponent";
import AutoTranslate from '../i18n/AutoTranslate';
import { useLanguage } from '../i18n/LanguageContext';

const SearchByScan = () => {
  const {
    currentLanguage,
    defaultLanguage,
    translationStatus,
    isTranslationNeeded,
    availableLanguages,
    changeLanguage,
    translate,
    preloadTranslationsForTerms
  } = useLanguage();

  const navigate = useNavigate()
  const [headerData, setHeaderData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [openingFiles, setOpeningFiles] = useState({})
  const [qrData, setQrData] = useState(null)
  const [loginBranchid, setLoginBranchid] = useState(null)
  const [loginDepartmentid, setLoginDepartmentid] = useState(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [error, setError] = useState(null)
  const token = localStorage.getItem("tokenKey")
  const userId = localStorage.getItem("userId")
  const role = localStorage.getItem("role")
  const [popupMessage, setPopupMessage] = useState(null)
  const location = useLocation()
  const [file, setFile] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [blobUrl, setBlobUrl] = useState("")
  const [contentType, setContentType] = useState("")
  const [selectedDocFile, setSelectedDocFile] = useState(null)
  const [searchFileTerm, setSearchFileTerm] = useState("")
  const [isCameraLoading, setIsCameraLoading] = useState(false)
  const [availableCameras, setAvailableCameras] = useState([])
  const [selectedCamera, setSelectedCamera] = useState(null)
  const [scanSuccess, setScanSuccess] = useState(false)
  const [isOpeningFile, setIsOpeningFile] = useState(false)

  const videoRef = useRef(null)
  const qrScannerRef = useRef(null)
  const fileInputRef = useRef(null)
  const scanSectionRef = useRef(null)
  const showRejInfo = headerData?.ifRejected === true
  const showAppro = headerData?.ifApproved === true
  const showRejectionReason = headerData?.ifRejected === true

  const unauthorizedMessage = "You are not authorized to scan this QR code."
  const invalidQrMessage = <AutoTranslate>Invalid QR Code.</AutoTranslate>
  const cameraErrorMessage = <AutoTranslate>Could not access camera. Please check permissions and try again.</AutoTranslate>

  // Debug log
  useEffect(() => {
    console.log('🔍 SearchByScan Component - Language Status:', {
      currentLanguage,
      defaultLanguage,
      isTranslationNeeded: isTranslationNeeded(),
      translationStatus,
      availableLanguagesCount: availableLanguages.length,
      pathname: window.location.pathname
    });
  }, [currentLanguage, defaultLanguage, translationStatus, isTranslationNeeded, availableLanguages]);

  // Check camera permissions and get available cameras
  const checkCameraPermissions = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter((device) => device.kind === "videoinput")
      setAvailableCameras(videoDevices)
      if (videoDevices.length > 0) {
        setSelectedCamera(videoDevices[0].deviceId)
        return true
      }
      setError(<AutoTranslate>No camera devices found</AutoTranslate>)
      return false
    } catch (err) {
      console.error("Camera permission error:", err)
      setError(<AutoTranslate>Please allow camera access to scan QR codes</AutoTranslate>)
      return false
    }
  }

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop()
        qrScannerRef.current.destroy()
        qrScannerRef.current = null
      }
    }
  }, [])

  // Handle camera activation/deactivation
  useEffect(() => {
    const initCamera = async () => {
      try {
        if (cameraActive && videoRef.current && !qrScannerRef.current) {
          qrScannerRef.current = new QrScanner(
            videoRef.current,
            (result) => {
              if (result) {
                setQrData(result.data)
                setScanSuccess(true)
                setTimeout(() => setScanSuccess(false), 2000)
                stopCamera()
              }
            },
            {
              preferredCamera: selectedCamera || "environment",
              highlightScanRegion: true,
              highlightCodeOutline: true,
              maxScansPerSecond: 5,
            },
          )

          await qrScannerRef.current.start()
        }
      } catch (err) {
        console.error("Camera error:", err)
        setError(cameraErrorMessage)
        stopCamera()
      }
    }

    initCamera()

    return () => {
      if (!cameraActive && qrScannerRef.current) {
        stopCamera()
      }
    }
  }, [cameraActive, selectedCamera])

  const stopCamera = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop()
      qrScannerRef.current.destroy()
      qrScannerRef.current = null
    }
    setCameraActive(false)
    setIsCameraLoading(false)
  }

  const handleToggleCamera = async () => {
    if (cameraActive) {
      stopCamera()
    } else {
      setIsCameraLoading(true)
      setError(null)
      try {
        if (await checkCameraPermissions()) {
          setCameraActive(true)
        }
      } finally {
        setIsCameraLoading(false)
      }
    }
  }

  const handleQrCheck = (qrParams) => {
    let isUnauthorized = false

    console.log("curr br", loginBranchid)
    console.log("curr dept", loginDepartmentid)
    console.log("doc br", qrParams.branchId)
    console.log("doc dept", qrParams.departmentId)

    if (role === BRANCH_ADMIN) {
      isUnauthorized = Number(loginBranchid) !== Number(qrParams.branchId);
    } else if (role === DEPARTMENT_ADMIN) {
      isUnauthorized =
        Number(loginBranchid) !== Number(qrParams.branchId) ||
        Number(loginDepartmentid) !== Number(qrParams.departmentId);
    } else if (role === USER) {
      isUnauthorized = Number(userId) !== Number(qrParams.empId);
    }

    if (isUnauthorized) {
      showPopup(unauthorizedMessage, "warning")
      return true
    }
    return false
  }

  useEffect(() => {
    fetchLoginUser()
  }, [userId, token])

  useEffect(() => {
    const params = new URLSearchParams(location.search)

    const branchId = params.get("b")
    const departmentId = params.get("d")
    const empId = params.get("e")
    const id = params.get("id")

    if (!id && !branchId && !departmentId && !empId) {
      return
    }

    if ((!branchId || !departmentId || !empId) && id) {
      showPopup(invalidQrMessage, "error")
      return
    }

    if (id) {
      const qrParams = { branchId, departmentId, empId }

      if (!handleQrCheck(qrParams)) {
        fetchDocument(id)
      }
    }
  }, [location.search])

  useEffect(() => {
    if (!qrData) return

    let params
    try {
      const queryString = qrData.split("?")[1]
      if (!queryString) {
        console.log("No parameters provided in the QR code")
        return
      }

      params = new URLSearchParams(queryString)
    } catch (error) {
      console.error("Invalid QR data format:", error)
      return
    }

    const branchId = params.get("b")
    const departmentId = params.get("d")
    const empId = params.get("e")
    const id = params.get("id")

    if (!id && !branchId && !departmentId && !empId) {
      console.log("No parameters provided in the QR code")
      return
    }

    if ((!branchId || !departmentId || !empId) && id) {
      showPopup(invalidQrMessage, "error")
      return
    }

    if (id) {
      const qrParams = { branchId, departmentId, empId }

      if (!handleQrCheck(qrParams)) {
        fetchDocument(id)
      }
    }
  }, [qrData])

  const showPopup = (message, type = "info") => {
    setPopupMessage({
      message,
      type,
      onClose: () => {
        setPopupMessage(null);
        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    });
  };

  const fetchLoginUser = async () => {
    if (!userId || !token) {
      console.error("userId or token is missing")
      return
    }

    try {
      const response = await apiClient.get(`${API_HOST}/employee/findById/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.status === 200) {
        const { branch, department } = response.data || {}
        if (branch && department) {
          setLoginBranchid(branch.id)
          setLoginDepartmentid(department.id)
        } else {
          console.error("Branch or Department data is missing in the response")
        }
      } else {
        console.error("Failed to fetch user data:", response.statusText)
      }
    } catch (error) {
      console.error("Error during API call:", error)
      if (error.response) {
        console.error("Server error:", error.response.data)
      } else if (error.request) {
        console.error("No response received from the server:", error.request)
      } else {
        console.error("Request error:", error.message)
      }
    }
  }

  const fetchDocument = async (id) => {
    if (!id) {
      setError(<AutoTranslate>No document ID found.</AutoTranslate>)
      return
    }

    if (!token) {
      const currentUrl = window.location.href
      localStorage.setItem("redirectUrl", currentUrl)
      navigate("/login")
      return
    }

    setLoading(true)
    try {
      const response = await apiClient.get(`/api/documents/findBy/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setHeaderData(response.data)
      // Scroll to document section after load
      setTimeout(() => {
        scanSectionRef.current?.scrollIntoView({ behavior: "smooth" })
      }, 100)
    } catch (err) {
      if (err.response) {
        const errorMessage =
          err.response.status === 404
            ? <AutoTranslate>Document not found. Please check the ID.</AutoTranslate>
            : <AutoTranslate>Server error: {err.response.statusText} ({err.response.status})</AutoTranslate>
        setError(errorMessage)
      } else if (err.request) {
        setError(<AutoTranslate>No response from the server. Please try again later.</AutoTranslate>)
      } else {
        setError(<AutoTranslate>Error occurred while setting up the request.</AutoTranslate>)
      }
    } finally {
      setLoading(false)
    }
  }

  const handlePopupClose = () => {
    setFile(null)
    const imageElement = document.getElementById("uploaded-image")
    if (imageElement) {
      imageElement.src = ""
      imageElement.classList.add("hidden")
    }
    navigate("/searchByScan")
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]

    if (selectedFile) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageElement = document.getElementById("uploaded-image")
        imageElement.src = e.target.result
        imageElement.classList.remove("hidden")
      }
      reader.readAsDataURL(selectedFile)

      setFile(selectedFile)
      setTimeout(() => {
        handleSubmit(selectedFile)
      }, 2000)
    }
  }

  const handleSubmit = async (currentFile) => {
    const fileToSubmit = currentFile || file

    if (!fileToSubmit) {
      showPopup("Please select a file", "warning")
      return
    }

    const formData = new FormData()
    formData.append("file", fileToSubmit)

    try {
      const response = await apiClient.post("/api/documents/read", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })

      if (response.status === 200) {
        const qrContent = response.data.qrContent

        if (!qrContent) {
          showPopup(invalidQrMessage, "error")
          return
        }

        const fragment = qrContent.split("#")[1]
        const params = new URLSearchParams(fragment.split("?")[1])
        const id = params.get("id")

        const qrParams = {
          branchId: params.get("b"),
          departmentId: params.get("d"),
          empId: params.get("e"),
        }

        if (id) {
          if (!handleQrCheck(qrParams)) {
            fetchDocument(id)
          }
        } else {
          showPopup(invalidQrMessage, "error")
        }
      }
    } catch (error) {
      showPopup(invalidQrMessage, "error")
    }
  }

  const openFile = async (file) => {
    try {
      // Set the selected file first
      setSelectedDocFile(file);
      setIsOpeningFile(true);

      // Use the same approach as in Approve component
      if (file.path) {
        const encodedPath = file.path.split("/").map(encodeURIComponent).join("/");
        const fileUrl = `${API_HOST}/api/documents/download/${encodedPath}?action=view`;

        const response = await apiClient.get(fileUrl, {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        });

        const blob = new Blob([response.data], { type: response.headers["content-type"] });
        const url = URL.createObjectURL(blob);

        setBlobUrl(url);
        setContentType(response.headers["content-type"]);
        setSearchFileTerm("");
        setIsModalOpen(true);
      } else {
        // Fallback to path-based URL (similar to Approve component)
        const branch = headerData?.employee?.branch?.name?.replace(/ /g, "_");
        const department = headerData?.employee?.department?.name?.replace(/ /g, "_");
        const year = file.year || file.yearMaster?.name?.replace(/ /g, "_") || "unknown";
        const category = headerData?.categoryMaster?.name?.replace(/ /g, "_") || "unknown";
        const version = file.version;
        const fileName = file.docName?.replace(/ /g, "_");

        const fileUrl = `${API_HOST}/api/documents/download/${encodeURIComponent(branch || '')}/${encodeURIComponent(department || '')}/${encodeURIComponent(year || '')}/${encodeURIComponent(category || '')}/${encodeURIComponent(version || '')}/${encodeURIComponent(fileName || '')}?action=view`;

        const response = await apiClient.get(fileUrl, {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        });

        const blob = new Blob([response.data], { type: response.headers["content-type"] });
        const url = URL.createObjectURL(blob);

        setBlobUrl(url);
        setContentType(response.headers["content-type"]);
        setSearchFileTerm("");
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error("❌ Error fetching file:", error);

      let errorMessage = "Failed to fetch or preview the file.";
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = "Unauthorized. Please login again.";
        } else if (error.response.status === 404) {
          errorMessage = "File not found on server.";
        } else if (error.response.status === 403) {
          errorMessage = "You don't have permission to access this file.";
        }
      }

      showPopup(errorMessage, "error");
    } finally {
      setIsOpeningFile(false);
    }
  };

  const handleDownload = async (file, action = "download") => {
    if (!headerData || !file) {
      showPopup("Document data not available", "error");
      return;
    }

    try {
      setLoading(true);

      // Set the selected file for modal context
      if (action === "view") {
        setSelectedDocFile(file);
      }

      let fileUrl;

      // Check if we have a simple path or need to construct URL
      if (file.path && typeof file.path === 'string') {
        // Clean the path - remove query parameters if any
        const cleanPath = file.path.split('?')[0];
        const encodedPath = cleanPath.split("/").map(encodeURIComponent).join("/");
        fileUrl = `${API_HOST}/api/documents/download/${encodedPath}`;
      } else {
        // Construct URL from data (fallback)
        const branch = headerData?.branchMaster?.name || headerData?.employee?.branch?.name;
        const department = headerData?.departmentMaster?.name || headerData?.employee?.department?.name;
        const year = file.year || file.yearMaster?.name || "unknown";
        const category = headerData?.categoryMaster?.name || "unknown";
        const version = file.version || "1.0";
        const fileName = file.docName || "document";

        // Clean and encode values
        const cleanBranch = branch ? branch.replace(/ /g, "_") : "unknown";
        const cleanDept = department ? department.replace(/ /g, "_") : "unknown";
        const cleanYear = year ? year.toString().replace(/ /g, "_") : "unknown";
        const cleanCategory = category ? category.replace(/ /g, "_") : "unknown";
        const cleanVersion = version ? version.toString().replace(/ /g, "_") : "1.0";
        const cleanFileName = fileName ? fileName.replace(/ /g, "_") : "document";

        fileUrl = `${API_HOST}/api/documents/download/${encodeURIComponent(cleanBranch)
          }/${encodeURIComponent(cleanDept)
          }/${encodeURIComponent(cleanYear)
          }/${encodeURIComponent(cleanCategory)
          }/${encodeURIComponent(cleanVersion)
          }/${encodeURIComponent(cleanFileName)
          }`;
      }

      // Add action parameter only if it's NOT 'download' (default)
      // Some APIs treat 'download' as default and 'view' as special
      if (action && action !== 'download') {
        fileUrl += `?action=${action}`;
      }

      console.log('Download URL:', fileUrl);

      const response = await apiClient.get(fileUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: '*/*'
        },
        responseType: 'blob',
      });

      if (response.status !== 200) {
        throw new Error(`Download failed with status: ${response.status}`);
      }

      // Extract filename
      const contentDisposition = response.headers['content-disposition'];
      let filename = file.docName || 'document';

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }

      const blob = new Blob([response.data], {
        type: response.headers['content-type'] || 'application/octet-stream'
      });

      if (action === 'view') {
        // For viewing, set up modal
        const url = window.URL.createObjectURL(blob);
        setBlobUrl(url);
        setContentType(response.headers['content-type']);
        setIsModalOpen(true);
      } else {
        // For downloading, create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showPopup(`File "${filename}" downloaded successfully!`, "success");
      }

    } catch (error) {
      console.error("Download error details:", error);

      let errorMessage = "Failed to download file. Please try again.";

      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = "Unauthorized. Please login again.";
          navigate("/login");
        } else if (error.response.status === 403) {
          // 403 Forbidden - Common causes:
          // 1. User doesn't have permission for this branch/department
          // 2. Document is restricted
          // 3. Token expired or invalid
          errorMessage = "Access forbidden. You don't have permission to access this file.";

          // Try to get more details from error response
          try {
            const errorData = await error.response.data.text();
            const parsedError = JSON.parse(errorData);
            if (parsedError.message) {
              errorMessage = parsedError.message;
            }
          } catch (e) {
            // Ignore parsing errors
          }
        } else if (error.response.status === 404) {
          errorMessage = "File not found on server.";
        } else if (error.response.status === 400) {
          errorMessage = "Bad request. The file path might be incorrect.";
        }
      } else if (error.request) {
        errorMessage = "Network error. Please check your connection.";
      }

      showPopup(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleModalDownload = (action = "download") => {
    if (!selectedDocFile) {
      showPopup("No file selected for download", "error");
      return;
    }
    handleDownload(selectedDocFile, action);
  };


  const filteredDocFiles = useMemo(() => {
    const files = headerData?.documentDetails || []

    if (!Array.isArray(files)) return []

    return files.filter((file) => {
      const name = file.docName?.toLowerCase() || ""
      const version = String(file.version).toLowerCase()
      const term = searchFileTerm.toLowerCase()
      return name.includes(term) || version.includes(term)
    })
  }, [headerData, searchFileTerm])

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const options = {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
    return date.toLocaleString("en-GB", options).replace(",", "")
  }

  const actionByName =
    headerData?.ifRejected === true
      ? <AutoTranslate>Rejected</AutoTranslate>
      : headerData?.ifApproved === true
        ? <AutoTranslate>Approved</AutoTranslate>
        : null

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        <AutoTranslate>Search Document Using QR Code</AutoTranslate>
      </h1>

      {popupMessage && <Popup message={popupMessage.message} type={popupMessage.type} onClose={handlePopupClose} />}

      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Scan Section */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8" ref={scanSectionRef}>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          <AutoTranslate>Scan QR Code</AutoTranslate>
        </h2>

        {!headerData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* File Upload Card */}
            <div className="bg-gray-50 p-6 rounded-lg border-2 border-dashed border-gray-300 hover:border-indigo-500 transition-colors duration-300">
              <div className="flex flex-col items-center justify-center h-full">
                <div className="relative w-full max-w-xs h-64 mb-4">
                  <div className="absolute inset-0 border-4 border-indigo-200 rounded-lg pointer-events-none"></div>
                  <img
                    id="uploaded-image"
                    className="w-full h-full object-contain rounded-lg"
                    src={file ? URL.createObjectURL(file) : ""}
                    alt={file ? <AutoTranslate>Uploaded QR Code</AutoTranslate> : <AutoTranslate>Click to upload</AutoTranslate>}
                    style={{ display: file ? "block" : "none" }}
                  />
                  {!file && (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                      <BsQrCode className="text-6xl opacity-30" />
                    </div>
                  )}
                </div>

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  ref={fileInputRef}
                />
                <button
                  onClick={() => fileInputRef.current.click()}
                  className="flex items-center justify-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-300"
                >
                  <BsUpload className="mr-2" />
                  {file ? <AutoTranslate>Change QR Image</AutoTranslate> : <AutoTranslate>Upload QR Code</AutoTranslate>}
                </button>
                {file && (
                  <button
                    onClick={() => setFile(null)}
                    className="mt-2 text-sm text-gray-500 hover:text-gray-700 flex items-center"
                  >
                    <FiX className="mr-1" /> <AutoTranslate>Clear</AutoTranslate>
                  </button>
                )}
              </div>
            </div>

            {/* Camera Card */}
            <div className="bg-gray-50 p-6 rounded-lg border-2 border-gray-200">
              <div className="flex flex-col items-center justify-center h-full">
                {!cameraActive ? (
                  <>
                    <div className="w-full max-w-xs h-64 mb-4 bg-gray-200 rounded-lg flex items-center justify-center">
                      <BsCameraVideo className="text-6xl text-gray-400" />
                    </div>
                    <button
                      onClick={handleToggleCamera}
                      disabled={isCameraLoading}
                      className={`flex items-center justify-center px-6 py-3 rounded-lg transition-colors duration-300 ${isCameraLoading
                        ? "bg-gray-500 cursor-not-allowed"
                        : "bg-indigo-600 text-white hover:bg-indigo-700"
                        }`}
                    >
                      {isCameraLoading ? (
                        <LoadingSpinner size="sm" className="mr-2" />
                      ) : (
                        <BsCameraVideo className="mr-2" />
                      )}
                      {isCameraLoading ? <AutoTranslate>Loading...</AutoTranslate> : <AutoTranslate>Open Camera</AutoTranslate>}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="relative w-full max-w-xs h-64 mb-4 rounded-lg overflow-hidden">
                      <video
                        ref={videoRef}
                        className="w-full h-full object-cover"
                        playsInline
                      />
                      {scanSuccess && (
                        <div className="absolute inset-0 flex items-center justify-center bg-green-500 bg-opacity-70">
                          <div className="text-white text-lg font-semibold">
                            <AutoTranslate>Scan</AutoTranslate><AutoTranslate> Successful</AutoTranslate>
                          </div>
                        </div>
                      )}
                      {error && (
                        <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center text-white p-4">
                          {error}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col w-full max-w-xs">
                      {availableCameras.length > 1 && (
                        <select
                          value={selectedCamera}
                          onChange={(e) => setSelectedCamera(e.target.value)}
                          className="mb-3 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {availableCameras.map((camera) => (
                            <option key={camera.deviceId} value={camera.deviceId}>
                              {camera.label || <AutoTranslate>Camera</AutoTranslate>}{availableCameras.indexOf(camera) + 1}
                            </option>
                          ))}
                        </select>
                      )}

                      <button
                        onClick={handleToggleCamera}
                        className="flex items-center justify-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-300"
                      >
                        <BsCameraVideoOff className="mr-2" />
                        <AutoTranslate>Close Camera</AutoTranslate>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Document Details Section */}
      {headerData && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-8 transition-all duration-300">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">
              <AutoTranslate>Document</AutoTranslate>
            </h2>
            <button
              onClick={() => {
                setHeaderData(null)
                setFile(null)
                setQrData(null)
                setSelectedDocFile(null)
              }}
              className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
            >
              <FiX className="mr-1" /> <AutoTranslate>Scan Another</AutoTranslate>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-500 mb-1">
                <AutoTranslate>File No.</AutoTranslate>
              </label>
              <p className="text-gray-800 font-medium">{headerData?.fileNo || "N/A"}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-500 mb-1">
                <AutoTranslate>Title</AutoTranslate>
              </label>
              <p className="text-gray-800 font-medium">{headerData?.title || "N/A"}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-500 mb-1">
                <AutoTranslate>Subject</AutoTranslate>
              </label>
              <p className="text-gray-800 font-medium">{headerData?.subject || "N/A"}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-500 mb-1">
                <AutoTranslate>Category</AutoTranslate>
              </label>
              <p className="text-gray-800 font-medium">{headerData?.categoryMaster?.name || "N/A"}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-500 mb-1">
                <AutoTranslate>Uploaded Date</AutoTranslate>
              </label>
              <p className="text-gray-800 font-medium">{formatDate(headerData?.createdOn) || "N/A"}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-500 mb-1">
                <AutoTranslate>Uploaded By</AutoTranslate>
              </label>
              <p className="text-gray-800 font-medium">{headerData?.employee?.name || "N/A"}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-500 mb-1">
                <AutoTranslate>Department</AutoTranslate>
              </label>
              <p className="text-gray-800 font-medium">{headerData?.departmentMaster?.name || "N/A"}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-500 mb-1">
                <AutoTranslate>Branch</AutoTranslate>
              </label>
              <p className="text-gray-800 font-medium">{headerData?.branchMaster?.name || "N/A"}</p>
            </div>
          </div>

          {/* Attached Files Section */}
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                <AutoTranslate>Attached Files</AutoTranslate>
              </h3>
              <div className="relative w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiSearch className="text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search files..."
                  value={searchFileTerm}
                  onChange={(e) => setSearchFileTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {searchFileTerm && (
                  <button
                    onClick={() => setSearchFileTerm("")}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <FiX className="text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
            </div>

            {filteredDocFiles?.length > 0 ? (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto bg-indigo-50">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-indigo-700 uppercase">
                          <AutoTranslate>S.N.</AutoTranslate>
                        </th>

                        <th className="px-6 py-3 text-left text-xs font-medium text-indigo-700 uppercase">
                          <AutoTranslate>Document Name</AutoTranslate>
                        </th>

                        <th className="px-6 py-3 text-left text-xs font-medium text-indigo-700 uppercase">
                          <AutoTranslate>Year</AutoTranslate>
                        </th>

                        <th className="px-6 py-3 text-left text-xs font-medium text-indigo-700 uppercase">
                          <AutoTranslate>Version</AutoTranslate>
                        </th>

                        {showAppro && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-indigo-700 uppercase">
                            <AutoTranslate>Approved By</AutoTranslate>
                          </th>
                        )}

                        {showRejInfo && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-indigo-700 uppercase">
                            <AutoTranslate>Rejected By</AutoTranslate>
                          </th>
                        )}

                        {showRejectionReason && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-indigo-700 uppercase">
                            <AutoTranslate>Rejection Reason</AutoTranslate>
                          </th>
                        )}

                        <th className="px-6 py-3 text-center text-xs font-medium text-indigo-700 uppercase">
                          <AutoTranslate>Actions</AutoTranslate>
                        </th>
                      </tr>
                    </thead>

                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredDocFiles.map((file, index) => {
                        const displayName = file.docName?.includes("_")
                          ? file.docName.split("_").slice(1).join("_")
                          : file.docName;

                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {index + 1}
                            </td>

                            <td
                              className="px-6 py-4 text-sm text-gray-800 max-w-xs truncate"
                              title={displayName}
                            >
                              {displayName}
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {file.yearMaster?.name || "N/A"}
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {file.version}
                            </td>

                            {showAppro && (
                              <td
                                className="px-6 py-4 text-sm text-gray-800 max-w-xs truncate"
                                title={file?.approvedBy}
                              >
                                {file?.approvedBy || "N/A"}
                              </td>
                            )}

                            {showRejInfo && (
                              <td
                                className="px-6 py-4 text-sm text-gray-800 max-w-xs truncate"
                                title={file?.rejectedBy}
                              >
                                {file?.rejectedBy || "N/A"}
                              </td>
                            )}

                            {showRejectionReason && (
                              <td
                                className="px-6 py-4 text-sm text-gray-800 max-w-xs truncate"
                                title={file?.rejectionReason}
                              >
                                {file?.rejectionReason || "N/A"}
                              </td>
                            )}

                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end space-x-2 flex-nowrap">
                                <button
                                  onClick={() => openFile(file)}
                                  disabled={isOpeningFile}
                                  className={`inline-flex items-center px-3 py-1 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${isOpeningFile
                                    ? "bg-indigo-300 cursor-not-allowed"
                                    : "bg-indigo-600 hover:bg-indigo-700"
                                    }`}
                                >
                                  <FiEye className="mr-1" />
                                  {isOpeningFile ? (
                                    <AutoTranslate>Opening...</AutoTranslate>
                                  ) : (
                                    <AutoTranslate>View</AutoTranslate>
                                  )}
                                </button>

                                <button
                                  onClick={() => handleDownload(file, 'download')}
                                  className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                >
                                  <FiDownload className="mr-1" />
                                  <AutoTranslate>Download</AutoTranslate>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">
                  <AutoTranslate>No attached files available</AutoTranslate>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <FilePreviewModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setBlobUrl("");
          setSelectedDocFile(null);
        }}
        onDownload={(action) => {
          // Ensure action is a string
          const downloadAction = typeof action === 'string' ? action : 'download';
          handleModalDownload(downloadAction);
        }}
        fileType={contentType}
        fileUrl={blobUrl}
        fileName={selectedDocFile?.docName}
        fileData={selectedDocFile}
      />
    </div>
  )
}

export default SearchByScan