import React, { useState, useEffect, useRef } from "react";
import {
  EyeIcon,
  UserIcon,
  LockClosedIcon,
  ArrowPathIcon,
  EyeSlashIcon,
  ArrowLeftIcon,
  ClockIcon,
  InformationCircleIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/solid";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { LOGIN_API, LOGIN_API_verify, FORGATE_PASS_API, VERIFY_FORGATE_OTP, RESET_PASS_API, API_HOST } from "../API/apiConfig";
import image from "../Assets/image.png";
import logo2 from "../Assets/logo2.png";
import { jwtDecode } from "jwt-decode";
import AutoTranslate from "../i18n/AutoTranslate";
import { useLanguage } from "../i18n/LanguageContext";
import { getFallbackTranslation } from '../i18n/autoTranslator';
import apiClient from "../API/apiClient";

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isOtpRequested, setIsOtpRequested] = useState(false);
  const [currentView, setCurrentView] = useState("login");
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    captcha: "",
  });
  const [forgotOtpDigits, setForgotOtpDigits] = useState(Array(6).fill(""));
  const [forgotPasswordData, setForgotPasswordData] = useState({
    identifier: "",
    identifierType: "email",
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [optBlockIsEnabled, setOptBlockIsEnabled] = useState(false);
  const [captchaText, setCaptchaText] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("error");
  const navigate = useNavigate();
  const [isRotated, setIsRotated] = useState(false);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const [otpDigits, setOtpDigits] = useState(Array(6).fill(""));
  const [otpTimer, setOtpTimer] = useState(300);
  const [canResendOtp, setCanResendOtp] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [showTooltip, setShowTooltip] = useState(false);
  const [otpIsEnabled, setOtpIsEnabled] = useState(false);
  const canvasRef = useRef(null);

  // Use language context
  const {
    currentLanguage,
    defaultLanguage,
    translationStatus,
    isLoadingLanguages,
    isTranslationNeeded,
    availableLanguages,
    changeLanguage,
    translate,
    preloadTranslationsForTerms
  } = useLanguage();

  useEffect(() => {
    console.log('🔍 DocumentManagement Component - Language Status:', {
      currentLanguage,
      defaultLanguage,
      isTranslationNeeded: isTranslationNeeded(),
      translationStatus,
      availableLanguagesCount: availableLanguages.length,
      pathname: window.location.pathname
    });
  }, [currentLanguage, defaultLanguage, translationStatus, isTranslationNeeded, availableLanguages]);

  useEffect(() => {
    const fetchOtpFlag = async () => {
      try {
        console.log("Calling OTP API...");
        const response = await apiClient.get(`/auth/is-otp-enabled`);

        console.log("OTP Flag:", response.data);

        setOtpIsEnabled(response.data);
        localStorage.setItem("otpIsEnabled", String(response.data));
      } catch (error) {
        console.error("Error fetching OTP flag:", error);
        setOtpIsEnabled(false);
      }
    };

    fetchOtpFlag();
  }, []);

  const [selectedLanguageId, setSelectedLanguageId] = useState(null);

  // CHARACTERS for captcha - removed ambiguous ones
  const CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const CAPTCHA_LENGTH = 6;

  // Load languages and set selected language
  useEffect(() => {
    generateCaptcha();

    // Set selected language based on current language in context
    if (availableLanguages.length > 0) {
      // First try to use saved language from localStorage
      const savedLang = localStorage.getItem('uilanguage');

      if (savedLang) {
        const savedLangObj = availableLanguages.find(l => l.code === savedLang);
        if (savedLangObj) {
          setSelectedLanguageId(savedLangObj.id);
          // Also update context if different
          if (currentLanguage !== savedLang) {
            changeLanguage(savedLang);
          }
        }
      }

      // If no saved language or not found, use English
      if (!selectedLanguageId) {
        const englishLang = availableLanguages.find(l => l.code === 'en');
        if (englishLang) {
          setSelectedLanguageId(englishLang.id);
        }
      }
    }
  }, [availableLanguages]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAlertMessage("");
    }, 5000);
    return () => clearTimeout(timer);
  }, [alertMessage]);

  useEffect(() => {
    let interval = null;
    if ((isOtpRequested || currentView === "forgot-otp" || currentView === "reset-password") && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer(timer => timer - 1);
      }, 1000);
    } else if (otpTimer === 0) {
      setAlertMessage("OTP has expired. Please request a new one.");
      setAlertType("error");
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isOtpRequested, currentView, otpTimer]);

  useEffect(() => {
    let interval = null;
    if ((isOtpRequested || currentView === "forgot-otp" || currentView === "reset-password") && resendTimer > 0 && !canResendOtp) {
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
  }, [isOtpRequested, currentView, resendTimer, canResendOtp]);

  // PROPER CAPTCHA GENERATION WITH CANVAS
  const generateCaptcha = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Generate random text (6 characters)
    let text = "";
    for (let i = 0; i < CAPTCHA_LENGTH; i++) {
      text += CHARACTERS.charAt(Math.floor(Math.random() * CHARACTERS.length));
    }
    setCaptchaText(text);

    // Background - gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#f8fafc');
    gradient.addColorStop(0.5, '#e2e8f0');
    gradient.addColorStop(1, '#f1f5f9');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Draw noise - random dots
    for (let i = 0; i < 150; i++) {
      ctx.fillStyle = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 0.5})`;
      ctx.beginPath();
      ctx.arc(
        Math.random() * width,
        Math.random() * height,
        Math.random() * 2 + 1,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Draw random lines (noise)
    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = `rgba(${Math.random() * 200}, ${Math.random() * 200}, ${Math.random() * 200}, ${Math.random() * 0.3 + 0.1})`;
      ctx.lineWidth = Math.random() * 2 + 1;
      ctx.beginPath();
      ctx.moveTo(Math.random() * width, Math.random() * height);
      ctx.lineTo(Math.random() * width, Math.random() * height);
      ctx.stroke();
    }

    // Draw text with distortion
    const colors = [
      '#2563eb', '#dc2626', '#059669', '#7c3aed', 
      '#ea580c', '#0891b2', '#db2777', '#4f46e5'
    ];
    
    const fonts = [
      'Arial', 'Helvetica', 'Verdana', 'Tahoma', 
      'Georgia', 'Times New Roman', 'Courier New'
    ];

    // Draw each character with individual styling
    const charWidth = width / CAPTCHA_LENGTH;
    const charHeight = height;

    for (let i = 0; i < text.length; i++) {
      const x = i * charWidth + charWidth / 2;
      const y = height / 2 + (Math.random() * 10 - 5);
      
      // Random rotation
      const angle = (Math.random() - 0.5) * 0.6;
      
      // Random font size
      const fontSize = Math.floor(Math.random() * 8) + 26;
      
      // Random color from palette
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      // Random font
      const font = fonts[Math.floor(Math.random() * fonts.length)];
      
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      
      // Add shadow for depth
      ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      
      // Draw character
      ctx.font = `bold ${fontSize}px ${font}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Add slight offset
      const offsetX = (Math.random() - 0.5) * 6;
      const offsetY = (Math.random() - 0.5) * 6;
      
      ctx.fillStyle = color;
      ctx.fillText(text[i], offsetX, offsetY);
      
      // Add outline for better readability
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 0.5;
      ctx.strokeText(text[i], offsetX, offsetY);
      
      ctx.restore();
    }

    // Add more noise (curved lines)
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = `rgba(${Math.random() * 150}, ${Math.random() * 150}, ${Math.random() * 150}, 0.2)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      const startX = Math.random() * width;
      const startY = Math.random() * height;
      ctx.moveTo(startX, startY);
      
      for (let j = 0; j < 4; j++) {
        ctx.quadraticCurveTo(
          Math.random() * width,
          Math.random() * height,
          Math.random() * width,
          Math.random() * height
        );
      }
      ctx.stroke();
    }

    // Add a grid pattern (very subtle)
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.05)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < width; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let i = 0; i < height; i += 20) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }

    // Add a subtle blur effect
    ctx.filter = 'blur(0.5px)';
    ctx.fillStyle = 'rgba(0,0,0,0.02)';
    ctx.fillRect(0, 0, width, height);
    ctx.filter = 'none';
  };

  // Regenerate captcha
  const refreshCaptcha = () => {
    generateCaptcha();
    setIsRotated(true);
    setFormData(prev => ({ ...prev, captcha: "" }));
    setTimeout(() => setIsRotated(false), 1000);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const showAlert = (message, type = "error") => {
    setAlertMessage(message);
    setAlertType(type);
  };

  const resetToLogin = () => {
    setCurrentView("login");
    setIsOtpRequested(false);
    setForgotPasswordData({
      identifier: "",
      identifierType: "email",
      otp: "",
      newPassword: "",
      confirmPassword: "",
    });
    setOtpTimer(300);
    setCanResendOtp(false);
    setResendTimer(30);
  };

  const handleBack = () => {
    if (currentView === "forgot-password") {
      resetToLogin();
    } else if (currentView === "forgot-otp") {
      setCurrentView("forgot-password");
    } else if (currentView === "reset-password") {
      setCurrentView("forgot-otp");
    } else {
      setIsOtpRequested(false);
      setOtpTimer(300);
      setCanResendOtp(false);
      setResendTimer(30);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleForgotPasswordChange = (e) => {
    const { name, value } = e.target;

    setForgotPasswordData((prev) => {
      if (name === "identifierType") {
        return {
          ...prev,
          identifierType: value,
          identifier: "", // reset input on switch
        };
      }

      // Allow only digits for mobile input
      if (name === "identifier" && prev.identifierType === "mobile") {
        const numericValue = value.replace(/\D/g, ""); // Remove non-digits
        return { ...prev, [name]: numericValue };
      }

      return { ...prev, [name]: value };
    });
  };

  const handleOtpChange = (e, index) => {
    const { value } = e.target;
    const digits = value.replace(/\D/g, "");

    if (digits.length === 6) {
      const otpArray = digits.split("").slice(0, 6);
      setOtpDigits(otpArray);
      document.getElementById("otp-5").focus();
      return;
    }

    if (/^\d?$/.test(value)) {
      const updatedOtp = [...otpDigits];
      updatedOtp[index] = value;
      setOtpDigits(updatedOtp);

      if (value && index < 5) {
        document.getElementById(`otp-${index + 1}`).focus();
      }
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`).focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").replace(/\D/g, "");

    if (pasteData.length === 6) {
      const otpArray = pasteData.split("").slice(0, 6);
      setOtpDigits(otpArray);

      setTimeout(() => {
        document.getElementById("otp-5")?.focus();
      }, 10);
    }
  };

  useEffect(() => {
    setForgotPasswordData(prev => ({
      ...prev,
      otp: forgotOtpDigits.join(""),
    }));
  }, [forgotOtpDigits]);

  const handleForgotOtpChange = (e, index) => {
    const value = e.target.value.replace(/\D/g, "");

    // Handle full OTP pasted or typed
    if (value.length === 6) {
      const digits = value.split("").slice(0, 6);
      setForgotOtpDigits(digits);
      updateForgotOtp(digits);

      document.getElementById("forgot-otp-5")?.focus();

      // Auto-submit if valid and allowed
      if (otpTimer !== 0 && !isButtonDisabled) {
        verifyForgotPasswordOtp();
      }
      return;
    }

    // Handle single digit entry
    if (/^\d?$/.test(value)) {
      const updated = [...forgotOtpDigits];
      updated[index] = value;
      setForgotOtpDigits(updated);
      updateForgotOtp(updated);

      if (value && index < 5) {
        document.getElementById(`forgot-otp-${index + 1}`)?.focus();
      }

      // Check if all digits are filled after entry
      if (updated.every((d) => d !== "") && otpTimer !== 0 && !isButtonDisabled) {
        verifyForgotPasswordOtp();
      }
    }
  };

  const updateForgotOtp = (digits) => {
    const otp = digits.join("");
    setForgotPasswordData((prev) => ({ ...prev, otp }));
  };

  const handleForgotKeyDown = (e, index) => {
    const key = e.key;

    if (key === "Backspace" && !forgotOtpDigits[index] && index > 0) {
      document.getElementById(`forgot-otp-${index - 1}`).focus();
    }

    if (key === "Enter") {
      const isComplete = forgotOtpDigits.every((digit) => digit !== "");
      if (isComplete && !isButtonDisabled && otpTimer !== 0) {
        updateForgotOtp(forgotOtpDigits); // ensure OTP is set
        verifyForgotPasswordOtp();        // call submit
      }
    }
  };

  const handleForgotPaste = (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text").replace(/\D/g, "");
    if (paste.length === 6) {
      const digits = paste.split("").slice(0, 6);
      setForgotOtpDigits(digits);
      setTimeout(() => {
        document.getElementById("forgot-otp-5")?.focus();
      }, 10);
    }
  };

  const handleCaptchaPaste = (e) => {
    e.preventDefault();
  };

  const initiateForgotPassword = async () => {
    const { identifier, identifierType } = forgotPasswordData;

    if (!identifier) {
      showAlert("Please enter your email or mobile number.");
      return;
    }

    // Manual validation
    if (
      identifierType === "email" &&
      !/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(identifier)
    ) {
      showAlert("Please enter a valid Gmail address.");
      return;
    }

    if (identifierType === "mobile" && !/^\d{10}$/.test(identifier)) {
      showAlert("Please enter a valid 10-digit mobile number.");
      return;
    }

    setIsButtonDisabled(true);

    try {
      const response = await axios.post(`${FORGATE_PASS_API}`, {
        identifier,
      });

      // If backend returns success, show OTP sent
      if (response.status === 200) {
        setCurrentView("forgot-otp");
        setOtpTimer(300);
        setCanResendOtp(false);
        setResendTimer(30);
        showAlert("OTP sent to your registered mobile number.", "success");
      }
    } catch (error) {
      // Get status code
      const status = error.response?.status;
      const message = error.response?.data?.message;

      // Custom messages from backend
      if (status === 404) {
        showAlert(message || "User not registered with this email or mobile.");
      } else if (status === 403) {
        showAlert(message || "Your account is inactive. Please contact admin.");
      } else {
        showAlert("Failed to send OTP. Please try again.");
      }
    } finally {
      setIsButtonDisabled(false);
    }
  };

  const verifyForgotPasswordOtp = async () => {
    if (!forgotPasswordData.otp) {
      showAlert("Please enter the OTP.");
      return;
    }

    if (otpTimer === 0) {
      showAlert("OTP has expired. Please request a new one.");
      return;
    }

    setIsButtonDisabled(true);

    try {
      const response = await axios.post(`${VERIFY_FORGATE_OTP}`, {
        identifier: forgotPasswordData.identifier,
        otp: forgotPasswordData.otp,
      });

      if (response.status === 200) {
        setCurrentView("reset-password");
        showAlert("OTP verified successfully. You can now reset your password.", "success");
      }
    } catch (error) {
      showAlert(
        error.response?.data?.message || "Invalid OTP. Please try again."
      );
    } finally {
      setIsButtonDisabled(false);
    }
  };

  const resetPassword = async () => {
    const { newPassword, confirmPassword, identifier, otp } = forgotPasswordData;

    // Basic field checks
    if (!newPassword || !confirmPassword) {
      showAlert("Please fill in both password fields.");
      return;
    }

    // Password length check
    if (newPassword.length < 8) {
      showAlert("Password must be at least 8 characters long.");
      return;
    }

    // Password match check
    if (newPassword !== confirmPassword) {
      showAlert("Passwords do not match.");
      return;
    }

    // Expired session check
    if (otpTimer === 0) {
      showAlert("OTP has expired. Please start the process again.");
      return;
    }

    setIsButtonDisabled(true);

    try {
      const response = await axios.post(`${RESET_PASS_API}`, {
        identifier,
        otp,
        newPassword,
        confirmPassword,
      });

      if (response.status === 200) {
        showAlert("Password reset successfully. You can now login with your new password.", "success");
        setForgotOtpDigits(Array(6).fill(""));
        setTimeout(() => {
          resetToLogin();
        }, 2000);
      }
    } catch (error) {
      showAlert(
        error.response?.data?.message || "Failed to reset password. Please try again."
      );
    } finally {
      setIsButtonDisabled(false);
    }
  };

  const clearOtpFields = () => {
    setOtpDigits(Array(6).fill(""));
  };

  const clearForgotOtpFields = () => {
    setForgotOtpDigits(Array(6).fill(""));
  };

  const resendForgotPasswordOtp = async () => {
    if (!canResendOtp) return;

    setIsButtonDisabled(true);
    try {
      clearForgotOtpFields();
      const response = await axios.post(`${FORGATE_PASS_API}`, {
        identifier: forgotPasswordData.identifier,
      });

      if (response.status === 200) {
        setOtpTimer(300);
        setCanResendOtp(false);
        setResendTimer(30);
        showAlert("New OTP has been sent to your mobile number.", "success");
      }
    } catch (error) {
      showAlert("Failed to resend OTP. Please try again.");
    } finally {
      setIsButtonDisabled(false);
    }
  };

  // Generate or retrieve device ID
  const getDeviceId = () => {
    let deviceId = localStorage.getItem("deviceId");

    if (!deviceId) {
      if (window.crypto && window.crypto.randomUUID) {
        deviceId = window.crypto.randomUUID();
      } else {
        // Fallback UUID generator
        deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      }

      localStorage.setItem("deviceId", deviceId);
    }

    return deviceId;
  };


  // Request OTP function with languageId
  const requestOtp = async () => {
    if (!formData.username || !formData.password || !formData.captcha) {
      showAlert("Please fill in all fields before requesting OTP.");
      return;
    }

    // Verify captcha
    if (formData.captcha.toUpperCase() !== captchaText) {
      showAlert("Invalid captcha. Please try again.");
      refreshCaptcha();
      setFormData(prev => ({ ...prev, captcha: "" }));
      return;
    }

    setIsButtonDisabled(true);
    const deviceId = getDeviceId();

    try {
      const response = await axios.post(LOGIN_API, {
        email: formData.username,
        password: formData.password,
        // languageId: selectedLanguageId,
        deviceId: deviceId
      });

      if (response.status === 200) {
        const {
          token,
          refreshToken,
          roles,
          currRoleId,
          name,
          id,
          languageCode,
          message
        } = response.data;

        if (!roles) {
          showAlert("Employee Type not assigned. Please contact Admin.");
          return;
        }

        if (!token && !refreshToken) {
          setOptBlockIsEnabled(true);
          setIsOtpRequested(true);
          setOtpTimer(300);
          setCanResendOtp(false);
          setResendTimer(30);
          showAlert(message || "OTP has been sent to your mobile no.", "success");
          return;
        }

        if (token && refreshToken) {
          localStorage.setItem("tokenKey", token);
          localStorage.setItem("refreshToken", refreshToken);
          localStorage.setItem("deviceId", deviceId);
          localStorage.setItem("roles", roles);
          localStorage.setItem("currRoleId", currRoleId);
          localStorage.setItem("name", name);
          localStorage.setItem("id", id);
          localStorage.setItem("uiLanguage", languageCode);

          const redirectUrl = localStorage.getItem("redirectUrl");
          if (redirectUrl) {
            localStorage.removeItem("redirectUrl");
            navigate(redirectUrl);
          } else {
            navigate("/newDash");
          }

          showAlert("Login successful.", "success");
        }
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
      clearOtpFields();
      const response = await axios.post(LOGIN_API, {
        email: formData.username,
        password: formData.password,
        languageId: selectedLanguageId  // Send selected language ID
      });

      if (response.status === 200) {
        setOtpTimer(300);
        setCanResendOtp(false);
        setResendTimer(30);
        showAlert("New OTP has been sent to your mobile no.", "success");
      }
    } catch (error) {
      showAlert("Failed to resend OTP. Please try again.");
    } finally {
      setIsButtonDisabled(false);
    }
  };


  // Update handleLogin function
  const handleLogin = async (e) => {
    e.preventDefault();

    const otp = otpDigits.join("").trim();
    const deviceId = getDeviceId(); // Get device ID

    if (otpTimer === 0) {
      showAlert("OTP has expired. Please request a new one by clicking resend.");
      return;
    }

    if (!otp) {
      showAlert("Please enter OTP to proceed.");
      return;
    }

    if (otp.length < 6) {
      showAlert("Please enter a valid 6-digit OTP.");
      return;
    }

    setIsButtonDisabled(true);

    try {
      const response = await axios.post(LOGIN_API_verify, {
        email: formData.username,
        otp: otp,
        deviceId: deviceId // Send device ID
      });

      if (response.status === 200) {
        setOtpDigits(Array(6).fill(""));
        const {
          token,
          refreshToken, // Get refresh token
          roles,
          currRoleId,
          name,
          id,
          languageCode
        } = response.data;

        // Store tokens
        localStorage.setItem("tokenKey", token);
        localStorage.setItem("refreshToken", refreshToken);
        localStorage.setItem("deviceId", deviceId);
        localStorage.setItem("roles", roles);
        localStorage.setItem("currRoleId", currRoleId);
        localStorage.setItem("name", name);
        localStorage.setItem("id", id);
        localStorage.setItem("uiLanguage", languageCode);


        // Navigate
        const redirectUrl = localStorage.getItem("redirectUrl");
        if (redirectUrl) {
          localStorage.removeItem("redirectUrl");
          navigate(redirectUrl);
        } else {
          navigate("/newDash");
        }
      }
    } catch (error) {
      showAlert(error.response?.data?.message || "Invalid OTP. Please try again.");
    } finally {
      setIsButtonDisabled(false);
    }
  };

  // Helper functions for view titles
  const getViewTitle = () => {
    switch (currentView) {
      case "forgot-password":
        return "Forgot Password";
      case "forgot-otp":
        return "Verify OTP";
      case "reset-password":
        return "Reset Password";
      default:
        return isOtpRequested ? "Enter OTP" : "";
    }
  };

  const getViewSubtitle = () => {
    switch (currentView) {
      case "forgot-password":
        return `Enter your ${otpIsEnabled ? "mobile number" : "email"} to reset password`;

      case "forgot-otp":
        return `Please enter the OTP sent to your ${otpIsEnabled ? "mobile number" : "email"}`;

      case "reset-password":
        return "Create a new password for your account";

      default:
        return isOtpRequested
          ? "Please enter the OTP sent to your mobile no."
          : "Please sign in to your account";
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side - Image */}
      <div className="max-w-0 lg:max-w-full lg:w-1/2 loginLeft">
        {/* <img
          src={image}
          alt="Login"
          className="w-full h-full object-cover"
        /> */}
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-3 md:p-4">
        {/* Logo and Title - More compact */}
        <div className="w-full max-w-md text-center mb-1">
          <img
            src={logo2}
            alt="AGT Document Management System"
            className="mx-auto w-86 object-cover mb-2"
          />
        </div>

        <div className="w-full- max-w-lg- bg-gray-50 rounded-lg shadow-lg border border-gray-200- p-4- loginBox">
          {(isOtpRequested || currentView !== "login") && (
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={handleBack}
                className="flex items-center text-blue-600 hover:text-blue-700 transition-colors text-sm"
              >
                <ArrowLeftIcon className="w-4 h-4 mr-1" />
                <AutoTranslate>Back</AutoTranslate>
              </button>
              {(currentView === "forgot-otp" || currentView === "reset-password" || isOtpRequested) && (
                <div className="flex items-center text-sm text-gray-600">
                  <ClockIcon className="w-4 h-4 mr-1" />
                  {formatTime(otpTimer)}
                </div>
              )}
            </div>
          )}

          <div className="mb-4 text-center">
            <h2 className={`text-xl font-bold ${currentView === "login" && !isOtpRequested ? "text-indigo-600" : "text-gray-900"
              }`}>
              <AutoTranslate>{getViewTitle()}</AutoTranslate>
            </h2>
            <div className="loginTitle">
              <p>
                <AutoTranslate>{getViewSubtitle()}</AutoTranslate>
              </p>

              <div
                className="relative"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onClick={() => setShowTooltip(!showTooltip)}
              >
                <button type="button" className="text-gray-500 hover:text-gray-700">
                  <InformationCircleIcon className="h-5 w-5" />
                </button>
                {showTooltip && (
                  <div className="toolTip">
                    <AutoTranslate>This website is running on Release Version 3.0, which is currently under testing.</AutoTranslate>
                  </div>
                )}
              </div>
            </div>
          </div>

          {alertMessage && (
            <div className={`mb-3 p-2 rounded-md border text-sm ${alertType === "success"
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-red-50 text-red-700 border-red-200"
              }`}>
              <AutoTranslate>{alertMessage}</AutoTranslate>
            </div>
          )}

          {/* Login Form */}
          {currentView === "login" && !isOtpRequested && (
            <form onSubmit={handleLogin} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  <AutoTranslate>Username</AutoTranslate>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-4 w-4 text-blue-600" />
                  </div>
                  <input
                    type="email"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="pl-9 w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                    placeholder={getFallbackTranslation(
                      'Enter your username',
                      currentLanguage
                    ) || 'Enter your username'}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  <AutoTranslate>Password</AutoTranslate>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockClosedIcon className="h-4 w-4 text-blue-600" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="pl-9 w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                    placeholder={getFallbackTranslation(
                      'Enter your password',
                      currentLanguage
                    ) || 'Enter your password'}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-gray-100 p-1 rounded"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="w-4 h-4 text-blue-600" />
                    ) : (
                      <EyeIcon className="w-4 h-4 text-blue-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* PROFESSIONAL CAPTCHA WITH CANVAS */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    <AutoTranslate>Security Check</AutoTranslate>
                  </label>
                  <span className="text-xs text-gray-500">
                    <AutoTranslate>Enter the characters shown</AutoTranslate>
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Canvas Captcha */}
                  <div className="flex-1 relative overflow-hidden rounded-lg border-2 border-gray-300 shadow-md bg-white">
                    <canvas
                      ref={canvasRef}
                      width={300}
                      height={60}
                      className="w-full h-[60px]"
                    />
                    {/* Play/Pause overlay effect */}
                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-50"></div>
                  </div>

                  {/* Refresh Button */}
                  <button
                    type="button"
                    onClick={refreshCaptcha}
                    className="flex-shrink-0 w-12 h-[60px] bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg border-2 border-blue-200 hover:border-blue-300 transition-all duration-200 flex items-center justify-center group"
                    title="Refresh Captcha"
                  >
                    <ArrowPathIcon className={`w-5 h-5 ${isRotated ? "animate-spin" : "group-hover:rotate-90"} transition-transform duration-300`} />
                  </button>
                </div>

                {/* Captcha Input */}
                <div className="relative mt-1">
                  <input
                    type="text"
                    name="captcha"
                    value={formData.captcha}
                    onChange={handleInputChange}
                    onPaste={handleCaptchaPaste}
                    className="w-full p-2.5 pl-4 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm uppercase tracking-wider"
                    placeholder={getFallbackTranslation(
                      'Type the characters you see',
                      currentLanguage
                    ) || 'Type the characters you see'}
                    maxLength={CAPTCHA_LENGTH}
                    autoComplete="off"
                    autoFocus={false}
                    required
                  />
                  {formData.captcha && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium">
                      <span className={`px-2 py-0.5 rounded ${
                        formData.captcha.length === CAPTCHA_LENGTH 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {formData.captcha.length}/{CAPTCHA_LENGTH}
                      </span>
                    </div>
                  )}
                </div>

                {/* Captcha hint for accessibility */}
                <div className="text-xs text-gray-400 flex items-center gap-1">
                  <InformationCircleIcon className="w-3 h-3" />
                  <AutoTranslate>Captcha is case-insensitive</AutoTranslate>
                </div>
              </div>

              <button
                type="button"
                onClick={requestOtp}
                disabled={isButtonDisabled}
                className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
              >
                <AutoTranslate>
                  {isButtonDisabled ? "Login..." : "Login"}
                </AutoTranslate>
              </button>
            </form>
          )}

          {/* Login OTP Verification */}
          {currentView === "login" && isOtpRequested && (
            <form onSubmit={handleLogin} className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between gap-2">
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      id={`otp-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength="1"
                      value={digit}
                      onChange={(e) => handleOtpChange(e, index)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      onPaste={handleOtpPaste}
                      className="w-12 h-12 text-center border border-gray-300 rounded-md text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={otpTimer === 0}
                    />
                  ))}
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  type="submit"
                  disabled={isButtonDisabled || otpTimer === 0}
                  className={`flex-1 py-2.5 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm`}
                >
                  <AutoTranslate>
                    {isButtonDisabled ? "Logging in..." : otpTimer === 0 ? "OTP Expired" : "Login"}
                  </AutoTranslate>
                </button>

                <button
                  type="button"
                  onClick={resendOtp}
                  disabled={!canResendOtp || isButtonDisabled}
                  className="px-3 py-2.5 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                >
                  <AutoTranslate>
                    {!canResendOtp ? `Resend (${resendTimer}s)` : "Resend OTP"}
                  </AutoTranslate>
                </button>
              </div>
            </form>
          )}

          {/* Forgot Password Form */}
          {currentView === "forgot-password" && (
            <div className="space-y-4">
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  <AutoTranslate>Reset password using</AutoTranslate>
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="identifierType"
                      value="email"
                      checked={forgotPasswordData.identifierType === "email"}
                      onChange={handleForgotPasswordChange}
                      className="mr-2 text-blue-600 focus:ring-blue-500"
                    />
                    <EnvelopeIcon className="w-4 h-4 mr-1 text-blue-600" />
                    <span className="text-sm"><AutoTranslate>Email</AutoTranslate></span>
                  </label>
                  {otpIsEnabled && (
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="identifierType"
                        value="mobile"
                        checked={forgotPasswordData.identifierType === "mobile"}
                        onChange={handleForgotPasswordChange}
                        className="mr-2 text-blue-600 focus:ring-blue-500"
                      />
                      <DevicePhoneMobileIcon className="w-4 h-4 mr-1 text-blue-600" />
                      <span className="text-sm"><AutoTranslate>Mobile</AutoTranslate></span>
                    </label>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  <AutoTranslate>
                    {forgotPasswordData.identifierType === "email" ? "Email Address" : "Mobile Number"}
                  </AutoTranslate>
                </label>

                <div className="relative">
                  {forgotPasswordData.identifierType === "email" ? (
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <EnvelopeIcon className="h-5 w-5 text-blue-500" />
                    </div>
                  ) : (
                    <div className="absolute inset-y-0 left-0 flex items-center">
                      <span className="inline-flex items-center pl-3 pr-2 h-full rounded-l-md border border-r-0 border-gray-300 bg-gray-100 text-gray-700 text-sm">
                        +91
                      </span>
                    </div>
                  )}

                  <input
                    type={forgotPasswordData.identifierType === "email" ? "email" : "tel"}
                    name="identifier"
                    value={forgotPasswordData.identifier}
                    onChange={handleForgotPasswordChange}
                    className={`w-full py-2.5 pr-4 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-all duration-150 ${forgotPasswordData.identifierType === "email" ? "pl-11" : "pl-16"
                      }`}
                    placeholder={
                      forgotPasswordData.identifierType === "email"
                        ? "Enter your Gmail address"
                        : "Enter your 10-digit mobile number"
                    }
                    inputMode={forgotPasswordData.identifierType === "email" ? "email" : "numeric"}
                    maxLength={forgotPasswordData.identifierType === "mobile" ? 10 : undefined}
                    pattern={
                      forgotPasswordData.identifierType === "email"
                        ? "^[a-zA-Z0-9._%+-]+@gmail\\.com$"
                        : "^[0-9]{10}$"
                    }
                    title={
                      forgotPasswordData.identifierType === "email"
                        ? "Please enter a valid Gmail address (e.g. example@gmail.com)"
                        : "Please enter a valid 10-digit mobile number"
                    }
                    required
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={initiateForgotPassword}
                disabled={isButtonDisabled}
                className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
              >
                <AutoTranslate>
                  {isButtonDisabled ? "Sending OTP..." : "Send OTP"}
                </AutoTranslate>
              </button>
            </div>
          )}

          {/* Forgot Password OTP Verification */}
          {currentView === "forgot-otp" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between gap-2">
                  {forgotOtpDigits.map((digit, index) => (
                    <input
                      key={index}
                      id={`forgot-otp-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength="1"
                      value={digit}
                      onChange={(e) => handleForgotOtpChange(e, index)}
                      onKeyDown={(e) => handleForgotKeyDown(e, index)}
                      onPaste={handleForgotPaste}
                      className="w-12 h-12 text-center border border-gray-300 rounded-md text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={otpTimer === 0}
                    />
                  ))}
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={verifyForgotPasswordOtp}
                  disabled={isButtonDisabled || otpTimer === 0}
                  className={`flex-1 py-2.5 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm`}
                >
                  <AutoTranslate>
                    {isButtonDisabled ? "Verifying..." : otpTimer === 0 ? "OTP Expired" : "Verify OTP"}
                  </AutoTranslate>
                </button>

                <button
                  type="button"
                  onClick={resendForgotPasswordOtp}
                  disabled={!canResendOtp || isButtonDisabled}
                  className="px-3 py-2.5 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm whitespace-nowrap"
                >
                  <AutoTranslate>
                    {!canResendOtp ? `Resend (${resendTimer}s)` : "Resend"}
                  </AutoTranslate>
                </button>
              </div>
            </div>
          )}

          {/* Reset Password Form */}
          {currentView === "reset-password" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  <AutoTranslate>New Password</AutoTranslate>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockClosedIcon className="h-4 w-4 text-blue-600" />
                  </div>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    name="newPassword"
                    value={forgotPasswordData.newPassword}
                    onChange={handleForgotPasswordChange}
                    className="pl-9 w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                    placeholder="Enter new password"
                    required
                    maxLength={15}
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-gray-100 p-1 rounded"
                  >
                    {showNewPassword ? (
                      <EyeSlashIcon className="w-4 h-4 text-blue-600" />
                    ) : (
                      <EyeIcon className="w-4 h-4 text-blue-600" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  <AutoTranslate>Confirm New Password</AutoTranslate>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockClosedIcon className="h-4 w-4 text-blue-600" />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={forgotPasswordData.confirmPassword}
                    onChange={handleForgotPasswordChange}
                    className="pl-9 w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                    placeholder="Confirm new password"
                    required
                    maxLength={15}
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-gray-100 p-1 rounded"
                  >
                    {showConfirmPassword ? (
                      <EyeSlashIcon className="w-4 h-4 text-blue-600" />
                    ) : (
                      <EyeIcon className="w-4 h-4 text-blue-600" />
                    )}
                  </button>
                </div>
              </div>

              {forgotPasswordData.newPassword && (
                <div className="text-xs text-gray-600 space-y-1">
                  <p className={forgotPasswordData.newPassword.length >= 8 ? "text-green-600" : "text-red-600"}>
                    • <AutoTranslate>At least 8 characters</AutoTranslate>
                  </p>
                  {forgotPasswordData.confirmPassword && (
                    <p className={forgotPasswordData.newPassword === forgotPasswordData.confirmPassword ? "text-green-600" : "text-red-600"}>
                      • <AutoTranslate>Passwords match</AutoTranslate>
                    </p>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={resetPassword}
                disabled={isButtonDisabled || otpTimer === 0}
                className={`w-full py-2.5 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm`}
              >
                <AutoTranslate>
                  {isButtonDisabled ? "Resetting Password..." : otpTimer === 0 ? "Session Expired" : "Reset Password"}
                </AutoTranslate>
              </button>

              {otpTimer > 0 && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={resendForgotPasswordOtp}
                    disabled={!canResendOtp || isButtonDisabled}
                    className="text-sm text-blue-600 hover:text-blue-700 transition-colors disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    <AutoTranslate>
                      {!canResendOtp ? `Resend OTP in ${resendTimer}s` : "Resend OTP"}
                    </AutoTranslate>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 text-center text-xs text-gray-500">
          <p>© 2025 AGT. <AutoTranslate>All rights reserved</AutoTranslate>.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;