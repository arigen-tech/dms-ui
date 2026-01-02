import { useState, useEffect, useRef } from "react"
import axios from "axios"
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
                showPopup(<AutoTranslate>Failed to load initial data</AutoTranslate>, "error");
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
        if (!id || id === null) return <AutoTranslate>All Branches</AutoTranslate>;
        const branch = branches.find(b => b.id === id);
        return branch ? branch.name : <AutoTranslate>Unknown Branch</AutoTranslate>;
    };

    const getDepartmentNameById = (departmentId) => {
        if (!departmentId || departmentId === null) return <AutoTranslate>All Departments</AutoTranslate>;
        const department = allDepartments.find((dept) => dept.id === departmentId);
        return department?.name || <AutoTranslate>Unknown Department</AutoTranslate>;
    };

    const getCategoryNameById = (id) => {
        if (!id || id === null) return <AutoTranslate>All Categorys</AutoTranslate>;
        const cat = categories.find(b => b.id === id);
        return cat ? cat.name : <AutoTranslate>Unknown Category</AutoTranslate>;
    };

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
            showPopup(<AutoTranslate>Failed to fetch retention policies</AutoTranslate>, "error");
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
            const response = await axios.get(`${BRANCH_API}/findAll`, {
                headers: { Authorization: `Bearer ${token}` },
            })

            const branchesData = response.data?.response || response.data || []
            setBranches(Array.isArray(branchesData) ? branchesData : [branchesData])
        } catch (error) {
            console.error("Error fetching branches:", error)
            showPopup(<AutoTranslate>Failed to fetch branches</AutoTranslate>, "error")
        }
    }

    const fetchDepartments = async (branchId) => {
        try {
            const token = localStorage.getItem("tokenKey")
            const response = await axios.get(`${DEPAETMENT_API}/findByBranch/${branchId}`, {
                headers: { Authorization: `Bearer ${token}` },
            })

            const departmentsData = response.data?.response || response.data || []
            setDepartments(Array.isArray(departmentsData) ? departmentsData : [departmentsData])
        } catch (error) {
            console.error("Error fetching departments:", error)
            showPopup(<AutoTranslate>Failed to fetch departments</AutoTranslate>, "error")
            setDepartments([])
        }
    }

    const fetchCategory = async () => {
        try {
            const token = localStorage.getItem("tokenKey")
            const response = await axios.get(`${CATEGORI_API}/findAll`, {
                headers: { Authorization: `Bearer ${token}` },
            })

            const categoriesData = response.data?.response || response.data || []
            setCategories(Array.isArray(categoriesData) ? categoriesData : [categoriesData])
        } catch (error) {
            console.error("Error fetching categories:", error)
            showPopup(<AutoTranslate>Failed to fetch categories</AutoTranslate>, "error")
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
            alert(<AutoTranslate>Failed to download ZIP file</AutoTranslate>);
        } finally {
            setDownloadingId(null);
        }
    };

    const fetchAllDepartments = async () => {
        try {
            const token = localStorage.getItem("tokenKey")
            const response = await axios.get(`${DEPAETMENT_API}/findAll`, {
                headers: { Authorization: `Bearer ${token}` },
            })

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
                alert(<AutoTranslate>Archive To Date must be greater than Archive From Date</AutoTranslate>);
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
                alert(<AutoTranslate>Retention Date must be greater than Archive To Date</AutoTranslate>);
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
            showPopup(<AutoTranslate>Please select a retention date</AutoTranslate>, "warning");
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
            await axios.post(`${API_HOST}/retention-policy/createNew`, newPolicy, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            await fetchPolicies();
            resetForm();
            showPopup(<AutoTranslate>Policy created successfully!</AutoTranslate>, "success");
        } catch (error) {
            console.error("Error creating policy:", error);

            const backendMessage = error.response?.data?.message || error.message || <AutoTranslate>Something went wrong</AutoTranslate>;
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
                showPopup(<AutoTranslate>Policy not found!</AutoTranslate>, "error");
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

            await axios.put(
                `${API_HOST}/retention-policy/updateNewPolicy/${updatedPolicy.id}`,
                updatedPolicy,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("tokenKey")}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            await fetchPolicies();
            resetForm();
            showPopup(<AutoTranslate>Retention policy updated successfully!</AutoTranslate>, "success");
        } catch (error) {
            console.error("Error creating policy:", error);
            const backendMessage =
                error.response?.data?.message || error.message || <AutoTranslate>Something went wrong</AutoTranslate>;
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
                await axios.put(
                    `${API_HOST}/retention-policy/updatestatus/${policyToToggle.id}`,
                    statusUpdateData,
                    {
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                    },
                );

                await fetchPolicies();
                setModalVisible(false);
                setPolicyToToggle(null);

                const statusText = newActiveStatus ? <AutoTranslate>activated</AutoTranslate> : <AutoTranslate>deactivated</AutoTranslate>;
                showPopup(<AutoTranslate>Policy {statusText} successfully!</AutoTranslate>, "success");
            } catch (error) {
                console.error("Error toggling policy status:", error);
                showPopup(<AutoTranslate>Failed to change the status</AutoTranslate>, "error");
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
        <div className="px-2">
            <h1 className="text-2xl mb-1 font-semibold">
                <AutoTranslate>Archival Policies</AutoTranslate>
            </h1>

            <div className="bg-white p-4 rounded-lg shadow-sm">
                {popupMessage && (
                    <Popup message={popupMessage.message} type={popupMessage.type} onClose={popupMessage.onClose} />
                )}

                {/* Policy Form with ref */}
                <div ref={formRef} className="mb-4 bg-slate-100 p-2 rounded-lg">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <label className="block text-md font-medium text-gray-700">
                            <AutoTranslate>PolicyType</AutoTranslate> <span className="text-red-500">*</span>
                            <select
                                name="policyType"
                                value={formData.policyType}
                                onChange={handleInputChange}
                                className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="FILE_RETENTION"><AutoTranslate>File Retention Policy</AutoTranslate></option>
                                <option value="DATA_RETENTION"><AutoTranslate>Data Retention Policy</AutoTranslate></option>
                            </select>
                        </label>

                        <label className="block text-md font-medium text-gray-700">
                            <AutoTranslate>From Date</AutoTranslate> <span className="text-red-500">*</span>
                            <input
                                type="date"
                                name="fromdate"
                                value={formData.fromdate || ''}
                                onChange={handleInputChange}
                                className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </label>

                        <label className="block text-md font-medium text-gray-700">
                            <AutoTranslate>To Date</AutoTranslate> <span className="text-red-500">*</span>
                            <input
                                type="date"
                                name="todate"
                                value={formData.todate || ''}
                                onChange={handleInputChange}
                                className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                                min={
                                    formData.fromdate
                                        ? (() => {
                                            const d = new Date(formData.fromdate);
                                            d.setDate(d.getDate() + 1);
                                            return d.toISOString().split("T")[0];
                                        })()
                                        : new Date().toISOString().split("T")[0]
                                }
                            />
                        </label>

                        <label className="block text-md font-medium text-gray-700">
                            <AutoTranslate>Date of Archival</AutoTranslate> <span className="text-red-500">*</span>
                            <input
                                type="date"
                                name="retentionDate"
                                value={formData.retentionDate || ""}
                                onChange={handleInputChange}
                                className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
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
                        </label>

                        <label className="block text-md font-medium text-gray-700">
                            <AutoTranslate>Archival Time</AutoTranslate>
                            <input
                                type="time"
                                name="retentionTime"
                                value={formData.retentionTime || ""}
                                onChange={handleInputChange}
                                className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </label>

                        <label className="block text-md font-medium text-gray-700">
                            <AutoTranslate>Branch</AutoTranslate> <span className="text-red-500">*</span>
                            <select
                                name="branchId"
                                value={formData.branchId}
                                onChange={handleBranchChange}
                                className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value=""><AutoTranslate>All Branch</AutoTranslate></option>
                                {branches.map((branch) => (
                                    <option key={branch.id} value={branch.id}>
                                        {branch.name}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="block text-md font-medium text-gray-700">
                            <AutoTranslate>Department</AutoTranslate> <span className="text-red-500">*</span>
                            <select
                                name="departmentId"
                                value={formData.departmentId}
                                onChange={handleInputChange}
                                className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={!formData.branchId}
                            >
                                <option value=""><AutoTranslate>All Departments</AutoTranslate></option>
                                {departments.map((department) => (
                                    <option key={department.id} value={department.id}>
                                        {department.name}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="block text-md font-medium text-gray-700">
                            <AutoTranslate>Category</AutoTranslate> <span className="text-red-500">*</span>
                            <select
                                name="categoryId"
                                value={formData.categoryId}
                                onChange={handleInputChange}
                                className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value=""><AutoTranslate>All Category</AutoTranslate></option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="block text-md font-medium text-gray-700">
                            <AutoTranslate>Archive Description</AutoTranslate>
                            <textarea
                                placeholder={getFallbackTranslation(
                                    'Enter policy description',
                                    currentLanguage
                                )}
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
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
                                <AutoTranslate>Add Policy</AutoTranslate>
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={handleSaveEdit}
                                    className="bg-blue-900 text-white rounded-2xl p-2 flex items-center text-sm justify-center"
                                >
                                    <AutoTranslate>Update Policy</AutoTranslate>
                                </button>
                                <button
                                    onClick={resetForm}
                                    className="bg-gray-500 text-white rounded-2xl p-2 flex items-center text-sm justify-center"
                                >
                                    <AutoTranslate>Cancel</AutoTranslate>
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Search and Filter */}
                <div className="mb-4 bg-slate-100 p-4 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center bg-blue-500 rounded-lg w-full flex-1 md:w-1/2">
                        <label
                            htmlFor="itemsPerPage"
                            className="mr-2 ml-2 text-white text-sm"
                        >
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

                    <div className="flex items-center w-full md:w-auto flex-1">
                        <input
                            type="text"
                            placeholder={getFallbackTranslation(
                                'Search...',
                                currentLanguage
                            )}
                            className="border rounded-l-md p-1 outline-none w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <MagnifyingGlassIcon className="text-white bg-blue-500 rounded-r-lg h-8 w-8 border p-1.5" />
                    </div>
                </div>

                {/* Policies Table */}
                <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
                    <table className="table-fixed border-collapse border border-gray-300 min-w-[1400px]">
                        <thead className="bg-gray-100 sticky top-0 z-10">
                            <tr>
                                <th className="border p-2 text-left w-12"><AutoTranslate>SN</AutoTranslate></th>
                                <th className="border p-2 text-left w-44"><AutoTranslate>PolicyType</AutoTranslate></th>
                                <th className="border p-2 text-left w-[650px]"><AutoTranslate>Archival Period</AutoTranslate></th>
                                <th className="border p-2 text-left w-96"><AutoTranslate>Archive Date & Time</AutoTranslate></th>
                                <th className="border p-2 text-left w-40"><AutoTranslate>Branch</AutoTranslate></th>
                                <th className="border p-2 text-left w-40"><AutoTranslate>Department</AutoTranslate></th>
                                <th className="border p-2 text-left w-40"><AutoTranslate>Category</AutoTranslate></th>
                                <th className="border p-2 text-left w-60"><AutoTranslate>Description</AutoTranslate></th>
                                <th className="border p-2 text-left w-28"><AutoTranslate>Status</AutoTranslate></th>
                                <th className="border p-2 text-left w-20"><AutoTranslate>Edit</AutoTranslate></th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedPolicies.map((policy, index) => (
                                <tr key={policy.id}>
                                    <td className="border p-2 w-12">
                                        {index + 1 + (currentPage - 1) * itemsPerPage}
                                    </td>
                                    <td className="border p-2 w-44">
                                        <span
                                            className={`px-2 py-1 rounded text-xs font-semibold ${policy.policyType === "FILE_RETENTION"
                                                ? "bg-blue-100 text-blue-800"
                                                : "bg-green-100 text-green-800"
                                                }`}
                                        >
                                            {policy.policyType === "FILE_RETENTION"
                                                ? <AutoTranslate>File Retention</AutoTranslate>
                                                : <AutoTranslate>Data Retention</AutoTranslate>}
                                        </span>
                                    </td>
                                    <td className="border p-2 w-[500px] text-center text-gray-700">
                                        {`${formatDate(policy.fromdate)} TO ${formatDate(policy.todate)}`}
                                    </td>
                                    <td className="border p-2 w-96 text-center text-gray-700">
                                        {formatDateTime(policy.retentionDate, policy.retentionTime)}
                                    </td>
                                    <td className="border p-2 w-40">
                                        {policy.branchName || getBranchNameById(policy.branchId)}
                                    </td>
                                    <td className="border p-2 w-40">
                                        {policy.departmentName || getDepartmentNameById(policy.departmentId)}
                                    </td>
                                    <td className="border p-2 w-40">
                                        {policy.categoryName || getCategoryNameById(policy.categoryId)}
                                    </td>
                                    <td className="border p-2 w-60">
                                        {policy.description || "-"}
                                    </td>
                                    <td className="border p-2 w-28">
                                        <span
                                            className={`px-2 py-1 rounded text-xs font-semibold ${policy.isActive
                                                ? "bg-yellow-100 text-yellow-800"
                                                : "bg-green-100 text-green-800"
                                                }`}
                                        >
                                            {policy.isActive ? <AutoTranslate>Waiting For Archive</AutoTranslate> : <AutoTranslate>Archived</AutoTranslate>}
                                        </span>
                                    </td>
                                    <td className="border p-2 w-20 text-center">
                                        <button
                                            onClick={() => handleEditPolicy(policy)}
                                            disabled={!policy.isActive}
                                            className={`${!policy.isActive ? "opacity-50 cursor-not-allowed" : ""}`}
                                        >
                                            <PencilIcon className="h-6 w-6 text-white bg-yellow-400 rounded-xl p-1" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center mt-4">
                    <button
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1 || totalPages === 0}
                        className={`px-3 py-1 rounded mr-3 ${currentPage === 1 || totalPages === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"
                            }`}
                    >
                        <ArrowLeftIcon className="inline h-4 w-4 mr-2 mb-1" />
                        <AutoTranslate>Previous</AutoTranslate>
                    </button>

                    {totalPages > 0 && getPageNumbers().map((page) => (
                        <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-1 rounded mx-1 ${currentPage === page ? "bg-blue-500 text-white" : "bg-slate-200 hover:bg-blue-100"
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
                        className={`px-3 py-1 rounded ml-3 ${currentPage === totalPages || totalPages === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"
                            }`}
                    >
                        <AutoTranslate>Next</AutoTranslate>
                        <ArrowRightIcon className="inline h-4 w-4 ml-2 mb-1" />
                    </button>
                    <div className="ml-4">
                        <span className="text-sm text-gray-700">
                            <AutoTranslate>
                                {`Showing ${totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to ${Math.min(currentPage * itemsPerPage, totalItems)} of ${totalItems} entries`}
                            </AutoTranslate>
                        </span>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            {modalVisible && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg shadow-lg">
                        <h2 className="text-lg font-semibold mb-4">
                            <AutoTranslate>Confirm Status Change</AutoTranslate>
                        </h2>
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
                                className="bg-gray-300 p-2 rounded-lg"
                            >
                                <AutoTranslate>Cancel</AutoTranslate>
                            </button>
                            <button onClick={confirmToggleActiveStatus} className="bg-blue-500 text-white p-2 rounded-lg">
                                <AutoTranslate>Confirm</AutoTranslate>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default NewRetaintionPolicy