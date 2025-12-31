import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API_HOST, ROLE_API, BRANCH_ADMIN } from "../API/apiConfig";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
  PencilIcon,
} from "@heroicons/react/24/solid";
import Popup from "../Components/Popup";
import LoadingComponent from '../Components/LoadingComponent';
import AutoTranslate from '../i18n/AutoTranslate';
import { useLanguage } from '../i18n/LanguageContext';


const ManageUserRole = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [branchData, setBranchData] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [empId, setEmpId] = useState(null);
  const [, setRole] = useState("");

  const [allRoles, setAllRoles] = useState([]);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [assignedRoles, setAssignedRoles] = useState([]);

  const [selectedAvailableIds, setSelectedAvailableIds] = useState([]);
  const [selectedAssignedIds, setSelectedAssignedIds] = useState([]);

  const [originalAssignedIds, setOriginalAssignedIds] = useState([]);

  const [roleByEmp, setRoleByEmp] = useState([]);
  const [popupMessage, setPopupMessage] = useState(null);
  const [roles, setRoles] = useState([]);
  const [currBranchId, setCurrBranchId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmDisabled, setIsConfirmDisabled] = useState(false);
  const token = typeof window !== "undefined" ? localStorage.getItem("tokenKey") : null;
  const [loading, setLoading] = useState(false);
  const employeId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
  const loginEmpRole = typeof window !== "undefined" ? localStorage.getItem("role") : null;

  const [showForm, setShowForm] = useState(false);

  const [translatedPlaceholders, setTranslatedPlaceholders] = useState({
    // enterName: 'Enter name',
    // enterEmail: 'Enter email',
    // enterPhone: 'Enter phone number',
    // selectBranch: 'Select Branch',
    // selectDepartment: 'Select Department',
    search: 'Search...'
  });

  const showPopup = (message, type = "info") => {
    setPopupMessage({
      message,
      type,
      onClose: () => setPopupMessage(null),
    });
  };

  useEffect(() => {
    fetchLoginEmployees();
    fetchBranches();
  }, []);


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



  // Update placeholders when language changes
  useEffect(() => {
    const updatePlaceholders = async () => {
      if (!isTranslationNeeded()) {
        setTranslatedPlaceholders({
          // enterName: 'Enter name',
          // enterEmail: 'Enter email',
          // enterPhone: 'Enter phone number',
          // selectBranch: 'Select Branch',
          // selectDepartment: 'Select Department',
          search: 'Search...'
        });
        return;
      }

      // const namePlaceholder = await translatePlaceholder('Enter name');
      // const emailPlaceholder = await translatePlaceholder('Enter email');
      // const phonePlaceholder = await translatePlaceholder('Enter phone number');
      // const branchPlaceholder = await translatePlaceholder('Select Branch');
      // const departmentPlaceholder = await translatePlaceholder('Select Department');
      const searchPlaceholder = await translatePlaceholder('Search...');

      setTranslatedPlaceholders({
        // enterName: namePlaceholder,
        // enterEmail: emailPlaceholder,
        // enterPhone: phonePlaceholder,
        // selectBranch: branchPlaceholder,
        // selectDepartment: departmentPlaceholder,
        search: searchPlaceholder
      });
    };

    updatePlaceholders();
  }, [currentLanguage, translatePlaceholder, isTranslationNeeded]);




  useEffect(() => {
    if (selectedBranch) {
      fetchDepartments(selectedBranch);
    } else {
      setDepartmentData([]);
    }
  }, [selectedBranch]);

  const fetchBranches = async () => {
    try {
      const token = localStorage.getItem("tokenKey");
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
      const token = localStorage.getItem("tokenKey");
      const response = await axios.get(
        `${API_HOST}/DepartmentMaster/findByBranch/${branchId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setDepartmentData(response.data);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  useEffect(() => {
    if (selectedUser && selectedUser.employeeRoles) {
      setRoleByEmp(selectedUser.employeeRoles);
    }
  }, [selectedUser]);

  useEffect(() => {
    if (!selectedUser) return;

    const activeAssigned = (selectedUser.employeeRoles || [])
      .filter((r) => r.active === true)
      .map((r) => ({ id: r.roleId, label: r.roleName }));

    setAssignedRoles(activeAssigned);
    setOriginalAssignedIds(activeAssigned.map((r) => r.id));

    const assignedIdSet = new Set(activeAssigned.map((r) => r.id));
    const remaining = allRoles.filter((role) => !assignedIdSet.has(role.id));
    setAvailableRoles(remaining);
    setSelectedAvailableIds([]);
    setSelectedAssignedIds([]);
  }, [allRoles, selectedUser]);

  const fetchLoginEmployees = async () => {
    try {
      const userResponse = await axios.get(
        `${API_HOST}/employee/findById/${employeId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (userResponse.data && userResponse.data.role && userResponse.data.role.roleCode != null) {
        fetchAvailableRolesForUser(userResponse.data.role.roleCode);
      }
      if (userResponse.data && userResponse.data.branch && userResponse.data.branch.id) {
        setCurrBranchId(userResponse.data.branch.id);
      }
    } catch (error) {
      console.error("Error fetching user details:", error.response?.data || error.message);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let response;
      if (loginEmpRole === BRANCH_ADMIN && currBranchId) {
        response = await axios.get(
          `${API_HOST}/api/EmpRole/branch/${currBranchId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        response = await axios.get(`${API_HOST}/api/EmpRole/employees`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      if (response && response.status === 200) {
        setUsers(response.data);
      } else {
        console.log("Failed to fetch users. Please try again later.");
      }
    } catch (error) {
      console.log("Error fetching users. Check your connection or contact support.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loginEmpRole === BRANCH_ADMIN) {
      fetchLoginEmployees().then(() => {
        if (currBranchId) fetchUsers();
      });
    } else {
      fetchUsers();
    }
  }, [loginEmpRole, currBranchId]);

  const fetchAvailableRolesForUser = async (userRoleCode) => {
    try {
      const rolesResponse = await axios.get(`${ROLE_API}/findAll`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const filteredRoles = (rolesResponse.data || []).filter(
        (role) => role.roleCode < userRoleCode
      );

      setAllRoles(filteredRoles);
    } catch (error) {
      console.error("Error fetching available roles for user:", error);
    }
  };

  const HandleEditRole = (user) => {
    setSelectedUser(user);
    setRole(user.roleName || "");
    setEmpId(user.employeeId);
    setShowForm(true);
  };

  const onChangeAvailableSelect = (e) => {
    const ids = Array.from(e.target.selectedOptions).map((opt) => Number(opt.value));
    setSelectedAvailableIds(ids);
  };
  const onChangeAssignedSelect = (e) => {
    const ids = Array.from(e.target.selectedOptions).map((opt) => Number(opt.value));
    setSelectedAssignedIds(ids);
  };

  // Move between lists (UI only; actual save occurs on Update)
  const moveToAssigned = () => {
    if (selectedAvailableIds.length === 0) return;
    const move = availableRoles.filter((r) => selectedAvailableIds.includes(r.id));
    const remaining = availableRoles.filter((r) => !selectedAvailableIds.includes(r.id));
    setAssignedRoles((prev) => {
      const merged = [...prev, ...move.map((r) => ({ id: r.id, label: r.role }))];
      // Deduplicate by id
      const seen = new Set();
      return merged.filter((r) => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });
    });
    setAvailableRoles(remaining);
    setSelectedAvailableIds([]);
  };

  const moveToAvailable = () => {
    if (selectedAssignedIds.length === 0) return;
    const move = assignedRoles.filter((r) => selectedAssignedIds.includes(r.id));
    const remaining = assignedRoles.filter((r) => !selectedAssignedIds.includes(r.id));
    const backToAvailable = move.map((r) => {
      const found = allRoles.find((ar) => ar.id === r.id);
      return found ? found : { id: r.id, role: r.label };
    });
    setAvailableRoles((prev) => {
      const merged = [...prev, ...backToAvailable];
      const seen = new Set();
      return merged.filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
    });
    setAssignedRoles(remaining);
    setSelectedAssignedIds([]);
  };

  const assignRole = async (roleId) => {
    if (!selectedUser) return false;
    try {
      if (!token) {
        showPopup("User is not authenticated. Please log in again.");
        return false;
      }
      const response = await axios.post(
        `${API_HOST}/api/EmpRole/assign`,
        null, // no body, using query params
        {
          params: {
            empId: selectedUser.employeeId,
            roleId: roleId,
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status !== 200) {
        throw new Error("Failed to add role.");
      }
      return true;
    } catch (error) {
      console.error("Error adding selected role:", error.response ? error.response.data : error.message);
      showPopup("An error occurred while adding the role. Please try again.");
      return false;
    }
  };


  const changeRoleStatus = async (roleId, status) => {
    if (!empId) return false;
    try {
      const updatedRoleRequest = {
        status,
        roleId,
        empId,
      };
      const response = await axios.put(
        `${API_HOST}/api/EmpRole/changeRoleStatus`,
        updatedRoleRequest,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.status !== 200) throw new Error("Failed to toggle role status");
      return true;
    } catch (error) {
      console.error("Error toggling role status:", error.response ? error.response.data : error.message);
      showPopup(error.response?.data?.message || "An error occurred. Please try again.");
      return false;
    }
  };

  const handleUpdate = async () => {
    if (!selectedUser) return;

    const currentAssignedIds = assignedRoles.map((r) => r.id);
    const toAdd = currentAssignedIds.filter((id) => !originalAssignedIds.includes(id));
    const toRemove = originalAssignedIds.filter((id) => !currentAssignedIds.includes(id));

    if (toAdd.length === 0 && toRemove.length === 0) {
      showPopup("No changes detected. Nothing to update.", "info");
      return;
    }

    setIsLoading(true);

    try {
      for (const roleId of toAdd) {
        const ok = await assignRole(roleId);
        if (!ok) throw new Error("Add role failed");
      }

      for (const roleId of toRemove) {
        const ok = await changeRoleStatus(roleId, false);
        if (!ok) throw new Error("Deactivate role failed");
      }

      showPopup("Roles updated successfully!", "success");
      await fetchUsers();
      setShowForm(false);
      setSelectedUser(null);
    } catch (e) {
      console.error(e);
      showPopup("Update failed. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setSelectedUser(null);
    setSelectedAvailableIds([]);
    setSelectedAssignedIds([]);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = { day: "2-digit", month: "2-digit", year: "numeric" };
    return date.toLocaleDateString("en-GB", options);
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch = Object.values(user).some(
      (value) =>
        value &&
        value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );

    const matchesBranch =
      !selectedBranch || user.branchName === branchData.find(b => b.id === Number(selectedBranch))?.name;

    const matchesDepartment =
      !selectedDepartment || user.departmentName === departmentData.find(d => d.id === Number(selectedDepartment))?.name;

    return matchesSearch && matchesBranch && matchesDepartment;
  });




  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return <LoadingComponent />;
  }

  return (
    <div className="px-2 ">
      <h1 className="text-2xl mb-1 font-semibold">
        <AutoTranslate>Manage Employee Roles</AutoTranslate>
      </h1>
      <div className="bg-white p-4 rounded-lg shadow-sm">
        {popupMessage && (
          <Popup
            message={popupMessage.message}
            type={popupMessage.type}
            onClose={popupMessage.onClose}
          />
        )}

        {/* Top Controls */}
        {!showForm && (
          <div className="mb-4 bg-slate-100 p-4 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Items Per Page */}
            <div className="flex items-center bg-blue-500 rounded-lg w-full flex-1 md:w-1/4">
              <label htmlFor="itemsPerPage" className="mr-2 ml-2 text-white text-sm">
                <AutoTranslate>Show:</AutoTranslate>
              </label>
              <select
                id="itemsPerPage"
                className="border rounded-r-lg p-1.5 outline-none w-full"
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                {[5, 10, 15, 20].map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </select>
            </div>

            {/* Branch Filter */}
            <div className="flex items-center bg-blue-500 rounded-lg w-full flex-1 md:w-1/4">
              <label htmlFor="branchFilter" className="mr-2 ml-2 text-white text-sm">
                <AutoTranslate>Branch</AutoTranslate>
              </label>
              <select
                id="branchFilter"
                className="border rounded-r-lg p-1.5 outline-none w-full"
                value={selectedBranch}
                onChange={(e) => {
                  setSelectedBranch(e.target.value);
                  setSelectedDepartment(""); // reset department when branch changes
                  setCurrentPage(1);
                }}
              >
                <option value="">All</option>
                {branchData.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>


            {/* Department Filter */}
            <div className="flex items-center bg-blue-500 rounded-lg w-full flex-1 md:w-1/4">
              <label htmlFor="departmentFilter" className="mr-2 ml-2 text-white text-sm">
                <AutoTranslate>Department</AutoTranslate>
              </label>
              <select
                id="departmentFilter"
                className="border rounded-r-lg p-1.5 outline-none w-full"
                value={selectedDepartment}
                onChange={(e) => {
                  setSelectedDepartment(e.target.value);
                  setCurrentPage(1);
                }}
                disabled={!selectedBranch}
              >
                <option value="">All</option>
                {departmentData.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>



            {/* Search */}
            <div className="flex items-center w-full md:w-1/4 flex-1">
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
        )}


        {/* List or Inline Form */}
        {!showForm ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border p-2 text-left"><AutoTranslate>SN</AutoTranslate></th>
                  <th className="border p-2 text-left"><AutoTranslate>Name</AutoTranslate></th>
                  <th className="border p-2 text-left"><AutoTranslate>Email</AutoTranslate></th>
                  <th className="border p-2 text-left"><AutoTranslate>Mobile No.</AutoTranslate></th>
                  <th className="border p-2 text-left"><AutoTranslate>Branch</AutoTranslate></th>
                  <th className="border p-2 text-left"><AutoTranslate>Department</AutoTranslate></th>
                  <th className="border p-2 text-left"><AutoTranslate>CreatedBy</AutoTranslate></th>
                  <th className="border p-2 text-left"><AutoTranslate>UpdatedBy</AutoTranslate></th>
                  <th className="border p-2 text-left"><AutoTranslate>Created Date</AutoTranslate></th>
                  <th className="border p-2 text-left"><AutoTranslate>Updated Date</AutoTranslate></th>
                  <th className="border p-2 text-left"><AutoTranslate>Role</AutoTranslate></th>
                  <th className="border p-2 text-left"><AutoTranslate>Manage Role</AutoTranslate></th>
                </tr>

              </thead>
              <tbody>
                {paginatedUsers.length > 0 ? (
                  paginatedUsers.map((user, index) => (
                    <tr key={user.id}>
                      <td className="border p-2">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td className="border p-2">{user?.name || "N/A"}</td>
                      <td className="border p-2">{user?.email || "N/A"}</td>
                      <td className="border p-2">{user?.mobile || "N/A"}</td>
                      <td className="border p-2">{user.branchName || "N/A"}</td>
                      <td className="border p-2">{user.departmentName || "N/A"}</td>
                      <td className="border p-2">{user.createdByName || "N/A"}</td>
                      <td className="border p-2">{user.updatedByName || "N/A"}</td>
                      <td className="border p-2">
                        {user?.createdOn ? formatDate(user.createdOn) : "N/A"}
                      </td>
                      <td className="border p-2">
                        {user?.updatedOn ? formatDate(user.updatedOn) : "N/A"}
                      </td>
                      <td className="border p-2">{user.roleName || "No Role"}</td>
                      <td className="border p-2">
                        <button onClick={() => HandleEditRole(user)}>
                          <PencilIcon className="h-6 w-6 text-white bg-yellow-400 rounded-xl p-1" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={12} className="border p-2 text-center">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center mt-4">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || totalPages === 0}
                className={`px-3 py-1 rounded mr-3 ${currentPage === 1 || totalPages === 0
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-slate-200 hover:bg-slate-300"
                  }`}
              >
                <ArrowLeftIcon className="inline h-4 w-4 mr-2 mb-1" />

                <AutoTranslate>Previous</AutoTranslate>

              </button>

              {totalPages > 0 &&
                Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded mx-1 ${currentPage === page
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
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className={`px-3 py-1 rounded ml-3 ${currentPage === totalPages || totalPages === 0
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
                    {`Here are items ${totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to ${Math.min(currentPage * itemsPerPage, totalItems)} out of ${totalItems}`}
                  </AutoTranslate>
                </span>
              </div>
            </div>
          </div>
        ) : (
          <form className="space-y-4">
            <div className="flex items-center justify-between">

              <h2 className="text-xl font-semibold">
                <AutoTranslate>
                  {selectedUser ? `Edit Roles for ${selectedUser.name || "User"}` : "Edit User"}
                </AutoTranslate>
              </h2>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleUpdate}
                  disabled={isLoading}
                  className={`bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded ${isLoading ? "opacity-70 cursor-not-allowed" : ""
                    }`}
                >
                  <AutoTranslate>
                    {isLoading ? "Updating..." : "Update"}
                  </AutoTranslate>
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                >
                  <AutoTranslate>
                    Back
                  </AutoTranslate>
                </button>
              </div>
            </div>

            {/* Read-only identity fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>

                <label className="text-sm text-gray-700">
                  <AutoTranslate>Name</AutoTranslate>
                </label>
                <input
                  className="mt-1 w-full border rounded px-3 py-2 bg-gray-100"
                  value={selectedUser?.name || "N/A"}
                  readOnly
                />
              </div>
              <div>

                <label className="text-sm text-gray-700">
                  <AutoTranslate>Email</AutoTranslate>
                </label>
                <input
                  className="mt-1 w-full border rounded px-3 py-2 bg-gray-100"
                  value={selectedUser?.email || "N/A"}
                  readOnly
                />
              </div>
              <div>

                <label className="text-sm text-gray-700">
                  <AutoTranslate>Mobile</AutoTranslate>
                </label>

                <input
                  className="mt-1 w-full border rounded px-3 py-2 bg-gray-100"
                  value={
                    selectedUser?.mobile
                      ? `+91 ${selectedUser.mobile}`
                      : "N/A"
                  }
                  readOnly
                />
              </div>

              <div>

                <label className="text-sm text-gray-700">
                  <AutoTranslate>Branch</AutoTranslate>
                </label>

                <input
                  className="mt-1 w-full border rounded px-3 py-2 bg-gray-100"
                  value={selectedUser?.branchName || "N/A"}
                  readOnly
                />
              </div>
              <div>

                <label className="text-sm text-gray-700">
                  <AutoTranslate>Department</AutoTranslate>
                </label>

                <input
                  className="mt-1 w-full border rounded px-3 py-2 bg-gray-100"
                  value={selectedUser?.departmentName || "N/A"}
                  readOnly
                />
              </div>
              <div>

                <label className="text-sm text-gray-700">
                  <AutoTranslate>Status</AutoTranslate>
                </label>

                <input
                  className="mt-1 w-full border rounded px-3 py-2 bg-gray-100"
                  value={selectedUser?.status || "N/A"}
                  readOnly
                />
              </div>
            </div>

            {/* Dual list for roles */}
            <div className="mt-2">

              <label className="block font-semibold mb-2">
                <AutoTranslate>Role Assigned</AutoTranslate>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {/* All Roles */}
                <div className="md:col-span-2">
                  <label className="text-sm font-medium mb-1 block">
                    <AutoTranslate>All Roles</AutoTranslate>
                  </label>

                  <select
                    multiple
                    size={8}
                    className="w-full border rounded px-2 py-2"
                    onChange={onChangeAvailableSelect}
                  >
                    {availableRoles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.role}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Arrows */}
                <div className="flex flex-row md:flex-col items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={moveToAssigned}
                    className="bg-slate-200 hover:bg-slate-300 rounded p-2"
                    title="Assign"
                  >
                    <ArrowRightIcon className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={moveToAvailable}
                    className="bg-slate-200 hover:bg-slate-300 rounded p-2"
                    title="Remove"
                  >
                    <ArrowLeftIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Assigned Roles */}
                <div className="md:col-span-2">

                  <label className="text-sm font-medium mb-1 block">
                    <AutoTranslate>Assigned Roles</AutoTranslate>
                  </label>
                  <select
                    multiple
                    size={8}
                    className="w-full border rounded px-2 py-2"
                    onChange={onChangeAssignedSelect}
                  >
                    {assignedRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ManageUserRole;