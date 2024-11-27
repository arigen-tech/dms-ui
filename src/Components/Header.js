import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bars3Icon, KeyIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/solid';
import adminPhoto from '../Assets/profile.svg';

function Header({ toggleSidebar, userName }) {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const UserName = localStorage.getItem('UserName')

  const handleLogout = () => {
    localStorage.removeItem('Token');
    navigate('/');
  };

  const handleChangePassword = () => {
    navigate('/change-password'); // Navigate to the change password page
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const handleClickOutside = (event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setDropdownOpen(false);
    }
  };

  useEffect(() => {
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  return (
    <header className="bg-blue-800 text-white p-0.5 flex justify-between items-center shadow-inner relative">
      <div className="flex">
        <button
          onClick={toggleSidebar}
          className="text-gray-300 hover:text-white p-2 rounded-lg flex items-center transition duration-200 mr-4"
        >
          <Bars3Icon className="h-7 w-7" />
        </button>
        <h2 className="font-bold text-2xl">
          <span className="font-light">Document Management System</span>
        </h2>
      </div>
      <div className="flex space-x-4 items-center mr-4">
        <div className="relative" ref={dropdownRef}>
          <div
            className="flex items-center space-x-2 cursor-pointer"
            onClick={toggleDropdown}
          >
            <h1 className="text-3xl pb-2 mr-1 font-light">|</h1>
            <span className="font-light text-sm mr-1">{UserName}</span>
            <img src={adminPhoto} alt="Admin" className="h-8 w-8 rounded-full" />
          </div>
          {dropdownOpen && (
            <div className="absolute right-0 mt-0.5 w-48 bg-white rounded-md shadow-lg z-10">
              <button
                onClick={handleChangePassword}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
              >
                <KeyIcon className="h-5 w-5 mr-2 text-gray-500" />
                Change Password
              </button>
              <hr className='border-t border-gray-200'/>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5 mr-2 text-gray-500" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;