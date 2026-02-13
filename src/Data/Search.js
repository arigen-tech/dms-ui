import React, { useState, useEffect, useMemo } from 'react';
import { API_HOST, SYSTEM_ADMIN, BRANCH_ADMIN, DEPARTMENT_ADMIN, USER } from '../API/apiConfig';
import {
  getRequest,
  postRequest,
  getImageRequest
} from "../API/apiService"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  DocumentIcon,
  ArrowDownTrayIcon,
  QrCodeIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  XMarkIcon,
  PrinterIcon,
} from "@heroicons/react/24/solid";
import { DOCUMENTHEADER_API } from '../API/apiConfig';
import { YEAR_API, FILETYPE_API } from '../API/apiConfig';
import Popup from '../Components/Popup';
import FilePreviewModal from "../Components/FilePreviewModal";
import LoadingComponent from '../Components/LoadingComponent';
import AutoTranslate from '../i18n/AutoTranslate';
import { useLanguage } from '../i18n/LanguageContext';
import { translateInstant } from '../i18n/autoTranslator';

const tokenKey = 'tokenKey';

const Search = () => {
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

  const [searchCriteria, setSearchCriteria] = useState({
    fileNo: '',
    title: '',
    subject: '',
    version: '',
    category: '',
    branch: '',
    year: '',
    department: '',
  });
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [branchOptions, setBranchOptions] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState({ paths: [] });
  const [userBranch, setUserBranch] = useState(null);
  const [userDepartment, setUserDepartment] = useState(null);
  let [userRole, setUserRole] = useState(null);
  const [noResultsFound, setNoResultsFound] = useState(false);
  const [yearOptions, setYearOptions] = useState([]);
  const [popupMessage, setPopupMessage] = useState(null);
  const [error, setError] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [printTrue, setPrintTrue] = useState(false);
  const [blobUrl, setBlobUrl] = useState("");
  const [contentType, setContentType] = useState("");
  const [selectedDocFile, setSelectedDocFiles] = useState(null);
  const [searchFileTerm, setSearchFileTerm] = useState("");
  const [isOpeningFile, setIsOpeningFile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [openingFileIndex, setOpeningFileIndex] = useState(null);
  const [viewFileTypeModel, setViewFileTypeModel] = useState(false);
  const [filesType, setFilesType] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [openingFiles, setOpeningFiles] = useState(null);
  const [metadataFilters, setMetadataFilters] = useState([
    { key: '', value: '' }
  ]);

  const [isSearching, setIsSearching] = useState(false);

  const [fileNo, setFileNo] = useState("");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [version, setVersion] = useState("");

  const [categoryId, setCategoryId] = useState(null);
  const [yearId, setYearId] = useState(null);
  const userBranchId = userBranch?.id;
  const userDepartmentId = userDepartment?.id;

  const [branchId, setBranchId] = useState(
    userRole === "ADMIN" ? null : userBranchId
  );

  const [departmentId, setDepartmentId] = useState(
    userRole === "ADMIN" || userRole === "BRANCH_ADMIN"
      ? null
      : userDepartmentId
  );

  const normalizeRole = (role) => {
    if (!role) return null;
    return role.replace(" ", "_");
  };

  // Pagination state
  const [itemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);

  const token = localStorage.getItem("tokenKey");

  // Debug log
  useEffect(() => {
    console.log('🔍 Search Component - Language Status:', {
      currentLanguage,
      defaultLanguage,
      isTranslationNeeded: isTranslationNeeded(),
      translationStatus,
      availableLanguagesCount: availableLanguages.length,
      pathname: window.location.pathname
    });
  }, [currentLanguage, defaultLanguage, translationStatus, isTranslationNeeded, availableLanguages]);

  useEffect(() => {
    fetchUserDetails();
    fetchCategories();
    fetchBranches();
    fetchYears();
  }, []);

  useEffect(() => {
    if (userBranch?.id) {
      setSearchCriteria((prevCriteria) => ({
        ...prevCriteria,
        branch: userBranch.id,
      }));
      fetchDepartments(userBranch.id);
    }
  }, [userBranch]);

  useEffect(() => {
    if (branchId) {
      fetchDepartments(branchId);
    } else {
      setDepartmentOptions([]);
      setDepartmentId(null);
    }
  }, [branchId]);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSearch();
      }
    };

    // Add event listener to the document
    document.addEventListener('keydown', handleGlobalKeyDown);

    // Cleanup function
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [searchCriteria]);

  console.log("Error: ", error);

  const fetchUserDetails = async () => {
    setIsLoading(true);
    try {
      const userId = localStorage.getItem("userId");
      const res = await getRequest(`${API_HOST}/employee/findById/${userId}`);

      const role = normalizeRole(res.data.role?.role);
      setUserRole(role);

      console.log("role", role)

      setUserBranch(res.data.branch);
      setUserDepartment(res.data.department);

      // 🔐 Lock values based on role
      if (role === "BRANCH_ADMIN") {
        setBranchId(res.data.branch?.id || null);
        setDepartmentId(null);
        fetchDepartments(res.data.branch?.id);
      }

      if (role === "DEPARTMENT_ADMIN" || role === USER) {
        setBranchId(res.data.branch?.id || null);
        setDepartmentId(res.data.department?.id || null);
        fetchDepartments(res.data.branch?.id);
      }
    } catch (err) {
      console.error("User fetch error", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const response = await getRequest(`${API_HOST}/CategoryMaster/findAll`);
      setCategoryOptions(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchYears = async () => {
    setIsLoading(true);
    try {
      const response = await getRequest(`${YEAR_API}/findAll`);
      setYearOptions(response.data); // Set fetched years
    } catch (error) {
      console.error('Error fetching years:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBranches = async () => {
    setIsLoading(true);
    try {
      const response = await getRequest(`${API_HOST}/branchmaster/findAll`);
      setBranchOptions(response.data);
    } catch (error) {
      console.error('Error fetching branches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDepartments = async (branchId) => {
    setIsLoading(true);
    try {
      const response = await getRequest(`${API_HOST}/DepartmentMaster/findByBranch/${branchId}`);
      setDepartmentOptions(response.data);
    } catch (error) {
      console.error("Error fetching departments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPaths = async (doc) => {
    try {
      if (!token) {
        throw new Error("No authentication token found.");
      }

      if (!doc || !doc.id) {
        console.error("Invalid document object");
        return;
      }

      console.log(`Attempting to fetch paths for document ID: ${doc.id}`);
      const response = await getRequest(`${DOCUMENTHEADER_API}/byDocumentHeader/${doc.id}/ALL`);

      setSelectedDoc((prevDoc) => ({
        ...prevDoc,
        paths: response.data || [],
      }));
    } catch (error) {
      console.error("Error fetching documents:", error);
      showPopup(`Failed to fetch document paths: ${error.message}`);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSearchCriteria(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'branch' && { department: '' }),
    }));

    setCurrentPage(1);
  };

  const addMetadataFilter = () => {
    setMetadataFilters(prev => [...prev, { key: '', value: '' }]);
  };

  const removeMetadataFilter = (index) => {
    setMetadataFilters(prev => prev.filter((_, i) => i !== index));
  };

  const updateMetadataFilter = (index, field, value) => {
    setMetadataFilters(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const handleSearch = async () => {
    if (isSearching) return;

    try {
      setIsSearching(true);
      setSearchResults([]);
      setNoResultsFound(false);

      const hasIncompleteMetadata = metadataFilters.some(
        m => (m.key && !m.value) || (!m.key && m.value)
      );

      if (hasIncompleteMetadata) {
        showPopup('Please provide both key and value for metadata filters.');
        setIsSearching(false);
        return;
      }

      const metadataPayload = metadataFilters
        .filter(m => m.key && m.value)
        .map(m => ({
          key: m.key.trim(),
          value: m.value.trim(),
        }));

      const isCriteriaEmpty =
        !fileNo &&
        !title &&
        !subject &&
        !version &&
        !categoryId &&
        !branchId &&
        !departmentId &&
        !yearId &&
        metadataPayload.length === 0;

      if (isCriteriaEmpty) {
        showPopup('Please provide at least one search criterion.');
        setIsSearching(false);
        return;
      }

      const searchPayload = {
        fileNo,
        title,
        subject,
        version,
        categoryId,
        branchId,
        departmentId,
        yearId,
        metadata: metadataPayload.length ? metadataPayload : null,
        page: currentPage - 1,
        size: itemsPerPage,
      };

      const response = await postRequest(
        `${API_HOST}/api/documents/search`,
        searchPayload
      );

      setSearchResults(response.data);
      setNoResultsFound(response.data.length === 0);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error searching documents:', error);
      showPopup('Failed to search documents. Please try again.');
    } finally {
      setIsSearching(false); // ✅ always stop loading
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    };
    return date.toLocaleString("en-GB", options).replace(",", "");
  };

  const openModal = (doc) => {
    setSelectedDoc(doc);
    fetchPaths(doc);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setSelectedDoc({ paths: [] });
  };

  const printPage = () => {
    setPrintTrue(true);
    window.print();
    setTimeout(() => {
      setPrintTrue(false);
    }, 1000);
  };

  const openFile = async (file) => {
    try {
      setOpeningFiles(true);

      const encodedPath = file.path
        .split("/")
        .map(encodeURIComponent)
        .join("/");

      const fileUrl = `${API_HOST}/api/documents/download/${encodedPath}?action=view`;

      const response = await getImageRequest(fileUrl, {}, "blob");

      const blob = new Blob([response], { type: response.headers?.["content-type"] || "application/octet-stream" });
      const url = URL.createObjectURL(blob);

      setBlobUrl(url);
      setContentType(response.headers?.["content-type"] || "");
      setSearchFileTerm("");
      setIsModalOpen(true);
    } catch (error) {
      let errorMessage = "Failed to fetch or preview the file.";

      if (error.response) {
        const data = error.response.data;

        // If it's a Blob (common with responseType: 'blob'), read it as text
        if (data instanceof Blob) {
          try {
            const text = await data.text();           // read blob as text
            const json = JSON.parse(text);            // parse JSON
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
      console.error("Error fetching file:", errorMessage);
    } finally {
      setOpeningFiles(false);
    }
  };

  const handleDownload = async (file, action = "download") => {
    if (!selectedDoc) return;

    try {
      const branch = selectedDoc.employee?.branch?.name?.replace(/ /g, "_");
      const department = selectedDoc.employee?.department?.name?.replace(/ /g, "_");
      const year = file.year?.replace(/ /g, "_") || "unknown";
      const category = selectedDoc.categoryMaster?.name?.replace(/ /g, "_") || "unknown";
      const version = file.version;
      const fileName = file.docName?.replace(/ /g, "_");

      const fileUrl = `${API_HOST}/api/documents/download/${encodeURIComponent(branch)}/${encodeURIComponent(department)}/${encodeURIComponent(year)}/${encodeURIComponent(category)}/${encodeURIComponent(version)}/${encodeURIComponent(fileName)}?action=${action}`;

      const response = await getImageRequest(fileUrl, {}, "blob");

      // Create a blob from the response
      const blob = new Blob([response], { type: response.headers?.["content-type"] || "application/octet-stream" });
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);

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
      let msg = "Something went wrong";

      if (error.response) {
        const data = error.response.data;

        // If server returned a blob (like JSON error), read it as text
        if (data instanceof Blob) {
          try {
            const text = await data.text();       // read blob as text
            const json = JSON.parse(text);        // parse JSON
            msg = json.message || `Error: ${error.response.status}`;
          } catch (e) {
            // fallback if parsing fails
            msg = `Error: ${error.response.status}`;
          }
        } else if (typeof data === "object") {
          msg = data.message || `Error: ${error.response.status}`;
        } else {
          msg = `Error: ${error.response.status}`;
        }
      } else if (error.request) {
        msg = "No response from server";
      } else {
        msg = error.message;
      }

      showPopup(msg, "error");
    }
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
    if (selectedDoc && selectedDoc.id) {
      fetchQRCode(selectedDoc.id);
    }
  }, [selectedDoc]);

  const fetchQRCode = async (documentId) => {
    try {
      if (!token) {
        throw new Error("Authentication token is missing");
      }

      // API URL to fetch the QR code
      const apiUrl = `${DOCUMENTHEADER_API}/documents/download/qr/${selectedDoc.id}`;

      const qrCodeBlob = await getImageRequest(apiUrl, {}, "blob");

      console.log("Fetched QR code Blob:", qrCodeBlob);

      if (!qrCodeBlob.type.includes("image/png")) {
        throw new Error("Received data is not a valid image");
      }

      const qrCodeUrl = window.URL.createObjectURL(qrCodeBlob);

      setQrCodeUrl(qrCodeUrl);
    } catch (error) {
      setError("Error displaying QR Code: " + error.message);
    }
  };

  const downloadQRCode = async () => {
    if (!selectedDoc.id) {
      alert("Please enter a document ID");
      return;
    }

    try {
      if (!token) {
        throw new Error("Authentication token is missing");
      }

      // API URL to download the QR code
      const apiUrl = `${DOCUMENTHEADER_API}/documents/download/qr/${selectedDoc.id}`;

      // Fetch the QR code as a Blob (binary data)
      const qrCodeBlob = await getImageRequest(apiUrl, {}, "blob");
      const qrCodeUrl = window.URL.createObjectURL(qrCodeBlob);

      // Create an anchor link to trigger the download
      const link = document.createElement("a");
      link.href = qrCodeUrl;
      link.download = `QR_Code_${selectedDoc.id}.png`;
      link.click();

      // Clean up URL object
      window.URL.revokeObjectURL(qrCodeUrl);
    } catch (error) {
      setError("Error downloading QR Code: " + error.message);
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

  // Add a computed property to get paginated results
  const getPaginatedResults = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return searchResults.slice(startIndex, endIndex);
  };

  // Calculate total pages based on all search results
  const calculateTotalPages = () => {
    return Math.ceil(searchResults.length / itemsPerPage);
  };

  if (isLoading) {
    return <LoadingComponent />;
  }

  const handlePrintReport = async (id) => {
    if (!id) return;

    try {
      const response = await getImageRequest(`http://localhost:8443/api/reports/document/${id}`, {}, "blob");

      const blob = new Blob([response], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      // Create a temporary <a> element to download the PDF
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `document_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading PDF:", error);
    }
  };

  const fetchFilesType = async () => {
    try {
      const response = await getRequest(`${FILETYPE_API}/getAllActive`);
      setFilesType(response?.data?.response ?? []);
    } catch (error) {
      console.error('Error fetching Files Types:', error);
      setFilesType([]);
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

  const filteredFiles = (filesType ?? []).filter((file) =>
    file.filetype?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.extension?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPageNumbers = () => {
    const maxPageNumbers = 5;
    const totalPages = calculateTotalPages();
    const startPage = Math.floor((currentPage - 1) / maxPageNumbers) * maxPageNumbers + 1;
    const endPage = Math.min(startPage + maxPageNumbers - 1, totalPages);
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  };

  const renderSearchFields = () => {
    const isAdmin = userRole === "ADMIN";
    const isBranchAdmin = userRole === "BRANCH_ADMIN";
    const isDeptUser = userRole === "DEPARTMENT_ADMIN" || userRole === USER;

    const fieldWrapper = "flex flex-col gap-1";

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

        {/* File No */}
        <div className={fieldWrapper}>
          <label className="text-sm font-medium"><AutoTranslate>File No</AutoTranslate></label>
          <input
            placeholder="Enter File No"
            value={fileNo}
            onChange={(e) => setFileNo(e.target.value)}
            className="p-2 border rounded-md"
          />
        </div>

        {/* Title */}
        <div className={fieldWrapper}>
          <label className="text-sm font-medium"><AutoTranslate>Title</AutoTranslate></label>
          <input
            placeholder="Enter Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="p-2 border rounded-md"
          />
        </div>

        {/* Subject */}
        <div className={fieldWrapper}>
          <label className="text-sm font-medium"><AutoTranslate>Subject</AutoTranslate></label>
          <input
            placeholder="Enter Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="p-2 border rounded-md"
          />
        </div>

        {/* Version */}
        <div className={fieldWrapper}>
          <label className="text-sm font-medium"><AutoTranslate>Version</AutoTranslate></label>
          <input
            placeholder="Enter Version"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            className="p-2 border rounded-md"
          />
        </div>

        {/* Category */}
        <div className={fieldWrapper}>
          <label className="text-sm font-medium"><AutoTranslate>Category</AutoTranslate></label>
          <select
            value={categoryId ?? ""}
            onChange={(e) =>
              setCategoryId(e.target.value ? Number(e.target.value) : null)
            }
            className="p-2 border rounded-md"
          >
            <option value="">All Categories</option>
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Branch */}
        <div className={fieldWrapper}>
          <label className="text-sm font-medium"><AutoTranslate>Branch</AutoTranslate></label>
          <select
            value={branchId ?? ""}
            disabled={!isAdmin}
            onChange={(e) => {
              const value = e.target.value ? Number(e.target.value) : null;
              setBranchId(value);
              setDepartmentId(null);
            }}
            className={`p-2 border rounded-md ${
              !isAdmin ? "bg-gray-100 cursor-not-allowed" : ""
            }`}
          >
            <option value="">All Branches</option>
            {branchOptions.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        {/* Department */}
        <div className={fieldWrapper}>
          <label className="text-sm font-medium"><AutoTranslate>Department</AutoTranslate></label>
          <select
            value={departmentId ?? ""}
            disabled={isDeptUser || !branchId}
            onChange={(e) =>
              setDepartmentId(e.target.value ? Number(e.target.value) : null)
            }
            className={`p-2 border rounded-md ${
              isDeptUser || !branchId ? "bg-gray-100 cursor-not-allowed" : ""
            }`}
          >
            <option value="">All Departments</option>
            {departmentOptions.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {/* Year */}
        {/* <div className={fieldWrapper}>
          <label className="text-sm font-medium"><AutoTranslate>Year</AutoTranslate></label>
          <select
            value={yearId ?? ""}
            onChange={(e) =>
              setYearId(e.target.value ? Number(e.target.value) : null)
            }
            className="p-2 border rounded-md"
          >
            <option value="">All Years</option>
            {yearOptions.map((y) => (
              <option key={y.id} value={y.id}>{y.name}</option>
            ))}
          </select>
        </div> */}

      </div>
    );
  };

  return (
    <div className="p-1">
      <h1 className="text-xl mb-4 font-semibold">
        <AutoTranslate>Search Documents</AutoTranslate>
      </h1>
      <div className="bg-white p-4 rounded-lg shadow-sm mb-4">

        {popupMessage && (
          <Popup
            message={popupMessage.message}
            type={popupMessage.type}
            onClose={popupMessage.onClose}
          />
        )}

        {renderSearchFields()}

        <div className="mt-4 bg-slate-50 p-3 rounded-lg border mb-3">
          <h3 className="text-md font-semibold mb-2">
            <AutoTranslate>Metadata Filters</AutoTranslate>
          </h3>

          {/* Header row */}
          <div className="grid grid-cols-5 gap-2 mb-2 text-sm font-medium text-slate-600">
            <div className="col-span-2">
              <AutoTranslate>Key</AutoTranslate>
            </div>
            <div className="col-span-2">
              <AutoTranslate>Value</AutoTranslate>
            </div>
            <div />
          </div>

          {metadataFilters.map((meta, index) => (
            <div key={index} className="grid grid-cols-5 gap-2 mb-2 items-center">
              <input
                type="text"
                value={meta.key}
                onChange={(e) =>
                  updateMetadataFilter(index, "key", e.target.value)
                }
                className="col-span-2 p-2 border rounded-md"
              />

              <input
                type="text"
                value={meta.value}
                onChange={(e) =>
                  updateMetadataFilter(index, "value", e.target.value)
                }
                className="col-span-2 p-2 border rounded-md"
              />

              <button
                onClick={() => removeMetadataFilter(index)}
                className="text-red-600 font-bold"
              >
                ✕
              </button>
            </div>
          ))}

          <button
            onClick={addMetadataFilter}
            className="mt-4 px-3 py-1 bg-blue-600 text-white rounded-md text-sm"
          >
            + <AutoTranslate>Add Metadata</AutoTranslate>
          </button>
        </div>

        <button
          onClick={handleSearch}
          disabled={isSearching}
          className={`rounded-md py-2 px-4 transition duration-300 text-white
    ${isSearching
              ? 'bg-blue-400 cursor-not-allowed'
              : 'bg-blue-900 hover:bg-blue-800'
            }`}
        >
          <AutoTranslate>
            {isSearching ? 'Searching...' : 'Search'}
          </AutoTranslate>
        </button>

        {/* Search Results Table */}
        {isSearching ? (
          <div className="mt-6 flex justify-center items-center text-blue-900">
            <svg
              className="animate-spin h-6 w-6 mr-2 text-blue-900"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8z"
              />
            </svg>
            <AutoTranslate>Loading search results...</AutoTranslate>
          </div>
        ) : noResultsFound ? (
          // ❌ No results
          <div className="mt-4 text-red-600">
            <h3>
              <AutoTranslate>No results found for your search.</AutoTranslate>
            </h3>
          </div>
        ) : searchResults.length > 0 ? (
          // ✅ Results table
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-3">
              <AutoTranslate>Search Results</AutoTranslate>
            </h3>

            <table className="min-w-full table-auto bg-white shadow-md rounded-lg">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border p-2 text-left"><AutoTranslate>SN</AutoTranslate></th>
                  <th className="border p-2 text-left"><AutoTranslate>File No</AutoTranslate></th>
                  <th className="border p-2 text-left"><AutoTranslate>Title</AutoTranslate></th>
                  <th className="border p-2 text-left"><AutoTranslate>Subject</AutoTranslate></th>
                  <th className="border p-2 text-left"><AutoTranslate>Category</AutoTranslate></th>
                  <th className="border p-2 text-left"><AutoTranslate>Branch</AutoTranslate></th>
                  <th className="border p-2 text-left"><AutoTranslate>Department</AutoTranslate></th>
                  <th className="border p-2 text-left"><AutoTranslate>No. Of Attached Files</AutoTranslate></th>
                  <th className="border p-2 text-left"><AutoTranslate>Uploaded Date</AutoTranslate></th>
                  <th className="border p-2 text-left"><AutoTranslate>View</AutoTranslate></th>
                </tr>
              </thead>
              <tbody>
                {getPaginatedResults().map((document, index) => (
                  <tr key={document.id}>
                    <td className="border p-2">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="border p-2">{document.fileNo}</td>
                    <td className="border p-2">{document.title}</td>
                    <td className="border p-2">{document.subject}</td>
                    <td className="border p-2">
                      {document.categoryMaster?.name || 'No Category'}
                    </td>
                    <td className="border p-2">
                      {document.branchMaster?.name || 'No Branch'}
                    </td>
                    <td className="border p-2">
                      {document.departmentMaster?.name || 'No Department'}
                    </td>
                    <td className="border p-2">{document.documentDetails.length}</td>
                    <td className="border p-2">{formatDate(document.createdOn)}</td>
                    <td className="border p-2">
                      <button onClick={() => openModal(document)}>
                        <EyeIcon className="h-6 w-6 bg-green-400 rounded-xl p-1 text-white" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {/* Updated Pagination Controls */}
        <div className="flex items-center mt-4">
          {/* Pagination Controls */}
          <div className="flex items-center">
            {/* Previous Button */}
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded mr-3 ${currentPage === 1
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-slate-200 hover:bg-slate-300"
                }`}
            >
              <ArrowLeftIcon className="inline h-4 w-4 mr-2 mb-1" />
              <AutoTranslate>Previous</AutoTranslate>
            </button>

            {/* Page Number Buttons */}
            {getPageNumbers().map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 rounded mx-1 ${currentPage === page
                  ? "bg-blue-500 text-white"
                  : "bg-slate-200 hover:bg-blue-100"
                  }`}
              >
                {page}
              </button>
            ))}

            {/* Page Count Info */}
            <span className="text-sm text-gray-700 mx-2">
              <AutoTranslate>of</AutoTranslate> {calculateTotalPages()} <AutoTranslate>pages</AutoTranslate>
            </span>

            {/* Next Button */}
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, calculateTotalPages()))}
              disabled={currentPage === calculateTotalPages()}
              className={`px-3 py-1 rounded ml-3 ${currentPage === calculateTotalPages()
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-slate-200 hover:bg-slate-300"
                }`}
            >
              <AutoTranslate>Next</AutoTranslate>
              <ArrowRightIcon className="inline h-4 w-4 ml-2 mb-1" />
            </button>

            <div className="ml-4">
              <span className="text-sm text-gray-700">
                <AutoTranslate>
                  {`Showing ${(currentPage - 1) * itemsPerPage + 1} to ${Math.min(currentPage * itemsPerPage, searchResults.length)} of ${searchResults.length} entries`}
                </AutoTranslate>
              </span>
            </div>
          </div>
        </div>

        <FilePreviewModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onDownload={(file, action = "download") => handleDownload(file, action)}
          fileType={contentType}
          fileUrl={blobUrl}
          fileName={selectedDocFile?.docName}
          fileData={selectedDocFile}
        />

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
                          { label: "Category", value: selectedDoc?.categoryMaster?.name || "No Category" },
                          // { label: "Status", value: selectedDoc?.approvalStatus },
                          { label: "Upload By", value: selectedDoc?.employee?.name },
                        ].map((item, idx) => (
                          <div key={idx} className="space-y-1">
                            <p className="text-sm font-medium text-gray-500">
                              <AutoTranslate>{item.label}</AutoTranslate>
                            </p>
                            <p className="text-gray-900 font-medium">
                              {item.value || <span className="text-gray-400">N/A</span>}
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
                          placeholder="Search files..."
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
                          <span className="text-left">
                            <AutoTranslate>File Name</AutoTranslate>
                          </span>
                          <span className="text-center">
                            <AutoTranslate>Year</AutoTranslate>
                          </span>
                          <span className="text-center">
                            <AutoTranslate>Version</AutoTranslate>
                          </span>
                          <span className="text-center">
                            <AutoTranslate>Status</AutoTranslate>
                          </span>
                          <span className="text-center">
                            <AutoTranslate>Action By</AutoTranslate>
                          </span>
                          <span className="text-center">
                            <AutoTranslate>Action Date</AutoTranslate>
                          </span>
                          <span className="text-center">
                            <AutoTranslate>Reason</AutoTranslate>
                          </span>
                          <span className="text-center no-print">
                            <AutoTranslate>View</AutoTranslate>
                          </span>
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
                                    {file.status || "PENDING"}
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
      ${openingFileIndex === index ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"} text-white`}
                                  >
                                    {openingFileIndex === index ? (
                                      <>
                                        <ArrowPathIcon className="h-3 w-3 animate-spin" />
                                        <AutoTranslate>
                                          {file.ltoArchived && !file.restored ? "Restoring..." : "Opening..."}
                                        </AutoTranslate>
                                      </>
                                    ) : (
                                      <>
                                        {file.ltoArchived && !file.restored ? (
                                          <ArrowPathIcon className="h-3 w-3" />
                                        ) : (
                                          <EyeIcon className="h-3 w-3" />
                                        )}
                                        <AutoTranslate>
                                          {file.ltoArchived && !file.restored ? "Restore" : "View"}

                                        </AutoTranslate>
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
                                    {file.status || "PENDING"}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                                  <div>
                                    <p className="text-xs text-gray-500">
                                      <AutoTranslate>Year</AutoTranslate>
                                    </p>
                                    <p className="text-gray-700">{file.year}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">
                                      <AutoTranslate>Version</AutoTranslate>
                                    </p>
                                    <p className="text-gray-700">{file.version}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">
                                      <AutoTranslate>Action By</AutoTranslate>
                                    </p>
                                    <p className="text-gray-700">{file.approvedBy || "--"}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">
                                      <AutoTranslate>Action Date</AutoTranslate>
                                    </p>
                                    <p className="text-gray-700">{formatDate(file.approvedOn)}</p>
                                  </div>
                                  <div className="col-span-2">
                                    <p className="text-xs text-gray-500">
                                      <AutoTranslate>Reason</AutoTranslate>
                                    </p>
                                    <p className="text-gray-700 break-words">{file.rejectionReason || "--"}</p>
                                  </div>
                                </div>

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
                                        <AutoTranslate>
                                          {file.ltoArchived && !file.restored ? "Restoring..." : "Opening..."}
                                        </AutoTranslate>
                                      </>
                                    ) : (
                                      <>
                                        {file.ltoArchived && !file.restored ? (
                                          <ArrowPathIcon className="h-3 w-3" />
                                        ) : (
                                          <EyeIcon className="h-3 w-3" />
                                        )}
                                        <AutoTranslate>
                                          {file.ltoArchived && !file.restored ? "Restore" : "View"}

                                        </AutoTranslate>
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
                  placeholder={<AutoTranslate>Search file type...</AutoTranslate>}
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
        </>
      </div>
    </div>
  );
};

export default Search;