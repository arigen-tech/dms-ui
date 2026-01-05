import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import apiClient from "../API/apiClient";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Popup from "../Components/Popup";
import { useDropzone } from "react-dropzone";
import FilePreviewModal from "../Components/FilePreviewModal";
import LoadingComponent from '../Components/LoadingComponent';
import { Tooltip } from "react-tooltip";
import WaitingRoom from '../Data/WaitingRoom';

// Import AutoTranslate components
import AutoTranslate from '../i18n/AutoTranslate';
import { useLanguage } from '../i18n/LanguageContext';
import { getFallbackTranslation } from '../i18n/autoTranslator';

import {
  PencilIcon,
  PlusCircleIcon,
  CheckCircleIcon,
  EyeIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  QrCodeIcon,
  ArrowPathIcon,
  DocumentIcon,
  MagnifyingGlassIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  PrinterIcon,
} from "@heroicons/react/24/solid";
import { API_HOST, DOCUMENTHEADER_API, FILETYPE_API } from "../API/apiConfig";

const DocumentManagement = ({ fieldsDisabled }) => {
  // Get language context
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

  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const data = location.state;
  const [formData, setFormData] = useState({
    fileNo: "",
    title: "",
    subject: "",
    version: "",
    category: null,
    uploadedFilePaths: [],
  });

  useEffect(() => {
    const { fileNo, title, subject, version, category, year } = formData;
    setIsMetadataComplete(!!(fileNo && title && subject && version && category && year));
  }, [formData]);

  // Debug log
  useEffect(() => {
    console.log('🔍 DocumentManagement Component - Language Status:', {
      currentLanguage,
      defaultLanguage,
      isTranslationNeeded: isTranslationNeeded(),
      translationStatus,
      availableLanguagesCount: availableLanguages.length,
      pathname: window.location.pathname
    });
  }, [currentLanguage, defaultLanguage, translationStatus, isTranslationNeeded, availableLanguages]);

  const [uploadedFileNames, setUploadedFileNames] = useState([]);
  const [uploadedFilePath, setUploadedFilePath] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [handleEditDocumentActive, setHandleEditDocumentActive] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState({ paths: [] });
  const [isUploadEnabled, setIsUploadEnabled] = useState(false);
  const [printTrue, setPrintTrue] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [yearOptions, setYearOptions] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [userBranch, setUserBranch] = useState([]);
  const [userDep, setUserDep] = useState([]);
  const fileInputRef = useRef(null);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [popupMessage, setPopupMessage] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [searchTerm, setSearchTerm] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const token = localStorage.getItem("tokenKey");
  const UserId = localStorage.getItem("userId");
  const [error, setError] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [filesType, setFilesType] = useState([]);
  const [unsportFile, setUnsportFile] = useState(false);
  const [viewFileTypeModel, setViewFileTypeModel] = useState(false);
  const [folderUpload, setFolderUpload] = useState(false);
  const [uploadController, setUploadController] = useState(null);
  const [blobUrl, setBlobUrl] = useState("");
  const [contentType, setContentType] = useState("");
  const [selectedDocFile, setSelectedDocFiles] = useState(null);
  const [searchFileTerm, setSearchFileTerm] = useState("");
  const [openingFileIndex, setOpeningFileIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bProcess, setBProcess] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [openingFiles, setOpeningFiles] = useState(null);
  const [deletingFiles, setDeletingFiles] = useState(null);
  const formSectionRef = useRef(null);
  const [isMetadataComplete, setIsMetadataComplete] = useState(false);
  const [isWaitingRoomModalOpen, setIsWaitingRoomModalOpen] = useState(false);
  const [currYear, setCurrYear] = useState(null);

  useEffect(() => {
    if (data) {
      handleEditDocument(data);
    }
    fetchCategory();
    fetchYear();
    fetchDocuments();
    fetchPaths();
    fetchUser();
  }, []);

  const showPopup = (message, type = 'info') => {
    setPopupMessage({
      message,
      type,
      onClose: () => {
        setPopupMessage(null);
      }
    });
  };

  const fetchFilesType = async () => {
    try {
      const response = await apiClient.get(`${FILETYPE_API}/getAllActive`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      setFilesType(response?.data?.response ?? []);
    } catch (error) {
      console.error(<AutoTranslate>Error fetching Files Types:</AutoTranslate>, error);
      setFilesType([]);
    }
  };

  const handleCategoryChange = (e) => {
    const selectedCategory = categoryOptions.find(
      (category) => category.id === parseInt(e.target.value)
    );
    setFormData({ ...formData, category: selectedCategory });
  };

  const handleYearChange = (e) => {
    const selectedYear = yearOptions.find(
      (year) => year.id === parseInt(e.target.value)
    );
    setFormData({ ...formData, year: selectedYear });
  };

  useEffect(() => {
    const { fileNo, title, subject, version, category, year } = formData;
    const isFormFilled =
      fileNo &&
      title &&
      subject &&
      version &&
      category &&
      year &&
      selectedFiles.length > 0;
    setIsUploadEnabled(isFormFilled);
  }, [formData, selectedFiles]);

  const fetchCategory = async () => {
    try {
      const response = await apiClient.get(
        `${API_HOST}/CategoryMaster/findActiveCategory`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setCategoryOptions(response.data);
    } catch (error) {
      console.error(<AutoTranslate>Error fetching categories:</AutoTranslate>, error);
    }
  };

  const fetchYear = async () => {
    try {
      const response = await apiClient.get(
        `${API_HOST}/YearMaster/findActiveYear`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const currentYear = new Date().getFullYear();
      const yearsData = Array.isArray(response.data)
        ? response.data
        : response.data
          ? [response.data]
          : [];

      const filteredYears = yearsData
        .filter((yearObj) => parseInt(yearObj.name) <= currentYear)
        .sort((a, b) => parseInt(b.name) - parseInt(a.name));

      setYearOptions(filteredYears);
    } catch (error) {
      console.error(<AutoTranslate>Error fetching Year:</AutoTranslate>, error);
    }
  };

  const handleSelectFromWaitingRoom = async (selectedDocuments, metadata = {}) => {
    if (!selectedDocuments || selectedDocuments.length === 0) {
      showPopup(<AutoTranslate>No documents selected from Waiting Room.</AutoTranslate>, "warning");
      return;
    }

    const versionToUpload = formData.version?.trim();
    const yearToUpload = formData.year?.id || formData.year?.name;

    const isDuplicate = [
      ...(uploadedFilePath || []),
      ...(formData.uploadedFilePaths || []),
    ].some((file) => {
      const existingVersion = file.version?.trim();
      const existingYear = file.yearMaster?.id || file.yearMaster?.name;
      return (
        existingVersion?.toLowerCase() === versionToUpload.toLowerCase() &&
        existingYear === yearToUpload
      );
    });

    if (isDuplicate) {
      showPopup(
        <AutoTranslate>Version "{versionToUpload}" already exists for year "{formData.year?.name}". Please use a new version or select a different year.</AutoTranslate>,
        "warning"
      );
      return;
    }

    try {
      setLoading(true);

      const buildLogicalPathFromDoc = (doc) => {
        const branch = editingDoc?.employee?.branch?.name || "nt";
        const department = editingDoc?.employee?.department?.name || "nt";
        const year =
          metadata.year ||
          doc.year ||
          (doc.yearMaster && doc.yearMaster.name) ||
          "nt";
        const category = editingDoc?.categoryMaster?.name || "nt";

        let version =
          metadata.version ||
          doc.version ||
          doc.versionName ||
          doc.versionLabel ||
          "nt";

        version = String(version).trim();

        const sanitizeSegment = (segment) => {
          if (!segment) return "";
          return String(segment).trim().replace(/\s+/g, "_");
        };

        const segments = [
          sanitizeSegment(branch),
          sanitizeSegment(department),
          sanitizeSegment(year),
          sanitizeSegment(category),
          sanitizeSegment(version),
        ].filter(Boolean);

        return segments.join("/");
      };

      const processedDocuments = selectedDocuments.map((doc, index) => {
        const logicalFolder = buildLogicalPathFromDoc(doc);
        let fileName = doc.displayName || doc.fileName || "";
        let fileType =
          (doc.fileType ||
            doc.mimeType ||
            doc.originalExtension ||
            "").toString().trim();

        fileType = fileType.replace(/^\./, "");
        fileType = fileType.toLowerCase();

        const hasExt = /\.[a-zA-Z0-9]+$/.test(fileName);
        const currentExt = hasExt ? fileName.split(".").pop().toLowerCase() : null;

        if (!hasExt && fileType) {
          fileName = `${fileName}.${fileType}`;
        } else if (hasExt && fileType && currentExt !== fileType) {
          fileName = fileName.replace(/\.[^.]+$/, `.${fileType}`);
        }

        const fullLogicalPath = `${logicalFolder}/${fileName}`;

        const processedDoc = {
          path: fullLogicalPath,
          version: metadata.version || doc.version,
          yearMaster: currYear,
          displayName: fileName,
          name: fileName,
          originalExtension: fileType || null,
          status: "PENDING",
          isWaitingRoomFile: true,
          waitingRoomId: doc.waitingRoomId,
          fileType: doc.fileType,
          waitingRoomPath: doc.waitingRoomPath,
          fileSizeHuman: doc.fileSizeHuman || null,
          fileSizeBytes: doc.fileSizeBytes || null,
          pageCounts: doc.pageCounts || null,
          mimeType: doc.mimeType || null,
        };

        return processedDoc;
      });

      setUploadedFilePath((prev) => {
        const updated = [...prev, ...processedDocuments];
        return updated;
      });

      setFormData((prev) => {
        const updated = {
          ...prev,
          uploadedFilePaths: [
            ...(prev.uploadedFilePaths || []),
            ...processedDocuments,
          ],
        };
        return updated;
      });

      setUploadedFileNames((prev) => {
        const updated = [...prev, ...processedDocuments.map((f) => f.displayName)];
        return updated;
      });

      showPopup(
        <AutoTranslate>{processedDocuments.length} file(s) added from Waiting Room! Files are ready to be saved.</AutoTranslate>,
        "success"
      );
    } catch (error) {
      console.error(<AutoTranslate>Error processing waiting room documents:</AutoTranslate>, error);
      showPopup(
        <AutoTranslate>Failed to process files from Waiting Room: {error.message || error}</AutoTranslate>,
        "error"
      );
    } finally {
      setLoading(false);
      setIsWaitingRoomModalOpen(false);
    }
  };

  const fetchUser = async () => {
    try {
      const userId = localStorage.getItem("userId");
      const response = await apiClient.get(
        `${API_HOST}/employee/findById/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setUserBranch(response.data.branch.name);
      setUserDep(response.data.department.name);
    } catch (error) {
      console.error(<AutoTranslate>Error fetching user branch:</AutoTranslate>, error);
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(
        `${DOCUMENTHEADER_API}/pending/employee/${UserId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setDocuments(response.data);
      setTotalItems(response.data.length);
    } catch (error) {
      console.error(<AutoTranslate>Error fetching documents:</AutoTranslate>, error);
      if (error.response) {
        console.error(<AutoTranslate>Error response data:</AutoTranslate>, error.response.data);
        console.error(<AutoTranslate>Error response status:</AutoTranslate>, error.response.status);
      } else if (error.request) {
        console.error(<AutoTranslate>No response received:</AutoTranslate>, error.request);
      } else {
        console.error(<AutoTranslate>Error setting up request:</AutoTranslate>, error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback(
    async (acceptedFiles, event) => {
      let isFolderDropped = false;
      acceptedFiles.forEach((file) => {
        const path = file.path || file.webkitRelativePath || file.name;
        const slashCount = (path.match(/[\\/]/g) || []).length;
        if (slashCount > 1) isFolderDropped = true;
      });

      if (isFolderDropped && !folderUpload) {
        showPopup(<AutoTranslate>Please enable 'folderUpload' to upload folders.</AutoTranslate>, "warning");
        return;
      }

      if (!isFolderDropped && folderUpload) {
        showPopup(<AutoTranslate>Please disable 'folderUpload' to upload files.</AutoTranslate>, "warning");
        return;
      }

      setSelectedFiles(acceptedFiles);
      const dataTransfer = new DataTransfer();
      acceptedFiles.forEach((file) => dataTransfer.items.add(file));
      if (fileInputRef.current) {
        fileInputRef.current.files = dataTransfer.files;
      }
    },
    [folderUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    multiple: !folderUpload,
  });

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  };

  const openFile = async (file) => {
    try {
      setOpeningFiles(true);
      const encodedPath = file.path.split("/").map(encodeURIComponent).join("/");
      const fileUrl = `${API_HOST}/api/documents/download/${encodedPath}`;

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
    } catch (error) {
      console.error("❌ Error fetching file:", error);
      alert(<AutoTranslate>Failed to fetch or preview the file.</AutoTranslate>);
    } finally {
      setOpeningFiles(false);
    }
  };

  const openFileBeforeSubmit = async (file, index) => {
    setOpeningFiles(index);
    try {
      const fileUrl = `${API_HOST}/api/documents/download/${file}`;
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
    } catch (error) {
      console.error(<AutoTranslate>Error:</AutoTranslate>, error);
      alert(<AutoTranslate>Failed to fetch or preview the file.</AutoTranslate>);
    } finally {
      setOpeningFiles(null);
    }
  };

  const openWaitingRoomFile = async (file, index) => {
    setOpeningFiles(index);
    try {
      const fileName = file.waitingRoomPath?.split(/[/\\]/).pop();
      if (!fileName) {
        throw new Error(<AutoTranslate>Invalid file path</AutoTranslate>);
      }

      const fileUrl = `${API_HOST}/home/download/waitingroom/${encodeURIComponent(fileName)}`;

      const response = await apiClient.get(fileUrl, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });

      const contentType = response.headers["content-type"] || "";
      const blob = new Blob([response.data], { type: contentType });
      const url = URL.createObjectURL(blob);

      setBlobUrl(url);
      setContentType(contentType);
      setSelectedDocFiles(file);
      setIsModalOpen(true);

    } catch (error) {
      console.error(<AutoTranslate>Error opening waiting room file:</AutoTranslate>, error);
      alert(<AutoTranslate>Failed to open waiting room file</AutoTranslate>);
    } finally {
      setOpeningFiles(null);
    }
  };

  const handleDownload = async (file) => {
    const encodedPath = file.path.split("/").map(encodeURIComponent).join("/");
    const fileUrl = `${API_HOST}/api/documents/download/${encodedPath}`;

    const response = await apiClient.get(fileUrl, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: "blob",
    });

    const downloadBlob = new Blob([response.data], {
      type: response.headers["content-type"],
    });

    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(downloadBlob);
    link.download = file.docName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const filteredDocFiles = useMemo(() => {
    if (!selectedDoc || !Array.isArray(selectedDoc.paths)) return [];

    return selectedDoc.paths.filter((file) => {
      const name = file.docName.toLowerCase();
      const version = String(file.version).toLowerCase();
      const term = searchFileTerm.toLowerCase();
      return name.includes(term) || version.includes(term);
    });
  }, [selectedDoc, searchFileTerm]);

  useEffect(() => {
    if (selectedDoc) {
      setLoadingFiles(true);
      setTimeout(() => {
        setLoadingFiles(false);
      }, 300);
    }
  }, [selectedDoc]);

  const formatDate = (dateString) => {
    if (!dateString) return "--";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "--";
    const options = { day: "2-digit", month: "2-digit", year: "numeric" };
    return date.toLocaleString("en-GB", options).replace(",", "");
  };

  const generateFileNameFromMetadata = (originalName, index, metadata) => {
    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

    const baseName = metadata.fileNo ? metadata.fileNo.substring(0, 3) : 'DOC';
    const originalExtension = originalName.split('.').pop() || 'pdf';

    return `${baseName}_${metadata.branch}_${metadata.department}_${metadata.year}_${metadata.category}_${metadata.version}_${timestamp}_${index + 1}.${originalExtension}`;
  };

  useEffect(() => {
    if (location.state?.fromWaitingRoom && location.state?.selectedDocuments) {
      const waitingRoomDocs = location.state.selectedDocuments;
      const metadata = location.state.metadata;

      const convertedFiles = waitingRoomDocs.map((doc, index) => {
        const displayName = generateFileNameFromMetadata(doc.documentName, index, metadata);
        const yearOption = yearOptions.find(y => y.name === metadata.year);

        return {
          path: doc.waitingRoomPath,
          version: metadata.version,
          yearMaster: yearOption ? { id: yearOption.id, name: yearOption.name } : null,
          displayName,
          status: "PENDING",
          isWaitingRoomFile: true,
          waitingRoomId: doc.id,
          destinationPath: `${metadata.branch}/${metadata.department}/${yearOption ? yearOption.name : metadata.year}/${metadata.category}/${metadata.version}/${displayName}`
        };
      });

      setFormData(prev => ({
        ...prev,
        fileNo: metadata.fileNo || prev.fileNo,
        title: metadata.title || prev.title || "",
        subject: metadata.subject || prev.subject || "",
        category: prev.category || { name: metadata.category },
        year: yearOptions.find(y => y.name === metadata.year) || prev.year,
        version: metadata.version || prev.version,
        uploadedFilePaths: convertedFiles,
      }));

      setUploadedFilePath(convertedFiles);
      setUploadedFileNames(convertedFiles.map(f => f.displayName));
    }
  }, [location.state, yearOptions]);

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      setSelectedFiles(files);
      setIsUploadEnabled(true);
    } else {
      setIsUploadEnabled(false);
    }
  };

  const handleUploadDocument = async () => {
    if (selectedFiles.length === 0) {
      showPopup(<AutoTranslate>Please select at least one file to upload.</AutoTranslate>, "warning");
      return;
    }

    const versionToUpload = formData.version?.trim();
    const yearToUpload = formData.year?.id || formData.year?.name;

    const isDuplicate = [
      ...(uploadedFilePath || []),
      ...(formData.uploadedFilePaths || []),
    ].some((file) => {
      const existingVersion = file.version?.trim();
      const existingYear = file.yearMaster?.id || file.yearMaster?.name;
      return (
        existingVersion?.toLowerCase() === versionToUpload.toLowerCase() &&
        existingYear === yearToUpload
      );
    });

    if (isDuplicate) {
      showPopup(
        <AutoTranslate>Version "{versionToUpload}" already exists for year "{formData.year?.name}". Please use a new version or select a different year.</AutoTranslate>,
        "warning"
      );
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const uploadData = new FormData();
    const { category, year, version, fileNo, status } = formData;

    uploadData.append("category", category?.name);
    uploadData.append("year", year?.name);
    uploadData.append("version", version || 1);
    uploadData.append("branch", userBranch);
    uploadData.append("department", userDep);

    const renamedFiles = selectedFiles.map((file, index) => {
      const now = new Date();
      const formattedDate = `${now.getFullYear()}${String(
        now.getMonth() + 1
      ).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(
        now.getHours()
      ).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(
        now.getSeconds()
      ).padStart(2, "0")}${String(now.getMilliseconds()).padStart(3, "0")}`;

      const baseName = fileNo.split(".")[0].substring(0, 3);
      const extension = file.name.split(".").pop();

      return {
        file,
        renamed: `${baseName}_${category?.name}_${year?.name}_${version}_${formattedDate}_${index + 1}.${extension}`,
      };
    });

    renamedFiles.forEach(({ file, renamed }) => {
      uploadData.append("files", file, renamed);
    });

    const controller = new AbortController();
    setUploadController(controller);

    try {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_HOST}/api/documents/upload`, true);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      };

      xhr.onload = () => {
        setIsUploading(false);
        setUploadController(null);

        if (xhr.status >= 200 && xhr.status < 300) {
          const result = JSON.parse(xhr.responseText);

          if (result.uploadedFiles.length > 0) {
            setUploadedFileNames((prevNames) => [
              ...prevNames,
              ...renamedFiles.map((f) => f.renamed),
            ]);

            setUploadedFilePath((prevPath) => [
              ...prevPath,
              ...result.uploadedFiles.map((fileObj, index) => ({
                path: fileObj.path,
                version: `${version}`,
                yearMaster: year,
                status: status,
                fileSizeHuman: fileObj.fileSizeHuman,
                fileSizeBytes: fileObj.fileSizeBytes,
                fileType: fileObj.fileType || null,
                mimeType: fileObj.contentType || null,
                pageCounts: fileObj.pageCount || null,
                displayName: renamedFiles[index]?.renamed,
              })),
            ]);

            setFormData((prevData) => ({
              ...prevData,
              uploadedFilePaths: [
                ...(prevData.uploadedFilePaths || []),
                ...result.uploadedFiles.map((fileObj, index) => ({
                  path: fileObj.path,
                  version: `${version}`,
                  yearMaster: year,
                  status: status,
                  fileSizeHuman: fileObj.fileSizeHuman,
                  fileSizeBytes: fileObj.fileSizeBytes,
                  fileType: fileObj.fileType || null,
                  mimeType: fileObj.contentType || null,
                  pageCounts: fileObj.pageCount || null,
                  displayName: renamedFiles[index]?.renamed,
                })),
              ],
              version: "",
            }));

            if (fileInputRef.current) {
              fileInputRef.current.value = null;
            }

            showPopup(<AutoTranslate>Files uploaded successfully!</AutoTranslate>, "success");
          }

          if (result.errors.length > 0) {
            showPopup(
              <AutoTranslate>Some files failed to upload:</AutoTranslate> + "\n" + result.errors
                .map((err) => `${err.file}: ${err.error}`)
                .join("\n"),
              "error"
            );
            setUnsportFile(true);
          }
        } else {
          showPopup(<AutoTranslate>File upload failed: {xhr.statusText}</AutoTranslate>, "error");
        }
      };

      xhr.onerror = () => {
        setIsUploading(false);
        showPopup(<AutoTranslate>Upload failed due to a network error.</AutoTranslate>, "error");
      };

      xhr.onabort = () => {
        setIsUploading(false);
        setUploadController(null);
        showPopup(<AutoTranslate>Upload has been canceled.</AutoTranslate>, "warning");
      };

      controller.signal.addEventListener("abort", () => {
        xhr.abort();
      });

      xhr.send(uploadData);
    } catch (error) {
      setIsUploading(false);
      showPopup(<AutoTranslate>File upload failed: {error.message}</AutoTranslate>, "error");
    }
  };

  const handleCancelUpload = () => {
    if (uploadController) {
      uploadController.abort();
      setUploadController(null);
      setIsUploading(false);
      showPopup(<AutoTranslate>Upload has been canceled.</AutoTranslate>, "warning");
    }
  };

  const handleEditDocument = (doc) => {
    setHandleEditDocumentActive(true);
    setEditingDoc(doc);

    const existingFiles = (doc.documentDetails || []).map((detail) => ({
      name: detail.path.split("/").pop(),
      version: detail.version,
      path: detail.path,
      status: detail.status,
      yearMaster: detail?.yearMaster || null,
      rejectionReason: detail?.rejectionReason || null,
      waitingRoomId: detail?.waitingRoomId || null,
      isWaitingRoomFile: !!detail?.waitingRoomId,
      displayName: detail.displayName || detail.path.split("/").pop(),
      fileType: detail.fileType || null,
      mimeType: detail.mimeType || null,
      fileSizeBytes: detail.fileSizeBytes || null,
      fileSizeHuman: detail.fileSizeHuman || null,
      pageCounts: detail.pageCounts || null,
      isExisting: true,
    }));

    setFormData({
      fileNo: doc.fileNo,
      title: doc.title,
      subject: doc.subject,
      version: doc.version,
      category: doc.categoryMaster || null,
      year: null,
    });

    setUploadedFileNames(existingFiles.map((file) => file.name));
    setUploadedFilePath(existingFiles);

    if (formSectionRef.current) {
      formSectionRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSaveEdit = async () => {
    const userId = localStorage.getItem("userId");
    if (!userId || !token) {
      showPopup(<AutoTranslate>User not logged in. Please log in again.</AutoTranslate>, "error");
      return;
    }

    const { fileNo, title, subject, category } = formData;
    if (!fileNo || !title || !subject || !category || uploadedFilePath.length === 0) {
      showPopup(<AutoTranslate>Please fill in all required fields and upload files.</AutoTranslate>, "error");
      return;
    }

    const versionedFilePaths = uploadedFilePath.map((file, index) => {
      const { version = formData.version || "1.0", yearMaster, displayName, originalExtension } = file;
      const filePath = file.isWaitingRoomFile ? displayName : file.path;

      return {
        path: filePath,
        version: `${version}`,
        yearId: yearMaster?.id || formData.year?.id || null,
        fileType: file.fileType || null,
        mimeType: file.mimeType || null,
        pageCounts: file.pageCounts || null,
        fileSizeBytes: file.fileSizeBytes || null,
        fileSizeHuman: file.fileSizeHuman || null,
        waitingRoomId: file.waitingRoomId || null,
        isWaitingRoomFile: file.isWaitingRoomFile || false,
        displayName: displayName || filePath.split("/").pop(),
      };
    });

    const payload = {
      documentHeader: {
        id: editingDoc.id,
        fileNo,
        title,
        subject,
        categoryMaster: { id: category.id },
        employee: { id: parseInt(userId, 10) },
      },
      filePaths: versionedFilePaths
    };

    try {
      setBProcess(true);

      const response = await fetch(`${API_HOST}/api/documents/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || result?.status === 409 || result?.message?.toLowerCase() !== "success") {
        const warningMessage = result?.response?.msg || result?.message || <AutoTranslate>Unknown error occurred</AutoTranslate>;
        showPopup(<AutoTranslate>Document update failed: {warningMessage}</AutoTranslate>, "warning");
        return;
      }

      showPopup(result?.response?.msg || <AutoTranslate>Document updated successfully!</AutoTranslate>, "success");
      resetEditForm();
      fetchDocuments();
    } catch (error) {
      console.error(<AutoTranslate>Error updating document:</AutoTranslate>, error);
      showPopup(<AutoTranslate>Document update failed: {error.message}</AutoTranslate>, "error");
    } finally {
      setBProcess(false);
    }
  };

  const resetEditForm = () => {
    setFormData({
      fileNo: "",
      title: "",
      subject: "",
      version: "",
      category: null,
    });
    setUploadedFilePath([]);
    setSelectedFiles([]);
    setUploadedFileNames([]);
    setEditingDoc(null);
    setUnsportFile(false);
  };

  const viewfiletype = () => {
    fetchFilesType();
    setViewFileTypeModel(true);
    setIsUploading(false);
  }

  const handlecloseFileType = () => {
    setViewFileTypeModel(false);
    setIsUploading(false);
  }

  const handleVersionChange = (index, newVersion) => {
    setUploadedFilePath((prevPaths) =>
      prevPaths.map((file, i) =>
        i === index
          ? { ...file, version: newVersion }
          : file
      )
    );
  };

  const handleAddDocument = async () => {
    if (
      !formData.fileNo ||
      !formData.title ||
      !formData.subject ||
      !formData.category ||
      formData.uploadedFilePaths.length === 0
    ) {
      showPopup(
        <AutoTranslate>Please fill in all the required fields and upload a file.</AutoTranslate>,
        "error"
      );
      return;
    }

    const versionedFilePaths = formData.uploadedFilePaths.map((file, index) => {
      const { version = formData.version || "1.0", yearMaster, displayName } = file;
      const filePath = file.isWaitingRoomFile ? file.displayName : file.path;

      return {
        path: filePath,
        version: `${version}`,
        yearId: yearMaster?.id || formData.year?.id || null,
        fileType: file.fileType || null,
        mimeType: file.mimeType || null,
        pageCounts: file.pageCounts || null,
        fileSizeBytes: file.fileSizeBytes || null,
        fileSizeHuman: file.fileSizeHuman || null,
        waitingRoomId: file.waitingRoomId || null,
        isWaitingRoomFile: file.isWaitingRoomFile || false,
        displayName: displayName || filePath.split("/").pop(),
      };
    });

    const payload = {
      documentHeader: {
        id: formData.id || null,
        fileNo: formData.fileNo,
        title: formData.title,
        subject: formData.subject,
        categoryMaster: { id: formData.category.id },
        employee: { id: parseInt(UserId, 10) },
        qrPath: formData.qrPath || null,
        archive: false,
      },
      filePaths: versionedFilePaths
    };

    try {
      setBProcess(true);

      const response = await fetch(`${API_HOST}/api/documents/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || result?.status === 409) {
        const errorMessage =
          result?.response?.msg || result?.message || <AutoTranslate>Unknown error</AutoTranslate>;
        showPopup(<AutoTranslate>Document save failed: {errorMessage}</AutoTranslate>, "warning");
        return;
      }

      showPopup(result?.response?.msg || <AutoTranslate>Document saved successfully</AutoTranslate>, "success");

      setFormData({
        fileNo: "",
        title: "",
        subject: "",
        version: "",
        category: null,
        year: null,
        uploadedFilePaths: [],
      });
      setUploadedFilePath([]);
      setUploadedFileNames([]);
      setSelectedFiles([]);

      fetchDocuments();

    } catch (error) {
      console.error(<AutoTranslate>Error saving document:</AutoTranslate>, error);
      showPopup(<AutoTranslate>Document save failed: {error.message}</AutoTranslate>, "warning");
    } finally {
      setBProcess(false);
    }
  };

  const fetchPaths = async (doc) => {
    try {
      if (!token) {
        throw new Error(<AutoTranslate>No authentication token found.</AutoTranslate>);
      }

      if (!doc || !doc.id) {
        console.error(<AutoTranslate>Invalid document or missing ID</AutoTranslate>);
        return null;
      }

      const documentId = doc.id.toString().trim();
      if (!documentId) {
        console.error(<AutoTranslate>Document ID is empty or invalid</AutoTranslate>, doc);
        return null;
      }

      const response = await apiClient.get(
        `${DOCUMENTHEADER_API}/byDocumentHeader/${documentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const paths = Array.isArray(response.data)
        ? response.data
        : doc.documentDetails || [];

      setSelectedDoc((prevDoc) => ({
        ...prevDoc,
        paths: paths,
      }));

      return paths;
    } catch (error) {
      console.error(<AutoTranslate>Error in fetchPaths:</AutoTranslate>, error);
      showPopup(
        <AutoTranslate>Failed to fetch document paths: {error.message || "Unknown error"}</AutoTranslate>,
        "error"
      );
      return null;
    }
  };

  const handleDiscardFile = (index) => {
    if (index < 0 || index >= uploadedFilePath.length) {
      console.error(<AutoTranslate>Invalid index:</AutoTranslate>, index);
      return;
    }

    setDeletingFiles(index);

    try {
      if (editingDoc) {
        const isExistingFile = index < (editingDoc.documentDetails?.length || 0);

        if (isExistingFile) {
          const updatedFileNames = uploadedFileNames.filter((_, i) => i !== index);
          const updatedFilePath = uploadedFilePath.filter((_, i) => i !== index);

          setUploadedFileNames(updatedFileNames);
          setUploadedFilePath(updatedFilePath);

          setFormData((prev) => ({
            ...prev,
            removedFilePaths: [
              ...(prev.removedFilePaths || []),
              uploadedFilePath[index],
            ],
          }));
        } else {
          setUploadedFileNames((prev) => prev.filter((_, i) => i !== index));
          setUploadedFilePath((prev) => prev.filter((_, i) => i !== index));
        }
      } else {
        setUploadedFileNames((prev) => prev.filter((_, i) => i !== index));
        setUploadedFilePath((prev) => prev.filter((_, i) => i !== index));
      }
    } catch (err) {
      console.error(<AutoTranslate>Error while deleting file:</AutoTranslate>, err);
      alert(<AutoTranslate>Failed to delete file. Please try again.</AutoTranslate>);
    } finally {
      setDeletingFiles(null);
    }
  };

  const handleDiscardAll = () => {
    if (editingDoc) {
      const removedFilePaths = [
        ...(formData.removedFilePaths || []),
        ...uploadedFilePath,
      ];

      setUploadedFileNames([]);
      setUploadedFilePath([]);
      setFormData({
        ...formData,
        uploadedFilePaths: [],
        removedFilePaths,
      });
    } else {
      setUploadedFileNames([]);
      setUploadedFilePath([]);
      setFormData({ ...formData, uploadedFilePaths: [] });
    }
  };

  const openModal = (doc) => {
    setSelectedDoc(doc);
    fetchPaths(doc);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setSelectedDoc(null);
  };

  const printPage = () => {
    setPrintTrue(true);
    window.print();
    setTimeout(() => {
      setPrintTrue(false);
    }, 1000);
  };

  const handlePrintReport = async (id) => {
    if (!id) return;

    try {
      const response = await fetch(`http://localhost:8443/api/reports/document/${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/pdf",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error(<AutoTranslate>Failed to download PDF</AutoTranslate>);

      const blob = await response.blob();
      const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `document_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(<AutoTranslate>Error downloading PDF:</AutoTranslate>, error);
    }
  };

  const handleYearChangeForFile = (index, yearId) => {
    if (!Array.isArray(yearOptions)) return;

    const selectedYear = yearOptions.find((y) => y.id === parseInt(yearId));
    if (!selectedYear) return;

    setUploadedFilePath((prev) =>
      prev.map((file, i) =>
        i === index ? { ...file, yearMaster: selectedYear } : file
      )
    );

    setFormData((prev) => ({
      ...prev,
      uploadedFilePaths: Array.isArray(prev.uploadedFilePaths)
        ? prev.uploadedFilePaths.map((file, i) =>
          i === index ? { ...file, yearMaster: selectedYear } : file
        )
        : [],
    }));
  };

  useEffect(() => {
    if (selectedDoc && selectedDoc.id) {
      fetchQRCode(selectedDoc.id);
    }
  }, [selectedDoc]);

  const fetchQRCode = async (documentId) => {
    try {
      if (!token) {
        throw new Error(<AutoTranslate>Authentication token is missing</AutoTranslate>);
      }

      const apiUrl = `${DOCUMENTHEADER_API}/documents/download/qr/${selectedDoc.id}`;

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(<AutoTranslate>Failed to fetch QR code</AutoTranslate>);
      }

      const qrCodeBlob = await response.blob();

      if (!qrCodeBlob.type.includes("image/png")) {
        throw new Error(<AutoTranslate>Received data is not a valid image</AutoTranslate>);
      }

      const qrCodeUrl = window.URL.createObjectURL(qrCodeBlob);

      setQrCodeUrl(qrCodeUrl);
    } catch (error) {
      setError(<AutoTranslate>Error displaying QR Code:</AutoTranslate> + error.message);
    }
  };

  const downloadQRCode = async () => {
    if (!selectedDoc.id) {
      alert(<AutoTranslate>Please enter a document ID</AutoTranslate>);
      return;
    }

    try {
      if (!token) {
        throw new Error(<AutoTranslate>Authentication token is missing</AutoTranslate>);
      }

      const apiUrl = `${DOCUMENTHEADER_API}/documents/download/qr/${selectedDoc.id}`;

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(<AutoTranslate>Failed to fetch QR code</AutoTranslate>);
      }

      const qrCodeBlob = await response.blob();
      const qrCodeUrl = window.URL.createObjectURL(qrCodeBlob);

      const link = document.createElement("a");
      link.href = qrCodeUrl;
      link.download = `QR_Code_${selectedDoc.id}.png`;
      link.click();

      window.URL.revokeObjectURL(qrCodeUrl);
    } catch (error) {
      setError(<AutoTranslate>Error downloading QR Code:</AutoTranslate> + error.message);
    }
  };

  const getPageNumbers = () => {
    const maxPageNumbers = 5;
    const startPage =
      Math.floor((currentPage - 1) / maxPageNumbers) * maxPageNumbers + 1;
    const endPage = Math.min(startPage + maxPageNumbers - 1, totalPages);
    return Array.from(
      { length: endPage - startPage + 1 },
      (_, i) => startPage + i
    );
  };

  const filteredDocuments = documents.filter((doc) => {
    const search = searchTerm.toLowerCase();
    const createdDate = new Date(doc.createdOn).toLocaleDateString("en-GB");

    return (
      doc.title.toLowerCase().includes(search) ||
      doc.subject.toLowerCase().includes(search) ||
      doc.fileNo.toLowerCase().includes(search) ||
      doc.categoryMaster.name.toLowerCase().includes(search) ||
      doc.approvalStatus.toLowerCase().includes(search) ||
      createdDate.includes(search)
    );
  });

  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const filteredFiles = (filesType ?? []).filter((file) =>
    file.filetype?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.extension?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <LoadingComponent />;
  }

  return (
    <div className="p-2">
      <div className="p-0">
        <h1 className="text-xl mb-2 font-semibold">
          <AutoTranslate>Upload Document</AutoTranslate>
        </h1>
        <div className="bg-white p-3 rounded-lg shadow-sm">
          {popupMessage && (
            <Popup
              message={popupMessage.message}
              type={popupMessage.type}
              onClose={() => setPopupMessage(null)}
            />
          )}
          <div ref={formSectionRef} className="mb-2 bg-slate-100 p-4 rounded-lg">
            <div className="bg-slate-50 p-3 rounded-lg border shadow-sm mb-2">
              <h2 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
                📁 <AutoTranslate>Document Metadata</AutoTranslate>
              </h2>

              <div className="grid grid-cols-3 gap-4">
                {/* File No Input */}
                <label className="block text-md font-medium text-gray-700">
                  <AutoTranslate>File No.</AutoTranslate>
                  <input
                    type="text"
                    placeholder={getFallbackTranslation(
                      'Enter File No.',
                      currentLanguage
                    )}
                    name="fileNo"
                    value={formData.fileNo}
                    onChange={(e) => setFormData({ ...formData, fileNo: e.target.value })}
                    disabled={formData.uploadedFilePaths?.length > 0}
                    maxLength={20}
                    minLength={3}
                    required
                    className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                {/* Title Input */}
                <label className="block text-md font-medium text-gray-700">
                  <AutoTranslate>Title</AutoTranslate>
                  <input
                    type="text"
                    placeholder={getFallbackTranslation(
                      'Enter Title',
                      currentLanguage
                    )}
                    name="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    disabled={formData.uploadedFilePaths?.length > 0}
                    maxLength={20}
                    minLength={3}
                    required
                    className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                {/* Subject Input */}
                <label className="block text-md font-medium text-gray-700">
                  <AutoTranslate>Subject</AutoTranslate>
                  <input
                    type="text"
                    placeholder={getFallbackTranslation(
                      'Enter Subject',
                      currentLanguage
                    )}
                    name="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    disabled={formData.uploadedFilePaths?.length > 0}
                    maxLength={20}
                    minLength={3}
                    required
                    className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                {/* Category Select */}
                <label className="block text-md font-medium text-gray-700">
                  <AutoTranslate>Category</AutoTranslate>
                  <select
                    name="category"
                    value={formData.category?.id || ""}
                    onChange={handleCategoryChange}
                    disabled={formData.uploadedFilePaths?.length > 0}
                    className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value=""><AutoTranslate>Select category</AutoTranslate></option>
                    {categoryOptions.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border shadow-sm mb-2">
              <h2 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
                📄 <AutoTranslate>File Metadata</AutoTranslate>
              </h2>

              <div className="grid grid-cols-3 gap-4">
                {/* Year */}
                <label className="block text-md font-medium text-gray-700">
                  <AutoTranslate>Year</AutoTranslate>
                  <select
                    name="year"
                    value={formData.year?.id || ""}
                    onChange={(e) => {
                      const selectedYearId = e.target.value;
                      const selectedYear = yearOptions.find((y) => y.id === parseInt(selectedYearId));

                      handleYearChange(e);

                      if (selectedYear) {
                        setCurrYear(selectedYear);
                      } else {
                        setCurrYear(null);
                      }
                    }}
                    className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value=""><AutoTranslate>Select Year</AutoTranslate></option>
                    {yearOptions.map((year) => (
                      <option key={year.id} value={year.id}>
                        {year.name}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Version */}
                <label className="block text-md font-medium text-gray-700">
                  <AutoTranslate>Version</AutoTranslate>
                  <input
                    type="text"
                    placeholder={getFallbackTranslation(
                      'Enter Version',
                      currentLanguage
                    )}
                    name="version"
                    value={formData.version}
                    onChange={(e) =>
                      setFormData({ ...formData, version: e.target.value })
                    }
                    disabled={fieldsDisabled}
                    maxLength={20}
                    minLength={3}
                    required
                    className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                {/* Show Supported File Types */}
                {unsportFile === true && (
                  <button
                    onClick={viewfiletype}
                    className="bg-blue-600 text-white h-12 px-2 mt-7 rounded-md"
                  >
                    <AutoTranslate>Show Supported File Types</AutoTranslate>
                  </button>
                )}

                {/* Folder Upload Enable */}
                <label className="block text-md font-medium text-gray-700">
                  <AutoTranslate>Folder Upload Enable</AutoTranslate>
                  <div className="flex mt-4">
                    <input
                      type="checkbox"
                      checked={folderUpload}
                      onChange={() => setFolderUpload(!folderUpload)}
                      className="mt-1 block w-5 h-5 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="ml-3">
                      {folderUpload ? <AutoTranslate>Enable</AutoTranslate> : <AutoTranslate>Disable</AutoTranslate>}
                    </span>
                  </div>
                </label>
              </div>

              {/* File/Folder Upload Section - Full Width */}
              <div className="col-span-full mt-4">
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-6 cursor-pointer transition
            ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-100"}`}
                >
                  <input {...getInputProps()} />

                  <label className="block text-md font-medium text-gray-700">
                    <AutoTranslate>Upload {folderUpload ? "Folders" : "Files"}</AutoTranslate>
                    <input
                      type="file"
                      ref={fileInputRef}
                      multiple={!folderUpload}
                      onChange={handleFileSelect}
                      webkitdirectory={folderUpload ? "true" : undefined}
                      className="bg-white mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </label>

                  <p className="text-sm text-gray-500 mt-2">
                    <AutoTranslate>Drag & drop {folderUpload ? "folders" : "files"} here, or choose from your device.</AutoTranslate>
                  </p>
                </div>
              </div>

              {/* Buttons Section */}
              <div className="col-span-full mt-6">
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setIsWaitingRoomModalOpen(true)}
                    disabled={!isMetadataComplete || selectedFiles.length > 0}
                    className={`ml-4 p-3 rounded-md ${(!isMetadataComplete || selectedFiles.length > 0)
                      ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                      : "bg-blue-500 text-white"
                      }`}
                  >
                    <AutoTranslate>Choose From Waiting Room</AutoTranslate>
                  </button>

                  <button
                    onClick={handleUploadDocument}
                    disabled={isUploading || selectedFiles.length === 0 || !formData.version}
                    className={`flex-1 text-white rounded-xl p-3 h-14 flex items-center justify-center relative transition-all duration-300 ${isUploading
                      ? "bg-blue-600 cursor-not-allowed"
                      : "bg-blue-900"
                      }`}
                  >
                    {isUploading ? (
                      <>
                        <svg
                          className="animate-spin h-5 w-5 mr-2 text-white"
                          viewBox="0 0 24 24"
                        >
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
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          ></path>
                        </svg>
                        <AutoTranslate>Uploading... {uploadProgress}%</AutoTranslate>
                      </>
                    ) : (
                      <AutoTranslate>Add File</AutoTranslate>
                    )}
                    {isUploading && (
                      <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-300">
                        <div
                          className="h-full bg-green-500 transition-all"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    )}
                  </button>

                  {isUploading && (
                    <button
                      onClick={handleCancelUpload}
                      className="bg-red-500 text-white h-14 px-4 py-2 rounded"
                    >
                      <AutoTranslate>Cancel Add Files</AutoTranslate>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {editingDoc === null ? (
              formData?.uploadedFilePaths?.map((file, index) => {
                const displayName = file.displayName || uploadedFileNames[index];
                const version = file.version;
                const status = file?.status;
                const rejectionReason = file?.rejectionReason || null;
                const isWaitingRoomFile = file?.isWaitingRoomFile;

                return (
                  <li
                    key={index}
                    className="grid grid-cols-[40%_1fr_1fr_1fr_1fr] items-center gap-2 p-3 border rounded-xl shadow-sm bg-white hover:shadow-md transition"
                  >
                    {/* File Name */}
                    <div className="overflow-hidden whitespace-nowrap text-ellipsis">
                      <span className="font-medium text-gray-800">{displayName}</span>
                      {isWaitingRoomFile && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          <AutoTranslate>From Waiting Room</AutoTranslate>
                        </span>
                      )}
                    </div>

                    {/* Year - Show actual year value */}
                    <div className="text-center">
                      <label className="flex justify-center items-center gap-1">
                        <span className="text-sm font-medium text-gray-600"><AutoTranslate>Year:</AutoTranslate></span>
                        <span className="border rounded-lg px-2 py-1 text-sm w-24 text-center bg-gray-50">
                          {file?.yearMaster?.name || file?.year || formData.year?.name || "--"}
                        </span>
                      </label>
                    </div>

                    {/* Version - Show version value */}
                    <div className="text-center">
                      <label className="flex justify-center items-center gap-2">
                        <span className="text-sm font-medium text-gray-600"><AutoTranslate>Version</AutoTranslate>:</span>
                        <span className="border rounded-lg px-2 py-1 text-sm w-20 text-center bg-gray-50">
                          {version || "--"}
                        </span>
                      </label>
                    </div>

                    {/* Status */}
                    <div className="text-center">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium
          ${status === "APPROVED" ? "bg-green-100 text-green-700" :
                          status === "REJECTED" ? "bg-red-100 text-red-700" :
                            "bg-yellow-100 text-yellow-700"}`}
                      >
                        {status || <AutoTranslate>PENDING</AutoTranslate>}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          if (isWaitingRoomFile) {
                            openWaitingRoomFile(file, index);
                          } else {
                            openFileBeforeSubmit(file?.path, index);
                          }
                        }}
                        disabled={openingFiles === index}
                        className={`rounded-lg px-3 py-1 text-sm transition ${openingFiles === index
                          ? "bg-gray-400 text-white cursor-not-allowed"
                          : "bg-indigo-500 text-white hover:bg-indigo-600"
                          }`}
                      >
                        {openingFiles === index ? <AutoTranslate>Opening...</AutoTranslate> : <AutoTranslate>Open</AutoTranslate>}
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          const updatedFiles = formData.uploadedFilePaths.filter((_, i) => i !== index);
                          setFormData((prev) => ({
                            ...prev,
                            uploadedFilePaths: updatedFiles,
                          }));
                        }}
                        className="rounded-lg px-3 py-1 text-sm bg-red-500 text-white hover:bg-red-600 transition"
                      >
                        <AutoTranslate>Delete</AutoTranslate>
                      </button>
                    </div>
                  </li>
                );
              })
            ) : (
              uploadedFilePath?.map((file, index) => {
                const displayName = uploadedFileNames[index];
                const version = file.version;
                const rejectionReason = file?.rejectionReason || null;
                const status = file?.status;

                const isDisabled = formData?.uploadedFilePaths?.some(
                  (uploaded) => uploaded.path === file.path
                );

                return (
                  <li
                    key={index}
                    className="grid grid-cols-[40%_1fr_1fr_1fr_1fr] items-center gap-2 p-3 border rounded-xl shadow-sm bg-white hover:shadow-md transition"
                  >
                    {/* File Name */}
                    <div className="overflow-hidden whitespace-nowrap text-ellipsis">
                      <span className="font-medium text-gray-800">{displayName}</span>
                    </div>

                    {/* Year */}
                    <div className="text-center">
                      <label className="flex justify-center items-center gap-2">
                        <span className="text-sm font-medium text-gray-600"><AutoTranslate>Year:</AutoTranslate></span>
                        <select
                          value={file?.yearMaster?.id || ""}
                          onChange={(e) => handleYearChangeForFile(index, e.target.value)}
                          disabled={!handleEditDocumentActive || isDisabled || status === "APPROVED"}
                          className="border rounded-lg px-2 py-1 text-sm w-24 text-center bg-gray-50"
                        >
                          <option value=""><AutoTranslate>Select</AutoTranslate></option>
                          {yearOptions?.map((year) => (
                            <option key={year.id} value={year.id}>
                              {year.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    {/* Version */}
                    <div className="text-center">
                      <label className="flex justify-center items-center gap-2">
                        <span className="text-sm font-medium text-gray-600"><AutoTranslate>Ver:</AutoTranslate></span>
                        <input
                          type="text"
                          value={version}
                          onChange={(e) => handleVersionChange(index, e.target.value.trim())}
                          className="border rounded-lg px-2 py-1 text-sm w-20 text-center"
                          disabled={!handleEditDocumentActive || isDisabled || status === "APPROVED"}
                          placeholder="v1"
                          maxLength={10}
                          readOnly
                        />
                      </label>
                    </div>
                    <div className="text-center">
                      <label className="flex justify-center items-center gap-2">
                        <span className="text-sm font-medium text-gray-600"><AutoTranslate>Status:</AutoTranslate></span>
                        <span
                          data-tooltip-id="status-tooltip"
                          data-tooltip-html={
                            status === "REJECTED"
                              ? `<strong style="color:#dc2626;">Rejected Reason:</strong> ${rejectionReason || <AutoTranslate>No reason provided</AutoTranslate>}`
                              : ""
                          }
                          className={`px-2 py-1 text-xs rounded-full font-medium
        ${status === "APPROVED"
                              ? "bg-green-100 text-green-700"
                              : status === "REJECTED"
                                ? "bg-red-100 text-red-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                        >
                          {status || <AutoTranslate>PENDING</AutoTranslate>}
                        </span>
                      </label>

                      {/* Custom Tooltip */}
                      <Tooltip
                        id="status-tooltip"
                        place="top"
                        className="!bg-white !text-gray-800 !p-3 !rounded-lg !shadow-lg !max-w-xs !whitespace-pre-wrap border border-gray-300"
                        style={{ fontSize: "0.85rem" }}
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          openFileBeforeSubmit(file?.path, index);
                        }}
                        disabled={openingFiles === index}
                        className={`rounded-lg px-3 py-1 text-sm transition ${openingFiles === index
                          ? "bg-gray-400 text-white cursor-not-allowed"
                          : "bg-indigo-500 text-white hover:bg-indigo-600"
                          }`}
                      >
                        {openingFiles === index ? <AutoTranslate>Opening...</AutoTranslate> : <AutoTranslate>Open</AutoTranslate>}
                      </button>

                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          if (deletingFiles !== index && status !== "APPROVED") {
                            handleDiscardFile(index);
                          }
                        }}
                        disabled={deletingFiles === index || status === "APPROVED"}
                        className={`rounded-lg px-3 py-1 text-sm transition ${deletingFiles === index || status === "APPROVED"
                          ? "bg-gray-400 text-white cursor-not-allowed"
                          : "bg-red-500 text-white hover:bg-red-600"
                          }`}
                      >
                        {deletingFiles === index ? <AutoTranslate>Deleting...</AutoTranslate> : <AutoTranslate>Delete</AutoTranslate>}
                      </button>
                    </div>
                  </li>
                );
              })
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

            <div className="flex justify-between items-center">
              {uploadedFilePath !== 0 && (
                <div
                  className="text-red-800 cursor-pointer hover:underline"
                  onClick={handleDiscardAll}
                  aria-label="Discard All Files"
                >
                  <AutoTranslate>Discard All</AutoTranslate>
                </div>
              )}

              <div className="mt-3">
                {location.state?.fromWaitingRoom ? (
                  <button
                    type="button"
                    onClick={handleAddDocument}
                    className={`${bProcess ? "bg-gray-400 cursor-not-allowed" : "bg-blue-900 hover:bg-blue-700"}
      text-white focus:ring-2 focus:ring-blue-500 rounded-2xl p-2 flex items-center text-sm`}
                  >
                    <AutoTranslate>Upload Document</AutoTranslate>
                  </button>
                ) : editingDoc ? (
                  <button
                    onClick={handleSaveEdit}
                    disabled={bProcess}
                    className={`${bProcess ? "bg-gray-400 cursor-not-allowed" : "bg-blue-900 hover:bg-blue-700"}
      text-white focus:ring-2 focus:ring-blue-500 rounded-2xl p-2 flex items-center text-sm`}
                  >
                    {bProcess ? <AutoTranslate>Updating...</AutoTranslate> : <AutoTranslate>Update Document</AutoTranslate>}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleAddDocument}
                    className={`${bProcess ? "bg-gray-400 cursor-not-allowed" : "bg-blue-900 hover:bg-blue-700"}
      text-white focus:ring-2 focus:ring-blue-500 rounded-2xl p-2 flex items-center text-sm`}
                  >
                    <AutoTranslate>Upload Document</AutoTranslate>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="mb-4 bg-slate-100 p-4 rounded-lg flex justify-between items-center">
            <div className="flex items-center bg-blue-500 rounded-lg">
              <label
                htmlFor="itemsPerPage"
                className="mr-2 ml-2 text-white text-sm"
              >
                <AutoTranslate>Show:</AutoTranslate>
              </label>
              <select
                id="itemsPerPage"
                className="border rounded-r-lg p-1.5 outline-none"
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
            <div className="flex items-center mb-4">
              <input
                type="text"
                placeholder={getFallbackTranslation(
                  'Search by title, subject, or file no',
                  currentLanguage
                )}
                className="border rounded-l-md p-1 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                maxLength={20}
              />
              <MagnifyingGlassIcon className="text-white bg-blue-500 rounded-r-lg h-8 w-8 border p-1.5" />
            </div>
          </div>

          <div className="overflow-x-auto bg-white">
            <table className="w-full border-collapse border">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border p-2 text-left"><AutoTranslate>SR.</AutoTranslate></th>
                  <th className="border p-2 text-left"><AutoTranslate>File No</AutoTranslate></th>
                  <th className="border p-2 text-left"><AutoTranslate>Title</AutoTranslate></th>
                  <th className="border p-2 text-left"><AutoTranslate>Subject</AutoTranslate></th>
                  <th className="border p-2 text-left"><AutoTranslate>Category</AutoTranslate></th>
                  <th className="border p-2 text-left"><AutoTranslate>Approval Status</AutoTranslate></th>
                  <th className="border p-2 text-left"><AutoTranslate>Uploaded Date</AutoTranslate></th>
                  <th className="border p-2 text-left"><AutoTranslate>Edit</AutoTranslate></th>
                  <th className="border p-2 text-left"><AutoTranslate>View</AutoTranslate></th>
                </tr>
              </thead>
              <tbody>
                {paginatedDocuments.map((doc, index) => (
                  <tr key={doc.id}>
                    <td className="border p-2">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="border p-2">{doc.fileNo}</td>
                    <td className="border p-2">{doc.title}</td>
                    <td className="border p-2">{doc.subject}</td>
                    <td className="border p-2">
                      {doc.categoryMaster
                        ? doc.categoryMaster.name
                        : <AutoTranslate>No Category</AutoTranslate>}
                    </td>
                    <td className="border p-2">{doc.approvalStatus}</td>
                    <td className="border p-2">{formatDate(doc.createdOn)}</td>
                    <td className="border p-2">
                      <button onClick={() => handleEditDocument(doc)} disabled={doc.isActive === 0}
                        className={`${doc.isActive === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <PencilIcon className="h-6 w-6 text-white bg-yellow-400 rounded-xl p-1 sm:text-blue-50" />
                      </button>
                    </td>
                    <td className="border p-2">
                      <button onClick={() => openModal(doc)}>
                        <EyeIcon className="h-6 w-6 bg-green-400 rounded-xl p-1 text-white" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Pagination Controls */}
            <div className="flex items-center mt-4">
              {/* Previous Button */}
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || totalPages === 0}
                className={`px-3 py-1 rounded mr-3 ${currentPage === 1 || totalPages === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"
                  }`}
              >
                <ArrowLeftIcon className="inline h-4 w-4 mr-2 mb-1" />
                <AutoTranslate>Previous</AutoTranslate>
              </button>

              {/* Page Number Buttons */}
              {totalPages > 0 && getPageNumbers().map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 rounded mx-1 ${currentPage === page ? "bg-blue-500 text-white" : "bg-slate-200 hover:bg-blue-100"
                    }`}
                >
                  {page}
                </button>
              ))}

              {/* Page Count Info */}
              <span className="text-sm text-gray-700 mx-2">
                <AutoTranslate>of</AutoTranslate> {totalPages} <AutoTranslate>pages</AutoTranslate>
              </span>

              {/* Next Button */}
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
                {`Here are items ${totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0
                  } to ${Math.min(currentPage * itemsPerPage, totalItems)} out of ${totalItems}.`}
              </AutoTranslate>
                </span>
              </div>
            </div>

            {/* Document Details Code */}
            <>
              {isOpen && selectedDoc && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-gray-900/80 backdrop-blur-sm print:bg-white overflow-y-auto p-4">
                  <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-7xl p-6 my-8 mx-auto">
                    <div className="max-h-[90vh] overflow-y-auto print:overflow-visible print:max-h-none">

                      {/* Header Actions */}
                      <div className="flex justify-between items-center mb-6 no-print">
                        <div className="flex items-center space-x-2">
                          <div className="bg-indigo-600 text-white rounded-lg p-2">
                            <span className="text-lg font-bold">D</span>
                            <span className="text-lg font-bold">MS</span>
                          </div>
                          <h1 className="text-2xl font-bold text-gray-800">
                            <AutoTranslate>Document Details</AutoTranslate>
                          </h1>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => handlePrintReport(selectedDoc?.id)}
                            className="flex items-center gap-2 px-4 py-2 text-indigo-600 hover:text-indigo-800 transition-colors duration-200 bg-indigo-50 hover:bg-indigo-100 rounded-lg"
                            title="Print document"
                          >
                            <PrinterIcon className="h-5 w-5" />
                            <span><AutoTranslate>Print</AutoTranslate></span>
                          </button>
                          <button
                            onClick={closeModal}
                            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-red-600 transition-colors duration-200 bg-gray-100 hover:bg-gray-200 rounded-lg"
                            title="Close modal"
                          >
                            <XMarkIcon className="h-5 w-5" />
                            <span><AutoTranslate>Close</AutoTranslate></span>
                          </button>
                        </div>
                      </div>

                      {/* Document Details */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        {/* Information Column */}
                        <div className="lg:col-span-2 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                              { label: "Branch", value: selectedDoc?.employee?.branch?.name },
                              { label: "Department", value: selectedDoc?.employee?.department?.name },
                              { label: "File No.", value: selectedDoc?.fileNo },
                              { label: "Title", value: selectedDoc?.title },
                              { label: "Subject", value: selectedDoc?.subject },
                              { label: "Category", value: selectedDoc?.categoryMaster?.name || <AutoTranslate>No Category</AutoTranslate> },
                              { label: "Status", value: selectedDoc?.approvalStatus },
                              { label: "Upload By", value: selectedDoc?.employee?.name },
                            ].map((item, idx) => (
                              <div key={idx} className="space-y-1">
                                <p className="text-sm font-medium text-gray-500"><AutoTranslate>{item.label}</AutoTranslate></p>
                                <p className="text-gray-900 font-medium">
                                  {item.value || <span className="text-gray-400"><AutoTranslate>N/A</AutoTranslate></span>}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* QR Code Column */}
                        <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-xl border border-gray-200">
                          <h3 className="text-lg font-semibold text-gray-700 mb-4">
                            <AutoTranslate>QR Code</AutoTranslate>
                          </h3>
                          {selectedDoc?.qrPath ? (
                            <>
                              <div className="p-3 bg-white rounded-lg border border-gray-300">
                                <img
                                  src={qrCodeUrl}
                                  alt="QR Code"
                                  className="w-32 h-32 object-contain"
                                />
                              </div>
                              <button
                                onClick={downloadQRCode}
                                className="mt-4 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                              >
                                <ArrowDownTrayIcon className="h-4 w-4" />
                                <AutoTranslate>Download QR</AutoTranslate>
                              </button>
                            </>
                          ) : (
                            <div className="text-center text-gray-500 py-8">
                              <QrCodeIcon className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                              <p><AutoTranslate>No QR code available</AutoTranslate></p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Attached Files Section */}
                      <div className="border-t border-gray-200 pt-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                          <h2 className="text-xl font-semibold text-gray-800">
                            <AutoTranslate>Attached Files</AutoTranslate>
                          </h2>
                          <div className="relative w-full sm:w-64">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                              type="text"
                              placeholder={getFallbackTranslation(
                                'Search files...',
                                currentLanguage
                              )}
                              value={searchFileTerm}
                              onChange={(e) => setSearchFileTerm(e.target.value)}
                              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                        </div>

                        {loadingFiles ? (
                          <div className="flex justify-center items-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                            <span className="ml-3 text-gray-600">
                              <AutoTranslate>Loading files...</AutoTranslate>
                            </span>
                          </div>
                        ) : selectedDoc && filteredDocFiles.length > 0 ? (
                          <div className="border border-gray-200 rounded-lg overflow-hidden">
                            {/* Table Header - Hidden on mobile */}
                            <div className="hidden md:grid grid-cols-[35fr_10fr_10fr_10fr_15fr_15fr_20fr_10fr] bg-gray-50 text-gray-600 font-medium text-sm px-6 py-3">
                              <span className="text-left"><AutoTranslate>File Name</AutoTranslate></span>
                              <span className="text-center"><AutoTranslate>Year</AutoTranslate></span>
                              <span className="text-center"><AutoTranslate>Version</AutoTranslate></span>
                              <span className="text-center"><AutoTranslate>Status</AutoTranslate></span>
                              <span className="text-center"><AutoTranslate>Action By</AutoTranslate></span>
                              <span className="text-center"><AutoTranslate>Action Date</AutoTranslate></span>
                              <span className="text-center"><AutoTranslate>Reason</AutoTranslate></span>
                              <span className="text-center no-print"><AutoTranslate>View</AutoTranslate></span>
                            </div>

                            {/* File List */}
                            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                              {filteredDocFiles.map((file, index) => (
                                <div key={index} className="hover:bg-gray-50 transition-colors duration-150">
                                  {/* Desktop View */}
                                  <div className="hidden md:grid grid-cols-[35fr_10fr_10fr_10fr_15fr_15fr_20fr_10fr] items-center px-6 py-4 text-sm">
                                    <div className="text-left text-gray-800 break-words">
                                      <strong>{index + 1}.</strong> {file.docName}
                                    </div>
                                    <div className="text-center text-gray-700">{file.year}</div>
                                    <div className="text-center text-gray-700">{file.version}</div>
                                    <div className="text-center">
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${file.status === "APPROVED" ? "bg-green-100 text-green-800" :
                                          file.status === "REJECTED" ? "bg-red-100 text-red-800" :
                                            "bg-yellow-100 text-yellow-800"}`}
                                      >
                                        {file.status || <AutoTranslate>PENDING</AutoTranslate>}
                                      </span>
                                    </div>
                                    <div className="text-center text-gray-700">{file.approvedBy || "--"}</div>
                                    <div className="text-center text-gray-700">{formatDate(file.approvedOn)}</div>
                                    <div className="text-center text-gray-700 break-words">{file.rejectionReason || "--"}</div>
                                    <div className="flex justify-center no-print">
                                      <button
                                        onClick={() => {
                                          setOpeningFileIndex(index);
                                          setSelectedDocFiles(file);
                                          openFile(file).finally(() => setOpeningFileIndex(null));
                                        }}
                                        disabled={openingFileIndex !== null}
                                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200
                            ${openingFileIndex === index ?
                                            "bg-indigo-400 cursor-not-allowed" :
                                            "bg-indigo-600 hover:bg-indigo-700"} text-white`}
                                      >
                                        {openingFileIndex === index ? (
                                          <>
                                            <ArrowPathIcon className="h-3 w-3 animate-spin" />
                                            <AutoTranslate>Opening...</AutoTranslate>
                                          </>
                                        ) : (
                                          <>
                                            <EyeIcon className="h-3 w-3" />
                                            <AutoTranslate>View</AutoTranslate>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </div>

                                  {/* Mobile View */}
                                  <div className="md:hidden p-4">
                                    <div className="flex justify-between items-start mb-2">
                                      <div className="text-left text-gray-800 break-words flex-1">
                                        <strong>{index + 1}.</strong> {file.docName}
                                      </div>
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-2
                          ${file.status === "APPROVED" ? "bg-green-100 text-green-800" :
                                          file.status === "REJECTED" ? "bg-red-100 text-red-800" :
                                            "bg-yellow-100 text-yellow-800"}`}
                                      >
                                        {file.status || <AutoTranslate>PENDING</AutoTranslate>}
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                                      <div>
                                        <p className="text-xs text-gray-500"><AutoTranslate>Year</AutoTranslate></p>
                                        <p className="text-gray-700">{file.year}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500"><AutoTranslate>Version</AutoTranslate></p>
                                        <p className="text-gray-700">{file.version}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500"><AutoTranslate>Action By</AutoTranslate></p>
                                        <p className="text-gray-700">{file.approvedBy || "--"}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500"><AutoTranslate>Action Date</AutoTranslate></p>
                                        <p className="text-gray-700">{formatDate(file.approvedOn)}</p>
                                      </div>
                                      <div className="col-span-2">
                                        <p className="text-xs text-gray-500"><AutoTranslate>Reason</AutoTranslate></p>
                                        <p className="text-gray-700 break-words">{file.rejectionReason || "--"}</p>
                                      </div>
                                    </div>

                                    <div className="mt-3 flex justify-end">
                                      <button
                                        onClick={() => {
                                          setOpeningFileIndex(index);
                                          setSelectedDocFiles(file);
                                          openFile(file).finally(() => setOpeningFileIndex(null));
                                        }}
                                        disabled={openingFileIndex !== null}
                                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200
                            ${openingFileIndex === index ?
                                            "bg-indigo-400 cursor-not-allowed" :
                                            "bg-indigo-600 hover:bg-indigo-700"} text-white`}
                                      >
                                        {openingFileIndex === index ? (
                                          <>
                                            <ArrowPathIcon className="h-3 w-3 animate-spin" />
                                            <AutoTranslate>Opening...</AutoTranslate>
                                          </>
                                        ) : (
                                          <>
                                            <EyeIcon className="h-3 w-3" />
                                            <AutoTranslate>View File</AutoTranslate>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
                            <DocumentIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                            <p className="text-gray-500">
                              <AutoTranslate>No attached files found</AutoTranslate>
                            </p>
                            {searchFileTerm && (
                              <p className="text-sm text-gray-400 mt-1">
                                <AutoTranslate>Try adjusting your search term</AutoTranslate>
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {viewFileTypeModel && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
                  <div className="w-80 sm:w-96 bg-white rounded-xl shadow-xl p-5 border border-gray-200 max-h-[80vh] overflow-y-auto transition-all">

                    {/* Header */}
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-semibold text-gray-800">
                        <AutoTranslate>Supported File Types</AutoTranslate>
                      </h2>
                      <button
                        onClick={handlecloseFileType}
                        className="text-gray-400 hover:text-red-500 text-xl focus:outline-none"
                        aria-label="Close"
                      >
                        &times;
                      </button>
                    </div>

                    {/* Search Input */}
                    <input
                      type="text"
                      placeholder={getFallbackTranslation(
                        'Search file type...',
                        currentLanguage
                      )}
                      value={searchTerm}
                      onChange={(e) => setSearchFileTerm(e.target.value)}
                      maxLength={20}
                      className="w-full p-2 mb-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />

                    {/* List */}
                    <ul className="space-y-2">
                      {filteredFiles.length > 0 ? (
                        filteredFiles.map((file) => (
                          <li
                            key={file.id}
                            className="flex justify-between items-center px-3 py-2 bg-gray-50 rounded-md hover:bg-blue-50 transition text-sm"
                          >
                            <span className="text-gray-800 font-medium">{file.filetype}</span>
                            <span className="text-gray-500">{file.extension}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-center text-gray-500 text-sm">
                          <AutoTranslate>No matching file types found</AutoTranslate>
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              )}

              {/* Waiting Room Modal */}
              <WaitingRoom
                isOpen={isWaitingRoomModalOpen}
                onClose={() => setIsWaitingRoomModalOpen(false)}
                onSelectDocuments={handleSelectFromWaitingRoom}
                metadata={{
                  branch: userBranch,
                  department: userDep,
                  year: formData.year?.name,
                  yearMas: formData.year,
                  category: formData.category?.name,
                  version: formData.version,
                  fileNo: formData.fileNo,
                  title: formData.title,
                  subject: formData.subject,
                }}
                token={token}
                showPopup={showPopup}
              />
            </>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentManagement;