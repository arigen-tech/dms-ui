import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  PencilIcon,
  MagnifyingGlassIcon
} from "@heroicons/react/24/solid";
import {API_HOST} from "../API/apiConfig";
import { useNavigate } from "react-router-dom";

function RejectedDoc() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [searchTerm, setSearchTerm] = useState("");

  const token = localStorage.getItem("tokenKey");
  const UserId = localStorage.getItem("userId");
  const role = localStorage.getItem("role");

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      let response;

      // Differentiate between ADMIN and USER API calls
      if (role === "USER") {
        response = await axios.get(
          `${ API_HOST }/api/documents/rejected/employee/${UserId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      } else if (role === "ADMIN" || role === "BRANCH ADMIN" ||  role === "DEPARTMENT ADMIN") {
        response = await axios.get(
          `${ API_HOST }/api/documents/rejectedByEmp`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              employeeId: UserId, // Include employeeId in headers for ADMIN role
            },
          }
        );
      }

      setDocuments(response.data);
      setTotalItems(response.data.length); // Set total items correctly
    } catch (error) {
      console.error("Error fetching documents:", error);
      setError("Failed to fetch documents. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Add filtering based on search term
  const filteredDocuments = documents.filter(doc => 
    Object.values(doc).some(val => 
      val && val.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Paginate filtered documents
  const paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);

  const handleEdit = (docId) => {
    const data = documents.find(item => item.id === docId);
    navigate("/all-documents", { state: data });
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

  // Reset to first page when search term or items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="p-1">
      <h1 className="text-xl mb-4 font-semibold">Rejected Documents</h1>
      <div className="bg-white p-3 rounded-lg shadow-sm">
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
          <div className="flex items-center">
            <input
              type="text"
              placeholder="Search..."
              className="border rounded-l-md p-1 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <MagnifyingGlassIcon className="text-white bg-blue-500 rounded-r-lg h-8 w-8 border p-1.5" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border">
            {/* Table header remains the same */}
            <thead>
              <tr className="bg-slate-100">
                <th className="border p-2 text-left">SR.</th>
                <th className="border p-2 text-left">File No</th>
                <th className="border p-2 text-left">Title</th>
                <th className="border p-2 text-left">Subject</th>
                <th className="border p-2 text-left">Version</th>
                <th className="border p-2 text-left">Category</th>
                <th className="border p-2 text-left">Approval Status</th>
                <th className="border p-2 text-left">Rejected Reason</th>
                <th className="border p-2 text-left">Rejected by</th>
                <th className="border p-2 text-left">Rejected Date</th>
                {role === "USER" && (
                  <th className="border p-2 text-left">Edit</th>
                )}
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
                  <td className="border p-2">{doc.version}</td>
                  <td className="border p-2">
                    {doc.categoryMaster ? doc.categoryMaster.name : "No Category"}
                  </td>
                  <td className="border p-2">{doc.approvalStatus}</td>
                  <td className="border p-2">{doc.rejectionReason}</td>
                  <td className="border p-2">{doc.employeeBy.name}</td>
                  <td className="border px-4 py-2">
                    {formatDate(doc.updatedOn)}
                  </td>
                  {role === "USER" && (
                    <td className="border p-2">
                      <button onClick={() => handleEdit(doc.id)}>
                        <PencilIcon className="h-6 w-6 text-white bg-yellow-400 rounded-xl p-1" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center mt-4">
          <div>
            <span className="text-sm text-gray-700">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, filteredDocuments.length)} of{" "}
              {filteredDocuments.length} entries
            </span>
          </div>
          <div className="flex items-center">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="bg-slate-200 px-3 py-1 rounded mr-3"
            >
              <ArrowLeftIcon className="inline h-4 w-4 mr-2 mb-1" />
              Previous
            </button>
            <span className="text-blue-500 font-semibold">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="bg-slate-200 px-3 py-1 rounded ml-3"
            >
              Next
              <ArrowRightIcon className="inline h-4 w-4 ml-2 mb-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RejectedDoc;