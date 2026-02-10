import React, { useState, useEffect, useCallback } from "react";
import { API_HOST, DOCUMENTHEADER_API } from "../API/apiConfig";
import {
  getRequest,
  putRequest
} from "../API/apiService"; // Import your API functions
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/solid";
import Popup from "../Components/Popup";
import LoadingComponent from "../Components/LoadingComponent";
import AutoTranslate from '../i18n/AutoTranslate';
import { useLanguage } from '../i18n/LanguageContext';

const AuditForm = () => {
  // Get language context
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

  // State for translated placeholders
  const [translatedPlaceholders, setTranslatedPlaceholders] = useState({
    search: 'Search...',
    show: 'Show:',
    branch: 'Branch:',
    department: 'Department:',
  });

  // Component state
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

  // Debug log
  useEffect(() => {
    console.log('🔍 AuditForm Component - Language Status:', {
      currentLanguage,
      defaultLanguage,
      isTranslationNeeded: isTranslationNeeded(),
      translationStatus,
      availableLanguagesCount: availableLanguages.length,
      pathname: window.location.pathname
    });
  }, [currentLanguage, defaultLanguage, translationStatus, isTranslationNeeded, availableLanguages]);

  // Function to translate placeholder text
  const translatePlaceholder = useCallback(async (text) => {
    if (isTranslationNeeded()) {
      try {
        return await translate(text);
      } catch (error) {
        console.error('Error translating placeholder:', error);
        return text;
      }
    }
    return text;
  }, [isTranslationNeeded, translate]);

  // Update placeholders when language changes - optimized
  useEffect(() => {
    const updatePlaceholders = async () => {
      // Don't translate if English
      if (!isTranslationNeeded()) {
        setTranslatedPlaceholders({
          search: 'Search...',
          show: 'Show:',
          branch: 'Branch:',
          department: 'Department:',
        });
        return;
      }

      // Only update if language changed
      const searchPlaceholder = await translatePlaceholder('Search...');
      const showPlaceholder = await translatePlaceholder('Show:');
      const branchPlaceholder = await translatePlaceholder('Branch:');
      const departmentPlaceholder = await translatePlaceholder('Department:');

      setTranslatedPlaceholders({
        search: searchPlaceholder,
        show: showPlaceholder,
        branch: branchPlaceholder,
        department: departmentPlaceholder,
      });
    };
    
    updatePlaceholders();
  }, [currentLanguage, translatePlaceholder, isTranslationNeeded]);

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
      const response = await getRequest(`${API_HOST}/branchmaster/findActiveRole`);
      setBranchData(response.data);
      console.log('✅ Branches loaded');
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  };

  const fetchDepartments = async (branchId) => {
    try {
      const response = await getRequest(
        `${API_HOST}/DepartmentMaster/findByBranch/${branchId}`
      );
      setDepartmentData(response.data);
      console.log('✅ Departments loaded');
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const fetchForms = async () => {
    setIsLoading(true);
    try {
      const response = await getRequest(`${DOCUMENTHEADER_API}/getAllDocumentsAuditLog`);
      
      // Map the API response to match component expectations
      const mappedForms = response.data.map(log => ({
        id: log.logId,
        name: log.formName || <AutoTranslate>N/A</AutoTranslate>,
        type: log.activity,
        createdOn: log.createdAt,
        createdBy: {
          name: log.employeeName
        },
        status: log.status,
        branch: {
          id: log.branchId
        },
        department: {
          id: log.departmentId
        },
        originalData: log
      }));
      
      setForms(mappedForms);
      console.log('✅ Audit forms loaded');
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
      await putRequest(
        `${DOCUMENTHEADER_API}/auditlog/${selectedForm.id}/${actionType}`,
        {}
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
      hour: "2-digit",
      minute: "2-digit"
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
      <h1 className="text-2xl mb-1 font-semibold">
        <AutoTranslate>Audit Forms</AutoTranslate>
      </h1>
      <div className="bg-white p-4 rounded-lg shadow-sm">
        {/* Filters */}
        <div className="mb-4 bg-slate-100 p-4 rounded-lg flex flex-col md:flex-row gap-4">
          {/* Items Per Page */}
          <div className="flex items-center bg-blue-500 rounded-lg flex-1 md:w-1/4">
            <label className="mr-2 ml-2 text-white text-sm">
              <AutoTranslate>Show:</AutoTranslate>
            </label>
            <select
              className="border rounded-r-lg p-1.5 outline-none w-full"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              {[5, 10, 15, 20].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          {/* Branch Filter */}
          <div className="flex items-center bg-blue-500 rounded-lg flex-1 md:w-1/4">
            <label className="mr-2 ml-2 text-white text-sm">
              <AutoTranslate>Branch</AutoTranslate>
            </label>
            <select
              className="border rounded-r-lg p-1.5 outline-none w-full"
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                setSelectedDepartment("");
                setCurrentPage(1);
              }}
            >
              <option value=""><AutoTranslate>All</AutoTranslate></option>
              {branchData.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div className="flex items-center bg-blue-500 rounded-lg flex-1 md:w-1/4">
            <label className="mr-2 ml-2 text-white text-sm">
              <AutoTranslate>Department</AutoTranslate>
            </label>
            <select
              className="border rounded-r-lg p-1.5 outline-none w-full"
              value={selectedDepartment}
              onChange={(e) => {
                setSelectedDepartment(e.target.value);
                setCurrentPage(1);
              }}
              disabled={!selectedBranch}
            >
              <option value=""><AutoTranslate>All</AutoTranslate></option>
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
              placeholder={translatedPlaceholders.search}
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
                <th className="border p-2 text-left"><AutoTranslate>SN</AutoTranslate></th>
                <th className="border p-2 text-left"><AutoTranslate>Form Name</AutoTranslate></th>
                <th className="border p-2 text-left"><AutoTranslate>Action Name</AutoTranslate></th>
                <th className="border p-2 text-left"><AutoTranslate>Action Date & Time</AutoTranslate></th>
                <th className="border p-2 text-left"><AutoTranslate>Employee</AutoTranslate></th>
                <th className="border p-2 text-left"><AutoTranslate>Status</AutoTranslate></th>
                <th className="border p-2 text-left"><AutoTranslate>IP Address</AutoTranslate></th>
              </tr>
            </thead>
            <tbody>
              {paginatedForms.length > 0 ? (
                paginatedForms.map((form, i) => (
                  <tr key={form.id}>
                    <td className="border p-2">{i + 1 + (currentPage - 1) * itemsPerPage}</td>
                    <td className="border p-2" title={form.name}>{form.name}</td>
                    <td className="border p-2">{form.type}</td>
                    <td className="border p-2">{formatDate(form.createdOn)}</td>
                    <td className="border p-2">{form.createdBy?.name}</td>
                    <td className="border p-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        form.status === 'Success' ? 'bg-green-100 text-green-800' : 
                        form.status === 'Failure' ? 'bg-red-100 text-red-800' : 
                        'bg-gray-100 text-gray-800'
                      }`}>
                        <AutoTranslate>{form.status}</AutoTranslate>
                      </span>
                    </td>
                    <td className="border p-2">{form.originalData?.ipAddress}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="border p-2 text-center">
                    <AutoTranslate>No audit logs found.</AutoTranslate>
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
            <AutoTranslate>Previous</AutoTranslate>
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

          <span className="text-sm text-gray-700 mx-2">
            <AutoTranslate>of</AutoTranslate> {totalPages} <AutoTranslate>pages</AutoTranslate>
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages || totalPages === 0}
            className={`px-3 py-1 rounded ml-3 ${
              currentPage === totalPages || totalPages === 0
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-slate-200 hover:bg-slate-300"
            }`}
          >
            <AutoTranslate>Next</AutoTranslate>
            <ArrowRightIcon className="inline h-4 w-4 ml-2 mb-1" />
          </button>

          <div className="ml-4">
            <span className="text-sm text-gray-700">
              <AutoTranslate>
                {`Here are items ${totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to ${Math.min(currentPage * itemsPerPage, totalItems)} out of ${totalItems}.`}
              </AutoTranslate>
            </span>
          </div>
        </div>

        {/* Modal */}
        {modalVisible && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h2 className="text-lg font-semibold mb-4">
                <AutoTranslate>Confirm Action</AutoTranslate>
              </h2>
              <p className="mb-4">
                <AutoTranslate>Are you sure you want to</AutoTranslate>{" "}
                <strong className="capitalize">{actionType}</strong>{" "}
                <AutoTranslate>the audit log for</AutoTranslate>{" "}
                <strong>{selectedForm?.name}</strong>?
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setModalVisible(false)}
                  className="bg-gray-300 p-2 rounded-lg hover:bg-gray-400"
                >
                  <AutoTranslate>Cancel</AutoTranslate>
                </button>
                <button
                  onClick={confirmAction}
                  className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600"
                >
                  <AutoTranslate>Confirm</AutoTranslate>
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