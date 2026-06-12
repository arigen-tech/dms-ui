import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { PencilIcon, ArrowRightOnRectangleIcon } from "@heroicons/react/24/solid";
import { CgMenuRight } from "react-icons/cg";
import { FaEarthAmericas } from "react-icons/fa6";
import adminPhoto from "../Assets/profile.svg";
import { PiUserSwitchFill } from "react-icons/pi";
import { TbPasswordUser, TbUserCog } from "react-icons/tb";
import { PiUserCircleGear } from "react-icons/pi";
import { FiUser, FiGlobe } from "react-icons/fi";
import apiClient from "../API/apiClient";
import { getEmployeeImage } from "../API/apiClient";
import { API_HOST, SYSTEM_ADMIN, BRANCH_ADMIN, DEPARTMENT_ADMIN, USER } from "../API/apiConfig";
import Popup from "../Components/Popup";
import { NotificationBell } from "../Data/Notification";
import { ImSpinner2 } from "react-icons/im";
// Import AutoTranslate components
import AutoTranslate from '../i18n/AutoTranslate';
import { useLanguage } from '../i18n/LanguageContext';
import { getFallbackTranslation } from '../i18n/autoTranslator';

const DropdownMenu = ({ items, onSelect, emptyMessage, className }) => (
  <div className={`absolute right-0 mt-0.5 w-48 bg-white rounded-md shadow-lg z-10 dropDownMenu ${className}`}>
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

function Header({ toggleSidebar, userName, triggerMenuRefresh }) {
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
  const [currentRole, setCurrentRole] = useState(localStorage.getItem("role") || "");
  const [showConfirmationPopup, setShowConfirmationPopup] = useState(false);
  const [targetRoleName, setTargetRoleName] = useState("");
  const [isConfSwitch, setIsConfSwitch] = useState(false);
  const [selectedLang, setSelectedLang] = useState(currentLanguage);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);

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
      const employeeId = localStorage.getItem("id");
      const imageArrayBuffer = await getEmployeeImage(employeeId);
      const imageBlob = new Blob([imageArrayBuffer], { type: "image/jpeg" });
      const imageUrl = URL.createObjectURL(imageBlob);
      setImageSrc(imageUrl);
    } catch (error) {
      console.error("Error fetching image source", error);
    }
  };

  const fetchUserRole = async () => {
    try {
      setIsLoadingRoles(true);
      const employeeId = localStorage.getItem("id");

      const response = await apiClient.get(`${API_HOST}/api/EmpRole/${employeeId}/roles/active`);

      const rolePriority = [SYSTEM_ADMIN, BRANCH_ADMIN, DEPARTMENT_ADMIN, USER];

      const sortedRoles = response.data.roleNamesList.sort(
        (a, b) => rolePriority.indexOf(a) - rolePriority.indexOf(b)
      );

      const employeeRole = response.data.employeeRole;
      
      // Set current role from API response
      setCurrentRole(employeeRole);
      
      // Also update localStorage with the current role
      localStorage.setItem("role", employeeRole);
      
      // Store all available roles
      setRoleName(sortedRoles);
      
      console.log("✅ Roles fetched:", {
        currentRole: employeeRole,
        availableRoles: sortedRoles,
        storedRole: localStorage.getItem("role")
      });
      
    } catch (error) {
      console.error("Error fetching user roles", error);
      // Fallback to localStorage if API fails
      const storedRole = localStorage.getItem("role");
      if (storedRole) {
        setCurrentRole(storedRole);
        setRoleName([storedRole]);
      }
    } finally {
      setIsLoadingRoles(false);
    }
  };

  const handleRoleSwitch = async (targetRoleName) => {
    setTargetRoleName(targetRoleName);
    setShowConfirmationPopup(true);
  };

  const confirmRoleSwitch = async () => {
    try {
      setIsConfSwitch(true);
      const employeeId = localStorage.getItem("id");
      const response = await apiClient.put(
        `/employee/${employeeId}/role/switch`,
        { targetRoleName }
      );

      const roleId = response.data?.response?.role?.id;
      if (roleId) {
        localStorage.setItem("currRoleId", roleId);
      }

      // Update localStorage with new role
      localStorage.setItem("role", targetRoleName);
      
      // Update state
      setCurrentRole(targetRoleName);
      setRole(targetRoleName);
      
      showPopup("Role switched successfully", "success");
      setShowConfirmationPopup(false);

      // Trigger Sidebar to refresh menu
      triggerMenuRefresh();

      // Refresh roles list
      await fetchUserRole();
      
    } catch (error) {
      console.error("Error switching role:", error);
      showPopup("Error switching role", "error");
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
      switch (languageCode) {
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
    switch (code) {
      case 'en': return '🇺🇸';
      case 'hi': return '🇮🇳';
      case 'or': return '🇮🇳';
      case 'mr': return '🇮🇳';
      default: return '🌐';
    }
  };

  const handleLanguageChange = async (languageCode) => {
    try {
      setDropdownLanguageOpen(false);
      const languageName = getLanguageNativeNameByCode(languageCode);
      await changeLanguage(languageCode);
      showPopup(`Language changed to ${languageName}`, "success");
    } catch (error) {
      console.error('Error changing language:', error);
      showPopup("Error changing language!", "error");
    }
  };

  // Get display role name (shows actual role, not just "Role")
  const getDisplayRoleName = () => {
    if (isLoadingRoles) {
      return <AutoTranslate>Loading...</AutoTranslate>;
    }
    if (currentRole && currentRole !== "") {
      // Format role name for display (remove underscores, capitalize)
      let displayRole = currentRole;
      if (currentRole === "SYSTEM_ADMIN") displayRole = "System Admin";
      else if (currentRole === "BRANCH_ADMIN") displayRole = "Branch Admin";
      else if (currentRole === "DEPARTMENT_ADMIN") displayRole = "Department Admin";
      else if (currentRole === "USER") displayRole = "User";
      return displayRole;
    }
    return <AutoTranslate>Role</AutoTranslate>;
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
    <header className="bg-blue-800- text-white- flex- flex-col- md:flex-row- justify-between- items-end- shadow-inner- relative-">
      {popupMessage && (
        <Popup
          message={popupMessage.message}
          type={popupMessage.type}
          onClose={handleClose}
        />
      )}
      <div className="itemToggleBtn">
        <button onClick={toggleSidebar} className="menuBtn" >
          <CgMenuRight />
        </button>
        <div className="mainHeading">
          <AutoTranslate>Document Management System</AutoTranslate>
        </div>
      </div>

      <div className="topRightMenu">
        {/* Language Dropdown */}
        <div className="dropdown-toggle">
          <button className="dropDownIcon" onClick={() => setDropdownLanguageOpen(!dropdownLanguageOpen)}>
            <span className="iconBg"><FaEarthAmericas /></span>
            <span>{getCurrentLanguageName()}</span>
          </button>
          <DropdownMenu 
            className="max-h-48 overflow-y-auto"
            items={
              availableLanguages && availableLanguages.length > 0
                ? availableLanguages
                  .filter(lang => lang.isActive !== false)
                  .map((lang) => ({
                    label: (
                      <span className="flex items-center text-sm text-gray-800 hover:bg-gray-100 rounded">
                        <span className="mr-3 langIcon">{getLanguageIcon(lang.code)}</span>
                        <span>{getLanguageNativeNameByCode(lang.code)}</span>
                        {lang.code === currentLanguage && (
                          <span className="ml-auto text-green-500 font-semibold">✓</span>
                        )}
                      </span>
                    ),
                    onClick: () => handleLanguageChange(lang.code),
                  }))
                : []
            }
            onSelect={(item) => item.onClick && item.onClick()}
            emptyMessage={<AutoTranslate>No languages available</AutoTranslate>}
          />
        </div>

        {/* Role Dropdown - Shows actual role instead of just "Role" */}
        <div className="dropdown-toggle">
          <button className="dropDownIcon" onClick={() => setDropdownRoleOpen(!dropdownRoleOpen)}>
            <span className="iconBg">
              <PiUserSwitchFill />
            </span>
            <span>{getDisplayRoleName()}</span>
          </button>

          <DropdownMenu
            className="max-h-48 overflow-y-auto"
            items={
              Array.isArray(roleName) && roleName.length > 0
                ? roleName
                  .filter((roleItem) => roleItem !== currentRole)
                  .map((roleItem) => {
                    let IconComponent = FiUser;
                    let displayRoleName = roleItem;
                    
                    if (roleItem === SYSTEM_ADMIN) {
                      IconComponent = TbPasswordUser;
                      displayRoleName = "System Admin";
                    } else if (roleItem === BRANCH_ADMIN) {
                      IconComponent = TbUserCog;
                      displayRoleName = "Branch Admin";
                    } else if (roleItem === DEPARTMENT_ADMIN) {
                      IconComponent = PiUserCircleGear;
                      displayRoleName = "Department Admin";
                    } else if (roleItem === USER) {
                      IconComponent = FiUser;
                      displayRoleName = "User";
                    }

                    return {
                      label: (
                        <span className="flex items-center text-sm text-gray-800 hover:bg-gray-100 rounded">
                          <IconComponent className="h-5 w-5 mr-3" />
                          <span>{displayRoleName}</span>
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
            emptyMessage={
              isLoadingRoles 
                ? <AutoTranslate>Loading roles...</AutoTranslate> 
                : <AutoTranslate>No multiple roles available</AutoTranslate>
            }
          />
        </div>

        {/* Notification component */}
        <div className="dropdown-toggle">
          <NotificationBell />
        </div>

        {/* Profile Dropdown */}
        <div className="dropdown-toggle" ref={dropdownRef}>
          <button className="dropDownIcon" onClick={() => setDropdownOpen(!dropdownOpen)}>
            {UserName && <span>{UserName}</span>}
            <img
              src={imageSrc || adminPhoto}
              onError={(e) => (e.currentTarget.src = adminPhoto)}
              alt={getFallbackTranslation('Profile', currentLanguage)}
            />
          </button>
          <DropdownMenu
            items={[
              {
                label: (
                  <span className="flex items-center text-gray-800 text-sm">
                    <PencilIcon className="h-4 w-4 mr-3" />
                    <AutoTranslate>Edit Profile</AutoTranslate>
                  </span>
                ),
                onClick: handleChangePassword,
              },
              {
                label: (
                  <span className="flex items-center text-gray-800 text-sm">
                    <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
                    <AutoTranslate>Logout</AutoTranslate>
                  </span>
                ),
                onClick: handleLogout,
              },
            ]}
            onSelect={(item) => item.onClick && item.onClick()}
            emptyMessage={<AutoTranslate>No options available</AutoTranslate>}
          />
        </div>
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
              <strong>
                {targetRoleName === SYSTEM_ADMIN ? "System Admin" :
                 targetRoleName === BRANCH_ADMIN ? "Branch Admin" :
                 targetRoleName === DEPARTMENT_ADMIN ? "Department Admin" :
                 targetRoleName === USER ? "User" : targetRoleName}
              </strong>?
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={cancelRoleSwitch}
                className="btn-cancel"
              >
                <AutoTranslate>Cancel</AutoTranslate>
              </button>
              <button
                onClick={confirmRoleSwitch}
                disabled={isConfSwitch}
                className={`btn-primary no-print ${isConfSwitch ? "opacity-50 cursor-not-allowed" : ""
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
    </header>
  );
}

export default React.memo(Header);