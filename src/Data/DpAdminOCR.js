import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  DOCUMENTHEADER_API,
  YEAR_API,
  CATEGORI_API,
  API_OCR_HOST,
  API_HOST
} from "../API/apiConfig";
import { ArrowLeftIcon, ArrowRightIcon} from "@heroicons/react/24/solid";
import LoadingComponent from '../Components/LoadingComponent';

const DpAdminOCR = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [years, setYears] = useState([]);
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
  const [fixedBranchName, setFixedBranchName] = useState("");
  const [fixedDepartmentName, setFixedDepartmentName] = useState("");

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


  const fetchUser = async () => {
    setIsLoading(true);
    try {
      const userId = localStorage.getItem("userId");
      const response = await axios.get(
        `${API_HOST}/employee/findById/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Set fixed branch and department from user data
      const userBranch = response.data.branch;
      const userDepartment = response.data.department;

      if (userBranch && userDepartment) {
        // Fetch documents for this department
        fetchDocuments(userDepartment.id);

        // Update filters with fixed values
        setFilters(prev => ({
          ...prev,
          branch: userBranch.id,
          department: userDepartment.id,
        }));

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

  // Fetch documents when branch is selected
  const fetchDocuments = async (dpId) => {
    if (!dpId) {
      setDocuments([]);
      setFilteredDocuments([]);
      return;
    }

    setIsLoading(true);
    setSearchError("");

    try {
      const response = await axios.get(`${DOCUMENTHEADER_API}/findByDepartmrntId/${dpId}`, {
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
      setSearchError("Failed to load documents. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };



  // Apply filters whenever filters or documents change
  useEffect(() => {
    const applyFilters = () => {
      let filtered = [...documents];

      // Always filter by the fixed department (no need for branch filter)
      filtered = filtered.filter(
        doc => doc.employee?.department?.id === filters.department
      );

      // Apply other filters
      if (filters.year) {
        filtered = filtered.filter(
          doc => doc.yearMaster?.name === filters.year
        );
      }

      if (filters.approvalStatus) {
        filtered = filtered.filter(
          doc => doc.approvalStatus === filters.approvalStatus
        );
      }

      if (filters.category) {
        filtered = filtered.filter(
          doc => doc.categoryMaster?.name === filters.category
        );
      }

      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filtered = filtered.filter(
          doc =>
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

    if (field === "branch") {
      fetchDocuments(value);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();

    if (!query) {
      setSearchError("Please enter a search query");
      return;
    }

    if (filteredDocuments.length === 0) {
      setSearchError("No documents available to search. Please select a branch first.");
      return;
    }

    const docNames = filteredDocuments
      .flatMap((doc) => doc.documentDetails.map((detail) => detail.docName))
      .filter(Boolean);

    if (docNames.length === 0) {
      setSearchError("No valid document names found for searching");
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
        setSearchError("Search failed. Please try again.");
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
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">Document Text Search (OCR)</h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-700 mb-4">Search Documents</h2>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Branch
              </label>
              <div className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100">
                {fixedBranchName || "Not assigned"}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <div className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100">
                {fixedDepartmentName || "Not assigned"}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                File Year
              </label>
              <select
                value={filters.year}
                onChange={(e) => handleFilterChange("year", e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Years</option>
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
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange("category", e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.name} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.approvalStatus}
                onChange={(e) => handleFilterChange("approvalStatus", e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-md font-medium text-gray-700 mb-3">OCR Text Search</h3>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Query <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter text to search in documents..."
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
                  Search in Documents
                </button>
              </div>
            </div>
            {searchError && (
              <div className="mt-2 text-sm text-red-600">{searchError}</div>
            )}
            {filters.branch && filteredDocuments.length > 0 && (
              <div className="mt-2 text-sm text-gray-500">
                Searching in {filteredDocuments.length} documents
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-700">
            Documents {filteredDocuments.length > 0 && `(${filteredDocuments.length})`}
          </h2>
          <div className="flex items-center">
            <label className="text-sm text-gray-700 mr-2">Show:</label>
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
          <div>
            No documents found
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Upload Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
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
                    Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                    <span className="font-medium">
                      {Math.min(currentPage * itemsPerPage, totalItems)}
                    </span> of <span className="font-medium">{totalItems}</span> results
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
                      <span className="sr-only">Previous</span>
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
                      <span className="sr-only">Next</span>
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

export default DpAdminOCR;