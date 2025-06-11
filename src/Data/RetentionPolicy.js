"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { PlusCircleIcon, PencilIcon, LockClosedIcon, LockOpenIcon ,ArrowLeftIcon,
  ArrowRightIcon} from "@heroicons/react/24/solid"
import { API_HOST, DEPAETMENT_API, BRANCH_API } from "../API/apiConfig"
import Popup from "../Components/Popup"

const RetentionPolicy = () => {
  const [policies, setPolicies] = useState([])
  const [branches, setBranches] = useState([])
  const [departments, setDepartments] = useState([])
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
    description: "",
    retentionPeriodValue: 30,
    retentionPeriodUnit: "DAYS",
    isActive: true,
    policyType: "FILE_RETENTION",
    departmentId: "",
    branchId: "",
  })
  const [isEditing, setIsEditing] = useState(false)
  const [editId, setEditId] = useState(null)

  // Modified useEffect to ensure proper loading order
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        // First load branches and departments
        await Promise.all([
          fetchBranches(),
          fetchAllDepartments()
        ]);

        // Then load policies
        await fetchPolicies();
      } catch (error) {
        console.error("Error loading initial data:", error);
        showPopup("Failed to load initial data", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Add useEffect to update policy names when branches or departments change
  useEffect(() => {
    if (branches.length && allDepartments.length && policies.length) {
      const updatedPolicies = policies.map((policy) => ({
        ...policy,
        branchName: getBranchNameById(policy.branchId),
        departmentName: getDepartmentNameById(policy.departmentId),
      }));
      setPolicies(updatedPolicies);
    }
  }, [branches, allDepartments, policies]);


  useEffect(() => {
    if (selectedBranch) {
      fetchDepartments(selectedBranch)
    } else {
      setDepartments([])
    }
  }, [selectedBranch])

  // Helper function to get branch name by ID
  const getBranchNameById = (id) => {
    const branch = branches.find(b => b.id === id);
    return branch ? branch.name : "Unknown Branch";
  };

  const getDepartmentNameById = (departmentId) => {
  if (!departmentId || departmentId === null) return "All Departments";
  const department = allDepartments.find((dept) => dept.id == departmentId);
  return department?.name || "Unknown Department";
};



  // Modified fetchPolicies to not set names immediately
  const fetchPolicies = async () => {
    try {
      const token = localStorage.getItem("tokenKey");
      const response = await axios.get(`${API_HOST}/retention-policy/findAll`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const policiesData = Array.isArray(response.data?.response)
        ? response.data.response
        : [];

      const normalizedPolicies = policiesData.map((policy) => ({
        ...policy,
        isActive: policy.isActive === true || policy.isActive === 1,
        retentionPeriodValue: policy.retentionPeriodValue || policy.retentionPeriodDays,
        retentionPeriodUnit: policy.retentionPeriodUnit || "DAYS",
        createdOn: Array.isArray(policy.createdOn)
          ? convertArrayToDate(policy.createdOn)
          : policy.createdOn,
        updatedOn: Array.isArray(policy.updatedOn)
          ? convertArrayToDate(policy.updatedOn)
          : policy.updatedOn,
        // Set names if branches/departments are already loaded, otherwise will be set by useEffect
        branchName: "",
        departmentName: "",

      }));

      setPolicies(normalizedPolicies);
    } catch (error) {
      console.error("Error fetching retention policies:", error);
      showPopup("Failed to fetch retention policies", "error");
    }
  };

  const convertArrayToDate = (dateArray) => {
    if (!Array.isArray(dateArray) || dateArray.length < 6) return null
    const [year, month, day, hour, minute, second, nano = 0] = dateArray
    return new Date(year, month - 1, day, hour, minute, second, Math.floor(nano / 1000000)).toISOString()
  }

  const fetchBranches = async () => {
    try {
      const token = localStorage.getItem("tokenKey")
      const response = await axios.get(`${BRANCH_API}/findAll`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      // Handle the response structure
      const branchesData = response.data?.response || response.data || []
      setBranches(Array.isArray(branchesData) ? branchesData : [branchesData])
    } catch (error) {
      console.error("Error fetching branches:", error)
      showPopup("Failed to fetch branches", "error")
    }
  }

  const fetchDepartments = async (branchId) => {
    try {
      const token = localStorage.getItem("tokenKey")
      const response = await axios.get(`${DEPAETMENT_API}/findByBranch/${branchId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      // Handle the response structure
      const departmentsData = response.data?.response || response.data || []
      setDepartments(Array.isArray(departmentsData) ? departmentsData : [departmentsData])
    } catch (error) {
      console.error("Error fetching departments:", error)
      showPopup("Failed to fetch departments", "error")
      setDepartments([])
    }
  }

  const fetchAllDepartments = async () => {
    try {
      const token = localStorage.getItem("tokenKey")
      const response = await axios.get(`${DEPAETMENT_API}/findAll`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      // Handle the response structure
      const departmentsData = response.data?.response || response.data || []
      setAllDepartments(Array.isArray(departmentsData) ? departmentsData : [departmentsData])
    } catch (error) {
      console.error("Error fetching all departments:", error)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    })
  }

  const handleBranchChange = async (e) => {
    const branchId = e.target.value
    setSelectedBranch(branchId)

    // Reset department selection when branch changes
    setFormData({
      ...formData,
      branchId: branchId,
      departmentId: "", // Reset department when branch changes
    })

    // Fetch departments for the selected branch
    if (branchId) {
      await fetchDepartments(branchId)
    } else {
      setDepartments([])
    }
  }

  const handleAddPolicy = async () => {
    // Validation
    if (!formData.branchId) {
      showPopup("Please select a branch", "warning")
      return
    }

    try {
      const newPolicy = {
        policyType: formData.policyType,
        description: formData.description,
        retentionPeriodValue: Number(formData.retentionPeriodValue),
        retentionPeriodUnit: formData.retentionPeriodUnit,
        isActive: formData.isActive,
        departmentId: formData.departmentId || null,
        branchId: formData.branchId,
      }

      const token = localStorage.getItem("tokenKey")
      const response = await axios.post(`${API_HOST}/retention-policy`, newPolicy, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      // Refetch all policies to ensure we get the most up-to-date data
      await fetchPolicies()

      resetForm()
      showPopup("Policy created successfully!", "success")
    } catch (error) {
      console.error("Error creating policy:", error)
      showPopup("Failed to create policy", "error")
    }
  }

  const handleEditPolicy = async (policyId) => {
    const policyToEdit = policies.find((policy) => policy.id === policyId)

    if (policyToEdit) {
      setEditId(policyId)

      // Set form data with the policy values
      setFormData({
        description: policyToEdit.description || "",
        retentionPeriodValue: policyToEdit.retentionPeriodValue || policyToEdit.retentionPeriodDays || 30,
        retentionPeriodUnit: policyToEdit.retentionPeriodUnit || "DAYS",
        isActive: policyToEdit.isActive,
        policyType: policyToEdit.policyType || "FILE_RETENTION",
        departmentId: policyToEdit.departmentId || "",
        branchId: policyToEdit.branchId || "",
        id: policyToEdit.id,
      })

      // Set the selected branch and fetch its departments
      if (policyToEdit.branchId) {
        setSelectedBranch(policyToEdit.branchId)
        await fetchDepartments(policyToEdit.branchId)
      } else {
        setDepartments([])
      }

      setIsEditing(true)
    }
  }

  const handleSaveEdit = async () => {
    if (!formData.policyType || editId === null || !formData.retentionPeriodValue || !formData.branchId) {
      showPopup("Please fill in required fields", "warning")
      return
    }

    try {
      const policyIndex = policies.findIndex((policy) => policy.id === editId)
      if (policyIndex === -1) {
        showPopup("Policy not found!", "error")
        return
      }

      const updatedPolicy = {
        ...policies[policyIndex],
        policyType: formData.policyType,
        description: formData.description,
        retentionPeriodValue: Number.parseInt(formData.retentionPeriodValue),
        retentionPeriodUnit: formData.retentionPeriodUnit,
        retentionPeriodDays:
          formData.retentionPeriodUnit === "DAYS"
            ? Number.parseInt(formData.retentionPeriodValue)
            : calculateDaysEquivalent(formData.retentionPeriodValue, formData.retentionPeriodUnit),
        isActive: formData.isActive ? 1 : 0,
        departmentId: formData.departmentId || null,
        branchId: formData.branchId,
        updatedOn: new Date().toISOString(),
      }

      await axios.put(`${API_HOST}/retention-policy/${updatedPolicy.id}`, updatedPolicy, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("tokenKey")}`,
          "Content-Type": "application/json",
        },
      })

      // Refetch all policies to ensure we get the correct data and display names
      await fetchPolicies()

      resetForm()
      showPopup("Retention policy updated successfully!", "success")
    } catch (error) {
      console.error("Error updating policy:", error)
      showPopup("Failed to update the retention policy", "error")
    }
  }

  const resetForm = () => {
    setFormData({
      description: "",
      retentionPeriodValue: 30,
      retentionPeriodUnit: "DAYS",
      isActive: true,
      policyType: "FILE_RETENTION",
      departmentId: "",
      branchId: "",
    })
    setEditId(null)
    setIsEditing(false)
    setSelectedBranch("")
    setDepartments([])
  }

  const handleToggleActiveStatus = (policy) => {
    setPolicyToToggle(policy)
    setModalVisible(true)
  }

  const confirmToggleActiveStatus = async () => {
    if (policyToToggle) {
      try {
        const newActiveStatus = !policyToToggle.isActive
        const statusUpdateData = { isActive: newActiveStatus }

        const token = localStorage.getItem("tokenKey")
        await axios.put(
          `${API_HOST}/retention-policy/updatestatus/${policyToToggle.id}`,
          statusUpdateData,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
        )

        // Refetch policies to get updated data
        await fetchPolicies()

        setModalVisible(false)
        setPolicyToToggle(null)

        const statusText = newActiveStatus ? "activated" : "deactivated"
        showPopup(`Policy ${statusText} successfully!`, "success")
      } catch (error) {
        console.error("Error toggling policy status:", error)
        showPopup("Failed to change the status", "error")
        setModalVisible(false)
        setPolicyToToggle(null)
      }
    }
  }

  const showPopup = (message, type = "info") => {
    setPopupMessage({
      message,
      type,
      onClose: () => {
        setPopupMessage(null)
      },
    })
  }

  const calculateDaysEquivalent = (value, unit) => {
    const val = Number(value)
    switch (unit) {
      case "MINUTES":
        return Math.max(1, Math.ceil(val / (24 * 60)))
      case "HOURS":
        return Math.max(1, Math.ceil(val / 24))
      case "MONTHS":
        return val * 30
      case "DAYS":
      default:
        return val
    }
  }

  const formatRetentionPeriod = (policy) => {
    const value = policy.retentionPeriodValue || policy.retentionPeriodDays
    const unit = policy.retentionPeriodUnit || "DAYS"

    switch (unit) {
      case "MINUTES":
        return `${value} minute${value !== 1 ? "s" : ""}`
      case "HOURS":
        return `${value} hour${value !== 1 ? "s" : ""}`
      case "MONTHS":
        return `${value} month${value !== 1 ? "s" : ""}`
      case "DAYS":
      default:
        return `${value} day${value !== 1 ? "s" : ""}`
    }
  }

  const filteredPolicies = policies.filter((policy) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      (policy.policyType || "").toLowerCase().includes(searchLower) ||
      (policy.branchName || "").toLowerCase().includes(searchLower) ||
      (policy.departmentName || "").toLowerCase().includes(searchLower)
    )
  })

  const sortedPolicies = filteredPolicies.sort((a, b) => {
    return (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0)
  })

  const totalItems = sortedPolicies.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const paginatedPolicies = sortedPolicies.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)


   const getPageNumbers = () => {
    const maxPageNumbers = 5; // Number of page buttons to show
    const startPage = Math.floor((currentPage - 1) / maxPageNumbers) * maxPageNumbers + 1;
    const endPage = Math.min(startPage + maxPageNumbers - 1, totalPages);
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  };
  
  return (
    <div className="p-4">
      <h1 className="text-xl mb-4 font-semibold">Retention Policies</h1>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        {popupMessage && (
          <Popup message={popupMessage.message} type={popupMessage.type} onClose={popupMessage.onClose} />
        )}

        {/* Policy Form */}
        <div className="mb-4 bg-slate-100 p-4 rounded-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <label className="block text-md font-medium text-gray-700">
              Policy Type <span className="text-red-500">*</span>
              <select
                name="policyType"
                value={formData.policyType}
                onChange={handleInputChange}
                className="mt-1 block w-full p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="FILE_RETENTION">File Retention Policy</option>
                <option value="DATA_RETENTION">Data Retention Policy</option>
              </select>
            </label>

            <div className="block text-md font-medium text-gray-700">
              <label>Retention Period <span className="text-red-500">*</span></label>
              <div className="flex mt-1 gap-2">
                <input
                  type="number"
                  placeholder="Value"
                  name="retentionPeriodValue"
                  value={formData.retentionPeriodValue}
                  onChange={handleInputChange}
                  className="block w-2/3 p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                />
                <select
                  name="retentionPeriodUnit"
                  value={formData.retentionPeriodUnit}
                  onChange={handleInputChange}
                  className="block w-1/3 p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="MINUTES">Minutes</option>
                  <option value="HOURS">Hours</option>
                  <option value="DAYS">Days</option>
                  {/* <option value="MONTHS">Months</option> */}
                </select>
              </div>
            </div>

            <label className="block text-md font-medium text-gray-700">
              Branch <span className="text-red-500">*</span>
              <select
                name="branchId"
                value={formData.branchId}
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
              Department <span className="text-red-500">*</span>
              <select
                name="departmentId"
                value={formData.departmentId}
                onChange={handleInputChange}
                className="mt-1 block w-full p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!formData.branchId}
              >
                <option value="">All Departments</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-md font-medium text-gray-700">
              Description
              <textarea
                placeholder="Enter policy description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="mt-1 block w-full p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
              />
            </label>
          </div>

          <div className="mt-4 flex justify-start gap-4">
            {!isEditing ? (
              <button
                onClick={handleAddPolicy}
                className="bg-blue-900 text-white rounded-2xl p-2 flex items-center text-sm justify-center"
              >
                <PlusCircleIcon className="h-5 w-5 mr-1" />
                Add Policy
              </button>
            ) : (
              <>
                <button
                  onClick={handleSaveEdit}
                  className="bg-blue-900 text-white rounded-2xl p-2 flex items-center text-sm justify-center"
                >
                  Update Policy
                </button>
                <button
                  onClick={resetForm}
                  className="bg-gray-500 text-white rounded-2xl p-2 flex items-center text-sm justify-center"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        {/* Search and Filter */}
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
              placeholder="Search policies..."
              className="border rounded-l-md p-1 outline-none w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="text-white bg-blue-500 rounded-r-lg h-8 w-8 border p-1.5 flex items-center justify-center">
              🔍
            </div>
          </div>
        </div>

        {/* Policies Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-slate-100">
                <th className="border p-2 text-left">SR.</th>
                <th className="border p-2 text-left">Policy Type</th>
                <th className="border p-2 text-left">Retention Period</th>
                <th className="border p-2 text-left">Branch</th>
                <th className="border p-2 text-left">Department</th>
                <th className="border p-2 text-left">Description</th>
                <th className="border p-2 text-left">Status</th>
                <th className="border p-2 text-left">Edit</th>
                <th className="border p-2 text-left">Access</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPolicies.map((policy, index) => (
                <tr key={policy.id}>
                  <td className="border p-2">{index + 1 + (currentPage - 1) * itemsPerPage}</td>
                  <td className="border p-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${policy.policyType === "FILE_RETENTION"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-green-100 text-green-800"
                        }`}
                    >
                      {policy.policyType === "FILE_RETENTION" ? "File Retention" : "Data Retention"}
                    </span>
                  </td>
                  <td className="border p-2">{formatRetentionPeriod(policy)}</td>
                  <td className="border p-2">{policy.branchName}</td>
                  <td className="border p-2">{policy.departmentName}</td>
                  <td className="border p-2">{policy.description || "-"}</td>
                  <td className="border p-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${policy.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}
                    >
                      {policy.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="border p-2 text-center">
                    <button
                      onClick={() => handleEditPolicy(policy.id)}
                      disabled={!policy.isActive}
                      className={`${!policy.isActive ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <PencilIcon className="h-6 w-6 text-white bg-yellow-400 rounded-xl p-1" />
                    </button>
                  </td>
                  <td className="border p-2 text-center">
                    <button
                      onClick={() => handleToggleActiveStatus(policy)}
                      className={`p-1 rounded-full ${policy.isActive ? "bg-green-500" : "bg-red-500"}`}
                    >
                      {policy.isActive ? (
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

        {/* Pagination */}
        <div className="flex items-center mt-4">
          {/* Previous Button */}
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className={`px-3 py-1 rounded mr-3 ${currentPage === 1 ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"
              }`}
          >
            <ArrowLeftIcon className="inline h-4 w-4 mr-2 mb-1" />
            Previous
          </button>

          {/* Page Number Buttons */}
          {getPageNumbers().map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1 rounded mx-1 ${currentPage === page ? "bg-blue-500 text-white" : "bg-slate-200 hover:bg-blue-100"
                }`}
            >
              {page}
            </button>
          ))}

          {/* Page Count Info */}
          <span className="text-sm text-gray-700 mx-2">of {totalPages} pages</span>

          {/* Next Button */}
          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className={`px-3 py-1 rounded ml-3 ${currentPage === totalPages ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"
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
      </div>

      {/* Confirmation Modal */}
      {modalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Confirm Status Change</h2>
            <p className="mb-4">
              Are you sure you want to {policyToToggle?.isActive ? "deactivate" : "activate"} this retention policy
              <strong> "{policyToToggle?.policyType === "FILE_RETENTION" ? "File Retention" : "Data Retention"}"</strong>?
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