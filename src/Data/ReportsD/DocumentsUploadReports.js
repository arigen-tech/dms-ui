import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { API_HOST, SYSTEM_ADMIN, BRANCH_ADMIN, DEPARTMENT_ADMIN, USER } from "../../API/apiConfig";
import apiClient from "../../API/apiClient";
import AutoTranslate from "../../i18n/AutoTranslate";
import { getFallbackTranslation } from "../../i18n/autoTranslator";
import { useLanguage } from "../../i18n/LanguageContext";
import PdfViewer from "../../Components/PdfViewer";

// Simple Spinner Component
const Spinner = ({ size = "h-5 w-5", color = "text-white" }) => (
    <svg className={`animate-spin ${size} ${color}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const DocumentsUploadReports = () => {
    const { currentLanguage } = useLanguage();

    const initialFormData = {
        branch: "",
        department: "",
        category: "",
    };

    const [searchCriteria, setSearchCriteria] = useState(initialFormData);
    const [categoryOptions, setCategoryOptions] = useState([]);
    const [branchOptions, setBranchOptions] = useState([]);
    const [departmentOptions, setDepartmentOptions] = useState([]);
    const [fromDate, setFromDate] = useState(null);
    const [toDate, setToDate] = useState(null);
    const [searchResults, setSearchResults] = useState([]);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [showPdf, setShowPdf] = useState(false);
    const [currRole, setCurrRole] = useState(null);
    const [currentEmp, setCurrentEmp] = useState(null);
    
    // Loading states
    const [isSearching, setIsSearching] = useState(false);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);

    useEffect(() => {
        const role = localStorage.getItem("role");
        setCurrRole(role);

        fetchCategories();
        fetchBranches();

        if (role !== SYSTEM_ADMIN) {
            fetchUserDetails(role);
        }
    }, []);

    useEffect(() => {
        if (searchCriteria.branch) {
            fetchDepartments(searchCriteria.branch);
        } else {
            setDepartmentOptions([]);
        }
    }, [searchCriteria.branch]);


     const formatDate = (dateArray) => {
        const [year, month, day] = dateArray;
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('en-GB');
    };

    const fetchUserDetails = async (role) => {
        try {
            const userId = localStorage.getItem("id");
            const response = await apiClient.get(
                `${API_HOST}/employee/findById/${userId}`
            );

            const empData = response.data;
            setCurrentEmp(empData);

            if (role === BRANCH_ADMIN) {
                setSearchCriteria((prev) => ({
                    ...prev,
                    branch: empData.branch?.id || "",
                }));
            }

            if (role === DEPARTMENT_ADMIN) {
                setSearchCriteria((prev) => ({
                    ...prev,
                    branch: empData.branch?.id || "",
                    department: empData.department?.id || "",
                }));
            }

            if (role === USER) {
                setSearchCriteria((prev) => ({
                    ...prev,
                    branch: empData.branch?.id || "",
                    department: empData.department?.id || "",
                }));
            }
        } catch (error) {
            console.error("Error fetching user details:", error);
        }
    };

    const fetchBranches = async () => {
        try {
            const response = await apiClient.get(`${API_HOST}/branchmaster/findAll`);
            setBranchOptions(response.data);
        } catch (error) {
            console.error("Error fetching branches:", error);
        }
    };

    const fetchDepartments = async (branchId) => {
        try {
            const response = await apiClient.get(
                `${API_HOST}/DepartmentMaster/findByBranch/${branchId}`
            );
            setDepartmentOptions(response.data);
        } catch (error) {
            console.error("Error fetching departments:", error);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await apiClient.get(`${API_HOST}/CategoryMaster/findAll`);
            setCategoryOptions(response.data);
        } catch (error) {
            console.error("Error fetching categories:", error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setSearchCriteria((prev) => ({
            ...prev,
            [name]: value,
            ...(name === "branch" && { department: "" }),
        }));
    };

    const handleSearch = async () => {
        setIsSearching(true); // Start loading
        try {
            const requestBody = {
                branchId:
                    currRole === SYSTEM_ADMIN
                        ? searchCriteria.branch || null
                        : currentEmp?.branch?.id || null,

                departmentId:
                    currRole === SYSTEM_ADMIN || currRole === BRANCH_ADMIN
                        ? searchCriteria.department || null
                        : currentEmp?.department?.id || null,

                categoryId: searchCriteria.category || null,

                empId:
                    currRole === USER
                        ? currentEmp?.id
                        : null,

                fromDate: fromDate ? fromDate.toISOString() : null,
                toDate: toDate ? toDate.toISOString() : null,
                actionTypes: ["UPLOAD"], // ✅ FIXED: Changed from DOWNLOAD to UPLOAD
            };

            const response = await apiClient.post(
                `${API_HOST}/jasper-report/search`,
                requestBody
            );

            setSearchResults(response.data || []);
        } catch (error) {
            console.error("Search failed:", error);
        } finally {
            setIsSearching(false); // Stop loading
        }
    };

    const handleDownloadReport = async (flagType) => {
        setIsGeneratingReport(true); // Start loading
        try {
            const response = await apiClient.get(
                `${API_HOST}/jasper-report/uploaded-files`, // ✅ FIXED: Changed from downloaded-files to uploaded-files
                {
                    params: {
                        branchId:
                            currRole === SYSTEM_ADMIN
                                ? searchCriteria.branch || 0
                                : currentEmp?.branch?.id || 0,

                        departmentId:
                            currRole === SYSTEM_ADMIN || currRole === BRANCH_ADMIN
                                ? searchCriteria.department || 0
                                : currentEmp?.department?.id || 0,

                        employeeId:
                            currRole === USER
                                ? currentEmp?.id
                                : 0,

                        categoryId: searchCriteria.category || 0,

                        fromDate: fromDate
                            ? fromDate.toISOString().split("T")[0]
                            : null,

                        toDate: toDate
                            ? toDate.toISOString().split("T")[0]
                            : null,

                        actionType: "UPLOAD", // ✅ FIXED: Changed from DOWNLOAD to UPLOAD
                        flag: flagType,
                    },
                    responseType: "blob",
                }
            );

            if (flagType === "D") {
                const blob = new Blob([response.data], {
                    type: "application/pdf",
                });

                const url = window.URL.createObjectURL(blob);
                setPdfUrl(url);
                setShowPdf(true);
            }
        } catch (error) {
            console.error("Report generation failed:", error);
        } finally {
            setIsGeneratingReport(false); // Stop loading
        }
    };

    return (
        <div className="p-4">
            <h1 className="text-xl mb-4 font-semibold">
                <AutoTranslate>Document Uploads Reports</AutoTranslate>
            </h1>

            <div className="bg-white p-4 rounded-lg shadow-md">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-100 p-4 rounded-lg">

                    {/* Branch */}
                    <div className="flex flex-col">
                        <label className="mb-1">
                            <AutoTranslate>Branch</AutoTranslate>
                        </label>
                        <select
                            name="branch"
                            value={searchCriteria.branch}
                            onChange={handleInputChange}
                            className="p-2 border rounded-md"
                            disabled={currRole !== SYSTEM_ADMIN}
                        >
                            <option value="">
                                <AutoTranslate>All</AutoTranslate>
                            </option>
                            {branchOptions.map((branch) => (
                                <option key={branch.id} value={branch.id}>
                                    {branch.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Department */}
                    <div className="flex flex-col">
                        <label className="mb-1">
                            <AutoTranslate>Department</AutoTranslate>
                        </label>
                        <select
                            name="department"
                            value={searchCriteria.department}
                            onChange={handleInputChange}
                            className="p-2 border rounded-md"
                            disabled={
                                currRole === DEPARTMENT_ADMIN ||
                                currRole === USER ||
                                !searchCriteria.branch
                            }
                        >
                            <option value="">
                                <AutoTranslate>All</AutoTranslate>
                            </option>
                            {departmentOptions.map((dept) => (
                                <option key={dept.id} value={dept.id}>
                                    {dept.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Category */}
                    <div className="flex flex-col">
                        <label className="mb-1">
                            <AutoTranslate>Category</AutoTranslate>
                        </label>
                        <select
                            name="category"
                            value={searchCriteria.category}
                            onChange={handleInputChange}
                            className="p-2 border rounded-md"
                        >
                            <option value="">
                                <AutoTranslate>All</AutoTranslate>
                            </option>
                            {categoryOptions.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* From Date */}
                    <div className="flex flex-col">
                        <label className="mb-1">
                            <AutoTranslate>From Date</AutoTranslate>
                        </label>
                        <DatePicker
                            selected={fromDate}
                            onChange={(date) => setFromDate(date)}
                            maxDate={new Date()}
                            dateFormat="dd/MM/yyyy"
                            placeholderText={getFallbackTranslation(
                                "Select Start Date",
                                currentLanguage
                            )}
                            className="w-full px-3 py-2 border rounded-md"
                            isClearable
                        />
                    </div>

                    {/* To Date */}
                    <div className="flex flex-col">
                        <label className="mb-1">
                            <AutoTranslate>To Date</AutoTranslate>
                        </label>
                        <DatePicker
                            selected={toDate}
                            onChange={(date) => setToDate(date)}
                            minDate={fromDate}
                            maxDate={new Date()}
                            dateFormat="dd/MM/yyyy"
                            placeholderText={getFallbackTranslation(
                                "Select End Date",
                                currentLanguage
                            )}
                            className="w-full px-3 py-2 border rounded-md"
                            isClearable
                        />
                    </div>
                </div>

                <button
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px]"
                >
                    {isSearching ? (
                        <>
                            <Spinner size="h-4 w-4" />
                            <span className="ml-2">Searching...</span>
                        </>
                    ) : (
                        <AutoTranslate>Search</AutoTranslate>
                    )}
                </button>
            </div>

            {searchResults.length > 0 && (
                <div className="flex gap-4 mt-4">
                    <button
                        onClick={() => handleDownloadReport("D")}
                        disabled={isGeneratingReport}
                        className="px-4 py-2 bg-green-600 text-white rounded-md disabled:bg-green-300 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px]"
                    >
                        {isGeneratingReport ? (
                            <>
                                <Spinner size="h-4 w-4" />
                                <span className="ml-2">Loading...</span>
                            </>
                        ) : (
                            "View"
                        )}
                    </button>

                    <button
                        onClick={() => handleDownloadReport("P")}
                        disabled={isGeneratingReport}
                        className="px-4 py-2 bg-orange-600 text-white rounded-md disabled:bg-orange-300 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px]"
                    >
                        {isGeneratingReport ? (
                            <>
                                <Spinner size="h-4 w-4" />
                                <span className="ml-2">Loading...</span>
                            </>
                        ) : (
                            "Print"
                        )}
                    </button>
                </div>
            )}

            {isSearching ? (
                <div className="mt-6 flex justify-center items-center p-8">
                    <Spinner size="h-8 w-8" color="text-blue-500" />
                    <span className="ml-2 text-gray-600">Loading results...</span>
                </div>
            ) : searchResults.length > 0 ? (
                <div className="mt-6 overflow-auto">
                    <table className="min-w-full border border-gray-300">
                        <thead className="bg-gray-200">
                            <tr>
                                <th className="border px-2 py-1">Document</th>
                                <th className="border px-2 py-1">Title</th>
                                <th className="border px-2 py-1">Category</th>
                                <th className="border px-2 py-1">Version</th>
                                <th className="border px-2 py-1">Action Date</th>
                                <th className="border px-2 py-1">Action By</th>
                            </tr>
                        </thead>
                        <tbody>
                            {searchResults.map((item) => (
                                <tr key={item.reportId}>
                                    <td className="border px-2 py-1">{item.documentName}</td>
                                    <td className="border px-2 py-1">{item.title}</td>
                                    <td className="border px-2 py-1">{item.category}</td>
                                    <td className="border px-2 py-1">{item.version}</td>
                                    <td className="border px-2 py-1">
                                        {formatDate(item.actionDate)}
                                    </td>
                                    <td className="border px-2 py-1">{item.actionBy}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="mt-6 text-center text-gray-500">
                    <AutoTranslate>No results found</AutoTranslate>
                </div>
            )}

            {showPdf && (
                <PdfViewer
                    pdfUrl={pdfUrl}
                    name="Uploaded Files Report" // ✅ FIXED: Changed from "Downloaded Files Report"
                    onClose={() => {
                        setShowPdf(false);
                        setPdfUrl(null);
                    }}
                />
            )}
        </div>
    );
};

export default DocumentsUploadReports;