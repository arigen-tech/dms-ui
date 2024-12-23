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

const ChangePasswordPage = () => {
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

  useEffect(() => {
    fetchEmployeeData();
    fetchImageSrc();
  }, []);

  const fetchEmployeeData = async () => {
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
      console.error("Error fetching employee data:", error);
      setError("Failed to fetch employee data.");
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
          responseType: "arraybuffer", // Fetch the image as a byte array
        }
      );

      const imageBlob = new Blob([response.data], { type: "image/jpeg" }); // Adjust type if necessary
      const imageUrl = URL.createObjectURL(imageBlob);
      setImageSrc(imageUrl); // Set image source to the object URL
    } catch (error) {
      console.error("Error fetching image source", error);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

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
      await apiClient.post(`${API_HOST}/api/change-password`, changePasswordData);
      showPopup("Password Changed successfully!", "success");
    } catch (error) {
      if (error.response && error.response.data) {
        showPopup(`Failed to Changed Password`, "error");
        setError(error.response.data);
      } else {
        setError("An unexpected error occurred.");
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
      setError("User is not authenticated. Please log in again.");
      return;
    }

    // Use FormData to capture form inputs
    const formData = new FormData(e.target);

    const updateData = {
      id: localStorage.getItem("userId"), // Ensure the employee ID is included
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
      const updatedEmployee = response.data; // Get the updated employee from the response
      localStorage.setItem("UserName", updatedEmployee.name);

      showPopup("Profile Updated successfully!", "success");
      console.log("Profile updated:", response.data);
    } catch (error) {
      console.error("Error updating profile:", error.response || error);
      showPopup(`Failed to Updating Profile`, "error");
      // Set a user-friendly error message
      setError(
        error.response?.data?.message ||
          "Error updating profile. Please try again."
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

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setUploadMessage("Please select a file to upload.");
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
      showPopup("Photo Update successfully!", "success");
      console.log("Upload response:", response.data);
  
      if (typeof fetchImageSrc === "function") {
        fetchImageSrc(); 
      }
    } catch (error) {
      console.error("Error uploading image:", error.response || error);
      showPopup(`Image Uploading failed`, "error");
      setUploadMessage(
        error.response?.data?.message ||
        "An error occurred while uploading the image. Please try again."
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
    navigate("/dashboard");
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-lg">
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
              <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">
                Employee Profile
              </h2>
              <div className="flex items-center justify-center mb-4">
                {imageSrc || photo ? (
                  <img
                    src={photo || imageSrc} 
                    alt="Profile"
                    className="h-28 w-28 border-2 border-gray-400 rounded-full mb-2 object-cover"
                  />
                ) : (
                  <UserCircleIcon className="h-24 w-24 text-rose-800 border-4 border-black rounded-full" />
                )}
              </div>
              <p className="text-xl text-gray-900 ml-20 my-2">
                Name: <strong>{employee?.name}</strong>
              </p>
              <p className="text-xl text-gray-900 ml-20 my-2">
                Branch: <strong>{employee?.branch?.name || "All"}</strong>
              </p>
              {department && (
                <p className="text-xl text-gray-900 ml-20 my-2">
                  Department:{" "}
                  <strong>{employee?.department?.name || "All"}</strong>
                </p>
              )}
              <p className="text-xl text-gray-900 ml-20 my-2">
                Role: <strong>{employee?.role.role}</strong>
              </p>
              <p className="text-xl text-gray-900 ml-20 my-2">
                Mobile: <strong>{employee?.mobile}</strong>
              </p>
              <p className="text-xl text-gray-900 ml-20 my-2">
                Joined Date: <strong>{formatDate(employee?.createdOn)}</strong>
              </p>
              <p className="text-xl text-gray-900 ml-20 my-2">
                Email: <strong>{employee?.email}</strong>
              </p>

              <div className="flex flex-col space-y-4 my-5">
                <button
                  onClick={() => setActiveForm("editProfile")}
                  className="bg-rose-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-rose-700 transition duration-300"
                >
                  Edit Profile
                </button>
                <button
                  onClick={() => setActiveForm("changePassword")}
                  className="bg-rose-800 text-white font-semibold py-2 px-4 rounded-lg hover:bg-rose-700 transition duration-300"
                >
                  Change Password
                </button>
                <button
                  onClick={handleBackClick}
                  type="button"
                  className="bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-700 transition duration-300"
                >
                  Back
                </button>
              </div>
            </div>
          </>
        )}

        {activeForm === "changePassword" && (
          <div className="rounded-lg p-6 shadow-xl flex flex-col items-center justify-center bg-blue-200 bg-opacity-80 backdrop-filter backdrop-blur-md">
            <h2 className="text-3xl font-semibold text-gray-800 mb-4">
              Change Password
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
                  Current Password <span className="text-red-700">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}  
                    visibility
                    id="currentPassword"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="Enter your current password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-4"
                    onClick={toggleCurrentPasswordVisibility} 
                  >
                    {showCurrentPassword ? (
                      <EyeSlashIcon className="text-rose-900 h-5 w-5" />
                    ) : (
                      <EyeIcon className="text-rose-900 h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              <div className="mb-4">
                <label
                  className="block text-gray-700 text-lg font-bold mb-2"
                  htmlFor="newPassword"
                >
                  New Password <span className="text-red-700">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"} 
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="Enter your new password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-4"
                    onClick={toggleNewPasswordVisibility} 
                  >
                    {showNewPassword ? (
                      <EyeSlashIcon className="text-rose-900 h-5 w-5" />
                    ) : (
                      <EyeIcon className="text-rose-900 h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              <div className="mb-4">
                <label
                  className="block text-gray-700 text-lg font-bold mb-2"
                  htmlFor="confirmPassword"
                >
                  Confirm Password <span className="text-red-700">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    visibility
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="Confirm your new password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-4"
                    onClick={toggleConfirmPasswordVisibility}
                  >
                    {showConfirmPassword ? (
                      <EyeSlashIcon className="text-rose-900 h-5 w-5" />
                    ) : (
                      <EyeIcon className="text-rose-900 h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-x-4">
                <button
                  type="submit"
                  className="bg-rose-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-rose-700 transition duration-300"
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

        {activeForm === "editProfile" && (
          <div className="rounded-lg p-6 shadow-xl flex flex-col items-center justify-center bg-blue-200 bg-opacity-80 backdrop-filter backdrop-blur-md">
            <h2 className="text-3xl font-semibold text-gray-800 mb-4">
              Edit Your Profile
            </h2>
            <div className="relative mb-4 flex flex-col items-center">
              {imageSrc || photo ? (
                <div className="relative">
                  <img
                    src={photo || imageSrc} 
                    alt="Profile"
                    className="h-28 w-28 border-2 border-gray-400 rounded-full mb-2 object-cover"
                  />
                  <PencilSquareIcon
                    onClick={handlePencilClick}
                    className="h-8 w-8 text-rose-600 cursor-pointer hover:text-rose-800 absolute bottom-0 right-0"
                  />
                </div>
              ) : (
                <div className="relative">
                  <UserCircleIcon className="h-20 w-20 text-rose-800 border-2 border-gray-400 rounded-full mb-2" />
                  <PencilSquareIcon
                    onClick={handlePencilClick}
                    className="h-8 w-8 text-rose-600 cursor-pointer hover:text-rose-800 absolute bottom-0 right-0"
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
                  className="mt-2 bg-rose-600 text-white px-4 py-2 rounded hover:bg-rose-800"
                >
                  Upload
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
                  Name
                </label>
                <input
                  type="text"
                  name="name" 
                  defaultValue={employee?.name}
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>

              <div className="mb-4">
                <label
                  className="block text-gray-700 text-lg font-bold mb-2"
                  htmlFor="mobile"
                >
                  Mobile
                </label>
                <input
                  type="text"
                  name="mobile" 
                  defaultValue={employee?.mobile}
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>

              <div className="space-x-4">
                <button
                  type="submit"
                  className="bg-rose-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-rose-700 transition duration-300"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={handleBack}
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
