import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_HOST , DOCUMENTHEADER_API} from "../API/apiConfig";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/solid";
import Popup from "../Components/Popup";
import LoadingComponent from "../Components/LoadingComponent";

const AuditForm = () => {
  // State
  const [forms, setForms] = useState([]);
  const [branchData, setBranchData] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [popupMessage, setPopupMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [actionType, setActionType] = useState("");

  const token = localStorage.getItem("tokenKey");

  // Fetch branches + forms
  useEffect(() => {
    fetchBranches();
    fetchForms();
  }, []);

  // Fetch departments on branch select
  useEffect(() => {
    if (selectedBranch) {
      fetchDepartments(selectedBranch);
    } else {
      setDepartmentData([]);
    }
  }, [selectedBranch]);

  const fetchBranches = async () => {
    try {
      const response = await axios.get(`${API_HOST}/branchmaster/findActiveRole`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBranchData(response.data);
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  };

  const fetchDepartments = async (branchId) => {
    try {
      const response = await axios.get(
        `${API_HOST}/DepartmentMaster/findByBranch/${branchId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDepartmentData(response.data);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const fetchForms = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${ DOCUMENTHEADER_API}/getAllDocumentsAuditLog`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setForms(response.data);
    } catch (error) {
      showPopup("Error fetching audit forms.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Show popup
  const showPopup = (message, type = "info") => {
    setPopupMessage({
      message,
      type,
      onClose: () => setPopupMessage(null),
    });
  };

  // Modal confirm action
  const handleAction = (form, type) => {
    setSelectedForm(form);
    setActionType(type);
    setModalVisible(true);
  };

  const confirmAction = async () => {
    try {
      // Example API for approve/reject
      await axios.put(
        `${API_HOST}/auditform/${selectedForm.id}/${actionType}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showPopup(`Form ${actionType} successfully!`, "success");
      fetchForms();
    } catch (error) {
      showPopup("Error performing action.", "error");
    } finally {
      setModalVisible(false);
    }
  };

  const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  // Filtering
  const filteredForms = forms.filter((form) => {
    if (selectedBranch && String(form.branch?.id) !== String(selectedBranch)) return false;
    if (selectedDepartment && String(form.department?.id) !== String(selectedDepartment)) return false;

    const searchFields = {
      name: form.name?.toLowerCase() || "",
      type: form.type?.toLowerCase() || "",
      status: form.status?.toLowerCase() || "",
      createdBy: form.createdBy?.name?.toLowerCase() || "",
      createdOn: form.createdOn ? formatDate(form.createdOn).toLowerCase() : "",
    };

    const lowerSearch = searchTerm.toLowerCase();
    return Object.values(searchFields).some((v) => v.includes(lowerSearch));
  });

  // Pagination
  const totalItems = filteredForms.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedForms = filteredForms.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getPageNumbers = () => {
    const maxPageNumbers = 5;
    const start = Math.floor((currentPage - 1) / maxPageNumbers) * maxPageNumbers + 1;
    const end = Math.min(start + maxPageNumbers - 1, totalPages);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  if (isLoading) return <LoadingComponent />;

  return (
    <div className="px-2">
      <h1 className="text-2xl mb-1 font-semibold">Audit Forms</h1>
      <div className="bg-white p-4 rounded-lg shadow-sm">
        {/* Filters */}
        <div className="mb-4 bg-slate-100 p-4 rounded-lg flex flex-col md:flex-row gap-4">
          {/* Items Per Page */}
          <div className="flex items-center bg-blue-500 rounded-lg flex-1 md:w-1/4">
            <label className="mr-2 ml-2 text-white text-sm">Show:</label>
            <select
              className="border rounded-r-lg p-1.5 outline-none w-full"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              {[5, 10, 15, 20].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </div>

          {/* Branch Filter */}
          <div className="flex items-center bg-blue-500 rounded-lg flex-1 md:w-1/4">
            <label className="mr-2 ml-2 text-white text-sm">Branch:</label>
            <select
              className="border rounded-r-lg p-1.5 outline-none w-full"
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                setSelectedDepartment("");
                setCurrentPage(1);
              }}
            >
              <option value="">All</option>
              {branchData.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div className="flex items-center bg-blue-500 rounded-lg flex-1 md:w-1/4">
            <label className="mr-2 ml-2 text-white text-sm">Department:</label>
            <select
              className="border rounded-r-lg p-1.5 outline-none w-full"
              value={selectedDepartment}
              onChange={(e) => {
                setSelectedDepartment(e.target.value);
                setCurrentPage(1);
              }}
              disabled={!selectedBranch}
            >
              <option value="">All</option>
              {departmentData.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="flex items-center flex-1 md:w-1/4">
            <input
              type="text"
              placeholder="Search..."
              className="border rounded-l-md p-1 outline-none w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <MagnifyingGlassIcon className="text-white bg-blue-500 rounded-r-lg h-8 w-8 border p-1.5" />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-slate-100">
                <th className="border p-2 text-left">SR.</th>
                <th className="border p-2 text-left">Audit Name</th>
                <th className="border p-2 text-left">Type</th>
                <th className="border p-2 text-left">Created Date</th>
                <th className="border p-2 text-left">Created By</th>
                <th className="border p-2 text-left">Status</th>
                <th className="border p-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedForms.length > 0 ? (
                paginatedForms.map((form, i) => (
                  <tr key={form.id}>
                    <td className="border p-2">{(currentPage - 1) * itemsPerPage + i + 1}</td>
                    <td className="border p-2">{form.name}</td>
                    <td className="border p-2">{form.type}</td>
                    <td className="border p-2">{formatDate(form.createdOn)}</td>
                    <td className="border p-2">{form.createdBy?.name}</td>
                    <td className="border p-2">{form.status}</td>
                    <td className="border p-2 flex gap-2">
                      <button
                        onClick={() => handleAction(form, "approve")}
                        className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction(form, "reject")}
                        className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="border p-2 text-center">
                    No forms found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center mt-4">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1 || totalPages === 0}
            className={`px-3 py-1 rounded mr-3 ${
              currentPage === 1 || totalPages === 0
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-slate-200 hover:bg-slate-300"
            }`}
          >
            <ArrowLeftIcon className="inline h-4 w-4 mr-2 mb-1" />
            Previous
          </button>

          {totalPages > 0 &&
            getPageNumbers().map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 rounded mx-1 ${
                  currentPage === page
                    ? "bg-blue-500 text-white"
                    : "bg-slate-200 hover:bg-blue-100"
                }`}
              >
                {page}
              </button>
            ))}

          <span className="text-sm text-gray-700 mx-2">of {totalPages} pages</span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages || totalPages === 0}
            className={`px-3 py-1 rounded ml-3 ${
              currentPage === totalPages || totalPages === 0
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-slate-200 hover:bg-slate-300"
            }`}
          >
            Next
            <ArrowRightIcon className="inline h-4 w-4 ml-2 mb-1" />
          </button>

          <div className="ml-4">
            <span className="text-sm text-gray-700">
              Showing {totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{" "}
              {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
            </span>
          </div>
        </div>

        {/* Modal */}
        {modalVisible && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h2 className="text-lg font-semibold mb-4">Confirm Action</h2>
              <p className="mb-4">
                Are you sure you want to{" "}
                <strong className="capitalize">{actionType}</strong> the form{" "}
                <strong>{selectedForm?.name}</strong>?
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setModalVisible(false)}
                  className="bg-gray-300 p-2 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAction}
                  className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Popup */}
        {popupMessage && (
          <Popup
            message={popupMessage.message}
            type={popupMessage.type}
            onClose={popupMessage.onClose}
          />
        )}
      </div>
    </div>
  );
};

export default AuditForm;
