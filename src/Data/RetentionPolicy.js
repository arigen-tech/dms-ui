"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  LockClosedIcon,
  LockOpenIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PlusCircleIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from "@heroicons/react/24/solid"
import { API_HOST } from "../API/apiConfig"
import Popup from "../Components/Popup"
import { DEPAETMENT_API, BRANCH_API } from "../API/apiConfig"

const tokenKey = "tokenKey"

const CountdownTimer = ({ targetDate, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const timer = setInterval(() => {
      // Handle different date formats - could be Date object, array, or string
      let targetTime
      if (Array.isArray(targetDate)) {
        // Handle Java LocalDateTime array format [year, month, day, hour, minute, second, nano]
        const [year, month, day, hour, minute, second] = targetDate
        // Note: month in JS Date is 0-indexed, but Java's LocalDateTime is 1-indexed
        targetTime = new Date(year, month - 1, day, hour, minute, second).getTime()
      } else if (typeof targetDate === "string") {
        targetTime = new Date(targetDate).getTime()
      } else if (targetDate instanceof Date) {
        targetTime = targetDate.getTime()
      } else {
        console.error("Unsupported date format:", targetDate)
        return
      }

      const now = new Date().getTime()
      const difference = targetTime - now

      if (difference > 0) {
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((difference % (1000 * 60)) / 1000)

        setTimeLeft({ hours, minutes, seconds })
      } else {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 })
        if (onComplete) onComplete()
        clearInterval(timer)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [targetDate, onComplete])

  return (
    <div className="flex items-center space-x-1 text-sm">
      <div className="bg-red-100 text-red-800 px-2 py-1 rounded font-mono">
        {String(timeLeft.hours).padStart(2, "0")}h
      </div>
      <div className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-mono">
        {String(timeLeft.minutes).padStart(2, "0")}m
      </div>
      <div className="bg-green-100 text-green-800 px-2 py-1 rounded font-mono">
        {String(timeLeft.seconds).padStart(2, "0")}s
      </div>
    </div>
  )
}

const RetentionCheckAlert = ({ onClose, result }) => {
  const [isVisible, setIsVisible] = useState(true)
  const [showDetails, setShowDetails] = useState(false)
  const [showMissingFiles, setShowMissingFiles] = useState(false)
  const [showNotEligible, setShowNotEligible] = useState(false)
  const [selectedPolicy, setSelectedPolicy] = useState(null)

  const handleClose = () => {
    setIsVisible(false)
    onClose()
  }

  if (!isVisible) return null

  const policyResults = result.policyResults || {}
  const totalPoliciesApplied = Object.keys(policyResults).length

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center border-b p-4">
          <h3
            className={`text-lg font-semibold ${
              result.error ? "text-red-600" : result.partialSuccess ? "text-yellow-600" : "text-green-600"
            }`}
          >
            {result.error ? (
              <>
                <ExclamationTriangleIcon className="h-5 w-5 inline mr-2" />
                Error Running Retention Check
              </>
            ) : result.partialSuccess ? (
              <>
                <ExclamationTriangleIcon className="h-5 w-5 inline mr-2 text-yellow-600" />
                Retention Check Completed with Warnings
              </>
            ) : (
              <>
                <CheckCircleIcon className="h-5 w-5 inline mr-2" />
                Retention Policy Check Results
              </>
            )}
          </h3>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {result.error ? (
            <div className="text-red-600 p-4 bg-red-50 rounded">
              <p>{result.error}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="text-2xl font-bold text-blue-800">{result.processedCount || 0}</div>
                  <div className="text-sm text-blue-600">Documents Moved</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="text-2xl font-bold text-green-800">{totalPoliciesApplied}</div>
                  <div className="text-sm text-green-600">Policies Applied</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <div className="text-2xl font-bold text-yellow-800">
                    {Object.values(policyResults).reduce(
                      (total, policy) => total + (policy.totalDocumentsForPolicy || 0),
                      0,
                    )}
                  </div>
                  <div className="text-sm text-yellow-600">Documents with Policies</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="text-2xl font-bold text-gray-800">{result.documentsWithoutPolicies || 0}</div>
                  <div className="text-sm text-gray-600">Documents without Policies</div>
                </div>
              </div>

              {/* Policy Results */}
              {totalPoliciesApplied > 0 && (
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-800">Policy-wise Results</h4>

                  {Object.entries(policyResults).map(([policyName, policyData]) => (
                    <div key={policyName} className="border rounded-lg overflow-hidden">
                      <div
                        className="bg-gray-50 p-4 border-b cursor-pointer hover:bg-gray-100"
                        onClick={() => setSelectedPolicy(selectedPolicy === policyName ? null : policyName)}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h5 className="font-medium text-gray-900">{policyData.policyName}</h5>
                            <p className="text-sm text-gray-600">
                              Retention Period: {policyData.retentionPeriodDays} days | Department:{" "}
                              {policyData.department} | Category: {policyData.category}
                            </p>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <div className="text-lg font-bold text-green-600">{policyData.movedCount}</div>
                              <div className="text-xs text-gray-500">Moved</div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-yellow-600">{policyData.notEligibleCount}</div>
                              <div className="text-xs text-gray-500">Moving On Process</div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-blue-600">
                                {policyData.totalDocumentsForPolicy}
                              </div>
                              <div className="text-xs text-gray-500">Total</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {selectedPolicy === policyName && (
                        <div className="p-4 space-y-4">
                          {/* Moved Documents */}
                          {policyData.movedDocuments && policyData.movedDocuments.length > 0 && (
                            <div>
                              <h6 className="font-medium text-green-700 mb-2 flex items-center">
                                <CheckCircleIcon className="h-4 w-4 mr-2" />
                                Documents Moved to Secondary Archive ({policyData.movedDocuments.length})
                              </h6>
                              <div className="max-h-40 overflow-y-auto bg-green-50 rounded-lg">
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                  <thead className="bg-green-100">
                                    <tr>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-green-700 uppercase">
                                        File Name
                                      </th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-green-700 uppercase">
                                        Archive Date
                                      </th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-green-700 uppercase">
                                        Days Since Archival
                                      </th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-green-700 uppercase">
                                        Department
                                      </th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-green-700 uppercase">
                                        Status
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {policyData.movedDocuments.map((doc, index) => (
                                      <tr key={index} className="hover:bg-green-50">
                                        <td className="px-3 py-2 text-gray-900 font-medium">{doc.fileName}</td>
                                        <td className="px-3 py-2 text-gray-500">
                                          {new Date(doc.archiveDate).toLocaleDateString("en-GB", {
                                            day: "2-digit",
                                            month: "2-digit",
                                            year: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}
                                        </td>
                                        <td className="px-3 py-2 text-gray-500">{doc.daysSinceArchival}</td>
                                        <td className="px-3 py-2 text-gray-500">{doc.department}</td>
                                        <td className="px-3 py-2">
                                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                            ✓ Moved to Secondary
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* Not Eligible Documents with Timer */}
                          {policyData.notEligibleYet && policyData.notEligibleYet.length > 0 && (
                            <div>
                              <h6 className="font-medium text-yellow-700 mb-2 flex items-center">
                                <ClockIcon className="h-4 w-4 mr-2" />
                                Documents Waiting for Retention Period ({policyData.notEligibleYet.length})
                                <span className="ml-2 text-sm text-gray-500">- Live countdown to eligibility</span>
                              </h6>
                              <div className="max-h-60 overflow-y-auto bg-yellow-50 rounded-lg">
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                  <thead className="bg-yellow-100">
                                    <tr>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-yellow-700 uppercase">
                                        File Name
                                      </th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-yellow-700 uppercase">
                                        Archive Date
                                      </th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-yellow-700 uppercase">
                                        Days Since Archival
                                      </th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-yellow-700 uppercase">
                                        Live Countdown
                                      </th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-yellow-700 uppercase">
                                        Will Be Eligible At
                                      </th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-yellow-700 uppercase">
                                        Status
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {policyData.notEligibleYet.map((doc, index) => {
                                      // Handle different date formats for archiveDate
                                      let archiveDate
                                      if (Array.isArray(doc.archiveDate)) {
                                        const [year, month, day, hour, minute, second] = doc.archiveDate
                                        // Note: month in JS Date is 0-indexed, but Java's LocalDateTime is 1-indexed
                                        archiveDate = new Date(year, month - 1, day, hour, minute, second)
                                      } else if (typeof doc.archiveDate === "string") {
                                        archiveDate = new Date(doc.archiveDate)
                                      } else {
                                        archiveDate = new Date() // Fallback
                                      }

                                      const eligibleDate = new Date(archiveDate)
                                      eligibleDate.setDate(eligibleDate.getDate() + policyData.retentionPeriodDays)

                                      const now = new Date()
                                      const timeRemaining = eligibleDate.getTime() - now.getTime()
                                      const isEligibleSoon = timeRemaining <= 24 * 60 * 60 * 1000 // 24 hours

                                      return (
                                        <tr key={index} className="hover:bg-yellow-50">
                                          <td className="px-3 py-2 text-gray-900 font-medium">
                                            <div className="flex items-center">
                                              <span className="truncate max-w-xs" title={doc.fileName}>
                                                {doc.fileName}
                                              </span>
                                            </div>
                                          </td>
                                          <td className="px-3 py-2 text-gray-500">
                                            {archiveDate.toLocaleDateString("en-GB", {
                                              day: "2-digit",
                                              month: "2-digit",
                                              year: "numeric",
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            })}
                                          </td>
                                          <td className="px-3 py-2 text-gray-500 text-center">
                                            <span className="font-medium">{doc.daysSinceArchival}</span>
                                          </td>
                                          <td className="px-3 py-2 text-center">
                                            <CountdownTimer
                                              targetDate={eligibleDate}
                                              onComplete={() => {
                                                // Could trigger a refresh or notification when countdown reaches zero
                                                console.log(`Document ${doc.fileName} is now eligible for retention!`)
                                              }}
                                            />
                                          </td>
                                          <td className="px-3 py-2 text-gray-500 text-center">
                                            <div className="text-sm">
                                              {eligibleDate.toLocaleDateString("en-GB", {
                                                day: "2-digit",
                                                month: "2-digit",
                                                year: "numeric",
                                              })}
                                            </div>
                                            <div className="text-xs text-gray-400">
                                              {eligibleDate.toLocaleTimeString("en-GB", {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                              })}
                                            </div>
                                          </td>
                                          <td className="px-3 py-2">
                                            <div className="flex flex-col items-center">
                                              <span
                                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                  isEligibleSoon
                                                    ? "bg-orange-100 text-orange-800"
                                                    : "bg-yellow-100 text-yellow-800"
                                                }`}
                                              >
                                                {isEligibleSoon ? "🔥 Almost Ready!" : "⏳ Waiting"}
                                              </span>
                                              {isEligibleSoon && (
                                                <div className="mt-1 text-xs text-orange-600 font-medium animate-pulse">
                                                  Eligible very soon!
                                                </div>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Missing Files Section */}
              {result.missingDocuments && result.missingDocuments.length > 0 && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowMissingFiles(!showMissingFiles)}
                    className="text-red-600 hover:text-red-800 text-sm underline"
                  >
                    {showMissingFiles ? "Hide missing files" : `Show missing files (${result.missingDocuments.length})`}
                  </button>
                  {showMissingFiles && (
                    <div className="mt-2 border rounded-lg overflow-hidden">
                      <div className="bg-red-50 p-3 border-b">
                        <h4 className="font-medium text-red-600">Missing Files</h4>
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                File Path
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Policy
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {result.missingDocuments.map((doc, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-4 py-2 text-sm text-gray-500 break-all">
                                  {doc.path || doc.fileName}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-500">{doc.policy || "Unknown"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* No Results Message */}
              {result.processedCount === 0 && totalPoliciesApplied === 0 && (
                <div className="text-center py-8">
                  <ClockIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    No documents were eligible for retention policy processing at this time.
                  </p>
                  {result.documentsWithoutPolicies > 0 && (
                    <p className="text-sm text-gray-500 mt-2">
                      {result.documentsWithoutPolicies} documents don't have applicable retention policies.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t p-4 flex justify-end">
          <button
            onClick={handleClose}
            className={`px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              result.error
                ? "bg-red-100 text-red-700 hover:bg-red-200 focus:ring-red-500"
                : result.partialSuccess
                  ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 focus:ring-yellow-500"
                  : "bg-green-100 text-green-700 hover:bg-green-200 focus:ring-green-500"
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

const RetentionPolicy = () => {
  const [policies, setPolicies] = useState([])
  const [categories, setCategories] = useState([])
  const [departments, setDepartments] = useState([])
  const [branches, setBranches] = useState([])
  const [allDepartments, setAllDepartments] = useState([])
  const [loading, setLoading] = useState(false)
  const [popupMessage, setPopupMessage] = useState(null)
  const [selectedBranch, setSelectedBranch] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [currentPage, setCurrentPage] = useState(1)
  const [modalVisible, setModalVisible] = useState(false)
  const [policyToToggle, setPolicyToToggle] = useState(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    retentionPeriodDays: 30,
    isActive: true,
    categoryId: "",
    departmentId: "",
  })
  const [isEditing, setIsEditing] = useState(false)
  const [editId, setEditId] = useState(null)
  const [alert, setAlert] = useState({
    show: false,
    result: {
      processedCount: 0,
      error: null,
      processedDocuments: [],
      missingDocuments: [],
    },
  })
  const [runCheckLoading, setRunCheckLoading] = useState(false)

  const token = localStorage.getItem("tokenKey")

  useEffect(() => {
    fetchPolicies()
    fetchCategories()
    fetchBranches()
    fetchAllDepartments()
  }, [])

  useEffect(() => {
    if (selectedBranch) {
      fetchDepartments(selectedBranch)
    }
  }, [selectedBranch])

  const fetchAllDepartments = async () => {
    try {
      const token = localStorage.getItem("tokenKey")
      const response = await axios.get(`${DEPAETMENT_API}/findAll`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setAllDepartments(response.data || [])
    } catch (error) {
      console.error("Error fetching all departments:", error)
    }
  }

  const getBranchNameForDepartment = (departmentId) => {
    const department = allDepartments.find((dept) => dept.id === departmentId)
    if (department && department.branch) {
      return department.branch.name
    }
    return "All Branches"
  }

  const normalizeStatus = (status) => {
    if (typeof status === "boolean") {
      return status ? 1 : 0
    }
    return status
  }

  const isPolicyActive = (policy) => {
    return policy.isActive === true || policy.isActive === 1
  }

  const fetchPolicies = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("tokenKey")
      const response = await axios.get(`${API_HOST}/retention-policy/findAll`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      let policiesData = []
      if (response.data) {
        if (response.data.response) {
          policiesData = response.data.response
        } else if (Array.isArray(response.data)) {
          policiesData = response.data
        } else if (response.data.data) {
          policiesData = response.data.data
        }
      }

      const normalizedPolicies = policiesData.map((policy) => ({
        ...policy,
        isActive: normalizeStatus(policy.isActive),
      }))

      setPolicies(normalizedPolicies)
    } catch (error) {
      console.error("Error fetching retention policies:", error)
      showPopup("Failed to fetch retention policies", "error")
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem("tokenKey")
      const response = await axios.get(`${API_HOST}/CategoryMaster/findActiveCategory`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setCategories(response.data || [])
    } catch (error) {
      console.error("Error fetching categories:", error)
      showPopup("Failed to fetch categories", "error")
    }
  }

  const fetchBranches = async () => {
    try {
      const token = localStorage.getItem("tokenKey")
      const response = await axios.get(`${BRANCH_API}/findAll`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setBranches(response.data || [])
    } catch (error) {
      console.error("Error fetching branches:", error)
      showPopup("Failed to fetch branches", "error")
    }
  }

  const fetchDepartments = async (branchId) => {
    try {
      const token = localStorage.getItem("tokenKey")
      const response = await axios.get(`${DEPAETMENT_API}/findByBranch/${branchId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setDepartments(response.data || [])
    } catch (error) {
      console.error("Error fetching departments:", error)
      showPopup("Failed to fetch departments", "error")
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    })
  }

  const handleBranchChange = (e) => {
    setSelectedBranch(e.target.value)
    setFormData({
      ...formData,
      departmentId: "",
    })
  }

  const handleAddPolicy = async () => {
    if (formData.name && formData.name.trim()) {
      try {
        const token = localStorage.getItem("tokenKey")
        const newPolicy = {
          name: formData.name,
          description: formData.description,
          retentionPeriodDays: Number.parseInt(formData.retentionPeriodDays),
          isActive: formData.isActive ? 1 : 0,
          category: formData.categoryId ? { id: formData.categoryId } : null,
          department: formData.departmentId ? { id: formData.departmentId } : null,
          createdOn: new Date().toISOString(),
          updatedOn: new Date().toISOString(),
        }

        const response = await axios.post(`${API_HOST}/retention-policy`, newPolicy, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        })

        const normalizedPolicy = {
          ...response.data.response,
          isActive: normalizeStatus(response.data.response.isActive),
        }

        setPolicies([...policies, normalizedPolicy])
        setFormData({
          name: "",
          description: "",
          retentionPeriodDays: 30,
          isActive: true,
          categoryId: "",
          departmentId: "",
        })
        setSelectedBranch("")

        showPopup("Retention policy added successfully!", "success")
      } catch (error) {
        console.error("Error adding policy:", error.response ? error.response.data : error.message)
        showPopup("Failed to add the retention policy. Please try again!", "error")
      }
    } else {
      showPopup("Please fill in all required fields!", "warning")
    }
  }

  const handleEditPolicy = (policyId) => {
    setEditId(policyId)
    const policyToEdit = policies.find((policy) => policy.id === policyId)

    if (policyToEdit) {
      if (policyToEdit.department) {
        const department = allDepartments.find((d) => d.id === policyToEdit.department.id)
        if (department && department.branch) {
          setSelectedBranch(department.branch.id)
          fetchDepartments(department.branch.id)
        }
      }

      setFormData({
        name: policyToEdit.name,
        description: policyToEdit.description || "",
        retentionPeriodDays: policyToEdit.retentionPeriodDays,
        isActive: isPolicyActive(policyToEdit),
        categoryId: policyToEdit.category ? policyToEdit.category.id : "",
        departmentId: policyToEdit.department ? policyToEdit.department.id : "",
        id: policyToEdit.id,
      })
      setIsEditing(true)
    } else {
      console.error("Policy not found for ID:", policyId)
    }
  }

  const handleSaveEdit = async () => {
    if (formData.name.trim() && editId !== null) {
      try {
        const policyIndex = policies.findIndex((policy) => policy.id === editId)

        if (policyIndex === -1) {
          showPopup("Policy not found!", "error")
          return
        }

        const updatedPolicy = {
          ...policies[policyIndex],
          name: formData.name,
          description: formData.description,
          retentionPeriodDays: Number.parseInt(formData.retentionPeriodDays),
          isActive: formData.isActive ? 1 : 0,
          category: formData.categoryId ? { id: formData.categoryId } : null,
          department: formData.departmentId ? { id: formData.departmentId } : null,
          updatedOn: new Date().toISOString(),
        }

        const response = await axios.put(`${API_HOST}/retention-policy/${updatedPolicy.id}`, updatedPolicy, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem(tokenKey)}`,
            "Content-Type": "application/json",
          },
        })

        const normalizedUpdatedPolicy = {
          ...response.data.response,
          isActive: normalizeStatus(response.data.response.isActive),
        }

        const updatedPolicies = policies.map((policy) =>
          policy.id === updatedPolicy.id ? normalizedUpdatedPolicy : policy,
        )

        setPolicies(updatedPolicies)
        setFormData({
          name: "",
          description: "",
          retentionPeriodDays: 30,
          isActive: true,
          categoryId: "",
          departmentId: "",
        })
        setEditId(null)
        setIsEditing(false)
        setSelectedBranch("")

        showPopup("Retention policy updated successfully!", "success")
      } catch (error) {
        console.error("Error updating policy:", error.response ? error.response.data : error.message)
        showPopup("Failed to update the retention policy. Please try again!", "error")
      }
    }
  }

  const handleToggleActiveStatus = (policy) => {
    setPolicyToToggle(policy)
    setModalVisible(true)
  }

  const confirmToggleActiveStatus = async () => {
    if (policyToToggle) {
      try {
        const currentStatus = normalizeStatus(policyToToggle.isActive)
        const newActiveStatus = currentStatus === 1 ? false : true

        const statusUpdateData = {
          isActive: newActiveStatus,
        }

        const token = localStorage.getItem(tokenKey)
        const response = await axios.put(
          `${API_HOST}/retention-policy/updatestatus/${policyToToggle.id}`,
          statusUpdateData,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
        )

        let updatedPolicy
        if (response.data.response) {
          updatedPolicy = response.data.response
        } else if (response.data.data) {
          updatedPolicy = response.data.data
        } else {
          updatedPolicy = response.data
        }

        const normalizedUpdatedPolicy = {
          ...updatedPolicy,
          isActive: normalizeStatus(updatedPolicy.isActive),
        }

        const updatedPolicies = policies.map((policy) =>
          policy.id === policyToToggle.id ? normalizedUpdatedPolicy : policy,
        )

        setPolicies(updatedPolicies)
        setModalVisible(false)
        setPolicyToToggle(null)

        const statusText = newActiveStatus ? "activated" : "deactivated"
        showPopup(`Policy ${statusText} successfully!`, "success")
      } catch (error) {
        console.error("Error toggling policy status:", error)

        let errorMessage = "Failed to change the status. Please try again!"
        if (error.response?.data?.message) {
          errorMessage = error.response.data.message
        } else if (error.response?.data?.error) {
          errorMessage = error.response.data.error
        }

        showPopup(errorMessage, "error")
        setModalVisible(false)
        setPolicyToToggle(null)
      }
    } else {
      console.error("No Policy selected for status toggle")
      showPopup("No policy selected for status toggle!", "error")
    }
  }

  const handleRunRetentionCheck = async () => {
    setRunCheckLoading(true)
    try {
      const token = localStorage.getItem("tokenKey")
      const response = await axios.post(
        `${API_HOST}/retention-policy/run-check`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      let processedCount = 0
      let processedDocuments = []
      let missingDocuments = []
      let policyResults = {}

      if (response.data && response.data.response) {
        const result = response.data.response
        processedCount = result.processedCount || 0
        processedDocuments = result.processedDocuments || []
        missingDocuments = result.missingDocuments || []
        policyResults = result.policyResults || {}
      }

      setAlert({
        show: true,
        result: {
          processedCount,
          error: null,
          processedDocuments: processedDocuments,
          missingDocuments: missingDocuments,
          partialSuccess: missingDocuments.length > 0,
          policyResults: policyResults,
        },
      })
    } catch (error) {
      console.error("Error running retention policy check:", error)

      let errorMessage = "Failed to run retention policy check"
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error.message) {
        errorMessage = error.message
      }

      // Extract missing files from error response if available
      let missingDocuments = []
      if (error.response?.data?.response?.missingDocuments) {
        missingDocuments = error.response.data.response.missingDocuments
      }

      setAlert({
        show: true,
        result: {
          processedCount: 0,
          error: errorMessage,
          processedDocuments: [],
          missingDocuments: missingDocuments,
          partialSuccess: false,
        },
      })
    } finally {
      setRunCheckLoading(false)
    }
  }

  const showPopup = (message, type = "info") => {
    setPopupMessage({
      message,
      type,
      onClose: () => {
        setPopupMessage(null)
        // Refresh policies after operations
        fetchPolicies()
      },
    })
  }

  const formatDate = (dateString) => {
    if (!dateString) return "-"
    const date = new Date(dateString)
    const options = {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
    return date.toLocaleString("en-GB", options).replace(",", "")
  }

  const filteredPolicies = policies.filter((policy) => {
    const statusText = isPolicyActive(policy) ? "active" : "inactive"
    const branchName = getBranchNameForDepartment(policy.department?.id) || ""
    const departmentName = policy.department?.name || ""
    const categoryName = policy.category?.name || ""

    return (
      (policy.name && policy.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (policy.description && policy.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      branchName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      departmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      categoryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      statusText.includes(searchTerm.toLowerCase()) ||
      policy.retentionPeriodDays.toString().includes(searchTerm)
    )
  })

  const sortedPolicies = filteredPolicies.sort((a, b) => {
    const aActive = isPolicyActive(a) ? 1 : 0
    const bActive = isPolicyActive(b) ? 1 : 0
    return bActive - aActive
  })

  const totalItems = sortedPolicies.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  const paginatedPolicies = sortedPolicies.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const getPageNumbers = () => {
    const maxPageNumbers = 5
    const startPage = Math.floor((currentPage - 1) / maxPageNumbers) * maxPageNumbers + 1
    const endPage = Math.min(startPage + maxPageNumbers - 1, totalPages)
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i)
  }

  return (
    <div className="p-4">
      <h1 className="text-xl mb-4 font-semibold">Retention Policies</h1>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        {popupMessage && (
          <Popup message={popupMessage.message} type={popupMessage.type} onClose={popupMessage.onClose} />
        )}

        {alert.show && (
          <RetentionCheckAlert result={alert.result} onClose={() => setAlert({ show: false, result: null })} />
        )}

        <div className="mb-4 bg-slate-100 p-4 rounded-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <label className="block text-md font-medium text-gray-700">
              Policy Name
              <input
                type="text"
                placeholder="Enter policy name"
                name="name"
                value={formData.name || ""}
                onChange={handleInputChange}
                className="mt-1 block w-full p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <label className="block text-md font-medium text-gray-700">
              Retention Period (days)
              <input
                type="number"
                placeholder="Enter retention period"
                name="retentionPeriodDays"
                value={formData.retentionPeriodDays || ""}
                onChange={handleInputChange}
                className="mt-1 block w-full p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
              />
            </label>

            <label className="block text-md font-medium text-gray-700">
              Branch
              <select
                name="branch"
                value={selectedBranch || ""}
                onChange={handleBranchChange}
                className="mt-1 block w-full p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Branch</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-md font-medium text-gray-700">
              Department
              <select
                name="departmentId"
                value={formData.departmentId || ""}
                onChange={handleInputChange}
                className="mt-1 block w-full p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!selectedBranch}
              >
                <option value="">Select Department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-md font-medium text-gray-700">
              Category
              <select
                name="categoryId"
                value={formData.categoryId || ""}
                onChange={handleInputChange}
                className="mt-1 block w-full p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3 flex justify-start gap-4">
            {editId === null ? (
              <button
                onClick={handleAddPolicy}
                className="bg-blue-900 text-white rounded-2xl p-2 flex items-center text-sm justify-center"
              >
                <PlusCircleIcon className="h-5 w-5 mr-1" />
                Add Policy
              </button>
            ) : (
              <button
                onClick={handleSaveEdit}
                className="bg-blue-900 text-white rounded-2xl p-2 flex items-center text-sm justify-center"
              >
                <CheckCircleIcon className="h-5 w-5 mr-1" />
                Update
              </button>
            )}

            <button
              type="button"
              onClick={handleRunRetentionCheck}
              disabled={runCheckLoading}
              className={`bg-green-600 text-white rounded-2xl p-2 flex items-center text-sm justify-center ${
                runCheckLoading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {runCheckLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
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
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Running...
                </>
              ) : (
                "Run Retention Check"
              )}
            </button>
          </div>
        </div>

        <div className="mb-4 bg-slate-100 p-4 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center bg-blue-500 rounded-lg w-full flex-1 md:w-1/2">
            <label htmlFor="itemsPerPage" className="mr-2 ml-2 text-white text-sm">
              Show:
            </label>
            <select
              id="itemsPerPage"
              className="border rounded-r-lg p-1.5 outline-none w-full"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value))
                setCurrentPage(1)
              }}
            >
              {[5, 10, 15, 20].map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center w-full md:w-auto flex-1">
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

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-slate-100">
                <th className="border p-2 text-left">SR.</th>
                <th className="border p-2 text-left">Policy Name</th>
                <th className="border p-2 text-left">Retention Period</th>
                <th className="border p-2 text-left">Branch</th>
                <th className="border p-2 text-left">Department</th>
                <th className="border p-2 text-left">Category</th>
                <th className="border p-2 text-left">Status</th>
                <th className="border p-2 text-left">Edit</th>
                <th className="border p-2 text-left">Access</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPolicies.map((policy, index) => (
                <tr key={policy.id}>
                  <td className="border p-2">{index + 1 + (currentPage - 1) * itemsPerPage}</td>
                  <td className="border p-2">{policy.name}</td>
                  <td className="border p-2">{policy.retentionPeriodDays} days</td>
                  <td className="border p-2">{getBranchNameForDepartment(policy.department?.id)}</td>
                  <td className="border p-2">{policy.department?.name || "All Departments"}</td>
                  <td className="border p-2">{policy.category?.name || "All Categories"}</td>
                  <td className="border p-2">{isPolicyActive(policy) ? "Active" : "Inactive"}</td>
                  <td className="border p-2 text-center">
                    <button onClick={() => handleEditPolicy(policy.id)}>
                      <PencilIcon className="h-6 w-6 text-white bg-yellow-400 rounded-xl p-1" />
                    </button>
                  </td>
                  <td className="border p-2 text-center">
                    <button
                      onClick={() => handleToggleActiveStatus(policy)}
                      className={`p-1 rounded-full ${isPolicyActive(policy) ? "bg-green-500" : "bg-red-500"}`}
                    >
                      {isPolicyActive(policy) ? (
                        <LockOpenIcon className="h-5 w-5 text-white p-0.5" />
                      ) : (
                        <LockClosedIcon className="h-5 w-5 text-white p-0.5" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-center items-center mt-4">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className={`px-3 py-1 rounded mr-3 ${
              currentPage === 1 ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"
            }`}
          >
            <ArrowLeftIcon className="inline h-4 w-4 mr-2 mb-1" />
            Previous
          </button>

          {getPageNumbers().map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1 rounded mx-1 ${
                currentPage === page ? "bg-blue-500 text-white" : "bg-slate-200 hover:bg-blue-100"
              }`}
            >
              {page}
            </button>
          ))}

          <span className="text-sm text-gray-700 mx-2">of {totalPages} pages</span>

          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className={`px-3 py-1 rounded ml-3 ${
              currentPage === totalPages ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"
            }`}
          >
            Next
            <ArrowRightIcon className="inline h-4 w-4 ml-2 mb-1" />
          </button>

          <div className="ml-4">
            <span className="text-sm text-gray-700">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of{" "}
              {totalItems} entries
            </span>
          </div>
        </div>
      </div>

      {modalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Confirm Status Change</h2>
            <p className="mb-4">
              Are you sure you want to {policyToToggle?.isActive === 1 ? "deactivate" : "activate"} this retention
              policy
              <strong> "{policyToToggle?.name}"</strong>?
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setModalVisible(false)
                  setPolicyToToggle(null)
                }}
                className="bg-gray-300 p-2 rounded-lg"
              >
                Cancel
              </button>
              <button onClick={confirmToggleActiveStatus} className="bg-blue-500 text-white p-2 rounded-lg">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RetentionPolicy
