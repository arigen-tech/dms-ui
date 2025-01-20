import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bars3Icon,
  PencilIcon,
  ArrowRightOnRectangleIcon,
  BellIcon,
  BellAlertIcon
} from "@heroicons/react/24/solid";
import adminPhoto from "../Assets/profile.svg";
import axios from "axios";
import { API_HOST} from "../API/apiConfig";
import Popup from "../Components/Popup";
import { NotificationBell } from "../Data/Notification"

const DropdownMenu = ({ items, onSelect, emptyMessage }) => (
  <div className="absolute right-0 mt-0.5 w-48 bg-white rounded-md shadow-lg z-10">
    {items && items.length > 0 ? (
      items.map((item, index) => (
        <div
          key={index}
          className="px-4 py-2 text-gray-700 hover:bg-gray-100 cursor-pointer"
          onClick={() => onSelect && onSelect(item)} // Handle item selection
        >
          {typeof item === "string" ? item : item.label}{" "}
          {/* Handle item type */}
        </div>
      ))
    ) : (
      <div className="px-4 py-2 text-gray-500">{emptyMessage}</div>
    )}
  </div>
);

function Header({ toggleSidebar, userName }) {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownRoleOpen, setDropdownRoleOpen] = useState(false);
  const [roleName, setRoleName] = useState(null);
  const [popupMessage, setPopupMessage] = useState(null);
  const [rol, setRole] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const dropdownRef = useRef(null);
  const UserName = localStorage.getItem("UserName") || userName;
  const token = localStorage.getItem("tokenKey");
  const role = localStorage.getItem("role");
  const [showConfirmationPopup, setShowConfirmationPopup] = useState(false);
  const [targetRoleName, setTargetRoleName] = useState("");
  const [notifications, setNotifications] = useState([]);

  // Handle logout functionality
  const handleLogout = () => {
    localStorage.removeItem("tokenKey");
    navigate("/");
  };

  // Handle password change navigation
  const handleChangePassword = () => {
    navigate("/change-password");
  };

  const handleClose = () => {
    setPopupMessage(null);
    navigate("/dashboard");
  };

  // Toggle dropdown menus
  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);
  const toggleDropdownRole = () => setDropdownRoleOpen(!dropdownRoleOpen);

  const handleClickOutsides = (e) => {
    if (
      !e.target.closest(".dropdown-menu") &&
      !e.target.closest(".dropdown-toggle")
    ) {
      setDropdownRoleOpen(false); // Close dropdown if clicked outside
    }
  };

  // Handle click outside dropdown to close it
  const handleClickOutside = (event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setDropdownOpen(false);
    }
  };

  // Fetch user image from backend
  const fetchImageSrc = async () => {
    try {
      const employeeId = localStorage.getItem("userId");
      const response = await axios.get(
        `${API_HOST}/employee/getImageSrc/${employeeId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "arraybuffer",
        }
      );
      const imageBlob = new Blob([response.data], { type: "image/jpeg" });
      const imageUrl = URL.createObjectURL(imageBlob);
      setImageSrc(imageUrl);
    } catch (error) {
      console.error("Error fetching image source", error);
    }
  };

  const fetchUserRole = async () => {
    try {
      const employeeId = localStorage.getItem("userId");
      const response = await axios.get(
        `${API_HOST}/api/EmpRole/${employeeId}/roles/active`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setRoleName(response.data.roleNamesList);
      console.log(response.data.roleNamesList);
    } catch (error) {
      console.error("Error fetching user roles", error);
    }
  };

  // const handleRoleSwitch = async (targetRoleName) => {
  //   console.log("Received targetRoleName:", targetRoleName); // Log received value
  //   try {
  //     // debugger;
  //     const employeeId = localStorage.getItem("userId");
  //     const response = await axios.put(
  //       `${API_HOST}/employee/${employeeId}/role/switch`,
  //       { "targetRoleName" : targetRoleName },
  //       {
  //         headers: {
  //           Authorization: `Bearer ${token}`,
  //         },
  //       }
  //     );
  //     console.log("API Response:", response.data);
  //     console.log("targete Response:", targetRoleName);

  //     localStorage.setItem("role", targetRoleName);
  //     setRole(targetRoleName);
  //     showPopup("Role switched successfully!", "success");
  //   } catch (error) {
  //     showPopup("Error to switching role!", "success");
  //   }
  // };

  const handleRoleSwitch = async (targetRoleName) => {
    console.log("Received targetRoleName:", targetRoleName);
    setTargetRoleName(targetRoleName); // Set the target role
    setShowConfirmationPopup(true); // Show confirmation popup
  };

  const confirmRoleSwitch = async () => {
    try {
      const employeeId = localStorage.getItem("userId");
      const response = await axios.put(
        `${API_HOST}/employee/${employeeId}/role/switch`,
        { targetRoleName },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("API Response:", response.data);

      // Update local storage and role state
      localStorage.setItem("role", targetRoleName);
      setRole(targetRoleName);
      showPopup("Role switched successfully!", "success");

      // Close popup
      setShowConfirmationPopup(false);
    } catch (error) {
      showPopup("Error switching role!", "error");
      setShowConfirmationPopup(false); // Close popup on error
    }
  };

  const cancelRoleSwitch = () => {
    setShowConfirmationPopup(false); // Close the popup
  };

  const showPopup = (message, type = "info") => {
    setPopupMessage({ message, type });
  };

  // Function to navigate to the notifications page
  const handleNotificationClick = () => {
    navigate("/notifications"); // Redirect to the notifications page
  };
  const addNotification = (message) => {
    setNotifications((prev) => [...prev, { message }]);
  };

  useEffect(() => {
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  useEffect(() => {
    fetchImageSrc();
    fetchUserRole();
  }, []);

  useEffect(() => {
    if (dropdownRoleOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRoleOpen]);

  return (
    <header className="bg-blue-800 text-white p-2 flex justify-between items-center shadow-inner relative">
      {popupMessage && (
        <Popup
          message={popupMessage.message}
          type={popupMessage.type}
          onClose={handleClose}
        />
      )}
      <div className="flex items-center">
        <button
          onClick={toggleSidebar}
          className="text-gray-300 hover:text-white p-2 rounded-lg transition duration-200 mr-4"
        >
          <Bars3Icon className="h-7 w-7" />
        </button>
        <h2 className="font-bold text-2xl">
          <span className="font-light">Document Management System</span>
        </h2>
      </div>
      <div className="flex space-x-4 items-center mr-4">
        {/* Role Dropdown */}
        <div className="relative">
          <div
            className="flex items-center space-x-2 cursor-pointer"
            onClick={toggleDropdownRole}
          >
            <span className="font-light text-sm mr-1">{role || "Role"}</span>
            <h1 className="text-3xl pb-2 mr-1 font-light">|</h1>

          </div>
          {dropdownRoleOpen && (
            <DropdownMenu
              items={roleName}
              onSelect={(targetRoleName) => {
                console.log("Selected Role from Dropdown:", targetRoleName); // Debugging
                handleRoleSwitch(targetRoleName);
                setDropdownRoleOpen(false); // Close dropdown after selection
              }}
              emptyMessage="No roles available"
            />
          )}
        </div>

        {/* Notification Icon */}
        <NotificationBell />

        {/* Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <div
            className="flex items-center space-x-2 cursor-pointer"
            onClick={toggleDropdown}
          >
            <h1 className="text-3xl pb-2 mr-1 font-light">|</h1>
            <span className="font-light text-sm mr-1">{UserName}</span>
            <img
              src={imageSrc || adminPhoto}
              alt="Profile"
              className="h-8 w-8 rounded-full"
            />
          </div>
          {dropdownOpen && (
            <DropdownMenu
              items={[
                { label: "Edit Profile", onClick: handleChangePassword },
                { label: "Logout", onClick: handleLogout },
              ]}
              onSelect={(item) => item.onClick && item.onClick()}
              emptyMessage="No options available"
            />
          )}
        </div>

        {showConfirmationPopup && (
          <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-96 relative z-60">
              <h2 className="text-lg font-semibold mb-4">
                Confirm Role Switch
              </h2>
              <p className="text-gray-700 mb-6">
                Are you sure you want to switch to the role:{" "}
                <strong>{targetRoleName}</strong>?
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={cancelRoleSwitch}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRoleSwitch}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
