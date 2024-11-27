import React, { useState, useEffect, useRef } from 'react';
import { KeyIcon, EyeSlashIcon, EyeIcon, PencilSquareIcon, UserCircleIcon } from '@heroicons/react/24/solid';
import axios from 'axios';
import { API_HOST } from "../API/apiConfig";

const ChangePasswordPage = () => {
    const [activeForm, setActiveForm] = useState(null);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);



    const token = localStorage.getItem("tokenKey");

    const [employee, setEmployee] = useState(null);
    const [name, setName] = useState('');
    const [mobile, setMobile] = useState('');
    const [role, setRole] = useState('');
    const [photo, setPhoto] = useState(null);
    const fileInputRef = useRef(null);
    // State to manage which form is active

    useEffect(() => {
        const userId = localStorage.getItem("userId");

        const fetchEmployeeData = async () => {
            try {
                const response = await axios.get(`${ API_HOST }/employee/findById/${userId}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.data) {
                    console.log(response.data);
                    setEmployee(response.data);
                    setName(response.data.name);
                    setMobile(response.data.mobile);
                    setRole(response.data.role.role);
                }
            } catch (error) {
                console.error('Error fetching employee data:', error);
                setError('Failed to fetch employee data.');
            }
        };

        fetchEmployeeData();
    }, []);

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (newPassword !== confirmPassword) {
            setError("New password and confirm password do not match.");
            return;
        }

        if (!currentPassword || !newPassword || !confirmPassword) {
            setError("All fields are required.");
            return;
        }

        const changePasswordData = {
            email: employee?.email,
            currentPassword,
            newPassword,
        };

        try {
            await axios.post(`${ API_HOST }/api/change-password`, changePasswordData);
            setSuccess("Password changed successfully.");
        } catch (error) {
            if (error.response && error.response.data) {
                setError(error.response.data);
            } else {
                setError("An unexpected error occurred.");
            }
        } finally {
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const userId = localStorage.getItem("userId");

        const updateData = {
            name,
            mobile,
            photo: photo ? photo.name : null,
        };

        try {
            await axios.put(`${ API_HOST }/employee/update/${userId}`, updateData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setSuccess("Profile updated successfully.");
            setPhoto(null);
        } catch (error) {
            if (error.response && error.response.data) {
                setError(error.response.data);
            } else {
                setError("An unexpected error occurred.");
            }
        }
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPhoto(URL.createObjectURL(file)); // Create a URL for the selected file
        }
    };

    const handlePencilClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click(); // Trigger the file input click
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const options = {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        };
        return date.toLocaleString("en-GB", options).replace(",", "");
    };

    const handleBack = () => {
        setActiveForm(null);
    };

    const toggleCurrentPasswordVisibility = () => {
        setShowCurrentPassword((prev) => !prev);
    };

    const toggleNewPasswordVisibility = () => {
        setShowNewPassword((prev) => !prev);
    };

    const toggleConfirmPasswordVisibility = () => {
        setShowConfirmPassword((prev) => !prev);
    };


    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-lg">
                {activeForm === null && (
                    <>
                        <div className=''>
                            <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">Employee Profile</h2>
                            <div className="flex items-center justify-center mb-4"> {/* New wrapper div for centering */}
                                <UserCircleIcon className="h-24 w-24 text-blue-800 border-4 border-black rounded-full" />
                            </div>
                            <p className="text-xl text-gray-900 ml-24 my-2">Name: <strong>{employee?.name}</strong></p>
                            <p className="text-xl text-gray-900 ml-24 my-2">Role: <strong>{employee?.role.role}</strong></p>
                            <p className="text-xl text-gray-900 ml-24 my-2">Mobile: <strong>{employee?.mobile}</strong></p>
                            <p className="text-xl text-gray-900 ml-24 my-2">Joined Date: <strong>{formatDate(employee?.createdOn)}</strong></p>
                            <p className="text-xl text-gray-900 ml-24 my-2">Email: <strong>{employee?.email}</strong></p>


                            <div className="flex flex-col space-y-4 my-5">
                                <button
                                    onClick={() => setActiveForm('editProfile')}
                                    className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-300"
                                >
                                    Edit Profile
                                </button>
                                <button
                                    onClick={() => setActiveForm('changePassword')}
                                    className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-300"
                                >
                                    Change Password
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {activeForm === 'changePassword' && (
                    <div className="rounded-lg p-6 shadow-xl flex flex-col items-center justify-center bg-blue-200 bg-opacity-80 backdrop-filter backdrop-blur-md">
                        <h2 className="text-3xl font-semibold text-gray-800 mb-4">Change Password</h2>
                        <form onSubmit={handleChangePassword} className="mb-6 w-full">
                            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                            {success && <p className="text-green-500 text-sm mb-4">{success}</p>}

                            <div className="mb-4">
                                <label className="block text-gray-700 text-lg font-bold mb-2" htmlFor="currentPassword">
                                    Current Password <span className='text-red-700'>*</span>
                                </label>
                                <div className='relative'>
                                    <input
                                        type={showCurrentPassword ? "text" : "password"} // Use a specific state for current password visibility
                                        id="currentPassword"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter your current password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-4"
                                        onClick={toggleCurrentPasswordVisibility} // Create a separate toggle function
                                    >
                                        {showCurrentPassword ? (
                                            <EyeSlashIcon className="text-blue-900 h-5 w-5" />
                                        ) : (
                                            <EyeIcon className="text-blue-900 h-5 w-5" />
                                        )}
                                    </button>
                                </div>
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-lg font-bold mb-2" htmlFor="newPassword">
                                    New Password <span className='text-red-700'>*</span>
                                </label>
                                <div className='relative'>
                                    <input
                                        type={showNewPassword ? "text" : "password"} // Use a specific state for new password visibility
                                        id="newPassword"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter your new password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-4"
                                        onClick={toggleNewPasswordVisibility} // Create a separate toggle function
                                    >
                                        {showNewPassword ? (
                                            <EyeSlashIcon className="text-blue-900 h-5 w-5" />
                                        ) : (
                                            <EyeIcon className="text-blue-900 h-5 w-5" />
                                        )}
                                    </button>
                                </div>
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-lg font-bold mb-2" htmlFor="confirmPassword">
                                    Confirm Password <span className='text-red-700'>*</span>
                                </label>
                                <div className='relative'>
                                    <input
                                        type={showConfirmPassword ? "text" : "password"} // Use a specific state for confirm password visibility
                                        id="confirmPassword"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Confirm your new password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-4"
                                        onClick={toggleConfirmPasswordVisibility} // Create a separate toggle function
                                    >
                                        {showConfirmPassword ? (
                                            <EyeSlashIcon className="text-blue-900 h-5 w-5" />
                                        ) : (
                                            <EyeIcon className="text-blue-900 h-5 w-5" />
                                        )}
                                    </button>
                                </div>
                            </div>


                            <div className='space-x-4'>
                                <button
                                    type="submit"
                                    className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-300"
                                >
                                    Change Password
                                </button>
                                <button
                                    onClick={handleBack}
                                    className="bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-700 transition duration-300"
                                >
                                    Back
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {activeForm === 'editProfile' && (
                    <div className="rounded-lg p-6 shadow-xl flex flex-col items-center justify-center bg-blue-200 bg-opacity-80 backdrop-filter backdrop-blur-md">
                        <h2 className="text-3xl font-semibold text-gray-800 mb-4">Edit Your Profile</h2>

                        <div className="relative mb-4 flex flex-col items-center">
                            {/* Display the selected image or a default icon */}
                            {photo ? (
                                <img
                                    src={photo}
                                    alt="Profile"
                                    className="h-28 w-28 border-2 border-gray-400 rounded-full mb-2 object-cover"
                                />
                            ) : (
                                <UserCircleIcon className="h-20 w-20 text-blue-800 border-2 border-gray-400 rounded-full mb-2" />
                            )}
                            <PencilSquareIcon
                                onClick={handlePencilClick}
                                className="h-8 w-8 text-blue-600 cursor-pointer hover:text-blue-800 absolute bottom-0 right-0 transform translate-x-1/2 -translate-y-1/2"
                            />
                            <input
                                type="file"
                                id="photo"
                                ref={fileInputRef}
                                onChange={handlePhotoChange}
                                className="hidden"
                                accept="image/*"
                            />
                        </div>
                        {/* Include edit profile form elements here */}
                        <form className="mb-6 w-full">
                            {/* Add input fields for editing profile information */}
                            <div className="mb-4">
                                <label className="block text-gray-700 text-lg font-bold mb-2" htmlFor="name">
                                    Name
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    defaultValue={employee?.name}
                                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-lg font-bold mb-2" htmlFor="mobile">
                                    Mobile
                                </label>
                                <input
                                    type="text"
                                    id="mobile"
                                    defaultValue={employee?.mobile}
                                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            {/* Add more fields as necessary */}
                            <div className='space-x-4'>
                                <button
                                    type="submit"
                                    className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-300"
                                >
                                    Save Changes
                                </button>
                                <button
                                    onClick={handleBack}
                                    type="submit"
                                    className="bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-700 transition duration-300"
                                >
                                    Back
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChangePasswordPage;
