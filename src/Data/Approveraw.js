import React, { useState, useEffect } from "react";
import axios from "axios";
import { EyeIcon } from "@heroicons/react/24/solid";

const ApprovedDoc = () => {
  const [formData, setFormData] = useState({
    title: "",
    subject: "",
    version: "",
    category: null,
  });
  const [documents, setDocuments] = useState([]);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

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
      
      // Differentiate between ADMIN, BRANCH ADMIN, and USER API calls
      if (role === "USER") {
        response = await axios.get(
          `${ API_HOST }/api/documents/approved/employee/${UserId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      } else if (role === "ADMIN") {
        response = await axios.get(
          `${ API_HOST }/api/documents/approvedByEmp`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              employeeId: UserId, // Include employeeId in headers for ADMIN role
            },
          }
        );
      } else if (role === "BRANCH ADMIN") {
        response = await axios.get(
          `${ API_HOST }/api/documents/approvedByBranch/${UserId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              employeeId: UserId,
            },
          }
        );
      }

      setDocuments(response.data);
    } catch (error) {
      console.error("Error fetching documents:", error);
      setError("Failed to fetch documents. Please try again.");
    } finally {
      setLoading(false);
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

  const paginatedDocuments = documents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(documents.length / itemsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="bg-white p-3 rounded-lg shadow-sm">
      {error && <div className="text-red-500 mb-4">{error}</div>}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border">
          <thead>
            <tr className="bg-slate-100">
              <th className="border p-2 text-left">SR.</th>
              <th className="border p-2 text-left">File No</th>
              <th className="border p-2 text-left">Title</th>
              <th className="border p-2 text-left">Subject</th>
              <th className="border p-2 text-left">Version</th>
              <th className="border p-2 text-left">Category</th>
              <th className="border p-2 text-left">Approval Status</th>
              <th className="border p-2 text-left">Approved Date</th>
              <th className="border p-2 text-left">View</th>
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
                <td className="border px-4 py-2">{formatDate(doc.updatedOn)}</td>
                <td className="border p-2">
                  <button>
                    <EyeIcon className="h-6 w-6 bg-green-400 rounded-xl p-1 text-white" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-between mt-4">
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-300 rounded"
          >
            Previous
          </button>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-gray-300 rounded"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApprovedDoc;
