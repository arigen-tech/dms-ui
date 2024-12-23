import axios from "axios";
import { API_HOST } from "../API/apiConfig";

function isTokenExpired() {
  const storedExpirationTime = localStorage.getItem("token_expiration");
  const currentTime = Math.floor(Date.now() / 1000); 

  return storedExpirationTime && currentTime >= storedExpirationTime;
}

const apiClient = axios.create({
  baseURL: API_HOST,
});

apiClient.interceptors.request.use(
  (config) => {
    if (isTokenExpired()) {
      debugger;
      
      const currentUrl = window.location.href; 
      localStorage.setItem("redirectUrl", currentUrl); 

      localStorage.clear();
      console.log("Token expired and removed from localStorage");

      return Promise.reject(new Error("Token expired, please login again."));
    }

    const token = localStorage.getItem("tokenKey");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;
