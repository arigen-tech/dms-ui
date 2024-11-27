import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  PencilIcon,
} from "@heroicons/react/24/solid";
import {API_HOST} from "../API/apiConfig";

function RejectedDoc() {
  const [documents, setDocuments] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    } catch (error) {
      console.error("Error fetching documents:", error);
      setError("Failed to fetch documents. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const handleEdit = (docId) => {
    // Implement your edit logic here, e.g., navigate to an edit page
    console.log("Editing document with ID:", docId);
  };
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      // hour: '2-digit',
      // minute: '2-digit',
      // hour12: true
    };
    return date.toLocaleString("en-GB", options).replace(",", "");
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="bg-white p-3 rounded-lg shadow-sm">
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
              <th className="border p-2 text-left">Rejected Reason</th>
              <th className="border p-2 text-left">Rejected Date</th>
              {role === "USER" && (
              <th className="border p-2 text-left">Edit</th>
            )}
            </tr>
          </thead>
          <tbody>
            {documents.map((doc, index) => (
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
            {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}{" "}
            entries
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
  );
}

export default RejectedDoc;
