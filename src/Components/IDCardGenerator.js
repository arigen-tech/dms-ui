import React, { useState, useRef, useEffect } from "react";
import html2canvas from "html2canvas";
import apiClient from "../API/apiClient";
import { API_HOST, SYSTEM_ADMIN, BRANCH_ADMIN, DEPARTMENT_ADMIN } from "../API/apiConfig";
import Layout from './Layout';
import axios from "axios";
import {
    MagnifyingGlassIcon,
    ArrowLeftIcon,
    ArrowRightIcon
} from '@heroicons/react/24/solid';
import idBgImage from '../Assets/idbg.jpg';
import idBgImage1 from '../Assets/idbg1.jpg';
import dummyDp from '../Assets/dummyDp.png';
import Barcode from "react-barcode";
import { toPng } from "html-to-image";
import Popup from "../Components/Popup";





const IDCardGenerator = () => {
    const [layout, setLayout] = useState("vertical");
    const cardRefs = useRef([]);
    const [imageSrcs, setImageSrcs] = useState({});
    const [allUsers, setAllUsers] = useState([]);
    const [userData, setUserData] = useState([]);
    const [itemsPerPage, setItemsPerPage] = useState(5);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [generateId, setGenerateId] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [userBranchId, setUserBranchId] = useState();
    const [userDepartmentId, setUserDepartmentId] = useState();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
    const [selectedEmployeeName, setSelectedEmployeeName] = useState("");
    const [popupMessage, setPopupMessage] = useState(null);

    const token = localStorage.getItem("tokenKey");
    const role = localStorage.getItem("role");


    useEffect(() => {
        fetchUserDetails();
    }, []);
    
    useEffect(() => {
        if (!role) return;
    
        switch (role) {
            case SYSTEM_ADMIN:
                fetchEmployees();
                break;
            case BRANCH_ADMIN:
                if (userBranchId) fetchBranchEmployees();
                break;
            case DEPARTMENT_ADMIN:
                if (userDepartmentId) fetchDepartmentEmployees();
                break;
            default:
                console.log("Invalid role to Access Generate ID Cards");
        }
    }, [role, userBranchId, userDepartmentId]); 
    
    const fetchUserDetails = async () => {
        try {
            const userId = localStorage.getItem("userId");
            const response = await axios.get(`${API_HOST}/employee/findById/${userId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
    
            console.log("User details response:", response.data);
            setUserBranchId(response.data?.branch?.id);
            setUserDepartmentId(response.data?.department?.id);
        } catch (error) {
            console.error("Error fetching user details:", error.response || error);
        }
    };
    
    const fetchEmployees = async () => {
        try {
            const response = await axios.get(`${API_HOST}/employee/findAll`, {
                headers: { Authorization: `Bearer ${token}` },
            });
    
            if (response.data.length > 0) {
                setAllUsers(response.data);
            }
            console.log(response.data);
        } catch (error) {
            console.error("Error fetching employees:", error);
        }
    };
    
    const fetchBranchEmployees = async () => {
        if (!userBranchId) return;
        try {
            const response = await axios.get(`${API_HOST}/employee/branch/${userBranchId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
    
            if (response.data.length > 0) {
                setAllUsers(response.data);
            }
        } catch (error) {
            console.error("Error fetching branch employees:", error);
        }
    };
    
    const fetchDepartmentEmployees = async () => {
        if (!userDepartmentId) return;
        try {
            const response = await axios.get(`${API_HOST}/employee/department/${userDepartmentId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
    
            if (response.data.length > 0) {
                setAllUsers(response.data);
            }
        } catch (error) {
            console.error("Error fetching department employees:", error);
        }
    };
    



    const handleProfilePicChange = (e, employeeId, employeeName) => {
        const file = e.target.files[0];
        if (!file) return;

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

                showPopup("Profile picture updated successfully!", "success");
            }
        } catch (error) {
            console.error("Error updating profile picture:", error);
            showPopup(`Failed to Updating Profile picture.`, "error");
        }
    };

    const handleCancelUpload = () => {
        setIsModalOpen(false);
        setSelectedFile(null);
        setSelectedEmployeeId(null);
        setSelectedEmployeeName("");
    };

    const fetchImages = async () => {
        let images = {};

        await Promise.all(
            userData.map(async (employee) => {
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
    };

    const handleDownload = () => {
        if (!cardRefs.current) return;

        cardRefs.current.forEach((card, index) => {
            if (card) {
                toPng(card)
                    .then((dataUrl) => {
                        const link = document.createElement("a");
                        link.href = dataUrl;
                        link.download = `ID_Card_${userData[index].employeeId}.png`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    })
                    .catch((error) => {
                        console.error("Error generating image:", error);
                    });
            }
        });
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const options = {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            // hour: '2-digit',
            // minute: '2-digit',
            // hour12: true 
        };
        return date.toLocaleString('en-GB', options).replace(',', '');
    };

    const showPopup = (message, type = "info") => {
        setPopupMessage({ message, type });
    };

    const filteredUsers = allUsers.filter(users => {
        const statusText = users.isActive ? 'active' : 'inactive';
        const createdOnText = formatDate(users.createdOn);

        return (
            (users.name && users.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (users.email && users.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
            statusText.toLowerCase().includes(searchTerm.toLowerCase()) || // Fix here
            createdOnText.includes(searchTerm.toLowerCase())
        );
    });

    const handleLayoutChange = (newLayout) => {
        if (layout !== newLayout) {
            setLayout(newLayout);
            setGenerateId(false);
        }
    };

    const handleGenerate = () => {
        if (!layout) return;

        if (userData.length > 0) {
            fetchImages();
        }
        setGenerateId(false);
        setIsProcessing(true);

        setTimeout(() => {
            setIsProcessing(false);
            setGenerateId(true);
        }, 3000);
    };

    // const sortedUsers = filteredUsers.sort((a, b) => b.isActive - a.isActive);

    const sortedUsers = filteredUsers.sort((a, b) => {
        return b.isActive - a.isActive || new Date(b.createdOn) - new Date(a.createdOn);
    });

    const paginatedUsers = sortedUsers.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const totalItems = sortedUsers.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    const getPageNumbers = () => {
        const maxPageNumbers = 5;
        const startPage = Math.floor((currentPage - 1) / maxPageNumbers) * maxPageNumbers + 1;
        const endPage = Math.min(startPage + maxPageNumbers - 1, totalPages);
        return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setUserData(paginatedUsers); // Store full user objects
        } else {
            setUserData([]);
        }
    };

    const handleSelectUser = (user) => {
        setUserData((prev) => {
            const exists = prev.some((u) => u.id === user.id);
            return exists ? prev.filter((u) => u.id !== user.id) : [...prev, user];
        });
    };

    const isAllSelected = paginatedUsers.length > 0 && userData.length === paginatedUsers.length;


    return (
        <Layout>
            <div className="p-4">
                <h1 className="text-xl mb-4 font-semibold">I'D Cards</h1>
                <div className="bg-white p-4 rounded-lg shadow-sm">

                    {popupMessage && (
                        <Popup
                            message={popupMessage.message}
                            type={popupMessage.type}
                            onClose={() => setPopupMessage(null)}
                        />
                    )}

                    <div className="mb-4 bg-slate-100 p-4 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center bg-blue-500 rounded-lg">
                            <label htmlFor="itemsPerPage" className="mr-2 ml-2 text-white text-sm">Show:</label>
                            <select
                                id="itemsPerPage"
                                className="border rounded-r-lg p-1.5 outline-none"
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                            >
                                {[5, 10, 15, 20].map(option => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </select>
                        </div>

                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search Employee"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="p-2 border rounded-lg pl-10 outline-none"
                            />
                            <MagnifyingGlassIcon className="absolute top-2 left-2 h-5 w-5 text-gray-500" />
                        </div>
                    </div>

                    <div className="overflow-x-auto max-w-full">
                        <table className="w-full border-collapse border">
                            <thead>
                                <tr className="bg-slate-100">
                                    <th className="border p-2 text-left">
                                        <input type="checkbox" onChange={handleSelectAll} checked={isAllSelected} />
                                    </th>
                                    <th className="border p-2 text-left">SR.</th>
                                    <th className="border p-2 text-left">Name</th>
                                    <th className="border p-2 text-left">Email</th>
                                    <th className="border p-2 text-left">Created On</th>
                                    <th className="border p-2 text-left">Updated On</th>
                                    <th className="border p-2 text-left">Status</th>
                                    <th className="border p-2 text-left">Change Profile Pic</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedUsers.map((emp, index) => (
                                    <tr key={emp.id}>
                                        <td className="border p-2">
                                            <input
                                                type="checkbox"
                                                checked={userData.some((u) => u.id === emp.id)}
                                                onChange={() => handleSelectUser(emp)}
                                            />
                                        </td>
                                        <td className="border p-2">{index + 1 + (currentPage - 1) * itemsPerPage}</td>
                                        <td className="border p-2">{emp.name}</td>
                                        <td className="border p-2">{emp?.email}</td>
                                        <td className="border p-2">{formatDate(emp?.createdOn)}</td>
                                        <td className="border p-2">{formatDate(emp?.updatedOn)}</td>
                                        <td className="border p-2">{emp.active ? 'Active' : 'Inactive'}</td>
                                        <td className="border p-2">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => handleProfilePicChange(e, emp.id, emp.name)}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

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
            </div>

            <div className="flex gap-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={layout === "vertical"}
                        onChange={() => handleLayoutChange("vertical")}
                        className="hidden"
                    />
                    <div className={`w-10 h-5 flex items-center bg-gray-300 rounded-full p-1 transition duration-300 ${layout === "vertical" ? "bg-gray-600" : ""}`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transform duration-300 ${layout === "vertical" ? "translate-x-5" : ""}`}></div>
                    </div>
                    <span className="text-black">Vertical</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={layout === "horizontal"}
                        onChange={() => handleLayoutChange("horizontal")}
                        className="hidden"
                    />
                    <div className={`w-10 h-5 flex items-center bg-gray-300 rounded-full p-1 transition duration-300 ${layout === "horizontal" ? "bg-gray-600" : ""}`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transform duration-300 ${layout === "horizontal" ? "translate-x-5" : ""}`}></div>
                    </div>
                    <span className="text-black">Horizontal</span>
                </label>
            </div>

            <button
                onClick={handleGenerate}
                className="bg-blue-600 mt-3 mb-2 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-700"
            >
                Generate ID Cards
            </button>

            {isProcessing && (
                <div className="flex justify-center items-center mt-4">
                    <p className="text-lg font-semibold text-gray-700 animate-pulse">
                        Processing...
                    </p>
                </div>
            )}

            {generateId && !isProcessing && (
                <>
                    <div className="max-h-[500px] overflow-y-auto mt-3">
                        {layout && (
                            <div className={` ${layout === "horizontal" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"}`}>
                                {userData.map((employee, index) => (
                                    <div
                                        key={employee.employeeId}
                                        ref={(el) => (cardRefs.current[index] = el)}
                                        className={`relative border bg-gradient-to-br from-blue-50 to-white shadow-2xl 
                        flex ${layout === "horizontal" ? "flex-row w-[420px] h-[220px] items-center justify-between p-5"
                                                : "flex-col w-[280px] h-[380px] items-center justify-center p-6"
                                            } gap-4 rounded-xl overflow-hidden`}
                                        style={{
                                            backgroundImage: `url(${layout === "horizontal" ? idBgImage1 : idBgImage})`,
                                            backgroundSize: "cover",
                                            backgroundPosition: "center",
                                        }}

                                    >
                                        <div className="absolute top-2 left-3 flex flex-col w-full">
                                            <div className="flex items-center space-x-1">
                                                <p className="text-md font-extrabold text-indigo-600 border-b-4 border-indigo-600 pb-1">D</p>
                                                <p className="text-md font-extrabold text-indigo-600 border-t-4 border-indigo-600 pt-1">MS</p>
                                            </div>
                                            <div className="absolute top-0 left-1/2 transform -translate-x-1/2">
                                                <p className="text-[10px] font-semibold text-black tracking-wide">
                                                    Document Management System
                                                </p>
                                            </div>
                                        </div>
                                        <img
                                            src={imageSrcs[employee.id] || dummyDp}
                                            alt={`${employee?.name || "Unknown"}'s Avatar`}
                                            className={`${layout === "horizontal" ? "mt-[5%] w-28 h-28 rounded-full border-4 border-gray-300 shadow-md object-cover" : "mt-[18%] w-28 h-28 rounded-full border-4 border-gray-300 shadow-md object-cover"}`}
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = dummyDp;
                                            }}
                                        />
                                        <div className={`mt-0 ${layout === "horizontal" ? "text-left pl-4" : "ml-[5%] text-left"}`}>
                                            <p className="font-bold text-sm text-gray-800"><strong>Name: </strong>{employee?.name}</p>
                                            <p className="text-sm text-gray-600"><strong>Emp ID: </strong>{employee?.employeeId}</p>
                                            <p className="text-sm text-gray-600"><strong>Branch: </strong>{employee?.branch?.name}</p>
                                            <p className="text-sm text-gray-600"><strong>Department: </strong>{employee?.department?.name}</p>
                                            <p className="text-sm text-gray-600"><strong>Email: </strong>{employee?.email}</p>
                                            {/* <p className="text-sm text-gray-600"><strong>Phone No: </strong>{employee?.mobile}</p> */}
                                            <p className="text-sm text-gray-600"><strong>Joined Date: </strong>{formatDate(employee?.createdOn)}</p>
                                        </div>
                                        <div className={`${layout === "horizontal" ? "w-full flex justify-center absolute bottom-0" : "w-full flex justify-center"}`}>
                                            <Barcode
                                                value={employee?.email}
                                                format="CODE128"
                                                width={1.1}
                                                height={32}
                                                displayValue={false}
                                                background="white"
                                                className="h-10"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {layout && (
                            <button
                                onClick={handleDownload}
                                className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                            >
                                Download All ID Cards
                            </button>
                        )}
                    </div>

                </>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
                    <div className="bg-white p-6 rounded-lg shadow-lg">
                        <h2 className="text-lg font-semibold mb-4">Confirm Upload</h2>
                        <p className="mb-4">
                            Are you sure you want to upload a new profile picture for <strong>{selectedEmployeeName}</strong>?
                        </p>
                        <div className="flex justify-end gap-4">
                            <button
                                onClick={handleCancelUpload}
                                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmUpload}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                            >
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
