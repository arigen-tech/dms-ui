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

const SearchByScan = () => {
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
  const [selectedDocFile, setSelectedDocFiles] = useState(null)
  const [searchFileTerm, setSearchFileTerm] = useState("")
  const [isCameraLoading, setIsCameraLoading] = useState(false)
  const [availableCameras, setAvailableCameras] = useState([])
  const [selectedCamera, setSelectedCamera] = useState(null)
  const [scanSuccess, setScanSuccess] = useState(false)

  const videoRef = useRef(null)
  const qrScannerRef = useRef(null)
  const fileInputRef = useRef(null)
  const scanSectionRef = useRef(null)

  const unauthorizedMessage = "You are not authorized to scan this QR code."
  const invalidQrMessage = "Invalid QR Code."
  const cameraErrorMessage = "Could not access camera. Please check permissions and try again."

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
      setError("No camera devices found")
      return false
    } catch (err) {
      console.error("Camera permission error:", err)
      setError("Please allow camera access to scan QR codes")
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

    if (role === BRANCH_ADMIN) {
      isUnauthorized = loginBranchid !== qrParams.branchId
    } else if (role === DEPARTMENT_ADMIN) {
      isUnauthorized = loginBranchid !== qrParams.branchId || loginDepartmentid !== qrParams.departmentId
    } else if (role === USER) {
      isUnauthorized = userId !== qrParams.empId
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
    setPopupMessage({ message, type })
  }

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
      setError("No document ID found.")
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
            ? "Document not found. Please check the ID."
            : `Server error: ${err.response.statusText} (${err.response.status})`
        setError(errorMessage)
      } else if (err.request) {
        setError("No response from the server. Please try again later.")
      } else {
        setError("Error occurred while setting up the request.")
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
      setOpeningFiles(prev => ({ ...prev, [file.id]: true }))

      if (!file?.docName) {
        showPopup("Document name is missing. Please try again.")
        return
      }

      const branch = headerData?.employee?.branch?.name.replace(/ /g, "_")
      const department = headerData?.employee?.department?.name.replace(/ /g, "_")
      const year = headerData?.yearMaster?.name.replace(/ /g, "_")
      const category = headerData?.categoryMaster?.name.replace(/ /g, "_")

      const fileUrl = `${API_HOST}/api/documents/download/${encodeURIComponent(
        branch,
      )}/${encodeURIComponent(department)}/${encodeURIComponent(
        year,
      )}/${encodeURIComponent(category)}/${encodeURIComponent(file.version)}/${encodeURIComponent(file.docName)}`

      const response = await apiClient.get(fileUrl, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      })

      const blob = new Blob([response.data], { type: response.headers["content-type"] })
      const url = URL.createObjectURL(blob)

      setBlobUrl(url)
      setContentType(response.headers["content-type"])
      setSelectedDocFiles(file)
      setIsModalOpen(true)
    } catch (error) {
      console.error("Error:", error)
      showPopup("Failed to fetch or preview the file.", "error")
    } finally {
      setOpeningFiles(prev => ({ ...prev, [file.id]: false }))
    }
  }


  const handleDownload = async (file) => {
    try {
      const branch = headerData.employee.branch.name.replace(/ /g, "_")
      const department = headerData.employee.department.name.replace(/ /g, "_")
      const year = headerData.yearMaster.name.replace(/ /g, "_")
      const category = headerData.categoryMaster.name.replace(/ /g, "_")
      const version = file.version
      const fileName = file.docName.replace(/ /g, "_")

      const fileUrl = `${API_HOST}/api/documents/download/${encodeURIComponent(
        branch,
      )}/${encodeURIComponent(department)}/${encodeURIComponent(
        year,
      )}/${encodeURIComponent(category)}/${encodeURIComponent(version)}/${encodeURIComponent(fileName)}`

      const response = await apiClient.get(fileUrl, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      })

      const downloadBlob = new Blob([response.data], {
        type: response.headers["content-type"],
      })

      const link = document.createElement("a")
      link.href = window.URL.createObjectURL(downloadBlob)
      link.download = file.docName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)
    } catch (error) {
      console.error("Download error:", error)
      showPopup("Failed to download the file.", "error")
    }
  }

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
    headerData?.approvalStatus === "REJECTED"
      ? "Rejected"
      : headerData?.approvalStatus === "APPROVED"
        ? "Approved"
        : null

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Document Search by QR Code</h1>

      {popupMessage && <Popup message={popupMessage.message} type={popupMessage.type} onClose={handlePopupClose} />}

      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Scan Section */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8" ref={scanSectionRef}>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Scan QR Code</h2>

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
                    alt={file ? "Uploaded QR Code" : "Click to upload"}
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
                  {file ? "Change QR Image" : "Upload QR Code"}
                </button>
                {file && (
                  <button
                    onClick={() => setFile(null)}
                    className="mt-2 text-sm text-gray-500 hover:text-gray-700 flex items-center"
                  >
                    <FiX className="mr-1" /> Clear
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
                      {isCameraLoading ? "Loading..." : "Open Camera"}
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
                          <div className="text-white text-lg font-semibold">Scan Successful!</div>
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
                              {camera.label || `Camera ${availableCameras.indexOf(camera) + 1}`}
                            </option>
                          ))}
                        </select>
                      )}

                      <button
                        onClick={handleToggleCamera}
                        className="flex items-center justify-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-300"
                      >
                        <BsCameraVideoOff className="mr-2" />
                        Close Camera
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
            <h2 className="text-xl font-semibold text-gray-800">Document Details</h2>
            <button
              onClick={() => {
                setHeaderData(null)
                setFile(null)
                setQrData(null)
              }}
              className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
            >
              <FiX className="mr-1" /> Scan Another
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-500 mb-1">File No.</label>
              <p className="text-gray-800 font-medium">{headerData?.fileNo || "N/A"}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-500 mb-1">Title</label>
              <p className="text-gray-800 font-medium">{headerData?.title || "N/A"}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-500 mb-1">Subject</label>
              <p className="text-gray-800 font-medium">{headerData?.subject || "N/A"}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-500 mb-1">Category</label>
              <p className="text-gray-800 font-medium">{headerData?.categoryMaster?.name || "N/A"}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-500 mb-1">Uploaded Date</label>
              <p className="text-gray-800 font-medium">{formatDate(headerData?.createdOn) || "N/A"}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-500 mb-1">Uploaded By</label>
              <p className="text-gray-800 font-medium">{headerData?.employee?.name || "N/A"}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-500 mb-1">Department</label>
              <p className="text-gray-800 font-medium">{headerData?.employee?.department?.name || "N/A"}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-500 mb-1">Branch</label>
              <p className="text-gray-800 font-medium">{headerData?.employee?.branch?.name || "N/A"}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
              <p className={`font-medium ${headerData?.approvalStatus === "APPROVED" ? "text-green-600" :
                  headerData?.approvalStatus === "REJECTED" ? "text-red-600" : "text-yellow-600"
                }`}>
                {headerData?.approvalStatus || "N/A"}
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-500 mb-1">Document Year</label>
              <p className="text-gray-800 font-medium">{headerData?.yearMaster?.name || "N/A"}</p>
            </div>

            {headerData?.approvalStatus !== "PENDING" && (
              <>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-500 mb-1">{actionByName} Date</label>
                  <p className="text-gray-800 font-medium">{formatDate(headerData?.approvalStatusOn) || "N/A"}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-500 mb-1">{actionByName} By</label>
                  <p className="text-gray-800 font-medium">{headerData?.employeeBy?.name || "N/A"}</p>
                </div>
              </>
            )}

            {headerData?.approvalStatus === "REJECTED" && (
              <div className="bg-gray-50 p-4 rounded-lg col-span-1 md:col-span-2 lg:col-span-4">
                <label className="block text-sm font-medium text-gray-500 mb-1">Rejection Reason</label>
                <p className="text-gray-800 font-medium">{headerData?.rejectionReason || "N/A"}</p>
              </div>
            )}
          </div>

          {/* Attached Files Section */}
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Attached Files</h3>
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
                <div className="bg-indigo-50">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-indigo-700 uppercase tracking-wider">
                          S.N.
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-indigo-700 uppercase tracking-wider">
                          Document Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-indigo-700 uppercase tracking-wider">
                          Version
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-indigo-700 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredDocFiles.map((file, index) => {
                        const displayName = file.docName?.includes("_")
                          ? file.docName.split("_").slice(1).join("_")
                          : file.docName

                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {index + 1}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-800 max-w-xs truncate" title={displayName}>
                              {displayName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {file.version}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={() => openFile(file)}
                                  disabled={openingFiles[file.id]}
                                  className={`inline-flex items-center px-3 py-1 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${openingFiles[file.id]
                                      ? "bg-indigo-300 cursor-not-allowed"
                                      : "bg-indigo-600 hover:bg-indigo-700"
                                    }`}
                                >
                                  <FiEye className="mr-1" />
                                  {openingFiles[file.id] ? "Opening..." : "View"}
                                </button>
                                <button
                                  onClick={() => handleDownload(file)}
                                  className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                >
                                  <FiDownload className="mr-1" />
                                  Download
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No attached files available</p>
              </div>
            )}
          </div>
        </div>
      )}

      <FilePreviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDownload={handleDownload}
        fileType={contentType}
        fileUrl={blobUrl}
        fileName={selectedDocFile?.docName}
        fileData={selectedDocFile}
      />
    </div>
  )
}

export default SearchByScan