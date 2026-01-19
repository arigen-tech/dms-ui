import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bars3Icon,
  PencilIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/solid";
import adminPhoto from "../Assets/profile.svg";
import { PiUserSwitchFill } from "react-icons/pi";
import { TbPasswordUser, TbUserCog } from "react-icons/tb";
import { PiUserCircleGear } from "react-icons/pi";
import { FiUser, FiGlobe } from "react-icons/fi";
import axios from "axios";
import { API_HOST } from "../API/apiConfig";
import Popup from "../Components/Popup";
import { NotificationBell } from "../Data/Notification";
import { ImSpinner2 } from "react-icons/im";
// Import AutoTranslate components
import AutoTranslate from '../i18n/AutoTranslate';
import { useLanguage } from '../i18n/LanguageContext';
import { getFallbackTranslation } from '../i18n/autoTranslator';
import { GlobeAltIcon } from "@heroicons/react/24/outline";

const DropdownMenu = ({ items, onSelect, emptyMessage, className }) => (
  <div className={`absolute right-0 mt-0.5 w-48 bg-white rounded-md shadow-lg z-10 ${className}`}>
    {items && items.length > 0 ? (
      items.map((item, index) => (
        <div
          key={index}
          className="px-4 py-2 text-gray-700 hover:bg-gray-100 cursor-pointer rounded-md"
          onClick={() => onSelect && onSelect(item)}
        >
          {typeof item === "string" ? item : item.label}
        </div>
      ))
    ) : (
      <div className="px-4 py-2 text-gray-500">{emptyMessage}</div>
    )}
  </div>
);

