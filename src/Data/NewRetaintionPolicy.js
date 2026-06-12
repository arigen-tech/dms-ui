import { useState, useEffect, useRef } from "react"
import { IoIosArrowForward, IoIosArrowBack } from "react-icons/io";
import {
    PlusCircleIcon, PencilIcon, ArrowLeftIcon,
    ArrowRightIcon, MagnifyingGlassIcon
} from "@heroicons/react/24/solid"
import { API_HOST, DEPAETMENT_API, BRANCH_API, CATEGORI_API } from "../API/apiConfig"
import Popup from "../Components/Popup"
import LoadingComponent from "../Components/LoadingComponent"
import AutoTranslate from '../i18n/AutoTranslate'
import { useLanguage } from '../i18n/LanguageContext'
import { getFallbackTranslation } from '../i18n/autoTranslator'
import apiClient from "../API/apiClient";


const NewRetaintionPolicy = () => {
    const {
        currentLanguage,
        defaultLanguage,
        translationStatus,
        isTranslationNeeded,
        availableLanguages,
        changeLanguage,
        translate,
        preloadTranslationsForTerms
    } = useLanguage()

    const [policies, setPolicies] = useState([])
    const [branches, setBranches] = useState([])
    const [departments, setDepartments] = useState([])
    const [allDepartments, setAllDepartments] = useState([])
    const [categories, setCategories] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [popupMessage, setPopupMessage] = useState(null)
    const [selectedBranch, setSelectedBranch] = useState("")
    const [searchTerm, setSearchTerm] = useState("")
    const [itemsPerPage, setItemsPerPage] = useState(5)
    const [currentPage, setCurrentPage] = useState(1)
    const [modalVisible, setModalVisible] = useState(false)
    const [policyToToggle, setPolicyToToggle] = useState(null)
    const [downloadingId, setDownloadingId] = useState(null);
    const [formData, setFormData] = useState({
        description: "",
        fromdate: "",
        todate: "",
        retentionDate: "",
        retentionTime: "",
        isActive: true,
        policyType: "FILE_RETENTION",
        departmentId: "",
        branchId: "",
        categoryId: "",
    })
    const [isEditing, setIsEditing] = useState(false)
    const [editId, setEditId] = useState(null)

    // Create a ref for the form section
    const formRef = useRef(null)

    // Debug log
    useEffect(() => {
        console.log('🔍 NewRetaintionPolicy Component - Language Status:', {
            currentLanguage,
            defaultLanguage,
            isTranslationNeeded: isTranslationNeeded(),
            translationStatus,
            availableLanguagesCount: availableLanguages.length,
            pathname: window.location.pathname
        });
    }, [currentLanguage, defaultLanguage, translationStatus, isTranslationNeeded, availableLanguages]);

    useEffect(() => {
        const fetchInitialData = async () => {
            setIsLoading(true);
            try {
                await Promise.all([
                    fetchBranches(),
                    fetchAllDepartments(),
                    fetchCategory()
                ]);
                await fetchPolicies();
            } catch (error) {
                console.error("Error loading initial data:", error);
                showPopup("Failed to load initial data", "error");
            } finally {
                setIsLoading(false);
            }
        };

        fetchInitialData();
    }, []);

    useEffect(() => {
        if (branches.length && allDepartments.length && policies.length) {
            setPolicies(prevPolicies =>
                prevPolicies.map((policy) => ({
                    ...policy,
                    branchName: getBranchNameById(policy.branchId),
                    departmentName: getDepartmentNameById(policy.departmentId),
                    categoryName: getCategoryNameById(policy.categoryId),
                }))
            );
        }
    }, [branches, allDepartments]);

    useEffect(() => {
        if (selectedBranch) {
            fetchDepartments(selectedBranch)
        } else {
            setDepartments([])
        }
    }, [selectedBranch])

    const scrollToForm = () => {
        if (formRef.current) {
            formRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const getBranchNameById = (id) => {
        if (!id || id === null) return "All Branches";
        const branch = branches.find(b => b.id === id);
        return branch ? branch.name : "Unknown Branch";
    };

    const getDepartmentNameById = (departmentId) => {
        if (!departmentId || departmentId === null) return "All Departments";
        const department = allDepartments.find((dept) => dept.id === departmentId);
        return department?.name || "Unknown Department";
    };

    const getCategoryNameById = (id) => {
        if (!id || id === null) return "All Categorys";
        const cat = categories.find(b => b.id === id);
        return cat ? cat.name : "Unknown Category";
    };

    const fetchPolicies = async () => {
        try {
            const token = localStorage.getItem("tokenKey");
            const response = await apiClient.get(`${API_HOST}/retention-policy/findAll`);

            const policiesData = Array.isArray(response.data?.response)
                ? response.data.response
                : [];

            const normalizedPolicies = policiesData.map((policy) => ({
                ...policy,
                isActive: policy.isActive === true || policy.isActive === 1,
                retentionDate: policy.retentionDate,
                retentionTime: policy.retentionTime,
                createdOn: Array.isArray(policy.createdOn)
                    ? convertArrayToDate(policy.createdOn)
                    : policy.createdOn,
                updatedOn: Array.isArray(policy.updatedOn)
                    ? convertArrayToDate(policy.updatedOn)
                    : policy.updatedOn,
                branchName: branches.length ? getBranchNameById(policy.branchId) : "",
                departmentName: allDepartments.length ? getDepartmentNameById(policy.departmentId) : "",
                categoryName: categories.length ? getCategoryNameById(policy.categoryId) : "",
            }));

            setPolicies(normalizedPolicies);
        } catch (error) {
            console.error("Error fetching retention policies:", error);
            showPopup("Failed to fetch retention policies", "error");
        }
    };

    function formatDate(value) {
        if (!value) return "";

        let date;
        if (Array.isArray(value)) {
            const [year, month, day, hour = 0, minute = 0, second = 0] = value;
            date = new Date(year, month - 1, day, hour, minute, second);
        } else {
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

    const formatDateTime = (dateArray, timeArray) => {
        if (!dateArray || !timeArray) return <AutoTranslate>Invalid Date</AutoTranslate>;

        const [year, month, day] = dateArray;
        const [hour = 0, minute = 0] = timeArray;

        const date = new Date(year, month - 1, day, hour, minute);

        return date.toLocaleString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        }).replace(",", " at");
    };

    const convertArrayToDate = (dateArray) => {
        if (!Array.isArray(dateArray) || dateArray.length < 6) return null
        const [year, month, day, hour, minute, second, nano = 0] = dateArray
        return new Date(year, month - 1, day, hour, minute, second, Math.floor(nano / 1000000)).toISOString()
    }

    const fetchBranches = async () => {
        try {
            const token = localStorage.getItem("tokenKey")
            const response = await apiClient.get(`${BRANCH_API}/findAll`)

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
            const response = await apiClient.get(`${DEPAETMENT_API}/findByBranch/${branchId}`)

            const departmentsData = response.data?.response || response.data || []
            setDepartments(Array.isArray(departmentsData) ? departmentsData : [departmentsData])
        } catch (error) {
            console.error("Error fetching departments:", error)
            showPopup("Failed to fetch departments", "error")
            setDepartments([])
        }
    }

    const fetchCategory = async () => {
        try {
            const token = localStorage.getItem("tokenKey")
            const response = await apiClient.get(`${CATEGORI_API}/findAll`)

            const categoriesData = response.data?.response || response.data || []
            setCategories(Array.isArray(categoriesData) ? categoriesData : [categoriesData])
        } catch (error) {
            console.error("Error fetching categories:", error)
            showPopup("Failed to fetch categories", "error")
        }
    }

    const handleDownloadZip = async (policy) => {
        if (downloadingId) return;
        setDownloadingId(policy.id);
        try {
            const response = await fetch(`${API_HOST}/archiveJob/download/${policy.id}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("tokenKey")}`,
                },
            });

            if (!response.ok) {
                throw new Error(<AutoTranslate>Failed to download ZIP</AutoTranslate>);
            }

            let fileName = `archive_${policy.id}.zip`;
            const disposition = response.headers.get("content-disposition");
            if (disposition) {
                const match = disposition.match(/filename="?([^"]+)"?/);
                if (match && match[1]) {
                    fileName = match[1];
                }
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error downloading ZIP:", error);
        } finally {
            setDownloadingId(null);
        }
    };

    const fetchAllDepartments = async () => {
        try {
            const token = localStorage.getItem("tokenKey")
            const response = await apiClient.get(`${DEPAETMENT_API}/findAll`)

            const departmentsData = response.data?.response || response.data || []
            setAllDepartments(Array.isArray(departmentsData) ? departmentsData : [departmentsData])
        } catch (error) {
            console.error("Error fetching all departments:", error)
        }
    }

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        const now = new Date();

        if (name === "fromdate" && value) {
            const fromDate = new Date(value);
            fromDate.setHours(0, 0, 0, 0);

            setFormData((prev) => ({
                ...prev,
                fromdate: value,
                fromdateTs: fromDate.getTime(),
                // reset todate if invalid
                todate: prev.todate && prev.todate <= value ? "" : prev.todate,
                todateTs: prev.todateTs && prev.todateTs <= fromDate.getTime() ? null : prev.todateTs,
            }));
        }
        else if (name === "todate" && value) {
            if (formData.fromdate && value <= formData.fromdate) {
                return;
            }

            const toDate = new Date(value);
            toDate.setHours(23, 59, 59, 999);

            setFormData((prev) => ({
                ...prev,
                todate: value,
                todateTs: toDate.getTime(),
            }));
        }
        else if (name === "retentionDate" && value) {
            // compare with todate if exists
            if (formData.todate && value <= formData.todate) {
                return;
            }

            // current time + 1 min
            const plusOneMinute = new Date();
            plusOneMinute.setMinutes(plusOneMinute.getMinutes() + 1);
            const nextMinute = plusOneMinute.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false
            });

            setFormData((prevData) => ({
                ...prevData,
                retentionDate: value,
                retentionTime: nextMinute,
            }));
        }
        else {
            setFormData({
                ...formData,
                [name]: type === "checkbox" ? checked : value,
            });
        }
    };

    const handleBranchChange = async (e) => {
        const branchId = e.target.value
        setSelectedBranch(branchId)

        setFormData({
            ...formData,
            branchId: branchId,
            departmentId: "",
        })

        if (branchId) {
            await fetchDepartments(branchId)
        } else {
            setDepartments([])
        }
    }

    const handleAddPolicy = async () => {
        if (!formData.retentionDate) {
            showPopup("Please select a retention date", "warning");
            return;
        }

        try {
            const newPolicy = {
                policyType: formData.policyType,
                description: formData.description,

                fromdate: formData.fromdate ? new Date(formData.fromdate).toISOString().slice(0, 19) : null,
                todate: formData.todate ? new Date(formData.todate).toISOString().slice(0, 19) : null,

                retentionDate: formData.retentionDate,
                retentionTime: formData.retentionTime ? formData.retentionTime + ":00" : "23:59:59",
                isActive: formData.isActive,
                departmentId: formData.departmentId || null,
                branchId: formData.branchId || null,
                categoryId: formData.categoryId || null,
            };

            const token = localStorage.getItem("tokenKey");
            await apiClient.post(`${API_HOST}/retention-policy/createNew`, newPolicy, {
                headers: {
                    "Content-Type": "application/json",
                },
            });

            await fetchPolicies();
            resetForm();
            showPopup("Policy created successfully!", "success");
        } catch (error) {
            console.error("Error creating policy:", error);

            const backendMessage = error.response?.data?.message || error.message || "Something went wrong";
            showPopup(backendMessage, "warning");
        }
    };

    const handleEditPolicy = async (policy) => {
        if (policy) {
            const parseToDate = (value) => {
                if (!value) return null;
                if (Array.isArray(value)) {
                    // Array from backend: [year, month, day, hour, minute, (second)]
                    const [year, month, day, hour = 0, minute = 0, second = 0] = value;
                    return new Date(year, month - 1, day, hour, minute, second);
                }
                return new Date(value); // in case backend sends ISO string later
            };

            const fromDateObj = parseToDate(policy.fromdate);
            const toDateObj = parseToDate(policy.todate);

            setEditId(policy?.id);
            setFormData({
                description: policy.description || "",
                fromdate: fromDateObj ? fromDateObj.toLocaleDateString("en-CA") : "",
                todate: toDateObj ? toDateObj.toLocaleDateString("en-CA") : "",
                isActive: policy.isActive === true || policy.isActive === 1,
                retentionDate: policy.retentionDate ? policy.retentionDate.join("-") : "",
                retentionTime: policy.retentionTime
                    ? `${String(policy.retentionTime[0]).padStart(2, "0")}:${String(policy.retentionTime[1]).padStart(2, "0")}`
                    : "23:59",
                policyType: policy.policyType || "FILE_RETENTION",
                departmentId: policy.departmentId || "",
                branchId: policy.branchId || "",
                categoryId: policy.categoryId || "",
            });

            if (policy.branchId) {
                setSelectedBranch(policy.branchId);
                await fetchDepartments(policy.branchId);
            } else {
                setDepartments([]);
            }

            setIsEditing(true);
            scrollToForm();
        }
    };

    const handleSaveEdit = async () => {
        try {
            const policyIndex = policies.findIndex((policy) => policy.id === editId);
            if (policyIndex === -1) {
                showPopup("Policy not found!", "error");
                return;
            }

            const formatDate = (dateStr) => {
                if (!dateStr) return null;
                const d = new Date(dateStr);
                return d.toISOString().split("T")[0];
            };

            const updatedPolicy = {
                ...policies[policyIndex],
                policyType: formData.policyType,
                description: formData.description,

                fromdate: formData.fromdate
                    ? new Date(formData.fromdate).toISOString().slice(0, 19)
                    : null,
                todate: formData.todate
                    ? new Date(formData.todate).toISOString().slice(0, 19)
                    : null,

                retentionDate: formatDate(formData.retentionDate),
                retentionTime: formData.retentionTime
                    ? formData.retentionTime + ":00"
                    : "23:59:00",
                isActive: !!formData.isActive,
                departmentId: Number(formData.departmentId) || null,
                branchId: Number(formData.branchId) || null,
                categoryId: Number(formData.categoryId) || null,
                updatedOn: new Date().toISOString().slice(0, 19),
            };

            await apiClient.put(
                `${API_HOST}/retention-policy/updateNewPolicy/${updatedPolicy.id}`,
                updatedPolicy,
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );

            await fetchPolicies();
            resetForm();
            showPopup("Retention policy updated successfully!", "success");
        } catch (error) {
            console.error("Error creating policy:", error);
            const backendMessage =
                error.response?.data?.message || error.message || "Something went wrong";
            showPopup(backendMessage, "warning");
        }
    };

    const resetForm = () => {
        setFormData({
            description: "",
            retentionDate: "",
            retentionTime: "",
            isActive: true,
            policyType: "FILE_RETENTION",
            departmentId: "",
            branchId: "",
        });
        setEditId(null);
        setIsEditing(false);
        setSelectedBranch("");
        setDepartments([]);
    };

    const confirmToggleActiveStatus = async () => {
        if (policyToToggle) {
            try {
                const newActiveStatus = !policyToToggle.isActive;
                const statusUpdateData = { isActive: newActiveStatus };

                const token = localStorage.getItem("tokenKey");
                await apiClient.put(
                    `${API_HOST}/retention-policy/updatestatus/${policyToToggle.id}`,
                    statusUpdateData,
                    {
                        headers: {
                            "Content-Type": "application/json",
                        },
                    },
                );

                await fetchPolicies();
                setModalVisible(false);
                setPolicyToToggle(null);

                const statusText = newActiveStatus ? "activated" : "deactivated";
                showPopup(`Policy ${statusText} successfully!`, "success");
            } catch (error) {
                console.error("Error toggling policy status:", error);
                showPopup("Failed to change the status", "error");
                setModalVisible(false);
                setPolicyToToggle(null);
            }
        }
    };

    const showPopup = (message, type = "info") => {
        setPopupMessage({
            message,
            type,
            onClose: () => {
                setPopupMessage(null)
            },
        })
    }

    const filteredPolicies = policies.filter((policy) => {
        const searchLower = searchTerm.toLowerCase()
        const branchName = policy.branchName || getBranchNameById(policy.branchId)
        const departmentName = policy.departmentName || getDepartmentNameById(policy.departmentId)
        const categoryName = policy.categoryName || getCategoryNameById(policy.categoryId)

        return (
            (policy.policyType || "").toLowerCase().includes(searchLower) ||
            branchName.toLowerCase().includes(searchLower) ||
            departmentName.toLowerCase().includes(searchLower) ||
            categoryName.toLowerCase().includes(searchLower)
        )
    })

    const sortedPolicies = filteredPolicies.sort((a, b) => {
        return (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0)
    })

    const totalItems = sortedPolicies.length
    const totalPages = Math.ceil(totalItems / itemsPerPage)
    const paginatedPolicies = sortedPolicies.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    const getPageNumbers = () => {
        const maxPageNumbers = 5;
        const startPage = Math.floor((currentPage - 1) / maxPageNumbers) * maxPageNumbers + 1;
        const endPage = Math.min(startPage + maxPageNumbers - 1, totalPages);
        return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
    };

    if (isLoading) {
        return <LoadingComponent />;
    }

    return (
        <div className="px-2-">
            <div className="title">
                <h1><AutoTranslate>Archival Policies</AutoTranslate></h1>
            </div>

            <div className="card">
                {popupMessage && (
                    <Popup message={popupMessage.message} type={popupMessage.type} onClose={popupMessage.onClose} />
                )}

                {/* Policy Form with ref */}
                <div ref={formRef} className="mb-8">
                    <div className="grid grid-col-4 mb-4">
                        <div className="form-group ">
                            <label>
                                <AutoTranslate>PolicyType</AutoTranslate> <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="policyType"
                                value={formData.policyType}
                                onChange={handleInputChange}>
                                <option value="FILE_RETENTION"><AutoTranslate>File Retention Policy</AutoTranslate></option>
                                <option value="DATA_RETENTION"><AutoTranslate>Data Retention Policy</AutoTranslate></option>
                            </select>
                        </div>
                        <div className="form-group ">
                            <label>
                                <AutoTranslate>From Date</AutoTranslate> <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                name="fromdate"
                                value={formData.fromdate || ''}
                                onChange={handleInputChange} />
                        </div>
                        <div className="form-group ">
                            <label>
                                <AutoTranslate>To Date</AutoTranslate> <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                name="todate"
                                value={formData.todate || ''}
                                onChange={handleInputChange}
                                min={
                                    formData.fromdate
                                        ? (() => {
                                            const d = new Date(formData.fromdate);
                                            d.setDate(d.getDate() + 1);
                                            return d.toISOString().split("T")[0];
                                        })()
                                        : new Date().toISOString().split("T")[0]
                                } />
                        </div>
                        <div className="form-group ">
                            <label>
                                <AutoTranslate>Date of Archival</AutoTranslate> <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                name="retentionDate"
                                value={formData.retentionDate || ""}
                                onChange={handleInputChange}
                                min={(() => {
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);

                                    if (formData.todate) {
                                        const toDate = new Date(formData.todate);
                                        toDate.setHours(0, 0, 0, 0);

                                        if (toDate > today) {
                                            toDate.setDate(toDate.getDate() + 1);
                                            return toDate.toISOString().split("T")[0];
                                        } else {
                                            today.setDate(today.getDate() + 1);
                                            return today.toISOString().split("T")[0];
                                        }
                                    } else {
                                        today.setDate(today.getDate() + 1);
                                        return today.toISOString().split("T")[0];
                                    }
                                })()}
                            />
                        </div>
                        <div className="form-group ">
                            <label>
                                <AutoTranslate>Archival Time</AutoTranslate>
                            </label>
                            <input
                                type="time"
                                name="retentionTime"
                                value={formData.retentionTime || ""}
                                onChange={handleInputChange} />
                        </div>
                        <div className="form-group ">
                            <label>
                                <AutoTranslate>Branch</AutoTranslate> <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="branchId"
                                value={formData.branchId}
                                onChange={handleBranchChange}>
                                <option value=""><AutoTranslate>All Branch</AutoTranslate></option>
                                {branches.map((branch) => (
                                    <option key={branch.id} value={branch.id}>
                                        {branch.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group ">
                            <label>
                                <AutoTranslate>Department</AutoTranslate> <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="departmentId"
                                value={formData.departmentId}
                                onChange={handleInputChange}
                                disabled={!formData.branchId}>
                                <option value=""><AutoTranslate>All Departments</AutoTranslate></option>
                                {departments.map((department) => (
                                    <option key={department.id} value={department.id}>
                                        {department.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group ">
                            <label>
                                <AutoTranslate>Category</AutoTranslate> <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="categoryId"
                                value={formData.categoryId}
                                onChange={handleInputChange}>
                                <option value=""><AutoTranslate>All Category</AutoTranslate></option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group ">
                            <label>
                                <AutoTranslate>Archive Description</AutoTranslate>
                            </label><textarea
                                placeholder={getFallbackTranslation(
                                    'Enter policy description',
                                    currentLanguage
                                )}
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                rows="3"
                            />
                        </div>
                        <div className="form-group flex itemEnd gap-4">
                            {!isEditing ? (
                                <button
                                    onClick={handleAddPolicy}
                                    className="btn-primary flex items-center justify-center"
                                >
                                    <PlusCircleIcon className="h-5 w-5 mr-1" />
                                    <AutoTranslate>Add Policy</AutoTranslate>
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={handleSaveEdit}
                                        className="btn-primary flex items-center justify-center"
                                    >
                                        <AutoTranslate>Update Policy</AutoTranslate>
                                    </button>
                                    <button onClick={resetForm} className="btn-cancel">
                                        <AutoTranslate>Cancel</AutoTranslate>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>


                </div>


                {/* Search and Filter */}
                <div className="data-search-wrapper">
                    <div className="form-group flex items-center gap-4">
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

                    <div className="form-group">
                        <input
                            type="text"
                            placeholder={getFallbackTranslation(
                                'Search...',
                                currentLanguage
                            )}
                            className="searchIcon"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Policies Table */}
                <div className="table-wrapper">
                    <table className="">
                        <thead>
                            <tr>
                                <th className="text-center"><AutoTranslate>SN</AutoTranslate></th>
                                <th><AutoTranslate>PolicyType</AutoTranslate></th>
                                <th><AutoTranslate>Archival Period</AutoTranslate></th>
                                <th><AutoTranslate>Archive Date & Time</AutoTranslate></th>
                                <th><AutoTranslate>Branch</AutoTranslate></th>
                                <th><AutoTranslate>Department</AutoTranslate></th>
                                <th><AutoTranslate>Category</AutoTranslate></th>
                                <th><AutoTranslate>Description</AutoTranslate></th>
                                <th className="text-center"><AutoTranslate>Status</AutoTranslate></th>
                                <th className="text-center"><AutoTranslate>Edit</AutoTranslate></th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedPolicies.map((policy, index) => (
                                <tr key={policy.id}>
                                    <td className="text-center">
                                        {index + 1 + (currentPage - 1) * itemsPerPage}
                                    </td>
                                    <td>
                                        <span
                                            className={`status ${policy.policyType === "FILE_RETENTION"
                                                ? "blueBg"
                                                : "pending"
                                                }`}
                                        >
                                            {policy.policyType === "FILE_RETENTION"
                                                ? "File Retention"
                                                : "Data Retention"}
                                        </span>
                                    </td>
                                    <td>
                                        {`${formatDate(policy.fromdate)} TO ${formatDate(policy.todate)}`}
                                    </td>
                                    <td>
                                        {formatDateTime(policy.retentionDate, policy.retentionTime)}
                                    </td>
                                    <td>
                                        {policy.branchName || getBranchNameById(policy.branchId)}
                                    </td>
                                    <td>
                                        {policy.departmentName || getDepartmentNameById(policy.departmentId)}
                                    </td>
                                    <td>
                                        {policy.categoryName || getCategoryNameById(policy.categoryId)}
                                    </td>
                                    <td>
                                        {policy.description || "-"}
                                    </td>
                                    <td className="text-center">
                                        <span
                                            className={`status ${policy.isActive
                                                ? "pending"
                                                : "allowed"
                                                }`}
                                        >
                                            {policy.isActive ? "Waiting For Archive: " : "Archived"}
                                        </span>
                                    </td>
                                    <td className="text-center">
                                        <div className="btn-center">
                                            <button
                                                onClick={() => handleEditPolicy(policy)}
                                                disabled={!policy.isActive}
                                                className={`viewBtn ${!policy.isActive ? "opacity-50 cursor-not-allowed" : ""}`}
                                            >
                                                <PencilIcon />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
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
                            {totalPages > 0 && getPageNumbers().map((page) => (
                                <button key={page} onClick={() => setCurrentPage(page)} className={`${currentPage === page ? "active" : ""}`}>
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
            </div>

            {/* Confirmation Modal */}
            {modalVisible && (
            <div className="overlayModal">
                <div className="document-modal modal-sm">
                    {/* Header */}
                    <div className="modal-header">
                        <div className="modal-title">
                            <h2><AutoTranslate>Confirm Status Change</AutoTranslate></h2>
                        </div>
                    </div>

                    {/* Modal body Content */}
                    <div className="modal-body">
                        <div className="bodyScroller print:overflow-visible print:max-h-none">
                            <p className="mb-4">
                                <AutoTranslate>
                                    Are you sure you want to {policyToToggle?.isActive ? "deactivate" : "activate"} this retention policy
                                </AutoTranslate>
                                <strong> "{policyToToggle?.policyType === "FILE_RETENTION" ?
                                    <AutoTranslate>File Retention</AutoTranslate> :
                                    <AutoTranslate>Data Retention</AutoTranslate>
                                }"</strong>?
                            </p>
                            <div className="flex justify-end gap-4">
                                <button
                                    onClick={() => {
                                        setModalVisible(false)
                                        setPolicyToToggle(null)
                                    }}
                                    className="btn-cancel"
                                >
                                    <AutoTranslate>Cancel</AutoTranslate>
                                </button>
                                <button onClick={confirmToggleActiveStatus} className="btn-primary">
                                    <AutoTranslate>Confirm</AutoTranslate>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            )}
        </div>
    )
}

export default NewRetaintionPolicy