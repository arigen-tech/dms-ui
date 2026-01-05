import React, { useState, useEffect, useRef } from "react";
import {
  KeyIcon,
  EyeSlashIcon,
  EyeIcon,
  PencilSquareIcon,
  UserCircleIcon,
} from "@heroicons/react/24/solid";
import apiClient from "../API/apiClient";
import { useNavigate } from "react-router-dom";
import { API_HOST } from "../API/apiConfig";
import Popup from "../Components/Popup";
import Profile_Image from "../Assets/Profile_Background.png";
// Import AutoTranslate components
import AutoTranslate from '../i18n/AutoTranslate';
import { useLanguage } from '../i18n/LanguageContext';
import { getFallbackTranslation } from '../i18n/autoTranslator';

const ChangePasswordPage = () => {
  // Get language context
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

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
  });

  const [activeForm, setActiveForm] = useState(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const token = localStorage.getItem("tokenKey");

  const [employee, setEmployee] = useState(null);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [role, setRole] = useState("");
  const [branch, setBranch] = useState("");
  const [department, setDepartment] = useState("");
  const [photo, setPhoto] = useState(null);
  const fileInputRef = useRef(null);
  const [imageSrc, setImageSrc] = useState(null);
  const navigate = useNavigate();
  const [popupMessage, setPopupMessage] = useState(null);

  // Debug language status
  useEffect(() => {
    console.log('🔍 ChangePasswordPage Component - Language Status:', {
      currentLanguage,
      defaultLanguage,
      isTranslationNeeded: isTranslationNeeded(),
      translationStatus,
      availableLanguagesCount: availableLanguages.length,
      pathname: window.location.pathname
    });
  }, [currentLanguage, defaultLanguage, translationStatus, isTranslationNeeded, availableLanguages]);

  useEffect(() => {
    fetchEmployeeData();
    fetchImageSrc();
  }, []);

  const fetchEmployeeData = async () => {
    setIsLoading(true);
    const userId = localStorage.getItem("userId");
    try {
      const response = await apiClient.get(
        `${API_HOST}/employee/findById/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data) {
        setEmployee(response.data);
        setName(response.data.name);
        setMobile(response.data.mobile);
        setRole(response.data.role?.role || "");
        setBranch(response.data.branch?.name || "");
        setDepartment(response.data.department?.name || "");
      }
    } catch (error) {
      console.error(<AutoTranslate>Error fetching employee data:</AutoTranslate>, error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchImageSrc = async () => {
    try {
      const employeeId = localStorage.getItem("userId");

      const response = await apiClient.get(
        `${API_HOST}/employee/getImageSrc/${employeeId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: "arraybuffer",
        }
      );

      const imageBlob = new Blob([response.data], { type: "image/jpeg" });
      const imageUrl = URL.createObjectURL(imageBlob);
      setImageSrc(imageUrl);
    } catch (error) {
      console.error(<AutoTranslate>Error fetching image source</AutoTranslate>, error);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError(<AutoTranslate>New password and confirm password do not match.</AutoTranslate>);
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(<AutoTranslate>All fields are required.</AutoTranslate>);
      return;
    }

    const changePasswordData = {
      email: employee?.email,
      currentPassword,
      newPassword,
    };

    try {
      await apiClient.post(`${API_HOST}/api/profile`, changePasswordData);
      showPopup(<AutoTranslate>Password Changed successfully!</AutoTranslate>, "success");
      setActiveForm(null);
    } catch (error) {
      if (error.response && error.response.data) {
        showPopup(<AutoTranslate>Failed to Changed Password</AutoTranslate>, "error");
        setError(error.response.data);
      } else {
        setError(<AutoTranslate>An unexpected error occurred.</AutoTranslate>);
      }
    } finally {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!token) {
      setError(<AutoTranslate>User is not authenticated. Please log in again.</AutoTranslate>);
      return;
    }

    const formData = new FormData(e.target);

    const updateData = {
      id: localStorage.getItem("userId"),
      name: formData.get("name"),
      mobile: formData.get("mobile"),
    };

    try {
      const response = await apiClient.put(
        `${API_HOST}/employee/update/profile`,
        updateData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      const updatedEmployee = response.data;
      localStorage.setItem("UserName", updatedEmployee.name);

      showPopup(<AutoTranslate>Profile Updated successfully!</AutoTranslate>, "success");
      setActiveForm(null);
      console.log(<AutoTranslate>Profile updated:</AutoTranslate>, response.data);
    } catch (error) {
      console.error(<AutoTranslate>Error updating profile:</AutoTranslate>, error.response || error);
      showPopup(<AutoTranslate>Failed to Updating Profile</AutoTranslate>, "error");
      setError(
        error.response?.data?.message ||
        <AutoTranslate>Error updating profile. Please try again.</AutoTranslate>
      );
    }
  };

  const handlePencilClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPhoto(URL.createObjectURL(file));
    }
  };

  const handleNameChange = (e) => {
    const value = e.target.value;
    const onlyLetters = value.replace(/[^A-Za-z\s]/g, "");
    setEmployee((prev) => ({ ...prev, name: onlyLetters }));
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setUploadMessage(<AutoTranslate>Please select a file to upload.</AutoTranslate>);
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    const employeeId = localStorage.getItem("userId");

    try {
      const response = await apiClient.post(
        `${API_HOST}/employee/upload/${employeeId}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      showPopup(<AutoTranslate>Photo Update successfully!</AutoTranslate>, "success");
      setActiveForm(null);
      console.log(<AutoTranslate>Upload response:</AutoTranslate>, response.data);

      if (typeof fetchImageSrc === "function") {
        fetchImageSrc();
      }
    } catch (error) {
      console.error(<AutoTranslate>Error uploading image:</AutoTranslate>, error.response || error);
      showPopup(<AutoTranslate>Image Uploading failed</AutoTranslate>, "error");
      setUploadMessage(
        error.response?.data?.message ||
        <AutoTranslate>An error occurred while uploading the image. Please try again.</AutoTranslate>
      );
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

  const handleBackClick = () => {
    navigate("/newDash");
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

  const showPopup = (message, type = "info") => {
    setPopupMessage({ message, type });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-cover bg-center"
      style={{ backgroundImage: `url(${Profile_Image})` }}>
      <div className="bg-blue-200 rounded-lg shadow-lg p-4 w-full max-w-lg mt-4 mb-4">
        {popupMessage && (
          <Popup
            message={popupMessage.message}
            type={popupMessage.type}
            onClose={() => setPopupMessage(null)}
          />
        )}
        {activeForm === null && (
          <>
            <div className="">
              <h2 className="text-xl font-bold text-center text-gray-900 mb-2">
                <AutoTranslate>Employee Profile</AutoTranslate>
              </h2>

              {isLoading ? (
                <div className="animate-pulse">
                  <div className="flex justify-center mb-4">
                    <div className="h-20 w-20 rounded-full bg-gray-300"></div>
                  </div>

                  {[...Array(7)].map((_, index) => (
                    <div key={index} className="flex items-center ml-20 my-2">
                      <div className="h-4 w-24 bg-gray-300 rounded mr-2"></div>
                      <div className="h-4 w-32 bg-gray-300 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-center mb-4">
                    {imageSrc || photo ? (
                      <img
                        src={photo || imageSrc}
                        alt={getFallbackTranslation('Profile', currentLanguage)}
                        className="h-20 w-20 border-2 border-gray-400 rounded-full mb-2 object-cover"
                      />
                    ) : (
                      <UserCircleIcon className="h-20 w-20 text-blue-600 border-4 border-black rounded-full" />
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-md text-gray-900 ml-20 flex items-center">
                      <strong className="w-24"><AutoTranslate>Name:</AutoTranslate></strong>
                      <strong className="ml-2">{employee?.name}</strong>
                    </p>

                    <p className="text-md text-gray-900 ml-20 flex items-center">
                      <strong className="w-24"><AutoTranslate>Branch:</AutoTranslate></strong>
                      <strong className="ml-2">{employee?.branch?.name || <AutoTranslate>All</AutoTranslate>}</strong>
                    </p>

                    {department && (
                      <p className="text-md text-gray-900 ml-20 flex items-center">
                        <strong className="w-24"><AutoTranslate>Department:</AutoTranslate></strong>
                        <strong className="ml-2">{employee?.department?.name || <AutoTranslate>All</AutoTranslate>}</strong>
                      </p>
                    )}

                    <p className="text-md text-gray-900 ml-20 flex items-center">
                      <strong className="w-24"><AutoTranslate>Role:</AutoTranslate></strong>
                      <strong className="ml-2">{employee?.role.role}</strong>
                    </p>

                    <p className="text-md text-gray-900 ml-20 flex items-center">
                      <strong className="w-24"><AutoTranslate>Mobile:</AutoTranslate></strong>
                      <strong className="ml-2">{employee?.mobile}</strong>
                    </p>

                    <p className="text-md text-gray-900 ml-20 flex items-center">
                      <strong className="w-24"><AutoTranslate>Joined Date:</AutoTranslate></strong>
                      <strong className="ml-2">{formatDate(employee?.createdOn)}</strong>
                    </p>

                    <p className="text-md text-gray-900 ml-20 flex items-center">
                      <strong className="w-24"><AutoTranslate>Email:</AutoTranslate></strong>
                      <strong className="ml-2">{employee?.email}</strong>
                    </p>
                  </div>
                </>
              )}

              <div className="flex flex-col space-y-4 my-5">
                <button
                  onClick={() => setActiveForm("editProfile")}
                  className="bg-blue-900 text-white font-semibold py-1 px-2 rounded-lg hover:bg-blue-950 transition duration-300"
                >
                  <AutoTranslate>Edit Profile</AutoTranslate>
                </button>
                <button
                  onClick={() => setActiveForm("changePassword")}
                  className="bg-blue-900 text-white font-semibold py-1 px-2 rounded-lg hover:bg-blue-950 transition duration-300"
                >
                  <AutoTranslate>Change Password</AutoTranslate>
                </button>
                <button
                  onClick={handleBackClick}
                  type="button"
                  className="bg-gray-400 text-white font-semibold py-1 px-2 rounded-lg hover:bg-gray-700 transition duration-300"
                >
                  <AutoTranslate>Back</AutoTranslate>
                </button>
              </div>
            </div>
          </>
        )}

        {activeForm === "changePassword" && (
          <div className="">
            <h2 className="text-3xl font-semibold text-gray-800 mb-4">
              <AutoTranslate>Change Password</AutoTranslate>
            </h2>
            <form onSubmit={handleChangePassword} className="mb-6 w-full">
              {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
              {success && (
                <p className="text-green-500 text-sm mb-4">{success}</p>
              )}

              <div className="mb-4">
                <label
                  className="block text-gray-700 text-lg font-bold mb-2"
                  htmlFor="currentPassword"
                >
                  <AutoTranslate>Current Password</AutoTranslate> <span className="text-red-700">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    visibility
                    id="currentPassword"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={getFallbackTranslation(
                      'Enter your current password',
                      currentLanguage
                    )}
                    maxLength={15}
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-4"
                    onClick={toggleCurrentPasswordVisibility}
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
                <label
                  className="block text-gray-700 text-lg font-bold mb-2"
                  htmlFor="newPassword"
                >
                  <AutoTranslate>New Password</AutoTranslate> <span className="text-red-700">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={getFallbackTranslation(
                      'Enter your new password',
                      currentLanguage
                    )}
                    required
                    maxLength={15}
                    minLength={8}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-4"
                    onClick={toggleNewPasswordVisibility}
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
                <label
                  className="block text-gray-700 text-lg font-bold mb-2"
                  htmlFor="confirmPassword"
                >
                  <AutoTranslate>Confirm Password</AutoTranslate> <span className="text-blue-700">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    visibility
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={getFallbackTranslation(
                      'Confirm your new password',
                      currentLanguage
                    )}
                    required
                    maxLength={15}
                    minLength={8}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-4"
                    onClick={toggleConfirmPasswordVisibility}
                  >
                    {showConfirmPassword ? (
                      <EyeSlashIcon className="text-blue-900 h-5 w-5" />
                    ) : (
                      <EyeIcon className="text-blue-900 h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-x-4">
                <button
                  type="submit"
                  className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-300"
                >
                  <AutoTranslate>Change Password</AutoTranslate>
                </button>
                <button
                  onClick={handleBack}
                  className="bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-700 transition duration-300"
                >
                  <AutoTranslate>Back</AutoTranslate>
                </button>
              </div>
            </form>
          </div>
        )}

        {activeForm === "editProfile" && (
          <div className="">
            <h2 className="text-3xl font-semibold text-gray-800 mb-4">
              <AutoTranslate>Edit Your Profile</AutoTranslate>
            </h2>
            <div className="relative mb-4 flex flex-col items-center">
              {imageSrc || photo ? (
                <div className="relative">
                  <img
                    src={photo || imageSrc}
                    alt={getFallbackTranslation('Profile', currentLanguage)}
                    className="h-28 w-28 border-2 border-gray-400 rounded-full mb-2 object-cover"
                  />
                  <PencilSquareIcon
                    onClick={handlePencilClick}
                    className="h-8 w-8 text-blue-600 cursor-pointer hover:text-rose-800 absolute bottom-0 right-0"
                  />
                </div>
              ) : (
                <div className="relative">
                  <UserCircleIcon className="h-20 w-20 text-blue-800 border-2 border-gray-400 rounded-full mb-2" />
                  <PencilSquareIcon
                    onClick={handlePencilClick}
                    className="h-8 w-8 text-blue-600 cursor-pointer hover:text-blue-800 absolute bottom-0 right-0"
                  />
                </div>
              )}

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*"
              />

              {selectedFile && (
                <button
                  onClick={handleFileUpload}
                  className="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-800"
                >
                  <AutoTranslate>Upload</AutoTranslate>
                </button>
              )}

              {uploadMessage && (
                <p className="mt-2 text-sm text-gray-600">{uploadMessage}</p>
              )}
            </div>

            <form className="mb-6 w-full" onSubmit={handleUpdateProfile}>
              <div className="mb-4">
                <label
                  className="block text-gray-700 text-lg font-bold mb-2"
                  htmlFor="name"
                >
                  <AutoTranslate>Name</AutoTranslate>
                </label>
                <input
                  type="text"
                  name="name"
                  value={employee.name}
                  onChange={handleNameChange}
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  maxLength={25}
                  minLength={3}
                />
              </div>

              <div className="mb-4">
                <label
                  className="block text-gray-700 text-lg font-bold mb-2"
                  htmlFor="mobile"
                >
                  <AutoTranslate>Mobile</AutoTranslate>
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-100 text-gray-700 text-lg">
                    +91
                  </span>
                  <input
                    type="text"
                    name="mobile"
                    defaultValue={employee?.mobile?.slice(-10) || ""}
                    className="w-full px-4 py-3 border border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    maxLength={10}
                    minLength={10}
                    inputMode="numeric"
                    pattern="\d*"
                    onInput={(e) => {
                      e.target.value = e.target.value.replace(/\D/g, "");
                    }}
                  />
                </div>
              </div>

              <div className="space-x-4">
                <button
                  type="submit"
                  className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-300"
                >
                  <AutoTranslate>Save Changes</AutoTranslate>
                </button>
                <button
                  type="button"
                  onClick={handleBack}
                  className="bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-700 transition duration-300"
                >
                  <AutoTranslate>Back</AutoTranslate>
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