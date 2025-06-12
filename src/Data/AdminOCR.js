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


const AdminOCR = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [years, setYears] = useState([]);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({
    branch: "All",
    department: "All",
    year: "All",
    approvalStatus: "",
    category: "All",
    search: "",
  });
  const token = localStorage.getItem("tokenKey");
  const [isLoading, setIsLoading] = useState(false);

  

  const fetchDocuments = async () => {
    setIsLoading(true);
    
    try {
      const response = await axios.get(`${DOCUMENTHEADER_API}/getAll`, {
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
    }finally{
    setIsLoading(false);

    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDropdownData = (url, setState, allLabel) => {
    axios
      .get(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
        setState([{ name: allLabel }, ...response.data]);
      })
      .catch((error) =>
        console.error(`Error fetching data from ${url}:`, error)
      );
  };

  useEffect(() => {
    fetchDropdownData(`${YEAR_API}/findActiveYear`, setYears, "All Years");
    fetchDropdownData(
      `${BRANCH_API}/findActiveRole`,
      setBranches,
      "All Branch"
    );
    fetchDropdownData(
      `${CATEGORI_API}/findActiveCategory`,
      setCategories,
      "All Category"
    );
  }, []);

  useEffect(() => {
    const applyFilters = () => {
      let filtered = documents;

      if (filters.branch !== "All") {
        filtered = filtered.filter((doc) =>
          doc.employee?.branch?.name
            ?.toLowerCase()
            .includes(filters.branch.toLowerCase())
        );
      }

      if (filters.department !== "All") {
        filtered = filtered.filter((doc) =>
          doc.employee?.department?.name
            ?.toLowerCase()
            .includes(filters.department.toLowerCase())
        );
      }

      if (filters.year !== "All") {
        filtered = filtered.filter((doc) =>
          doc.yearMaster?.name
            ?.toLowerCase()
            .includes(filters.year.toLowerCase())
        );
      }

      if (filters.approvalStatus) {
        filtered = filtered.filter((doc) =>
          doc.approvalStatus
            ?.toLowerCase()
            .includes(filters.approvalStatus.toLowerCase())
        );
      }

      if (filters.category !== "All") {
        filtered = filtered.filter((doc) =>
          doc.categoryMaster?.name
            ?.toLowerCase()
            .includes(filters.category.toLowerCase())
        );
      }

      if (filters.search) {
        filtered = filtered.filter(
          (doc) =>
            doc.title.toLowerCase().includes(filters.search.toLowerCase()) ||
            doc.fileNo.toLowerCase().includes(filters.search.toLowerCase()) ||
            doc.subject.toLowerCase().includes(filters.search.toLowerCase())
        );
      }

      setFilteredDocuments(filtered);
    };

    applyFilters();
  }, [filters, documents]);

  useEffect(() => {
    // Fetch departments based on the selected branch
    if (filters.branch !== "All") {
      const branchId = branches.find(
        (branch) => branch.name === filters.branch
      )?.id;

      if (branchId) {
        fetchDropdownData(
          `${DEPAETMENT_API}/findByBranch/${branchId}`,
          setDepartments,
          "All Department"
        );
      }
    }
  }, [filters.branch, branches]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const docNames = filteredDocuments
    .flatMap((doc) => doc.documentDetails.map((detail) => detail.docName))
    .filter(Boolean);

  console.log("setFilteredDataArray(filtered)", filteredDocuments);
  console.log("docNames", docNames);

  const handleSearch = () => {
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
        console.log("Response from server:", data);

        navigate("/adminOCRResponce", { state: { responseData: data } });
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  };

  if (isLoading) {
    return <LoadingComponent />;
  }

  // for test purpose

  // const handleSearch = () => {
  //   const apiEndpoint = `${API_OCR_HOST}/search/selected`;

  //   const payload = {
  //     query: "a",
  //     selected_files: [
  //       "GOR32M.pdf",
  //       "KKZ2A1.pdf",
  //       "test.pdf",
  //       "arlandaexpress_0000826085.pdf",
  //       "arlandaexpress_0000875553.pdf",
  //       "museodelferrocarril_20190922_007.pdf",
  //       "ozo-5056563.pdf",
  //       "train_20191019_008.pdf",
  //       "train_20191019_018.pdf"
  //     ]
  //   };

  //   fetch(apiEndpoint, {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/json",
  //     },
  //     body: JSON.stringify(payload),
  //   })
  //     .then((response) => {
  //       if (!response.ok) {
  //         throw new Error(`HTTP error! status: ${response.status}`);
  //       }
  //       return response.json();
  //     })
  //     .then((data) => {
  //       console.log("Response from server:", data);
  //       navigate("/adminOCRResponce", { state: { responseData: data } });
  //     })
  //     .catch((error) => {
  //       console.error("Error:", error);
  //     });
  // };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const totalItems = filteredDocuments.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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

  return (
    <div className="px-2">
      <h1 className="text-2xl mb-1 font-semibold">Admin OCR</h1>
      <div className="bg-white p-1 rounded-lg shadow-sm">
        <div className="mb-4 flex flex-wrap gap-4">
          <div className="flex items-center gap-1">
            <label
              htmlFor="searchQuery"
              className="text-md font-medium text-gray-700 w-full"
            >
              Enter Search Query:
            </label>
            <input
              id="searchQuery"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border p-2 rounded-sm w-full"
              placeholder="Enter Query"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={!query} // Disable the button if query is empty
            className={`bg-blue-500 text-white p-2 rounded-lg ${!query ? "cursor-not-allowed opacity-70" : ""
              }`}
          >
            Search
          </button>
        </div>

        <div className="mb-4 bg-slate-100 p-4 rounded-lg flex justify-between items-center">
          <div className="flex items-center bg-blue-500 rounded-lg">
            <label
              htmlFor="itemsPerPage"
              className="mr-2 ml-2 text-white text-sm"
            >
              Show:
            </label>
            <select
              id="itemsPerPage"
              className="border rounded-r-lg p-1.5 outline-none"
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
            >
              {[5, 10, 15, 20].map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mb-4 grid grid-cols-1  sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <label className="block text-md font-medium text-gray-700">
            Branch:
            <select
              value={filters.branch}
              onChange={(e) => handleFilterChange("branch", e.target.value)}
              className="border p-2 w-full"
            >
              {/* <option value="All">All Branches</option> */}
              {branches.map((branch) => (
                <option key={branch.id} value={branch.name}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-md font-medium text-gray-700">
            Department:
            <select
              value={filters.department}
              onChange={(e) => handleFilterChange("department", e.target.value)}
              className="border p-2 w-full"
            >
              <option value="" disabled>
                    Select Department
                  </option>
              {departments.map((department) => (
                <option key={department.name} value={department.name}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-md font-medium text-gray-700">
            File Year:
            <select
              value={filters.year}
              onChange={(e) => handleFilterChange("year", e.target.value)}
              className="border p-2 w-full"
            >
              {years.map((year) => (
                <option key={year.name} value={year.name}>
                  {year.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-md font-medium text-gray-700">
            Category:
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange("category", e.target.value)}
              className="border p-2 w-full"
            >
              {categories.map((category) => (
                <option key={category.name} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-md font-medium text-gray-700">
            Status:
            <select
              className="border p-2 w-full"
              onChange={(e) =>
                handleFilterChange("approvalStatus", e.target.value)
              }
            >
              <option value="">All Statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </label>

          <label className="block text-md font-medium text-gray-700">
            Search:
            <input
              type="text"
              className="border p-2 w-full"
              placeholder="Search..."
              onChange={(e) => handleFilterChange("search", e.target.value)}
            />
          </label>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">

        
        <table className="min-w-full border-collapse border ">
          <thead>
            <tr className="bg-slate-100">
              <th className="border p-2 text-left">SR.</th>
              <th className="border p-2 text-left">Title</th>
              <th className="border p-2 text-left">File No</th>
              <th className="border p-2 text-left">Subject</th>
              <th className="border p-2 text-left">Uploaded Date</th>
              <th className="border p-2 text-left">Category</th>
              <th className="border p-2 text-left">File Year</th>
              <th className="border p-2 text-left">Uploaded By</th>
              <th className="border p-2 text-left">Department</th>
              <th className="border p-2 text-left">Branch</th>
              <th className="border p-2 text-left">Approval Status</th>
            </tr>
          </thead>
          <tbody>
            {paginatedDocuments.length > 0 ? (
              paginatedDocuments.map((doc, index) => (
                <tr key={doc.id} className="even:bg-gray-50">
                  <td className="border p-2">
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </td>
                  <td className="border p-1">{doc.title}</td>
                  <td className="border p-1">{doc.fileNo}</td>
                  <td className="border p-1">{doc.subject}</td>
                  <td className="border p-1">{formatDate(doc.createdOn)}</td>
                  <td className="border p-1">
                    {doc.categoryMaster ? doc.categoryMaster.name : ""}
                  </td>
                  <td className="border p-2">
                    {doc.yearMaster ? doc.yearMaster.name : ""}
                  </td>
                  <td className="border p-2">
                    {doc.employee ? doc.employee.name : ""}
                  </td>
                  <td className="border p-2">
                    {doc.employee?.department?.name || ""}
                  </td>
                  <td className="border p-2">
                    {doc.employee?.branch?.name || ""}
                  </td>
                  <td className="border p-2">{doc.approvalStatus}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="11" className="text-center py-4">
                  No Records Found
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center mt-4">
          {/* Previous Button */}
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className={`px-3 py-1 rounded mr-3 ${currentPage === 1 ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"
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
              className={`px-3 py-1 rounded mx-1 ${currentPage === page ? "bg-blue-500 text-white" : "bg-slate-200 hover:bg-blue-100"
                }`}
            >
              {page}
            </button>
          ))}

          {/* Page Count Info */}
          <span className="text-sm text-gray-700 mx-2">of {totalPages} pages</span>

          {/* Next Button */}
          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className={`px-3 py-1 rounded ml-3 ${currentPage === totalPages ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"
              }`}
          >
            Next
            <ArrowRightIcon className="inline h-4 w-4 ml-2 mb-1" />
          </button>
          <div className="ml-4">
            <span className="text-sm text-gray-700">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, totalItems)} of{" "}
              {totalItems} entries
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminOCR;
