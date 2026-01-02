import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  DOCUMENTHEADER_API,
  DEPAETMENT_API,
  BRANCH_API,
  YEAR_API,
  CATEGORI_API,
  API_OCR_HOST,
} from "../API/apiConfig";
import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/24/solid";
import LoadingComponent from '../Components/LoadingComponent';
import AutoTranslate from '../i18n/AutoTranslate';
import { useLanguage } from '../i18n/LanguageContext';
import { getFallbackTranslation } from '../i18n/autoTranslator';

const AdminOCR = () => {
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

  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [years, setYears] = useState([]);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({
    branch: "",
    department: "",
    year: "",
    approvalStatus: "",
    category: "",
    search: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const token = localStorage.getItem("tokenKey");

  // Debug log
  useEffect(() => {
    console.log('🔍 AdminOCR Component - Language Status:', {
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
        const yearsResponse = await axios.get(`${YEAR_API}/findActiveYear`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const filteredYears = yearsResponse.data
          .filter((yearObj) => parseInt(yearObj.name) <= currentYear)
          .sort((a, b) => parseInt(b.name) - parseInt(a.name));
        setYears([...filteredYears]);

        // Fetch branches
        const branchesResponse = await axios.get(`${BRANCH_API}/findActiveRole`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setBranches(branchesResponse.data);

        // Fetch categories
        const categoriesResponse = await axios.get(`${CATEGORI_API}/findActiveCategory`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCategories(categoriesResponse.data);
      } catch (error) {
        console.error("Error fetching dropdown data:", error);
      }
    };

    fetchData();
  }, [token]);

  // Fetch documents when branch is selected
  const fetchDocuments = async (brId) => {
    if (!brId) {
      setDocuments([]);
      setFilteredDocuments([]);
      return;
    }

    setIsLoading(true);
    setSearchError("");

    try {
      const response = await axios.get(`${DOCUMENTHEADER_API}/findByBranchId/${brId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

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

  // Fetch departments when branch changes
  useEffect(() => {
    const fetchDepartments = async () => {
      if (filters.branch) {
        try {
          const response = await axios.get(
            `${DEPAETMENT_API}/findByBranch/${filters.branch}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setDepartments(response.data);
        } catch (error) {
          console.error("Error fetching departments:", error);
          setDepartments([]);
        }
      } else {
        setDepartments([]);
      }
    };

    fetchDepartments();
  }, [filters.branch, token]);

  // Apply filters whenever filters or documents change
  useEffect(() => {
    const applyFilters = () => {
      let filtered = [...documents];

      if (filters.department) {
        filtered = filtered.filter(
          (doc) => doc.employee?.department?.name === filters.department
        );
      }

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
      setCurrentPage(1); // Reset to first page when filters change
    };

    applyFilters();
  }, [filters, documents]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));

    if (field === "branch") {
      fetchDocuments(value);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();

    if (!query) {
      setSearchError(<AutoTranslate>Please enter a search query</AutoTranslate>);
      return;
    }

    if (filteredDocuments.length === 0) {
      setSearchError(<AutoTranslate>No documents available to search. Please select a branch first.</AutoTranslate>);
      return;
    }

    const docNames = filteredDocuments
      .flatMap((doc) => doc.documentDetails.map((detail) => detail.docName))
      .filter(Boolean);

    if (docNames.length === 0) {
      setSearchError(<AutoTranslate>No valid document names found for searching</AutoTranslate>);
      return;
    }

    setIsLoading(true);
    setSearchError("");

    const apiEndpoint = `${API_OCR_HOST}/search/selected`;
    const payload = {
      query: query,
      selected_files: docNames,
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
    <div className="px-4 py-6">
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">
        <AutoTranslate>Document Text Search (OCR)</AutoTranslate>
      </h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-700 mb-4">
          <AutoTranslate>Search Documents</AutoTranslate>
        </h2>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <AutoTranslate>Branch</AutoTranslate> <span className="text-red-500">*</span>
              </label>
              <select
                value={filters.branch}
                onChange={(e) => handleFilterChange("branch", e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value=""><AutoTranslate>Select a branch</AutoTranslate></option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <AutoTranslate>Department</AutoTranslate>
              </label>
              <select
                value={filters.department}
                onChange={(e) => handleFilterChange("department", e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!filters.branch}
              >
                <option value=""><AutoTranslate>All Departments</AutoTranslate></option>
                {departments.map((department) => (
                  <option key={department.name} value={department.name}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <AutoTranslate>File Year</AutoTranslate>
              </label>
              <select
                value={filters.year}
                onChange={(e) => handleFilterChange("year", e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value=""><AutoTranslate>All Years</AutoTranslate></option>
                {years.map((year) => (
                  <option key={year.name} value={year.name}>
                    {year.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <AutoTranslate>Category</AutoTranslate>
              </label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange("category", e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value=""><AutoTranslate>All Categories</AutoTranslate></option>
                {categories.map((category) => (
                  <option key={category.name} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <AutoTranslate>Status</AutoTranslate>
              </label>
              <select
                value={filters.approvalStatus}
                onChange={(e) => handleFilterChange("approvalStatus", e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value=""><AutoTranslate>All Statuses</AutoTranslate></option>
                <option value="PENDING"><AutoTranslate>Pending</AutoTranslate></option>
                <option value="APPROVED"><AutoTranslate>Approved</AutoTranslate></option>
                <option value="REJECTED"><AutoTranslate>Rejected</AutoTranslate></option>
              </select>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-md font-medium text-gray-700 mb-3">
              <AutoTranslate>OCR Text Search</AutoTranslate>
            </h3>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <AutoTranslate>Search Query</AutoTranslate> <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={getFallbackTranslation(
                    'Enter exact text to search in documents',
                    currentLanguage
                  )}

                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={!query || !filters.branch || filteredDocuments.length === 0}
                  className={`px-4 py-2 rounded-md text-white font-medium ${!query || !filters.branch || filteredDocuments.length === 0
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
            {filters.branch && filteredDocuments.length > 0 && (
              <div className="mt-2 text-sm text-gray-500">
                <AutoTranslate>Searching in</AutoTranslate> {filteredDocuments.length} <AutoTranslate>documents</AutoTranslate>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-700">
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
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <AutoTranslate>Title</AutoTranslate>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <AutoTranslate>File No</AutoTranslate>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <AutoTranslate>Subject</AutoTranslate>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <AutoTranslate>Upload Date</AutoTranslate>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <AutoTranslate>Status</AutoTranslate>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedDocuments.map((doc, index) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {doc.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {doc.fileNo}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {doc.subject}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(doc.createdOn)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${doc.approvalStatus === "APPROVED"
                          ? "bg-green-100 text-green-800"
                          : doc.approvalStatus === "PENDING"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                          }`}>
                          {doc.approvalStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    <span className="text-sm text-gray-700">
                      <AutoTranslate>
                        {`Here are items ${totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0
                          } to ${Math.min(currentPage * itemsPerPage, totalItems)} out of ${totalItems}.`}
                      </AutoTranslate>
                    </span>
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${currentPage === 1 ? "text-gray-300 cursor-not-allowed" : "text-gray-500 hover:bg-gray-50"
                        }`}
                    >
                      <span className="sr-only">
                        <AutoTranslate>Previous</AutoTranslate>
                      </span>
                      <ArrowLeftIcon className="h-5 w-5" aria-hidden="true" />
                    </button>

                    {getPageNumbers().map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === page
                          ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                          : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                          }`}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${currentPage === totalPages ? "text-gray-300 cursor-not-allowed" : "text-gray-500 hover:bg-gray-50"
                        }`}
                    >
                      <span className="sr-only">
                        <AutoTranslate>Next</AutoTranslate>
                      </span>
                      <ArrowRightIcon className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminOCR;