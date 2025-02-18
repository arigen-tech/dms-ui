import React, { useState, useRef, useEffect } from "react";
import html2canvas from "html2canvas";
import apiClient from "../API/apiClient";
import { API_HOST } from "../API/apiConfig";
import axios from "axios";
import {
    MagnifyingGlassIcon,
    ArrowLeftIcon,
    ArrowRightIcon
} from '@heroicons/react/24/solid';

const IDCardGenerator = () => {
    const [layout, setLayout] = useState(null);
    const cardRefs = useRef([]);
    const [imageSrcs, setImageSrcs] = useState({});
    const [allUsers, setAllUsers] = useState([]);
    const [userData, setUserData] = useState([]);
    const token = localStorage.getItem("tokenKey");
    const [itemsPerPage, setItemsPerPage] = useState(5);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');





    useEffect(() => {
        fetchEmployees();
    }, []);

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

    useEffect(() => {
        if (userData.length > 0) {
            fetchImages();
        }
    }, [userData]);


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
                    images[employee.id] = "https://via.placeholder.com/80"; // Default fallback
                }
            })
        );

        setImageSrcs(images);
    };

    const handleDownload = async () => {
        if (!layout) return;

        for (let i = 0; i < userData.length; i++) {
            const card = cardRefs.current[i];
            if (!card) continue;

            const canvas = await html2canvas(card);
            const link = document.createElement("a");
            link.href = canvas.toDataURL("image/png");
            link.download = `ID_Card_${userData[i].employeeId}.png`;
            link.click();
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const options = {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            // hour12: true 
        };
        return date.toLocaleString('en-GB', options).replace(',', '');
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
            setUserData(paginatedUsers.map(user => user.id));
        } else {
            setUserData([]);
        }
    };

    const handleSelectUser = (id) => {
        setUserData(prev =>
            prev.includes(id) ? prev.filter(userId => userId !== id) : [...prev, id]
        );
    };

    const isAllSelected = paginatedUsers.length > 0 && userData.length === paginatedUsers.length;



    return (
        <div className="flex flex-col items-center gap-4 p-4 w-full overflow-x-auto max-h-[600px] overflow-y-auto">

            <div className="mb-4 bg-slate-100 p-4 rounded-lg flex justify-between items-center">
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
                        placeholder="Search Branch"
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
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedUsers.map((emp, index) => (
                            <tr key={emp.id}>
                                <td className="border p-2">
                                    <input
                                        type="checkbox"
                                        checked={userData.includes(emp.id)}
                                        onChange={() => handleSelectUser(emp.id)}
                                    />
                                </td>
                                <td className="border p-2">{index + 1 + (currentPage - 1) * itemsPerPage}</td>
                                <td className="border p-2">{emp.name}</td>
                                <td className="border p-2">{emp?.email}</td>
                                <td className="border p-2">{formatDate(emp?.createdOn)}</td>
                                <td className="border p-2">{formatDate(emp?.updatedOn)}</td>
                                <td className="border p-2">{emp.active ? 'Active' : 'Inactive'}</td>
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
            <button
                onClick={() => setLayout(null)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-700"
            >
                Generate ID Cards
            </button>

            {layout === null && (
                <div className="flex gap-4">
                    <button
                        onClick={() => setLayout("vertical")}
                        className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                    >
                        Vertical
                    </button>
                    <button
                        onClick={() => setLayout("horizontal")}
                        className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                    >
                        Horizontal
                    </button>
                </div>
            )}

            <div className="max-h-[500px] overflow-y-auto">
                {layout && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {userData.map((employee, index) => (
                            <div
                                key={employee.employeeId}
                                ref={(el) => (cardRefs.current[index] = el)}
                                className={`relative border bg-gradient-to-br from-blue-50 to-white shadow-2xl 
                    flex ${layout === "horizontal" ? "flex-row w-[420px] h-[220px] items-center justify-between p-5"
                                        : "flex-col w-[280px] h-[380px] items-center justify-center p-6"
                                    } gap-4 rounded-xl overflow-hidden`}
                            >
                                {/* Stylish "DMS" Logo at Top-Left */}
                                <div className="absolute top-2 left-3  px-2 py-1 ">
                                    <div className="flex items-center space-x-1">
                                        <p className="text-md font-extrabold text-indigo-600 border-b-4 border-indigo-600 pb-1">
                                            D
                                        </p>
                                        <p className="text-md font-extrabold text-indigo-600 border-t-4 border-indigo-600 pt-1">
                                            MS
                                        </p>
                                        <p className="text-[10px] font-semibold text-gray-600 tracking-wide">
                                            Document Management System
                                        </p>


                                    </div>
                                </div>

                                {/* Profile Image */}
                                <img
                                    src={imageSrcs[employee.id] || "https://via.placeholder.com/80"}
                                    alt={`${employee.name}'s Avatar`}
                                    className="w-28 h-28 rounded-full border-4 border-gray-300 shadow-md"
                                />

                                {/* Employee Info */}
                                <div className={`${layout === "horizontal" ? "text-left pl-4" : "ml-[5%] text-left"}`}>
                                    <p className="font-bold text-lg text-gray-800"><strong>Name: </strong>{employee?.name}</p>
                                    <p className="text-sm text-gray-600"><strong>Emp ID: </strong>{employee?.employeeId}</p>
                                    <p className="text-sm text-gray-600"><strong>Branch: </strong>{employee?.branch?.name}</p>
                                    <p className="text-sm text-gray-600"><strong>Department: </strong>{employee?.department?.name}</p>
                                    <p className="text-sm text-gray-600"><strong>Email: </strong>{employee?.email}</p>
                                    <p className="text-sm text-gray-600"><strong>Phone No: </strong>{employee?.mobile}</p>
                                    <p className="text-sm text-gray-600"><strong>Joined Date: </strong>{formatDate(employee?.createdOn)}</p>
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
        </div>
    );
};

export default IDCardGenerator;
