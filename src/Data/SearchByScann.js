"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import apiClient from "../API/apiClient"
import { API_HOST, BRANCH_ADMIN, DEPARTMENT_ADMIN, USER } from "../API/apiConfig"
import { useLocation, useNavigate } from "react-router-dom"
import { BsQrCode } from "react-icons/bs"
import Popup from "../Components/Popup"
import QrScanner from "qr-scanner"
import FilePreviewModal from "../Components/FilePreviewModal"

const SearchByScan = () => {
  const navigate = useNavigate()
  const [headerData, setHeaderData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [qrEmpid, setQrEmpid] = useState(null)
  const [qrBranchid, setQrBranchid] = useState(null)
  const [qrDepartmentid, setQrDepartmentid] = useState(null)
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
  const [isOpeningFile, setIsOpeningFile] = useState(false)
  const [isCameraLoading, setIsCameraLoading] = useState(false)
  const [availableCameras, setAvailableCameras] = useState([])
  const [selectedCamera, setSelectedCamera] = useState(null)

  const videoRef = useRef(null)
  const qrScannerRef = useRef(null)
  const fileInputRef = useRef(null)

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
      isUnauthorized = loginBranchid != qrParams.branchId
    } else if (role === DEPARTMENT_ADMIN) {
      isUnauthorized = loginBranchid != qrParams.branchId || loginDepartmentid != qrParams.departmentId
    } else if (role === USER) {
      isUnauthorized = userId != qrParams.empId
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
    if (branchId && departmentId && empId) {
      setQrBranchid(branchId)
      setQrDepartmentid(departmentId)
      setQrEmpid(empId)
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

    if (branchId && departmentId && empId) {
      setQrBranchid(branchId)
      setQrDepartmentid(departmentId)
      setQrEmpid(empId)

      console.log("Extracted QR data:", { empId, branchId, departmentId })
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
        console.log("login user data", response.data)
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

    try {
      const response = await apiClient.get(`/api/documents/findBy/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setHeaderData(response.data)
      console.log(response.data)
    } catch (err) {
      if (err.response) {
        console.error("Error response from server:", err.response.data)
        const errorMessage =
          err.response.status === 404
            ? "Document not found. Please check the ID."
            : `Server error: ${err.response.statusText} (${err.response.status})`
        setError(errorMessage)
      } else if (err.request) {
        console.error("No response received:", err.request)
        setError("No response from the server. Please try again later.")
      } else {
        console.error("Request error:", err.message)
        setError("Error occurred while setting up the request.")
      }
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

        setQrBranchid(qrParams.branchId || null)
        setQrDepartmentid(qrParams.departmentId || null)
        setQrEmpid(qrParams.empId || null)

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
      setIsOpeningFile(true)
      console.log("Opening file:", file)

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
      setIsOpeningFile(false)
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
    <div className="p-1">
      <h1 className="text-md mb-2 font-semibold">DOCUMENT SEARCH BY QR CODES</h1>
      <div className="bg-white p-1 rounded-lg shadow-sm">
        {popupMessage && <Popup message={popupMessage.message} type={popupMessage.type} onClose={handlePopupClose} />}

        {headerData && (
          <>
            <div className="mb-2 bg-slate-100 p-1 rounded-lg">
              <div className="grid grid-cols-4 gap-4">
                <label className="block text-sm font-medium text-gray-700">
                  File No.
                  <input
                    disabled
                    value={headerData?.fileNo}
                    className="mt-1 block w-full p-1.5 text-sm border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                <label className="block text-sm font-medium text-gray-700">
                  Title
                  <input
                    disabled
                    value={headerData?.title}
                    className="mt-1 block w-full p-1.5 text-sm border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                <label className="block text-sm font-medium text-gray-700">
                  Subject
                  <input
                    disabled
                    value={headerData?.subject}
                    className="mt-1 block w-full p-1.5 text-sm border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                <label className="block text-sm font-medium text-gray-700">
                  Category
                  <input
                    disabled
                    value={headerData?.categoryMaster?.name}
                    className="mt-1 block w-full p-1.5 text-sm border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                <label className="block text-sm font-medium text-gray-700">
                  Uploaded Date
                  <input
                    disabled
                    value={formatDate(headerData?.createdOn)}
                    className="mt-1 block w-full p-1.5 text-sm border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                <label className="block text-sm font-medium text-gray-700">
                  Uploded By
                  <input
                    disabled
                    value={headerData?.employee?.name}
                    className="mt-1 block w-full p-1.5 text-sm border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                <label className="block text-sm font-medium text-gray-700">
                  Department
                  <input
                    disabled
                    value={headerData?.employee?.department?.name}
                    className="mt-1 block w-full p-1.5 text-sm border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                <label className="block text-sm font-medium text-gray-700">
                  Branch
                  <input
                    disabled
                    value={headerData?.employee?.branch?.name}
                    className="mt-1 block w-full p-1.5 text-sm border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                <label className="block text-sm font-medium text-gray-700">
                  Document Status
                  <input
                    disabled
                    value={headerData?.approvalStatus}
                    className="mt-1 block w-full p-1.5 text-sm border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                {headerData?.approvalStatus !== "PENDING" && (
                  <>
                    <label className="block text-sm font-medium text-gray-700">
                      {actionByName} Date
                      <input
                        disabled
                        value={formatDate(headerData?.approvalStatusOn)}
                        className="mt-1 block w-full p-1.5 text-sm border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </label>

                    <label className="block text-sm font-medium text-gray-700">
                      {actionByName} By
                      <input
                        disabled
                        value={headerData?.employeeBy?.name}
                        className="mt-1 block w-full p-1.5 text-sm border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </label>
                  </>
                )}
                {headerData?.approvalStatus === "REJECTED" && (
                  <>
                    <label className="block text-sm font-medium text-gray-700">
                      Rejected Reason
                      <input
                        disabled
                        value={headerData?.rejectionReason}
                        className="mt-1 block w-full p-1.5 text-sm border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </label>
                  </>
                )}

                <label className="block text-sm font-medium text-gray-700">
                  Document Year
                  <input
                    disabled
                    value={headerData?.yearMaster?.name}
                    className="mt-1 block w-full p-1.5 text-sm border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>
              </div>

              <FilePreviewModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onDownload={handleDownload}
                fileType={contentType}
                fileUrl={blobUrl}
                fileName={selectedDocFile?.docName}
                fileData={selectedDocFile}
              />

              <div className="mt-3 text-center">
                <div className="mt-3 relative">
                  <div className="flex justify-center">
                    <h2 className="text-md font-semibold text-indigo-700">Attached Files</h2>
                  </div>
                  <div className="absolute right-0 top-0">
                    <input
                      type="text"
                      placeholder="Search Files..."
                      value={searchFileTerm}
                      onChange={(e) => setSearchFileTerm(e.target.value)}
                      className="px-2 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {filteredDocFiles?.length > 0 ? (
                  <div className="mt-4 border border-gray-300 rounded-md overflow-hidden">
                    {/* Fixed Header */}
                    <div className="bg-indigo-100 border-b border-gray-300">
                      <table className="min-w-full table-fixed text-sm">
                        <thead>
                          <tr>
                            <th className="w-12 border-r border-gray-300 px-2 py-2 text-center font-semibold">S.N.</th>
                            <th className="border-r border-gray-300 px-2 py-2 text-left w-1/2 font-semibold">
                              Document Name
                            </th>
                            <th className="w-24 border-r border-gray-300 px-2 py-2 text-center font-semibold">
                              Version
                            </th>
                            <th className="w-28 px-2 py-2 text-center font-semibold">Action</th>
                          </tr>
                        </thead>
                      </table>
                    </div>

                    {/* Scrollable Body - Shows max 5 rows with scroll */}
                    <div
                      className="overflow-y-auto"
                      style={{
                        maxHeight: filteredDocFiles.length > 5 ? "200px" : "auto",
                      }}
                    >
                      <table className="min-w-full table-fixed text-sm">
                        <tbody>
                          {filteredDocFiles.map((file, index) => {
                            const displayName = file.docName?.includes("_")
                              ? file.docName.split("_").slice(1).join("_")
                              : file.docName

                            return (
                              <tr
                                key={index}
                                className={`hover:bg-gray-50 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                              >
                                <td className="w-12 border-r border-gray-200 px-2 py-2 text-center">{index + 1}</td>
                                <td
                                  className="border-r border-gray-200 px-2 py-2 w-1/2 break-words"
                                  title={displayName}
                                >
                                  <div className="truncate">{displayName}</div>
                                </td>
                                <td className="w-24 border-r border-gray-200 px-2 py-2 text-center">{file.version}</td>
                                <td className="w-28 px-2 py-2 text-center">
                                  <button
                                    onClick={() => {
                                      setSelectedDocFiles(file)
                                      openFile(file)
                                    }}
                                    disabled={isOpeningFile}
                                    className={`bg-indigo-500 text-white px-3 py-1 rounded-md transition duration-300 text-xs no-print ${
                                      isOpeningFile ? "opacity-50 cursor-not-allowed" : "hover:bg-indigo-600"
                                    }`}
                                  >
                                    {isOpeningFile ? "Opening..." : "Open"}
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Show total count if more than 5 items */}
                    {filteredDocFiles.length > 5 && (
                      <div className="bg-gray-50 px-2 py-1 text-xs text-gray-600 text-center border-t border-gray-300">
                        Showing {Math.min(5, filteredDocFiles.length)} of {filteredDocFiles.length} files (scroll to see
                        more)
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mt-2">No attached files available.</p>
                )}
              </div>
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
          {!headerData && (
            <>
              <div className="w-72 h-[312px] items-center justify-center ">
                <div className="p-6 max-w-lg mx-auto bg-white shadow-md rounded-md relative w-72 h-72">
                  <div className="absolute top-0 left-0 right-0 bottom-0 border-t-2 border-indigo-500 animate-scan-line"></div>
                  <img
                    id="uploaded-image"
                    className="object-cover w-full h-full"
                    src={file ? URL.createObjectURL(file) : ""}
                    alt={file ? "Uploaded QR Code" : "Click to upload"}
                    style={{ display: file ? "block" : "none" }}
                  />
                </div>
                <form onSubmit={handleSubmit} className="relative z-10 ">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                    ref={fileInputRef}
                  />
                  <div
                    className="w-[60%] mt-2 h-full flex justify-center items-center border border-gray-300 rounded-lg overflow-hidden cursor-pointer"
                    onClick={() => fileInputRef.current.click()}
                  >
                    {!file && (
                      <p className="flex gap-3 items-center justify-center text-gray-500">
                        <BsQrCode />
                        Choose QR Code
                      </p>
                    )}
                  </div>
                </form>
              </div>

              <div className="flex flex-col items-center w-72 h-[312px] p-4">
                {!cameraActive && (
                  <button
                    onClick={handleToggleCamera}
                    disabled={isCameraLoading}
                    className={`px-4 py-2 text-white font-semibold rounded-md transition duration-200
                      ${isCameraLoading ? "bg-gray-500 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"}`}
                  >
                    {isCameraLoading ? "Loading..." : "Open Camera"}
                  </button>
                )}

                {cameraActive && (
                  <div className="mt-4 flex flex-col items-center">
                    <div className="relative w-full max-w-xs">
                      <video ref={videoRef} className="w-full h-auto border border-gray-300 rounded" playsInline />
                      {error && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center text-white">
                          {error}
                        </div>
                      )}
                      <button
                        onClick={handleToggleCamera}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600"
                        title="Close camera"
                      >
                        ✕
                      </button>
                    </div>

                    {availableCameras.length > 1 && (
                      <div className="mt-2 w-full">
                        <label className="block text-sm font-medium text-gray-700">
                          Camera
                          <select
                            value={selectedCamera}
                            onChange={(e) => setSelectedCamera(e.target.value)}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                          >
                            {availableCameras.map((camera) => (
                              <option key={camera.deviceId} value={camera.deviceId}>
                                {camera.label || `Camera ${availableCameras.indexOf(camera) + 1}`}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    )}

                    <p className="mt-2 text-sm text-gray-600">Point camera at QR code to scan</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default SearchByScan
