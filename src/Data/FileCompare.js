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
  MagnifyingGlassIcon,
} from "@heroicons/react/24/solid"
import axios from "axios"

import { DOCUMENTHEADER_API, API_HOST } from "../API/apiConfig"
import LoadingComponent from '../Components/LoadingComponent'
import Popup from '../Components/Popup'
import AutoTranslate from '../i18n/AutoTranslate'
import { useLanguage } from '../i18n/LanguageContext'
import { translateInstant } from '../i18n/autoTranslator'
import apiClient from "../API/apiClient";

const imageExtensions = ["png", "jpg", "jpeg", "gif", "bmp", "svg", "tiff", "webp", "heic", "heif"]
const textExtensions = ["txt", "csv", "log", "xml", "html", "htm", "js", "jsx", "ts",
  "css", "scss", "json", "md", "yml", "yaml", "java", "py", "cpp",
  "c", "h", "php", "rb", "go", "rs", "swift", "kt"]
const textMimes = ["text/", "application/json", "application/xml", "application/javascript"]

function getExtension(nameOrType) {
  if (!nameOrType) return ""
  const lower = nameOrType.toLowerCase()
  if (lower.includes(".")) {
    const ext = lower.split(".").pop() || ""
    return ext.replace(/\?.*$/, "").replace(/#.*$/, "")
  }
  if (/^[a-z0-9]{2,10}$/.test(lower)) return lower
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

// ✅ Extract display name - removes prefix like "AGT_" up to first underscore-number pattern
const extractFileName = (fullName) => {
  if (!fullName) return "Unknown"
  const fileNameParts = fullName.split("_")
  return fileNameParts.slice(1).join("_")
}

const FileCompare = () => {
  const {
    currentLanguage,
    defaultLanguage,
    translationStatus,
    isTranslationNeeded,
    availableLanguages,
    changeLanguage,
    translate,
    preloadTranslationsForTerms
  } = useLanguage()

  // ============================================================
  // STATE DECLARATIONS
  // ============================================================
  const [documentHeaders, setDocumentHeaders] = useState([])
  const [firstFileDocuments, setFirstFileDocuments] = useState([])
  const [secondFileDocuments, setSecondFileDocuments] = useState([])
  const [selectedFirstFileNo, setSelectedFirstFileNo] = useState("")
  const [selectedSecondFileNo, setSelectedSecondFileNo] = useState("")
  const [selectedFirstFileIds, setSelectedFirstFileIds] = useState([])
  const [selectedSecondFileIds, setSelectedSecondFileIds] = useState([])
  const [comparisonResult, setComparisonResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [popupMessage, setPopupMessage] = useState(null)
  const [isComparing, setIsComparing] = useState(false)
  const [showComparisonModal, setShowComparisonModal] = useState(false)
  const [fileUrls, setFileUrls] = useState({
    firstFile: null,
    secondFile: null,
  })
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [activeTab, setActiveTab] = useState("preview")
  const [warningMessage, setWarningMessage] = useState("")
  const [categoryOptions, setCategoryOptions] = useState([])
  const [firstSearchTerm, setFirstSearchTerm] = useState("")
  const [firstSelectedCategory, setFirstSelectedCategory] = useState("")
  const [firstShowDropdown, setFirstShowDropdown] = useState(false)
  const [secondSearchTerm, setSecondSearchTerm] = useState("")
  const [secondSelectedCategory, setSecondSelectedCategory] = useState("")
  const [secondShowDropdown, setSecondShowDropdown] = useState(false)

  // ============================================================
  // EFFECTS
  // ============================================================
  useEffect(() => {
    fetchAllDocumentHeaders()
    fetchCategory()
  }, [])

  const fetchAllDocumentHeaders = async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.get(`${DOCUMENTHEADER_API}/getAllDocument`)
      setDocumentHeaders(response.data || [])
    } catch (error) {
      console.error("Error fetching document headers:", error)
      showPopup("Failed to fetch document headers", "error")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCategory = async () => {
    try {
      const response = await apiClient.get(`${API_HOST}/CategoryMaster/findActiveCategory`)
      setCategoryOptions(response.data)
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  const fetchDocumentsByFileNo = async (fileNo, isFirst = true) => {
    try {
      const response = await apiClient.get(`${DOCUMENTHEADER_API}/getFile/${fileNo}`)
      const data = response.data || {}
      const fileList = data.fileList || []
      const docHeader = documentHeaders.find(header => header.fileNo === fileNo)

      const filesWithHeader = fileList.map(file => ({
        ...file,
        docHeader: docHeader
      }))

      if (isFirst) {
        setFirstFileDocuments(filesWithHeader)
      } else {
        setSecondFileDocuments(filesWithHeader)
      }

      setWarningMessage("")
      return filesWithHeader
    } catch (error) {
      console.error("Error fetching documents:", error)
      showPopup("Failed to fetch documents", "error")
      return []
    }
  }

  // ============================================================
  // FILTERED HEADERS
  // ============================================================
  const filteredFirstFileHeaders = useMemo(() => {
    let filtered = documentHeaders
    if (firstSearchTerm) {
      const searchLower = firstSearchTerm.toLowerCase()
      filtered = filtered.filter(header =>
        header.fileNo?.toLowerCase().includes(searchLower) ||
        header.title?.toLowerCase().includes(searchLower) ||
        header.subject?.toLowerCase().includes(searchLower)
      )
    }
    if (firstSelectedCategory) {
      filtered = filtered.filter(header => {
        if (header.categoryMaster?.id) return header.categoryMaster.id.toString() === firstSelectedCategory.toString()
        if (header.category?.id) return header.category.id.toString() === firstSelectedCategory.toString()
        return false
      })
    }
    return filtered
  }, [documentHeaders, firstSearchTerm, firstSelectedCategory])

  const filteredSecondFileHeaders = useMemo(() => {
    let filtered = documentHeaders
    if (secondSearchTerm) {
      const searchLower = secondSearchTerm.toLowerCase()
      filtered = filtered.filter(header =>
        header.fileNo?.toLowerCase().includes(searchLower) ||
        header.title?.toLowerCase().includes(searchLower) ||
        header.subject?.toLowerCase().includes(searchLower)
      )
    }
    if (secondSelectedCategory) {
      filtered = filtered.filter(header => {
        if (header.categoryMaster?.id) return header.categoryMaster.id.toString() === secondSelectedCategory.toString()
        if (header.category?.id) return header.category.id.toString() === secondSelectedCategory.toString()
        return false
      })
    }
    return filtered
  }, [documentHeaders, secondSearchTerm, secondSelectedCategory])

  // ============================================================
  // FILE SELECTION
  // ============================================================
  const handleFileSelection = (fileId, isFirst = true) => {
    const currentFirstCount = selectedFirstFileIds.length
    const currentSecondCount = selectedSecondFileIds.length
    const totalSelected = currentFirstCount + currentSecondCount

    const selectedFile = isFirst
      ? firstFileDocuments.find(doc => doc.detailsId === fileId)
      : secondFileDocuments.find(doc => doc.detailsId === fileId)

    if (totalSelected === 1) {
      let existingFile
      if (currentFirstCount === 1) {
        existingFile = firstFileDocuments.find(doc => doc.detailsId === selectedFirstFileIds[0])
      } else if (currentSecondCount === 1) {
        existingFile = secondFileDocuments.find(doc => doc.detailsId === selectedSecondFileIds[0])
      }

      if (existingFile && !areFilesComparable(existingFile, selectedFile)) {
        const existingFileName = existingFile.fileName || existingFile.docName || "File"
        const selectedFileName = selectedFile.fileName || selectedFile.docName || "File"
        const existingExt = existingFileName.split('.').pop()?.toUpperCase() || "Unknown"
        const selectedExt = selectedFileName.split('.').pop()?.toUpperCase() || "Unknown"
        setWarningMessage(`Cannot compare ${existingExt} with ${selectedExt}. Please select files with the same format.`)
        return
      }
    }

    if (isFirst) {
      const isAlreadySelected = selectedFirstFileIds.includes(fileId)
      if (isAlreadySelected) {
        setSelectedFirstFileIds(prev => prev.filter(id => id !== fileId))
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
        setSelectedFirstFileIds(prev => [...prev, fileId])
        setWarningMessage("")
      }
    } else {
      const isAlreadySelected = selectedSecondFileIds.includes(fileId)
      if (isAlreadySelected) {
        setSelectedSecondFileIds(prev => prev.filter(id => id !== fileId))
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
        setSelectedSecondFileIds(prev => [...prev, fileId])
        setWarningMessage("")
      }
    }
  }

  // ============================================================
  // ✅ FIXED: getFilePreviewUrl - uses file.path directly
  // ============================================================
  const getFilePreviewUrl = async (file) => {
    if (!file) {
      console.error("❌ file is missing")
      return null
    }

    // ✅ Use file.path directly — it already contains the full relative path
    const rawPath = file.path || file.filePath || file.documentPath
    if (!rawPath) {
      console.error("❌ No path found on file object", file)
      return null
    }

    try {
      // Split path into parts: branch/department/year/category/version/filename
      const pathParts = rawPath.replace(/\\/g, '/').split('/').filter(Boolean)

      if (pathParts.length < 6) {
        console.error("❌ Path has fewer than 6 parts:", pathParts)
        return null
      }

      // Parts: [branch, department, year, category, version, ...fileName]
      const [branch, department, year, category, version, ...fileNameParts] = pathParts
      const fileName = fileNameParts.join('/')

      // ✅ Build URL without double-encoding — category may have underscores already
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
      const blobUrl = URL.createObjectURL(blob)

      console.log("✅ File loaded successfully:", fileName, "| type:", contentType)

      return {
        url: blobUrl,
        fileName,
        contentType
      }
    } catch (error) {
      console.error("❌ Error loading file preview:", error.message, "| status:", error.response?.status)
      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text()
          console.error("Server error response:", text)
        } catch (e) {}
      }
      return null
    }
  }

  // ============================================================
  // FILE TYPE HELPERS
  // ============================================================
  const getFileTypeIcon = (fileType) => {
    const type = (fileType || "").toLowerCase()
    if (type.includes("pdf")) return <DocumentIcon className="h-5 w-5 text-red-500" />
    if (type.includes("doc") || type.includes("docx") || type.includes("txt") || type.includes("rtf"))
      return <DocumentIcon className="h-5 w-5 text-blue-500" />
    if (type.includes("xls") || type.includes("xlsx") || type.includes("csv"))
      return <DocumentIcon className="h-5 w-5 text-green-600" />
    if (type.includes("ppt") || type.includes("pptx"))
      return <DocumentIcon className="h-5 w-5 text-orange-500" />
    if (type.includes("image") || imageExtensions.includes(type))
      return <PhotoIcon className="h-5 w-5 text-blue-500" />
    if (type.includes("video") || ["mp4", "avi", "mov", "wmv", "flv"].includes(type))
      return <FilmIcon className="h-5 w-5 text-purple-500" />
    if (type.includes("audio") || ["mp3", "wav", "ogg", "aac"].includes(type))
      return <SpeakerWaveIcon className="h-5 w-5 text-green-500" />
    return <DocumentIcon className="h-5 w-5 text-gray-500" />
  }

  const areFilesComparable = (file1, file2) => {
    if (!file1 || !file2) return false
    const getExt = (file) => (file.fileName || file.docName || "").split('.').pop()?.toLowerCase() || ""
    const ext1 = getExt(file1)
    const ext2 = getExt(file2)
    if (ext1 && ext2 && ext1 === ext2) return true
    const officeGroups = { doc: "word", docx: "word", xls: "excel", xlsx: "excel", ppt: "ppt", pptx: "ppt" }
    const cat1 = officeGroups[ext1] || ext1
    const cat2 = officeGroups[ext2] || ext2
    return cat1 === cat2
  }

  // ============================================================
  // DOCX VIEWER
  // ============================================================
  const DocxViewer = ({ fileUrl, fileName }) => {
    const [htmlContent, setHtmlContent] = useState("")
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
      const convertDocxToHtml = async () => {
        try {
          setLoading(true)
          const response = await fetch(fileUrl)
          const arrayBuffer = await response.arrayBuffer()
          const mammoth = await import('mammoth')
          const result = await mammoth.default.convertToHtml({ arrayBuffer })
          setHtmlContent(result.value)
          setError("")
        } catch (err) {
          console.error("DOCX conversion error:", err)
          setError("Failed to load DOCX document")
        } finally {
          setLoading(false)
        }
      }
      convertDocxToHtml()
    }, [fileUrl])

    if (loading) return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '400px', background: '#f9fafb' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600"><AutoTranslate>Loading document...</AutoTranslate></p>
        </div>
      </div>
    )

    if (error) return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '400px', background: '#f9fafb' }}>
        <div className="text-center">
          <DocumentIcon className="h-12 w-12 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    )

    return (
      <div
        style={{ height: '100%', overflow: 'auto', padding: '16px', background: 'white' }}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    )
  }

  // ============================================================
  // ✅ FIXED: renderFileViewer — uses inline styles for guaranteed height
  // ============================================================
  const renderFileViewer = (file, fileData, isFirst = true) => {
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
    // ✅ file here is comparisonResult.leftFile/rightFile which has fileName property
    const fileName = file?.fileName || file?.docName || fileData?.fileName || ""
    const extension = getExtension(fileName)

    if (contentType.includes("pdf") || extension === "pdf") {
      return (
        <iframe
          src={fileData.url}
          style={{ width: '100%', height: '100%', minHeight: '500px', border: 'none', display: 'block' }}
          title={`${isFirst ? "First" : "Second"} file - ${fileName}`}
        />
      )
    }
    else if (
      contentType.includes("word") ||
      contentType.includes("vnd.openxmlformats-officedocument.wordprocessingml") ||
      extension === "docx" ||
      extension === "doc"
    ) {
      return <DocxViewer fileUrl={fileData.url} fileName={fileName} />
    }
    else if (contentType.includes("image") || imageExtensions.includes(extension)) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '400px', background: '#f9fafb' }}>
          <img
            src={fileData.url}
            alt={fileName}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        </div>
      )
    }
    else if (contentType.includes("video") || ["mp4", "avi", "mov", "wmv", "flv"].includes(extension)) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '400px', background: '#f9fafb' }}>
          <video controls style={{ maxWidth: '100%', maxHeight: '100%' }}>
            <source src={fileData.url} type={contentType} />
            <AutoTranslate>Your browser does not support the video tag.</AutoTranslate>
          </video>
        </div>
      )
    }
    else if (contentType.includes("audio") || ["mp3", "wav", "ogg", "aac"].includes(extension)) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '400px', background: '#f9fafb' }}>
          <div className="text-center">
            <SpeakerWaveIcon className="h-20 w-20 text-gray-400 mx-auto mb-4" />
            <audio controls style={{ width: '100%', maxWidth: '400px' }}>
              <source src={fileData.url} type={contentType} />
            </audio>
            <p className="mt-2 text-sm text-gray-600">{fileName}</p>
          </div>
        </div>
      )
    }
    else {
      return (
        <iframe
          src={fileData.url}
          style={{ width: '100%', height: '100%', minHeight: '500px', border: 'none', display: 'block' }}
          title={`${isFirst ? "First" : "Second"} file - ${fileName}`}
        />
      )
    }
  }

  // ============================================================
  // COMPARE FILES
  // ============================================================
  const compareFiles = async () => {
    const totalSelected = selectedFirstFileIds.length + selectedSecondFileIds.length

    if (totalSelected !== 2) {
      setWarningMessage("Please select exactly 2 documents to compare.")
      return
    }

    let firstFile, secondFile, firstDocHeader, secondDocHeader

    if (selectedFirstFileIds.length === 2) {
      firstFile = firstFileDocuments.find(doc => doc.detailsId === selectedFirstFileIds[0])
      secondFile = firstFileDocuments.find(doc => doc.detailsId === selectedFirstFileIds[1])
      firstDocHeader = documentHeaders.find(header => header.fileNo === selectedFirstFileNo)
      secondDocHeader = firstDocHeader
    } else if (selectedSecondFileIds.length === 2) {
      firstFile = secondFileDocuments.find(doc => doc.detailsId === selectedSecondFileIds[0])
      secondFile = secondFileDocuments.find(doc => doc.detailsId === selectedSecondFileIds[1])
      secondDocHeader = documentHeaders.find(header => header.fileNo === selectedSecondFileNo)
      firstDocHeader = secondDocHeader
    } else {
      firstFile = firstFileDocuments.find(doc => doc.detailsId === selectedFirstFileIds[0])
      secondFile = secondFileDocuments.find(doc => doc.detailsId === selectedSecondFileIds[0])
      firstDocHeader = documentHeaders.find(header => header.fileNo === selectedFirstFileNo)
      secondDocHeader = documentHeaders.find(header => header.fileNo === selectedSecondFileNo)
    }

    if (!firstFile || !secondFile) {
      setWarningMessage("Selected files not found. Please try again.")
      return
    }

    if (firstFile.detailsId === secondFile.detailsId) {
      setWarningMessage("Cannot compare the same document. Please select two different documents.")
      return
    }

    setIsComparing(true)
    setIsLoadingFiles(true)
    setComparisonResult(null)

    try {
      const firstFileId = firstFile.detailsId
      const secondFileId = secondFile.detailsId

      console.log('📊 Comparing files:', { firstFileId, secondFileId })

      const response = await apiClient.post(
        `${DOCUMENTHEADER_API}/compare`,
        {
          firstFileId: firstFileId.toString(),
          secondFileId: secondFileId.toString()
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 60000
        }
      )

      const result = response.data

      if (result.status === 200 && result.message === "success") {
        const apiResponse = result.response

        console.log('🔄 Loading file previews...')

        // ✅ Pass only file — path is on the file object directly
        const [firstFileData, secondFileData] = await Promise.all([
          getFilePreviewUrl(firstFile),
          getFilePreviewUrl(secondFile)
        ])

        console.log('📸 Preview load result:', {
          firstFile: firstFileData ? '✅ Loaded' : '❌ Failed',
          secondFile: secondFileData ? '✅ Loaded' : '❌ Failed'
        })

        setFileUrls({ firstFile: firstFileData, secondFile: secondFileData })

        const comparisonResultData = {
          identical: apiResponse.identical,
          message: apiResponse.message,
          similarityPercentage: apiResponse.similarityPercentage,
          differences: apiResponse.differences || [],
          comparisonResult: apiResponse.comparisonResult,
          leftFile: {
            fileName: apiResponse.comparisonResult?.leftFile?.fileName || firstFile?.fileName || firstFile?.docName || "Unknown",
            version: apiResponse.comparisonResult?.leftFile?.version || firstFile?.version || "Unknown",
            fileType: apiResponse.comparisonResult?.leftFile?.fileType || firstFile?.fileType || "Unknown",
            path: apiResponse.comparisonResult?.leftFile?.filePath || firstFile?.path || "",
            detailsId: firstFile?.detailsId || null,
            highlightedContent: apiResponse.comparisonResult?.leftFile?.highlightedContent || "",
            fileData: firstFile,
            docHeader: firstDocHeader
          },
          rightFile: {
            fileName: apiResponse.comparisonResult?.rightFile?.fileName || secondFile?.fileName || secondFile?.docName || "Unknown",
            version: apiResponse.comparisonResult?.rightFile?.version || secondFile?.version || "Unknown",
            fileType: apiResponse.comparisonResult?.rightFile?.fileType || secondFile?.fileType || "Unknown",
            path: apiResponse.comparisonResult?.rightFile?.filePath || secondFile?.path || "",
            detailsId: secondFile?.detailsId || null,
            highlightedContent: apiResponse.comparisonResult?.rightFile?.highlightedContent || "",
            fileData: secondFile,
            docHeader: secondDocHeader
          },
          diffImagePath: apiResponse.diffImagePath,
        }

        setComparisonResult(comparisonResultData)
        setShowComparisonModal(true)

        if (apiResponse.identical) {
          showPopup(`Files are identical (${apiResponse.similarityPercentage?.toFixed(1)}% similar)`, "success")
        } else {
          showPopup(`Differences found (${apiResponse.similarityPercentage?.toFixed(1)}% similar)`, "info")
        }
      } else {
        showPopup(result.message || "Failed to compare files", "error")
      }
    } catch (error) {
      console.error("Error comparing files:", error)
      let errorMessage = "Failed to compare files"
      if (error.response?.status === 400) {
        errorMessage = error.response.data?.message || "Invalid file paths or files are missing"
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = "Comparison timeout. Files might be too large."
      } else if (error.response) {
        errorMessage = error.response.data?.message || "Server error occurred"
      } else if (error.request) {
        errorMessage = "No response from server. Please check your connection."
      }
      showPopup(errorMessage, "error")
    } finally {
      setIsComparing(false)
      setIsLoadingFiles(false)
    }
  }

  const downloadFile = async (fileId, fileName) => {
    try {
      const response = await apiClient.get(`${DOCUMENTHEADER_API}/download/${fileId}`, {
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
      onClose: () => setPopupMessage(null)
    })
  }

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
      case "ADDED": return "bg-green-100 border-green-400 text-green-800"
      case "DELETED": return "bg-red-100 border-red-400 text-red-800"
      case "MODIFIED": return "bg-yellow-100 border-yellow-400 text-yellow-800"
      default: return "bg-gray-100 border-gray-400 text-gray-800"
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

  // Clear warning after 5s
  useEffect(() => {
    if (warningMessage) {
      const timer = setTimeout(() => setWarningMessage(""), 5000)
      return () => clearTimeout(timer)
    }
  }, [warningMessage])

  // ============================================================
  // FILE SEARCH DROPDOWN
  // ============================================================
  const FileSearchDropdown = ({ isFirst = true }) => {
    const dropdownRef = useRef(null)
    const inputRef = useRef(null)

    const searchTerm = isFirst ? firstSearchTerm : secondSearchTerm
    const setSearchTerm = isFirst ? setFirstSearchTerm : setSecondSearchTerm
    const selectedCategory = isFirst ? firstSelectedCategory : secondSelectedCategory
    const setSelectedCategory = isFirst ? setFirstSelectedCategory : setSecondSelectedCategory
    const showDropdown = isFirst ? firstShowDropdown : secondShowDropdown
    const setShowDropdown = isFirst ? setFirstShowDropdown : setSecondShowDropdown
    const selectedFileNo = isFirst ? selectedFirstFileNo : selectedSecondFileNo
    const filteredHeaders = isFirst ? filteredFirstFileHeaders : filteredSecondFileHeaders

    useEffect(() => {
      if (showDropdown && inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.focus()
      }
    }, [showDropdown, searchTerm])

    useEffect(() => {
      const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          setShowDropdown(false)
        }
      }
      if (showDropdown) {
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
      }
    }, [showDropdown, setShowDropdown])

    const handleInputChange = (e) => {
      setSearchTerm(e.target.value)
      if (!showDropdown) setShowDropdown(true)
    }

    const handleCategoryChange = (e) => {
      setSelectedCategory(e.target.value)
      setShowDropdown(true)
      setTimeout(() => { if (inputRef.current) inputRef.current.focus() }, 0)
    }

    const handleSelectFile = (fileNo) => {
      if (isFirst) {
        setSelectedFirstFileNo(fileNo)
        setFirstSearchTerm("")
        setFirstSelectedCategory("")
        if (fileNo) fetchDocumentsByFileNo(fileNo, true)
      } else {
        setSelectedSecondFileNo(fileNo)
        setSecondSearchTerm("")
        setSecondSelectedCategory("")
        if (fileNo) fetchDocumentsByFileNo(fileNo, false)
      }
      setShowDropdown(false)
    }

    const clearSelection = () => {
      if (isFirst) {
        setSelectedFirstFileNo("")
        setFirstSearchTerm("")
        setFirstSelectedCategory("")
        setFirstFileDocuments([])
        setSelectedFirstFileIds([])
      } else {
        setSelectedSecondFileNo("")
        setSecondSearchTerm("")
        setSecondSelectedCategory("")
        setSecondFileDocuments([])
        setSelectedSecondFileIds([])
      }
      setShowDropdown(false)
    }

    const getCategoryName = (header) =>
      header.categoryMaster?.name || header.category?.name || "Unknown Category"

    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && filteredHeaders.length > 0) {
        handleSelectFile(filteredHeaders[0].fileNo)
      }
    }

    return (
      <div className="relative w-full" ref={dropdownRef}>
        <div className="flex gap-2 mb-2">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              placeholder={translateInstant('Select File', currentLanguage)}
              value={searchTerm}
              onChange={handleInputChange}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>

          <select
            value={selectedCategory}
            onChange={handleCategoryChange}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-700 min-w-max"
          >
            <option value=""><AutoTranslate>All Categories</AutoTranslate></option>
            {categoryOptions.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>

        {selectedFileNo && (
          <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg flex justify-between items-center">
            <div>
              <div className="font-semibold text-blue-900">{selectedFileNo}</div>
              <div className="text-xs text-blue-700">
                {documentHeaders.find(h => h.fileNo === selectedFileNo)?.title || 'Unknown'}
              </div>
            </div>
            <button onClick={clearSelection} className="text-blue-500 hover:text-blue-700 p-1 hover:bg-blue-100 rounded">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        )}

        {showDropdown && !selectedFileNo && (
          <div
            className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-80 overflow-hidden flex flex-col"
            onMouseDown={(e) => e.preventDefault()}
          >
            {(searchTerm || selectedCategory) && (
              <div className="px-3 py-2 bg-gray-50 border-b text-xs text-gray-600 sticky top-0">
                {searchTerm && (
                  <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded mr-2 mb-1">
                    <AutoTranslate>Search:</AutoTranslate> "{searchTerm}"
                  </span>
                )}
                {selectedCategory && (
                  <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded">
                    {categoryOptions.find(cat => cat.id.toString() === selectedCategory)?.name}
                  </span>
                )}
              </div>
            )}

            <div className="overflow-y-auto flex-1">
              {filteredHeaders.length === 0 ? (
                <div className="p-6 text-center">
                  <DocumentIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm font-medium">
                    {searchTerm.trim().length > 0
                      ? <AutoTranslate>No files found</AutoTranslate>
                      : <AutoTranslate>Start typing to search</AutoTranslate>}
                  </p>
                </div>
              ) : (
                filteredHeaders.map((header) => (
                  <div
                    key={header.fileNo}
                    onClick={() => handleSelectFile(header.fileNo)}
                    className="px-3 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                  >
                    <div className="font-semibold text-gray-900 text-sm">{header.fileNo}</div>
                    <div className="text-sm text-gray-700 mt-0.5 truncate">
                      {header.title || <AutoTranslate>No title</AutoTranslate>}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      {header.subject || <AutoTranslate>No subject</AutoTranslate>}
                    </div>
                    <div className="text-xs text-blue-600 mt-1">{getCategoryName(header)}</div>
                  </div>
                ))
              )}
            </div>

            {filteredHeaders.length > 0 && (
              <div className="px-3 py-2 bg-gray-50 border-t text-xs text-gray-600 text-center">
                {filteredHeaders.length} <AutoTranslate>results</AutoTranslate>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="px-2">
      <h1 className="text-2xl mb-1 font-semibold">
        <AutoTranslate>File Compare</AutoTranslate>
      </h1>
      <div className="bg-white p-4 rounded-lg shadow-sm">
        {popupMessage && (
          <Popup
            message={popupMessage.message}
            type={popupMessage.type}
            onClose={popupMessage.onClose}
          />
        )}

        {warningMessage && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" />
            <p className="text-sm text-yellow-800">{warningMessage}</p>
          </div>
        )}

        <div className="mb-4 bg-slate-100 p-4 rounded-lg">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* First File */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-700"><AutoTranslate>First File</AutoTranslate></h3>
                <span className="text-sm text-gray-500"><AutoTranslate>Selected:</AutoTranslate> {selectedFirstFileIds.length}/2</span>
              </div>
              <div className="block text-md font-medium text-gray-700">
                <AutoTranslate>Select File</AutoTranslate> <span className="text-red-500">*</span>
                <FileSearchDropdown isFirst={true} />
              </div>
              <div className="block text-md font-medium text-gray-700">
                <AutoTranslate>Select Documents</AutoTranslate> <span className="text-red-500">*</span>
                <div className="mt-1 border rounded-md p-2 max-h-40 overflow-y-auto">
                  {firstFileDocuments.length > 0 ? (
                    firstFileDocuments.map((doc) => {
                      const isSelected = selectedFirstFileIds.includes(doc.detailsId)
                      const totalSelected = selectedFirstFileIds.length + selectedSecondFileIds.length
                      const canSelect = totalSelected < 2 || isSelected
                      return (
                        <div key={doc.detailsId} className={`flex items-center p-2 hover:bg-gray-50 rounded ${!canSelect ? "opacity-50" : ""}`}>
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
                              <div className="text-xs text-gray-500"><AutoTranslate>Version:</AutoTranslate> {doc.version}</div>
                            </label>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-sm text-gray-500 p-2">
                      {selectedFirstFileNo
                        ? <AutoTranslate>No documents available</AutoTranslate>
                        : <AutoTranslate>Select a file to see documents</AutoTranslate>}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Second File */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-700"><AutoTranslate>Second File</AutoTranslate></h3>
                <span className="text-sm text-gray-500"><AutoTranslate>Selected:</AutoTranslate> {selectedSecondFileIds.length}/2</span>
              </div>
              <div className="block text-md font-medium text-gray-700">
                <AutoTranslate>Select File</AutoTranslate> <span className="text-red-500">*</span>
                <FileSearchDropdown isFirst={false} />
              </div>
              <div className="block text-md font-medium text-gray-700">
                <AutoTranslate>Select Documents</AutoTranslate> <span className="text-red-500">*</span>
                <div className="mt-1 border rounded-md p-2 max-h-40 overflow-y-auto">
                  {secondFileDocuments.length > 0 ? (
                    secondFileDocuments.map((doc) => {
                      const isSelected = selectedSecondFileIds.includes(doc.detailsId)
                      const totalSelected = selectedFirstFileIds.length + selectedSecondFileIds.length
                      const canSelect = totalSelected < 2 || isSelected
                      return (
                        <div key={doc.detailsId} className={`flex items-center p-2 hover:bg-gray-50 rounded ${!canSelect ? "opacity-50" : ""}`}>
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
                              <div className="text-xs text-gray-500"><AutoTranslate>Version:</AutoTranslate> {doc.version}</div>
                            </label>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-sm text-gray-500 p-2">
                      {selectedSecondFileNo
                        ? <AutoTranslate>No documents available</AutoTranslate>
                        : <AutoTranslate>Select a file to see documents</AutoTranslate>}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              onClick={compareFiles}
              disabled={isComparing || selectedFirstFileIds.length + selectedSecondFileIds.length !== 2}
              className={`bg-blue-900 text-white rounded-2xl px-6 py-3 text-sm flex items-center justify-center transition-all ${
                isComparing || selectedFirstFileIds.length + selectedSecondFileIds.length !== 2
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-blue-800 hover:scale-105"
              }`}
            >
              {isComparing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  <AutoTranslate>Comparing...</AutoTranslate>
                </>
              ) : (
                <>
                  <ArrowsRightLeftIcon className="h-5 w-5 mr-2" />
                  <AutoTranslate>Compare Files</AutoTranslate>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ✅ FIXED COMPARISON MODAL — uses inline styles for reliable height */}
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
                background: 'white', borderRadius: '8px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                width: '100%', maxWidth: '1280px', height: '90vh',
                display: 'flex', flexDirection: 'column', overflow: 'hidden'
              }}
            >
              {/* Modal Header */}
              <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>
                      <AutoTranslate>File Compare</AutoTranslate>
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {comparisonResult.identical
                        ? <CheckCircleIcon style={{ height: '24px', width: '24px', color: '#22c55e', marginRight: '8px' }} />
                        : <XCircleIcon style={{ height: '24px', width: '24px', color: '#ef4444', marginRight: '8px' }} />
                      }
                      <span style={{
                        padding: '4px 12px', borderRadius: '9999px', fontSize: '14px', fontWeight: 500,
                        background: comparisonResult.identical ? '#dcfce7' : '#fee2e2',
                        color: comparisonResult.identical ? '#166534' : '#991b1b'
                      }}>
                        {comparisonResult.similarityPercentage?.toFixed(1) || "0.0"}% <AutoTranslate>Similar</AutoTranslate>
                      </span>
                    </div>
                  </div>
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
                <nav style={{ display: 'flex', gap: '0', padding: '0 16px' }}>
                  {[
                    { id: 'preview', label: 'File Preview' },
                    { id: 'differences', label: `Differences (${comparisonResult.differences?.length || 0})` },
                    ...(bothImages ? [{ id: 'visualDiff', label: 'Visual Diff' }] : []),
                    ...(bothText ? [{ id: 'textDiff', label: 'Text Comparison' }] : []),
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        padding: '10px 4px', marginRight: '24px',
                        borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                        color: activeTab === tab.id ? '#2563eb' : '#6b7280',
                        fontWeight: 500, fontSize: '14px', background: 'transparent',
                        border: 'none', borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                        cursor: 'pointer'
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* File name headers for preview tab */}
              {activeTab === "preview" && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: '#e5e7eb', flexShrink: 0 }}>
                  <div style={{ background: '#eff6ff', padding: '12px 16px', display: 'flex', alignItems: 'center' }}>
                    {getFileTypeIcon(comparisonResult.leftFile.fileType)}
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
                    {getFileTypeIcon(comparisonResult.rightFile.fileType)}
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

              {/* ✅ MAIN CONTENT AREA — flex:1 + minHeight:0 is the critical fix */}
              <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                {activeTab === "preview" ? (
                  <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
                    {isLoadingFiles ? (
                      <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                          <p className="text-gray-600"><AutoTranslate>Loading file previews...</AutoTranslate></p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* ✅ LEFT PANEL */}
                        <div style={{
                          width: '50%', display: 'flex', flexDirection: 'column',
                          minHeight: 0, borderRight: '4px solid',
                          borderColor: comparisonResult.similarityPercentage === 100 ? '#4ade80'
                            : comparisonResult.similarityPercentage >= 80 ? '#facc15' : '#f87171'
                        }}>
                          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                            {renderFileViewer(comparisonResult.leftFile, fileUrls.firstFile, true)}
                          </div>
                        </div>

                        {/* ✅ RIGHT PANEL */}
                        <div style={{
                          width: '50%', display: 'flex', flexDirection: 'column', minHeight: 0
                        }}>
                          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                            {renderFileViewer(comparisonResult.rightFile, fileUrls.secondFile, false)}
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
                    {comparisonResult.comparisonResult?.summary && (
                      <div style={{ display: 'flex', gap: '16px', fontSize: '14px' }}>
                        {comparisonResult.comparisonResult.summary.totalLinesAdded > 0 && (
                          <span style={{ color: '#16a34a' }}>+{comparisonResult.comparisonResult.summary.totalLinesAdded} added</span>
                        )}
                        {comparisonResult.comparisonResult.summary.totalLinesDeleted > 0 && (
                          <span style={{ color: '#dc2626' }}>-{comparisonResult.comparisonResult.summary.totalLinesDeleted} deleted</span>
                        )}
                        {comparisonResult.comparisonResult.summary.totalLinesModified > 0 && (
                          <span style={{ color: '#ca8a04' }}>~{comparisonResult.comparisonResult.summary.totalLinesModified} modified</span>
                        )}
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

        {!comparisonResult && !showComparisonModal && (
          <div className="text-center py-12 text-gray-500">
            <DocumentDuplicateIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium"><AutoTranslate>Select exactly 2 documents to compare</AutoTranslate></p>
            <p className="text-sm"><AutoTranslate>You can select documents from the same file or different files</AutoTranslate></p>
            <div className="mt-4 text-xs text-gray-400">
              <p>• <AutoTranslate>Select 2 documents from first file only</AutoTranslate></p>
              <p>• <AutoTranslate>Select 2 documents from second file only</AutoTranslate></p>
              <p>• <AutoTranslate>Select 1 document from each file</AutoTranslate></p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default FileCompare

// ============================================================
// VISUAL DIFF PANEL
// ============================================================
function VisualDiffPanel({ leftUrl, rightUrl, leftName, rightName }) {
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

      const aCanvas = document.createElement("canvas")
      aCanvas.width = w; aCanvas.height = h
      const aCtx = aCanvas.getContext("2d")
      aCtx.drawImage(imgA, 0, 0, w, h)

      const bCanvas = document.createElement("canvas")
      bCanvas.width = w; bCanvas.height = h
      const bCtx = bCanvas.getContext("2d")
      bCtx.drawImage(imgB, 0, 0, w, h)

      const aData = aCtx.getImageData(0, 0, w, h)
      const bData = bCtx.getImageData(0, 0, w, h)
      const out = ctx.createImageData(w, h)

      for (let i = 0; i < aData.data.length; i += 4) {
        const r1 = aData.data[i], g1 = aData.data[i + 1], b1 = aData.data[i + 2]
        const r2 = bData.data[i], g2 = bData.data[i + 1], b2 = bData.data[i + 2]
        const diff = Math.sqrt((r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2)
        if (diff <= threshold) {
          out.data[i] = r1; out.data[i+1] = g1; out.data[i+2] = b1; out.data[i+3] = 255
        } else {
          out.data[i] = Math.min(255, r1 + (255 - r1) * 0.8)
          out.data[i+1] = Math.max(0, g1 * 0.3)
          out.data[i+2] = Math.max(0, b1 * 0.3)
          out.data[i+3] = 255
        }
      }
      ctx.putImageData(out, 0, 0)
    }

    imgA.onload = () => { if (imgB.complete) draw() }
    imgB.onload = () => { if (imgA.complete) draw() }
    return () => { cancelled = true }
  }, [leftUrl, rightUrl, mode, threshold])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', background: 'white', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '14px', color: '#374151' }}>
          <span style={{ fontWeight: 500 }}>{leftName}</span> vs <span style={{ fontWeight: 500 }}>{rightName}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['overlay', 'pixel'].map(m => (
              <button key={m} onClick={() => setMode(m)}
                style={{ padding: '4px 12px', borderRadius: '4px', fontSize: '14px', border: 'none', cursor: 'pointer',
                  background: mode === m ? '#2563eb' : '#f3f4f6', color: mode === m ? 'white' : '#374151' }}>
                {m === 'overlay' ? 'Overlay' : 'Pixel Diff'}
              </button>
            ))}
          </div>
          {mode === "overlay" && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
              <span>{leftName}</span>
              <input type="range" min={0} max={1} step={0.01} value={opacity}
                onChange={e => setOpacity(parseFloat(e.target.value))} style={{ width: '96px' }} />
              <span>{rightName}</span>
            </div>
          )}
          {mode === "pixel" && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
              <span>Sensitivity:</span>
              <input type="range" min={5} max={100} step={5} value={threshold}
                onChange={e => setThreshold(parseInt(e.target.value))} style={{ width: '96px' }} />
              <span>{threshold}</span>
            </div>
          )}
        </div>
      </div>
      <div ref={containerRef} style={{ flex: 1, background: '#f9fafb', overflow: 'auto', padding: '16px' }}>
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
          {mode === "overlay" ? (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img src={leftUrl} crossOrigin="anonymous" alt={leftName}
                style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: 'calc(90vh - 300px)', display: 'block' }} />
              <img src={rightUrl} crossOrigin="anonymous" alt={rightName}
                style={{ opacity, width: 'auto', height: 'auto', maxWidth: '100%', position: 'absolute', top: 0, left: 0 }} />
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <canvas ref={canvasRef} style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: 'calc(90vh - 300px)', border: '1px solid #e5e7eb' }} />
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>Red areas indicate differences</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// TEXT DIFF PANEL
// ============================================================
function TextDiffPanel({ leftContent, rightContent, differences, leftName, rightName, comparisonResult, leftHighlightedContent, rightHighlightedContent }) {
  const [viewMode, setViewMode] = useState('full-document')

  const leftHighlighted = leftHighlightedContent || (comparisonResult?.leftFile?.highlightedContent || '')
  const rightHighlighted = rightHighlightedContent || (comparisonResult?.rightFile?.highlightedContent || '')

  const renderHighlightedContent = (content, isLeft = true) => {
    if (!content) return (
      <div style={{ color: '#9ca3af', fontStyle: 'italic', padding: '16px', textAlign: 'center' }}>
        No content available for {isLeft ? leftName : rightName}
      </div>
    )

    if (typeof content === 'string' && content.includes('<span class="diff-')) {
      return <div className="highlighted-content" dangerouslySetInnerHTML={{ __html: content }} />
    }

    if (Array.isArray(content)) {
      return (
        <div className="full-document-content">
          {content.map((line, index) => {
            const lineDiff = differences?.find(d =>
              (isLeft && d.leftLineNumber === index + 1) ||
              (!isLeft && d.rightLineNumber === index + 1)
            )
            let className = "document-line"
            if (lineDiff?.type === 'DELETED') className += " deleted"
            else if (lineDiff?.type === 'ADDED') className += " added"
            else if (lineDiff?.type === 'MODIFIED') className += " modified"
            return <div key={index} className={className}>{line || <span>&nbsp;</span>}</div>
          })}
        </div>
      )
    }

    return (
      <div className="full-document-content">
        {String(content).split('\n').map((line, index) => (
          <div key={index} className="document-line">{line}</div>
        ))}
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', background: 'white', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '14px', color: '#374151' }}>
          <span style={{ fontWeight: 500 }}>{leftName}</span> vs <span style={{ fontWeight: 500 }}>{rightName}</span>
          {differences?.length > 0 && <span style={{ marginLeft: '12px', color: '#dc2626' }}>({differences.length} differences)</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: '#6b7280' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ width: '12px', height: '12px', background: '#fef2f2', border: '1px solid #ef4444', marginRight: '4px' }}></div>
              <span>Deleted</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ width: '12px', height: '12px', background: '#f0fdf4', border: '1px solid #22c55e', marginRight: '4px' }}></div>
              <span>Added</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ width: '12px', height: '12px', background: '#fffbeb', border: '1px solid #eab308', marginRight: '4px' }}></div>
              <span>Modified</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['full-document', 'differences-only'].map(mode => (
              <button key={mode} onClick={() => setViewMode(mode)}
                style={{ padding: '4px 12px', borderRadius: '4px', fontSize: '12px', border: 'none', cursor: 'pointer',
                  background: viewMode === mode ? '#2563eb' : '#f3f4f6', color: viewMode === mode ? 'white' : '#374151' }}>
                {mode === 'full-document' ? 'Full Document' : 'Differences Only'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .full-document-content { background: white; padding: 16px; border-radius: 8px; }
        .document-line { padding: 4px 8px; margin: 2px 0; border-left: 3px solid transparent; white-space: pre-wrap; word-wrap: break-word; line-height: 1.5; font-family: 'Monaco','Menlo','Ubuntu Mono',monospace; font-size: 13px; }
        .document-line.deleted { background: #fef2f2; color: #dc2626; text-decoration: line-through; border-left-color: #dc2626; }
        .document-line.added { background: #f0fdf4; color: #16a34a; border-left-color: #16a34a; }
        .document-line.modified { background: #fffbeb; color: #ca8a04; border-left-color: #ca8a04; }
        .highlighted-content { font-family: 'Monaco','Menlo',monospace; font-size: 13px; line-height: 1.5; white-space: pre-wrap; background: white; padding: 16px; border-radius: 8px; }
        .highlighted-content .diff-deleted { background: #fef2f2; color: #dc2626; text-decoration: line-through; }
        .highlighted-content .diff-added { background: #f0fdf4; color: #16a34a; }
        .highlighted-content .diff-modified { background: #fffbeb; color: #ca8a04; }
      `}</style>

      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', background: '#f9fafb' }}>
        {viewMode === 'full-document' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', height: '100%', overflow: 'auto', padding: '16px' }}>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', background: 'white', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ background: '#eff6ff', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 500, color: '#1e40af', display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
                <span>{leftName} (Original)</span>
                <span style={{ fontSize: '12px', fontWeight: 400 }}>{differences?.filter(d => d.type === 'DELETED' || d.type === 'MODIFIED').length} changes</span>
              </div>
              <div style={{ padding: '16px', overflow: 'auto', flex: 1 }}>
                {renderHighlightedContent(leftHighlighted || leftContent, true)}
              </div>
            </div>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', background: 'white', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ background: '#eff6ff', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 500, color: '#1e40af', display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
                <span>{rightName} (Modified)</span>
                <span style={{ fontSize: '12px', fontWeight: 400 }}>{differences?.filter(d => d.type === 'ADDED' || d.type === 'MODIFIED').length} changes</span>
              </div>
              <div style={{ padding: '16px', overflow: 'auto', flex: 1 }}>
                {renderHighlightedContent(rightHighlighted || rightContent, false)}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ height: '100%', overflow: 'auto', padding: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {differences?.length > 0 ? differences.map((diff, index) => (
                <div key={index} style={{
                  padding: '12px', borderRadius: '8px', borderLeft: '4px solid',
                  borderLeftColor: diff.type === 'ADDED' ? '#4ade80' : diff.type === 'DELETED' ? '#f87171' : '#facc15',
                  background: diff.type === 'ADDED' ? '#f0fdf4' : diff.type === 'DELETED' ? '#fef2f2' : '#fffbeb'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500,
                      background: diff.type === 'ADDED' ? '#dcfce7' : diff.type === 'DELETED' ? '#fee2e2' : '#fef9c3',
                      color: diff.type === 'ADDED' ? '#166534' : diff.type === 'DELETED' ? '#991b1b' : '#854d0e' }}>
                      {diff.type}
                    </span>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                      Line {diff.leftLineNumber !== -1 ? diff.leftLineNumber : "N/A"} → {diff.rightLineNumber !== -1 ? diff.rightLineNumber : "N/A"}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280', marginBottom: '4px' }}>Original</div>
                      <div style={{ fontSize: '13px', background: 'white', padding: '8px', borderRadius: '4px', border: '1px solid #e5e7eb', fontFamily: 'monospace' }}>
                        {diff.leftContent || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>No content</span>}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280', marginBottom: '4px' }}>Modified</div>
                      <div style={{ fontSize: '13px', background: 'white', padding: '8px', borderRadius: '4px', border: '1px solid #e5e7eb', fontFamily: 'monospace' }}>
                        {diff.rightContent || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>No content</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <CheckCircleIcon style={{ height: '64px', width: '64px', color: '#22c55e', margin: '0 auto 16px' }} />
                    <p style={{ fontSize: '18px', fontWeight: 500, color: '#374151' }}>No differences found</p>
                    <p style={{ fontSize: '14px', color: '#6b7280' }}>Files are identical</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}