import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { toPng } from "html-to-image";
import apiClient from "../API/apiClient";
import { API_HOST, SYSTEM_ADMIN, BRANCH_ADMIN, DEPARTMENT_ADMIN } from "../API/apiConfig";
import Layout from '../Components/Layout';
import axios from "axios";
import {
    MagnifyingGlassIcon,
    ArrowLeftIcon,
    ArrowRightIcon,
    CheckIcon,
    XMarkIcon,
    ArrowDownTrayIcon,
    PhotoIcon,
    ArrowsRightLeftIcon
} from '@heroicons/react/24/solid';
import dummyDp from '../Assets/dummyDp.png';
import Barcode from "react-barcode";
import Popup from "../Components/Popup";
import LoadingSpinner from "../Components/LoadingSpinner";
import verticalBg from "../Assets/idbg.jpg";
import horizontalBg from "../Assets/idbg1.jpg";

const IDCardGenerator = () => {
    // State management
    const [layout, setLayout] = useState("vertical");
    const cardRefs = useRef([]);
    const [imageSrcs, setImageSrcs] = useState({});
    const [allUsers, setAllUsers] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [currentPageUsers, setCurrentPageUsers] = useState([]);
    const [itemsPerPage, setItemsPerPage] = useState(5);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [generateId, setGenerateId] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [userBranchId, setUserBranchId] = useState(null);
    const [userDepartmentId, setUserDepartmentId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
    const [selectedEmployeeName, setSelectedEmployeeName] = useState("");
    const [popupMessage, setPopupMessage] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isLayoutChanging, setIsLayoutChanging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const token = localStorage.getItem("tokenKey");
    const role = localStorage.getItem("role");

    // Format date helper function
    const formatDate = useCallback((dateString) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        const options = {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        };
        return date.toLocaleString('en-GB', options).replace(',', '');
    }, []);

    // Show popup helper function
    const showPopup = useCallback((message, type = "info") => {
        setPopupMessage({ message, type });
    }, []);

    // Main data loading effect - fixed to prevent infinite loops
    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            try {
                // 1. First fetch user details
                const userId = localStorage.getItem("userId");
                const userResponse = await axios.get(`${API_HOST}/employee/findById/${userId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const userData = userResponse.data;

                // 2. Set the IDs from user data
                setUserBranchId(userData?.branch?.id || null);
                setUserDepartmentId(userData?.department?.id || null);

                // 3. Based on role, fetch the appropriate employees
                if (!role) return;

                if (role === SYSTEM_ADMIN) {
                    const employeesResponse = await axios.get(`${API_HOST}/employee/findAll`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    setAllUsers(employeesResponse.data || []);
                }
                else if (role === BRANCH_ADMIN && userData?.branch?.id) {
                    const branchResponse = await axios.get(`${API_HOST}/employee/branch/${userData.branch.id}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    setAllUsers(branchResponse.data || []);
                }
                else if (role === DEPARTMENT_ADMIN && userData?.department?.id) {
                    const deptResponse = await axios.get(`${API_HOST}/employee/department/${userData.department.id}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    setAllUsers(deptResponse.data || []);
                }
            } catch (error) {
                console.error("Error loading initial data:", error);
                showPopup("Failed to load initial data", "error");
            } finally {
                setIsLoading(false);
            }
        };

        loadInitialData();
    }, [token, role, showPopup]);

    // Filter and paginate users
    const filteredUsers = useMemo(() => {
        const searchLower = searchTerm.toLowerCase();
        return allUsers.filter(user => (
            (user.name?.toLowerCase().includes(searchLower)) ||
            (user.email?.toLowerCase().includes(searchLower)) ||
            (user.isActive ? 'active' : 'inactive').includes(searchLower) ||
            (user.createdOn && formatDate(user.createdOn).includes(searchLower))
        )).sort((a, b) => {
            return b.isActive - a.isActive || new Date(b.createdOn) - new Date(a.createdOn);
        });
    }, [allUsers, searchTerm, formatDate]);

    // Update current page users
    useEffect(() => {
        const startIdx = (currentPage - 1) * itemsPerPage;
        const endIdx = startIdx + itemsPerPage;
        setCurrentPageUsers(filteredUsers.slice(startIdx, endIdx));
    }, [currentPage, itemsPerPage, filteredUsers.length]);

    // Calculate pagination
    const totalItems = filteredUsers.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    const getPageNumbers = () => {
        const maxPageNumbers = 5;
        const startPage = Math.floor((currentPage - 1) / maxPageNumbers) * maxPageNumbers + 1;
        const endPage = Math.min(startPage + maxPageNumbers - 1, totalPages);
        return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
    };

    // Image handling functions
    const handleProfilePicChange = (e, employeeId, employeeName) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.match('image.*')) {
            showPopup("Please select an image file", "warning");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            setPreviewImage(e.target.result);
        };
        reader.readAsDataURL(file);

        setSelectedFile(file);
        setSelectedEmployeeId(employeeId);
        setSelectedEmployeeName(employeeName);
        setIsModalOpen(true);
    };

    const handleConfirmUpload = async () => {
        if (!selectedFile || !selectedEmployeeId) return;

        const formData = new FormData();
        formData.append("file", selectedFile);

        try {
            const response = await axios.post(
                `${API_HOST}/employee/upload/${selectedEmployeeId}`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            if (response.status === 200) {
                const newImageSrc = URL.createObjectURL(selectedFile);
                setImageSrcs((prev) => ({
                    ...prev,
                    [selectedEmployeeId]: newImageSrc,
                }));

                setIsModalOpen(false);
                setSelectedFile(null);
                setSelectedEmployeeId(null);
                setSelectedEmployeeName("");
                setPreviewImage(null);

                showPopup("Profile picture updated successfully!", "success");
            }
        } catch (error) {
            console.error("Error updating profile picture:", error);
            showPopup("Failed to update profile picture", "error");
        }
    };

    const fetchImages = useCallback(async () => {
        let images = {};

        await Promise.all(
            selectedUsers.map(async (employee) => {
                try {
                    const response = await apiClient.get(
                        `${API_HOST}/employee/getImageSrc/${employee.id}`,
                        {
                            headers: { Authorization: `Bearer ${token}` },
                            responseType: "arraybuffer",
                        }
                    );

                    const imageBlob = new Blob([response.data], { type: "image/jpeg" });
                    const imageUrl = URL.createObjectURL(imageBlob);
                    images[employee.id] = imageUrl;
                } catch (error) {
                    console.error(`Error fetching image for ${employee.id}:`, error);
                    images[employee.id] = dummyDp;
                }
            })
        );

        setImageSrcs(images);
    }, [selectedUsers, token]);

    // ID Card generation functions
    const handleDownload = async () => {
        if (!cardRefs.current || cardRefs.current.length === 0) return;

        setIsDownloading(true);

        try {
            for (let i = 0; i < cardRefs.current.length; i++) {
                if (cardRefs.current[i]) {
                    const dataUrl = await toPng(cardRefs.current[i]);
                    const link = document.createElement("a");
                    link.href = dataUrl;
                    link.download = `ID_Card_${selectedUsers[i].employeeId}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            }
        } catch (error) {
            console.error("Error generating image:", error);
            showPopup("Failed to download ID cards", "error");
        } finally {
            setIsDownloading(false);
        }
    };

    // Selection handlers
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const newSelected = [...selectedUsers];
            currentPageUsers.forEach(user => {
                if (!newSelected.some(u => u.id === user.id)) {
                    newSelected.push(user);
                }
            });
            setSelectedUsers(newSelected);
        } else {
            const newSelected = selectedUsers.filter(user =>
                !currentPageUsers.some(u => u.id === user.id)
            );
            setSelectedUsers(newSelected);
        }
    };

    const handleSelectUser = (user) => {
        setSelectedUsers(prev =>
            prev.some(u => u.id === user.id)
                ? prev.filter(u => u.id !== user.id)
                : [...prev, user]
        );
    };

    const isAllSelectedOnCurrentPage = currentPageUsers.length > 0 &&
        currentPageUsers.every(user => selectedUsers.some(u => u.id === user.id));

    // Layout change handler
    const handleLayoutChange = (newLayout) => {
        if (layout === newLayout) return;

        setIsLayoutChanging(true);
        setLayout(newLayout);

        setTimeout(() => {
            setIsLayoutChanging(false);
        }, 1000);
    };

    const handleCancelUpload = () => {
        setIsModalOpen(false);
        setSelectedFile(null);
        setSelectedEmployeeId(null);
        setSelectedEmployeeName("");
        setPreviewImage(null);
    };

    const handleGenerate = async () => {
        if (selectedUsers.length === 0) {
            showPopup("Please select at least one employee", "warning");
            return;
        }

        setGenerateId(false);
        setIsProcessing(true);

        try {
            await fetchImages();
            setGenerateId(true);
        } catch (error) {
            console.error("Error generating ID cards:", error);
            showPopup("Failed to generate ID cards", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    // Render ID Card
    const renderIDCard = (employee, index) => {
        const isHorizontal = layout === "horizontal";

        return (
            <div
                key={employee.id}
                ref={(el) => (cardRefs.current[index] = el)}
                className={`
                relative overflow-visible 
                border border-gray-200 rounded-2xl shadow-xl
                ${isHorizontal ? "flex flex-row h-64 w-full" : "flex flex-col h-[460px] w-full"}
                items-center p-5 gap-4 transition-all duration-300 hover:shadow-2xl
            `}
                style={{
                    backgroundImage: `url(${isHorizontal ? horizontalBg : verticalBg})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                }}
            >
                {/* Logo Top */}
                <div className={`absolute z-10 ${isHorizontal ? "top-4 left-4" : "top-4 left-1/2 -translate-x-1/2"}`}>
                    <div className="flex items-center space-x-1 bg-white px-3 py-1 rounded-full shadow-md border border-indigo-200">
                        <p className="text-base font-extrabold text-indigo-600 border-b-4 border-indigo-600 pb-1">D</p>
                        <p className="text-base font-extrabold text-indigo-600 border-t-4 border-indigo-600 pt-1">MS</p>
                    </div>
                </div>

                {/* Profile Picture */}
                <div className={`${isHorizontal ? "ml-4" : "mt-14 mb-4"} flex-shrink-0`}>
                    <div className={`${isHorizontal ? "w-24 h-24" : "w-28 h-28"} rounded-full border-4 border-white bg-gray-100 shadow-inner overflow-hidden`}>
                        <img
                            src={imageSrcs[employee.id] || dummyDp}
                            alt={`${employee.name || "Employee"} Photo`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = dummyDp;
                            }}
                        />
                    </div>
                </div>

                {/* Employee Info */}
                <div className={`${isHorizontal ? "flex-1" : "w-full px-6 text-center"} text-gray-800`}>
                    {/* Employee ID Badge */}
                    <div className={`bg-indigo-100 text-indigo-800 font-bold text-xs rounded-full px-3 py-1 mb-2 ${isHorizontal ? "inline-block" : "mx-auto"}`}>
                        {employee.employeeId || "N/A"}
                    </div>

                    {/* Name */}
                    <h3 className={`font-bold ${isHorizontal ? "text-lg text-left" : "text-xl"} mb-2`}>
                        {employee.name || "N/A"}
                    </h3>

                    {/* Detail Grid */}
                    <div className={`${isHorizontal ? "grid grid-cols-2 gap-x-4 gap-y-1 text-sm" : "space-y-1 text-sm"}`}>
                        <div className="flex justify-between">
                            <span className="font-medium text-gray-600">Branch:</span>
                            <span>{employee.branch?.name || "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-medium text-gray-600">Dept:</span>
                            <span className="text-right">{employee.department?.name || "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-medium text-gray-600">Email:</span>
                            <span className="truncate max-w-[160px] text-right">{employee.email || "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-medium text-gray-600">Joined:</span>
                            <span className="text-right">{formatDate(employee.createdOn)}</span>
                        </div>
                    </div>
                </div>

                {/* Barcode */}
                <div
                    className={`
                    ${isHorizontal ? "absolute bottom-4 left-0 right-0 px-6" : "mt-1 w-full"}
                    flex justify-center items-center
                `}
                    style={{
                        minHeight: isHorizontal ? "30px" : "45px",
                    }}
                >
                    <Barcode
                        value={employee.email || employee.id}
                        format="CODE128"
                        width={isHorizontal ? 1.1 : 1.3}
                        height={isHorizontal ? 30 : 40}
                        displayValue={false}
                        background="transparent"
                        lineColor="#1e3a8a"
                    />
                </div>
            </div>
        );
    };

    if (isLoading) {
        return (
            <Layout>
                <div className="flex justify-center items-center h-screen">
                    <LoadingSpinner size="xl" />
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="p-4 max-w-7xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">ID Card Generator</h1>

                {popupMessage && (
                    <Popup
                        message={popupMessage.message}
                        type={popupMessage.type}
                        onClose={() => setPopupMessage(null)}
                    />
                )}

                {/* Main Card */}
                <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                    {/* Search and Pagination Controls */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <div className="flex items-center space-x-4">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search employees..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full md:w-64"
                                />
                            </div>

                            <div className="flex items-center space-x-2">
                                <label htmlFor="itemsPerPage" className="text-sm text-gray-600">Show:</label>
                                <select
                                    id="itemsPerPage"
                                    value={itemsPerPage}
                                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                    className="border rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    {[5, 10, 15, 20].map(option => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="text-sm text-gray-600">
                            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
                        </div>
                    </div>

                    {/* Employees Table */}
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        <input
                                            type="checkbox"
                                            onChange={handleSelectAll}
                                            checked={isAllSelectedOnCurrentPage}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created On</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profile Pic</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {currentPageUsers.map((emp, index) => (
                                    <tr key={emp.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <input
                                                type="checkbox"
                                                checked={selectedUsers.some(u => u.id === emp.id)}
                                                onChange={() => handleSelectUser(emp)}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {index + 1 + (currentPage - 1) * itemsPerPage}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{emp.name}</div>
                                            <div className="text-sm text-gray-500">{emp.employeeId}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDate(emp.createdOn)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${emp.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                {emp.active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <label className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                                                <PhotoIcon className="h-4 w-4 mr-1" />
                                                Change
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => handleProfilePicChange(e, emp.id, emp.name)}
                                                    className="hidden"
                                                />
                                            </label>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between mt-4">
                        <div className="flex-1 flex justify-between sm:hidden">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                Next
                            </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700">
                                    Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
                                </p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                    <button
                                        onClick={() => setCurrentPage(1)}
                                        disabled={currentPage === 1}
                                        className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                                            }`}
                                    >
                                        <span className="sr-only">First</span>
                                        <ArrowLeftIcon className="h-5 w-5" aria-hidden="true" />
                                    </button>
                                    {getPageNumbers().map((page) => (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === page
                                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                                }`}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setCurrentPage(totalPages)}
                                        disabled={currentPage === totalPages}
                                        className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                                            }`}
                                    >
                                        <span className="sr-only">Last</span>
                                        <ArrowRightIcon className="h-5 w-5" aria-hidden="true" />
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ID Card Controls */}
                <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center space-x-4">
                            <h2 className="text-lg font-semibold text-gray-800">ID Card Options</h2>

                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => handleLayoutChange("vertical")}
                                    disabled={isLayoutChanging}
                                    className={`flex items-center px-3 py-1.5 rounded-md border ${layout === "vertical"
                                        ? "bg-blue-100 border-blue-300 text-blue-700"
                                        : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                                        } ${isLayoutChanging ? "opacity-50 cursor-not-allowed" : ""}`}
                                >
                                    {isLayoutChanging && layout === "vertical" ? (
                                        <LoadingSpinner size="sm" className="mr-1" />
                                    ) : (
                                        <ArrowsRightLeftIcon className="h-4 w-4 mr-1" />
                                    )}
                                    Vertical
                                </button>
                                <button
                                    onClick={() => handleLayoutChange("horizontal")}
                                    disabled={isLayoutChanging}
                                    className={`flex items-center px-3 py-1.5 rounded-md border ${layout === "horizontal"
                                        ? "bg-blue-100 border-blue-300 text-blue-700"
                                        : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                                        } ${isLayoutChanging ? "opacity-50 cursor-not-allowed" : ""}`}
                                >
                                    {isLayoutChanging && layout === "horizontal" ? (
                                        <LoadingSpinner size="sm" className="mr-1" />
                                    ) : (
                                        <ArrowsRightLeftIcon className="h-4 w-4 mr-1" />
                                    )}
                                    Horizontal
                                </button>
                            </div>
                        </div>

                        <div className="flex space-x-3">
                            <div className="flex items-center bg-blue-50 px-3 py-1.5 rounded-md border border-blue-100">
                                <span className="text-sm font-medium text-blue-700">
                                    Selected: {selectedUsers.length}
                                </span>
                            </div>
                            <button
                                onClick={handleGenerate}
                                disabled={selectedUsers.length === 0 || isProcessing}
                                className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${selectedUsers.length === 0 || isProcessing
                                    ? 'bg-blue-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700'
                                    }`}
                            >
                                {isProcessing ? (
                                    <>
                                        <LoadingSpinner size="sm" className="mr-2" />
                                        Generating...
                                    </>
                                ) : (
                                    'Generate ID Cards'
                                )}
                            </button>

                            <button
                                onClick={handleDownload}
                                disabled={!generateId || isDownloading}
                                className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${!generateId || isDownloading
                                    ? 'bg-green-400 cursor-not-allowed'
                                    : 'bg-green-600 hover:bg-green-700'
                                    }`}
                            >
                                {isDownloading ? (
                                    <>
                                        <LoadingSpinner size="sm" className="mr-2" />
                                        Downloading...
                                    </>
                                ) : (
                                    <>
                                        <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                                        Download All
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Generated ID Cards */}
                {isProcessing && !generateId && (
                    <div className="flex flex-col justify-center items-center py-20">
                        <LoadingSpinner size="lg" className="mb-4 animate-spin" />
                        <p className="text-xl font-semibold text-gray-700">Generating ID Cards...</p>
                        <p className="text-sm text-gray-500 mt-2">
                            Processing {selectedUsers.length} card{selectedUsers.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                )}


                {generateId && !isProcessing && (
                    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800">Generated ID Cards</h2>
                            <span className="text-sm text-gray-500">
                                {selectedUsers.length} card{selectedUsers.length !== 1 ? 's' : ''} generated
                            </span>
                        </div>


                        {isLayoutChanging ? (
                            <div className="flex justify-center items-center h-64">
                                <LoadingSpinner size="lg" className="mr-3" />
                                <span className="text-gray-600">Updating layout...</span>
                            </div>
                        ) : (
                            <div
                                className={`transition-all duration-300 ${layout === "horizontal"
                                    ? "grid grid-cols-1 md:grid-cols-2 gap-8"
                                    : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
                                    }`}
                            >
                                {selectedUsers.map((employee, index) => renderIDCard(employee, index))}
                            </div>

                        )}
                    </div>
                )}
            </div>

            {/* Profile Picture Upload Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Update Profile Picture</h3>
                            <button
                                onClick={handleCancelUpload}
                                className="text-gray-400 hover:text-gray-500"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="mb-6">
                            <p className="text-sm text-gray-600 mb-4">
                                Updating profile picture for <span className="font-semibold">{selectedEmployeeName}</span>
                            </p>

                            <div className="flex flex-col items-center">
                                {previewImage ? (
                                    <img
                                        src={previewImage}
                                        alt="Preview"
                                        className="h-32 w-32 rounded-full object-cover border-4 border-gray-200 mb-4"
                                    />
                                ) : (
                                    <div className="h-32 w-32 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                        <PhotoIcon className="h-16 w-16 text-gray-400" />
                                    </div>
                                )}

                                <div className="text-xs text-gray-500">
                                    {selectedFile?.name || "No file selected"}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={handleCancelUpload}
                                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmUpload}
                                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                            >
                                <CheckIcon className="h-4 w-4 mr-1 inline" />
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default IDCardGenerator;