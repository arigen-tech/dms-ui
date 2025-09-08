import { useState, useEffect, useMemo, useRef } from "react"
import {
  DocumentDuplicateIcon,
  ArrowsRightLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  DocumentIcon,
  PhotoIcon,
  FilmIcon,
  SpeakerWaveIcon,
  ExclamationTriangleIcon,
  CodeBracketIcon,
} from "@heroicons/react/24/solid"
import axios from "axios"

import { DOCUMENTHEADER_API, API_HOST } from "../API/apiConfig"
import LoadingComponent from '../Components/LoadingComponent';
import Popup from '../Components/Popup';

const tokenKey = "tokenKey"

const imageExtensions = ["png", "jpg", "jpeg", "gif", "bmp", "svg", "tiff", "webp", "heic", "heif"]
const textExtensions = ["txt", "csv", "log", "xml", "html", "htm", "js", "jsx", "ts",
  "css", "scss", "json", "md", "yml", "yaml", "java", "py", "cpp",
  "c", "h", "php", "rb", "go", "rs", "swift", "kt"];
const textMimes = ["text/", "application/json", "application/xml", "application/javascript"];

function getExtension(nameOrType) {
  if (!nameOrType) return ""
  const lower = nameOrType.toLowerCase()
  // Try to extract extension from filename-like input
  if (lower.includes(".")) {
    const ext = lower.split(".").pop() || ""
    return ext.replace(/\?.*$/, "").replace(/#.*$/, "")
  }
  // If it's already an extension-like token (e.g., "png"), return as-is
  if (/^[a-z0-9]{2,10}$/.test(lower)) return lower
  // From content type like image/png
  if (lower.includes("/")) {
    return lower.split("/").pop() || ""
  }
  return ""
}

function isImageByMeta(fileType, contentType, fileName) {
  const extFromType = getExtension(fileType)
  const extFromName = getExtension(fileName)
  const isImgExt = imageExtensions.includes(extFromType) || imageExtensions.includes(extFromName)
  const isImgMime = (contentType || "").toLowerCase().includes("image/")
  return isImgExt || isImgMime
}

function isTextFile(fileType, contentType, fileName) {
  const extFromType = getExtension(fileType)
  const extFromName = getExtension(fileName)
  const isTextExt = textExtensions.includes(extFromType) || textExtensions.includes(extFromName)
  const isTextMime = textMimes.some(mime => (contentType || "").toLowerCase().includes(mime))
  return isTextExt || isTextMime
}

// Function to extract filename by removing the first part (before first underscore)
const extractFileName = (fullName) => {
  if (!fullName) return "Unknown"
  const fileNameParts = fullName.split("_")
  return fileNameParts.slice(1).join("_")
}

const FileCompare = () => {
  const [documentHeaders, setDocumentHeaders] = useState([])
  const [firstFileDocuments, setFirstFileDocuments] = useState([])
  const [secondFileDocuments, setSecondFileDocuments] = useState([])
  const [selectedFirstFileNo, setSelectedFirstFileNo] = useState("")
  const [selectedSecondFileNo, setSelectedSecondFileNo] = useState("")

  const [selectedFirstFileIds, setSelectedFirstFileIds] = useState([])
  const [selectedSecondFileIds, setSelectedSecondFileIds] = useState([])

  const [comparisonResult, setComparisonResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [popupMessage, setPopupMessage] = useState(null);

  const [isComparing, setIsComparing] = useState(false)
  const [showComparisonModal, setShowComparisonModal] = useState(false)
  const [fileUrls, setFileUrls] = useState({
    firstFile: null,
    secondFile: null,
  })
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [activeTab, setActiveTab] = useState("preview")

  const [warningMessage, setWarningMessage] = useState("")

  const token = typeof window !== "undefined" ? localStorage.getItem(tokenKey) : null

  useEffect(() => {
    fetchAllDocumentHeaders()
  }, [])

  useEffect(() => {
    if (warningMessage) {
      const timer = setTimeout(() => setWarningMessage(""), 5000)
      return () => clearTimeout(timer)
    }
  }, [warningMessage])

  const fetchAllDocumentHeaders = async () => {
    setIsLoading(true)
    try {
      const response = await axios.get(`${DOCUMENTHEADER_API}/getAll`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setDocumentHeaders(response.data || [])
    } catch (error) {
      console.error("Error fetching document headers:", error)
      showPopup("Failed to fetch document headers", "error")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchDocumentsByFileNo = async (fileNo, isFirst = true) => {
    try {
      const response = await axios.get(`${DOCUMENTHEADER_API}/getFile/${fileNo}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = response.data || {}

      if (isFirst) {
        setFirstFileDocuments(data.fileList || [])
        setSelectedFirstFileIds([])
      } else {
        setSecondFileDocuments(data.fileList || [])
        setSelectedSecondFileIds([])
      }

      setWarningMessage("")
    } catch (error) {
      console.error("Error fetching documents:", error)
      showPopup("Failed to fetch documents", "error")
    }
  }

  const handleFileSelection = (fileId, isFirst = true) => {
    const currentFirstCount = selectedFirstFileIds.length
    const currentSecondCount = selectedSecondFileIds.length
    const totalSelected = currentFirstCount + currentSecondCount

    if (isFirst) {
      const isAlreadySelected = selectedFirstFileIds.includes(fileId)
      if (isAlreadySelected) {
        setSelectedFirstFileIds((prev) => prev.filter((id) => id !== fileId))
        setWarningMessage("")
      } else {
        if (totalSelected >= 2) {
          setWarningMessage("Warning: You cannot select more than 2 documents in total across both files.")
          return
        }
        if (currentFirstCount >= 2) {
          setWarningMessage("Warning: You cannot select more than 2 documents in the first file.")
          return
        }
        setSelectedFirstFileIds((prev) => [...prev, fileId])
        setWarningMessage("")
      }
    } else {
      const isAlreadySelected = selectedSecondFileIds.includes(fileId)
      if (isAlreadySelected) {
        setSelectedSecondFileIds((prev) => prev.filter((id) => id !== fileId))
        setWarningMessage("")
      } else {
        if (totalSelected >= 2) {
          setWarningMessage("Warning: You cannot select more than 2 documents in total across both files.")
          return
        }
        if (currentSecondCount >= 2) {
          setWarningMessage("Warning: You cannot select more than 2 documents in the second file.")
          return
        }
        setSelectedSecondFileIds((prev) => [...prev, fileId])
        setWarningMessage("")
      }
    }
  }

  const getFilePreviewUrl = async (file, docHeader) => {
    try {
      const branch = docHeader?.employee?.branch?.name?.replace(/ /g, "_") || "Unknown"
      const department = docHeader?.employee?.department?.name?.replace(/ /g, "_") || "Unknown"
      const year = docHeader?.yearMaster?.name?.replace(/ /g, "_") || "Unknown"
      const category = docHeader?.categoryMaster?.name?.replace(/ /g, "_") || "Unknown"
      const version = file?.version || ""
      const fileName = file?.fileName?.replace(/ /g, "_") || file?.docName?.replace(/ /g, "_") || "Unknown"

      const fileUrl = `${API_HOST}/api/documents/download/${encodeURIComponent(
        branch,
      )}/${encodeURIComponent(department)}/${encodeURIComponent(year)}/${encodeURIComponent(
        category,
      )}/${encodeURIComponent(version)}/${encodeURIComponent(fileName)}`

      const response = await axios.get(fileUrl, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      })

      const blob = new Blob([response.data], { type: response.headers["content-type"] })
      const url = URL.createObjectURL(blob)

      return { url, contentType: response.headers["content-type"] }
    } catch (error) {
      console.error("Error fetching file preview:", error)
      return null
    }
  }

  const getFileTypeIcon = (fileType) => {
    const type = (fileType || "").toLowerCase()
    if (type.includes("pdf")) return <DocumentIcon className="h-5 w-5 text-red-500" />
    if (type.includes("doc") || type.includes("docx") || type.includes("txt") || type.includes("rtf"))
      return <DocumentIcon className="h-5 w-5 text-blue-500" />
    if (type.includes("xls") || type.includes("xlsx") || type.includes("csv"))
      return <DocumentIcon className="h-5 w-5 text-green-600" />
    if (type.includes("ppt") || type.includes("pptx")) return <DocumentIcon className="h-5 w-5 text-orange-500" />
    if (type.includes("image") || imageExtensions.includes(type)) return <PhotoIcon className="h-5 w-5 text-blue-500" />
    if (type.includes("svg") || type.includes("psd") || type.includes("ai") || type.includes("eps"))
      return <PhotoIcon className="h-5 w-5 text-purple-500" />
    if (type.includes("video") || ["mp4", "avi", "mov", "wmv", "flv", "h264", "h265"].includes(type))
      return <FilmIcon className="h-5 w-5 text-purple-500" />
    if (type.includes("audio") || ["mp3", "wav", "ogg", "aac"].includes(type))
      return <SpeakerWaveIcon className="h-5 w-5 text-green-500" />
    return <DocumentIcon className="h-5 w-5 text-gray-500" />
  }

  const renderFileViewer = (file, fileData, isFirst = true) => {
    if (!fileData || !fileData.url) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-50">
          <div className="text-center">
            <DocumentIcon className="h-20 w-20 text-gray-400 mx-auto mb-4" />
            <p className="text-sm text-gray-600">Unable to load file preview</p>
          </div>
        </div>
      )
    }

    const contentType = (fileData.contentType || "").toLowerCase()
    const fileName = file?.fileName || file?.docName || ""
    const extension = getExtension(fileName)

    if (contentType.includes("pdf") || extension === "pdf") {
      return (
        <iframe
          src={fileData.url}
          className="w-full h-full"
          frameBorder={0}
          title={`${isFirst ? "First" : "Second"} file - ${fileName}`}
        />
      )
    } else if (contentType.includes("image") || imageExtensions.includes(extension)) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-50">
          <img
            src={fileData.url || "/placeholder.svg"}
            alt={fileName}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )
    } else if (contentType.includes("video") || ["mp4", "avi", "mov", "wmv", "flv"].includes(extension)) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-50">
          <video controls className="max-w-full max-h-full">
            <source src={fileData.url} type={contentType} />
            Your browser does not support the video tag.
          </video>
        </div>
      )
    } else if (contentType.includes("audio") || ["mp3", "wav", "ogg", "aac"].includes(extension)) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-50">
          <div className="text-center">
            <SpeakerWaveIcon className="h-20 w-20 text-gray-400 mx-auto mb-4" />
            <audio controls className="w-full max-w-md">
              <source src={fileData.url} type={contentType} />
              Your browser does not support the audio tag.
            </audio>
            <p className="mt-2 text-sm text-gray-600">{fileName}</p>
          </div>
        </div>
      )
    } else if (
      [
        "doc",
        "docx",
        "xls",
        "xlsx",
        "ppt",
        "pptx",
        "rtf",
        "txt",
        "csv",
        "html",
        "xml",
        "odt",
        "ods",
        "odp",
        "odg",
      ].includes(extension)
    ) {
      return (
        <iframe
          src={fileData.url}
          className="w-full h-full"
          frameBorder={0}
          title={`${isFirst ? "First" : "Second"} file - ${fileName}`}
        />
      )
    } else {
      return (
        <div className="flex items-center justify-center h-full bg-gray-50">
          <div className="text-center">
            {getFileTypeIcon(contentType)}
            <p className="mt-2 text-sm text-gray-600">Preview not available for this file type</p>
            <p className="text-xs text-gray-500">{fileName}</p>
            <a
              href={fileData.url}
              download={fileName}
              className="mt-2 inline-flex items-center px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-1" /> Download
            </a>
          </div>
        </div>
      )
    }
  }

  const compareFiles = async () => {
    const totalSelected = selectedFirstFileIds.length + selectedSecondFileIds.length
    if (totalSelected !== 2) {
      setWarningMessage("Please select exactly 2 documents to compare (can be from same file or different files).")
      return
    }

    setIsComparing(true)
    setIsLoadingFiles(true)
    setComparisonResult(null)

    try {
      let firstFileId
      let secondFileId

      if (selectedFirstFileIds.length === 2) {
        firstFileId = selectedFirstFileIds[0]
        secondFileId = selectedFirstFileIds[1]
      } else if (selectedSecondFileIds.length === 2) {
        firstFileId = selectedSecondFileIds[0]
        secondFileId = selectedSecondFileIds[1]
      } else if (selectedFirstFileIds.length === 1 && selectedSecondFileIds.length === 1) {
        firstFileId = selectedFirstFileIds[0]
        secondFileId = selectedSecondFileIds[0]
      }

      const response = await axios.post(
        `${DOCUMENTHEADER_API}/compare`,
        { firstFileId, secondFileId },
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } },
      )

      const result = response.data

      if (result.status === 200 && result.message === "success") {
        const apiResponse = result.response

        const file1 =
          firstFileDocuments.find((doc) => doc.detailsId === firstFileId) ||
          secondFileDocuments.find((doc) => doc.detailsId === firstFileId)
        const file2 =
          firstFileDocuments.find((doc) => doc.detailsId === secondFileId) ||
          secondFileDocuments.find((doc) => doc.detailsId === secondFileId)

        const docHeader1 =
          file1 && selectedFirstFileIds.includes(firstFileId)
            ? documentHeaders.find((h) => h.fileNo === selectedFirstFileNo)
            : documentHeaders.find((h) => h.fileNo === selectedSecondFileNo)

        const docHeader2 =
          file2 && selectedSecondFileIds.includes(secondFileId)
            ? documentHeaders.find((h) => h.fileNo === selectedSecondFileNo)
            : documentHeaders.find((h) => h.fileNo === selectedFirstFileNo)

        const [firstFileData, secondFileData] = await Promise.all([
          getFilePreviewUrl(file1, docHeader1),
          getFilePreviewUrl(file2, docHeader2),
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
            fileName:
              apiResponse.comparisonResult?.leftFile?.fileName || file1?.fileName || file1?.docName || "Unknown",
            version: apiResponse.comparisonResult?.leftFile?.version || file1?.version || "Unknown",
            fileType: leftFileType,
            path: apiResponse.comparisonResult?.leftFile?.filePath || file1?.path || "",
            detailsId: file1?.detailsId || null,
            highlightedContent: apiResponse.comparisonResult?.leftFile?.highlightedContent || ""
          },
          rightFile: {
            fileName:
              apiResponse.comparisonResult?.rightFile?.fileName || file2?.fileName || file2?.docName || "Unknown",
            version: apiResponse.comparisonResult?.rightFile?.version || file2?.version || "Unknown",
            fileType: rightFileType,
            path: apiResponse.comparisonResult?.rightFile?.filePath || file2?.path || "",
            detailsId: file2?.detailsId || null,
           highlightedContent: apiResponse.comparisonResult?.rightFile?.highlightedContent || ""
          },
          diffImagePath: apiResponse.diffImagePath, // may exist for image diffs
        }

        setComparisonResult(next)
        setShowComparisonModal(true)
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

  const downloadFile = async (fileId, fileName) => {
    try {
      const response = await axios.get(`${DOCUMENTHEADER_API}/download/${fileId}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      })

      const blob = new Blob([response.data], { type: response.headers["content-type"] })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(link)
    } catch (error) {
      console.error("Error downloading file:", error)
      showPopup("Failed to download file", "error")
    }
  }

  const showPopup = (message, type = 'info') => {
    setPopupMessage({
      message,
      type,
      onClose: () => {
        setPopupMessage(null);
      }
    });
  };

  const closeComparisonModal = () => {
    setShowComparisonModal(false)
    setActiveTab("preview")

    if (fileUrls.firstFile?.url) URL.revokeObjectURL(fileUrls.firstFile.url)
    if (fileUrls.secondFile?.url) URL.revokeObjectURL(fileUrls.secondFile.url)

    setFileUrls({ firstFile: null, secondFile: null })
  }

  const getDifferenceColor = (similarityPercentage) => {
    if (similarityPercentage === 100) return "border-green-400 bg-green-50"
    if (similarityPercentage >= 80) return "border-yellow-400 bg-yellow-50"
    return "border-red-400 bg-red-50"
  }

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

  const renderDifferencesView = () => {
    if (!comparisonResult?.differences || comparisonResult.differences.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-700">No differences found</p>
            <p className="text-sm text-gray-500">Files are identical</p>
          </div>
        </div>
      )
    }

    if (isLoading) {
      return <LoadingComponent />;
    }

    return (
      <div className="h-full overflow-auto p-4">
        <div className="space-y-3">

          {popupMessage && (
            <Popup
              message={popupMessage.message}
              type={popupMessage.type}
              onClose={popupMessage.onClose}
            />
          )}

          {comparisonResult.differences.map((diff, index) => (
            <div key={index} className={`p-3 rounded-lg border-l-4 ${getDifferenceTypeColor(diff.type)}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getDifferenceTypeColor(diff.type)}`}>
                  {diff.type}
                </span>
                <div className="text-xs text-gray-600">
                  Line {diff.leftLineNumber !== -1 ? diff.leftLineNumber : "N/A"} →{" "}
                  {diff.rightLineNumber !== -1 ? diff.rightLineNumber : "N/A"}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-medium text-gray-600 mb-1">Original</div>
                  <div className="text-sm bg-white p-2 rounded border font-mono">
                    {diff.leftContent || <span className="text-gray-400 italic">No content</span>}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-600 mb-1">Modified</div>
                  <div className="text-sm bg-white p-2 rounded border font-mono">
                    {diff.rightContent || <span className="text-gray-400 italic">No content</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const bothImages = useMemo(() => {
    if (!comparisonResult) return false
    const left = comparisonResult.leftFile
    const right = comparisonResult.rightFile
    const leftIsImage = isImageByMeta(left?.fileType, fileUrls.firstFile?.contentType, left?.fileName)
    const rightIsImage = isImageByMeta(right?.fileType, fileUrls.secondFile?.contentType, right?.fileName)
    return !!(leftIsImage && rightIsImage && fileUrls.firstFile?.url && fileUrls.secondFile?.url)
  }, [comparisonResult, fileUrls.firstFile, fileUrls.secondFile])

  const bothText = useMemo(() => {
    if (!comparisonResult) return false
    const left = comparisonResult.leftFile
    const right = comparisonResult.rightFile
    const leftIsText = isTextFile(left?.fileType, fileUrls.firstFile?.contentType, left?.fileName)
    const rightIsText = isTextFile(right?.fileType, fileUrls.secondFile?.contentType, right?.fileName)
    return !!(leftIsText && rightIsText && fileUrls.firstFile?.url && fileUrls.secondFile?.url)
  }, [comparisonResult, fileUrls.firstFile, fileUrls.secondFile])

  return (
    <div className="px-2">
      <h1 className="text-2xl mb-1 font-semibold">File Comparison</h1>
      <div className="bg-white p-4 rounded-lg shadow-sm">
        {warningMessage && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" />
            <p className="text-sm text-yellow-800">{warningMessage}</p>
          </div>
        )}

        {/* File Selection */}
        <div className="mb-4 bg-slate-100 p-4 rounded-lg">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* First */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-700">First File</h3>
                <span className="text-sm text-gray-500">Selected: {selectedFirstFileIds.length}/2</span>
              </div>

              <label className="block text-md font-medium text-gray-700">
                Select File Number <span className="text-red-500">*</span>
                <select
                  value={selectedFirstFileNo}
                  onChange={(e) => {
                    setSelectedFirstFileNo(e.target.value)
                    if (e.target.value) {
                      fetchDocumentsByFileNo(e.target.value, true)
                    } else {
                      setFirstFileDocuments([])
                      setSelectedFirstFileIds([])
                    }
                  }}
                  className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select File Number</option>
                  {documentHeaders.map((header) => (
                    <option key={header.id} value={header.fileNo}>
                      {header.fileNo} - {header.title}
                    </option>
                  ))}
                </select>
              </label>

              <div className="block text-md font-medium text-gray-700">
                Select Documents <span className="text-red-500">*</span>
                <div className="mt-1 border rounded-md p-2 max-h-40 overflow-y-auto">
                  {firstFileDocuments.length > 0 ? (
                    firstFileDocuments.map((doc) => {
                      const isSelected = selectedFirstFileIds.includes(doc.detailsId)
                      const totalSelected = selectedFirstFileIds.length + selectedSecondFileIds.length
                      const canSelect = totalSelected < 2 || isSelected

                      return (
                        <div
                          key={doc.detailsId}
                          className={`flex items-center p-2 hover:bg-gray-50 rounded ${!canSelect ? "opacity-50" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleFileSelection(doc.detailsId, true)}
                            disabled={!canSelect}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="ml-2 flex items-center flex-1">
                            {getFileTypeIcon(doc.fileType)}
                            <label className="ml-2 block text-sm text-gray-700 cursor-pointer flex-1">
                              <div className="font-medium">{extractFileName(doc.fileName || doc.docName)}</div>
                              <div className="text-xs text-gray-500">Version: {doc.version}</div>
                            </label>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-sm text-gray-500 p-2">No documents available</p>
                  )}
                </div>
              </div>
            </div>

            {/* Second */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-700">Second File</h3>
                <span className="text-sm text-gray-500">Selected: {selectedSecondFileIds.length}/2</span>
              </div>

              <label className="block text-md font-medium text-gray-700">
                Select File Number <span className="text-red-500">*</span>
                <select
                  value={selectedSecondFileNo}
                  onChange={(e) => {
                    setSelectedSecondFileNo(e.target.value)
                    if (e.target.value) {
                      fetchDocumentsByFileNo(e.target.value, false)
                    } else {
                      setSecondFileDocuments([])
                      setSelectedSecondFileIds([])
                    }
                  }}
                  className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select File Number</option>
                  {documentHeaders.map((header) => (
                    <option key={header.id} value={header.fileNo}>
                      {header.fileNo} - {header.title}
                    </option>
                  ))}
                </select>
              </label>

              <div className="block text-md font-medium text-gray-700">
                Select Documents <span className="text-red-500">*</span>
                <div className="mt-1 border rounded-md p-2 max-h-40 overflow-y-auto">
                  {secondFileDocuments.length > 0 ? (
                    secondFileDocuments.map((doc) => {
                      const isSelected = selectedSecondFileIds.includes(doc.detailsId)
                      const totalSelected = selectedFirstFileIds.length + selectedSecondFileIds.length
                      const canSelect = totalSelected < 2 || isSelected

                      return (
                        <div
                          key={doc.detailsId}
                          className={`flex items-center p-2 hover:bg-gray-50 rounded ${!canSelect ? "opacity-50" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleFileSelection(doc.detailsId, false)}
                            disabled={!canSelect}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="ml-2 flex items-center flex-1">
                            {getFileTypeIcon(doc.fileType)}
                            <label className="ml-2 block text-sm text-gray-700 cursor-pointer flex-1">
                              <div className="font-medium">{extractFileName(doc.fileName || doc.docName)}</div>
                              <div className="text-xs text-gray-500">Version: {doc.version}</div>
                            </label>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-sm text-gray-500 p-2">No documents available</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Compare Button */}
          <div className="mt-6 flex justify-center">
            <button
              onClick={compareFiles}
              disabled={isComparing || selectedFirstFileIds.length + selectedSecondFileIds.length !== 2}
              className={`bg-blue-900 text-white rounded-2xl px-6 py-3 text-sm flex items-center justify-center transition-all ${isComparing || selectedFirstFileIds.length + selectedSecondFileIds.length !== 2
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-blue-800 hover:scale-105"
                }`}
            >
              {isComparing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Comparing...
                </>
              ) : (
                <>
                  <ArrowsRightLeftIcon className="h-5 w-5 mr-2" /> Compare Files
                </>
              )}
            </button>
          </div>
        </div>

        {/* Modal */}
        {showComparisonModal && comparisonResult && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-5/6 flex flex-col">
              {/* Header */}
              <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                <div className="flex items-center space-x-4">
                  <h2 className="text-xl font-semibold">File Comparison</h2>
                  <div className="flex items-center">
                    {comparisonResult.identical ? (
                      <CheckCircleIcon className="h-6 w-6 text-green-500 mr-2" />
                    ) : (
                      <XCircleIcon className="h-6 w-6 text-red-500 mr-2" />
                    )}
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${comparisonResult.identical ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}
                    >
                      {comparisonResult.similarityPercentage?.toFixed(1) || "0.0"}% Similar
                    </span>
                  </div>
                </div>
                <button
                  onClick={closeComparisonModal}
                  className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Tabs */}
              <div className="border-b bg-gray-50">
                <nav className="flex space-x-8 px-4">
                  <button
                    onClick={() => setActiveTab("preview")}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === "preview"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                  >
                    File Preview
                  </button>
                  <button
                    onClick={() => setActiveTab("differences")}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === "differences"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                  >
                    Differences ({comparisonResult.differences?.length || 0})
                  </button>
                  {bothImages && (
                    <button
                      onClick={() => setActiveTab("visualDiff")}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === "visualDiff"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                    >
                      Visual Diff (Images)
                    </button>
                  )}
                  {bothText && (
                    <button
                      onClick={() => setActiveTab("textDiff")}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === "textDiff"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                    >
                      Text Comparison
                    </button>
                  )}
                </nav>
              </div>

              {/* File Info header for preview */}
              {activeTab === "preview" && (
                <div className="grid grid-cols-2 gap-px bg-gray-200">
                  <div className="bg-blue-50 p-3 flex items-center justify-between">
                    <div className="flex items-center">
                      {getFileTypeIcon(comparisonResult.leftFile.fileType)}
                      <div className="ml-2">
                        <h3 className="font-medium text-gray-800">{extractFileName(comparisonResult.leftFile.fileName)}</h3>
                        <p className="text-xs text-gray-600">
                          Version: {comparisonResult.leftFile.version} | fileType: {comparisonResult.leftFile.fileType}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-blue-50 p-3 flex items-center justify-between">
                    <div className="flex items-center">
                      {getFileTypeIcon(comparisonResult.rightFile.fileType)}
                      <div className="ml-2">
                        <h3 className="font-medium text-gray-800">{extractFileName(comparisonResult.rightFile.fileName)}</h3>
                        <p className="text-xs text-gray-600">
                          Version: {comparisonResult.rightFile.version} | fileType:{" "}
                          {comparisonResult.rightFile.fileType}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Content */}
              <div className="flex-1 overflow-hidden">
                {activeTab === "preview" ? (
                  <div className="h-full flex">
                    {isLoadingFiles ? (
                      <div className="w-full flex items-center justify-center">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                          <p className="text-gray-600">Loading file previews...</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div
                          className={`w-1/2 border-r-4 ${getDifferenceColor(comparisonResult.similarityPercentage)}`}
                        >
                          <div className="h-full flex flex-col">
                            <div className="flex-1 overflow-auto">
                              {renderFileViewer(comparisonResult.leftFile, fileUrls.firstFile, true)}
                            </div>
                          </div>
                        </div>
                        <div className={`w-1/2 ${getDifferenceColor(comparisonResult.similarityPercentage)}`}>
                          <div className="h-full flex flex-col">
                            <div className="flex-1 overflow-auto">
                              {renderFileViewer(comparisonResult.rightFile, fileUrls.secondFile, false)}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : activeTab === "differences" ? (
                  renderDifferencesView()
                ) : activeTab === "visualDiff" ? (
                  <VisualDiffPanel
                    leftUrl={fileUrls.firstFile?.url || ""}
                    rightUrl={fileUrls.secondFile?.url || ""}
                    leftName={extractFileName(comparisonResult.leftFile.fileName)}
                    rightName={extractFileName(comparisonResult.rightFile.fileName)}
                  />
                ) : activeTab === "textDiff" ? (
                  <TextDiffPanel
                    leftContent={comparisonResult.comparisonResult?.leftFile?.content || []}
                    rightContent={comparisonResult.comparisonResult?.rightFile?.content || []}
                    differences={comparisonResult.differences || []}
                    leftName={extractFileName(comparisonResult.leftFile.fileName)}
                    rightName={extractFileName(comparisonResult.rightFile.fileName)}
                    comparisonResult={comparisonResult.comparisonResult}
                    leftHighlightedContent={comparisonResult.leftFile.highlightedContent}
                    rightHighlightedContent={comparisonResult.rightFile.highlightedContent}
                  />
                ) : null}
              </div>

              {/* Footer */}
              <div className="p-4 bg-gray-50 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div className="text-sm">
                      <span className="font-medium">Status:</span>
                      <span className={`ml-1 ${comparisonResult.identical ? "text-green-600" : "text-red-600"}`}>
                        {comparisonResult.message}
                      </span>
                    </div>
                    {!comparisonResult.identical && comparisonResult.differences && (
                      <div className="text-sm">
                        <span className="font-medium">Differences Found:</span>
                        <span className="ml-1 text-red-600">{comparisonResult.differences.length}</span>
                      </div>
                    )}
                    {comparisonResult.comparisonResult?.summary && (
                      <div className="flex items-center space-x-4 text-sm">
                        {comparisonResult.comparisonResult.summary.totalLinesAdded > 0 && (
                          <div className="text-green-600">
                            +{comparisonResult.comparisonResult.summary.totalLinesAdded} added
                          </div>
                        )}
                        {comparisonResult.comparisonResult.summary.totalLinesDeleted > 0 && (
                          <div className="text-red-600">
                            -{comparisonResult.comparisonResult.summary.totalLinesDeleted} deleted
                          </div>
                        )}
                        {comparisonResult.comparisonResult.summary.totalLinesModified > 0 && (
                          <div className="text-yellow-600">
                            ~{comparisonResult.comparisonResult.summary.totalLinesModified} modified
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-4 text-xs">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-50 border-2 border-green-400 mr-1"></div>
                      <span>Identical (100%)</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-yellow-50 border-2 border-yellow-400 mr-1"></div>
                      <span>Similar (80-99%)</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-red-50 border-2 border-red-400 mr-1"></div>
                      <span>Different (&lt;80%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!comparisonResult && !showComparisonModal && (
          <div className="text-center py-12 text-gray-500">
            <DocumentDuplicateIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">Select exactly 2 documents to compare</p>
            <p className="text-sm">You can select documents from the same file or different files</p>
            <div className="mt-4 text-xs text-gray-400">
              <p>• Select 2 documents from first file only</p>
              <p>• Select 2 documents from second file only</p>
              <p>• Select 1 document from each file</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default FileCompare

/* Visual diff panel for images with Overlay and Pixel Diff modes */
function VisualDiffPanel({
  leftUrl,
  rightUrl,
  leftName,
  rightName,
}) {
  const [mode, setMode] = useState("overlay")
  const [opacity, setOpacity] = useState(0.5)
  const [threshold, setThreshold] = useState(30)
  const canvasRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    if (mode !== "pixel") return
    const canvas = canvasRef.current
    if (!canvas) return

    const imgA = new Image()
    const imgB = new Image()
    imgA.crossOrigin = "anonymous"
    imgB.crossOrigin = "anonymous"
    imgA.src = leftUrl
    imgB.src = rightUrl

    let cancelled = false

    const draw = () => {
      if (cancelled) return
      const w = Math.min(imgA.width, imgB.width)
      const h = Math.min(imgA.height, imgB.height)

      if (!w || !h) return

      canvas.width = w
      canvas.height = h

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // Draw A to offscreen
      const aCanvas = document.createElement("canvas")
      aCanvas.width = w
      aCanvas.height = h
      const aCtx = aCanvas.getContext("2d")
      aCtx.drawImage(imgA, 0, 0, w, h)

      // Draw B to offscreen
      const bCanvas = document.createElement("canvas")
      bCanvas.width = w
      bCanvas.height = h
      const bCtx = bCanvas.getContext("2d")
      bCtx.drawImage(imgB, 0, 0, w, h)

      const aData = aCtx.getImageData(0, 0, w, h)
      const bData = bCtx.getImageData(0, 0, w, h)
      const out = ctx.createImageData(w, h)

      // Improved pixel diff with threshold-based comparison
      for (let i = 0; i < aData.data.length; i += 4) {
        const r1 = aData.data[i]
        const g1 = aData.data[i + 1]
        const b1 = aData.data[i + 2]
        const r2 = bData.data[i]
        const g2 = bData.data[i + 1]
        const b2 = bData.data[i + 2]

        // Calculate color difference using Euclidean distance
        const colorDiff = Math.sqrt(
          Math.pow(r1 - r2, 2) +
          Math.pow(g1 - g2, 2) +
          Math.pow(b1 - b2, 2)
        )

        const isDifferent = colorDiff > threshold

        if (!isDifferent) {
          // Keep original color for similar pixels
          out.data[i] = r1
          out.data[i + 1] = g1
          out.data[i + 2] = b1
          out.data[i + 3] = 255
        } else {
          // Highlight differences in bright red
          const intensity = Math.min(colorDiff / 100, 1) // Normalize difference intensity

          // Make differences more visible with bright red overlay
          out.data[i] = Math.min(255, r1 + (255 - r1) * 0.8) // Add red
          out.data[i + 1] = Math.max(0, g1 * 0.3) // Reduce green
          out.data[i + 2] = Math.max(0, b1 * 0.3) // Reduce blue
          out.data[i + 3] = 255
        }
      }

      ctx.putImageData(out, 0, 0)
    }

    imgA.onload = () => {
      if (imgB.complete) draw()
    }
    imgB.onload = () => {
      if (imgA.complete) draw()
    }

    return () => {
      cancelled = true
    }
  }, [leftUrl, rightUrl, mode, threshold])

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b bg-white">
        <div className="text-sm text-gray-700">
          <span className="font-medium">{leftName}</span> vs <span className="font-medium">{rightName}</span>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">Mode:</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode("overlay")}
              className={`px-3 py-1 rounded text-sm ${mode === "overlay" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
                }`}
            >
              Overlay
            </button>
            <button
              onClick={() => setMode("pixel")}
              className={`px-3 py-1 rounded text-sm ${mode === "pixel" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
                }`}
            >
              Pixel Diff
            </button>
          </div>

          {mode === "overlay" && (
            <div className="flex items-center gap-2 ml-4">
              <span className="text-xs text-gray-600">{leftName}</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={opacity}
                onChange={(e) => setOpacity(Number.parseFloat(e.target.value))}
                className="w-24"
              />
              <span className="text-xs text-gray-600">{rightName}</span>
            </div>
          )}

          {mode === "pixel" && (
            <div className="flex items-center gap-2 ml-4">
              <span className="text-xs text-gray-600">Sensitivity:</span>
              <input
                type="range"
                min={5}
                max={100}
                step={5}
                value={threshold}
                onChange={(e) => setThreshold(Number.parseInt(e.target.value))}
                className="w-24"
              />
              <span className="text-xs text-gray-600">{threshold}</span>
            </div>
          )}
        </div>
      </div>

      <div ref={containerRef} className="flex-1 bg-gray-50 overflow-auto p-4">
        <div className="w-full h-full flex items-start justify-center">
          {mode === "overlay" ? (
            <div className="relative inline-block">
              {/* Base (left) */}
              <img
                src={leftUrl || "/placeholder.svg"}
                crossOrigin="anonymous"
                alt={leftName}
                className="w-auto h-auto max-w-full block"
                style={{ maxHeight: 'calc(100vh - 300px)' }}
              />
              {/* Overlay (right) */}
              <img
                src={rightUrl || "/placeholder.svg"}
                crossOrigin="anonymous"
                alt={rightName}
                style={{ opacity }}
                className="w-auto h-auto max-w-full block absolute top-0 left-0"
              />
            </div>
          ) : (
            <div className="text-center">
              <canvas ref={canvasRef} className="w-auto h-auto max-w-full border" style={{ maxHeight: 'calc(100vh - 300px)' }} />
              <div className="mt-2 text-xs text-gray-600">
                Red areas indicate differences between images
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* Text diff panel for text files with inline highlighted differences */
function TextDiffPanel({ 
  leftContent, 
  rightContent, 
  differences, 
  leftName, 
  rightName, 
  comparisonResult,
  leftHighlightedContent,
  rightHighlightedContent 
}) {
  const [viewMode, setViewMode] = useState('full-document'); // Default to full document view

  // Extract highlighted content from the comparison result
  const leftHighlighted = leftHighlightedContent || 
                         (comparisonResult?.leftFile?.highlightedContent || '');
  const rightHighlighted = rightHighlightedContent || 
                          (comparisonResult?.rightFile?.highlightedContent || '');

  // Function to render highlighted content with proper styling
  const renderHighlightedContent = (content, isLeft = true) => {
    if (!content) {
      return (
        <div className="no-content">
          No content available for {isLeft ? leftName : rightName}
        </div>
      );
    }

    // If content is already HTML (contains span tags with diff classes)
    if (content.includes('<span class="diff-')) {
      return (
        <div 
          className="highlighted-content"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      );
    }

    // If content is plain text (array of lines)
    if (Array.isArray(content)) {
      return (
        <div className="full-document-content">
          {content.map((line, index) => {
            // Check if this line has differences
            const lineDiff = differences?.find(d => 
              (isLeft && d.leftLineNumber === index + 1) || 
              (!isLeft && d.rightLineNumber === index + 1)
            );
            
            let className = "document-line";
            if (lineDiff) {
              if (lineDiff.type === 'DELETED') className += " deleted";
              else if (lineDiff.type === 'ADDED') className += " added";
              else if (lineDiff.type === 'MODIFIED') className += " modified";
            }
            
            return (
              <div key={index} className={className}>
                {line || <span className="empty-line">&nbsp;</span>}
              </div>
            );
          })}
        </div>
      );
    }

    // Fallback for string content
    return (
      <div className="full-document-content">
        {content.split('\n').map((line, index) => (
          <div key={index} className="document-line">
            {line}
          </div>
        ))}
      </div>
    );
  };

  const renderFullDocumentView = () => (
    <div className="grid grid-cols-2 gap-4 h-full overflow-auto p-4">
      {/* Left Document - Full Content */}
      <div className="border rounded-lg bg-white overflow-hidden">
        <div className="sticky top-0 bg-blue-50 p-3 border-b font-medium text-blue-800 flex justify-between items-center">
          <span>{leftName} (Original)</span>
          <span className="text-xs font-normal text-blue-600">
            {differences && differences.filter(d => d.type === 'DELETED' || d.type === 'MODIFIED').length} changes
          </span>
        </div>
        <div className="p-4 overflow-auto max-h-96 full-document-container">
          {renderHighlightedContent(leftHighlighted || leftContent, true)}
        </div>
      </div>

      {/* Right Document - Full Content */}
      <div className="border rounded-lg bg-white overflow-hidden">
        <div className="sticky top-0 bg-blue-50 p-3 border-b font-medium text-blue-800 flex justify-between items-center">
          <span>{rightName} (Modified)</span>
          <span className="text-xs font-normal text-blue-600">
            {differences && differences.filter(d => d.type === 'ADDED' || d.type === 'MODIFIED').length} changes
          </span>
        </div>
        <div className="p-4 overflow-auto max-h-96 full-document-container">
          {renderHighlightedContent(rightHighlighted || rightContent, false)}
        </div>
      </div>
    </div>
  );

  const renderDifferencesOnlyView = () => (
    <div className="h-full overflow-auto p-4">
      <div className="space-y-3">
        {differences && differences.length > 0 ? (
          differences.map((diff, index) => (
            <div key={index} className={`p-3 rounded-lg border-l-4 ${
              diff.type === 'ADDED' ? 'bg-green-100 border-green-400' :
              diff.type === 'DELETED' ? 'bg-red-100 border-red-400' :
              'bg-yellow-100 border-yellow-400'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  diff.type === 'ADDED' ? 'bg-green-100 text-green-800' :
                  diff.type === 'DELETED' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {diff.type}
                </span>
                <div className="text-xs text-gray-600">
                  Line {diff.leftLineNumber !== -1 ? diff.leftLineNumber : "N/A"} →{" "}
                  {diff.rightLineNumber !== -1 ? diff.rightLineNumber : "N/A"}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-medium text-gray-600 mb-1">Original</div>
                  <div className="text-sm bg-white p-2 rounded border font-mono">
                    {diff.leftContent || <span className="text-gray-400 italic">No content</span>}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-600 mb-1">Modified</div>
                  <div className="text-sm bg-white p-2 rounded border font-mono">
                    {diff.rightContent || <span className="text-gray-400 italic">No content</span>}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700">No differences found</p>
              <p className="text-sm text-gray-500">Files are identical</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b bg-white">
        <div className="text-sm text-gray-700">
          <span className="font-medium">{leftName}</span> vs <span className="font-medium">{rightName}</span>
          {differences && differences.length > 0 && (
            <span className="ml-3 text-red-600">({differences.length} differences found)</span>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-100 border border-red-500 mr-1"></div>
              <span>Deleted content</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-100 border border-green-500 mr-1"></div>
              <span>Added content</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-100 border border-yellow-500 mr-1"></div>
              <span>Modified content</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('full-document')}
              className={`px-3 py-1 rounded text-xs ${
                viewMode === 'full-document' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              Full Document
            </button>
            <button
              onClick={() => setViewMode('differences-only')}
              className={`px-3 py-1 rounded text-xs ${
                viewMode === 'differences-only' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              Differences Only
            </button>
          </div>
        </div>
      </div>

      {/* CSS styles for full document display */}
      <style>
        {`
          .full-document-container {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f8fafc;
          }
          
          .full-document-content {
            background-color: white;
            padding: 16px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }
          
          .document-line {
            padding: 4px 8px;
            margin: 2px 0;
            border-left: 3px solid transparent;
            white-space: pre-wrap;
            word-wrap: break-word;
            line-height: 1.5;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 13px;
          }
          
          .document-line.empty-line {
            height: 1.2em;
            background-color: #f9fafb;
          }
          
          .document-line.deleted {
            background-color: #fef2f2;
            color: #dc2626;
            text-decoration: line-through;
            border-left-color: #dc2626;
          }
          
          .document-line.added {
            background-color: #f0fdf4;
            color: #16a34a;
            border-left-color: #16a34a;
          }
          
          .document-line.modified {
            background-color: #fffbeb;
            color: #ca8a04;
            border-left-color: #ca8a04;
          }
          
          .highlighted-content {
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 13px;
            line-height: 1.5;
            white-space: pre-wrap;
            background-color: white;
            padding: 16px;
            border-radius: 8px;
          }
          
          .highlighted-content .diff-deleted {
            background-color: #fef2f2;
            color: #dc2626;
            text-decoration: line-through;
          }
          
          .highlighted-content .diff-added {
            background-color: #f0fdf4;
            color: #16a34a;
          }
          
          .highlighted-content .diff-modified {
            background-color: #fffbeb;
            color: #ca8a04;
          }
          
          .no-content {
            color: #9ca3af;
            font-style: italic;
            padding: 16px;
            text-align: center;
          }
        `}
      </style>
      
      <div className="flex-1 overflow-hidden bg-gray-50">
        {viewMode === 'full-document' ? renderFullDocumentView() : renderDifferencesOnlyView()}
      </div>
    </div>
  );
}