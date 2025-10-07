import { useEffect, useState } from "react"
import { Archive, Filter, Search, Building, Users, ChevronRight, ArrowLeft, FileText } from "lucide-react"
import axios from "axios"
import Layout from "../Components/Layout"
import FolderGroup from "../Assets/folderGroup.png"
import { API_HOST, BRANCH_API, DEPAETMENT_API } from "../API/apiConfig"

const ArchiveDashboard = () => {
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

  const [drillDownLevel, setDrillDownLevel] = useState(0) // 0: Jobs, 1: Documents, 2: Versions, 3: Files
  const [selectedJob, setSelectedJob] = useState(null)
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [selectedVersion, setSelectedVersion] = useState(null)

  const [jobDocuments, setJobDocuments] = useState([])
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
    const fetchJobs = async () => {
      try {
        const res = await axios.get(`${API_HOST}/archiveJob/getALL/DhashboardData`, {
          params: {
            branchId: selectedBranch !== "All" ? selectedBranch : null,
            deptId: selectedDepartment !== "All" ? selectedDepartment : null,
            status: selectedStatus !== "All" ? selectedStatus : null,
          },
          headers: { Authorization: `Bearer ${token}` },
        })

        const data = res.data || []
        setArchiveJobs(data)

        const totals = {
          totalJobs: data.length,
          totalDocuments: data.reduce((sum, item) => sum + (item.totalDocuments || 0), 0),
          totalVersions: data.reduce((sum, item) => sum + (item.totalVersion || item.totalVersions || 0), 0),
          totalFiles: data.reduce((sum, item) => sum + (item.totalFiles || 0), 0),
          archivedFiles: data.reduce((sum, item) => sum + (item.archivedFiles || 0), 0),
          failedFiles: data.reduce((sum, item) => sum + (item.failedFiles || 0), 0),
          waiting: data.filter((j) => j.status === "WAITING").length,
          archived: data.filter((j) => j.status === "ARCHIVED").length,
          failed: data.filter((j) => j.status === "FAILED").length,
          processing: data.filter((j) => j.status === "IN_PROGRESS").length,
        }

        const pendingFiles = totals.totalFiles - totals.archivedFiles - totals.failedFiles

        setStats({
          ...totals,
          pendingFiles: pendingFiles > 0 ? pendingFiles : 0,
        })
      } catch (err) {
        console.error("Error fetching archive jobs:", err)
        setArchiveJobs([])
      }
    }
    fetchJobs()
  }, [selectedBranch, selectedDepartment, selectedStatus, token])

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
      case "ARCHIVED":
        return "bg-emerald-100 text-emerald-800"
      case "FAILED":
        return "bg-rose-100 text-rose-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

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
      const res = await axios.get(`${API_HOST}/archiveJob/grouped/${job?.id}`, {
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

  const handleDocumentClick = (document) => {
    const formattedVersions = (document.versions || []).map((v) => ({
      version: v,
      status: document.status || "-",
      effectiveDate: new Date()
        .toISOString()
        .split(/[-T:.Z]/)
        .map(Number),
      files: document.files || "-",
      archivedOn: new Date()
        .toISOString()
        .split(/[-T:.Z]/)
        .map(Number),
    }))

    setSelectedDocument(document)
    setDocumentVersions(formattedVersions)
    setDrillDownLevel(2)
    setCurrentPage(1)
  }

  const handleVersionClick = async (version) => {
    try {
      const documentHeaderId = selectedDocument.documentHeaderId
      const archiveJobId = selectedDocument.archiveJobId
      const versionName = version.version

      const res = await axios.get(`${API_HOST}/archiveJob/archived/files`, {
        params: { documentHeaderId, archiveJobId, version: versionName },
        headers: { Authorization: `Bearer ${token}` },
      })

      setSelectedVersion(version)
      setVersionFiles(res.data || [])
      setDrillDownLevel(3)
      setCurrentPage(1)
    } catch (err) {
      console.error("Error fetching archived files:", err)
    }
  }

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
          <p className="text-xs font-medium text-gray-600">{label}</p>
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
          Archive Jobs
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
              {selectedJob?.archiveName} (Documents)
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
              {selectedDocument?.title} (Versions)
            </button>
          </>
        )}
        {drillDownLevel === 3 && (
          <>
            <ChevronRight className="h-4 w-4" />
            <span className="text-gray-900 font-semibold">{selectedVersion?.version} (Files)</span>
          </>
        )}
      </div>
    )
  }

  return (
    <Layout>
      <div className="p-2">
        <h1 className="text-lg mb-2 font-semibold text-gray-900">ARCHIVAL DASHBOARD</h1>

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
              label="Pending Files"
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
                  <p className="text-xs font-medium text-gray-600">Archived Percentage</p>
                  <p className="mt-1 text-3xl font-bold text-violet-700">
                    {stats.totalJobs > 0 ? `${((stats.archived / stats.totalJobs) * 100).toFixed(1)}%` : "0%"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.archived} of {stats.totalJobs} policies
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
                      placeholder="Search archive jobs..."
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
                    <option value="All">All Branches</option>
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
                    <option value="All">All Departments</option>
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

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            {drillDownLevel > 0 && (
              <div className="mb-4">
                <button
                  onClick={handleBack}
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4 font-medium"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
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
                          Policy ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          Policy Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          Branch
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          Department
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          Documents
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          Files
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          Archived On
                        </th>
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
                                job.status,
                              )}`}
                            >
                              {getStatusDisplay(job)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">{job.totalDocuments}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{job.totalFiles}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{formatDate(job.archivedDateTime)}</td>
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
                      className={`px-4 py-2 rounded-md text-sm font-medium ${
                        currentPage === 1
                          ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      Previous
                    </button>

                    <div className="flex gap-2">
                      {getPageNumbers().map((p) => (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p)}
                          className={`px-3 py-1 rounded-md text-sm font-medium ${
                            currentPage === p
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
                      className={`px-4 py-2 rounded-md text-sm font-medium ${
                        currentPage === totalPages
                          ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      Next
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
                    Documents in: <span className="text-blue-600">{selectedJob?.archiveName}</span>
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          Document No.
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          Title
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          Branch
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          Department
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          Versions
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          Files
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {jobDocuments.map((doc) => (
                        <tr
                          key={doc.id}
                          onClick={() => handleDocumentClick(doc)}
                          className="odd:bg-white even:bg-gray-50 hover:bg-blue-50 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3 text-sm font-medium text-blue-600">{doc.fileNo}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{doc.title}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{doc?.branchName?.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{doc?.departmentName?.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{doc.versions?.length || 0}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{doc.files}</td>
                        </tr>
                      ))}
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
                    Versions for: <span className="text-blue-600">{selectedDocument?.title}</span>
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          Version
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          Scheuled On
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          Files
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          Archived On
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {documentVersions.map((version, idx) => (
                        <tr
                          key={idx}
                          onClick={() => handleVersionClick(version)}
                          className="odd:bg-white even:bg-gray-50 hover:bg-blue-50 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3 text-sm font-semibold text-blue-600">{version.version}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                              {version.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">{formatDate(selectedJob.archiveDateTime)}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{version.files}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {formatDate(selectedJob.archivedDateTime)}
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
                    Files in: <span className="text-blue-600">{selectedDocument?.title}</span> -{" "}
                    <span className="text-emerald-600">{selectedVersion?.version}</span>
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          File Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          MIME Type
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          Page Count
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          Size
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {versionFiles.map((file, idx) => (
                        <tr key={idx} className="odd:bg-white even:bg-gray-50 hover:bg-gray-100 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{file.docName}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{file.mimeType || "-"}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{file.pageCounts || "-"}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{file.fileSizeHuman || "-"}</td>
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
                <h3 className="text-lg font-medium text-gray-900 mb-2">No archival records found</h3>
                <p className="text-gray-500">Try adjusting your search criteria or filters</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default ArchiveDashboard
