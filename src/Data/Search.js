import React, { useState, useEffect, useMemo } from 'react';
import { API_HOST, SYSTEM_ADMIN, BRANCH_ADMIN, DEPARTMENT_ADMIN, USER } from '../API/apiConfig';
import apiClient from "../API/apiClient";
import axios from 'axios';
import { FiPlus } from "react-icons/fi";
import { MdRemoveRedEye, MdOutlineClose } from "react-icons/md";
import { IoIosArrowForward, IoIosArrowBack } from "react-icons/io";
import {
  TrashIcon,
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
      const userId = localStorage.getItem("id");
      const token = localStorage.getItem("tokenKey");

      const res = await apiClient.get(`${API_HOST}/employee/findById/${userId}`);

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
      const token = localStorage.getItem('tokenKey');
      const response = await apiClient.get(`${API_HOST}/CategoryMaster/findAll`);
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
      const token = localStorage.getItem('tokenKey');
      const response = await apiClient.get(`${YEAR_API}/findAll`);
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
      const token = localStorage.getItem('tokenKey');
      const response = await apiClient.get(`${API_HOST}/branchmaster/findAll`);
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
      const token = localStorage.getItem('tokenKey');
      const response = await apiClient.get(`${API_HOST}/DepartmentMaster/findByBranch/${branchId}`);
      setDepartmentOptions(response.data);
    } catch (error) {
      console.error("Error fetching departments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPaths = async (doc) => {
    try {
      const token = localStorage.getItem("tokenKey");
      if (!token) {
        throw new Error("No authentication token found.");
      }

      if (!doc || !doc.id) {
        console.error("Invalid document object");
        return;
      }

      console.log(`Attempting to fetch paths for document ID: ${doc.id}`);
      const response = await apiClient.get(
        `${DOCUMENTHEADER_API}/byDocumentHeader/${doc.id}/ALL`,
        {
          headers: {
            'Content-Type': 'application/json'
          },
        }
      );

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

      const token = localStorage.getItem('tokenKey');

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

      const response = await apiClient.post(
        `${API_HOST}/api/documents/search`,
        searchPayload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
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

      const response = await apiClient.get(fileUrl, {
        responseType: "blob",
      });

      // Create a blob from the response
      const blob = new Blob([response.data], { type: response.headers["content-type"] });
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
      const response = await fetch(`http://localhost:8443/api/reports/document/${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/pdf",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to download PDF");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));

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
      const response = await apiClient.get(`${FILETYPE_API}/getAllActive`);
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
  }

  const handlecloseFileType = () => {
    setViewFileTypeModel(false);
    setIsUploading(false);
  }

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

    const fieldWrapper = "form-group";

    return (
      <div className="grid grid-col-4 mb-4">

        {/* File No */}
        <div className={fieldWrapper}>
          <label><AutoTranslate>File No</AutoTranslate></label>
          <input
            placeholder="Enter File No"
            value={fileNo}
            onChange={(e) => setFileNo(e.target.value)}
          />
        </div>

        {/* Title */}
        <div className={fieldWrapper}>
          <label><AutoTranslate>Title</AutoTranslate></label>
          <input
            placeholder="Enter Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* Subject */}
        <div className={fieldWrapper}>
          <label><AutoTranslate>Subject</AutoTranslate></label>
          <input
            placeholder="Enter Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        {/* Version */}
        <div className={fieldWrapper}>
          <label><AutoTranslate>Version</AutoTranslate></label>
          <input
            placeholder="Enter Version"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
          />
        </div>

        {/* Category */}
        <div className={fieldWrapper}>
          <label><AutoTranslate>Category</AutoTranslate></label>
          <select
            value={categoryId ?? ""}
            onChange={(e) =>
              setCategoryId(e.target.value ? Number(e.target.value) : null)
            }
          >
            <option value="">All Categories</option>
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Branch */}
        <div className={fieldWrapper}>
          <label><AutoTranslate>Branch</AutoTranslate></label>
          <select
            value={branchId ?? ""}
            disabled={!isAdmin}
            onChange={(e) => {
              const value = e.target.value ? Number(e.target.value) : null;
              setBranchId(value);
              setDepartmentId(null);
            }}
            className={`p-2 border rounded-md ${!isAdmin ? "bg-gray-100 cursor-not-allowed" : ""
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
          <label><AutoTranslate>Department</AutoTranslate></label>
          <select
            value={departmentId ?? ""}
            disabled={isDeptUser || !branchId}
            onChange={(e) =>
              setDepartmentId(e.target.value ? Number(e.target.value) : null)
            }
            className={`p-2 border rounded-md ${isDeptUser || !branchId ? "bg-gray-100 cursor-not-allowed" : ""
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
        <label><AutoTranslate>Year</AutoTranslate></label>
        <select
          value={yearId ?? ""}
          onChange={(e) =>
            setYearId(e.target.value ? Number(e.target.value) : null)
          }
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
    <div className="p-1-">
      <div className="title">
        <h1><AutoTranslate>Search Documents</AutoTranslate></h1>
      </div>

      {popupMessage && (
        <Popup
          message={popupMessage.message}
          type={popupMessage.type}
          onClose={popupMessage.onClose}
        />
      )}

      <div className="card">
        {renderSearchFields()}

        <div className="metaDataCard">
          <h2>
            <AutoTranslate>Metadata Filters </AutoTranslate>
          </h2>
          <div className='card-wp'>
            {metadataFilters.map((meta, index) => (
              <div key={index} className='card'>
                <div className="form-group">
                  <label htmlFor={`key${index}`}>
                    <AutoTranslate>Key</AutoTranslate>
                  </label>
                  <input
                    type="text"
                    id={`key${index}`}
                    value={meta.key}
                    onChange={(e) =>
                      updateMetadataFilter(index, "key", e.target.value)
                    }
                  />
                </div>

                <div className="form-group">
                  <label htmlFor={`value${index}`}>
                    <AutoTranslate>Value</AutoTranslate>
                  </label>
                  <input
                    type="text"
                    id={`value${index}`}
                    value={meta.value}
                    onChange={(e) =>
                      updateMetadataFilter(index, "value", e.target.value)
                    }
                  />
                </div>

                <button
                  onClick={() => removeMetadataFilter(index)} className="btn-del">
                  <TrashIcon />
                </button>
              </div>
            ))}
          </div>

          <button onClick={addMetadataFilter} className="btn-add">
            <FiPlus /> <AutoTranslate>Add Metadata</AutoTranslate>
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

            <div className="table-wrapper">
              <table className="">
                <thead>
                  <tr>
                    <th className="text-center"><AutoTranslate>SN</AutoTranslate></th>
                    <th><AutoTranslate>File No</AutoTranslate></th>
                    <th><AutoTranslate>Title</AutoTranslate></th>
                    <th><AutoTranslate>Subject</AutoTranslate></th>
                    <th><AutoTranslate>Category</AutoTranslate></th>
                    <th><AutoTranslate>Branch</AutoTranslate></th>
                    <th><AutoTranslate>Department</AutoTranslate></th>
                    <th className="text-center"><AutoTranslate>No. Of Attached Files</AutoTranslate></th>
                    <th><AutoTranslate>Uploaded Date</AutoTranslate></th>
                    <th className="text-center"><AutoTranslate>View</AutoTranslate></th>
                  </tr>
                </thead>
                <tbody>
                  {getPaginatedResults().map((document, index) => (
                    <tr key={document.id}>
                      <td className="text-center">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td>{document.fileNo}</td>
                      <td>{document.title}</td>
                      <td>{document.subject}</td>
                      <td>
                        {document.categoryMaster?.name || 'No Category'}
                      </td>
                      <td>
                        {document.branchMaster?.name || 'No Branch'}
                      </td>
                      <td>
                        {document.departmentMaster?.name || 'No Department'}
                      </td>
                      <td className="text-center">{document.documentDetails.length}</td>
                      <td>{formatDate(document.createdOn)}</td>
                      <td className="text-center">
                        <div className="btn-center">
                          <button className="viewBtn" onClick={() => openModal(document)}>
                            <MdRemoveRedEye />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="paginationWp">
              <div className="items">
                <div className="paginationText">
                  <span className="text-sm text-gray-700">
                    <AutoTranslate>
                      {`Showing ${(currentPage - 1) * itemsPerPage + 1} to ${Math.min(currentPage * itemsPerPage, searchResults.length)} of ${searchResults.length} entries`}
                    </AutoTranslate>
                  </span>
                  {/* Page Count Info */}
                  <span className="text-sm text-gray-700 mx-2">
                    (<AutoTranslate>Pages</AutoTranslate> {calculateTotalPages()})
                  </span>
                </div>
              </div>
              <div className="items">
                <div className="paginationBtn">
                  {/* Previous Button */}
                  <button title={`${currentPage === 1 ? "End" : "Previous"}`}
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className={`${currentPage === 1 ? "cursor-not-allowed" : ""}`}
                  >
                    <IoIosArrowBack />
                  </button>
                  {/* Page Number Buttons */}
                  {getPageNumbers().map((page) => (
                    <button key={page} onClick={() => setCurrentPage(page)} className={`${currentPage === page ? "active" : ""}`}>
                      {page}
                    </button>
                  ))}
                  {/* Next Button */}
                  <button title={`${currentPage === calculateTotalPages() ? "End" : "Next"}`}
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, calculateTotalPages()))}
                    disabled={currentPage === calculateTotalPages()}
                    className={`${currentPage === calculateTotalPages() ? "cursor-not-allowed" : ""}`}
                  >
                    <IoIosArrowForward />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}



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
    <div className="overlayModal">
      <div className="document-modal">

        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <div className="bg-indigo-600 text-white rounded-lg p-2">
              <span className="text-lg font-bold">D</span>
              <span className="text-lg font-bold">MS</span>
            </div>
            <h2><AutoTranslate>Document Details</AutoTranslate></h2>
          </div>

          <div className="headerRight">
            {/* Print Button */}
            <button className="printBtn" onClick={() => handlePrintReport(selectedDoc?.id)} title="Print">
              <PrinterIcon className="h-6 w-6" />
            </button>

            {/* Close Button */}
            <button className="closeBtn" onClick={closeModal} title="Close">
              <MdOutlineClose />
            </button>
          </div>
        </div>

        {/* Modal body Content */}
        <div className="modal-body">
          <div className="bodyScroller print:overflow-visible print:max-h-none">

            {/* Document Details */}
            <div className="top-section">
              {/* Information Column */}
              <div className="info-card">
                <div className="info-grid">
                  {[
                    { label: "Branch", value: selectedDoc?.employee?.branch?.name },
                    { label: "Department", value: selectedDoc?.employee?.department?.name },
                    { label: "File No.", value: selectedDoc?.fileNo },
                    { label: "Title", value: selectedDoc?.title },
                    { label: "Subject", value: selectedDoc?.subject },
                    { label: "Category", value: selectedDoc?.categoryMaster?.name || "No Category" },
                    { label: "Upload By", value: selectedDoc?.employee?.name },
                  ].map((item, idx) => (
                    <p key={idx} className="text-md text-gray-700">
                      <AutoTranslate>{item.label}</AutoTranslate> <AutoTranslate>{item.value || "N/A"}</AutoTranslate>
                    </p>
                  ))}
                </div>
              </div>

              {/* QR Code Column */}
              <div className="qr-card">
                <h2 className="mb-4"><AutoTranslate>QR Code</AutoTranslate></h2>

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
                <h2 className="mb-0">
                  <AutoTranslate>Attached Files</AutoTranslate>
                </h2>
                <div className="form-group">
                  <input
                    type="text"
                    placeholder="Search files..."
                    value={searchFileTerm}
                    onChange={(e) => setSearchFileTerm(e.target.value)}
                    className="searchIcon"
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
                  <div 
                    className="hidden md:grid bg-gray-50 text-gray-600 font-medium text-sm px-6 py-3 border-b border-gray-200"
                    style={{ 
                      gridTemplateColumns: "minmax(200px, 3fr) minmax(80px, 0.8fr) minmax(80px, 0.8fr) minmax(100px, 0.8fr) minmax(130px, 1.2fr) minmax(110px, 1fr) minmax(150px, 1.2fr) minmax(80px, 0.8fr)" 
                    }}
                  >
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
                      <div key={file.id || index} className="hover:bg-gray-50 transition-colors duration-150">
                        {/* Desktop View */}
                        <div 
                          className="hidden md:grid items-center px-6 py-4 text-sm"
                          style={{ 
                            gridTemplateColumns: "minmax(200px, 3fr) minmax(80px, 0.8fr) minmax(80px, 0.8fr) minmax(100px, 0.8fr) minmax(130px, 1.2fr) minmax(110px, 1fr) minmax(150px, 1.2fr) minmax(80px, 0.8fr)" 
                          }}
                        >
                          <div className="text-left text-gray-800 break-words">
                            <strong>{index + 1}.</strong> {file.docName}
                          </div>
                          <div className="text-center text-gray-700">{file.year}</div>
                          <div className="text-center text-gray-700">{file.version}</div>
                          <div className="text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap
                              ${file.status === "APPROVED" ? "bg-green-100 text-green-800" :
                                file.status === "REJECTED" ? "bg-red-100 text-red-800" :
                                "bg-yellow-100 text-yellow-800"}`}
                            >
                              {file.status || "PENDING"}
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
                              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200 whitespace-nowrap
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
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-2 whitespace-nowrap
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
                              <p className="text-gray-700 truncate" title={file.approvedBy}>{file.approvedBy || "--"}</p>
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

                          <div className="flex justify-center mt-3 no-print">
                            <button
                              onClick={() => {
                                setOpeningFileIndex(index);
                                setSelectedDocFiles(file);
                                openFile(file).finally(() => setOpeningFileIndex(null));
                              }}
                              disabled={openingFileIndex !== null}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200 whitespace-nowrap
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