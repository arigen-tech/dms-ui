import React, { useEffect, useState } from "react";
import axios from "axios";
import Layout from "../Components/Layout";
import {
    Archive,
    Clock,
    Filter,
    Search,
    Building,
    Users,
} from "lucide-react";
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    ArchiveBoxXMarkIcon,
} from '@heroicons/react/24/solid';
import ArchiveBoxCheachMarkIcon from '../Assets/ArchiveBoxCheachMarkIcon.png';
import { API_HOST, BRANCH_API, DEPAETMENT_API } from "../API/apiConfig";

const ArchiveDashboard = () => {
    const [branches, setBranches] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [statuses] = useState(["IN_PROGRESS", "ARCHIVED", "FAILED", "WAITING"]);
    const [selectedBranch, setSelectedBranch] = useState("All");
    const [selectedDepartment, setSelectedDepartment] = useState("All");
    const [selectedStatus, setSelectedStatus] = useState("All");
    const [searchTerm, setSearchTerm] = useState("");
    const [files, setFiles] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        processing: 0,
        archived: 0,
        failed: 0,
        waiting: 0,
    });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const token = localStorage.getItem("tokenKey");


    console.log("og data:", files);


    const statusPriority = {
        "IN_PROGRESS": 1,
        "ARCHIVED": 2,
        "FAILED": 3,
        "WAITING": 4
    };

    // Fetch Branches
    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const res = await axios.get(`${BRANCH_API}/findActiveRole`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setBranches(res.data);
            } catch (err) {
                console.error("Error fetching branches:", err);
            }
        };
        fetchBranches();
    }, [token]);

    // Fetch Departments (depends on branch)
    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                if (selectedBranch !== "All") {
                    const res = await axios.get(
                        `${DEPAETMENT_API}/findByBranch/${selectedBranch}`,
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    setDepartments(res.data);
                } else {
                    setDepartments([]);
                }
            } catch (err) {
                console.error("Error fetching departments:", err);
                setDepartments([]);
            }
        };
        fetchDepartments();
    }, [selectedBranch, token]);

    // Fetch Archive Jobs
    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const res = await axios.get(`${API_HOST}/archiveJob/getALL/DhashboardData`, {
                    params: {
                        branchId: selectedBranch !== "All" ? selectedBranch : null,
                        deptId: selectedDepartment !== "All" ? selectedDepartment : null,
                        status: selectedStatus !== "All" ? selectedStatus : null,
                    },
                    headers: { Authorization: `Bearer ${token}` },
                });

                setFiles(res.data);
                setStats({
                    total: res.data.length,
                    waiting: res.data.filter((j) => j.status === "WAITING").length,
                    archived: res.data.filter((j) => j.status === "ARCHIVED").length,
                    failed: res.data.filter((j) => j.status === "FAILED").length,
                    processing: res.data.filter((j) => j.status === "IN_PROGRESS").length,

                });
            } catch (err) {
                console.error("Error fetching archive jobs:", err);
                setFiles([]);
            }
        };
        fetchJobs();
    }, [selectedBranch, selectedDepartment, selectedStatus, token]);


    console.log("Files Data:", files);

    // Filter + Pagination
    const filteredAndSortedData = files
        .filter((item) => {
            const search = searchTerm.toLowerCase();
            return (
                item.description?.toLowerCase().includes(search) ||
                item.policyType?.toLowerCase().includes(search) ||
                item.status?.toLowerCase().includes(search)
            );
        })
        .sort((a, b) => {
            const priorityA = statusPriority[a.status] || 99; // default if unknown
            const priorityB = statusPriority[b.status] || 99;
            return priorityA - priorityB;
        });

    function formatDate(value) {
        if (!value) return "";

        let date;
        if (Array.isArray(value)) {
            // Handle [year, month, day, hour, minute, second]
            const [year, month, day, hour = 0, minute = 0, second = 0] = value;
            date = new Date(year, month - 1, day, hour, minute, second);
        } else {
            // Handle normal ISO string / timestamp
            date = new Date(value);
        }

        if (isNaN(date.getTime())) return "";

        const options = {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        };

        return date.toLocaleString("en-GB", options).replace(",", " at");
    }

    const totalItems = filteredAndSortedData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const paginatedFiles = filteredAndSortedData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    console.log("paginatedFiles Data:", paginatedFiles);

    const getPageNumbers = () => {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "WAITING":
                return "bg-yellow-100 text-yellow-800";
            case "IN_PROGRESS":
                return "bg-blue-100 text-blue-800";
            case "ARCHIVED":
                return "bg-green-100 text-green-800";
            case "FAILED":
                return "bg-red-100 text-red-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    return (
        <Layout>
            <div className="bg-slate-100 p-3">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-xl font-bold text-gray-900 mb-4">
                        Archival Dashboard
                    </h1>

                    {/* 🔹 Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-3">
                        {/* Total */}
                        <div
                            className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md hover:scale-105 transition cursor-pointer"
                            onClick={() => setSelectedStatus("All")}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Total Records</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                                </div>
                                <Archive className="h-8 w-8 text-gray-400" />
                            </div>
                        </div>

                        {/* Processing */}
                        <div
                            className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md hover:scale-105 transition cursor-pointer"
                            onClick={() => setSelectedStatus("IN_PROGRESS")}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Processing</p>
                                    <p className="text-2xl font-bold text-blue-600">{stats.processing}</p>
                                </div>
                                <Clock className="h-8 w-8 text-blue-400" />
                            </div>
                        </div>

                        {/* Archived */}
                        <div
                            className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md hover:scale-105 transition cursor-pointer"
                            onClick={() => setSelectedStatus("ARCHIVED")}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Archived</p>
                                    <p className="text-2xl font-bold text-green-600">{stats.archived}</p>
                                </div>
                                <img src={ArchiveBoxCheachMarkIcon} className="h-9 w-9" alt="icon" />
                            </div>
                        </div>

                        {/* Failed */}
                        <div
                            className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md hover:scale-105 transition cursor-pointer"
                            onClick={() => setSelectedStatus("FAILED")}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Failed</p>
                                    <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                                </div>
                                <ArchiveBoxXMarkIcon className="h-8 w-8 text-red-400" />
                            </div>
                        </div>

                        {/* Waiting For Processing */}
                        <div
                            className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md hover:scale-105 transition cursor-pointer"
                            onClick={() => setSelectedStatus("WAITING")}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Waiting For Processing</p>
                                    <p className="text-2xl font-bold text-yellow-600">{stats.waiting}</p>
                                </div>
                                <Clock className="h-8 w-8 text-yellow-400" />
                            </div>
                        </div>
                    </div>


                    {/* 🔹 Filters */}
                    <div className="bg-white rounded-lg shadow-sm p-3 mb-3">
                        <div className="flex flex-wrap gap-4 items-center">
                            {/* Search */}
                            <div className="flex-1 min-w-64">
                                <div className="relative">
                                    <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                                    <input
                                        type="text"
                                        placeholder="Search by ID, title, branch, or department..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Branch */}
                            <div className="flex items-center space-x-2">
                                <Building className="h-4 w-4 text-gray-500" />
                                <select
                                    value={selectedBranch}
                                    onChange={(e) => setSelectedBranch(e.target.value)}
                                    className="border border-gray-300 rounded-md px-3 py-2"
                                >
                                    <option value="All">All Branches</option>
                                    {branches.map((b) => (
                                        <option key={b.id} value={b.id}>
                                            {b.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Department */}
                            <div className="flex items-center space-x-2">
                                <Users className="h-4 w-4 text-gray-500" />
                                <select
                                    value={selectedDepartment}
                                    onChange={(e) => setSelectedDepartment(e.target.value)}
                                    className="border border-gray-300 rounded-md px-3 py-2"
                                >
                                    <option value="All">All Departments</option>
                                    {departments.map((d) => (
                                        <option key={d.id} value={d.id}>
                                            {d.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Status */}
                            <div className="flex items-center space-x-2">
                                <Filter className="h-4 w-4 text-gray-500" />
                                <select
                                    value={selectedStatus}
                                    onChange={(e) => setSelectedStatus(e.target.value)}
                                    className="border border-gray-300 rounded-md px-3 py-2"
                                >
                                    <option value="All">All Status</option>
                                    {statuses.map((s) => (
                                        <option key={s} value={s}>
                                            {s}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* 🔹 Data Table */}
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden p-4">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                            S.N.
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                            Archive Name
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                            Archival Priod
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                            Office Name
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                            Department
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                            Status
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                            Scheduled Date
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                            Archived Date
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                            Documents
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {paginatedFiles.map((item, idx) => (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-2 text-sm">
                                                {idx + 1 + (currentPage - 1) * itemsPerPage}
                                            </td>

                                            <td className="px-4 py-2 text-sm">
                                                {item.archiveName}
                                            </td>

                                            <td className="px-4 py-2 text-sm">
                                                {`${formatDate(item.fromDate)} TO ${formatDate(item.toDate)}`}
                                            </td>

                                            <td className="px-4 py-2 text-sm">
                                                {item.branchName || "All offices"}
                                            </td>

                                            <td className="px-4 py-2 text-sm">
                                                {item.departmentName || "All Department"}
                                            </td>

                                            <td className="px-4 py-2 text-sm">
                                                <span
                                                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                                                        item.status
                                                    )}`}
                                                >
                                                    {item.status === "WAITING" ? "WAITING FOR PROCESSING" : item.status}
                                                </span>
                                            </td>

                                            <td className="px-4 py-2 text-sm">
                                                {formatDate(item.archiveDateTime)}
                                            </td>

                                            <td className="px-4 py-2 text-sm">
                                                {formatDate(item.archivedDateTime) || "-"}
                                            </td>

                                            <td className="px-4 py-2 text-sm">
                                                {item.status === "ARCHIVED"
                                                    ? (item.archivedDocuments != null ? item.archivedDocuments : 0)
                                                    : (item.totalFiles != null ? item.totalFiles : "-")}
                                            </td>

                                        </tr>
                                    ))}
                                </tbody>

                            </table>

                        </div>

                        {/* Pagination */}
                        <div className="flex items-center mt-4">
                            <button
                                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                                disabled={currentPage === 1}
                                className={`px-3 py-1 rounded mr-3 ${currentPage === 1
                                    ? "bg-gray-300 cursor-not-allowed"
                                    : "bg-slate-200 hover:bg-slate-300"
                                    }`}
                            >
                                <ArrowLeftIcon className="inline h-4 w-4 mr-2 mb-1" />
                                Previous
                            </button>

                            {getPageNumbers().map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setCurrentPage(p)}
                                    className={`px-3 py-1 rounded mx-1 ${currentPage === p
                                        ? "bg-blue-500 text-white"
                                        : "bg-slate-200 hover:bg-blue-100"
                                        }`}
                                >
                                    {p}
                                </button>
                            ))}

                            <span className="text-sm text-gray-700 mx-2">
                                of {totalPages} pages
                            </span>

                            <button
                                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className={`px-3 py-1 rounded ml-3 ${currentPage === totalPages
                                    ? "bg-gray-300 cursor-not-allowed"
                                    : "bg-slate-200 hover:bg-slate-300"
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

                        {filteredAndSortedData.length === 0 && (
                            <div className="text-center py-12">
                                <Archive className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    No archival records found
                                </h3>
                                <p className="text-gray-500">
                                    Try adjusting your search criteria or filters
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default ArchiveDashboard;
