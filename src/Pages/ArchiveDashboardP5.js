import { useEffect, useState } from "react"
import { Archive, Filter, Search, Building, Users, ChevronRight, ArrowLeft, FileText } from "lucide-react"
import axios from "axios"
import Layout from "../Components/Layout"
import { notifySuccess, notifyError } from "../Components/notify"
import FolderGroup from "../Assets/folderGroup.png"
import { API_HOST, BRANCH_API, DEPAETMENT_API, P5_APIS } from "../API/apiConfig"
import AutoTranslate from '../i18n/AutoTranslate'
import { useLanguage } from '../i18n/LanguageContext'

const ArchiveDashboardP5 = () => {
    const [branches, setBranches] = useState([])
    const [departments, setDepartments] = useState([])
    const [statuses] = useState(["IN_PROGRESS", "ARCHIVED", "FAILED", "WAITING"])

    const [selectedBranch, setSelectedBranch] = useState("All")
    const [selectedDepartment, setSelectedDepartment] = useState("All")
    const [selectedStatus, setSelectedStatus] = useState("All")
    const [searchTerm, setSearchTerm] = useState("")

    const [archiveJobs, setArchiveJobs] = useState([])

    const [stats, setStats] = useState({
        totalJobs: 0,
        totalDocuments: 0,
        totalVersions: 0,
        totalFiles: 0,
        archivedFiles: 0,
        failedFiles: 0,
        pendingFiles: 0,
        waiting: 0,
        archived: 0,
        failed: 0,
        processing: 0,
    })
    const [restoringJobId, setRestoringJobId] = useState(null);

    const [drillDownLevel, setDrillDownLevel] = useState(0) // 0: Jobs, 1: Documents, 2: Versions, 3: Files
    const [selectedJob, setSelectedJob] = useState(null)
    const [selectedDocument, setSelectedDocument] = useState(null)
    const [selectedVersion, setSelectedVersion] = useState(null)

    const [jobDocuments, setJobDocuments] = useState([]);
    const [documentVersions, setDocumentVersions] = useState([])
    const [versionFiles, setVersionFiles] = useState([])

    const token = localStorage.getItem("tokenKey")

    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    const statusPriority = {
        IN_PROGRESS: 1,
        ARCHIVED: 2,
        FAILED: 3,
        WAITING: 4,
    }

    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const res = await axios.get(`${BRANCH_API}/findActiveRole`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                setBranches(res.data)
            } catch (err) {
                console.error("Error fetching branches:", err)
            }
        }
        fetchBranches()
    }, [token])

    // Fetch Departments (depends on branch)
    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                if (selectedBranch !== "All") {
                    const res = await axios.get(`${DEPAETMENT_API}/findByBranch/${selectedBranch}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    })
                    setDepartments(res.data)
                } else {
                    setDepartments([])
                }
            } catch (err) {
                console.error("Error fetching departments:", err)
                setDepartments([])
            }
        }
        fetchDepartments()
    }, [selectedBranch, token])

    // Fetch Archive Jobs
    useEffect(() => {
        const fetchMainCount = async () => {
            try {
                const res = await axios.get(`${API_HOST}${P5_APIS}/counts`, {
                    headers: { Authorization: `Bearer ${token}` },
                })

                const data = res.data

                setStats(prev => ({
                    ...prev,
                    totalFiles: data.totalFiles,
                    archivedFiles: data.archivedFiles,
                    failedFiles: data.failedFiles,
                    pendingFiles: data.inProgressFiles,
                    totalJobs: data.totalPolicy,
                    waiting: data.waitingPolicy ?? 0,
                    archived: data.archivedPolicy ?? 0,
                    failed: data.failedPolicy ?? 0,
                    processing: data.inProgressPolicy ?? 0,
                }))
            } catch (err) {
                console.error("Error fetching counts:", err)
            }
        }

        fetchMainCount()
    }, [token])



    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const res = await axios.get(
                    `${API_HOST}/retention-policy/findAllByFilter`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                        params: {
                            branchId: null,
                            departmentId: null
                        }
                    }
                )
                setArchiveJobs(res.data)
            } catch (err) {
                console.error("Error fetching retention policies:", err)
            }
        }

        if (token) {
            fetchJobs()
        }
    }, [token])




    function formatDate(value) {
        if (!value) return "-"
        let date
        if (Array.isArray(value)) {
            const [year, month, day, hour = 0, minute = 0, second = 0] = value
            date = new Date(year, month - 1, day, hour, minute, second)
        } else {
            date = new Date(value)
        }
        if (isNaN(date.getTime())) return "-"
        const options = {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        }
        return date.toLocaleString("en-GB", options).replace(",", " at")
    }

    const filteredAndSortedData = archiveJobs
        .filter((item) => {
            const search = searchTerm.toLowerCase()
            return (
                item.archiveName?.toLowerCase().includes(search) ||
                item.branchName?.toLowerCase().includes(search) ||
                item.departmentName?.toLowerCase().includes(search) ||
                item.status?.toLowerCase().includes(search)
            )
        })
        .sort((a, b) => {
            const priorityA = statusPriority[a.status] || 99
            const priorityB = statusPriority[b.status] || 99
            return priorityA - priorityB
        })

    const totalItems = filteredAndSortedData.length
    const totalPages = Math.ceil(totalItems / itemsPerPage)
    const paginatedJobs = filteredAndSortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    const getPageNumbers = () => {
        return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const getStatusColor = (status) => {
        switch (status) {
            case "WAITING":
                return "bg-amber-100 text-amber-800"
            case "IN_PROGRESS":
                return "bg-sky-100 text-sky-800"
            case "COMPLETED":
                return "bg-emerald-100 text-emerald-800"
            case "FAILED":
                return "bg-rose-100 text-rose-800"
            default:
                return "bg-gray-100 text-gray-800"
        }
    }

const handleRestore = async (e, job) => {
    e.preventDefault();
    e.stopPropagation(); 

    try {
        setRestoringJobId(job.id);

        const res = await axios.post(
            `${API_HOST}${P5_APIS}/restoreBulk/${job.id}`,
            null,
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                validateStatus: (status) => status === 202,
            }
        );

        if (res.status === 202) {
            notifySuccess("Your Policy Restore Request is Accepted");
        }

    } catch (error) {
        console.error("Error restoring job:", error);
        notifyError("Failed to submit restore request");
    } finally {
        setRestoringJobId(null);
    }
};


    // 🟩 Handle Retry (POST)
    const handleRetry = async (job) => {
        try {
            const token = localStorage.getItem("tokenKey");
            if (!token) {
                return;
            }

            const response = await axios.post(
                `${API_HOST}/archiveJob/retry/${job.id}`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (response.status === 200) {
            } else {
                throw new Error("Retry request failed");
            }
        } catch (error) {
            console.error("❌ Retry failed:", error);
        }
    };


    const getStatusDisplay = (job) => {
        const { status, totalDocuments, archivedDocuments } = job
        if (status === "FAILED") return `${status} (100%)`
        if (status === "ARCHIVED" && totalDocuments > 0) {
            const percent = Math.round(((archivedDocuments || 0) / totalDocuments) * 100)
            return `${status} (${isNaN(percent) ? 0 : percent}%)`
        }
        return status
    }

    const fetchJobDocs = async (job) => {
        try {
            const res = await axios.get(`${API_HOST}${P5_APIS}/dashboardByPolicy/${job?.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            setJobDocuments(res.data || [])
        } catch (err) {
            console.error("Error fetching job documents:", err)
        }
    }

    const handleJobClick = (job) => {
        setSelectedJob(job)
        setDrillDownLevel(1)
        setCurrentPage(1)
        fetchJobDocs(job)
    }

    const handleDocumentClick = async (document) => {
        try {
            setSelectedDocument(document);
            setDrillDownLevel(2);
            setCurrentPage(1);

            const policyId = selectedJob?.id;
            const headerId = document?.id;

            if (!policyId || !headerId) {
                console.error("Missing policyId or headerId");
                return;
            }

            const response = await axios.get(
                `${API_HOST}${P5_APIS}/dashboardByPolicy/${policyId}/document/${headerId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const data = response.data; // ✅ Axios already parses JSON
            console.log("Document versions from API:", data);

            setDocumentVersions(data); // ✅ update state

        } catch (error) {
            console.error("Error loading document versions:", error);
        }
    };


    const handleVersionClick = async (version) => {
        try {
            // version.id is already a comma-separated string like "52,53"
            const idsCsv = version.id;

            const res = await axios.get(`${API_HOST}${P5_APIS}/files`, {
                params: { ids: idsCsv },
                headers: { Authorization: `Bearer ${token}` },
            });

            setSelectedVersion(version);
            setVersionFiles(res.data || []);
            setDrillDownLevel(3);
            setCurrentPage(1);

            console.log("Fetched files:", res.data);

        } catch (err) {
            console.error("Error fetching files:", err);
        }
    };


    const handleBack = () => {
        if (drillDownLevel === 3) {
            setDrillDownLevel(2)
            setSelectedVersion(null)
            setVersionFiles([])
        } else if (drillDownLevel === 2) {
            setDrillDownLevel(1)
            setSelectedDocument(null)
            setDocumentVersions([])
        } else if (drillDownLevel === 1) {
            setDrillDownLevel(0)
            setSelectedJob(null)
            setJobDocuments([])
        }
        setCurrentPage(1)
    }

    const StatCard = ({
        label,
        value,
        bg = "bg-slate-50",
        border = "border-slate-200",
        chipBg = "bg-slate-100",
        chipText = "text-slate-600",
        useImage = false,
        iconColor = "text-slate-600",
    }) => (
        <div className={`p-5 rounded-xl shadow-sm hover:shadow-md transition border ${border} ${bg}`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs font-medium text-gray-600">
                        <AutoTranslate>{label}</AutoTranslate>
                    </p>
                    <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
                </div>
                <div
                    className={`h-12 w-12 rounded-full flex items-center justify-center ${chipBg} ${chipText} ring-1 ring-inset ring-white/30`}
                    aria-hidden="true"
                >
                    {useImage ? (
                        <img src={FolderGroup || "/placeholder.svg"} alt="Folder group" className="h-7 w-7" />
                    ) : (
                        <FileText className={`h-7 w-7 ${iconColor}`} />
                    )}
                </div>
            </div>
        </div>
    )

    const renderBreadcrumb = () => {
        return (
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-4 flex-wrap">
                <button
                    onClick={() => {
                        setDrillDownLevel(0)
                        setSelectedJob(null)
                        setSelectedDocument(null)
                        setSelectedVersion(null)
                        setCurrentPage(1)
                    }}
                    className="hover:text-blue-600 font-medium"
                >
                    <AutoTranslate>Archive Jobs</AutoTranslate>
                </button>
                {drillDownLevel >= 1 && (
                    <>
                        <ChevronRight className="h-4 w-4" />
                        <button
                            onClick={() => {
                                setDrillDownLevel(1)
                                setSelectedDocument(null)
                                setSelectedVersion(null)
                                setCurrentPage(1)
                            }}
                            className="hover:text-blue-600 font-medium"
                        >
                            {selectedJob?.archiveName} <AutoTranslate>(Documents)</AutoTranslate>
                        </button>
                    </>
                )}
                {drillDownLevel >= 2 && (
                    <>
                        <ChevronRight className="h-4 w-4" />
                        <button
                            onClick={() => {
                                setDrillDownLevel(2)
                                setSelectedVersion(null)
                                setCurrentPage(1)
                            }}
                            className="hover:text-blue-600 font-medium"
                        >
                            {selectedDocument?.title} <AutoTranslate>(Versions)</AutoTranslate>
                        </button>
                    </>
                )}
                {drillDownLevel === 3 && (
                    <>
                        <ChevronRight className="h-4 w-4" />
                        <span className="text-gray-900 font-semibold">{selectedVersion?.version} <AutoTranslate>(Files)</AutoTranslate></span>
                    </>
                )}
            </div>
        )
    }

    return (
        <Layout>
            <div className="p-2">
                <h1 className="text-lg mb-2 font-semibold text-gray-900">
                    <AutoTranslate>ARCHIVAL DASHBOARD P5</AutoTranslate>
                </h1>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                        <StatCard
                            label="Total Policy"
                            value={stats.totalJobs}
                            bg="bg-sky-50"
                            border="border-sky-200"
                            chipBg="bg-sky-100"
                            chipText="text-sky-700"
                            useImage
                        />
                        <StatCard
                            label="Archived Policy"
                            value={stats.archived}
                            bg="bg-emerald-50"
                            border="border-emerald-200"
                            chipBg="bg-emerald-100"
                            chipText="text-emerald-700"
                            useImage
                        />
                        <StatCard
                            label="Failed Policy"
                            value={stats.failed}
                            bg="bg-rose-50"
                            border="border-rose-200"
                            chipBg="bg-rose-100"
                            chipText="text-rose-700"
                            useImage
                        />
                        <StatCard
                            label="In-Progress Policy"
                            value={stats.processing}
                            bg="bg-indigo-50"
                            border="border-indigo-200"
                            chipBg="bg-indigo-100"
                            chipText="text-indigo-700"
                            useImage
                        />
                        <StatCard
                            label="Waiting Policy"
                            value={stats.waiting}
                            bg="bg-amber-50"
                            border="border-amber-200"
                            chipBg="bg-amber-100"
                            chipText="text-amber-700"
                            useImage
                        />
                        <StatCard
                            label="Total Files"
                            value={stats.totalFiles}
                            bg="bg-slate-50"
                            border="border-slate-200"
                            chipBg="bg-slate-100"
                            chipText="text-slate-700"
                            useImage={false}
                            iconColor="text-slate-600"
                        />
                        <StatCard
                            label="Archived Files"
                            value={stats.archivedFiles}
                            bg="bg-emerald-50"
                            border="border-emerald-200"
                            chipBg="bg-emerald-100"
                            chipText="text-emerald-700"
                            useImage={false}
                            iconColor="text-emerald-600"
                        />
                        <StatCard
                            label="Failed Files"
                            value={stats.failedFiles}
                            bg="bg-rose-50"
                            border="border-rose-200"
                            chipBg="bg-rose-100"
                            chipText="text-rose-700"
                            useImage={false}
                            iconColor="text-rose-600"
                        />
                        <StatCard
                            label="In-Progress Files"
                            value={stats.pendingFiles}
                            bg="bg-amber-50"
                            border="border-amber-200"
                            chipBg="bg-amber-100"
                            chipText="text-amber-700"
                            useImage={false}
                            iconColor="text-amber-600"
                        />
                        <div className="p-5 rounded-xl shadow-sm hover:shadow-md transition border border-violet-200 bg-violet-50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-600">
                                        <AutoTranslate>Archived Percentage</AutoTranslate>
                                    </p>
                                    <p className="mt-1 text-3xl font-bold text-violet-700">
                                        {stats.totalJobs > 0 ? `${((stats.archived / stats.totalJobs) * 100).toFixed(1)}%` : "0%"}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {stats.archived} <AutoTranslate>of</AutoTranslate> {stats.totalJobs} <AutoTranslate>policies</AutoTranslate>
                                    </p>
                                </div>
                                <div className="h-12 w-12 rounded-full flex items-center justify-center bg-violet-100 text-violet-700 ring-1 ring-inset ring-white/30">
                                    <FileText className="h-7 w-7" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    {drillDownLevel === 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
                            <div className="flex flex-wrap gap-4 items-center">
                                <div className="flex-1 min-w-64">
                                    <div className="relative">
                                        <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="text"
                                            placeholder={<AutoTranslate>Search archive jobs...</AutoTranslate>}
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Building className="h-4 w-4 text-gray-500" />
                                    <select
                                        value={selectedBranch}
                                        onChange={(e) => setSelectedBranch(e.target.value)}
                                        className="border border-gray-300 rounded-md px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="All">
                                            <AutoTranslate>All Branches</AutoTranslate>
                                        </option>
                                        {branches.map((b) => (
                                            <option key={b.id} value={b.id}>
                                                {b.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-gray-500" />
                                    <select
                                        value={selectedDepartment}
                                        onChange={(e) => setSelectedDepartment(e.target.value)}
                                        className="border border-gray-300 rounded-md px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="All">
                                            <AutoTranslate>All Departments</AutoTranslate>
                                        </option>
                                        {departments.map((d) => (
                                            <option key={d.id} value={d.id}>
                                                {d.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Filter className="h-4 w-4 text-gray-500" />
                                    <select
                                        value={selectedStatus}
                                        onChange={(e) => setSelectedStatus(e.target.value)}
                                        className="border border-gray-300 rounded-md px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="All">
                                            <AutoTranslate>All Status</AutoTranslate>
                                        </option>
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

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        {drillDownLevel > 0 && (
                            <div className="mb-4">
                                <button
                                    onClick={handleBack}
                                    className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4 font-medium"
                                >
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    <AutoTranslate>Back</AutoTranslate>
                                </button>
                                {renderBreadcrumb()}
                            </div>
                        )}

                        {/* Level 0: Archive Jobs */}
                        {drillDownLevel === 0 && (
                            <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                                    <AutoTranslate>Policy ID</AutoTranslate>
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                                    <AutoTranslate>Policy Name</AutoTranslate>
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                                    <AutoTranslate>Branch</AutoTranslate>
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                                    <AutoTranslate>Department</AutoTranslate>
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                                    <AutoTranslate>Status</AutoTranslate>
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                                    <AutoTranslate>Documents</AutoTranslate>
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                                    <AutoTranslate>Total Files</AutoTranslate>
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                                    <AutoTranslate>Archival On</AutoTranslate>
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                                    <AutoTranslate>Archived On</AutoTranslate>
                                                </th>

                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                                    <AutoTranslate>Restore</AutoTranslate>
                                                </th>
                                                {/* <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                                    <AutoTranslate>Export</AutoTranslate>
                                                </th> */}
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-100">
                                            {paginatedJobs.map((job) => (
                                                <tr
                                                    key={job.id}
                                                    onClick={() => handleJobClick(job)}
                                                    className="odd:bg-white even:bg-gray-50 hover:bg-blue-50 cursor-pointer transition-colors"
                                                >
                                                    <td className="px-4 py-3 text-sm font-medium text-blue-600">JOB-{job.id}</td>
                                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{job.archiveName}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-700">{job.branchName || "All"}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-700">{job.departmentName || "All"}</td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <span
                                                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                                                                job.archiveStatus,
                                                            )}`}
                                                        >
                                                            {job.archiveStatus}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-700">{job.totalDocuments}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-700">{job.totalFiles}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-700">{formatDate(job.archivalDateTime)}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-700">{formatDate(job.archivedDate)}</td>


                                                    <td className="px-4 py-3 text-sm text-gray-700">
                                                        <button
                                                            onClick={(e) => handleRestore(e, job)}
                                                            disabled={
                                                                job.archiveStatus !== "COMPLETED" ||
                                                                restoringJobId === job.id
                                                            }
                                                            className={`px-3 py-1 text-xs font-medium text-white rounded flex items-center justify-center gap-2 transition
            ${job.archiveStatus !== "COMPLETED" ||
                                                                    restoringJobId === job.id
                                                                    ? "bg-gray-400 cursor-not-allowed"
                                                                    : "bg-blue-600 hover:bg-blue-700"
                                                                }`}
                                                        >
                                                            {restoringJobId === job.id ? (
                                                                <>
                                                                    <svg
                                                                        className="w-4 h-4 animate-spin text-white"
                                                                        fill="none"
                                                                        viewBox="0 0 24 24"
                                                                    >
                                                                        <circle
                                                                            className="opacity-25"
                                                                            cx="12"
                                                                            cy="12"
                                                                            r="10"
                                                                            stroke="currentColor"
                                                                            strokeWidth="4"
                                                                        />
                                                                        <path
                                                                            className="opacity-75"
                                                                            fill="currentColor"
                                                                            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                                                        />
                                                                    </svg>
                                                                    Restoring
                                                                </>
                                                            ) : (
                                                                <AutoTranslate>Restore</AutoTranslate>
                                                            )}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                {drillDownLevel === 0 && totalPages > 1 && (
                                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
                                        <button
                                            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                                            disabled={currentPage === 1}
                                            className={`px-4 py-2 rounded-md text-sm font-medium ${currentPage === 1
                                                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                                : "bg-blue-600 text-white hover:bg-blue-700"
                                                }`}
                                        >
                                            <AutoTranslate>Previous</AutoTranslate>
                                        </button>

                                        <div className="flex gap-2">
                                            {getPageNumbers().map((p) => (
                                                <button
                                                    key={p}
                                                    onClick={() => setCurrentPage(p)}
                                                    className={`px-3 py-1 rounded-md text-sm font-medium ${currentPage === p
                                                        ? "bg-blue-600 text-white"
                                                        : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
                                                        }`}
                                                >
                                                    {p}
                                                </button>
                                            ))}
                                        </div>

                                        <button
                                            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                            className={`px-4 py-2 rounded-md text-sm font-medium ${currentPage === totalPages
                                                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                                : "bg-blue-600 text-white hover:bg-blue-700"
                                                }`}
                                        >
                                            <AutoTranslate>Next</AutoTranslate>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Level 1: Documents */}
                        {drillDownLevel === 1 && (
                            <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
                                <div className="p-4 border-b border-gray-200 bg-gray-50">
                                    <h3 className="text-base font-semibold text-gray-800">
                                        <AutoTranslate>Documents in:</AutoTranslate> <span className="text-blue-600">{selectedJob?.archiveName}</span>
                                    </h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                                    <AutoTranslate>Document No.</AutoTranslate>
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                                    <AutoTranslate>Title</AutoTranslate>
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                                    <AutoTranslate>Branch</AutoTranslate>
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                                    <AutoTranslate>Department</AutoTranslate>
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                                    <AutoTranslate>Total Versions</AutoTranslate>
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                                    <AutoTranslate>Total Files</AutoTranslate>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-100">
                                            {jobDocuments.length > 0 ? (
                                                jobDocuments.map((doc) => (
                                                    <tr
                                                        key={doc.id}
                                                        onClick={() => handleDocumentClick(doc)}
                                                        className="odd:bg-white even:bg-gray-50 hover:bg-blue-50 cursor-pointer transition-colors"
                                                    >
                                                        <td className="px-4 py-3 text-sm font-medium text-blue-600">
                                                            {doc?.docNumber}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                            {doc?.title}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-700">
                                                            {doc?.branchName}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-700">
                                                            {doc?.departmentName}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-700">
                                                            {doc?.totalVersion || 0}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-700">
                                                            {doc?.totalfiles || 0}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={6} className="px-4 py-3 text-center text-gray-500">
                                                        No documents found
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>

                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Level 2: Versions */}
                        {drillDownLevel === 2 && (
                            <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
                                <div className="p-4 border-b border-gray-200 bg-gray-50">
                                    <h3 className="text-base font-semibold text-gray-800">
                                        <AutoTranslate>Versions for:</AutoTranslate> <span className="text-blue-600">{selectedDocument?.title}</span>
                                    </h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                                    <AutoTranslate>Version</AutoTranslate>
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                                    <AutoTranslate>Status</AutoTranslate>
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                                    <AutoTranslate>Scheduled On</AutoTranslate>
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                                    <AutoTranslate>Total Files</AutoTranslate>
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                                    <AutoTranslate>Archived On</AutoTranslate>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-100">
                                            {documentVersions.map((version) => (
                                                <tr
                                                    key={version.id}
                                                    onClick={() => handleVersionClick(version)}
                                                    className="odd:bg-white even:bg-gray-50 hover:bg-blue-50 cursor-pointer transition-colors"
                                                >
                                                    <td className="px-4 py-3 text-sm font-semibold text-blue-600">
                                                        {version.version}
                                                    </td>

                                                    <td className="px-4 py-3 text-sm">
                                                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                                                            {version.status}
                                                        </span>
                                                    </td>

                                                    <td className="px-4 py-3 text-sm text-gray-700">
                                                        {formatDate(version.archivalDateTime)}
                                                    </td>

                                                    <td className="px-4 py-3 text-sm text-gray-700">
                                                        {version.totalfiles}
                                                    </td>

                                                    <td className="px-4 py-3 text-sm text-gray-700">
                                                        {formatDate(version.archivedDate)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>

                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Level 3: Files */}
                        {drillDownLevel === 3 && (
                            <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
                                <div className="p-4 border-b border-gray-200 bg-gray-50">
                                    <h3 className="text-base font-semibold text-gray-800">
                                        <AutoTranslate>Files in:</AutoTranslate> <span className="text-blue-600">{selectedDocument?.title}</span> -{" "}
                                        <span className="text-emerald-600">{selectedVersion?.version}</span>
                                    </h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                                    <AutoTranslate>File Name</AutoTranslate>
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                                    <AutoTranslate>MIME Type</AutoTranslate>
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                                    <AutoTranslate>Page Count</AutoTranslate>
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                                    <AutoTranslate>Size</AutoTranslate>
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                                    <AutoTranslate>Status</AutoTranslate>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-100">
                                            {versionFiles.map((file, idx) => (
                                                <tr key={idx} className="odd:bg-white even:bg-gray-50 hover:bg-gray-100 transition-colors">
                                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{file.fileName}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-700">{file.mimeType || "-"}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-700">{file.pageCounts || "-"}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-700">{file.fileSize || "-"}</td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                                                            {file.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Empty state */}
                        {drillDownLevel === 0 && filteredAndSortedData.length === 0 && (
                            <div className="text-center py-12">
                                <Archive className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    <AutoTranslate>No archival records found</AutoTranslate>
                                </h3>
                                <p className="text-gray-500">
                                    <AutoTranslate>Try adjusting your search criteria or filters</AutoTranslate>
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    )
}

export default ArchiveDashboardP5