// DocumentManagement.jsx - Complete Working Version

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import apiClient from "../API/apiClient";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Popup from "../Components/Popup";
import { useDropzone } from "react-dropzone";
import FilePreviewModal from "../Components/FilePreviewModal";
import LoadingComponent from '../Components/LoadingComponent';
import { Tooltip } from "react-tooltip";
import WaitingRoom from '../Data/WaitingRoom';
import { postRequest } from "../API/apiHelper";
import { FiPlus } from "react-icons/fi";
import { IoIosArrowForward, IoIosArrowBack } from "react-icons/io";
import { MdOutlineClose } from "react-icons/md";
import VersionInput from '../Components/VersionInput';

// Import AutoTranslate components
import AutoTranslate from '../i18n/AutoTranslate';
import { useLanguage } from '../i18n/LanguageContext';
import { getFallbackTranslation } from '../i18n/autoTranslator';

import {
  TrashIcon,
  PencilIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  QrCodeIcon,
  ArrowPathIcon,
  DocumentIcon,
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
  
  // ============ STATE DECLARATIONS ============
  const [formData, setFormData] = useState({
    fileNo: "",
    title: "",
    subject: "",
    version: "",
    category: null,
    year: null,
    uploadedFilePaths: [],
  });
  
  const [scaleValue, setScaleValue] = useState("2");
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
  const [userBranch, setUserBranch] = useState("");
  const [userDep, setUserDep] = useState("");
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
  const UserId = localStorage.getItem("id");
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
  const [dynamicMetadata, setDynamicMetadata] = useState([
    { id: "", key: "", value: "" }
  ]);
  const [deletedMetaDataIds, setDeletedMetaDataIds] = useState([]);

  // ============ SAFE ACCESS UTILITIES ============
  const safeGet = (obj, path, defaultValue = '') => {
    if (!obj) return defaultValue;
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
      if (result === undefined || result === null) return defaultValue;
      result = result[key];
    }
    return result !== undefined && result !== null ? result : defaultValue;
  };

  const getSafeDisplayName = (file) => {
    if (!file) return 'Unknown File';
    return file.displayName || file.name || file.docName || file.originalName || 'Unknown File';
  };

  const getSafeYear = (file) => {
    if (!file) return 'Unknown';
    return file.yearMaster?.name || file.year || 'Unknown';
  };

  const getSafeVersion = (file) => {
    if (!file) return '--';
    return file.version || '--';
  };

  const getSafeStatus = (file) => {
    if (!file) return 'PENDING';
    return file.status || 'PENDING';
  };

  const getSafePath = (file) => {
    if (!file) return '';
    return file.path || '';
  };

  // ============ DOCUMENT STATE HELPERS ============
  const isDocumentSaved = editingDoc && editingDoc.id;
  const hasApprovedFiles = editingDoc?.documentDetails?.some(
    detail => detail?.status === 'APPROVED'
  );

  const isMetadataDisabled = () => {
    if (isDocumentSaved && hasApprovedFiles) {
      return true;
    }
    return false;
  };

  // ============ USE EFFECTS ============
  useEffect(() => {
    const { fileNo, title, subject, version, category, year } = formData;
    setIsMetadataComplete(!!(fileNo && title && subject && version && category && year));
  }, [formData]);

  useEffect(() => {
    if (data) {
      handleEditDocument(data);
    }
    fetchCategory();
    fetchYear();
    fetchDocuments();
    fetchUser();
  }, []);

  useEffect(() => {
    if (selectedDoc && selectedDoc.id) {
      fetchQRCode(selectedDoc.id);
    }
  }, [selectedDoc]);

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

  useEffect(() => {
    if (selectedDoc) {
      setLoadingFiles(true);
      setTimeout(() => {
        setLoadingFiles(false);
      }, 300);
    }
  }, [selectedDoc]);

  // ============ POPUP HELPER ============
  const showPopup = (message, type = 'info') => {
    setPopupMessage({
      message,
      type,
      onClose: () => {
        setPopupMessage(null);
      }
    });
  };

  // ============ API CALLS ============
  const fetchCategory = async () => {
    try {
      const response = await apiClient.get(`${API_HOST}/CategoryMaster/findActiveCategory`);
      setCategoryOptions(response.data || []);
    } catch (error) {
      console.error(<AutoTranslate>Error fetching categories:</AutoTranslate>, error);
      setCategoryOptions([]);
    }
  };

  const fetchYear = async () => {
    try {
      const response = await apiClient.get(`${API_HOST}/YearMaster/findActiveYear`);
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
      setYearOptions([]);
    }
  };

  const fetchUser = async () => {
    try {
      const userId = localStorage.getItem("id");
      const response = await apiClient.get(`${API_HOST}/employee/findById/${userId}`);
      setUserBranch(response.data.branch?.name || "");
      setUserDep(response.data.department?.name || "");
    } catch (error) {
      console.error(<AutoTranslate>Error fetching user branch:</AutoTranslate>, error);
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`${DOCUMENTHEADER_API}/pending/employee/${UserId}`);
      setDocuments(response.data || []);
      setTotalItems(response.data?.length || 0);
    } catch (error) {
      console.error(<AutoTranslate>Error fetching documents:</AutoTranslate>, error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilesType = async () => {
    try {
      const response = await apiClient.get(`${FILETYPE_API}/getAllActive`);
      setFilesType(response?.data?.response ?? []);
    } catch (error) {
      console.error(<AutoTranslate>Error fetching Files Types:</AutoTranslate>, error);
      setFilesType([]);
    }
  };

  const fetchPaths = async (doc) => {
    try {
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
        `${DOCUMENTHEADER_API}/byDocumentHeader/${documentId}/PENDING`,
        {
          headers: {
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
      console.error("Error in fetchPaths:", error);
      return null;
    }
  };

  const fetchQRCode = async (documentId) => {
    try {
      const apiUrl = `/api/documents/documents/download/qr/${documentId}`;
      const response = await apiClient.get(apiUrl, { responseType: "blob" });
      const qrCodeBlob = response.data;
      if (!qrCodeBlob.type.includes("image/png")) {
        throw new Error(<AutoTranslate>Received data is not a valid image</AutoTranslate>);
      }
      const qrCodeUrl = window.URL.createObjectURL(qrCodeBlob);
      setQrCodeUrl(qrCodeUrl);
    } catch (error) {
      setError(<AutoTranslate>Error displaying QR Code:</AutoTranslate> + error.message);
    }
  };

  // ============ HANDLERS ============
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

  const handleChangeScale = (e) => {
    setScaleValue(e.target.value);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  };

  const handleVersionChange = (index, newVersion) => {
    setUploadedFilePath((prevPaths) =>
      prevPaths.map((file, i) =>
        i === index
          ? { ...file, version: newVersion }
          : file
      )
    );
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

  const handleCancelUpload = () => {
    if (uploadController) {
      uploadController.abort();
      setUploadController(null);
      setIsUploading(false);
      showPopup("Upload has been canceled.", "warning");
    }
  };

  const viewfiletype = () => {
    fetchFilesType();
    setViewFileTypeModel(true);
    setIsUploading(false);
  };

  const handlecloseFileType = () => {
    setViewFileTypeModel(false);
    setIsUploading(false);
  };

  // ============ FILE OPEN/HANDLING ============
  const openFile = async (file) => {
    try {
      setOpeningFiles(true);
      const encodedPath = file.path.split("/").map(encodeURIComponent).join("/");
      const fileUrl = `${API_HOST}/api/documents/download/${encodedPath}?action=view`;

      const response = await apiClient.get(fileUrl, {
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
      let errorMessage = "Failed to fetch or preview the file.";
      if (error.response) {
        const data = error.response.data;
        if (data instanceof Blob) {
          try {
            const text = await data.text();
            const json = JSON.parse(text);
            errorMessage = json.message || `Error: ${error.response.status}`;
          } catch (e) {
            errorMessage = `Error: ${error.response.status}`;
          }
        } else if (typeof data === "object") {
          errorMessage = data.message || `Error: ${error.response.status}`;
        } else {
          errorMessage = `Error: ${error.response.status}`;
        }
      } else if (error.request) {
        errorMessage = "No response from server";
      } else {
        errorMessage = error.message;
      }
      showPopup(errorMessage, "error");
    } finally {
      setOpeningFiles(false);
    }
  };

  const openFileBeforeSubmit = async (file, index) => {
    setOpeningFiles(index);
    try {
      const fileUrl = `${API_HOST}/api/documents/download/${file}`;
      const response = await apiClient.get(fileUrl, {
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
      showPopup(<AutoTranslate>Failed to fetch or preview the file.</AutoTranslate>, "error");
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
      showPopup(<AutoTranslate>Failed to open waiting room file</AutoTranslate>, "error");
    } finally {
      setOpeningFiles(null);
    }
  };

  const handleDownload = async (file, action = "download") => {
    if (!selectedDoc) return;

    const branch = selectedDoc.employee?.branch?.name?.replace(/ /g, "_") || "";
    const department = selectedDoc.employee?.department?.name?.replace(/ /g, "_") || "";
    const year = (file.year || file.yearMaster?.name || "")?.replace(/ /g, "_");
    const category = selectedDoc.categoryMaster?.name?.replace(/ /g, "_") || "unknown";
    const version = file.version;
    const fileName = file.docName?.replace(/ /g, "_");

    if (!year) {
      showPopup("Year information is missing for this file", "error");
      return;
    }

    const fileUrl = `${API_HOST}/api/documents/download/${encodeURIComponent(
      branch
    )}/${encodeURIComponent(department)}/${encodeURIComponent(
      year
    )}/${encodeURIComponent(category)}/${encodeURIComponent(
      version
    )}/${encodeURIComponent(fileName)}?action=${action}`;

    try {
      const response = await apiClient.get(fileUrl, {
        responseType: "blob",
      });

      const downloadBlob = new Blob([response.data], {
        type: response.headers["content-type"],
      });

      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(downloadBlob);

      if (action === "view") {
        window.open(link.href, "_blank");
      } else {
        link.download = file.docName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      URL.revokeObjectURL(link.href);
    } catch (error) {
      showPopup("Failed to download file. Please try again.", "error");
    }
  };

  const extractBlobMessage = async (blob) => {
    try {
      const text = await blob.text();
      const json = JSON.parse(text);
      return json.message || "Access denied";
    } catch {
      return "Access denied";
    }
  };

  // ============ DROPZONE ============
  const onDrop = useCallback(
    async (acceptedFiles, event) => {
      let isFolderDropped = false;
      acceptedFiles.forEach((file) => {
        const path = file.path || file.webkitRelativePath || file.name;
        const slashCount = (path.match(/[\\/]/g) || []).length;
        if (slashCount > 1) isFolderDropped = true;
      });

      if (isFolderDropped && !folderUpload) {
        showPopup("Please enable 'folderUpload' to upload folders", "warning");
        return;
      }

      if (!isFolderDropped && folderUpload) {
        showPopup("Please disable 'folderUpload' to upload files.", "warning");
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

  // ============ FILE UPLOAD ============
  const handleUploadDocument = async () => {
    if (selectedFiles.length === 0) {
      showPopup("Please select at least one file to upload.", "warning");
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
        `Version "${versionToUpload}" already exists for year "${formData.year?.name}". Please use a new version or select a different year.`,
        "warning"
      );
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const uploadData = new FormData();
    const { category, year, version, fileNo, status } = formData;

    uploadData.append("category", category?.name || "");
    uploadData.append("year", year?.name || "");
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
      const baseName = (fileNo || "DOC").split(".")[0].substring(0, 3);
      const extension = file.name.split(".").pop() || "pdf";
      return {
        file,
        renamed: `${baseName}_${category?.name || "CAT"}_${year?.name || "YR"}_${version || "1"}_${formattedDate}_${index + 1}.${extension}`,
      };
    });

    renamedFiles.forEach(({ file, renamed }) => {
      uploadData.append("files", file, renamed);
    });

    try {
      const result = await postRequest(
        "/api/documents/upload",
        uploadData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setUploadProgress(percent);
            }
          },
        }
      );

      if (!result.uploadedFiles?.length) return;

      if (scaleValue === "0" || scaleValue === "1") {
        for (let i = 0; i < result.uploadedFiles.length; i++) {
          const serverFile = result.uploadedFiles[i];
          const originalFile = selectedFiles[i];
          const scaleFormData = new FormData();
          scaleFormData.append("file", originalFile);
          scaleFormData.append("scale_type", scaleValue);
          const destinationPath = "C:\\FTP\\DMS_Document\\" + serverFile.path;
          scaleFormData.append("destination_path", destinationPath);
          await postRequest(
            "http://localhost:8950/scale/document",
            scaleFormData,
            {
              headers: {
                "Content-Type": "multipart/form-data",
              },
            }
          );
        }
      }

      if (result.uploadedFiles?.length > 0) {
        const mappedFiles = result.uploadedFiles
          .filter(fileObj => fileObj !== undefined && fileObj !== null)
          .map((fileObj, index) => ({
            path: fileObj.path || '',
            version: `${version}` || '1.0',
            yearMaster: year || null,
            status: status || 'PENDING',
            fileSizeHuman: fileObj.fileSizeHuman || null,
            fileSizeBytes: fileObj.fileSizeBytes || null,
            fileType: fileObj.fileType || null,
            mimeType: fileObj.contentType || null,
            pageCounts: fileObj.pageCount || null,
            displayName: renamedFiles[index]?.renamed || fileObj.originalName || `file_${index + 1}`,
          }));

        setUploadedFilePath(prev => {
          const current = Array.isArray(prev) ? prev : [];
          return [...current, ...mappedFiles];
        });

        setFormData(prevData => ({
          ...prevData,
          uploadedFilePaths: [
            ...(Array.isArray(prevData.uploadedFilePaths) ? prevData.uploadedFilePaths : []),
            ...mappedFiles,
          ],
          version: "",
        }));

        if (fileInputRef.current) {
          fileInputRef.current.value = null;
        }

        showPopup("Files uploaded successfully!", "success");
      }

      if (result.errors?.length > 0) {
        showPopup(
          "Some files failed:\n" +
          result.errors.map((err) => `${err.file}: ${err.error}`).join("\n"),
          "error"
        );
        setUnsportFile(true);
      }

    } catch (error) {
      console.error("Upload error:", error);
      showPopup(
        error?.response?.data?.message || "File upload failed.",
        "error"
      );
    } finally {
      setIsUploading(false);
    }
  };

  // ============ SELECT FROM WAITING ROOM ============
  const handleSelectFromWaitingRoom = async (selectedDocuments, metadata = {}) => {
    if (!selectedDocuments || selectedDocuments.length === 0) {
      showPopup("No documents selected from Waiting Room.", "warning");
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
        `Version "${versionToUpload}" already exists for year "${formData.year?.name}". Please use a new version or select a different year.`,
        "warning"
      );
      return;
    }

    try {
      setLoading(true);
      
      const validDocs = selectedDocuments.filter(doc => doc !== undefined && doc !== null);
      
      const processedDocuments = validDocs.map((doc, index) => {
        const fileName = doc.displayName || doc.fileName || doc.documentName || `file_${index + 1}`;
        
        return {
          path: doc.waitingRoomPath || doc.path || '',
          version: metadata.version || doc.version || '1.0',
          yearMaster: currYear || null,
          displayName: fileName,
          name: fileName,
          originalExtension: doc.fileType || null,
          status: "PENDING",
          isWaitingRoomFile: true,
          waitingRoomId: doc.id || doc.waitingRoomId || null,
          fileType: doc.fileType || null,
          waitingRoomPath: doc.waitingRoomPath || doc.path || null,
          fileSizeHuman: doc.fileSizeHuman || null,
          fileSizeBytes: doc.fileSizeBytes || null,
          pageCounts: doc.pageCounts || null,
          mimeType: doc.mimeType || null,
        };
      });

      setUploadedFilePath(prev => {
        const current = Array.isArray(prev) ? prev : [];
        return [...current, ...processedDocuments];
      });

      setFormData((prev) => {
        const updated = {
          ...prev,
          uploadedFilePaths: [
            ...(Array.isArray(prev.uploadedFilePaths) ? prev.uploadedFilePaths : []),
            ...processedDocuments,
          ],
        };
        return updated;
      });

      setUploadedFileNames((prev) => {
        const current = Array.isArray(prev) ? prev : [];
        return [...current, ...processedDocuments.map((f) => f.displayName)];
      });

      showPopup(
        `${processedDocuments.length} file(s) added from Waiting Room!`,
        "success"
      );
    } catch (error) {
      console.error("Error processing waiting room documents:", error);
      showPopup(
        `Failed to process files from Waiting Room: ${error.message || error}`,
        "error"
      );
    } finally {
      setLoading(false);
      setIsWaitingRoomModalOpen(false);
    }
  };

  // ============ SAVE DOCUMENT ============
  const handleAddDocument = async () => {
    if (
      !formData.fileNo ||
      !formData.title ||
      !formData.subject ||
      !formData.category ||
      formData.uploadedFilePaths.length === 0
    ) {
      showPopup("Please fill in all the required fields and upload a file.", "error");
      return;
    }

    const versionedFilePaths = formData.uploadedFilePaths.map((file) => {
      const { version = formData.version || "1.0", yearMaster, displayName } = file;
      const filePath = file.isWaitingRoomFile ? file.displayName : file.path;
      return {
        path: filePath || '',
        version: `${version}`,
        yearId: yearMaster?.id || formData.year?.id || null,
        fileType: file.fileType || null,
        mimeType: file.mimeType || null,
        pageCounts: file.pageCounts || null,
        fileSizeBytes: file.fileSizeBytes || null,
        fileSizeHuman: file.fileSizeHuman || null,
        waitingRoomId: file.waitingRoomId || null,
        isWaitingRoomFile: file.isWaitingRoomFile || false,
        displayName: displayName || filePath?.split("/").pop() || 'unknown',
      };
    });

    const metadataObject = [];
    const seenKeys = new Set();
    dynamicMetadata.forEach(item => {
      if (item.key && item.value && !seenKeys.has(item.key)) {
        metadataObject.push({
          id: item.id ?? null,
          key: item.key,
          value: item.value
        });
        seenKeys.add(item.key);
      }
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
      filePaths: versionedFilePaths,
      metadata: metadataObject,
    };

    try {
      setBProcess(true);
      const response = await apiClient.post("/api/documents/save", payload);

      if (response?.status !== 200 || response?.data?.status === 409) {
        const errorMessage = response?.data?.response?.msg || response?.data?.message || "Unknown error";
        showPopup(`Document save failed: ${errorMessage}`, "warning");
        return;
      }

      showPopup(response?.data?.response?.msg || "Document saved successfully", "success");

      setUploadedFilePath([]);
      setUploadedFileNames([]);
      setSelectedFiles([]);
      
      if (response.data?.response?.documentHeader) {
        setEditingDoc(response.data.response.documentHeader);
        setFormData(prev => ({
          ...prev,
          id: response.data.response.documentHeader.id,
          fileNo: response.data.response.documentHeader.fileNo || prev.fileNo,
          title: response.data.response.documentHeader.title || prev.title,
          subject: response.data.response.documentHeader.subject || prev.subject,
          category: response.data.response.documentHeader.categoryMaster || prev.category,
          uploadedFilePaths: [],
          version: prev.version || '',
        }));
      }
      
      setDynamicMetadata([{ key: "", value: "" }]);
      fetchDocuments();
      
      showPopup(
        "✅ File added successfully! You can add more files with different years.",
        "success"
      );
      
      if (fileInputRef.current) {
        fileInputRef.current.value = null;
      }
      
    } catch (error) {
      console.error("Error saving document:", error);
      showPopup("Document save failed: " + error.message, "warning");
    } finally {
      setBProcess(false);
    }
  };

  // ============ EDIT DOCUMENT ============
  const handleEditDocument = (doc) => {
    if (!doc) return;
    
    setHandleEditDocumentActive(true);
    setEditingDoc(doc);

    const existingFiles = (doc.documentDetails || [])
      .filter(detail => detail !== undefined && detail !== null)
      .map((detail) => ({
        name: detail.path?.split("/").pop() || 'unknown',
        version: detail.version || '1.0',
        path: detail.path || '',
        status: detail.status || 'PENDING',
        yearMaster: detail?.yearMaster || null,
        rejectionReason: detail?.rejectionReason || null,
        waitingRoomId: detail?.waitingRoomId || null,
        isWaitingRoomFile: !!detail?.waitingRoomId,
        displayName: detail.displayName || detail.path?.split("/").pop() || detail.docName || 'unknown',
        fileType: detail.fileType || null,
        mimeType: detail.mimeType || null,
        fileSizeBytes: detail.fileSizeBytes || null,
        fileSizeHuman: detail.fileSizeHuman || null,
        pageCounts: detail.pageCounts || null,
        isExisting: true,
      }));

    setFormData({
      id: doc.id,
      fileNo: doc.fileNo || '',
      title: doc.title || '',
      subject: doc.subject || '',
      version: "",
      category: doc.categoryMaster || null,
      year: null,
      uploadedFilePaths: [],
    });

    setUploadedFileNames(existingFiles.map((file) => file.name));
    setUploadedFilePath(existingFiles);
    
    const backendMetadata = doc.metadataList || [];
    const formattedMetadata = backendMetadata
      .filter(item => item !== undefined && item !== null)
      .map(item => ({
        id: item.id || null,
        key: item.metaKey || '',
        value: item.metaValue || ''
      }));
    setDynamicMetadata(formattedMetadata);

    if (formSectionRef.current) {
      formSectionRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // ============ UPDATE DOCUMENT ============
  const handleSaveEdit = async () => {
    const userId = localStorage.getItem("id");
    if (!userId) {
      showPopup("User not logged in. Please log in again.", "error");
      return;
    }

    const { fileNo, title, subject, category } = formData;
    if (!fileNo || !title || !subject || !category || uploadedFilePath.length === 0) {
      showPopup("Please fill in all required fields and upload files.", "error");
      return;
    }

    const metadataObject = [];
    const seenKeys = new Set();
    dynamicMetadata.forEach(item => {
      if (item.key && item.value && !seenKeys.has(item.key)) {
        metadataObject.push({
          id: item.id ?? null,
          key: item.key,
          value: item.value
        });
        seenKeys.add(item.key);
      }
    });

    const versionedFilePaths = uploadedFilePath.map((file) => {
      const { version = formData.version || "1.0", yearMaster, displayName } = file;
      const filePath = file.isWaitingRoomFile ? displayName : file.path;
      return {
        path: filePath || '',
        version: `${version}`,
        yearId: yearMaster?.id || formData.year?.id || null,
        fileType: file.fileType || null,
        mimeType: file.mimeType || null,
        pageCounts: file.pageCounts || null,
        fileSizeBytes: file.fileSizeBytes || null,
        fileSizeHuman: file.fileSizeHuman || null,
        waitingRoomId: file.waitingRoomId || null,
        isWaitingRoomFile: file.isWaitingRoomFile || false,
        displayName: displayName || filePath?.split("/").pop() || 'unknown',
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
      filePaths: versionedFilePaths,
      metadata: metadataObject,
      deletedMetaDataIds,
    };

    try {
      setBProcess(true);
      const response = await apiClient.put(`/api/documents/update`, payload);

      if (response?.status !== 200 || response?.data?.status === 409) {
        const warningMessage = response?.data?.response?.msg || response?.data?.message || "Unknown error occurred";
        showPopup(`Document update failed: ${warningMessage}`, "warning");
        return;
      }

      showPopup(response?.data?.response?.msg || "Document updated successfully!", "success");
      
      setUploadedFilePath([]);
      setUploadedFileNames([]);
      setSelectedFiles([]);
      setEditingDoc(null);
      setFormData({
        fileNo: "",
        title: "",
        subject: "",
        version: "",
        category: null,
        year: null,
        uploadedFilePaths: [],
      });
      
      fetchDocuments();
    } catch (error) {
      console.error("Error updating document:", error);
      showPopup("Document update failed: " + error.message, "error");
    } finally {
      setBProcess(false);
    }
  };

  // ============ MODAL HANDLERS ============
  const openModal = (doc) => {
    setSelectedDoc(doc);
    fetchPaths(doc);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setSelectedDoc(null);
  };

  const handlePrintReport = async (id) => {
    if (!id) return;
    try {
      const response = await apiClient.get(`/api/reports/document/${id}`, {
        responseType: "arraybuffer",
      });
      const blob = response.data;
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

  const downloadQRCode = async () => {
    try {
      const response = await apiClient.get(
        `/api/documents/documents/download/qr/${selectedDoc.id}`,
        { responseType: "blob" }
      );
      const qrCodeUrl = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = qrCodeUrl;
      link.download = `QR_Code_${selectedDoc.id}.png`;
      link.click();
      window.URL.revokeObjectURL(qrCodeUrl);
    } catch (error) {
      console.error(error);
    }
  };

  // ============ FORMAT HELPERS ============
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

  // ============ PAGINATION ============
  const getPageNumbers = () => {
    const maxPageNumbers = 5;
    const startPage = Math.floor((currentPage - 1) / maxPageNumbers) * maxPageNumbers + 1;
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
      doc.title?.toLowerCase().includes(search) ||
      doc.subject?.toLowerCase().includes(search) ||
      doc.fileNo?.toLowerCase().includes(search) ||
      doc.categoryMaster?.name?.toLowerCase().includes(search) ||
      doc.approvalStatus?.toLowerCase().includes(search) ||
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

  const filteredDocFiles = useMemo(() => {
    if (!selectedDoc || !Array.isArray(selectedDoc.paths)) return [];
    return selectedDoc.paths.filter((file) => {
      const name = file.docName?.toLowerCase() || '';
      const version = String(file.version || '').toLowerCase();
      const term = searchFileTerm.toLowerCase();
      return name.includes(term) || version.includes(term);
    });
  }, [selectedDoc, searchFileTerm]);

  const hasApprovedFile = uploadedFilePath?.some(file => file?.status === "APPROVED");

  // ============ LOADING ============
  if (loading) {
    return <LoadingComponent />;
  }

  // ============ RENDER ============
  return (
    <div className="">
      <div className="title">
        <h1><AutoTranslate>Upload Document</AutoTranslate></h1>
      </div>

      <div className="card">
        {popupMessage && (
          <Popup
            message={popupMessage.message}
            type={popupMessage.type}
            onClose={() => setPopupMessage(null)}
          />
        )}
        <div ref={formSectionRef} className="">
          {/* ========== DOCUMENT METADATA ========== */}
          <div className="cardLight">
            <h2 className="flex align-center gap-2">
              📁 <AutoTranslate>Document Metadata</AutoTranslate> <span className="text-red-500">*</span>
              {isDocumentSaved && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  <AutoTranslate>Document ID</AutoTranslate>: #{editingDoc.id}
                </span>
              )}
              {hasApprovedFiles && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  <AutoTranslate>Has Approved Files</AutoTranslate>
                </span>
              )}
            </h2>

            <div className="grid grid-col-4 mb-4">
              <div className="form-group">
                <label>
                  <AutoTranslate>File No.</AutoTranslate>
                  {isDocumentSaved && <span className="text-xs text-gray-400 ml-1">(read-only)</span>}
                </label>
                <input
                  type="text"
                  placeholder={getFallbackTranslation('Enter File No.', currentLanguage)}
                  name="fileNo"
                  value={formData.fileNo || ''}
                  onChange={(e) => setFormData({ ...formData, fileNo: e.target.value })}
                  disabled={isMetadataDisabled()}
                  maxLength={20}
                  minLength={3}
                  required
                  className={isMetadataDisabled() ? 'bg-gray-100 cursor-not-allowed' : ''}
                />
                {isDocumentSaved && (
                  <p className="text-xs text-blue-500 mt-1">
                    <AutoTranslate>Document already created. You can only add new files.</AutoTranslate>
                  </p>
                )}
              </div>

              <div className="form-group">
                <label>
                  <AutoTranslate>Title</AutoTranslate>
                  {isDocumentSaved && <span className="text-xs text-gray-400 ml-1">(read-only)</span>}
                </label>
                <input
                  type="text"
                  placeholder={getFallbackTranslation('Enter Title', currentLanguage)}
                  name="title"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  disabled={isMetadataDisabled()}
                  maxLength={20}
                  minLength={3}
                  required
                  className={isMetadataDisabled() ? 'bg-gray-100 cursor-not-allowed' : ''}
                />
              </div>

              <div className="form-group">
                <label>
                  <AutoTranslate>Subject</AutoTranslate>
                  {isDocumentSaved && <span className="text-xs text-gray-400 ml-1">(read-only)</span>}
                </label>
                <input
                  type="text"
                  placeholder={getFallbackTranslation('Enter Subject', currentLanguage)}
                  name="subject"
                  value={formData.subject || ''}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  disabled={isMetadataDisabled()}
                  maxLength={20}
                  minLength={3}
                  required
                  className={isMetadataDisabled() ? 'bg-gray-100 cursor-not-allowed' : ''}
                />
              </div>

              <div className="form-group">
                <label>
                  <AutoTranslate>Category</AutoTranslate>
                  {isDocumentSaved && <span className="text-xs text-gray-400 ml-1">(read-only)</span>}
                </label>
                <select
                  name="category"
                  value={formData.category?.id || ""}
                  onChange={handleCategoryChange}
                  disabled={isMetadataDisabled()}
                  className={isMetadataDisabled() ? 'bg-gray-100 cursor-not-allowed' : ''}
                >
                  <option value=""><AutoTranslate>Select category</AutoTranslate></option>
                  {categoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isDocumentSaved && hasApprovedFiles && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700">
                  <span className="font-bold">ℹ️</span>
                  <AutoTranslate>
                    This document has approved files. You can add new files with different years or versions.
                    To edit document metadata, please contact an administrator.
                  </AutoTranslate>
                </p>
              </div>
            )}
          </div>

          {/* ========== ADDITIONAL METADATA ========== */}
          <div className="metaDataCard">
            <div className="flex items-center justify-between mb-3">
              <h2 className="flex align-center gap-2 mb-0">
                🧩 <AutoTranslate>Document Additional Metadata</AutoTranslate>{" "}
                <span className="text-gray-500">(optional)</span>
              </h2>
              {(() => {
                const keys = dynamicMetadata.map(item => item.key.trim()).filter(Boolean);
                const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);
                if (duplicates.length > 0) {
                  return (
                    <span className="text-red-500 text-sm ml-4 whitespace-nowrap">
                      ⚠ Duplicate key: {duplicates.join(", ")}
                    </span>
                  );
                }
                return null;
              })()}
            </div>

            <div className='card-wp'>
              {dynamicMetadata.map((item, index) => (
                <div key={index} className="card">
                  <div className="form-group">
                    <input
                      type="text"
                      placeholder="Key"
                      value={item.key || ''}
                      disabled={hasApprovedFile && !!item.id}
                      onChange={(e) => {
                        const updated = [...dynamicMetadata];
                        updated[index].key = e.target.value;
                        setDynamicMetadata(updated);
                      }}
                      className="disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="form-group">
                    <input
                      type="text"
                      placeholder="Value"
                      value={item.value || ''}
                      disabled={hasApprovedFile && !!item.id}
                      onChange={(e) => {
                        const updated = [...dynamicMetadata];
                        updated[index].value = e.target.value;
                        setDynamicMetadata(updated);
                      }}
                      className="disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={hasApprovedFile && !!item.id}
                    onClick={() => {
                      const itemToDelete = dynamicMetadata[index];
                      if (itemToDelete.id) {
                        setDeletedMetaDataIds(prev => [...prev, itemToDelete.id]);
                      }
                      setDynamicMetadata(dynamicMetadata.filter((_, i) => i !== index));
                    }}
                    className={`btn-del ${hasApprovedFile && !!item.id ? "bg-gray-400 cursor-not-allowed" : ""}`}>
                    <TrashIcon />
                  </button>
                </div>
              ))}
            </div>

            <button 
              type="button" 
              onClick={() => setDynamicMetadata([...dynamicMetadata, { id: "", key: "", value: "" }])}
              className="btn-add"
            >
              <FiPlus /> <AutoTranslate>Add Metadata</AutoTranslate>
            </button>
          </div>

          {/* ========== FILE METADATA ========== */}
          <div className="cardLight">
            <h2 className="flex align-center gap-2">
              📄 <AutoTranslate>File Metadata</AutoTranslate> <span className="text-red-500">*</span>
              {uploadedFilePath.length > 0 && (
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                  {uploadedFilePath.length} <AutoTranslate>files added</AutoTranslate>
                </span>
              )}
            </h2>
            
            <div className="grid grid-col-4">
              <div className="form-group">
                <label>
                  <AutoTranslate>Year</AutoTranslate>
                  {isDocumentSaved && (
                    <span className="text-xs text-green-600 ml-1">(can change)</span>
                  )}
                </label>
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
                  disabled={false}
                  className="border-2 border-blue-200 focus:border-blue-500"
                >
                  <option value=""><AutoTranslate>Select Year</AutoTranslate></option>
                  {yearOptions.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  <AutoTranslate>Select a year for this file</AutoTranslate>
                </p>
              </div>

              <div className="form-group col-span-2">
                <VersionInput
                  editingDoc={editingDoc}
                  selectedYear={formData.year}
                  version={formData.version}
                  setVersion={(newVersion) => setFormData({ ...formData, version: newVersion })}
                  disabled={false}
                  uploadedFiles={uploadedFilePath}
                  showChangeType={true}
                />
              </div>

              {unsportFile === true && (
                <div className="form-group selfEnd">
                  <button onClick={viewfiletype} className="btn-primary w-full">
                    <AutoTranslate>Show Supported File Types</AutoTranslate>
                  </button>
                </div>
              )}

              <div className="form-group">
                <label className="block text-md font-medium text-gray-700">
                  <AutoTranslate>Folder Upload Enable</AutoTranslate>
                </label>
                <div className="checkBox mt-2">
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
              </div>
            </div>

            <div className="col-span-full mt-4">
              <div
                {...getRootProps()}
                className={`upload-box border-2 border-dashed rounded-lg p-6 cursor-pointer transition
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
                
                {uploadedFilePath.length > 0 && (
                  <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-700">
                      <span className="font-medium"><AutoTranslate>Files added with years:</AutoTranslate></span>
                      {[...new Set(uploadedFilePath.map(f => getSafeYear(f)))].join(', ')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="col-span-full mt-6">
              <div className="flex flex-wrap items-end gap-4">
                <button
                  type="button"
                  onClick={() => setIsWaitingRoomModalOpen(true)}
                  disabled={!isMetadataComplete || selectedFiles.length > 0}
                  className={`px-6 h-14 rounded-xl transition-all ${
                    (!isMetadataComplete || selectedFiles.length > 0)
                      ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                      : "bg-blue-500 text-white"
                  }`}
                >
                  <AutoTranslate>Choose From Waiting Room</AutoTranslate>
                </button>

                <div className="flex flex-col">
                  <label htmlFor="scaleSelect" className="text-sm font-medium mb-1">
                    Scaling
                  </label>
                  <select
                    id="scaleSelect"
                    value={scaleValue}
                    onChange={handleChangeScale}
                    className="h-14 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="1">Scale Up</option>
                    <option value="0">Scale Down</option>
                    <option value="2">None</option>
                  </select>
                </div>

                <button
                  onClick={handleUploadDocument}
                  disabled={isUploading || selectedFiles.length === 0 || !formData.version}
                  className={`flex-1 min-w-[200px] text-white rounded-xl h-14 flex items-center justify-center relative transition-all duration-300 ${
                    isUploading ? "bg-blue-600 cursor-not-allowed" : "bg-blue-900"
                  }`}
                >
                  {isUploading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 mr-2 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      <AutoTranslate>Uploading... {uploadProgress}%</AutoTranslate>
                    </>
                  ) : (
                    <AutoTranslate>Add File</AutoTranslate>
                  )}
                  {isUploading && (
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-300">
                      <div className="h-full bg-green-500 transition-all" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  )}
                </button>

                {isUploading && (
                  <button
                    onClick={handleCancelUpload}
                    className="bg-red-500 text-white h-14 px-6 rounded-xl"
                  >
                    <AutoTranslate>Cancel Add Files</AutoTranslate>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ========== UPLOADED FILES DISPLAY - GROUPED BY YEAR ========== */}
          {Array.isArray(uploadedFilePath) && uploadedFilePath.length > 0 && (
            <div className="mt-6 cardLight">
              <h3 className="flex items-center gap-2 mb-3">
                📋 <AutoTranslate>Files Added</AutoTranslate>
                <span className="text-sm text-gray-500">({uploadedFilePath.length} files)</span>
                {isDocumentSaved && (
                  <span className="text-xs text-green-600 ml-2">
                    <AutoTranslate>Document already saved, adding new files</AutoTranslate>
                  </span>
                )}
              </h3>
              
              {(() => {
                const validFiles = uploadedFilePath.filter(file => file !== undefined && file !== null);
                
                if (validFiles.length === 0) {
                  return (
                    <div className="text-center py-4 text-gray-500">
                      <AutoTranslate>No valid files to display</AutoTranslate>
                    </div>
                  );
                }
                
                const groupedFiles = validFiles.reduce((acc, file, index) => {
                  if (!file) return acc;
                  const year = getSafeYear(file);
                  if (!acc[year]) acc[year] = [];
                  acc[year].push({ file, index });
                  return acc;
                }, {});
                
                return Object.entries(groupedFiles).map(([year, files]) => (
                  <div key={year} className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      📅 {year} ({files.length} file{files.length > 1 ? 's' : ''})
                    </h4>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left"><AutoTranslate>#</AutoTranslate></th>
                            <th className="px-3 py-2 text-left"><AutoTranslate>File Name</AutoTranslate></th>
                            <th className="px-3 py-2 text-center"><AutoTranslate>Version</AutoTranslate></th>
                            <th className="px-3 py-2 text-center"><AutoTranslate>Status</AutoTranslate></th>
                            <th className="px-3 py-2 text-center"><AutoTranslate>Actions</AutoTranslate></th>
                          </tr>
                        </thead>
                        <tbody>
                          {files.map(({ file, index }) => {
                            const displayName = getSafeDisplayName(file);
                            const version = getSafeVersion(file);
                            const status = getSafeStatus(file);
                            const filePath = getSafePath(file);
                            const isWaitingRoomFile = file?.isWaitingRoomFile || false;
                            
                            return (
                              <tr key={index} className="border-t hover:bg-gray-50">
                                <td className="px-3 py-2">{index + 1}</td>
                                <td className="px-3 py-2">
                                  {displayName}
                                  {isWaitingRoomFile && (
                                    <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                      <AutoTranslate>From Waiting Room</AutoTranslate>
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-center">{version}</td>
                                <td className="px-3 py-2 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                                    ${status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                      status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                      'bg-yellow-100 text-yellow-700'}`}
                                  >
                                    {status}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <button
                                    onClick={() => {
                                      if (isWaitingRoomFile) {
                                        openWaitingRoomFile(file, index);
                                      } else {
                                        openFileBeforeSubmit(filePath, index);
                                      }
                                    }}
                                    className="text-blue-600 hover:text-blue-800 mr-2"
                                    title="View file"
                                  >
                                    <EyeIcon className="h-4 w-4 inline" />
                                  </button>
                                  <button
                                    onClick={() => handleDiscardFile(index)}
                                    className="text-red-600 hover:text-red-800"
                                    title="Remove file"
                                  >
                                    <TrashIcon className="h-4 w-4 inline" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ));
              })()}
              
              <button
                onClick={handleDiscardAll}
                className="mt-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                <AutoTranslate>Remove All Files</AutoTranslate>
              </button>
            </div>
          )}

          {/* ========== SAVE / UPDATE BUTTONS ========== */}
          <div className="edit-doc-wrapper mt-6">
            <div className="flex justify-between items-center">
              {uploadedFilePath.length > 0 && (
                <div className="itemBtn">
                  <button onClick={handleDiscardAll} className="btn-discard">
                    <AutoTranslate>Discard All</AutoTranslate>
                  </button>
                </div>
              )}

              <div className="itemBtns">
                {location.state?.fromWaitingRoom ? (
                  <button
                    type="button"
                    onClick={handleAddDocument}
                    className={`btn-primary ${bProcess ? "bg-gray-400 cursor-not-allowed" : ""}`}
                  >
                    <AutoTranslate>Upload Document</AutoTranslate>
                  </button>
                ) : editingDoc ? (
                  <button
                    onClick={handleSaveEdit}
                    disabled={bProcess}
                    className={`btn-primary ${bProcess ? "bg-gray-400 cursor-not-allowed" : ""}`}
                  >
                    {bProcess ? <AutoTranslate>Updating...</AutoTranslate> : <AutoTranslate>Update Document</AutoTranslate>}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleAddDocument}
                    className={`btn-primary ${bProcess ? "bg-gray-400 cursor-not-allowed" : ""}`}
                  >
                    <AutoTranslate>Upload Document</AutoTranslate>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ========== SEARCH & TABLE ========== */}
        <div className="data-search-wrapper">
          <div className="form-group flex items-center gap-4">
            <label htmlFor="itemsPerPage"><AutoTranslate>Show:</AutoTranslate></label>
            <select
              id="itemsPerPage"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              {[5, 10, 15, 20].map((num) => (
                <option key={num} value={num}>{num}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <input
              type="text"
              placeholder={getFallbackTranslation('Search by title, subject, or file no', currentLanguage)}
              className="searchIcon"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              maxLength={20}
            />
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th className="text-center"><AutoTranslate>SR.</AutoTranslate></th>
                <th><AutoTranslate>File No</AutoTranslate></th>
                <th><AutoTranslate>Title</AutoTranslate></th>
                <th><AutoTranslate>Subject</AutoTranslate></th>
                <th><AutoTranslate>Category</AutoTranslate></th>
                <th><AutoTranslate>No. Of Attached Files</AutoTranslate></th>
                <th><AutoTranslate>Uploaded Date</AutoTranslate></th>
                <th className="text-center"><AutoTranslate>Edit</AutoTranslate></th>
                <th className="text-center"><AutoTranslate>View</AutoTranslate></th>
              </tr>
            </thead>
            <tbody>
              {paginatedDocuments.map((doc, index) => (
                <tr key={doc.id}>
                  <td className="text-center">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                  <td>{doc.fileNo || '--'}</td>
                  <td>{doc.title || '--'}</td>
                  <td>{doc.subject || '--'}</td>
                  <td>{doc.categoryMaster?.name || <AutoTranslate>No Category</AutoTranslate>}</td>
                  <td>{doc?.documentDetails?.length || 0}</td>
                  <td>{formatDate(doc.createdOn)}</td>
                  <td>
                    <div className="btn-center">
                      <button 
                        onClick={() => handleEditDocument(doc)} 
                        disabled={doc.isActive === 0}
                        className={`viewBtn ${doc.isActive === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <PencilIcon />
                      </button>
                    </div>
                  </td>
                  <td>
                    <div className="btn-center">
                      <button onClick={() => openModal(doc)} className="viewBtn">
                        <EyeIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ========== PAGINATION ========== */}
        <div className="paginationWp">
          <div className="items">
            <div className="paginationText">
              <span className="text-sm text-gray-700">
                <AutoTranslate>
                  {`Showing ${totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to ${Math.min(currentPage * itemsPerPage, totalItems)} of ${totalItems} entries.`}
                </AutoTranslate>
              </span>
              <span className="text-sm text-gray-700 mx-2">
                (<AutoTranslate>Pages</AutoTranslate> {totalPages})
              </span>
            </div>
          </div>
          <div className="items">
            <div className="paginationBtn">
              <button
                title={`${currentPage === 1 || totalPages === 0 ? "End" : "Previous"}`}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || totalPages === 0}
                className={`${currentPage === 1 || totalPages === 0 ? "cursor-not-allowed" : ""}`}
              >
                <IoIosArrowBack />
              </button>
              {totalPages > 0 && getPageNumbers().map((page) => (
                <button 
                  key={page} 
                  onClick={() => setCurrentPage(page)} 
                  className={`${currentPage === page ? "active" : ""}`}
                >
                  {page}
                </button>
              ))}
              <button
                title={`${currentPage === totalPages || totalPages === 0 ? "End" : "Next"}`}
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className={`${currentPage === totalPages || totalPages === 0 ? "cursor-not-allowed" : ""}`}
              >
                <IoIosArrowForward />
              </button>
            </div>
          </div>
        </div>

        {/* ========== MODALS ========== */}
        {/* Document Details Modal */}
        {isOpen && selectedDoc && (
          <div className="overlayModal">
            <div className="document-modal">
              <div className="modal-header">
                <div className="modal-title">
                  <div className="bg-indigo-600 text-white rounded-lg p-2">
                    <span className="text-lg font-bold">D</span>
                    <span className="text-lg font-bold">MS</span>
                  </div>
                  <h2><AutoTranslate>Document Details</AutoTranslate></h2>
                </div>
                <div className="headerRight">
                  <button className="printBtn" onClick={() => handlePrintReport(selectedDoc?.id)} title="Print">
                    <PrinterIcon className="h-6 w-6" />
                  </button>
                  <button className="closeBtn" onClick={closeModal} title="Close">
                    <MdOutlineClose />
                  </button>
                </div>
              </div>

              <div className="modal-body">
                <div className="bodyScroller print:overflow-visible print:max-h-none">
                  <div className="top-section">
                    <div className="info-card">
                      <div className="info-grid">
                        {[
                          { label: "Branch", value: selectedDoc?.branchMaster?.name },
                          { label: "Department", value: selectedDoc?.departmentMaster?.name },
                          { label: "File No.", value: selectedDoc?.fileNo },
                          { label: "Title", value: selectedDoc?.title },
                          { label: "Subject", value: selectedDoc?.subject },
                          { label: "Category", value: selectedDoc?.categoryMaster?.name || <AutoTranslate>No Category</AutoTranslate> },
                          { label: "Upload By", value: selectedDoc?.employee?.name },
                        ].map((item, idx) => (
                          <p key={idx} className="text-md text-gray-700">
                            <AutoTranslate>{item.label}</AutoTranslate>: {item.value || "N/A"}
                          </p>
                        ))}
                      </div>
                    </div>

                    <div className="qr-card">
                      <h2 className="mb-4"><AutoTranslate>QR Code:</AutoTranslate></h2>
                      {selectedDoc?.qrPath ? (
                        <>
                          <div className="imgWp">
                            <img src={qrCodeUrl} alt="QR Code" />
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
                  <div className="mt-8">
                    <div className="attachedWp relative">
                      <h2 className="mb-0"><AutoTranslate>Attached Files</AutoTranslate></h2>
                      <div className="form-group">
                        <input
                          type="text"
                          placeholder={getFallbackTranslation('Search files...', currentLanguage)}
                          value={searchFileTerm}
                          onChange={(e) => setSearchFileTerm(e.target.value)}
                          className="searchIcon"
                        />
                      </div>
                    </div>

                    {loadingFiles ? (
                      <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        <span className="ml-3 text-gray-600"><AutoTranslate>Loading files...</AutoTranslate></span>
                      </div>
                    ) : selectedDoc && filteredDocFiles.length > 0 ? (
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="hidden md:grid bg-gray-50 text-gray-600 font-medium text-sm px-6 py-3"
                          style={{ gridTemplateColumns: "minmax(200px, 3fr) minmax(80px, 0.8fr) minmax(80px, 0.8fr) minmax(100px, 0.8fr) minmax(130px, 1.2fr) minmax(110px, 1fr) minmax(150px, 1.2fr) minmax(80px, 0.8fr)" }}
                        >
                          <span className="text-left"><AutoTranslate>File Name</AutoTranslate></span>
                          <span className="text-center"><AutoTranslate>Year</AutoTranslate></span>
                          <span className="text-center"><AutoTranslate>Version</AutoTranslate></span>
                          <span className="text-center"><AutoTranslate>Status</AutoTranslate></span>
                          <span className="text-center"><AutoTranslate>Action By</AutoTranslate></span>
                          <span className="text-center"><AutoTranslate>Action Date</AutoTranslate></span>
                          <span className="text-center"><AutoTranslate>Reason</AutoTranslate></span>
                          <span className="text-center no-print"><AutoTranslate>View</AutoTranslate></span>
                        </div>

                        <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                          {filteredDocFiles.map((file, index) => (
                            <div key={index} className="hover:bg-gray-50 transition-colors duration-150">
                              <div className="hidden md:grid items-center px-6 py-4 text-sm"
                                style={{ gridTemplateColumns: "minmax(200px, 3fr) minmax(80px, 0.8fr) minmax(80px, 0.8fr) minmax(100px, 0.8fr) minmax(130px, 1.2fr) minmax(110px, 1fr) minmax(150px, 1.2fr) minmax(80px, 0.8fr)" }}
                              >
                                <div className="text-left text-gray-800 break-words">
                                  <strong>{index + 1}.</strong> {file.docName || 'Unknown'}
                                </div>
                                <div className="text-center text-gray-700">{file.year || '--'}</div>
                                <div className="text-center text-gray-700">{file.version || '--'}</div>
                                <div className="text-center">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                    ${file.status === "APPROVED" ? "bg-green-100 text-green-800" :
                                      file.status === "REJECTED" ? "bg-red-100 text-red-800" :
                                      "bg-yellow-100 text-yellow-800"}`}
                                  >
                                    {file.status || <AutoTranslate>PENDING</AutoTranslate>}
                                  </span>
                                </div>
                                <div className="text-center text-gray-700 truncate" title={file.approvedBy}>
                                  {file.approvedBy || "--"}
                                </div>
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
                                      ${openingFileIndex === index ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"} text-white`}
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

                              <div className="md:hidden p-4">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="text-left text-gray-800 break-words flex-1">
                                    <strong>{index + 1}.</strong> {file.docName || 'Unknown'}
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
                                    <p className="text-gray-700">{file.year || '--'}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500"><AutoTranslate>Version</AutoTranslate></p>
                                    <p className="text-gray-700">{file.version || '--'}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500"><AutoTranslate>Action By</AutoTranslate></p>
                                    <p className="text-gray-700 truncate" title={file.approvedBy}>{file.approvedBy || "--"}</p>
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
                                      ${openingFileIndex === index ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"} text-white`}
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
                        <p className="text-gray-500"><AutoTranslate>No attached files found</AutoTranslate></p>
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
          </div>
        )}

        {/* File Preview Modal */}
        <FilePreviewModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onDownload={(file, action = "download") => handleDownload(file, action)}
          fileType={contentType}
          fileUrl={blobUrl}
          fileName={selectedDocFile?.docName}
          fileData={selectedDocFile}
        />

        {/* Supported File Types Modal */}
        {viewFileTypeModel && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
            <div className="w-80 sm:w-96 bg-white rounded-xl shadow-xl p-5 border border-gray-200 max-h-[80vh] overflow-y-auto transition-all">
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
              <input
                type="text"
                placeholder={getFallbackTranslation('Search file type...', currentLanguage)}
                value={searchTerm}
                onChange={(e) => setSearchFileTerm(e.target.value)}
                maxLength={20}
                className="w-full p-2 mb-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <ul className="space-y-2">
                {filteredFiles.length > 0 ? (
                  filteredFiles.map((file) => (
                    <li key={file.id} className="flex justify-between items-center px-3 py-2 bg-gray-50 rounded-md hover:bg-blue-50 transition text-sm">
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
      </div>
    </div>
  );
};

export default DocumentManagement;