import React, { useEffect, useState } from "react";
import {
    Archive,
    Clock,
    Filter,
    Search,
    Building,
    Users,
    ChevronRight,
    ArrowLeft,
    FileText,
    Layers,
    File,
    FolderOpen,
    FolderArchive
} from "lucide-react";
import axios from "axios";
import Layout from "../Components/Layout";
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    ArchiveBoxXMarkIcon,
} from '@heroicons/react/24/solid';
import FolderGroup from '../Assets/folderGroup.png';
import { API_HOST, BRANCH_API, DEPAETMENT_API } from "../API/apiConfig";

const ArchiveDashboard = () => {
    const [branches, setBranches] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [statuses] = useState(["IN_PROGRESS", "ARCHIVED", "FAILED", "WAITING"]);
    const [selectedBranch, setSelectedBranch] = useState("All");
    const [selectedDepartment, setSelectedDepartment] = useState("All");
    const [selectedStatus, setSelectedStatus] = useState("All");
    const [searchTerm, setSearchTerm] = useState("");
    const [archiveJobs, setArchiveJobs] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        processing: 0,
        archived: 0,
        failed: 0,
        waiting: 0,
        totalJobs: 0,
        totalDocuments: 0,
        totalVersions: 0,
        totalFiles: 0
    });

    const [drillDownLevel, setDrillDownLevel] = useState(0); // 0: Jobs, 1: Documents, 2: Versions, 3: Files
    const [selectedJob, setSelectedJob] = useState(null);
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [selectedVersion, setSelectedVersion] = useState(null);
    const [jobDocuments, setJobDocuments] = useState([]);
    const [documentVersions, setDocumentVersions] = useState([]);
    const [versionFiles, setVersionFiles] = useState([]);
    const token = localStorage.getItem("tokenKey");

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const statusPriority = {
        "IN_PROGRESS": 1,
        "ARCHIVED": 2,
        "FAILED": 3,
        "WAITING": 4
    };

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

                setArchiveJobs(res.data);
                setStats({
                    total: res.data.length,
                    waiting: res.data.filter((j) => j.status === "WAITING").length,
                    archived: res.data.filter((j) => j.status === "ARCHIVED").length,
                    failed: res.data.filter((j) => j.status === "FAILED").length,
                    processing: res.data.filter((j) => j.status === "IN_PROGRESS").length,

                });
            } catch (err) {
                console.error("Error fetching archive jobs:", err);
                setArchiveJobs([]);
            }
        };
        fetchJobs();
    }, [selectedBranch, selectedDepartment, selectedStatus, token]);


    useEffect(() => {
        // setBranches([
        //     { id: 1, name: "Head Office" },
        //     { id: 2, name: "Branch Office" },
        //     { id: 3, name: "Regional Office" }
        // ]);

        const mockJobs = [
            {
                id: 1,
                archiveName: "Q1 2024 Archive",
                branchName: "Head Office",
                departmentName: "Finance",
                status: "ARCHIVED",
                fromDate: [2024, 1, 1],
                toDate: [2024, 3, 31],
                archiveDateTime: [2024, 4, 1, 10, 0, 0],
                archivedDateTime: [2024, 4, 1, 15, 30, 0],
                totalDocuments: 3,
                totalVersions: 8,
                totalFiles: 25,
                archivedFiles: 25,
                failedFiles: 0
            },
            {
                id: 2,
                archiveName: "Q2 2024 Archive",
                branchName: "Branch Office",
                departmentName: "HR",
                status: "IN_PROGRESS",
                fromDate: [2024, 4, 1],
                toDate: [2024, 6, 30],
                archiveDateTime: [2024, 7, 1, 9, 0, 0],
                archivedDateTime: null,
                totalDocuments: 2,
                totalVersions: 5,
                totalFiles: 18,
                archivedFiles: 10,
                failedFiles: 0
            },
            {
                id: 3,
                archiveName: "Annual Reports 2024",
                branchName: "Regional Office",
                departmentName: "Legal",
                status: "WAITING",
                fromDate: [2024, 1, 1],
                toDate: [2024, 12, 31],
                archiveDateTime: [2025, 1, 15, 8, 0, 0],
                archivedDateTime: null,
                totalDocuments: 4,
                totalVersions: 12,
                totalFiles: 40,
                archivedFiles: 0,
                failedFiles: 0
            }
        ];

        // setArchiveJobs(mockJobs);
        setStats({
            total: mockJobs.length,
            waiting: mockJobs.filter((j) => j.status === "WAITING").length,
            archived: mockJobs.filter((j) => j.status === "ARCHIVED").length,
            failed: mockJobs.filter((j) => j.status === "FAILED").length,
            processing: mockJobs.filter((j) => j.status === "IN_PROGRESS").length,
            totalJobs: mockJobs.length,
            totalDocuments: mockJobs.reduce((sum, item) => sum + (item.totalDocuments || 0), 0),
            totalVersions: mockJobs.reduce((sum, item) => sum + (item.totalVersions || 0), 0),
            totalFiles: mockJobs.reduce((sum, item) => sum + (item.totalFiles || 0), 0)
        });
    }, []);

    // useEffect(() => {
    //     if (selectedBranch !== "All") {
    //         setDepartments([
    //             { id: 1, name: "Finance" },
    //             { id: 2, name: "HR" },
    //             { id: 3, name: "Legal" }
    //         ]);
    //     } else {
    //         setDepartments([]);
    //     }
    // }, [selectedBranch]);

    function formatDate(value) {
        if (!value) return "-";
        let date;
        if (Array.isArray(value)) {
            const [year, month, day, hour = 0, minute = 0, second = 0] = value;
            date = new Date(year, month - 1, day, hour, minute, second);
        } else {
            date = new Date(value);
        }
        if (isNaN(date.getTime())) return "-";
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

    const filteredAndSortedData = archiveJobs
        .filter((item) => {
            const search = searchTerm.toLowerCase();
            return (
                item.archiveName?.toLowerCase().includes(search) ||
                item.branchName?.toLowerCase().includes(search) ||
                item.departmentName?.toLowerCase().includes(search) ||
                item.status?.toLowerCase().includes(search)
            );
        })
        .sort((a, b) => {
            const priorityA = statusPriority[a.status] || 99;
            const priorityB = statusPriority[b.status] || 99;
            return priorityA - priorityB;
        });

    const totalItems = filteredAndSortedData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const paginatedJobs = filteredAndSortedData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

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

    const fetchJobDocs = async (jobId) => {
        try {
            const res = await axios.get(`${API_HOST}/archiveJob/grouped/${jobId?.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setJobDocuments(res.data);
        } catch (err) {
            console.error("Error fetching job documents:", err);
        }
    };

    console.log("Job Documents:", jobDocuments);

    const handleJobClick = (job) => {

        console.log("Clicked job:", job);
        setSelectedJob(job);
        setDrillDownLevel(1);
        setCurrentPage(1);
        fetchJobDocs(job);
    };


const handleDocumentClick = (document) => {
    // Convert versions array from API into structured version objects
    console.log("Clicked document:", document);
    const formattedVersions = document.versions.map((v, index) => ({
        version: v,
        status: "Archived", // or "Approved" if you want static status
        effectiveDate: [2025, 1, 1], // placeholder, adjust if backend adds this later
        files: 1, // placeholder count, can be dynamic if backend supports
        archivedOn: new Date().toISOString().split(/[-T:.Z]/).map(Number) // convert current timestamp to array
    }));

    setSelectedDocument(document);
    setDocumentVersions(formattedVersions);
    setDrillDownLevel(2);
    setCurrentPage(1);
};


const handleVersionClick = async (version) => {
    try {
        // Extract params
        const documentHeaderId = selectedDocument.documentHeaderId;
        const archiveJobId = selectedDocument.archiveJobId;
        const versionName = version.version; // version.version because your object has { version: "V5", ... }

        // Call API
        const res = await axios.get(`${API_HOST}/archiveJob/archived/files`, {
            params: {
                documentHeaderId,
                archiveJobId,
                version: versionName
            },
            headers: { Authorization: `Bearer ${token}` }
        });

        // Set response in state
        setSelectedVersion(version);
        setVersionFiles(res.data); // real API data instead of mockFiles
        setDrillDownLevel(3);
        setCurrentPage(1);
        console.log("Fetched files for version:", res.data);

    } catch (err) {
        console.error("Error fetching archived files:", err);
    }
};

    const handleBack = () => {
        if (drillDownLevel === 3) {
            setDrillDownLevel(2);
            setSelectedVersion(null);
            setVersionFiles([]);
        } else if (drillDownLevel === 2) {
            setDrillDownLevel(1);
            setSelectedDocument(null);
            setDocumentVersions([]);
        } else if (drillDownLevel === 1) {
            setDrillDownLevel(0);
            setSelectedJob(null);
            setJobDocuments([]);
        }
        setCurrentPage(1);
    };

    const renderBreadcrumb = () => {
        return (
            <div className="flex items-center space-x-2 text-sm text-gray-600 mb-4 flex-wrap">
                <button
                    onClick={() => {
                        setDrillDownLevel(0);
                        setSelectedJob(null);
                        setSelectedDocument(null);
                        setSelectedVersion(null);
                        setCurrentPage(1);
                    }}
                    className="hover:text-blue-600 font-medium"
                >
                    Archive Jobs
                </button>
                {drillDownLevel >= 1 && (
                    <>
                        <ChevronRight className="h-4 w-4" />
                        <button
                            onClick={() => {
                                setDrillDownLevel(1);
                                setSelectedDocument(null);
                                setSelectedVersion(null);
                                setCurrentPage(1);
                            }}
                            className="hover:text-blue-600 font-medium"
                        >
                            {selectedJob?.archiveName} (Documents)
                        </button>
                    </>
                )}
                {drillDownLevel >= 2 && (
                    <>
                        <ChevronRight className="h-4 w-4" />
                        <button
                            onClick={() => {
                                setDrillDownLevel(2);
                                setSelectedVersion(null);
                                setCurrentPage(1);
                            }}
                            className="hover:text-blue-600 font-medium"
                        >
                            {selectedDocument?.title} (Versions)
                        </button>
                    </>
                )}
                {drillDownLevel === 3 && (
                    <>
                        <ChevronRight className="h-4 w-4" />
                        <span className="text-gray-900 font-semibold">
                            {selectedVersion?.version} (Files)
                        </span>
                    </>
                )}
            </div>
        );
    };

    return (
        <Layout>
            <div className="bg-slate-100 min-h-screen p-6">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-2xl font-bold text-gray-900 mb-6">
                        Archival Dashboard
                    </h1>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Archive Jobs</p>
                                    <p className="text-3xl font-bold text-gray-900">{stats.totalJobs}</p>
                                </div>
                                <img src={FolderGroup} alt="Folder Group" className="h-10 w-10 " />

                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Documents</p>
                                    <p className="text-3xl font-bold text-gray-900">{stats.totalDocuments}</p>
                                </div>
                                <FolderOpen className="h-10 w-10 text-blue-400" />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Versions</p>
                                    <p className="text-3xl font-bold text-gray-900">{stats.totalVersions}</p>
                                </div>
                                <Layers className="h-10 w-10 text-green-400" />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Files</p>
                                    <p className="text-3xl font-bold text-gray-900">{stats.totalFiles}</p>
                                </div>
                                <FileText className="h-10 w-10 text-purple-400" />
                            </div>
                        </div>
                    </div>

                    {drillDownLevel === 0 && (
                        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                            <div className="flex flex-wrap gap-4 items-center">
                                <div className="flex-1 min-w-64">
                                    <div className="relative">
                                        <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                                        <input
                                            type="text"
                                            placeholder="Search archive jobs..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>

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
                    )}

                    <div className="bg-white rounded-lg shadow-sm p-6">
                        {drillDownLevel > 0 && (
                            <div className="mb-4">
                                <button
                                    onClick={handleBack}
                                    className="flex items-center text-blue-600 hover:text-blue-800 mb-4 font-medium"
                                >
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Back
                                </button>
                                {renderBreadcrumb()}
                            </div>
                        )}

                        {/* Level 0: Archive Jobs */}
                        {drillDownLevel === 0 && (
                            <div className="overflow-x-auto">
                                <table className="w-full border border-gray-200 rounded-lg">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job ID</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Archive Name</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Documents</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Files</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Archived On</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {paginatedJobs.map((job) => (
                                            <tr
                                                key={job.id}
                                                onClick={() => handleJobClick(job)}
                                                className="hover:bg-blue-50 cursor-pointer transition"
                                            >
                                                <td className="px-4 py-3 text-sm font-medium text-blue-600">JOB-{job.id}</td>
                                                <td className="px-4 py-3 text-sm font-medium">{job.archiveName}</td>
                                                <td className="px-4 py-3 text-sm">{job.branchName || "All"}</td>
                                                <td className="px-4 py-3 text-sm">{job.departmentName || "All"}</td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(job.status)}`}>
                                                        {job.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm">{job.totalDocuments}</td>
                                                <td className="px-4 py-3 text-sm">{job.totalFiles}</td>
                                                <td className="px-4 py-3 text-sm">{formatDate(job.archivedDateTime)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Level 1: Documents */}
                        {drillDownLevel === 1 && (
                            <div className="overflow-x-auto">
                                <h3 className="text-lg font-semibold mb-4 text-gray-800">
                                    Documents in: <span className="text-blue-600">{selectedJob?.archiveName}</span>
                                </h3>
                                <table className="w-full border border-gray-200 rounded-lg">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Document No.</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Versions</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Files</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Archived On</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {jobDocuments.map((doc) => (
                                            <tr
                                                key={doc.id}
                                                onClick={() => handleDocumentClick(doc)}
                                                className="hover:bg-blue-50 cursor-pointer transition"
                                            >
                                                <td className="px-4 py-3 text-sm font-medium text-blue-600">{doc.fileNo}</td>
                                                <td className="px-4 py-3 text-sm font-medium">{doc.title}</td>
                                                <td className="px-4 py-3 text-sm">{doc?.branchName?.name}</td>
                                                <td className="px-4 py-3 text-sm">{doc?.departmentName?.name}</td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                                        {doc.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm">{doc.versions.length}</td>
                                                <td className="px-4 py-3 text-sm">{doc.files}</td>
                                                <td className="px-4 py-3 text-sm">{formatDate(doc.archivedOn)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Level 2: Versions */}
                        {drillDownLevel === 2 && (
                            <div className="overflow-x-auto">
                                <h3 className="text-lg font-semibold mb-4 text-gray-800">
                                    Versions for: <span className="text-blue-600">{selectedDocument?.title}</span>
                                </h3>
                                <table className="w-full border border-gray-200 rounded-lg">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Version</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Effective Date</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Files</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Archived On</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {documentVersions.map((version, idx) => (
                                            <tr
                                                key={idx}
                                                onClick={() => handleVersionClick(version)}
                                                className="hover:bg-blue-50 cursor-pointer transition"
                                            >
                                                <td className="px-4 py-3 text-sm font-semibold text-blue-600">{version.version}</td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                                        {version.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm">{formatDate(version.effectiveDate)}</td>
                                                <td className="px-4 py-3 text-sm">{version.files}</td>
                                                <td className="px-4 py-3 text-sm">{formatDate(version.archivedOn)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Level 3: Files */}
                        {drillDownLevel === 3 && (
                            <div className="overflow-x-auto">
                                <h3 className="text-lg font-semibold mb-4 text-gray-800">
                                    Files in: <span className="text-blue-600">{selectedDocument?.title}</span> - <span className="text-green-600">{selectedVersion?.version}</span>
                                </h3>
                                <table className="w-full border border-gray-200 rounded-lg">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">File Name</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">MIME Type</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Page Count</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {versionFiles.map((file, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900">{file.docName}</td>
                                                <td className="px-4 py-3 text-sm text-gray-600">{file.mimeType}</td>
                                                <td className="px-4 py-3 text-sm">{file.pageCount}</td>
                                                <td className="px-4 py-3 text-sm">{file.size}</td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                                        {file.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {drillDownLevel === 0 && totalPages > 1 && (
                            <div className="flex items-center justify-between mt-6 pt-4 border-t">
                                <button
                                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                                    disabled={currentPage === 1}
                                    className={`px-4 py-2 rounded ${currentPage === 1
                                        ? "bg-gray-300 cursor-not-allowed text-gray-500"
                                        : "bg-blue-500 text-white hover:bg-blue-600"
                                        }`}
                                >
                                    Previous
                                </button>

                                <div className="flex space-x-2">
                                    {getPageNumbers().map((p) => (
                                        <button
                                            key={p}
                                            onClick={() => setCurrentPage(p)}
                                            className={`px-3 py-1 rounded ${currentPage === p
                                                ? "bg-blue-500 text-white"
                                                : "bg-gray-200 hover:bg-gray-300"
                                                }`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className={`px-4 py-2 rounded ${currentPage === totalPages
                                        ? "bg-gray-300 cursor-not-allowed text-gray-500"
                                        : "bg-blue-500 text-white hover:bg-blue-600"
                                        }`}
                                >
                                    Next
                                </button>
                            </div>
                        )}

                        {drillDownLevel === 0 && filteredAndSortedData.length === 0 && (
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