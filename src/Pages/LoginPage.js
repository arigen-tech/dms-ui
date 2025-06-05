import React, { useState, useEffect } from "react";
import {
  EyeIcon,
  UserIcon,
  LockClosedIcon,
  ArrowPathIcon,
  EyeSlashIcon,
  ArrowLeftIcon,
  ClockIcon,
} from "@heroicons/react/24/solid";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { LOGIN_API, LOGIN_API_verify } from "../API/apiConfig";
import image from "../Assets/image.png";
import logo2 from "../Assets/logo2.jpg";
import { jwtDecode } from "jwt-decode";

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
  const [alertType, setAlertType] = useState("error"); // 'error' or 'success'
  const navigate = useNavigate();
  const [isRotated, setIsRotated] = useState(false);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  
  // OTP Timer states
  const [otpTimer, setOtpTimer] = useState(300); // 5 minutes in seconds
  const [canResendOtp, setCanResendOtp] = useState(false);
  const [resendTimer, setResendTimer] = useState(30); // 30 seconds before resend is allowed

  // Keep existing constants
  const CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const LENGTH = 5;

  useEffect(() => {
    setCaptcha(generateCaptcha());
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAlertMessage("");
    }, 5000);
    return () => clearTimeout(timer);
  }, [alertMessage]);

  // OTP Timer Effect
  useEffect(() => {
    let interval = null;
    if (isOtpRequested && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer(timer => timer - 1);
      }, 1000);
    } else if (otpTimer === 0) {
      setAlertMessage("OTP has expired. Please request a new one.");
      setAlertType("error");
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isOtpRequested, otpTimer]);

  // Resend Timer Effect
  useEffect(() => {
    let interval = null;
    if (isOtpRequested && resendTimer > 0 && !canResendOtp) {
      interval = setInterval(() => {
        setResendTimer(timer => {
          if (timer === 1) {
            setCanResendOtp(true);
          }
          return timer - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isOtpRequested, resendTimer, canResendOtp]);

  // Enhanced captcha generation function with better visual effects
  const generateCaptcha = () => {
    let captchaArray = [];
    const colors = ['#2563eb', '#dc2626', '#059669', '#7c3aed', '#ea580c'];
    
    for (let i = 0; i < LENGTH; i++) {
      const character = CHARACTERS.charAt(
        Math.floor(Math.random() * CHARACTERS.length)
      );
      const rotation = Math.floor(Math.random() * 30) - 15; // Increased rotation range
      const fontSize = Math.floor(Math.random() * 8) + 18; // Random font sizes between 18-26px
      const color = colors[Math.floor(Math.random() * colors.length)];
      const offsetY = Math.floor(Math.random() * 10) - 5;
      const skew = Math.floor(Math.random() * 20) - 10;

      captchaArray.push({ 
        character, 
        rotation, 
        fontSize, 
        color, 
        offsetY, 
        skew,
        id: i 
      });
    }

    return captchaArray;
  };

  // Format timer display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const showAlert = (message, type = "error") => {
    setAlertMessage(message);
    setAlertType(type);
  };

  // New back button handler
  const handleBack = () => {
    setIsOtpRequested(false);
    setOtp("");
    setOtpTimer(300);
    setCanResendOtp(false);
    setResendTimer(30);
  };

  // Existing functions with minor modifications
  const handleRefresh = () => {
    setCaptcha(generateCaptcha());
    setIsRotated(true);
    setTimeout(() => setIsRotated(false), 1000);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    if (value.length <= 6) { // Assuming OTP is 6 digits
      setOtp(value);
    }
  };

  const handleCaptchaPaste = (e) => {
    e.preventDefault();
  };

  const requestOtp = async () => {
    if (!formData.username || !formData.password || !formData.captcha) {
      showAlert("Please fill in all fields before requesting OTP.");
      return;
    }

    if (formData.captcha !== captcha.map((item) => item.character).join("")) {
      showAlert("Invalid captcha. Please try again.");
      handleRefresh();
      setFormData(prev => ({ ...prev, captcha: "" }));
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
          showAlert("Employee Type not assigned. Please contact Admin.");
          return;
        }
        setIsOtpRequested(true);
        setOtpTimer(300); // Reset timer to 5 minutes
        setCanResendOtp(false);
        setResendTimer(30);
        showAlert("OTP has been sent to your email.", "success");
      }
    } catch (error) {
      showAlert(
        error.response?.data?.message || "Invalid username or password."
      );
    } finally {
      setIsButtonDisabled(false);
    }
  };

  const resendOtp = async () => {
    if (!canResendOtp) return;
    
    setIsButtonDisabled(true);
    try {
      const response = await axios.post(LOGIN_API, {
        email: formData.username,
        password: formData.password,
      });

      if (response.status === 200) {
        setOtpTimer(300); // Reset timer to 5 minutes
        setCanResendOtp(false);
        setResendTimer(30);
        showAlert("New OTP has been sent to your email.", "success");
      }
    } catch (error) {
      showAlert("Failed to resend OTP. Please try again.");
    } finally {
      setIsButtonDisabled(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (otpTimer === 0) {
      showAlert("OTP has expired. Please request a new one by clicking resend.");
      return;
    }

    if (!otp) {
      showAlert("Please enter OTP to proceed.");
      return;
    }

    if (otp.length < 4) { 
      showAlert("Please enter a valid OTP.");
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

        // Decode the token to get the expiration time
        const decodedToken = jwtDecode(token);
        const expirationTime = decodedToken.exp; // `exp` is in seconds

        // Store values in localStorage
        localStorage.setItem("tokenKey", token);
        localStorage.setItem("token_expiration", expirationTime);
        localStorage.setItem("email", formData.username);
        localStorage.setItem("UserName", name);
        localStorage.setItem("role", roles);
        localStorage.setItem("userId", id);

        const redirectUrl = localStorage.getItem("redirectUrl");
        if (redirectUrl) {
          localStorage.removeItem("redirectUrl");
          navigate(redirectUrl);
        } else {
          navigate("/dashboard");
        }
      }
    } catch (error) {
      showAlert(error.response?.data?.message || "Invalid OTP.");
    } finally {
      setIsButtonDisabled(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left side - Image */}
      <div className="max-w-0 lg:max-w-full lg:w-1/2">
        <img
          src={image}
          alt="Login"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-4 md:p-8">
        {/* Logo and Title */}
        <div className="w-full max-w-md text-center mb-2">
          <img
            src={logo2}
            alt="AGT Document Management System"
            className="mx-auto w-28 object-cover mb-4"
          />
          <h2 className="text-xl text-blue-800 font-semibold">
            Document Management System
          </h2>
        </div>

        <div className="w-full max-w-md bg-white rounded-lg shadow-lg border border-gray-200 p-6">
          {isOtpRequested && (
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handleBack}
                className="flex items-center text-blue-600 hover:text-blue-700 transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back to Login
              </button>
              <div className="flex items-center text-sm text-gray-600">
                <ClockIcon className="w-4 h-4 mr-1" />
                {formatTime(otpTimer)}
              </div>
            </div>
          )}

          <div className="mb-6 text-center">
            <h2
              className={`text-2xl font-bold ${isOtpRequested ? "text-gray-900" : "text-indigo-600"
                }`}
            >
              {isOtpRequested ? "Enter OTP" : "Welcome Back"}
            </h2>
            <p className="text-gray-600 mt-2">
              {isOtpRequested
                ? "Please enter the OTP sent to your email"
                : "Please sign in to your account"}
            </p>
          </div>

          {alertMessage && (
            <div className={`mb-4 p-3 rounded-md border ${
              alertType === "success"
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-red-50 text-red-700 border-red-200"
            }`}>
              {alertMessage}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            {!isOtpRequested ? (
              <>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UserIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <input
                      type="email"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      className="pl-10 w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter your username"
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
                      <LockClosedIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="pl-10 w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 hover:bg-gray-100 p-1 rounded"
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="w-5 h-5 text-blue-600" />
                      ) : (
                        <EyeIcon className="w-5 h-5 text-blue-600" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Captcha
                  </label>
                  <div className="flex items-center space-x-3">
                    <div className="flex-1 p-4 bg-gradient-to-r from-gray-100 to-gray-200 rounded-md select-none border-2 border-dashed border-gray-300 relative overflow-hidden">
                      {/* Add some noise/lines for more authentic captcha look */}
                      <div className="absolute inset-0">
                        <svg className="w-full h-full opacity-20">
                          <line x1="0" y1="20" x2="100%" y2="10" stroke="#6b7280" strokeWidth="1"/>
                          <line x1="20%" y1="0" x2="80%" y2="100%" stroke="#6b7280" strokeWidth="1"/>
                          <line x1="60%" y1="0" x2="40%" y2="100%" stroke="#6b7280" strokeWidth="1"/>
                        </svg>
                      </div>
                      <div className="relative flex items-center justify-center space-x-1">
                        {captcha.map((item, index) => (
                          <span
                            key={item.id}
                            style={{
                              display: "inline-block",
                              transform: `rotate(${item.rotation}deg) skew(${item.skew}deg) translateY(${item.offsetY}px)`,
                              fontSize: `${item.fontSize}px`,
                              color: item.color,
                              fontWeight: Math.random() > 0.5 ? 'bold' : 'normal',
                              fontFamily: Math.random() > 0.5 ? 'serif' : 'sans-serif',
                              textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                            }}
                            className="mx-1 select-none"
                          >
                            {item.character}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRefresh}
                      className="p-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                      title="Refresh Captcha"
                    >
                      <ArrowPathIcon
                        className={`w-5 h-5 ${isRotated ? "animate-spin" : ""}`}
                      />
                    </button>
                  </div>
                  <input
                    type="text"
                    name="captcha"
                    value={formData.captcha}
                    onChange={handleInputChange}
                    onPaste={handleCaptchaPaste}
                    className="mt-2 w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Enter captcha"
                    required
                  />
                </div>

                <button
                  type="button"
                  onClick={requestOtp}
                  disabled={isButtonDisabled}
                  className="w-full py-3 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {isButtonDisabled ? "Requesting OTP..." : "Request OTP"}
                </button>
              </>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Enter OTP
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={handleOtpChange}
                    className={`w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-lg tracking-widest transition-colors ${
                      otpTimer === 0 ? 'bg-gray-100' : ''
                    }`}
                    placeholder="Enter OTP"
                    maxLength="6"
                    required
                    disabled={otpTimer === 0}
                  />
                </div>
                
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={isButtonDisabled || otpTimer === 0}
                    className={`flex-1 py-3 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium`}
                  >
                    {isButtonDisabled ? "Logging in..." : otpTimer === 0 ? "OTP Expired" : "Login"}
                  </button>
                  
                  <button
                    type="button"
                    onClick={resendOtp}
                    disabled={!canResendOtp || isButtonDisabled}
                    className="px-4 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {!canResendOtp ? `Resend (${resendTimer}s)` : "Resend OTP"}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;