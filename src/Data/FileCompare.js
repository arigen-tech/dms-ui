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

import { DOCUMENTHEADER_API, API_HOST } from "../API/apiConfig"
import {
  getRequest,
  postRequest,
  putRequest,
  getImageRequest
} from "../API/apiService"; 

import LoadingComponent from '../Components/LoadingComponent'
import Popup from '../Components/Popup'
import AutoTranslate from '../i18n/AutoTranslate'
import { useLanguage } from '../i18n/LanguageContext'
import { translateInstant } from '../i18n/autoTranslator'
import apiClient from "../API/apiClient";

// ✅ FIX: Get the actual token from localStorage, not the string literal
const tokenKey = typeof window !== "undefined" ? localStorage.getItem("tokenKey") : null

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

  // Debug log
  useEffect(() => {
    console.log('🔍 FileCompare Component - Language Status:', {
      currentLanguage,
      defaultLanguage,
      isTranslationNeeded: isTranslationNeeded(),
      translationStatus,
      availableLanguagesCount: availableLanguages.length,
      pathname: window.location.pathname
    })
  }, [currentLanguage, defaultLanguage, translationStatus, isTranslationNeeded, availableLanguages])

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

  // ============================================================
  // NEW STATE DECLARATIONS
  // ============================================================
  const [categoryOptions, setCategoryOptions] = useState([])
  const [firstSearchTerm, setFirstSearchTerm] = useState("")
  const [firstSelectedCategory, setFirstSelectedCategory] = useState("")
  const [firstShowDropdown, setFirstShowDropdown] = useState(false)
  const [secondSearchTerm, setSecondSearchTerm] = useState("")
  const [secondSelectedCategory, setSecondSelectedCategory] = useState("")
  const [secondShowDropdown, setSecondShowDropdown] = useState(false)

  const [selectedDoc, setSelectedDoc] = useState(null);

  // ============================================================
  // EFFECT 1: Initialize on mount
  // ============================================================
  useEffect(() => {
    console.log('📍 FileCompare Component Mounted')
    fetchAllDocumentHeaders()
    fetchCategory()
  }, [])

  const fetchAllDocumentHeaders = async () => {
    setIsLoading(true)
    try {
      const response = await getRequest(`${DOCUMENTHEADER_API}/getAllDocument`)
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
      const response = await getRequest(`${API_HOST}/CategoryMaster/findActiveCategory`)
      setCategoryOptions(response.data)
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  // ============================================================
  // UPDATED fetchDocumentsByFileNo FUNCTION
  // ============================================================
  const fetchDocumentsByFileNo = async (fileNo, isFirst = true) => {
    try {
      console.log(`📋 Fetching documents for file: ${fileNo}`);

      const response = await getRequest(`${DOCUMENTHEADER_API}/getFile/${fileNo}`);

      const data = response.data || {};
      const fileList = data.fileList || [];

      // Find the document header for this file
      const docHeader = documentHeaders.find(header => header.fileNo === fileNo);

      console.log(`✅ Found ${fileList.length} documents for file ${fileNo}`);
      console.log('Document Header:', docHeader);

      // Add document header info to each file (for reference)
      const filesWithHeader = fileList.map(file => ({
        ...file,
        docHeader: docHeader
      }));

      if (isFirst) {
        setFirstFileDocuments(filesWithHeader);
      } else {
        setSecondFileDocuments(filesWithHeader);
      }

      setWarningMessage("");
      return filesWithHeader;
    } catch (error) {
      console.error("❌ Error fetching documents:", error);
      showPopup("Failed to fetch documents", "error");
      return [];
    }
  };

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
        if (header.categoryMaster && header.categoryMaster.id) {
          return header.categoryMaster.id.toString() === firstSelectedCategory.toString()
        }
        if (header.category && header.category.id) {
          return header.category.id.toString() === firstSelectedCategory.toString()
        }
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
        if (header.categoryMaster && header.categoryMaster.id) {
          return header.categoryMaster.id.toString() === secondSelectedCategory.toString()
        }
        if (header.category && header.category.id) {
          return header.category.id.toString() === secondSelectedCategory.toString()
        }
        return false
      })
    }

    return filtered
  }, [documentHeaders, secondSearchTerm, secondSelectedCategory])

  const handleFileSelection = (fileId, isFirst = true) => {
    const currentFirstCount = selectedFirstFileIds.length
    const currentSecondCount = selectedSecondFileIds.length
    const totalSelected = currentFirstCount + currentSecondCount

    const selectedFile = isFirst
      ? firstFileDocuments.find(doc => doc.detailsId === fileId)
      : secondFileDocuments.find(doc => doc.detailsId === fileId);

    if (totalSelected === 1) {
      let existingFile;

      if (currentFirstCount === 1) {
        existingFile = firstFileDocuments.find(doc => doc.detailsId === selectedFirstFileIds[0]);
      } else if (currentSecondCount === 1) {
        existingFile = secondFileDocuments.find(doc => doc.detailsId === selectedSecondFileIds[0]);
      }

      if (existingFile && !areFilesComparable(existingFile, selectedFile)) {
        const existingFileName = existingFile.fileName || existingFile.docName || "File";
        const selectedFileName = selectedFile.fileName || selectedFile.docName || "File";
        const existingExt = existingFileName.split('.').pop()?.toUpperCase() || "Unknown";
        const selectedExt = selectedFileName.split('.').pop()?.toUpperCase() || "Unknown";

        setWarningMessage(<AutoTranslate>Cannot compare {existingExt} with {selectedExt}. Please select files with the same format.</AutoTranslate>);
        return;
      }
    }

    if (isFirst) {
      const isAlreadySelected = selectedFirstFileIds.includes(fileId)
      if (isAlreadySelected) {
        setSelectedFirstFileIds((prev) => prev.filter((id) => id !== fileId))
        setWarningMessage("")
      } else {
        if (totalSelected >= 2) {
          setWarningMessage(<AutoTranslate>Warning: You cannot select more than 2 documents in total across both files.</AutoTranslate>)
          return
        }
        if (currentFirstCount >= 2) {
          setWarningMessage(<AutoTranslate>Warning: You cannot select more than 2 documents in the first file.</AutoTranslate>)
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
          setWarningMessage(<AutoTranslate>Warning: You cannot select more than 2 documents in total across both files.</AutoTranslate>)
          return
        }
        if (currentSecondCount >= 2) {
          setWarningMessage(<AutoTranslate>Warning: You cannot select more than 2 documents in the second file.</AutoTranslate>)
          return
        }
        setSelectedSecondFileIds((prev) => [...prev, fileId])
        setWarningMessage("")
      }
    }
  }

  // 🔧 COPY-PASTE THIS FUNCTION
  // Replace your entire getFilePreviewUrl function with this version

  const getFilePreviewUrl = async (file, docHeader) => {
    console.log("🔍 getFilePreviewUrl called with:", {
      file: {
        docName: file?.docName,
        fileName: file?.fileName,
        year: file?.year,
        version: file?.version,
        fileType: file?.fileType
      },
      docHeader: {
        fileNo: docHeader?.fileNo,
        branch: docHeader?.employee?.branch?.name || docHeader?.branchMaster?.name,
        department: docHeader?.employee?.department?.name || docHeader?.departmentMaster?.name,
        category: docHeader?.categoryMaster?.name
      }
    });

    // Guard clauses
    if (!docHeader) {
      console.error("❌ docHeader is missing");
      return null;
    }

    if (!file) {
      console.error("❌ file is missing");
      return null;
    }

    try {
      // Extract branch with fallbacks
      const branch = (
        docHeader.employee?.branch?.name ||
        docHeader.branchMaster?.name ||
        ""
      )?.replace(/ /g, "_")?.trim();

      // Extract department with fallbacks
      const department = (
        docHeader.employee?.department?.name ||
        docHeader.departmentMaster?.name ||
        ""
      )?.replace(/ /g, "_")?.trim();

      // Extract year
      const year = (file.year || "")?.toString()?.replace(/ /g, "_")?.trim();

      // Extract category
      const category = (docHeader.categoryMaster?.name || "")?.replace(/ /g, "_")?.trim();

      // Extract version
      const version = (file.version || "")?.toString()?.trim();

      // Extract fileName - TRY MULTIPLE PROPERTIES
      const fileName = (
        file.docName ||
        file.fileName ||
        file.name ||
        ""
      )?.replace(/ /g, "_")?.trim();

      // Log exactly what we have
      console.log("✅ Extracted path components:", {
        branch: `"${branch}"`,
        department: `"${department}"`,
        year: `"${year}"`,
        category: `"${category}"`,
        version: `"${version}"`,
        fileName: `"${fileName}"`
      });

      // Validate - tell us WHICH ones are missing
      const missing = [];
      if (!branch || branch === "") missing.push("branch");
      if (!department || department === "") missing.push("department");
      if (!year || year === "") missing.push("year");
      if (!category || category === "") missing.push("category");
      if (!version || version === "") missing.push("version");
      if (!fileName || fileName === "") missing.push("fileName");

      if (missing.length > 0) {
        console.error("❌ MISSING FIELDS:", missing);
        console.error("Debug info:", {
          branch,
          department,
          year,
          category,
          version,
          fileName,
          file,
          docHeader
        });
        return null;
      }

      // Build the URL
      const fileUrl =
        `${API_HOST}/api/documents/download/` +
        `${encodeURIComponent(branch)}/` +
        `${encodeURIComponent(department)}/` +
        `${encodeURIComponent(year)}/` +
        `${encodeURIComponent(category)}/` +
        `${encodeURIComponent(version)}/` +
        `${encodeURIComponent(fileName)}?action=view`;

      console.log("🔗 Full URL:", fileUrl);

      // Check token
      if (!tokenKey) {
        console.error("❌ No authentication token");
        return null;
      }

      console.log("📡 Making API request...");

      // Fetch the file - use getImageRequest with blob response type
      const response = await getImageRequest(
        fileUrl.replace(API_HOST, ''), // Pass the endpoint without host
        {}, // headers
        "blob" // response type
      );

      console.log("✅ API response received:", {
        status: "success",
        dataSize: response.size
      });

      // Create blob and URL
      const blob = new Blob([response], {
        type: response.type || "application/octet-stream"
      });

      const blobUrl = URL.createObjectURL(blob);

      console.log("✅ File preview loaded successfully");
      console.log("📄 Preview URL:", blobUrl);

      return {
        url: blobUrl,
        fileName,
        contentType: response.type || "application/octet-stream"
      };

    } catch (error) {
      console.error("❌ Error in getFilePreviewUrl:");
      console.error({
        message: error.message
      });

      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          console.error("Server error response:", text);
        } catch (e) {
          console.error("Could not parse error blob");
        }
      }

      return null;
    }
  };

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

  const DocxViewer = ({ fileUrl, fileName }) => {
    const [htmlContent, setHtmlContent] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
      const convertDocxToHtml = async () => {
        try {
          setLoading(true);
          const response = await fetch(fileUrl);
          const arrayBuffer = await response.arrayBuffer();

          const mammoth = await import('mammoth');
          const result = await mammoth.default.convertToHtml({ arrayBuffer });

          setHtmlContent(result.value);
          setError("");
        } catch (err) {
          console.error("DOCX conversion error:", err);
          setError("Failed to load DOCX document");
        } finally {
          setLoading(false);
        }
      };

      convertDocxToHtml();
    }, [fileUrl]);

    if (loading) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">
              <AutoTranslate>Loading document...</AutoTranslate>
            </p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-50">
          <div className="text-center">
            <DocumentIcon className="h-12 w-12 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-600">
              <AutoTranslate>{error}</AutoTranslate>
            </p>
          </div>
        </div>
      );
    }

    return (
      <div
        className="h-full overflow-auto p-4 bg-white"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    );
  };

  const renderFileViewer = (file, fileData, isFirst = true) => {
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
    }
    else if (contentType.includes("word") || contentType.includes("docx") || extension === "docx") {
      return (
        <DocxViewer fileUrl={fileData.url} fileName={fileName} />
      )
    }
    else if (contentType.includes("image") || imageExtensions.includes(extension)) {
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
    else if (contentType.includes("video") || ["mp4", "avi", "mov", "wmv", "flv"].includes(extension)) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-50">
          <video controls className="max-w-full max-h-full">
            <source src={fileData.url} type={contentType} />
            <AutoTranslate>Your browser does not support the video tag.</AutoTranslate>
          </video>
        </div>
      )
    }
    else if (contentType.includes("audio") || ["mp3", "wav", "ogg", "aac"].includes(extension)) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-50">
          <div className="text-center">
            <SpeakerWaveIcon className="h-20 w-20 text-gray-400 mx-auto mb-4" />
            <audio controls className="w-full max-w-md">
              <source src={fileData.url} type={contentType} />
              <AutoTranslate>Your browser does not support the audio tag.</AutoTranslate>
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
          className="w-full h-full"
          frameBorder="0"
          title={`${isFirst ? "First" : "Second"} file - ${fileName}`}
        />
      )
    }
  }

  const areFilesComparable = (file1, file2) => {
    if (!file1 || !file2) return false;

    const getFileExtension = (file) => {
      const fileName = file.fileName || file.docName || "";
      const ext = fileName.split('.').pop()?.toLowerCase() || "";
      return ext;
    };

    const getContentTypeCategory = (contentType) => {
      if (!contentType) return "unknown";

      if (contentType.includes("pdf")) return "pdf";
      if (contentType.includes("word") || contentType.includes("docx")) return "docx";
      if (contentType.includes("excel") || contentType.includes("xlsx") || contentType.includes("spreadsheet")) return "excel";
      if (contentType.includes("powerpoint") || contentType.includes("pptx") || contentType.includes("presentation")) return "powerpoint";
      if (contentType.includes("image/")) return "image";
      if (contentType.includes("text/")) return "text";
      if (contentType.includes("video/")) return "video";
      if (contentType.includes("audio/")) return "audio";

      return "other";
    };

    const ext1 = getFileExtension(file1);
    const ext2 = getFileExtension(file2);

    const contentType1 = getContentTypeCategory(file1.fileType);
    const contentType2 = getContentTypeCategory(file2.fileType);

    if (ext1 && ext2 && ext1 === ext2) return true;

    if (contentType1 !== "unknown" && contentType1 === contentType2) return true;

    const officeExtensions = {
      doc: "docx",
      docx: "docx",
      xls: "excel",
      xlsx: "excel",
      ppt: "powerpoint",
      pptx: "powerpoint"
    };

    const category1 = officeExtensions[ext1] || contentType1;
    const category2 = officeExtensions[ext2] || contentType2;

    return category1 === category2;
  };

  const compareFiles = async () => {
    const totalSelected = selectedFirstFileIds.length + selectedSecondFileIds.length;

    if (totalSelected !== 2) {
      setWarningMessage(<AutoTranslate>Please select exactly 2 documents to compare.</AutoTranslate>);
      return;
    }

    // Get the selected files
    let firstFile, secondFile;
    let firstDocHeader, secondDocHeader;

    if (selectedFirstFileIds.length === 2) {
      firstFile = firstFileDocuments.find(doc => doc.detailsId === selectedFirstFileIds[0]);
      secondFile = firstFileDocuments.find(doc => doc.detailsId === selectedFirstFileIds[1]);
      // Find document headers for these files
      firstDocHeader = documentHeaders.find(header => header.fileNo === selectedFirstFileNo);
      secondDocHeader = firstDocHeader; // Same file, same header
    } else if (selectedSecondFileIds.length === 2) {
      firstFile = secondFileDocuments.find(doc => doc.detailsId === selectedSecondFileIds[0]);
      secondFile = secondFileDocuments.find(doc => doc.detailsId === selectedSecondFileIds[1]);
      // Find document headers for these files
      secondDocHeader = documentHeaders.find(header => header.fileNo === selectedSecondFileNo);
      firstDocHeader = secondDocHeader; // Same file, same header
    } else if (selectedFirstFileIds.length === 1 && selectedSecondFileIds.length === 1) {
      firstFile = firstFileDocuments.find(doc => doc.detailsId === selectedFirstFileIds[0]);
      secondFile = secondFileDocuments.find(doc => doc.detailsId === selectedSecondFileIds[0]);
      // Find document headers for these files
      firstDocHeader = documentHeaders.find(header => header.fileNo === selectedFirstFileNo);
      secondDocHeader = documentHeaders.find(header => header.fileNo === selectedSecondFileNo);
    }

    // Validate files exist
    if (!firstFile || !secondFile) {
      setWarningMessage(<AutoTranslate>Selected files not found. Please try again.</AutoTranslate>);
      return;
    }

    // Validate document headers exist
    if (!firstDocHeader || !secondDocHeader) {
      setWarningMessage(<AutoTranslate>Document headers not found. Please try again.</AutoTranslate>);
      return;
    }

    // Check if trying to compare the same file (same detailsId)
    if (firstFile.detailsId === secondFile.detailsId) {
      setWarningMessage(<AutoTranslate>Cannot compare the same document. Please select two different documents.</AutoTranslate>);
      return;
    }

    setIsComparing(true);
    setIsLoadingFiles(true);
    setComparisonResult(null);

    try {
      // Get file IDs for comparison
      const firstFileId = firstFile.detailsId;
      const secondFileId = secondFile.detailsId;

      console.log('📊 Comparing files with IDs:', { firstFileId, secondFileId });
      console.log('📄 First file metadata:', {
        fileName: firstFile.docName,
        branch: firstDocHeader?.employee?.branch?.name,
        department: firstDocHeader?.employee?.department?.name,
        category: firstDocHeader?.categoryMaster?.name,
        year: firstFile.year,
        version: firstFile.version
      });
      console.log('📄 Second file metadata:', {
        fileName: secondFile.docName,
        branch: secondDocHeader?.employee?.branch?.name,
        department: secondDocHeader?.employee?.department?.name,
        category: secondDocHeader?.categoryMaster?.name,
        year: secondFile.year,
        version: secondFile.version
      });

      // Make API call to compare files
      const response = await postRequest(
        `${DOCUMENTHEADER_API}/compare`,
        {
          firstFileId: firstFileId.toString(),
          secondFileId: secondFileId.toString()
        }
      );

      console.log('✅ Compare API response:', response.data);

      const result = response.data;

      if (result.status === 200 && result.message === "success") {
        const apiResponse = result.response;

        // ✅ FIX: Pass docHeader to getFilePreviewUrl function
        console.log('🔄 Loading file previews...');
        const [firstFileData, secondFileData] = await Promise.all([
          getFilePreviewUrl(firstFile, firstDocHeader),
          getFilePreviewUrl(secondFile, secondDocHeader)
        ]);

        console.log('📸 File preview data loaded:', {
          firstFile: firstFileData ? '✅ Loaded' : '❌ Failed',
          secondFile: secondFileData ? '✅ Loaded' : '❌ Failed'
        });

        setFileUrls({ firstFile: firstFileData, secondFile: secondFileData });

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
        };

        setComparisonResult(comparisonResultData);
        setShowComparisonModal(true);

        if (apiResponse.identical) {
          showPopup(
            <AutoTranslate>Files are identical ({apiResponse.similarityPercentage?.toFixed(1)}% similar)</AutoTranslate>,
            "success"
          );
        } else {
          showPopup(
            <AutoTranslate>Differences found ({apiResponse.similarityPercentage?.toFixed(1)}% similar)</AutoTranslate>,
            "info"
          );
        }
      } else {
        showPopup(result.message || <AutoTranslate>Failed to compare files</AutoTranslate>, "error");
      }
    } catch (error) {
      console.error("❌ Error comparing files:", error);

      let errorMessage = <AutoTranslate>Failed to compare files</AutoTranslate>;

      if (error.response?.status === 400) {
        errorMessage = error.response.data?.message || <AutoTranslate>Invalid file paths or files are missing</AutoTranslate>;
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = <AutoTranslate>Comparison timeout. Files might be too large.</AutoTranslate>;
      } else if (error.response) {
        errorMessage = error.response.data?.message || <AutoTranslate>Server error occurred</AutoTranslate>;
      } else if (error.request) {
        errorMessage = <AutoTranslate>No response from server. Please check your connection.</AutoTranslate>;
      }

      showPopup(errorMessage, "error");
    } finally {
      setIsComparing(false);
      setIsLoadingFiles(false);
    }
  };

  const downloadFile = async (fileId, fileName) => {
    try {
      const response = await getImageRequest(
        `${DOCUMENTHEADER_API}/download/${fileId}`,
        {},
        "blob"
      );

      const blob = new Blob([response], { 
        type: response.type || "application/octet-stream" 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading file:", error);
      showPopup("Failed to download file", "error");
    }
  };

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
      const value = e.target.value
      setSearchTerm(value)
      if (!showDropdown) {
        setShowDropdown(true)
      }
    }

    const handleInputFocus = () => {
      setShowDropdown(true)
    }

    const handleCategoryChange = (e) => {
      setSelectedCategory(e.target.value)
      setShowDropdown(true)
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 0)
    }

    const handleSelectFile = (fileNo) => {
      if (isFirst) {
        setSelectedFirstFileNo(fileNo)
        setFirstSearchTerm("")
        setFirstSelectedCategory("")
        if (fileNo) {
          fetchDocumentsByFileNo(fileNo, true)
        }
      } else {
        setSelectedSecondFileNo(fileNo)
        setSecondSearchTerm("")
        setSecondSelectedCategory("")
        if (fileNo) {
          fetchDocumentsByFileNo(fileNo, false)
        }
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

    const getCategoryName = (header) => {
      return header.categoryMaster?.name || header.category?.name || "Unknown Category"
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && filteredHeaders.length > 0) {
        handleSelectFile(filteredHeaders[0].fileNo)
      }
    }

    const handleDropdownMouseDown = (e) => {
      e.preventDefault()
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
              onFocus={handleInputFocus}
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
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
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
            <button
              onClick={clearSelection}
              className="text-blue-500 hover:text-blue-700 p-1 hover:bg-blue-100 rounded"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        )}

        {showDropdown && !selectedFileNo && (
          <div
            className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-80 overflow-hidden flex flex-col"
            onMouseDown={handleDropdownMouseDown}
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
                    {searchTerm.trim().length > 0 ? <AutoTranslate>No files found</AutoTranslate> : <AutoTranslate>Start typing to search</AutoTranslate>}
                  </p>
                </div>
              ) : (
                filteredHeaders.map((header) => (
                  <div
                    key={header.fileNo}
                    onClick={() => handleSelectFile(header.fileNo)}
                    className="px-3 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                  >
                    <div className="font-semibold text-gray-900 text-sm">
                      {header.fileNo}
                    </div>
                    <div className="text-sm text-gray-700 mt-0.5 truncate">
                      {header.title || <AutoTranslate>No title</AutoTranslate>}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      {header.subject || <AutoTranslate>No subject</AutoTranslate>}
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      {getCategoryName(header)}
                    </div>
                  </div>
                ))
              )}
            </div>

            {filteredHeaders.length > 0 && (
              <div className="px-3 py-2 bg-gray-50 border-t text-xs text-gray-600 text-center">
                {filteredHeaders.length} <AutoTranslate>result{filteredHeaders.length !== 1 ? 's' : ''}</AutoTranslate>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Clear warning message after 5 seconds
  useEffect(() => {
    if (warningMessage) {
      const timer = setTimeout(() => setWarningMessage(""), 5000)
      return () => clearTimeout(timer)
    }
  }, [warningMessage])

  return (
    <div className="px-2">
      <h1 className="text-2xl mb-1 font-semibold">
        <AutoTranslate>File Compare</AutoTranslate>
      </h1>
      <div className="bg-white p-4 rounded-lg shadow-sm">
        {warningMessage && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" />
            <p className="text-sm text-yellow-800">{warningMessage}</p>
          </div>
        )}

        <div className="mb-4 bg-slate-100 p-4 rounded-lg">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-700">
                  <AutoTranslate>First File</AutoTranslate>
                </h3>
                <span className="text-sm text-gray-500">
                  <AutoTranslate>Selected:</AutoTranslate> {selectedFirstFileIds.length}/2
                </span>
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
                              <div className="text-xs text-gray-500">
                                <AutoTranslate>Version:</AutoTranslate> {doc.version}
                              </div>
                            </label>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-sm text-gray-500 p-2">
                      {selectedFirstFileNo ? <AutoTranslate>No documents available</AutoTranslate> : <AutoTranslate>Select a file to see documents</AutoTranslate>}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-700">
                  <AutoTranslate>Second File</AutoTranslate>
                </h3>
                <span className="text-sm text-gray-500">
                  <AutoTranslate>Selected:</AutoTranslate> {selectedSecondFileIds.length}/2
                </span>
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
                              <div className="text-xs text-gray-500">
                                <AutoTranslate>Version:</AutoTranslate> {doc.version}
                              </div>
                            </label>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-sm text-gray-500 p-2">
                      {selectedSecondFileNo ? <AutoTranslate>No documents available</AutoTranslate> : <AutoTranslate>Select a file to see documents</AutoTranslate>}
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
              className={`bg-blue-900 text-white rounded-2xl px-6 py-3 text-sm flex items-center justify-center transition-all ${isComparing || selectedFirstFileIds.length + selectedSecondFileIds.length !== 2
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
                  <AutoTranslate>CompareFiles</AutoTranslate>
                </>
              )}
            </button>
          </div>
        </div>

        {showComparisonModal && comparisonResult && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-5/6 flex flex-col">
              <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                <div className="flex items-center space-x-4">
                  <h2 className="text-xl font-semibold">
                    <AutoTranslate>File Compare</AutoTranslate>
                  </h2>
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
                      {comparisonResult.similarityPercentage?.toFixed(1) || "0.0"}% <AutoTranslate>Similar</AutoTranslate>
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

              <div className="border-b bg-gray-50">
                <nav className="flex space-x-8 px-4">
                  <button
                    onClick={() => setActiveTab("preview")}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === "preview"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                  >
                    <AutoTranslate>File </AutoTranslate><AutoTranslate> Preview</AutoTranslate>
                  </button>
                  <button
                    onClick={() => setActiveTab("differences")}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === "differences"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                  >
                    <AutoTranslate>Difference</AutoTranslate> ({comparisonResult.differences?.length || 0})
                  </button>
                  {bothImages && (
                    <button
                      onClick={() => setActiveTab("visualDiff")}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === "visualDiff"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                    >
                      <AutoTranslate>VisualDifference</AutoTranslate> (<AutoTranslate>Images</AutoTranslate>)
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
                      <AutoTranslate>Text Comparison</AutoTranslate>
                    </button>
                  )}
                </nav>
              </div>

              {activeTab === "preview" && (
                <div className="grid grid-cols-2 gap-px bg-gray-200">
                  <div className="bg-blue-50 p-3 flex items-center justify-between">
                    <div className="flex items-center">
                      {getFileTypeIcon(comparisonResult.leftFile.fileType)}
                      <div className="ml-2">
                        <h3 className="font-medium text-gray-800">{extractFileName(comparisonResult.leftFile.fileName)}</h3>
                        <p className="text-xs text-gray-600">
                          <AutoTranslate>Version:</AutoTranslate> {comparisonResult.leftFile.version} | <AutoTranslate>fileType:</AutoTranslate> {comparisonResult.leftFile.fileType}
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
                          <AutoTranslate>Version:</AutoTranslate> {comparisonResult.rightFile.version} | <AutoTranslate>fileType:</AutoTranslate> {" "}
                          {comparisonResult.rightFile.fileType}
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

              <div className="p-4 bg-gray-50 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div className="text-sm">
                      <span className="font-medium">
                        <AutoTranslate>Status:</AutoTranslate>
                      </span>
                      <span className={`ml-1 ${comparisonResult.identical ? "text-green-600" : "text-red-600"}`}>
                        {comparisonResult.message}
                      </span>
                    </div>
                    {!comparisonResult.identical && comparisonResult.differences && (
                      <div className="text-sm">
                        <span className="font-medium">
                          <AutoTranslate>Differences Found:</AutoTranslate>
                        </span>
                        <span className="ml-1 text-red-600">{comparisonResult.differences.length}</span>
                      </div>
                    )}
                    {comparisonResult.comparisonResult?.summary && (
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
                    )}
                  </div>

                  <div className="flex items-center space-x-4 text-xs">
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
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!comparisonResult && !showComparisonModal && (
          <div className="text-center py-12 text-gray-500">
            <DocumentDuplicateIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">
              <AutoTranslate>Select exactly 2 documents to compare</AutoTranslate>
            </p>
            <p className="text-sm">
              <AutoTranslate>You can select documents from the same file or different files</AutoTranslate>
            </p>
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

      const aCanvas = document.createElement("canvas")
      aCanvas.width = w
      aCanvas.height = h
      const aCtx = aCanvas.getContext("2d")
      aCtx.drawImage(imgA, 0, 0, w, h)

      const bCanvas = document.createElement("canvas")
      bCanvas.width = w
      bCanvas.height = h
      const bCtx = bCanvas.getContext("2d")
      bCtx.drawImage(imgB, 0, 0, w, h)

      const aData = aCtx.getImageData(0, 0, w, h)
      const bData = bCtx.getImageData(0, 0, w, h)
      const out = ctx.createImageData(w, h)

      for (let i = 0; i < aData.data.length; i += 4) {
        const r1 = aData.data[i]
        const g1 = aData.data[i + 1]
        const b1 = aData.data[i + 2]
        const r2 = bData.data[i]
        const g2 = bData.data[i + 1]
        const b2 = bData.data[i + 2]

        const colorDiff = Math.sqrt(
          Math.pow(r1 - r2, 2) +
          Math.pow(g1 - g2, 2) +
          Math.pow(b1 - b2, 2)
        )

        const isDifferent = colorDiff > threshold

        if (!isDifferent) {
          out.data[i] = r1
          out.data[i + 1] = g1
          out.data[i + 2] = b1
          out.data[i + 3] = 255
        } else {
          const intensity = Math.min(colorDiff / 100, 1)

          out.data[i] = Math.min(255, r1 + (255 - r1) * 0.8)
          out.data[i + 1] = Math.max(0, g1 * 0.3)
          out.data[i + 2] = Math.max(0, b1 * 0.3)
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
          <label className="text-sm text-gray-600">
            <AutoTranslate>Mode:</AutoTranslate>
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode("overlay")}
              className={`px-3 py-1 rounded text-sm ${mode === "overlay" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
                }`}
            >
              <AutoTranslate>Overlay</AutoTranslate>
            </button>
            <button
              onClick={() => setMode("pixel")}
              className={`px-3 py-1 rounded text-sm ${mode === "pixel" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
                }`}
            >
              <AutoTranslate>Pixel Diff</AutoTranslate>
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
              <span className="text-xs text-gray-600">
                <AutoTranslate>Sensitivity:</AutoTranslate>
              </span>
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
              <img
                src={leftUrl || "/placeholder.svg"}
                crossOrigin="anonymous"
                alt={leftName}
                className="w-auto h-auto max-w-full block"
                style={{ maxHeight: 'calc(100vh - 300px)' }}
              />
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
                <AutoTranslate>Red areas indicate differences between images</AutoTranslate>
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
  const [viewMode, setViewMode] = useState('full-document');

  const leftHighlighted = leftHighlightedContent ||
    (comparisonResult?.leftFile?.highlightedContent || '');
  const rightHighlighted = rightHighlightedContent ||
    (comparisonResult?.rightFile?.highlightedContent || '');

  const renderHighlightedContent = (content, isLeft = true) => {
    if (!content) {
      return (
        <div className="no-content">
          <AutoTranslate>No content available for</AutoTranslate> {isLeft ? leftName : rightName}
        </div>
      );
    }

    if (content.includes('<span class="diff-')) {
      return (
        <div
          className="highlighted-content"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      );
    }

    if (Array.isArray(content)) {
      return (
        <div className="full-document-content">
          {content.map((line, index) => {
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
      <div className="border rounded-lg bg-white overflow-hidden">
        <div className="sticky top-0 bg-blue-50 p-3 border-b font-medium text-blue-800 flex justify-between items-center">
          <span>{leftName} (<AutoTranslate>Original</AutoTranslate>)</span>
          <span className="text-xs font-normal text-blue-600">
            {differences && differences.filter(d => d.type === 'DELETED' || d.type === 'MODIFIED').length} <AutoTranslate>changes</AutoTranslate>
          </span>
        </div>
        <div className="p-4 overflow-auto max-h-96 full-document-container">
          {renderHighlightedContent(leftHighlighted || leftContent, true)}
        </div>
      </div>

      <div className="border rounded-lg bg-white overflow-hidden">
        <div className="sticky top-0 bg-blue-50 p-3 border-b font-medium text-blue-800 flex justify-between items-center">
          <span>{rightName} (<AutoTranslate>Modified</AutoTranslate>)</span>
          <span className="text-xs font-normal text-blue-600">
            {differences && differences.filter(d => d.type === 'ADDED' || d.type === 'MODIFIED').length} <AutoTranslate>changes</AutoTranslate>
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
            <div key={index} className={`p-3 rounded-lg border-l-4 ${diff.type === 'ADDED' ? 'bg-green-100 border-green-400' :
              diff.type === 'DELETED' ? 'bg-red-100 border-red-400' :
                'bg-yellow-100 border-yellow-400'
              }`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${diff.type === 'ADDED' ? 'bg-green-100 text-green-800' :
                  diff.type === 'DELETED' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
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
          ))
        ) : (
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
            <span className="ml-3 text-red-600">({differences.length} <AutoTranslate>differences found</AutoTranslate>)</span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-100 border border-red-500 mr-1"></div>
              <span><AutoTranslate>Deleted content</AutoTranslate></span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-100 border border-green-500 mr-1"></div>
              <span><AutoTranslate>Added content</AutoTranslate></span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-100 border border-yellow-500 mr-1"></div>
              <span><AutoTranslate>Modified content</AutoTranslate></span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('full-document')}
              className={`px-3 py-1 rounded text-xs ${viewMode === 'full-document'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700'
                }`}
            >
              <AutoTranslate>Full Document</AutoTranslate>
            </button>
            <button
              onClick={() => setViewMode('differences-only')}
              className={`px-3 py-1 rounded text-xs ${viewMode === 'differences-only'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700'
                }`}
            >
              <AutoTranslate>Differences Only</AutoTranslate>
            </button>
          </div>
        </div>
      </div>

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