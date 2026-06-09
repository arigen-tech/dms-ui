import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API_HOST, ROLE_API, BRANCH_ADMIN } from "../API/apiConfig";
import { MdEdit } from "react-icons/md";
import { IoIosArrowForward, IoIosArrowBack } from "react-icons/io";
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
import apiClient from "../API/apiClient";



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
  const employeId = typeof window !== "undefined" ? localStorage.getItem("id") : null;
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
      const response = await apiClient.get(`${API_HOST}/branchmaster/findActiveRole`);
      setBranchData(response.data);
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  };

  const fetchDepartments = async (branchId) => {
    try {
      const token = localStorage.getItem("tokenKey");
      const response = await apiClient.get(`${API_HOST}/DepartmentMaster/findByBranch/${branchId}`);
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
      const userResponse = await apiClient.get(`${API_HOST}/employee/findById/${employeId}`);

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
        response = await apiClient.get(`${API_HOST}/api/EmpRole/branch/${currBranchId}`);
      } else {
        response = await apiClient.get(`${API_HOST}/api/EmpRole/employees`);
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

  // debugger;
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
      const rolesResponse = await apiClient.get(`${ROLE_API}/findAll`);

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
      const response = await apiClient.post(
        `${API_HOST}/api/EmpRole/assign`,
        null, // no body, using query params
        {
          params: {
            empId: selectedUser.employeeId,
            roleId: roleId,
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
      const response = await apiClient.put(
        `${API_HOST}/api/EmpRole/changeRoleStatus`,
        updatedRoleRequest,
        {
          headers: {
            "Content-Type": "application/json",
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
    <div className="px-2-">
      <div className="title">
        <h1><AutoTranslate>Mange Users Roles</AutoTranslate></h1>
      </div>

      {popupMessage && (
        <Popup
          message={popupMessage.message}
          type={popupMessage.type}
          onClose={popupMessage.onClose}
        />
      )}

      <div className="card">
        {/* Top Controls */}
        {!showForm && (
          <div className="grid grid-col-4 mb-6">
            {/* Items Per Page */}
            <div className="form-group ">
              <label htmlFor="itemsPerPage">
                <AutoTranslate>Show:</AutoTranslate>
              </label>
              <select
                id="itemsPerPage"
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
            <div className="form-group ">
              <label htmlFor="branchFilter">
                <AutoTranslate>Branch</AutoTranslate>
              </label>
              <select
                id="branchFilter"
                value={selectedBranch}
                onChange={(e) => {
                  setSelectedBranch(e.target.value);
                  setSelectedDepartment(""); // reset department when branch changes
                  setCurrentPage(1);
                }}
              >
                <option value="">
                  <AutoTranslate>
                    All
                  </AutoTranslate>
                </option>
                {branchData.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Department Filter */}
            <div className="form-group ">
              <label htmlFor="departmentFilter">
                <AutoTranslate>Department</AutoTranslate>
              </label>
              <select
                id="departmentFilter"
                value={selectedDepartment}
                onChange={(e) => {
                  setSelectedDepartment(e.target.value);
                  setCurrentPage(1);
                }}
                disabled={!selectedBranch}
              >
                <option value="">
                  <AutoTranslate>All</AutoTranslate>
                </option>
                {departmentData.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div className="form-group ">
              <label htmlFor="searchTerm">
                <AutoTranslate>Search</AutoTranslate>
              </label>
              <input
                type="text"
                id="searchTerm"
                placeholder={translatedPlaceholders.search}
                className="searchIcon"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* List or Inline Form */}
        {!showForm ? (
          <>
            <div className="table-wrapper">
              <table className="">
                <thead>
                  <tr>
                    <th className="text-center"><AutoTranslate>SN</AutoTranslate></th>
                    <th><AutoTranslate>Name</AutoTranslate></th>
                    <th><AutoTranslate>Email</AutoTranslate></th>
                    <th><AutoTranslate>Mobile No.</AutoTranslate></th>
                    <th><AutoTranslate>Branch</AutoTranslate></th>
                    <th><AutoTranslate>Department</AutoTranslate></th>
                    <th><AutoTranslate>CreatedBy</AutoTranslate></th>
                    <th><AutoTranslate>UpdatedBy</AutoTranslate></th>
                    <th><AutoTranslate>Created Date</AutoTranslate></th>
                    <th><AutoTranslate>Updated Date</AutoTranslate></th>
                    <th><AutoTranslate>Role</AutoTranslate></th>
                    <th><AutoTranslate>Manage Role</AutoTranslate></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.length > 0 ? (
                    paginatedUsers.map((user, index) => (
                      <tr key={user.id}>
                        <td className="text-center">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </td>
                        <td>{user?.name || "N/A"}</td>
                        <td>{user?.email || "N/A"}</td>
                        <td>{user?.mobile || "N/A"}</td>
                        <td>{user.branchName || "N/A"}</td>
                        <td>{user.departmentName || "N/A"}</td>
                        <td>{user.createdByName || "N/A"}</td>
                        <td>{user.updatedByName || "N/A"}</td>
                        <td>
                          {user?.createdOn ? formatDate(user.createdOn) : "N/A"}
                        </td>
                        <td>
                          {user?.updatedOn ? formatDate(user.updatedOn) : "N/A"}
                        </td>
                        <td>{user.roleName || "No Role"}</td>
                        <td>
                          <div className="btn-center">
                            <button className="viewBtn" onClick={() => HandleEditRole(user)}>
                              <MdEdit />
                            </button>
                          </div>
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
            </div>

            {/* Pagination Controls */}
            <div className="paginationWp">
              <div className="items">
                <div className="paginationText">
                  <span className="text-sm text-gray-700">
                    <AutoTranslate>
                      {`Showing ${totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0
                        } to ${Math.min(currentPage * itemsPerPage, totalItems)} of ${totalItems} entries.`}
                    </AutoTranslate>
                  </span>
                  {/* Page Count Info */}
                  <span className="text-sm text-gray-700 mx-2">
                    (<AutoTranslate>Pages</AutoTranslate> {totalPages})
                  </span>
                </div>
              </div>
              <div className="items">
                <div className="paginationBtn">
                  {/* Previous Button */}
                  <button title={`${currentPage === 1 || totalPages === 0 ? "End" : "Previous"}`}
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1 || totalPages === 0}
                    className={`${currentPage === 1 || totalPages === 0 ? "cursor-not-allowed" : ""}`}
                  >
                    <IoIosArrowBack />
                  </button>
                  {/* Page Number Buttons */}
                  {totalPages > 0 &&
                    Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`${currentPage === page ? "active" : ""}`}>
                        {page}
                      </button>
                    ))}
                  {/* Next Button */}
                  <button title={`${currentPage === totalPages || totalPages === 0 ? "End" : "Next"}`}
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className={`${currentPage === totalPages || totalPages === 0 ? "cursor-not-allowed" : ""}`}
                  >
                    <IoIosArrowForward />
                  </button>

                </div>
              </div>
            </div>
          </>
        ) : (
          <form className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="mb-0">
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
            <div className="grid grid-col-4 mb-4">
              <div className="form-group ">
                <label>
                  <AutoTranslate>Name</AutoTranslate>
                </label>
                <input
                  value={selectedUser?.name || "N/A"}
                  readOnly
                />
              </div>
              <div className="form-group ">
                <label>
                  <AutoTranslate>Email</AutoTranslate>
                </label>
                <input
                  value={selectedUser?.email || "N/A"}
                  readOnly
                />
              </div>
              <div className="form-group ">
                <label>
                  <AutoTranslate>Mobile</AutoTranslate>
                </label>
                <input
                  value={
                    selectedUser?.mobile
                      ? `+91 ${selectedUser.mobile}`
                      : "N/A"
                  }
                  readOnly
                />
              </div>
              <div className="form-group ">

                <label>
                  <AutoTranslate>Branch</AutoTranslate>
                </label>

                <input
                  value={selectedUser?.branchName || "N/A"}
                  readOnly
                />
              </div>
              <div className="form-group ">
                <label>
                  <AutoTranslate>Department</AutoTranslate>
                </label>

                <input
                  value={selectedUser?.departmentName || "N/A"}
                  readOnly
                />
              </div>
              <div className="form-group ">
                <label>
                  <AutoTranslate>Status</AutoTranslate>
                </label>
                <input
                  value={selectedUser?.status || "N/A"}
                  readOnly
                />
              </div>
            </div>

            {/* Dual list for roles */}
            <div className="mt-2">

              <h2>
                <AutoTranslate>Role Assigned</AutoTranslate>
              </h2>



              <div className="role-wrapper">
                {/* All Roles */}
                <div className="role-card">
                  <label>
                    <AutoTranslate>All Roles</AutoTranslate>
                  </label>

                  <select multiple size={8} onChange={onChangeAvailableSelect}>
                    {availableRoles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.role}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Arrows */}
                <div className="action-buttons">
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
                <div className="role-card listAssigned">
                  <label>
                    <AutoTranslate>Assigned Roles</AutoTranslate>
                  </label>
                  <select multiple size={8} onChange={onChangeAssignedSelect}>
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