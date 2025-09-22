import React, { useState, useEffect, useMemo } from 'react';
import { API_HOST } from '../API/apiConfig';
import apiClient from "../API/apiClient";
import axios from 'axios';
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
import { YEAR_API , FILETYPE_API} from '../API/apiConfig';
import Popup from '../Components/Popup';
import FilePreviewModal from "../Components/FilePreviewModal";
import LoadingComponent from '../Components/LoadingComponent';


const Search = () => {
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


  // Pagination state
  const [itemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);


  const token = localStorage.getItem("tokenKey");

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
    if (searchCriteria.branch) {
      fetchDepartments(searchCriteria.branch);
    } else {
      setDepartmentOptions([]);
    }
  }, [searchCriteria.branch]);


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
      const token = localStorage.getItem("tokenKey");
      const response = await axios.get(
        `${API_HOST}/employee/findById/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setUserRole(response.data.role);
      setUserBranch(response.data.branch);
      setUserDepartment(response.data.department);

      if (response.data.role === 'BRANCH ADMIN' && response.data.branch) {
        setSearchCriteria(prev => ({
          ...prev,
          branch: response.data.branch.id
        }));
        fetchDepartments(response.data.branch.id);
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
    }finally{
    setIsLoading(false);

    }
  };

  const fetchCategories = async () => {
    setIsLoading(true);
    try {

      const token = localStorage.getItem('tokenKey');
      const response = await axios.get(
        `${API_HOST}/CategoryMaster/findAll`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setCategoryOptions(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally{
    setIsLoading(false);
       
    }
  };


  const fetchYears = async () => {
    setIsLoading(true);

    try {
      const token = localStorage.getItem('tokenKey');
      const response = await axios.get(`${YEAR_API}/findAll`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setYearOptions(response.data); // Set fetched years
    } catch (error) {
      console.error('Error fetching years:', error);
    }finally{
    setIsLoading(false);

    }
  };

  const fetchBranches = async () => {
    setIsLoading(true);

    try {
      const token = localStorage.getItem('tokenKey');
      const response = await axios.get(
        `${API_HOST}/branchmaster/findAll`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setBranchOptions(response.data);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }finally{
    setIsLoading(false);

    }
  };

  const fetchDepartments = async (branchId) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('tokenKey');
      const response = await axios.get(
        `${API_HOST}/DepartmentMaster/findByBranch/${branchId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setDepartmentOptions(response.data);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }finally{
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
      const response = await axios.get(
        `${DOCUMENTHEADER_API}/byDocumentHeader/${doc.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
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

  const handleSearch = async () => {
    try {
      const token = localStorage.getItem('tokenKey');

      // Validate that at least one search criterion is provided
      const isCriteriaEmpty = !searchCriteria.fileNo &&
        !searchCriteria.title &&
        !searchCriteria.subject &&
        !searchCriteria.version &&
        !searchCriteria.category &&
        !searchCriteria.branch &&
        !searchCriteria.department &&
        !searchCriteria.year;

      if (isCriteriaEmpty) {
        showPopup('Please provide at least one search criterion.');
        return; // Exit the function without making the API call
      }

      const searchPayload = {
        fileNo: searchCriteria.fileNo || null,
        title: searchCriteria.title || null,
        subject: searchCriteria.subject || null,
        version: searchCriteria.version || null,
        categoryId: searchCriteria.category ? parseInt(searchCriteria.category) : null,
        branchId: searchCriteria.branch ? parseInt(searchCriteria.branch) :
          (userBranch?.id ? parseInt(userBranch.id) : null),
        departmentId: searchCriteria.department ? parseInt(searchCriteria.department) :
          (userDepartment?.id ? parseInt(userDepartment.id) : null),
        yearId: searchCriteria.year || null,
        page: currentPage - 1, // Backend uses 0-indexed pages
        size: itemsPerPage,
      };

      const response = await axios.post(
        `${API_HOST}/api/documents/search`,
        searchPayload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
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
      setIsOpeningFile(true); 
      const branch = selectedDoc.employee.branch.name.replace(/ /g, "_");
      const department = selectedDoc.employee.department.name.replace(/ /g, "_");
      const year = selectedDoc.yearMaster.name.replace(/ /g, "_");
      const category = selectedDoc.categoryMaster.name.replace(/ /g, "_");
      const version = file.version;
      const fileName = file.docName.replace(/ /g, "_");

      const fileUrl = `${API_HOST}/api/documents/download/${encodeURIComponent(
        branch
      )}/${encodeURIComponent(department)}/${encodeURIComponent(
        year
      )}/${encodeURIComponent(category)}/${encodeURIComponent(
        version
      )}/${encodeURIComponent(fileName)}`;

      const response = await apiClient.get(fileUrl, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });

      let blob = new Blob([response.data], { type: response.headers["content-type"] });
      let url = URL.createObjectURL(blob);

      setBlobUrl(url);
      setContentType(response.headers["content-type"]);
      // setIsOpen(false);
      setSearchFileTerm("");
      setIsModalOpen(true);
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to fetch or preview the file.");
    }finally{
      setIsOpeningFile(false); 
    }
  };


  const handleDownload = async (file) => {
    const branch = selectedDoc.employee.branch.name.replace(/ /g, "_");
    const department = selectedDoc.employee.department.name.replace(/ /g, "_");
    const year = selectedDoc.yearMaster.name.replace(/ /g, "_");
    const category = selectedDoc.categoryMaster.name.replace(/ /g, "_");
    const version = file.version;
    const fileName = file.docName.replace(/ /g, "_");

    const fileUrl = `${API_HOST}/api/documents/download/${encodeURIComponent(
      branch
    )}/${encodeURIComponent(department)}/${encodeURIComponent(
      year
    )}/${encodeURIComponent(category)}/${encodeURIComponent(
      version
    )}/${encodeURIComponent(fileName)}`;

    const response = await apiClient.get(fileUrl, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: "blob",
    });

    const downloadBlob = new Blob([response.data], {
      type: response.headers["content-type"],
    });

    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(downloadBlob);
    link.download = file.docName; // download actual name with extension
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

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`, // Add the token to the header
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch QR code");
      }

      const qrCodeBlob = await response.blob();

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

      // Fetch the QR code as a Blob (binary data) with the token in the Authorization header
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`, // Add the token to the header
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch QR code");
      }

      const qrCodeBlob = await response.blob();
      const qrCodeUrl = window.URL.createObjectURL(qrCodeBlob);

      // Create an anchor link to trigger the download
      const link = document.createElement("a");
      link.href = qrCodeUrl;
      link.download = `QR_Code_${selectedDoc.id}.png`; // Set a default name for the file
      link.click();

      // Clean up URL object
      window.URL.revokeObjectURL(qrCodeUrl);
    } catch (error) {
      setError("Error downloading QR Code: " + error.message);
    } finally {
      // setLoading(false);
    }
  };

  const showPopup = (message, type = 'info') => {
    setPopupMessage({ message, type });
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
      const response = await apiClient.get(`${FILETYPE_API}/getAllActive`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
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

  userRole = localStorage.getItem('role');
  const renderSearchFields = () => {
    return (
      <div className="grid grid-cols-3 gap-4 mb-4 bg-slate-100 px-1 rounded-lg">
        {userRole === 'ADMIN' ? (
          <>
            {/* Branch Select */}
            <label className="block text-md font-medium text-gray-700">
              Branch
              <select
                name="branch"
                value={searchCriteria.branch}
                onChange={handleInputChange}
                className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Branch</option>
                {branchOptions.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>

            {/* Department Select */}
            <label className="block text-md font-medium text-gray-700">
              Department
              <select
                name="department"
                value={searchCriteria.department}
                onChange={handleInputChange}
                className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!searchCriteria.branch}
              >
                <option value="">Select Department</option>
                {departmentOptions.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : userRole === 'BRANCH ADMIN' ? (
          <>
            {/* Branch Input (Fixed) */}
            <label className="block text-md font-medium text-gray-700">
              Branch
              <select
                name="branch"
                value={searchCriteria.branch}
                onChange={handleInputChange}
                className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                disabled={true}
              >
                <option value={userBranch?.id}>{userBranch?.name}</option>
              </select>
            </label>

            {/* Department Select */}
            <label className="block text-md font-medium text-gray-700">
              Department
              <select
                name="department"
                value={searchCriteria.department}
                onChange={handleInputChange}
                className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Department</option>
                {departmentOptions.length > 0 ? (
                  departmentOptions.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))
                ) : (
                  <option value="">No Departments Available</option>
                )}
              </select>
            </label>
          </>
        ) : (
          <>
            {/* Branch Input (Fixed) */}
            <label className="block text-md font-medium text-gray-700">
              Branch
              <select
                name="branch"
                value={userBranch?.id || ''}
                disabled
                className="mt-1 block w-full p-2 border rounded-md outline-none bg-gray-100 focus:ring-2 focus:ring-blue-500"
              >
                <option value={userBranch?.id}>{userBranch?.name}</option>
              </select>
            </label>

            {/* Department Input (Fixed) */}
            <label className="block text-md font-medium text-gray-700">
              Department
              <select
                name="department"
                value={userDepartment?.id || ''}
                disabled
                className="mt-1 block w-full p-2 border rounded-md outline-none bg-gray-100 focus:ring-2 focus:ring-blue-500"
              >
                <option value={userDepartment?.id}>{userDepartment?.name}</option>
              </select>
            </label>
          </>
        )}

        {/* Category Select */}
        <label className="block text-md font-medium text-gray-700">
          Category
          <select
            name="category"
            value={searchCriteria.category}
            onChange={handleInputChange}
            className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Category</option>
            {categoryOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-md font-medium text-gray-700">
          Year
          <select
            name="year"
            value={searchCriteria.year}
            onChange={handleInputChange}
            className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Year</option>
            {yearOptions.map((yearID) => (
              <option key={yearID.id} value={yearID.id}>
                {yearID.name}
              </option>
            ))}
          </select>
        </label>

        {/* File No. Input */}
        <label className="block text-md font-medium text-gray-700">
          File No.
          <input
            type="text"
            name="fileNo"
            placeholder="File No."
            value={searchCriteria.fileNo}
            onChange={handleInputChange}
            className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>

        {/* Title Input */}
        <label className="block text-md font-medium text-gray-700">
          Title
          <input
            type="text"
            name="title"
            placeholder="Title"
            value={searchCriteria.title}
            onChange={handleInputChange}
            className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>

        {/* Subject Input */}
        <label className="block text-md font-medium text-gray-700">
          Subject
          <input
            type="text"
            name="subject"
            placeholder="Subject"
            value={searchCriteria.subject}
            onChange={handleInputChange}
            className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>

        {/* Version Input */}
        <label className="block text-md font-medium text-gray-700">
          Version
          <input
            type="text"
            name="version"
            placeholder="Version"
            value={searchCriteria.version}
            onChange={handleInputChange}
            className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>

        {/* <select
        name="category"
        value={searchCriteria.category}
        onChange={handleInputChange}
        className="p-2 border rounded-md outline-none"
      >
        <option value="">Select Category</option>
        {categoryOptions.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select> */}
        {/* {userRole === 'ADMIN' ? (
        <>
          <select
            name="branch"
            value={searchCriteria.branch}
            onChange={handleInputChange}
            className="p-2 border rounded-md outline-none"
          >
            <option value="">Select Branch</option>
            {branchOptions.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
          <select
            name="department"
            value={searchCriteria.department}
            onChange={handleInputChange}
            className="p-2 border rounded-md outline-none"
            disabled={!searchCriteria.branch}
          >
            <option value="">Select Department</option>
            {departmentOptions.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </>
      ) : userRole === 'BRANCH ADMIN' ? (
        <>
          <select
            name="branch"
            value={searchCriteria.branch}
            onChange={handleInputChange}
            className="p-2 border rounded-md outline-none"
            disabled={true}  // Branch is fixed, so no need to change
          >
            <option value={userBranch?.id}>{userBranch?.name}</option>
          </select>

        
          <select
            name="department"
            value={searchCriteria.department}
            onChange={handleInputChange}
            className="p-2 border rounded-md outline-none"
          >
            <option value="">Select Department</option>
            {departmentOptions.length > 0 ? (
              departmentOptions.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))
            ) : (
              <option value="">No Departments Available</option>
            )}
          </select>
        </>
      ) : (
        <>
          <select
            name="branch"
            value={userBranch?.id || ''}
            disabled
            className="p-2 border rounded-md outline-none bg-gray-100"
          >
            <option value={userBranch?.id}>{userBranch?.name}</option>
          </select>
          <select
            name="department"
            value={userDepartment?.id || ''}
            disabled
            className="p-2 border rounded-md outline-none bg-gray-100"
          >
            <option value={userDepartment?.id}>{userDepartment?.name}</option>
          </select>
        </>
      )} */}
      </div>
    );
  };

  return (
    <div className="p-1">
      <h1 className="text-xl mb-4 font-semibold">Search Documents</h1>
      <div className="bg-white p-4 rounded-lg shadow-sm mb-4">

        {popupMessage && (
          <Popup
            message={popupMessage.message}
            type={popupMessage.type}
            onClose={() => setPopupMessage(null)}
          />
        )}

        {renderSearchFields()}
        <button
          onClick={handleSearch}
          className="bg-blue-900 text-white rounded-md py-2 px-4 hover:bg-blue-800 transition duration-300"
        >
          Search
        </button>

        {/* Search Results Table */}
        {noResultsFound ? (
          <div className="mt-4 text-red-600">
            <h3>No results found for your search.</h3>
          </div>
        ) : (
          searchResults.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-3">Search Results</h3>
              <table className="min-w-full table-auto bg-white shadow-md rounded-lg">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border p-2 text-left">SR.</th>
                    <th className="border p-2 text-left">File No</th>
                    <th className="border p-2 text-left">Title</th>
                    <th className="border p-2 text-left">Subject</th>
                    {/* <th className="border p-2 text-left">Version</th> */}
                    <th className="border p-2 text-left">Category</th>
                    <th className="border p-2 text-left">Year</th>
                    <th className="border p-2 text-left">Branch</th>
                    <th className="border p-2 text-left">Department</th>
                    <th className="border p-2 text-left">Approval Status</th>
                    <th className="border p-2 text-left">Uploaded Date</th>
                    <th className="border p-2 text-left">View</th>
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
                      {/* <td className="border p-2">{document.version}</td> */}
                      <td className="border p-2">
                        {document.categoryMaster?.name || "No Category"}
                      </td>
                      <td className="border p-2">
                        {document.Year?.name || document.yearMaster?.name || "No Year"}
                      </td>
                      <td className="border p-2">
                        {document.employee && document.employee.branch
                          ? document.employee.branch.name
                          : "No Branch"}
                      </td>
                      <td className="border p-2">
                        {document.employee &&
                          document.employee.department
                          ? document.employee.department.name
                          : "No Department"}
                      </td>
                      <td className="border p-2">{document.approvalStatus}</td>
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
          )
        )}

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
              Previous
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
              of {calculateTotalPages()} pages
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
              Next
              <ArrowRightIcon className="inline h-4 w-4 ml-2 mb-1" />
            </button>

            <div className="ml-4">
              <span className="text-sm text-gray-700">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(currentPage * itemsPerPage, searchResults.length)} of {searchResults.length} entries
              </span>
            </div>
          </div>
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
                          <h1 className="text-2xl font-bold text-gray-800">Document Details</h1>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => handlePrintReport(selectedDoc?.id)}
                            className="flex items-center gap-2 px-4 py-2 text-indigo-600 hover:text-indigo-800 transition-colors duration-200 bg-indigo-50 hover:bg-indigo-100 rounded-lg"
                            title="Print document"
                          >
                            <PrinterIcon className="h-5 w-5" />
                            <span>Print</span>
                          </button>
                          <button
                            onClick={closeModal}
                            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-red-600 transition-colors duration-200 bg-gray-100 hover:bg-gray-200 rounded-lg"
                            title="Close modal"
                          >
                            <XMarkIcon className="h-5 w-5" />
                            <span>Close</span>
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
                              { label: "Status", value: selectedDoc?.approvalStatus },
                              { label: "Upload By", value: selectedDoc?.employee?.name },
                            ].map((item, idx) => (
                              <div key={idx} className="space-y-1">
                                <p className="text-sm font-medium text-gray-500">{item.label}</p>
                                <p className="text-gray-900 font-medium">
                                  {item.value || <span className="text-gray-400">N/A</span>}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* QR Code Column */}
                        <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-xl border border-gray-200">
                          <h3 className="text-lg font-semibold text-gray-700 mb-4">QR Code</h3>
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
                                Download QR
                              </button>
                            </>
                          ) : (
                            <div className="text-center text-gray-500 py-8">
                              <QrCodeIcon className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                              <p>No QR code available</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Attached Files Section */}
                      <div className="border-t border-gray-200 pt-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                          <h2 className="text-xl font-semibold text-gray-800">Attached Files</h2>
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
                            <span className="ml-3 text-gray-600">Loading files...</span>
                          </div>
                        ) : selectedDoc && filteredDocFiles.length > 0 ? (
                          <div className="border border-gray-200 rounded-lg overflow-hidden">
                            {/* Table Header - Hidden on mobile */}
                            <div className="hidden md:grid grid-cols-[35fr_10fr_10fr_10fr_15fr_15fr_20fr_10fr] bg-gray-50 text-gray-600 font-medium text-sm px-6 py-3">
                              <span className="text-left">File Name</span>
                              <span className="text-center">Year</span>
                              <span className="text-center">Version</span>
                              <span className="text-center">Status</span>
                              <span className="text-center">Action By</span>
                              <span className="text-center">Action Date</span>
                              <span className="text-center">Reason</span>
                              <span className="text-center no-print">View</span>
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
                            ${openingFileIndex === index ?
                                            "bg-indigo-400 cursor-not-allowed" :
                                            "bg-indigo-600 hover:bg-indigo-700"} text-white`}
                                      >
                                        {openingFileIndex === index ? (
                                          <>
                                            <ArrowPathIcon className="h-3 w-3 animate-spin" />
                                            Opening...
                                          </>
                                        ) : (
                                          <>
                                            <EyeIcon className="h-3 w-3" />
                                            View
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
                                        <p className="text-xs text-gray-500">Year</p>
                                        <p className="text-gray-700">{file.year}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500">Version</p>
                                        <p className="text-gray-700">{file.version}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500">Action By</p>
                                        <p className="text-gray-700">{file.approvedBy || "--"}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500">Action Date</p>
                                        <p className="text-gray-700">{formatDate(file.approvedOn)}</p>
                                      </div>
                                      <div className="col-span-2">
                                        <p className="text-xs text-gray-500">Reason</p>
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
                                            Opening...
                                          </>
                                        ) : (
                                          <>
                                            <EyeIcon className="h-3 w-3" />
                                            View File
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
                            <p className="text-gray-500">No attached files found</p>
                            {searchFileTerm && (
                              <p className="text-sm text-gray-400 mt-1">Try adjusting your search term</p>
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
                      <h2 className="text-xl font-semibold text-gray-800">Supported File Types</h2>
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
                      placeholder="Search file type..."
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
                        <li className="text-center text-gray-500 text-sm">No matching file types found</li>
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