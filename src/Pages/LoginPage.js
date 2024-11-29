import React, { useState, useEffect } from "react";
import {
  EyeIcon,
  UserIcon,
  LockClosedIcon,
  ArrowPathIcon,
  EyeSlashIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/solid";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { LOGIN_API, LOGIN_API_verify } from "../API/apiConfig";
import image from "../Assets/image.png";
import logo2 from "../Assets/logo2.jpg";

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isOtpRequested, setIsOtpRequested] = useState(false);
  const [otp, setOtp] = useState("");
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    captcha: "",
  });
  const [captcha, setCaptcha] = useState([]);
  const [alertMessage, setAlertMessage] = useState("");
  const navigate = useNavigate();
  const [isRotated, setIsRotated] = useState(false);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);

  // Keep existing constants
  const CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const LENGTH = 5;

  useEffect(() => {
    setCaptcha(generateCaptcha());
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAlertMessage("");
    }, 3000);
    return () => clearTimeout(timer);
  }, [alertMessage]);

  // Existing captcha generation function
  const generateCaptcha = () => {
    let captchaArray = [];
    let previousOffsetX = 0;

    for (let i = 0; i < LENGTH; i++) {
      const character = CHARACTERS.charAt(Math.floor(Math.random() * CHARACTERS.length));
      const rotation = Math.floor(Math.random() * 20) - 10;
      const offsetX = previousOffsetX + 15;
      const offsetY = Math.floor(Math.random() * 10) - 5;

      captchaArray.push({ character, rotation, offsetX, offsetY });
      previousOffsetX = offsetX;
    }

    return captchaArray;
  };

  // New back button handler
  const handleBack = () => {
    setIsOtpRequested(false);
    setOtp("");
  };

  // Existing functions with minor modifications
  const handleRefresh = () => {
    setCaptcha(generateCaptcha());
    setIsRotated(true);
    setTimeout(() => setIsRotated(false), 1000);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOtpChange = (e) => {
    setOtp(e.target.value);
  };

  const handleCaptchaPaste = (e) => {
    e.preventDefault();
  };

  const requestOtp = async () => {
    if (!formData.username || !formData.password || !formData.captcha) {
      setAlertMessage("Please fill in all fields before requesting OTP.");
      return;
    }

    if (formData.captcha !== captcha.map(item => item.character).join("")) {
      setAlertMessage("Invalid captcha. Please try again.");
      handleRefresh();
      return;
    }

    setIsButtonDisabled(true);

    try {
      const response = await axios.post(LOGIN_API, {
        email: formData.username,
        password: formData.password,
      });

      if (response.status === 200) {
        if (response.data.role === null) {
          setAlertMessage("Employee Type not assigned. Please contact Admin.");
          return;
        }
        setIsOtpRequested(true);
        setAlertMessage("OTP has been sent to your email.");
      }
    } catch (error) {
      setAlertMessage(error.response?.data?.message || "Invalid username or password.");
    } finally {
      setIsButtonDisabled(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!otp) {
      setAlertMessage("Please enter OTP to proceed.");
      return;
    }

    setIsButtonDisabled(true);

    try {
      const response = await axios.post(LOGIN_API_verify, {
        email: formData.username,
        otp: otp,
      });

      if (response.status === 200) {
        const { token, roles, name, id } = response.data;
        localStorage.setItem("tokenKey", token);
        localStorage.setItem("email", formData.username);
        localStorage.setItem("UserName", name);
        localStorage.setItem("role", roles);
        localStorage.setItem("userId", id);

        navigate("/dashboard");
      }
    } catch (error) {
      setAlertMessage(error.response?.data?.message || "Invalid OTP.");
    } finally {
      setIsButtonDisabled(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left side - Image */}
      <div className="hidden lg:block lg:w-1/2">
        <img
          src={image}
          alt="Login"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-4 md:p-8">
        {/* Logo and Title */}
        <div className="w-full max-w-md text-center mb-4">
          <img
            src={logo2}
            alt="AGT Document Management System"
            className="mx-auto h-32 w-64 object-cover mb-2"
          />
          <h2 className="text-2xl text-blue-800 font-semibold">
            Document Management System
          </h2>
        </div>

        <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6 md:p-8">
          {isOtpRequested && (
            <button
              onClick={handleBack}
              className="flex items-center text-blue-600 mb-4 hover:text-blue-700"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Back to Login
            </button>
          )}

          <div className="mb-4 text-center">
            <h2 className={`text-2xl font-bold ${isOtpRequested ? "text-gray-900" : "text-indigo-600"}`}>
              {isOtpRequested ? "Enter OTP" : "Welcome Back"}
            </h2>
            <p className="text-gray-600 mt-2">
              {isOtpRequested
                ? "Please enter the OTP sent to your email"
                : "Please sign in to your account"}
            </p>
          </div>

          {alertMessage && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
              {alertMessage}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            {!isOtpRequested ? (
              <>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UserIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      className="pl-10 w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LockClosedIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="pl-10 w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="w-5 h-5 text-gray-400" />
                      ) : (
                        <EyeIcon className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Captcha
                  </label>
                  <div className="flex items-center space-x-4">
                    <div className="flex-1 p-3 bg-gray-100 rounded-md select-none">
                      {captcha.map((item, index) => (
                        <span
                          key={index}
                          style={{
                            display: "inline-block",
                            transform: `rotate(${item.rotation}deg) translate(${item.offsetX}px, ${item.offsetY}px)`,
                          }}
                          className="text-gray-800"
                        >
                          {item.character}
                        </span>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={handleRefresh}
                      className="p-2 text-blue-600 hover:text-blue-700"
                    >
                      <ArrowPathIcon className={`w-5 h-5 ${isRotated ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                  <input
                    type="text"
                    name="captcha"
                    value={formData.captcha}
                    onChange={handleInputChange}
                    onPaste={handleCaptchaPaste}
                    className="mt-2 w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter captcha"
                    required
                  />
                </div>

                <button
                  type="button"
                  onClick={requestOtp}
                  disabled={isButtonDisabled}
                  className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isButtonDisabled ? "Requesting OTP..." : "Request OTP"}
                </button>
              </>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    OTP
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={handleOtpChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter OTP"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isButtonDisabled}
                  className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isButtonDisabled ? "Logging in..." : "Login"}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;