function Header({ toggleSidebar, userName, triggerMenuRefresh  }) {
  // Get language context
  const {
    currentLanguage,
    defaultLanguage,
    translationStatus,
    isTranslationNeeded,
    availableLanguages,
    changeLanguage,
    translate,
    preloadTranslationsForTerms,
    getLanguageName,
    getLanguageNativeName
  } = useLanguage();

  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownRoleOpen, setDropdownRoleOpen] = useState(false);
  const [dropdownLanguageOpen, setDropdownLanguageOpen] = useState(false);
  const [roleName, setRoleName] = useState([]);
  const [popupMessage, setPopupMessage] = useState(null);
  const [, setRole] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const dropdownRef = useRef(null);
  const UserName = localStorage.getItem("UserName") || userName;
  const token = localStorage.getItem("tokenKey");
  const role = localStorage.getItem("role");
  const [showConfirmationPopup, setShowConfirmationPopup] = useState(false);
  const [targetRoleName, setTargetRoleName] = useState("");
  const [isConfSwitch, setIsConfSwitch] = useState(false);
  const [currentRole, setCurrentRole] = useState("");
  const [selectedLang, setSelectedLang] = useState(currentLanguage);

  // Debug language status
  useEffect(() => {
    console.log('🔍 Header Component - Language Status:', {
      currentLanguage,
      defaultLanguage,
      isTranslationNeeded: isTranslationNeeded(),
      translationStatus,
      availableLanguagesCount: availableLanguages.length,
      pathname: window.location.pathname
    });
    setSelectedLang(currentLanguage);
  }, [currentLanguage, defaultLanguage, translationStatus, isTranslationNeeded, availableLanguages]);

  const handleLogout = () => {
    localStorage.removeItem("tokenKey");
    navigate("/");
  };

  const handleChangePassword = () => {
    navigate("/profile");
  };

  const handleClose = () => {
    setPopupMessage(null);
    navigate("/newDash");
  };

  const handleClickOutside = (event) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target) &&
      !event.target.closest(".dropdown-toggle")
    ) {
      setDropdownOpen(false);
      setDropdownRoleOpen(false);
      setDropdownLanguageOpen(false);
    }
  };

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
      console.error(<AutoTranslate>Error fetching image source</AutoTranslate>, error);
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

      const rolePriority = ["ADMIN", "BRANCH ADMIN", "DEPARTMENT ADMIN", "USER"];

      const sortedRoles = response.data.roleNamesList.sort(
        (a, b) => rolePriority.indexOf(a) - rolePriority.indexOf(b)
      );

      setCurrentRole(response.data.employeeRole);
      setRoleName(sortedRoles);
    } catch (error) {
      console.error(<AutoTranslate>Error fetching user roles</AutoTranslate>, error);
    }
  };

  const handleRoleSwitch = async (targetRoleName) => {
    setTargetRoleName(targetRoleName);
    setShowConfirmationPopup(true);
  };

  const confirmRoleSwitch = async () => {
    try {
      setIsConfSwitch(true);
      const employeeId = localStorage.getItem("userId");
      const response = await axios.put(
        `${API_HOST}/employee/${employeeId}/role/switch`,
        { targetRoleName },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const roleId = response.data?.response?.role?.id;
      if (roleId) {
        localStorage.setItem("currRoleId", roleId);
      }

      localStorage.setItem("role", targetRoleName);
      setRole(targetRoleName);
      showPopup("Role switched successfully!", "success");
      setShowConfirmationPopup(false);

      // ✅ Trigger Sidebar to refresh menu
      triggerMenuRefresh();

      fetchUserRole();
    } catch (error) {
      showPopup(<AutoTranslate>Error switching role!</AutoTranslate>, "error");
      setShowConfirmationPopup(false);
    } finally {
      setIsConfSwitch(false);
    }
  };

  const cancelRoleSwitch = () => {
    setShowConfirmationPopup(false);
  };

  const showPopup = (message, type = "info") => {
    setPopupMessage({ message, type });
  };

  const getCurrentLanguageName = () => {
    if (!availableLanguages.length) return currentLanguage.toUpperCase();
    const lang = availableLanguages.find(l => l.code === currentLanguage);
    return lang ? lang.name.toUpperCase() : currentLanguage.toUpperCase();
  };

  const getLanguageNameByCode = (languageCode) => {
    if (!availableLanguages.length) return languageCode.toUpperCase();
    const lang = availableLanguages.find(l => l.code === languageCode);
    return lang ? lang.name : languageCode.toUpperCase();
  };

  const getLanguageNativeNameByCode = (languageCode) => {
    if (!availableLanguages.length) {
      // Default fallbacks
      switch(languageCode) {
        case 'en': return 'English';
        case 'hi': return 'हिंदी';
        case 'or': return 'ଓଡିଆ';
        case 'mr': return 'मराठी';
        default: return languageCode.toUpperCase();
      }
    }
    const lang = availableLanguages.find(l => l.code === languageCode);
    return lang ? (lang.nativeName || lang.name) : languageCode.toUpperCase();
  };

  const getLanguageIcon = (code) => {
    switch(code) {
      case 'en': return '🇺🇸';
      case 'hi': return '🇮🇳';
      case 'or': return '🇮🇳';
      case 'mr': return '🇮🇳';
      default: return '🌐';
    }
  };

  const handleLanguageChange = async (languageCode) => {
    try {
      // Show loading state
      setDropdownLanguageOpen(false);
      
      // Get language name for popup
      const languageName = getLanguageNativeNameByCode(languageCode);
      
      // Change the language
      await changeLanguage(languageCode);
      
      // Show success message with language name
      showPopup(`Language changed to ${languageName}`, "success");
      
    } catch (error) {
      console.error('Error changing language:', error);
      showPopup(<AutoTranslate>Error changing language!</AutoTranslate>, "error");
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    fetchImageSrc();
    fetchUserRole();
  }, []);

  return (
    <header className="bg-blue-800 text-white flex flex-col md:flex-row justify-between items-end shadow-inner relative">
      {popupMessage && (
        <Popup
          message={popupMessage.message}
          type={popupMessage.type}
          onClose={handleClose}
        />
      )}
      <div className="flex items-center w-full justify-between md:justify-start">
        <button
          onClick={toggleSidebar}
          className="text-gray-300 hover:text-white p-2 rounded-lg transition duration-200 mr-4"
        >
          <Bars3Icon className="h-7 w-7" />
        </button>
        <h3 className="font-bold text-lg mb-1.5">
          <AutoTranslate>Document Management System</AutoTranslate>
        </h3>
      </div>

      <div className="flex space-x-2 items-center mr-10">
        {/* Language Dropdown */}
        <div className="relative dropdown-toggle">
          <div
            className="flex items-center space-x-1 cursor-pointer hover:bg-blue-700 px-2 py-1 rounded-lg transition duration-200"
            onClick={() => setDropdownLanguageOpen(!dropdownLanguageOpen)}
          >
            <GlobeAltIcon className="h-5 w-5 text-white" />
            <span className="font-bold text-sm mr-1">{getCurrentLanguageName()}</span>
          </div>

          {dropdownLanguageOpen && (
            <DropdownMenu
              className="max-h-48 overflow-y-auto"
              items={
                availableLanguages && availableLanguages.length > 0
                  ? availableLanguages
                      .filter(lang => lang.isActive !== false)
                      .map((lang) => ({
                        label: (
                          <span className="flex items-center text-sm text-gray-800 p-2 hover:bg-gray-100 rounded">
                            <span className="mr-2">{getLanguageIcon(lang.code)}</span>
                            {getLanguageNativeNameByCode(lang.code)}
                            {lang.code === currentLanguage && (
                              <span className="ml-auto text-green-500 font-semibold">✓</span>
                            )}
                          </span>
                        ),
                        onClick: () => handleLanguageChange(lang.code),
                      }))
                  : 

                  []
              }
              onSelect={(item) => item.onClick && item.onClick()}
              emptyMessage={<AutoTranslate>No languages available</AutoTranslate>}
            />
          )}
        </div>

        <NotificationBell />
        <h1 className="text-3xl mb-2">|</h1>

        {/* Role Dropdown */}
        <div className="relative dropdown-toggle">
          <div
            className="flex items-center space-x-2 cursor-pointer hover:bg-blue-700 px-2 py-1 rounded-lg transition duration-200"
            onClick={() => setDropdownRoleOpen(!dropdownRoleOpen)}
          >
            <PiUserSwitchFill className="h-10 w-10" />
            <span className="font-bold text-sm mr-1">{role || <AutoTranslate>Role</AutoTranslate>}</span>
          </div>

          {dropdownRoleOpen && (
            <DropdownMenu
              className="max-h-48 overflow-y-auto"
              items={
                Array.isArray(roleName)
                  ? roleName
                    .filter((roleItem) => roleItem !== currentRole)
                    .map((roleItem) => {
                      let IconComponent = FiUser;
                      if (roleItem === "ADMIN") IconComponent = TbPasswordUser;
                      else if (roleItem === "BRANCH ADMIN") IconComponent = TbUserCog;
                      else if (roleItem === "DEPARTMENT ADMIN") IconComponent = PiUserCircleGear;

                      return {
                        label: (
                          <span className="flex items-center text-sm text-gray-800 p-2 hover:bg-gray-100 rounded">
                            <IconComponent className="h-5 w-5 mr-2" /> {roleItem}
                          </span>
                        ),
                        onClick: () => {
                          handleRoleSwitch(roleItem);
                          setDropdownRoleOpen(false);
                        },
                      };
                    })
                  : []
              }
              onSelect={(item) => item.onClick && item.onClick()}
              emptyMessage={<AutoTranslate>No Multiple roles available</AutoTranslate>}
            />
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <div
            className="flex items-center space-x-2 cursor-pointer hover:bg-blue-700 px-2 py-1 rounded-lg transition duration-200"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <h1 className="text-3xl pb-2 mr-1">|</h1>
            <span className="font-bold text-sm mr-1 flex-shrink-0 whitespace-nowrap">
              {UserName}
            </span>
            <img
              src={imageSrc || adminPhoto}
              onError={(e) => (e.currentTarget.src = adminPhoto)}
              alt={getFallbackTranslation('Profile', currentLanguage)}
              className="h-8 w-8 rounded-full"
            />
          </div>

          {dropdownOpen && (
            <DropdownMenu
              items={[
                {
                  label: (
                    <span className="flex items-center text-gray-800 p-1 text-sm">
                      <PencilIcon className="h-4 w-4 mr-2" /> <AutoTranslate>Edit Profile</AutoTranslate>
                    </span>
                  ),
                  onClick: handleChangePassword,
                },
                {
                  label: (
                    <span className="flex items-center text-gray-800 p-1 text-sm">
                      <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" /> <AutoTranslate>Logout</AutoTranslate>
                    </span>
                  ),
                  onClick: handleLogout,
                },
              ]}
              onSelect={(item) => item.onClick && item.onClick()}
              emptyMessage={<AutoTranslate>No options available</AutoTranslate>}
            />
          )}
        </div>

        {/* Confirmation Popup */}
        {showConfirmationPopup && (
          <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-96 relative z-60">
              <h2 className="text-lg font-semibold mb-4">
                <AutoTranslate>Confirm Role Switch</AutoTranslate>
              </h2>
              <p className="text-gray-700 mb-6">
                <AutoTranslate>Are you sure you want to switch to the role:</AutoTranslate>{" "}
                <strong>{targetRoleName}</strong>?
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={cancelRoleSwitch}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                >
                  <AutoTranslate>Cancel</AutoTranslate>
                </button>
                <button
                  onClick={confirmRoleSwitch}
                  disabled={isConfSwitch}
                  className={`bg-indigo-500 text-white px-4 py-2 rounded transition duration-300 no-print ${isConfSwitch ? "opacity-50 cursor-not-allowed" : "hover:bg-indigo-600"
                    }`}
                >
                  {isConfSwitch ? (
                    <span className="flex items-center">
                      <ImSpinner2 className="animate-spin mr-2" /> <AutoTranslate>Switching...</AutoTranslate>
                    </span>
                  ) : (
                    <AutoTranslate>Confirm</AutoTranslate>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export default React.memo(Header);