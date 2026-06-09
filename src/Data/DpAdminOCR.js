import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { IoIosArrowForward, IoIosArrowBack } from "react-icons/io";
import {
  DOCUMENTHEADER_API,
  YEAR_API,
  CATEGORI_API,
  API_OCR_HOST,
  API_HOST,
  DEPARTMENT_ADMIN
} from "../API/apiConfig";
import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/24/solid";
import LoadingComponent from '../Components/LoadingComponent';
import AutoTranslate from '../i18n/AutoTranslate';
import { useLanguage } from '../i18n/LanguageContext';
import { getFallbackTranslation } from '../i18n/autoTranslator';
import apiClient from "../API/apiClient";


const DpAdminOCR = () => {
  const {
    currentLanguage,
    defaultLanguage,
    translationStatus,
    isTranslationNeeded,
    availableLanguages,
  } = useLanguage();

  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [years, setYears] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({
    year: "",
    approvalStatus: "",
    category: "",
    search: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const token = localStorage.getItem("tokenKey");
  const currentUserRole = localStorage.getItem("role");
  const [fixedBranchName, setFixedBranchName] = useState("");
  const [fixedDepartmentName, setFixedDepartmentName] = useState("");
  const [fixedDepartmentId, setFixedDepartmentId] = useState("");

  // Debug log
  useEffect(() => {
    console.log('🔍 DpAdminOCR Component - Language Status:', {
      currentLanguage,
      defaultLanguage,
      isTranslationNeeded: isTranslationNeeded(),
      translationStatus,
      availableLanguagesCount: availableLanguages.length,
      pathname: window.location.pathname
    });
  }, [currentLanguage, defaultLanguage, translationStatus, isTranslationNeeded, availableLanguages]);

  // Fetch initial data
  useEffect(() => {
    const currentYear = new Date().getFullYear();

    const fetchData = async () => {
      try {
        // Fetch years
        const yearsResponse = await apiClient.get(`${YEAR_API}/findActiveYear`);
        const filteredYears = yearsResponse.data
          .filter((yearObj) => parseInt(yearObj.name) <= currentYear)
          .sort((a, b) => parseInt(b.name) - parseInt(a.name));
        setYears([...filteredYears]);

        // Fetch categories
        const categoriesResponse = await apiClient.get(`${CATEGORI_API}/findActiveCategory`);
        setCategories(categoriesResponse.data);
      } catch (error) {
        console.error("Error fetching dropdown data:", error);
      }
    };

    fetchData();
  }, [token]);

  const fetchUser = async () => {
    setIsLoading(true);
    try {
      const userId = localStorage.getItem("id");
      const response = await apiClient.get(
        `${API_HOST}/employee/findById/${userId}`);

      // Set fixed branch and department from user data
      const userBranch = response.data.branch;
      const userDepartment = response.data.department;

      if (userBranch && userDepartment) {
        // Store department ID for fetching documents
        setFixedDepartmentId(userDepartment.id);

        // Fetch documents for this department
        fetchDocuments(userDepartment.id);

        // Store names for display
        setFixedBranchName(userBranch.name);
        setFixedDepartmentName(userDepartment.name);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  // Fetch documents by department ID
  const fetchDocuments = async (deptId) => {
    if (!deptId) {
      setDocuments([]);
      setFilteredDocuments([]);
      return;
    }

    setIsLoading(true);
    setSearchError("");

    try {
      const response = await apiClient.get(`${DOCUMENTHEADER_API}/findByDepartmrntId/${deptId}`);

      const sortedDocuments = response.data.sort((a, b) => {
        const order = { PENDING: 1, REJECTED: 2, APPROVED: 3 };
        return order[a.approvalStatus] - order[b.approvalStatus];
      });

      setDocuments(sortedDocuments);
      setFilteredDocuments(sortedDocuments);
    } catch (error) {
      console.error("Fetch documents error:", error.message);
      setSearchError(<AutoTranslate>Failed to load documents. Please try again.</AutoTranslate>);
    } finally {
      setIsLoading(false);
    }
  };

  // Apply filters whenever filters or documents change
  useEffect(() => {
    const applyFilters = () => {
      let filtered = [...documents];

      // Apply filters
      if (filters.year) {
        filtered = filtered.filter(
          (doc) => doc.yearMaster?.name === filters.year
        );
      }

      if (filters.approvalStatus) {
        filtered = filtered.filter(
          (doc) => doc.approvalStatus === filters.approvalStatus
        );
      }

      if (filters.category) {
        filtered = filtered.filter(
          (doc) => doc.categoryMaster?.name === filters.category
        );
      }

      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filtered = filtered.filter(
          (doc) =>
            doc.title.toLowerCase().includes(searchTerm) ||
            doc.fileNo.toLowerCase().includes(searchTerm) ||
            doc.subject.toLowerCase().includes(searchTerm)
        );
      }

      setFilteredDocuments(filtered);
      setCurrentPage(1);
    };

    applyFilters();
  }, [filters, documents]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleSearch = (e) => {
    e.preventDefault();

    if (!query) {
      setSearchError(<AutoTranslate>Please enter a search query</AutoTranslate>);
      return;
    }

    if (filteredDocuments.length === 0) {
      setSearchError(<AutoTranslate>No documents available to search.</AutoTranslate>);
      return;
    }

    // Using IDs like AdminOCR - this works
    const docIds = filteredDocuments
      .flatMap((doc) => doc.documentDetails?.map((detail) => detail.id) || [])
      .filter(Boolean);

    if (docIds.length === 0) {
      setSearchError(<AutoTranslate>No valid document IDs found for searching</AutoTranslate>);
      return;
    }

    setIsLoading(true);
    setSearchError("");

    const apiEndpoint = `${API_OCR_HOST}/search/selected`;
    const payload = {
      query: query,
      mysql_original_id: docIds, // Using IDs like AdminOCR
    };

    fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        navigate("/adminOCRResponce", { state: { responseData: data } });
      })
      .catch((error) => {
        console.error("Error:", error);
        setSearchError(<AutoTranslate>Search failed. Please try again.</AutoTranslate>);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Pagination calculations
  const totalItems = filteredDocuments.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getPageNumbers = () => {
    const maxPageNumbers = 5;
    const startPage = Math.max(1, currentPage - Math.floor(maxPageNumbers / 2));
    const endPage = Math.min(startPage + maxPageNumbers - 1, totalPages);
    return Array.from(
      { length: endPage - startPage + 1 },
      (_, i) => startPage + i
    );
  };

  if (isLoading) {
    return <LoadingComponent />;
  }

  return (
    <div className="">
      <div className="title">
        <h1>
          <AutoTranslate>
            {currentUserRole === DEPARTMENT_ADMIN
              ? "Department wise (OCR) Search"
              : "User (OCR) Search"}
          </AutoTranslate>
        </h1>
      </div>

      <div className="card mb-4">
        <h2>
          <AutoTranslate>Search Documents</AutoTranslate>
        </h2>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-col-4 mb-8">
            <div className="form-group">
              <label>
                <AutoTranslate>Branch</AutoTranslate>
              </label>
              <input type="text" value={fixedBranchName || "Not assigned"} disabled />
              {/* <div className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100">
                {fixedBranchName || <AutoTranslate>Not assigned</AutoTranslate>}
              </div> */}
            </div>

            <div className="form-group">
              <label>
                <AutoTranslate>Department</AutoTranslate>
              </label>
              <input type="text" value={fixedBranchName || "Not assigned"} disabled />
              {/* <div className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100">
                {fixedDepartmentName || <AutoTranslate>Not assigned</AutoTranslate>}
              </div> */}
            </div>

            <div className="form-group">
              <label>
                <AutoTranslate>File Year</AutoTranslate>
              </label>
              <select
                value={filters.year}
                onChange={(e) => handleFilterChange("year", e.target.value)} >
                <option value=""><AutoTranslate>All Years</AutoTranslate></option>
                {years.map((year) => (
                  <option key={year.name} value={year.name}>
                    {year.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>
                <AutoTranslate>Category</AutoTranslate>
              </label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange("category", e.target.value)}>
                <option value=""><AutoTranslate>All Categories</AutoTranslate></option>
                {categories.map((category) => (
                  <option key={category.name} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>
                <AutoTranslate>Status</AutoTranslate>
              </label>
              <select
                value={filters.approvalStatus}
                onChange={(e) => handleFilterChange("approvalStatus", e.target.value)}>
                <option value=""><AutoTranslate>All Statuses</AutoTranslate></option>
                <option value="PENDING"><AutoTranslate>Pending</AutoTranslate></option>
                <option value="APPROVED"><AutoTranslate>Approved</AutoTranslate></option>
                <option value="REJECTED"><AutoTranslate>Rejected</AutoTranslate></option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <h2 className="mb-2">
              <AutoTranslate>OCR Text Search</AutoTranslate>
            </h2>
            <div className="grid grid-col-4 itemEnd mb-4">
              <div className="form-group">
                <label>
                  <AutoTranslate>Search Query</AutoTranslate> <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={getFallbackTranslation(
                    'Enter exact text to search in documents',
                    currentLanguage
                  )}
                />
              </div>
              <div className="form-group">
                <button
                  type="submit"
                  disabled={!query || !fixedDepartmentId || filteredDocuments.length === 0}
                  className={`w-full px-4 py-2 rounded-md text-white font-medium ${!query || !fixedDepartmentId || filteredDocuments.length === 0
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                    }`}
                >
                  <AutoTranslate>Search in Documents</AutoTranslate>
                </button>
              </div>
            </div>
            {searchError && (
              <div className="mt-2 text-sm text-red-600">{searchError}</div>
            )}
            {fixedDepartmentId && filteredDocuments.length > 0 && (
              <div className="mt-2 text-sm text-gray-500">
                <AutoTranslate>Searching in</AutoTranslate> {filteredDocuments.length} <AutoTranslate>documents</AutoTranslate>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Documents Table */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="mb-0">
            <AutoTranslate>Documents</AutoTranslate> {filteredDocuments.length > 0 && `(${filteredDocuments.length})`}
          </h2>
          <div className="flex items-center">
            <label className="text-sm text-gray-700 mr-2">
              <AutoTranslate>Show:</AutoTranslate>
            </label>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm"
            >
              {[10, 25, 50, 100].map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredDocuments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <AutoTranslate>No documents found</AutoTranslate>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="">
                <thead>
                  <tr>
                    <th className="text-center">#</th>
                    <th>
                      <AutoTranslate>Title</AutoTranslate>
                    </th>
                    <th>
                      <AutoTranslate>File No</AutoTranslate>
                    </th>
                    <th>
                      <AutoTranslate>Subject</AutoTranslate>
                    </th>
                    <th>
                      <AutoTranslate>Upload Date</AutoTranslate>
                    </th>
                    {/* <th>
                      <AutoTranslate>Status</AutoTranslate>
                    </th> */}
                  </tr>
                </thead>
                <tbody>
                  {paginatedDocuments.map((doc, index) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="text-center">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td>
                        {doc.title}
                      </td>
                      <td>
                        {doc.fileNo}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {doc.subject}
                      </td>
                      <td>
                        {formatDate(doc.createdOn)}
                      </td>
                      {/* <td>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          doc.approvalStatus === "APPROVED"
                            ? "bg-green-100 text-green-800"
                            : doc.approvalStatus === "PENDING"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                        }`}>
                          {doc.approvalStatus}
                        </span>
                      </td> */}
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
                      {`Showing ${totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0
                        } to ${Math.min(currentPage * itemsPerPage, totalItems)} of ${totalItems} entries.`}
                    </AutoTranslate>
                  </span>
                  {/* Page Count Info */}
                  <span className="text-sm text-gray-700 mx-2">
                    (<AutoTranslate>Pages</AutoTranslate> {totalPages})
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
                  <button title={`${currentPage === totalPages ? "End" : "Next"}`}
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className={`${currentPage === totalPages ? "cursor-not-allowed" : ""}`}
                  >
                    <IoIosArrowForward />
                  </button>

                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DpAdminOCR;